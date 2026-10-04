import assert from "node:assert/strict";
import test from "node:test";

import {
  createExternalQuoteApprovalKey,
  recordExternalQuoteApproval,
} from "../src/utils/externalQuoteApprovalApi.js";

const IDS = Object.freeze({
  quote: "11111111-1111-4111-8111-111111111111",
  job: "22222222-2222-4222-8222-222222222222",
  approval: "33333333-3333-4333-8333-333333333333",
  evidence: "44444444-4444-4444-8444-444444444444",
  participant: "55555555-5555-4555-8555-555555555555",
});

const KEY =
  "quote-external-approval-66666666-6666-4666-8666-666666666666";

function quote(overrides = {}) {
  return {
    id: IDS.quote,
    jobId: IDS.job,
    requestId: null,
    relationshipId: null,
    status: "ISSUED",
    currentVersion: 2,
    decisionState: null,
    approval: null,
    ...overrides,
  };
}

function response({
  method = "EMAIL",
  approvedAt = "2026-09-02T20:00:00.000Z",
  reference = "Approval email 9/2",
  note = "Customer approved the exact Quote by email.",
} = {}) {
  return {
    success: true,
    code: "QUOTE_EXTERNAL_APPROVAL_RECORDED",
    externalApproval: {
      approvalId: IDS.approval,
      evidenceId: IDS.evidence,
      quoteId: IDS.quote,
      issuedQuoteVersion: 2,
      method,
      approvedAt,
      reference,
      note,
    },
    quote: {
      ...quote(),
      approval: {
        id: IDS.approval,
        source: "EXTERNAL_EVIDENCE",
        issuedQuoteVersion: 2,
        approvedAt,
        externalEvidence: {
          id: IDS.evidence,
          method,
          recordedByParticipantId: IDS.participant,
          reference,
          note,
        },
      },
    },
  };
}

test("external approval records one exact issued Quote evidence command", async () => {
  const calls = [];

  const result = await recordExternalQuoteApproval({
    quote: quote(),
    evidenceMethod: "EMAIL",
    approvedAt: "2026-09-02T20:00:00.000Z",
    evidenceReference: "Approval email 9/2",
    evidenceNote:
      "Customer approved the exact Quote by email.",
    idempotencyKey: KEY,
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return {
        response: { ok: true, status: 200 },
        data: response(),
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].endpoint,
    `/quotes/${IDS.quote}/external-approval`
  );
  assert.equal(calls[0].options.method, "POST");
  assert.equal(
    calls[0].options.headers["Idempotency-Key"],
    KEY
  );

  assert.deepEqual(
    JSON.parse(calls[0].options.body),
    {
      expectedIssuedVersion: 2,
      evidenceMethod: "EMAIL",
      approvedAt:
        "2026-09-02T20:00:00.000Z",
      evidenceReference: "Approval email 9/2",
      evidenceNote:
        "Customer approved the exact Quote by email.",
    }
  );

  assert.equal(
    result.approval.source,
    "EXTERNAL_EVIDENCE"
  );
  assert.equal(
    result.approval.externalEvidence.id,
    IDS.evidence
  );
  assert.equal(
    result.externalApproval.approvalId,
    IDS.approval
  );
});

test("external approval rejects marketplace, decided, already-approved, future, and evidence-free commands before fetch", async () => {
  let calls = 0;
  const authFetchImpl = async () => {
    calls += 1;
  };

  const unsafe = [
    {
      quote: quote({
        requestId: 9,
        relationshipId: 10,
      }),
      evidenceReference: "Phone call",
    },
    {
      quote: quote({
        decisionState: "APPROVED",
      }),
      evidenceReference: "Phone call",
    },
    {
      quote: quote({
        approval: {
          source: "EXTERNAL_EVIDENCE",
        },
      }),
      evidenceReference: "Phone call",
    },
    {
      quote: quote(),
      approvedAt:
        new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      evidenceReference: "Phone call",
    },
    {
      quote: quote(),
      evidenceReference: "",
      evidenceNote: "",
    },
  ];

  for (const scenario of unsafe) {
    await assert.rejects(
      () =>
        recordExternalQuoteApproval({
          quote: scenario.quote,
          evidenceMethod: "PHONE",
          approvedAt:
            scenario.approvedAt ||
            "2026-09-02T20:00:00.000Z",
          evidenceReference:
            scenario.evidenceReference ?? null,
          evidenceNote:
            scenario.evidenceNote ?? null,
          idempotencyKey: KEY,
          authFetchImpl,
        }),
      { code: "INVALID_QUOTE_EXTERNAL_APPROVAL" }
    );
  }

  assert.equal(calls, 0);
});

test("external approval fails closed when server evidence does not bind the exact Quote approval", async () => {
  await assert.rejects(
    () =>
      recordExternalQuoteApproval({
        quote: quote(),
        evidenceMethod: "EMAIL",
        approvedAt:
          "2026-09-02T20:00:00.000Z",
        evidenceReference: "Approval email 9/2",
        idempotencyKey: KEY,
        authFetchImpl: async () => ({
          response: { ok: true, status: 200 },
          data: {
            ...response(),
            quote: {
              ...response().quote,
              approval: {
                ...response().quote.approval,
                id:
                  "77777777-7777-4777-8777-777777777777",
              },
            },
          },
        }),
      }),
    { code: "UNSAFE_QUOTE_EXTERNAL_APPROVAL_RESPONSE" }
  );
});

test("external approval command key uses one secure bounded identity", () => {
  const key = createExternalQuoteApprovalKey({
    randomUUID() {
      return "88888888-8888-4888-8888-888888888888";
    },
  });

  assert.equal(
    key,
    "quote-external-approval-88888888-8888-4888-8888-888888888888"
  );
});
