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
test("audience validation remains fail-closed for Emergency advisory context", async () => {
  await assert.rejects(
    resolveAskMeetroRequest("What details should I include?", {
      context: { page: "emergencyRequest", label: "Emergency Help" },
      role: "personal",
      requestConversation: async () => ({
        text: "Professional-only response",
        resolution: {
          version: 1,
          status: "NO_RECORD_REQUIRED",
          audience: "professional",
          records: [],
          truncated: false,
          reviewRequired: false,
          continuation: null,
          answerSource: "DETERMINISTIC_RETRIEVAL",
          providerInvoked: false,
        },
      }),
    }),
    (error) => error?.code === "ASK_CONVERSATION_AUDIENCE_INVALID"
  );
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
  const answer = await resolveAskMeetroRequest(
    "Update Quote Q0000049 labor to $300",
    {
      context: {},
      role: "business",
      resolveActions: async () => [],

      // Exact working-document authority is unavailable in this guard.
      // A specific supplied change must fail closed rather than becoming
      // the R3 vague-target clarification.
      listDocuments: async () => [],

      requestConversation: async () => ({
        text:
          "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
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
  assert.equal(answer.inlineWorkspace, undefined);

  assert.equal(
    answer.text,
    "The exact working Quote could not be opened here. Nothing has been changed."
  );

  assert.doesNotMatch(
    answer.text,
    /What would you like to change on this Quote/i
  );

  assert.doesNotMatch(
    answer.text,
    /Continue through its existing governed operation and Review/
  );
});

test("specific resolved Quote edit resolves exact working Quote for inline Ask workspace", async () => {
  const CANONICAL_QUOTE_ID =
    "7e742dc1-e2a2-49c6-a493-11e351c80d54";
  const WORKING_DRAFT_ID =
    "8b4ba9b7-9c65-4a90-9c25-1d536b82b3ea";

  const sourceDocument = {
    id: WORKING_DRAFT_ID,
    version: 7,
    documentType: "QUOTE",
    status: "WORKING_DRAFT",
    reference: "quote-working",
    documentNumber: "Q-0000049",
    customerDisplayName: "Bob Hamel",
    content: {
      customerName: "Bob Hamel",
      projectTitle: "Window repair",
    },
  };

  const listCalls = [];

  const answer = await resolveAskMeetroRequest(
    "Update Quote Q0000049 labor to $300",
    {
      context: {},
      role: "business",

      resolveActions: async () => [],

      listDocuments: async (options) => {
        listCalls.push(options);
        return [sourceDocument];
      },

      requestConversation: async () => ({
        text:
          "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
        resolution: {
          version: 1,
          status: "RESOLVED",
          audience: "professional",
          records: [{
            record: {
              type: "DOCUMENT_DRAFT",
              id: WORKING_DRAFT_ID,
            },
            name: "Bob Hamel",
            title: "Window repair",
            number: "Q-0000049",
            label: "Bob Hamel — Window repair",
          }],
          truncated: false,
          reviewRequired: true,
          continuation: {
            reference: CANONICAL_QUOTE_ID,
            expiresAfterSeconds: 900,
          },
          answerSource: "DETERMINISTIC_RETRIEVAL",
          providerInvoked: false,
        },
      }),
    }
  );

  assert.equal(listCalls.length, 1);
  assert.equal(listCalls[0].search, "Q-0000049");
  assert.equal(listCalls[0].type, "QUOTE");

  assert.deepEqual(answer.actions, []);
  assert.equal(answer.route, undefined);

  assert.equal(answer.inlineWorkspace?.type, "BUSINESS_DOCUMENT");
  assert.equal(answer.inlineWorkspace?.documentType, "QUOTE");
  assert.equal(
    answer.inlineWorkspace?.document?.id,
    WORKING_DRAFT_ID
  );
  assert.equal(
    answer.inlineWorkspace?.document?.version,
    7
  );
  assert.equal(
    answer.inlineWorkspace?.instruction,
    "Update Quote Q0000049 labor to $300"
  );

  // Canonical Quote identity must never become working-draft identity.
  assert.notEqual(
    answer.inlineWorkspace?.document?.id,
    CANONICAL_QUOTE_ID
  );

  assert.match(
    answer.text,
    /Bob Hamel/
  );
  assert.match(
    answer.text,
    /Q-0000049/
  );
  assert.match(
    answer.text,
    /review or edit/i
  );
  assert.doesNotMatch(
    answer.text,
    /Continue through its existing governed operation and Review/
  );
});

test("canonical QUOTE retrieval cannot open a matching-number working draft bound to a different canonical Quote", async () => {
  const RETRIEVED_CANONICAL_QUOTE_ID =
    "7e742dc1-e2a2-49c6-a493-11e351c80d54";

  const DIFFERENT_CANONICAL_QUOTE_ID =
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  const WORKING_DRAFT_ID =
    "8b4ba9b7-9c65-4a90-9c25-1d536b82b3ea";

  const JOB_ID =
    "11111111-1111-4111-8111-111111111111";

  const sourceDocument = {
    id: WORKING_DRAFT_ID,
    version: 7,
    documentType: "QUOTE",
    status: "WORKING_DRAFT",
    documentNumber: "Q-0000049",
    jobId: JOB_ID,
    customerDisplayName: "Bob Hamel",
    content: {
      customerName: "Bob Hamel",
    },
  };

  let authorityReads = 0;

  const answer = await resolveAskMeetroRequest(
    "Update Quote Q0000049 labor to $300",
    {
      context: {},
      role: "business",

      requestConversation: async () => ({
        text:
          "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
        resolution: {
          version: 1,
          status: "RESOLVED",
          audience: "professional",
          records: [{
            record: {
              type: "QUOTE",
              id: RETRIEVED_CANONICAL_QUOTE_ID,
            },
            name: "Bob Hamel",
            title: "Window repair",
            number: "Q-0000049",
            label: "Bob Hamel — Window repair",
          }],
          truncated: false,
          reviewRequired: true,
          continuation: {
            reference: RETRIEVED_CANONICAL_QUOTE_ID,
            expiresAfterSeconds: 900,
          },
          answerSource: "DETERMINISTIC_RETRIEVAL",
          providerInvoked: false,
        },
      }),

      listDocuments: async ({ search, type }) => {
        assert.equal(search, "Q-0000049");
        assert.equal(type, "QUOTE");
        return [sourceDocument];
      },

      getQuoteAuthority: async ({ document }) => {
        authorityReads += 1;

        assert.equal(document.id, WORKING_DRAFT_ID);
        assert.equal(document.version, 7);
        assert.equal(document.jobId, JOB_ID);

        return {
          source: "SAVED_WORKING_QUOTE_AUTHORITY",
          sourceDocument: {
            documentId: WORKING_DRAFT_ID,
            documentVersion: 7,
            documentNumber: "Q-0000049",
            jobId: JOB_ID,
          },
          canonicalQuote: {
            id: DIFFERENT_CANONICAL_QUOTE_ID,
            jobId: JOB_ID,
            sourceBusinessDocument: {
              documentId: WORKING_DRAFT_ID,
              documentVersion: 7,
              currentDocumentVersion: 7,
              currentSnapshotMatchesSource: true,
            },
          },
          delivery: null,
        };
      },
    }
  );

  assert.equal(
    authorityReads,
    1,
    "canonical QUOTE retrieval must verify the working draft through saved Quote authority"
  );

  assert.equal(
    answer.inlineWorkspace,
    undefined,
    "a different canonical Quote must never inherit the editable working draft"
  );

  assert.deepEqual(answer.actions, []);

  assert.match(
    answer.blockedReason || answer.text,
    /canonical Quote.*does not match|canonical Quote.*could not be verified/i
  );
});

test("canonical QUOTE retrieval opens only its exactly bound working draft", async () => {
  const CANONICAL_QUOTE_ID =
    "7e742dc1-e2a2-49c6-a493-11e351c80d54";

  const WORKING_DRAFT_ID =
    "8b4ba9b7-9c65-4a90-9c25-1d536b82b3ea";

  const JOB_ID =
    "11111111-1111-4111-8111-111111111111";

  const sourceDocument = {
    id: WORKING_DRAFT_ID,
    version: 7,
    documentType: "QUOTE",
    status: "WORKING_DRAFT",
    documentNumber: "Q-0000049",
    jobId: JOB_ID,
    customerDisplayName: "Bob Hamel",
    content: {
      customerName: "Bob Hamel",
    },
  };

  let authorityReads = 0;

  const answer = await resolveAskMeetroRequest(
    "Update Quote Q0000049 labor to $300",
    {
      context: {},
      role: "business",

      requestConversation: async () => ({
        text:
          "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
        resolution: {
          version: 1,
          status: "RESOLVED",
          audience: "professional",
          records: [{
            record: {
              type: "QUOTE",
              id: CANONICAL_QUOTE_ID,
            },
            name: "Bob Hamel",
            title: "Window repair",
            number: "Q-0000049",
            label: "Bob Hamel — Window repair",
          }],
          truncated: false,
          reviewRequired: true,
          continuation: {
            reference: CANONICAL_QUOTE_ID,
            expiresAfterSeconds: 900,
          },
          answerSource: "DETERMINISTIC_RETRIEVAL",
          providerInvoked: false,
        },
      }),

      listDocuments: async ({ search, type }) => {
        assert.equal(search, "Q-0000049");
        assert.equal(type, "QUOTE");
        return [sourceDocument];
      },

      getQuoteAuthority: async ({ document }) => {
        authorityReads += 1;

        assert.equal(document.id, WORKING_DRAFT_ID);
        assert.equal(document.version, 7);
        assert.equal(document.jobId, JOB_ID);

        return {
          source: "SAVED_WORKING_QUOTE_AUTHORITY",
          sourceDocument: {
            documentId: WORKING_DRAFT_ID,
            documentVersion: 7,
            documentNumber: "Q-0000049",
            jobId: JOB_ID,
          },
          canonicalQuote: {
            id: CANONICAL_QUOTE_ID,
            jobId: JOB_ID,
            sourceBusinessDocument: {
              documentId: WORKING_DRAFT_ID,
              documentVersion: 7,
              currentDocumentVersion: 7,
              currentSnapshotMatchesSource: true,
            },
          },
          delivery: null,
        };
      },
    }
  );

  assert.equal(
    authorityReads,
    1,
    "canonical QUOTE retrieval must verify saved Quote authority before opening"
  );

  assert.deepEqual(answer.actions, []);
  assert.equal(answer.blockedReason, undefined);

  assert.ok(
    answer.inlineWorkspace,
    "exact canonical mapping should permit the existing working Quote form"
  );

  assert.equal(
    answer.inlineWorkspace.type,
    "BUSINESS_DOCUMENT"
  );

  assert.equal(
    answer.inlineWorkspace.documentType,
    "QUOTE"
  );

  assert.equal(
    answer.inlineWorkspace.document.id,
    WORKING_DRAFT_ID
  );

  assert.equal(
    answer.inlineWorkspace.document.version,
    7
  );

  assert.equal(
    answer.inlineWorkspace.instruction,
    "Update Quote Q0000049 labor to $300"
  );

  assert.match(
    answer.text,
    /exact working Quote is ready here/i
  );
});


test("specific resolved working Invoice edit resolves exact working Invoice for inline Ask workspace", async () => {
  const INVOICE_DRAFT_ID =
    "55a5d4de-c95c-47ae-bca0-e10830f34211";

  const document = {
    id: INVOICE_DRAFT_ID,
    version: 4,
    documentType: "INVOICE",
    status: "WORKING_DRAFT",
    documentNumber: "INV-0000012",
    jobId: null,
    customerDisplayName: "Bob Hamel",
    customerParty: null,
    content: {
      customerName: "Bob Hamel",
      projectTitle: "Window repair",
      notes: "Original Invoice note",
      paymentTerms: "Due on receipt",
      dueDate: "",
      lineItems: [{
        description: "Window repair",
        quantity: "1",
        unitPrice: "380",
      }],
    },
    workspace: {
      activeDocument: "INVOICE",
      instructions: [],
      manualOverrides: {},
      privateReminders: [],
    },
    photos: [],
    createdAt: "2026-09-10T12:00:00.000Z",
    updatedAt: "2026-09-10T12:00:00.000Z",
  };

  const listCalls = [];

  const answer = await resolveAskMeetroRequest(
    "Update Invoice INV0000012 notes to include paid by check",
    {
      context: {},
      role: "business",

      requestConversation: async () => ({
        text:
          "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
        resolution: {
          version: 1,
          status: "RESOLVED",
          audience: "professional",
          records: [{
            record: {
              type: "DOCUMENT_DRAFT",
              id: INVOICE_DRAFT_ID,
            },
            name: "Bob Hamel",
            title: "Window repair",
            number: "INV-0000012",
            label: "Bob Hamel — Window repair",
          }],
          truncated: false,
          reviewRequired: true,
          continuation: null,
          answerSource: "DETERMINISTIC_RETRIEVAL",
          providerInvoked: false,
        },
      }),

      resolveActions: async () => [],

      listDocuments: async (options) => {
        listCalls.push(options);
        return [document];
      },
    }
  );

  assert.equal(
    listCalls.length,
    1,
    "working Invoice must be independently re-read before inline hosting"
  );

  assert.equal(
    listCalls[0].type,
    "INVOICE",
    "Invoice resolution must query only saved Invoice documents"
  );

  assert.ok(
    answer.inlineWorkspace,
    "exact working Invoice should enter the existing inline business-document host"
  );

  assert.equal(
    answer.inlineWorkspace.type,
    "BUSINESS_DOCUMENT"
  );

  assert.equal(
    answer.inlineWorkspace.documentType,
    "INVOICE"
  );

  assert.equal(
    answer.inlineWorkspace.document.id,
    INVOICE_DRAFT_ID
  );

  assert.equal(
    answer.inlineWorkspace.document.version,
    4
  );

  assert.equal(
    answer.inlineWorkspace.instruction,
    "Update Invoice INV0000012 notes to include paid by check"
  );

  assert.match(
    answer.text,
    /exact working Invoice is ready here/i
  );

  assert.doesNotMatch(
    answer.text,
    /exact working Quote is ready here/i
  );

  assert.deepEqual(answer.actions, []);
  assert.equal(answer.blockedReason, undefined);
});


test("canonical INVOICE retrieval cannot borrow a same-number working Invoice", async () => {
  const CANONICAL_INVOICE_ID =
    "f7c84a3d-4446-477b-8f7f-e6f08a99a211";

  let workingDocumentReads = 0;

  const answer = await resolveAskMeetroRequest(
    "Update Invoice INV0000012 notes to include paid by check",
    {
      context: {},
      role: "business",

      requestConversation: async () => ({
        text:
          "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
        resolution: {
          version: 1,
          status: "RESOLVED",
          audience: "professional",
          records: [{
            record: {
              type: "INVOICE",
              id: CANONICAL_INVOICE_ID,
            },
            name: "Bob Hamel",
            title: "Window repair",
            number: "INV-0000012",
            label: "Bob Hamel — Window repair",
          }],
          truncated: false,
          reviewRequired: true,
          continuation: null,
          answerSource: "DETERMINISTIC_RETRIEVAL",
          providerInvoked: false,
        },
      }),

      resolveActions: async () => [],

      listDocuments: async () => {
        workingDocumentReads += 1;

        return [{
          id: "55a5d4de-c95c-47ae-bca0-e10830f34211",
          version: 4,
          documentType: "INVOICE",
          status: "WORKING_DRAFT",
          documentNumber: "INV-0000012",
          customerDisplayName: "Bob Hamel",
          content: {
            customerName: "Bob Hamel",
            projectTitle: "Window repair",
          },
          workspace: {
            activeDocument: "INVOICE",
            instructions: [],
            manualOverrides: {},
            privateReminders: [],
          },
          photos: [],
        }];
      },
    }
  );

  assert.equal(
    workingDocumentReads,
    0,
    "canonical Invoice identity must never be converted to working-draft authority by number"
  );

  assert.equal(
    answer.inlineWorkspace,
    undefined
  );

  assert.deepEqual(answer.actions, []);
});
