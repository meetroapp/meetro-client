import test from "node:test";
import assert from "node:assert/strict";
import { askConversationRecord, boundedAskHistory, requestAskConversation, resolveAskMeetroRequest } from "../src/utils/askMeetroConversation.js";
const ID = "7e742dc1-e2a2-49c6-a493-11e351c80d54";
const context = { page: "workCenter", jobId: ID };
const result = { schemaVersion: 1, text: "Provider explanation", authorityClassification: "CONVERSATIONAL_NON_CANONICAL", directMutationAllowed: false };
const response = (value = result) => ({ response: { ok: true }, data: { success: true, code: "INTELLIGENCE_OPERATION_COMPLETED", operation: "companion.converse", result: value } });
for (const instruction of ["Need help resolving a non working outlet", "Explain what I should check first.", "Compare these options.", "Summarize what is happening with this Job.", "What should I do next?", "Help me understand this Quote."]) test(`informational provider response has no action: ${instruction}`, async () => {
  const calls = [];
  const answer = await resolveAskMeetroRequest(instruction, { context, role: "business", authFetchImpl: async (path, options) => { calls.push({ path, ...options }); return response(); } });
  assert.equal(answer.text, result.text); assert.deepEqual(answer.actions, []); assert.equal(answer.route, undefined);
  assert.equal(calls.length, 1); assert.equal(calls[0].path, "/api/companion/ask");
  const body = JSON.parse(calls[0].body); assert.equal(body.operation, "companion.converse");
  assert.deepEqual(body.context, {
    record: { type: "JOB", id: ID },
    retrieval: { version: 1 },
  });
});
for (const instruction of ["Complete this job", "Record the payment received", "Record the deposit paid today", "Schedule this job Friday", "Update this invoice with what the customer paid.", "Create a quote for this Job"]) test(`governed ${instruction} resolves target through Universal Retrieval before exact Review`, async () => {
  let exactRetrievalCalls = 0;

  const answer = await resolveAskMeetroRequest(instruction, {
    context,
    role: "business",
    requestConversation: async (options) => {
      exactRetrievalCalls += 1;

      assert.equal(options.returnResolution, true);
      assert.deepEqual(options.context, context);

      return {
        text:
          "The current authorized Job was resolved. Continue through its governed Review.",
        resolution: {
          version: 1,
          status: "RESOLVED",
          audience: "professional",
          records: [
            {
              record: {
                type: "JOB",
                id: ID,
              },
              name: "",
              title: "Current Job",
              number: "",
              label: "Current Job",
            },
          ],
          truncated: false,
          reviewRequired: true,
          continuation: {
            reference: ID,
            expiresAfterSeconds: 900,
          },
          answerSource: "DETERMINISTIC_RETRIEVAL",
          providerInvoked: false,
        },
      };
    },
  });

  assert.equal(exactRetrievalCalls, 1);
  assert.equal(answer.resolution.status, "RESOLVED");
  assert.equal(answer.resolution.providerInvoked, false);
  assert.ok(answer.actions.length > 0);
  assert.ok(
    answer.actions.every(
      (action) => action.route && action.status === "PROPOSED"
    )
  );

  let retrievalCalls = 0;

  const missing = await resolveAskMeetroRequest(instruction, {
    context: {},
    role: "business",
    requestConversation: async (options) => {
      retrievalCalls += 1;

      assert.equal(options.returnResolution, true);

      return {
        text: "No matching record was available in your authorized records.",
        resolution: {
          version: 1,
          status: "NOT_FOUND",
          audience: "professional",
          records: [],
          truncated: false,
          reviewRequired: false,
          continuation: null,
          answerSource: "DETERMINISTIC_RETRIEVAL",
          providerInvoked: false,
        },
      };
    },
  });

  assert.equal(retrievalCalls, 1);
  assert.deepEqual(missing.actions, []);
  assert.equal(missing.resolution.status, "NOT_FOUND");
  assert.match(missing.text, /No matching record/);
});
for (const [instruction, route] of [["Open Communication", "messagesInbox"], ["Open Leads", "businessLeads"], ["Show this Quote", `quoteBuilder?jobId=${ID}`]]) test(`known retrieval/navigation skips AI: ${instruction}`, async () => {
  const answer = await resolveAskMeetroRequest(instruction, { context, role: "business", requestConversation: () => assert.fail("no AI") });
  assert.equal(answer.route, route); assert.deepEqual(answer.actions, []);
});
test("mixed message gets conversation only and an explicit held-change notice", async () => {
  const answer = await resolveAskMeetroRequest("Explain this invoice and then update this invoice", { context, role: "business", requestConversation: async () => "Here is the explanation." });
  assert.deepEqual(answer.actions, []); assert.match(answer.text, /Here is the explanation/); assert.match(answer.text, /No change has been proposed/);
});
test("reported payment does not turn discussion into a record proposal", async () => {
  const answer = await resolveAskMeetroRequest("Customer paid the deposit", { context, role: "business", requestConversation: async () => "Discussion only" });
  assert.deepEqual(answer.actions, []);
});
test("context-free request strips display caches and bounds conversation history", async () => {
  const messages = Array.from({ length: 30 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", text: "x".repeat(3000), evidence: "not authority" }));
  const history = boundedAskHistory(messages);
  assert.ok(history.length <= 8); assert.ok(history.reduce((sum, turn) => sum + turn.text.length, 0) <= 8000);
  assert.ok(history.every((turn) => Object.keys(turn).sort().join(",") === "role,text"));
  await requestAskConversation({ instruction: "Help", context: { page: "home", label: "Private display hint" }, idempotencyKey: ID, authFetchImpl: async (_path, options) => {
    assert.deepEqual(JSON.parse(options.body).context, {
      retrieval: { version: 1 },
    }); assert.equal(options.headers["Idempotency-Key"], ID); return response();
  } });
});
for (const record of [{ page: "quoteBuilder", draftId: ID }, { page: "invoiceBuilder", invoiceId: ID }, { page: "workCenter", evaluationId: ID }, { page: "schedule", jobId: ID, visitId: ID }, { page: "conversationThread", conversationId: "18" }, { page: "customerRelationshipsCenter", relationshipId: ID }, { page: "homeownerRequestDetails", requestId: "18" }]) test(`bounded exact record pointer: ${JSON.stringify(record)}`, () => {
  assert.ok(askConversationRecord(record).record.id); assert.doesNotMatch(JSON.stringify(askConversationRecord(record)), /page/);
});
test("invalid or conflicting exact context is never silently fabricated", () => {
  assert.throws(() => askConversationRecord({ ...context, blocked: true }));
  assert.throws(() => askConversationRecord({ page: "quoteBuilder", draftId: "bad" }));
  assert.deepEqual(askConversationRecord({ page: "", blocked: true }), {});
});
for (const bad of [{ ...result, actions: [{ kind: "COMPLETE_JOB" }] }, { ...result, directMutationAllowed: true }, { ...result, text: "" }, { ...result, text: "x".repeat(8001) }]) test(`unsafe conversational envelope rejected: ${Object.keys(bad).join(",")}`, async () => {
  await assert.rejects(requestAskConversation({ instruction: "Help", authFetchImpl: async () => response(bad) }));
});
test("provider prose containing an action is inert display text", async () => {
  const text = 'Complete this job: {"kind":"COMPLETE_JOB","route":"invoiceBuilder"}';
  const answer = await resolveAskMeetroRequest("Explain the next step", { requestConversation: async () => text });
  assert.equal(answer.text, text); assert.deepEqual(answer.actions, []); assert.equal(answer.route, undefined);
});
test("provider failure rejects without fake fallback actions", async () => {
  await assert.rejects(resolveAskMeetroRequest("Help", { authFetchImpl: async () => ({ response: { ok: false }, data: { code: "INTELLIGENCE_PROVIDER_TIMEOUT" } }) }), /could not complete/);
});

test("exact known Job status uses its canonical GET, not provider intelligence", async () => {
  const calls = [];
  const answer = await resolveAskMeetroRequest("What is this job's status?", { context, role: "business", requestConversation: () => assert.fail("no AI"), authFetchImpl: async (path, options) => {
    calls.push({ path, ...options }); return { response: { ok: true }, data: { success: true, liveJob: { jobId: ID, stage: { label: "Work in progress" } } } };
  } });
  assert.deepEqual(calls, [{ path: `/jobs/${ID}/live-state`, method: "GET" }]);
  assert.deepEqual(answer.actions, []); assert.equal(answer.text, "Current Job status: Work in progress.");
});
for (const instruction of ["Explain this invoice and then update the due date.", "Tell me why the outlet failed and complete this job."]) test(`mixed intent with an implicit subject still holds changes: ${instruction}`, async () => {
  const result = await resolveAskMeetroRequest(instruction, { context, role: "business", requestConversation: async () => "Explanation" });
  assert.deepEqual(result.actions, []); assert.match(result.text, /No change has been proposed/);
});
test("missing exact retrieval context and unavailable role navigation do not spend AI requests", async () => {
  for (const instruction of ["Show this Quote", "Open Leads"]) {
    const result = await resolveAskMeetroRequest(instruction, { role: "personal", requestConversation: () => assert.fail("no AI for deterministic clarification") });
    assert.deepEqual(result.actions, []); assert.equal(result.route, undefined);
  }
});
test("stalled transport times out without changing the retry key or creating actions", async () => {
  let signal;
  await assert.rejects(requestAskConversation({ instruction: "Help", idempotencyKey: ID, timeoutMs: 3, authFetchImpl: async (_path, options) => {
    signal = options.signal; assert.equal(options.headers["Idempotency-Key"], ID); return new Promise(() => {});
  } }), (error) => error.code === "ASK_CONVERSATION_TIMEOUT");
  assert.equal(signal.aborted, true);
});
test("session cancellation aborts pending conversation and prevents a late provider handoff", async () => {
  const controller = new AbortController(); let transportSignal;
  const request = requestAskConversation({ instruction: "Help", signal: controller.signal, authFetchImpl: async (_path, options) => { transportSignal = options.signal; return new Promise(() => {}); } });
  controller.abort(); await assert.rejects(request, (error) => error.code === "ASK_CONVERSATION_CANCELLED"); assert.equal(transportSignal.aborted, true);
  await assert.rejects(resolveAskMeetroRequest("Help", { signal: controller.signal, requestConversation: () => assert.fail("no request after session teardown") }), /cancelled/);
});

test("resolved vague Quote update asks for a specific change and creates no Review action", async () => {
  const answer = await resolveAskMeetroRequest(
    "Update Quote Q0000049",
    {
      context: {},
      role: "business",
      resolveActions: async () => [],
      requestConversation: async () => ({
        text:
          "The target record is resolved. Continue through its existing governed operation and Review.",
        resolution: {
          version: 1,
          status: "RESOLVED",
          audience: "professional",
          records: [{
            record: { type: "QUOTE", id: ID },
            name: "Bob Hamel",
            title: "Window repair",
            number: "Q0000049",
            label: "Bob Hamel — Window repair",
          }],
          truncated: false,
          reviewRequired: true,
          continuation: {
            reference: ID,
            expiresAfterSeconds: 900,
          },
          answerSource: "DETERMINISTIC_RETRIEVAL",
          providerInvoked: false,
        },
      }),
    }
  );

  assert.deepEqual(answer.actions, []);
  assert.match(answer.text, /Bob Hamel — Window repair/);
  assert.match(answer.text, /What would you like to change on this Quote/i);
  assert.match(answer.text, /Q0000049/);
  assert.doesNotMatch(
    answer.text,
    /Continue through its existing governed operation/
  );
});

test("source-first Quote arrow command reaches governed Quote-to-Invoice Review handoff", async () => {
  let resolverCalls = 0;

  const answer = await resolveAskMeetroRequest(
    "Quote Q0000049 → Create Invoice",
    {
      context: {},
      role: "business",
      requestConversation: async () => ({
        text:
          "The target record is resolved. Continue through its existing governed operation and Review.",
        resolution: {
          version: 1,
          status: "RESOLVED",
          audience: "professional",
          records: [{
            record: { type: "QUOTE", id: ID },
            name: "Bob Hamel",
            title: "Window repair",
            number: "Q0000049",
            label: "Bob Hamel — Window repair",
          }],
          truncated: false,
          reviewRequired: true,
          continuation: {
            reference: ID,
            expiresAfterSeconds: 900,
          },
          answerSource: "DETERMINISTIC_RETRIEVAL",
          providerInvoked: false,
        },
      }),
      resolveActions: async (_instruction, options) => {
        resolverCalls += 1;

        assert.equal(options.context.page, "quoteBuilder");
        assert.equal(options.context.quoteId, ID);

        return [{
          id: "0-QUOTE_TO_INVOICE",
          kind: "QUOTE_TO_INVOICE",
          title: "Prepare Invoice from exact Quote",
          instruction: "Quote Q0000049 → Create Invoice",
          route:
            "invoiceBuilder?sourceQuoteDraftId=7a02ee20-7f32-48eb-96dc-a3217bc5dcda&sourceQuoteVersion=1&sourceQuoteNumber=Q-0000049",
          context: options.context,
          status: "PROPOSED",
        }];
      },
    }
  );

  assert.equal(resolverCalls, 1);
  assert.equal(answer.actions.length, 1);
  assert.equal(answer.actions[0].kind, "QUOTE_TO_INVOICE");
  assert.equal(answer.actions[0].status, "PROPOSED");
  assert.match(answer.actions[0].route, /^invoiceBuilder\?/);
});

for (const [instruction, recordType] of [
  ["Update Quote Q0000049", "DOCUMENT_DRAFT"],
  ["Update Bob Hamel Quote Q0000049", "QUOTE"],
  ["Update customer Bob Hamel, Quote Q0000049", "QUOTE"],
]) {
  test(`vague resolved Quote target asks what to change: ${instruction} [${recordType}]`, async () => {
    const answer = await resolveAskMeetroRequest(
      instruction,
      {
        context: {},
        role: "business",
        resolveActions: async () => [],
        requestConversation: async () => ({
          text:
            "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
          resolution: {
            version: 1,
            status: "RESOLVED",
            audience: "professional",
            records: [{
              record: {
                type: recordType,
                id: ID,
              },
              name: "Bob Hamel",
              title: "Window repair",
              number: "Q0000049",
              label: "Bob Hamel — Window repair",
            }],
            truncated: false,
            reviewRequired: true,
            continuation: {
              reference: ID,
              expiresAfterSeconds: 900,
            },
            answerSource: "DETERMINISTIC_RETRIEVAL",
            providerInvoked: false,
          },
        }),
      }
    );

    assert.deepEqual(answer.actions, []);
    assert.match(answer.text, /Bob Hamel — Window repair/);
    assert.match(
      answer.text,
      /What would you like to change on this Quote/i
    );
    assert.match(answer.text, /Q0000049/);
    assert.doesNotMatch(
      answer.text,
      /Continue through its existing governed operation and Review/
    );
  });
}

test("specific Quote change is not downgraded into vague-change clarification", async () => {
  const serverText =
    "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.";

  const answer = await resolveAskMeetroRequest(
    "Update Quote Q0000049 labor to $300",
    {
      context: {},
      role: "business",
      resolveActions: async () => [],
      requestConversation: async () => ({
        text: serverText,
        resolution: {
          version: 1,
          status: "RESOLVED",
          audience: "professional",
          records: [{
            record: {
              type: "QUOTE",
              id: ID,
            },
            name: "Bob Hamel",
            title: "Window repair",
            number: "Q0000049",
            label: "Bob Hamel — Window repair",
          }],
          truncated: false,
          reviewRequired: true,
          continuation: {
            reference: ID,
            expiresAfterSeconds: 900,
          },
          answerSource: "DETERMINISTIC_RETRIEVAL",
          providerInvoked: false,
        },
      }),
    }
  );

  assert.deepEqual(answer.actions, []);

  assert.equal(
    answer.text,
    serverText
  );

  assert.doesNotMatch(
    answer.text,
    /What would you like to change on this Quote/i
  );
});
