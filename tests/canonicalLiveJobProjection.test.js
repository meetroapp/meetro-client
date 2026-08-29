import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  fetchCanonicalLiveJobProjection,
  hasCanonicalLiveJobAction,
  normalizeCanonicalLiveJobProjection,
} from "../src/utils/canonicalLiveJobProjection.js";

const JOB_ID = "11111111-1111-4111-8111-111111111111";

function payload(overrides = {}) {
  return {
    success: true,
    liveJob: {
      jobId: JOB_ID,
      requestId: 41,
      relationshipId: 72,
      contractVersion: 1,
      stage: { code: "QUOTE_APPROVED", label: "Proposal approved" },
      responsibility: {
        code: "SYSTEM_WAITING",
        label: "Waiting for a future workflow step",
      },
      blocker: {
        code: "NEXT_WORKFLOW_AUTHORITY_NOT_AVAILABLE",
        label: "The next work-planning step is not available yet.",
      },
      nextAction: {
        code: "NEXT_STEP_NOT_YET_AVAILABLE",
        label: "The next step is not available yet",
        description: "This Job is waiting for a later workflow capability.",
      },
      availableActions: [
        { code: "VIEW_CONCERN", label: "View customer concern" },
        { code: "MESSAGE_CUSTOMER", label: "Message customer" },
        { code: "REVIEW_QUOTE", label: "Review proposal" },
      ],
      reasonCodes: ["APPROVED_QUOTE_PRESENT", "VISIT_SCHEDULE_AUTHORITY_ABSENT"],
      deposit: {
        obligationId: null,
        materialized: false,
        state: "NOT_REQUIRED",
        currency: "USD",
        requiredMinor: 0,
        appliedMinor: 0,
        remainingMinor: 0,
        latestVersion: null,
        schedulingLocked: false,
      },
      freshness: {
        derivedAt: "2026-08-12T12:00:00.000Z",
        jobCreatedAt: "2026-08-10T12:00:00.000Z",
        evaluationVersion: 2,
        findingVersion: 3,
        recommendationVersion: 1,
        quoteVersion: 4,
        workstreamVersion: 0,
        activityVersion: 0,
        obligationVersion: 0,
        approvedWorkExecutionVersion: 0,
        depositVersion: 0,
        invoiceVersion: 0,
        evaluationCount: 1,
        findingCount: 1,
        recommendationCount: 1,
        quoteCount: 1,
        workstreamCount: 0,
        activityCount: 0,
        obligationCount: 0,
      },
      ...overrides,
    },
  };
}

test("normalizer accepts the bounded server contract and exact action booleans", () => {
  const liveJob = normalizeCanonicalLiveJobProjection(payload());
  assert.equal(liveJob.authoritySource, "CANONICAL_LIVE_JOB_READ");
  assert.equal(liveJob.stage.label, "Proposal approved");
  assert.equal(liveJob.nextAction.code, "NEXT_STEP_NOT_YET_AVAILABLE");
  assert.equal(hasCanonicalLiveJobAction(liveJob, "MESSAGE_CUSTOMER"), true);
  assert.equal(hasCanonicalLiveJobAction(liveJob, "ISSUE_QUOTE"), false);
  assert.equal(hasCanonicalLiveJobAction(null, "MESSAGE_CUSTOMER"), false);
});

test("normalizer accepts durable Job completion and invoice handoff truth", () => {
  const liveJob = normalizeCanonicalLiveJobProjection(payload({
    stage: { code: "JOB_COMPLETED", label: "Work Completed" },
    responsibility: { code: "PROFESSIONAL", label: "Professional" },
    blocker: null,
    nextAction: {
      code: "READY_TO_INVOICE",
      label: "Ready to Invoice",
      description: "The completed Job can proceed to billing separately.",
    },
    availableActions: [
      { code: "VIEW_CONCERN", label: "View customer concern" },
      { code: "MESSAGE_CUSTOMER", label: "Message customer" },
      { code: "VIEW_JOB_HISTORY", label: "View Job History" },
    ],
  }));
  assert.equal(liveJob.stage.code, "JOB_COMPLETED");
  assert.equal(liveJob.nextAction.code, "READY_TO_INVOICE");
  assert.equal(hasCanonicalLiveJobAction(liveJob, "VIEW_JOB_HISTORY"), true);
});

test("normalizer accepts approved Work completion without inferring Job closure", () => {
  const liveJob = normalizeCanonicalLiveJobProjection(payload({
    stage: { code: "WORK_COMPLETED", label: "Work Completed" },
    responsibility: { code: "PROFESSIONAL", label: "Professional" },
    blocker: null,
    nextAction: {
      code: "READY_TO_INVOICE",
      label: "Ready to Invoice",
      description: "The operational Job is complete. Billing remains a separate next step.",
    },
    availableActions: [],
    reasonCodes: [
      "APPROVED_WORK_EXECUTION_COMPLETED",
      "INVOICE_NOT_CREATED",
      "JOB_CLOSURE_REMAINS_SEPARATE",
    ],
    freshness: {
      ...payload().liveJob.freshness,
      approvedWorkExecutionVersion: 2,
    },
  }));
  assert.equal(liveJob.stage.code, "WORK_COMPLETED");
  assert.equal(liveJob.nextAction.code, "READY_TO_INVOICE");
  assert.equal(liveJob.freshness.approvedWorkExecutionVersion, 2);
  assert.equal(hasCanonicalLiveJobAction(liveJob, "VIEW_JOB_HISTORY"), false);
});

test("normalizer keeps issued-undelivered responsibility with the professional", () => {
  const liveJob = normalizeCanonicalLiveJobProjection(payload({
    stage: { code: "QUOTE_DELIVERY_PENDING", label: "Proposal issued — delivery pending" },
    responsibility: { code: "PROFESSIONAL", label: "Professional" },
    blocker: {
      code: "QUOTE_NOT_DELIVERED",
      label: "The issued proposal has not been delivered to the customer.",
    },
    nextAction: {
      code: "REVIEW_QUOTE_DELIVERY",
      label: "Review proposal delivery",
      description: "The proposal is issued but still needs canonical delivery to the customer.",
    },
    availableActions: [{ code: "REVIEW_QUOTE", label: "Review proposal" }],
    reasonCodes: ["ISSUED_QUOTE_WITHOUT_QUALIFYING_DELIVERY"],
  }));
  assert.equal(liveJob.stage.code, "QUOTE_DELIVERY_PENDING");
  assert.equal(liveJob.responsibility.code, "PROFESSIONAL");
  assert.equal(liveJob.nextAction.code, "REVIEW_QUOTE_DELIVERY");
});

test("normalizer preserves the approved deposit gate without claiming scheduling readiness", () => {
  const liveJob = normalizeCanonicalLiveJobProjection(payload({
    stage: {
      code: "QUOTE_APPROVED_DEPOSIT_DUE",
      label: "Work approved — 75% deposit due",
    },
    responsibility: { code: "PROFESSIONAL", label: "Professional" },
    blocker: {
      code: "QUOTE_DEPOSIT_NOT_SATISFIED",
      label: "The approved proposal's deposit requirement is not yet satisfied.",
    },
    nextAction: {
      code: "REVIEW_APPROVED_QUOTE_TERMS",
      label: "Review approved proposal terms",
      description: "A 510.00 USD deposit is due before approved-work scheduling can proceed.",
    },
    availableActions: [{ code: "REVIEW_QUOTE", label: "Review proposal" }],
    reasonCodes: ["APPROVED_QUOTE_DEPOSIT_DUE", "PAYMENT_AUTHORITY_NOT_AVAILABLE"],
    deposit: {
      obligationId: null,
      materialized: false,
      state: "DUE",
      currency: "USD",
      requiredMinor: 51000,
      appliedMinor: 0,
      remainingMinor: 51000,
      latestVersion: null,
      schedulingLocked: true,
    },
  }));
  assert.equal(liveJob.stage.code, "QUOTE_APPROVED_DEPOSIT_DUE");
  assert.equal(liveJob.blocker.code, "QUOTE_DEPOSIT_NOT_SATISFIED");
  assert.equal(liveJob.nextAction.code, "REVIEW_APPROVED_QUOTE_TERMS");
  assert.equal(hasCanonicalLiveJobAction(liveJob, "SCHEDULE_WORK"), false);
  assert.equal(liveJob.deposit.state, "DUE");
  assert.equal(liveJob.deposit.remainingMinor, 51000);
});

test("normalizer preserves partial server deposit truth and deposit freshness", () => {
  const liveJob = normalizeCanonicalLiveJobProjection(payload({
    stage: {
      code: "QUOTE_APPROVED_DEPOSIT_DUE",
      label: "Work approved — deposit partially received",
    },
    responsibility: { code: "PROFESSIONAL", label: "Professional" },
    blocker: {
      code: "QUOTE_DEPOSIT_NOT_SATISFIED",
      label: "The approved proposal's deposit requirement is not yet satisfied.",
    },
    nextAction: {
      code: "REVIEW_APPROVED_QUOTE_TERMS",
      label: "Review approved proposal terms",
      description: "310.00 USD remains due before approved-work scheduling can proceed.",
    },
    availableActions: [{ code: "REVIEW_QUOTE", label: "Review proposal" }],
    reasonCodes: ["APPROVED_QUOTE_DEPOSIT_PARTIALLY_SATISFIED"],
    deposit: {
      obligationId: "22222222-2222-4222-8222-222222222222",
      materialized: true,
      state: "PARTIALLY_SATISFIED",
      currency: "USD",
      requiredMinor: 51000,
      appliedMinor: 20000,
      remainingMinor: 31000,
      latestVersion: 2,
      schedulingLocked: true,
    },
    freshness: { ...payload().liveJob.freshness, depositVersion: 2 },
  }));
  assert.equal(liveJob.deposit.appliedMinor, 20000);
  assert.equal(liveJob.deposit.remainingMinor, 31000);
  assert.equal(liveJob.freshness.depositVersion, 2);
});

test("unknown stages, actions, blockers, identity, and freshness fail closed", () => {
  assert.equal(
    normalizeCanonicalLiveJobProjection(payload({
      stage: { code: "INVOICE_DUE", label: "Invoice due" },
    })),
    null
  );
  assert.equal(
    normalizeCanonicalLiveJobProjection(payload({
      availableActions: [{ code: "SCHEDULE_WORK", label: "Schedule work" }],
    })),
    null
  );
  assert.equal(
    normalizeCanonicalLiveJobProjection(payload({
      blocker: { code: "RAW_DATABASE_ERROR", label: "Database error" },
    })),
    null
  );
  assert.equal(normalizeCanonicalLiveJobProjection(payload({ jobId: "legacy-job" })), null);
  assert.equal(
    normalizeCanonicalLiveJobProjection(payload({
      freshness: { ...payload().liveJob.freshness, quoteVersion: -1 },
    })),
    null
  );
});

test("fetch uses the exact authenticated no-store read route", async () => {
  const calls = [];
  const result = await fetchCanonicalLiveJobProjection({
    jobId: JOB_ID,
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return { response: { ok: true, status: 200 }, data: payload() };
    },
  });
  assert.equal(result.status, "ready");
  assert.deepEqual(calls, [{
    endpoint: `/jobs/${JOB_ID}/live-state`,
    options: { cache: "no-store" },
  }]);
});

test("malformed identity and backend denial never fall back to browser truth", async () => {
  let calls = 0;
  const malformed = await fetchCanonicalLiveJobProjection({
    jobId: "legacy-title",
    authFetchImpl: async () => { calls += 1; },
  });
  assert.equal(malformed.status, "unavailable");
  assert.equal(calls, 0);

  const denied = await fetchCanonicalLiveJobProjection({
    jobId: JOB_ID,
    authFetchImpl: async () => ({
      response: { ok: false, status: 404 },
      data: { code: "LIVE_JOB_UNAVAILABLE" },
    }),
  });
  assert.equal(denied.status, "error");
  assert.equal(denied.projection, null);
});

test("Current Job source does not derive canonical top state from local or legacy records", () => {
  const source = readFileSync(
    new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
    "utf8"
  );
  const canonicalBlock = source.slice(
    source.indexOf("const canonicalLiveJob ="),
    source.indexOf("const persistentContextCustomer =")
  );
  assert.match(canonicalBlock, /projection\?\.liveJob/);
  assert.match(canonicalBlock, /Current status unavailable/);
  assert.doesNotMatch(canonicalBlock, /localStorage|sessionStorage|compatibilityProjection/);
  assert.doesNotMatch(canonicalBlock, /Review canonical lifecycle details/);

  const evaluationSource = readFileSync(
    new URL("../src/components/CanonicalJobEvaluation.jsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /availableActions=\{canonicalLiveJob\?\.availableActions \|\| \[\]\}/);
  assert.match(evaluationSource, /actionCodes\.has\("START_EVALUATION"\)/);
  assert.match(evaluationSource, /actionCodes\.has\("EDIT_EVALUATION"\)/);
  assert.match(evaluationSource, /if \(!editingAllowed\)/);
});
