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
