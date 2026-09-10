import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAskMeetroConversationContext,
  requestAskConversation,
  resolveAskMeetroRequest,
  validateAskMeetroResolution,
} from "../src/utils/askMeetroConversation.js";

const JOB_ID = "7e742dc1-e2a2-49c6-a493-11e351c80d54";
const SECOND_JOB_ID = "4cc72db2-2f01-4dd7-96ef-92bc58cbc4d9";
const OPERATION_ID = "69c69a0a-e00f-46bb-87f2-944bf19de374";

function resolution(overrides = {}) {
  return {
    version: 1,
    status: "RESOLVED",
    audience: "professional",
    records: [
      {
        record: { type: "JOB", id: JOB_ID },
        name: "Anthony Guzman",
        title: "Cabinet repair",
        number: "",
        label: "Anthony Guzman — Cabinet repair",
      },
    ],
    truncated: false,
    reviewRequired: false,
    continuation: {
      reference: OPERATION_ID,
      expiresAfterSeconds: 900,
    },
    answerSource: "DETERMINISTIC_RETRIEVAL",
    providerInvoked: false,
    ...overrides,
  };
}

function envelope(text = "Verified Meetro answer.", retrieval = resolution()) {
  return {
    response: { ok: true },
    data: {
      success: true,
      code: "INTELLIGENCE_OPERATION_COMPLETED",
      operation: "companion.converse",
      result: {
        schemaVersion: 1,
        text,
        authorityClassification: "CONVERSATIONAL_NON_CANONICAL",
        directMutationAllowed: false,
        resolution: retrieval,
      },
    },
  };
}

test("Retrieval V1 context-free request contains only retrieval opt-in", () => {
  assert.deepEqual(buildAskMeetroConversationContext({}), {
    retrieval: { version: 1 },
  });
});

test("Retrieval V1 exact record coexists with retrieval opt-in", () => {
  assert.deepEqual(
    buildAskMeetroConversationContext({
      page: "workCenter",
      jobId: JOB_ID,
    }),
    {
      record: {
        type: "JOB",
        id: JOB_ID,
      },
      retrieval: {
        version: 1,
      },
    }
  );
});

test("Retrieval V1 continuation contains only reference and bounded index", () => {
  assert.deepEqual(
    buildAskMeetroConversationContext(
      {},
      {
        reference: OPERATION_ID,
        index: 1,
      }
    ),
    {
      retrieval: {
        version: 1,
        continuation: {
          reference: OPERATION_ID,
          index: 1,
        },
      },
    }
  );
});

for (const continuation of [
  { reference: "bad", index: 0 },
  { reference: OPERATION_ID, index: -1 },
  { reference: OPERATION_ID, index: 10 },
  { reference: OPERATION_ID, index: 0, authority: true },
]) {
  test(`Retrieval V1 rejects malformed continuation ${JSON.stringify(continuation)}`, () => {
    assert.throws(
      () => buildAskMeetroConversationContext({}, continuation),
      /selected Ask Meetro record is no longer available/
    );
  });
}

test("valid deterministic Retrieval V1 resolution is accepted", () => {
  const validated = validateAskMeetroResolution(resolution());

  assert.ok(validated);
  assert.equal(validated.status, "RESOLVED");
  assert.equal(validated.answerSource, "DETERMINISTIC_RETRIEVAL");
  assert.equal(validated.providerInvoked, false);
  assert.equal(validated.records.length, 1);
  assert.equal(validated.records[0].record.id, JOB_ID);
});

test("valid provider Retrieval V1 resolution is accepted", () => {
  const validated = validateAskMeetroResolution(
    resolution({
      answerSource: "PROVIDER_CONVERSATION",
      providerInvoked: true,
    })
  );

  assert.ok(validated);
  assert.equal(validated.answerSource, "PROVIDER_CONVERSATION");
  assert.equal(validated.providerInvoked, true);
});

for (const invalid of [
  resolution({ version: 2 }),
  resolution({ status: "MAGIC" }),
  resolution({ audience: "admin" }),
  resolution({ providerInvoked: true }),
  resolution({
    answerSource: "PROVIDER_CONVERSATION",
    providerInvoked: false,
  }),
  resolution({
    records: [
      {
        record: { type: "JOB", id: "bad" },
        name: "Anthony",
        title: "Cabinet repair",
        number: "",
        label: "Anthony — Cabinet repair",
      },
    ],
  }),
  resolution({
    records: [],
    continuation: {
      reference: OPERATION_ID,
      expiresAfterSeconds: 900,
    },
  }),
  {
    ...resolution(),
    browserAuthority: true,
  },
]) {
  test("malformed or authority-expanding Retrieval V1 resolution fails closed", () => {
    assert.equal(validateAskMeetroResolution(invalid), null);
  });
}

test("request transport sends exact Retrieval V1 context", async () => {
  let body;

  const answer = await requestAskConversation({
    instruction: "What time is Anthony Guzman's job?",
    context: {},
    returnResolution: true,
    idempotencyKey: JOB_ID,
    authFetchImpl: async (_path, options) => {
      body = JSON.parse(options.body);
      return envelope("Anthony's Job is scheduled from canonical Meetro truth.");
    },
  });

  assert.deepEqual(body.context, {
    retrieval: { version: 1 },
  });

  assert.equal(body.operation, "companion.converse");
  assert.equal(answer.resolution.status, "RESOLVED");
  assert.equal(answer.resolution.providerInvoked, false);
});

test("request transport rejects malformed server resolution", async () => {
  await assert.rejects(
    requestAskConversation({
      instruction: "What time is Anthony's job?",
      returnResolution: true,
      idempotencyKey: JOB_ID,
      authFetchImpl: async () =>
        envelope("Unsafe result", {
          ...resolution(),
          directMutationAllowed: true,
        }),
    }),
    /invalid record resolution/i
  );
});

test("context-free operational request may resolve record but cannot mutate", async () => {
  let retrievalCalls = 0;

  const result = await resolveAskMeetroRequest(
    "Complete Anthony Guzman's job",
    {
      context: {},
      role: "business",
      resolveActions: async (_instruction, options) => {
        if (options.context?.jobId === JOB_ID) {
          return [
            {
              id: "review-complete",
              kind: "COMPLETE_JOB",
              title: "Review work completion",
              status: "PROPOSED",
              route: `workCenter?jobId=${JOB_ID}&stage=work`,
              context: options.context,
              instruction: "Complete Anthony Guzman's job",
            },
          ];
        }

        return [];
      },
      requestConversation: async (options) => {
        retrievalCalls += 1;
        assert.equal(options.returnResolution, true);

        return {
          text:
            "The target record is resolved. Continue through its existing governed operation and Review.",
          resolution: resolution({
            reviewRequired: true,
          }),
        };
      },
    }
  );

  assert.equal(retrievalCalls, 1);
  assert.equal(result.resolution.reviewRequired, true);
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].kind, "COMPLETE_JOB");
  assert.equal(result.actions[0].status, "PROPOSED");
  assert.match(result.actions[0].route, /workCenter/);

  for (const forbidden of [
    "applied",
    "receipt",
    "patch",
    "command",
    "success",
  ]) {
    assert.equal(Object.hasOwn(result, forbidden), false);
  }
});

test("resolved operational target with no governed client route stays non-mutating", async () => {
  const result = await resolveAskMeetroRequest(
    "Update Anthony Guzman's job",
    {
      context: {},
      role: "business",
      resolveActions: async () => [],
      requestConversation: async () => ({
        text:
          "The target record is resolved. Continue through its existing governed operation and Review.",
        resolution: resolution({
          reviewRequired: true,
        }),
      }),
    }
  );

  assert.deepEqual(result.actions, []);
  assert.equal(result.resolution.reviewRequired, true);
  assert.equal(result.resolution.records[0].record.id, JOB_ID);
});

test("mixed request cannot gain Review action from retrieval", async () => {
  let resolvedActionCalls = 0;

  const result = await resolveAskMeetroRequest(
    "Explain Anthony's job and complete it",
    {
      context: {},
      role: "business",
      resolveActions: async (_instruction, options) => {
        if (options.context?.jobId) resolvedActionCalls += 1;
        return [];
      },
      requestConversation: async () => ({
        text:
          "This request combines a question and a change. Send them separately. No action has been proposed or applied.",
        resolution: resolution({
          reviewRequired: false,
        }),
      }),
    }
  );

  assert.deepEqual(result.actions, []);
  assert.equal(resolvedActionCalls, 0);
  assert.equal(result.resolution.reviewRequired, false);
});

test("Retrieval V1 audience mismatch fails closed", async () => {
  await assert.rejects(
    resolveAskMeetroRequest("What is Anthony's Job status?", {
      context: {},
      role: "business",
      resolveActions: async () => [],
      requestConversation: async () => ({
        text: "Wrong audience.",
        resolution: resolution({
          audience: "homeowner",
        }),
      }),
    }),
    /different account mode/
  );
});

test("ambiguous retrieval preserves bounded choices without auto-selection", async () => {
  let resolvedActionCalls = 0;

  const ambiguous = resolution({
    status: "AMBIGUOUS",
    records: [
      {
        record: { type: "JOB", id: JOB_ID },
        name: "John Smith",
        title: "Bathroom",
        number: "",
        label: "John Smith — Bathroom",
      },
      {
        record: { type: "JOB", id: SECOND_JOB_ID },
        name: "John Rivera",
        title: "AC",
        number: "",
        label: "John Rivera — AC",
      },
    ],
    reviewRequired: false,
  });

  const result = await resolveAskMeetroRequest(
    "When is John's job?",
    {
      context: {},
      role: "business",
      resolveActions: async () => {
        resolvedActionCalls += 1;
        return [];
      },
      requestConversation: async () => ({
        text: "I found multiple possible records. Which one do you mean?",
        resolution: ambiguous,
      }),
    }
  );

  assert.equal(result.resolution.status, "AMBIGUOUS");
  assert.equal(result.resolution.records.length, 2);
  assert.equal(result.actions.length, 0);

  // One initial local planning call is permitted. No resolved record may be
  // selected automatically from the ambiguity result.
  assert.equal(resolvedActionCalls, 1);
});

test("ambiguity continuation sends exact server reference and selected index", async () => {
  let receivedContinuation;

  const result = await resolveAskMeetroRequest(
    "When is John's job?",
    {
      context: {},
      role: "business",
      continuation: {
        reference: OPERATION_ID,
        index: 1,
      },
      requestConversation: async (options) => {
        receivedContinuation = options.continuation;

        return {
          text: "The selected Job schedule is confirmed.",
          resolution: resolution({
            records: [
              {
                record: { type: "JOB", id: SECOND_JOB_ID },
                name: "John Rivera",
                title: "AC",
                number: "",
                label: "John Rivera — AC",
              },
            ],
          }),
        };
      },
    }
  );

  assert.deepEqual(receivedContinuation, {
    reference: OPERATION_ID,
    index: 1,
  });

  assert.equal(result.actions.length, 0);
  assert.equal(result.resolution.records[0].record.id, SECOND_JOB_ID);
});

test("continuation transport serializes reference and index without prior authority", async () => {
  let body;

  await requestAskConversation({
    instruction: "When is John's job?",
    context: {},
    continuation: {
      reference: OPERATION_ID,
      index: 1,
    },
    returnResolution: true,
    idempotencyKey: JOB_ID,
    authFetchImpl: async (_path, options) => {
      body = JSON.parse(options.body);
      return envelope();
    },
  });

  assert.deepEqual(body.context, {
    retrieval: {
      version: 1,
      continuation: {
        reference: OPERATION_ID,
        index: 1,
      },
    },
  });

  assert.equal(Object.hasOwn(body.context, "record"), false);
});

test("explicitly named different Job cannot inherit the currently open Job authority", async () => {
  let retrievalCalls = 0;
  const actionContexts = [];

  const result = await resolveAskMeetroRequest(
    "Schedule Jordan Rivera's job Friday",
    {
      context: {
        page: "workCenter",
        jobId: JOB_ID,
      },
      role: "business",

      resolveActions: async (_instruction, options) => {
        actionContexts.push(options.context);

        if (options.context?.jobId === JOB_ID) {
          return [
            {
              id: "unsafe-current-job",
              kind: "SCHEDULE",
              title: "Review schedule",
              instruction: "Schedule Jordan Rivera's job Friday",
              route: `workCenter?jobId=${JOB_ID}&stage=schedule`,
              context: options.context,
              status: "PROPOSED",
              details: [],
            },
          ];
        }

        if (options.context?.jobId === SECOND_JOB_ID) {
          return [
            {
              id: "resolved-named-job",
              kind: "SCHEDULE",
              title: "Review schedule",
              instruction: "Schedule Jordan Rivera's job Friday",
              route: `workCenter?jobId=${SECOND_JOB_ID}&stage=schedule`,
              context: options.context,
              status: "PROPOSED",
              details: [],
            },
          ];
        }

        return [];
      },

      requestConversation: async (options) => {
        retrievalCalls += 1;

        assert.equal(options.returnResolution, true);

        return {
          text:
            "Jordan Rivera's Job was resolved. Continue through the existing governed Review.",
          resolution: resolution({
            records: [
              {
                record: {
                  type: "JOB",
                  id: SECOND_JOB_ID,
                },
                name: "Jordan Rivera",
                title: "Electrical repair",
                number: "",
                label: "Jordan Rivera — Electrical repair",
              },
            ],
            reviewRequired: true,
          }),
        };
      },
    }
  );

  assert.equal(
    retrievalCalls,
    1,
    "explicitly named different record must use Universal Retrieval"
  );

  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].context.jobId, SECOND_JOB_ID);

  assert.notEqual(
    result.actions[0].context.jobId,
    JOB_ID,
    "currently open Job must not win over an explicitly named different Job"
  );
});
