import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ApprovedWorkExecutionApiError,
  buildApprovedWorkCompletionSnapshot,
  completeApprovedWork,
  completeWorkFailureMessage,
  createApprovedWorkCompletionIdempotencyKey,
  fetchCompletableApprovedWorkExecution,
  normalizeApprovedWorkExecution,
} from "../src/utils/approvedWorkExecutionApi.js";

const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";
const EXECUTION_ID = "93e5c839-cc64-43ea-9333-5927ca636c5c";
const WORKSTREAM_ID = "a0249cbd-54ee-488a-aa6f-6ed8b45a10c0";
const ACTIVITY_ID = "68a9621c-dcdd-4883-8632-acc7387ea08e";
const NON_EXECUTION_ACTIVITY_ID = "11111111-1111-4111-8111-111111111111";
const QUOTE_ID = "f1858dc5-0c68-4296-af12-2e714ee8a42a";
const DECISION_ID = "89ffcce1-df4b-42d0-b0b3-d6c8739646ca";
const CUSTOMER_ID = "22222222-2222-4222-8222-222222222222";
const BINDING_ID = "33333333-3333-4333-8333-333333333333";

function executionBase(overrides = {}) {
  return {
    contractVersion: 1,
    id: EXECUTION_ID,
    jobId: JOB_ID,
    relationshipId: 345,
    source: {
      quoteId: QUOTE_ID,
      issuedQuoteVersion: 3,
      approvedCustomerDecisionId: DECISION_ID,
      customerParticipantId: CUSTOMER_ID,
      currency: "USD",
    },
    currentVersion: 1,
    state: "ACTIVE",
    successorExecutionId: null,
    createdAt: "2026-08-28T15:00:00.000Z",
    versionCreatedAt: "2026-08-28T15:00:00.000Z",
    safeNextActions: [
      "BIND_WORKSTREAM",
      "CLASSIFY_ACTIVITY",
      "RECONCILE_LEGACY",
      "COMPLETE_WORK",
    ],
    ...overrides,
  };
}

function executionDetail(overrides = {}) {
  return {
    ...executionBase(),
    boundWorkstreams: [{
      id: BINDING_ID,
      executionId: EXECUTION_ID,
      workstreamId: WORKSTREAM_ID,
      jobId: JOB_ID,
      workstream: {
        sequence: 1,
        title: "Approved Work",
        state: "OPEN",
        currentVersion: 1,
      },
      createdAt: "2026-08-28T15:01:00.000Z",
    }],
    activityClassifications: [{
      activityId: ACTIVITY_ID,
      workstreamId: WORKSTREAM_ID,
      jobId: JOB_ID,
      classification: "EXECUTION",
      executionId: EXECUTION_ID,
      scopeBasis: "DECISION_WIDE",
      sourceScopeItemId: null,
      classifiedActivityVersion: 1,
      activity: {
        type: "EXECUTION_ACTIVITY",
        statement: "Complete the approved repair",
        status: "DONE",
        currentVersion: 3,
      },
      createdAt: "2026-08-28T15:02:00.000Z",
    }, {
      activityId: NON_EXECUTION_ACTIVITY_ID,
      workstreamId: WORKSTREAM_ID,
      jobId: JOB_ID,
      classification: "NON_EXECUTION",
      executionId: null,
      scopeBasis: null,
      sourceScopeItemId: null,
      classifiedActivityVersion: 1,
      activity: {
        type: "ADMINISTRATIVE",
        statement: "Internal note",
        status: "DONE",
        currentVersion: 2,
      },
      createdAt: "2026-08-28T15:02:00.000Z",
    }],
    startEvents: {
      count: 1,
      firstStartedAt: "2026-08-28T16:00:00.000Z",
      latestStartedAt: "2026-08-28T16:00:00.000Z",
    },
    ...overrides,
  };
}

function completionResponse() {
  return {
    success: true,
    code: "APPROVED_WORK_COMPLETED",
    completion: {
      contractVersion: 1,
      state: "WORK_COMPLETED",
      jobId: JOB_ID,
      relationshipId: 345,
      executionId: EXECUTION_ID,
      executionVersion: 2,
      quoteId: QUOTE_ID,
      issuedQuoteVersion: 3,
      approvedCustomerDecisionId: DECISION_ID,
      completedByParticipantId: "44444444-4444-4444-8444-444444444444",
      completedAt: "2026-08-29T14:00:00.000Z",
      evidence: {
        type: "APPROVED_WORK_EXECUTION_VERSION",
        commandId: "55555555-5555-4555-8555-555555555555",
        integrityHash: "hash",
      },
      startEvidence: {
        count: 1,
        firstStartedAt: "2026-08-28T16:00:00.000Z",
      },
      activities: [],
      workstreams: [],
      nextAction: { code: "READY_TO_INVOICE", label: "Ready to Invoice" },
    },
    execution: executionDetail({
      currentVersion: 2,
      state: "CLOSED",
      versionCreatedAt: "2026-08-29T14:00:00.000Z",
      safeNextActions: [],
      boundWorkstreams: executionDetail().boundWorkstreams.map((binding) => ({
        ...binding,
        workstream: { ...binding.workstream, state: "COMPLETED", currentVersion: 2 },
      })),
      activityClassifications: executionDetail().activityClassifications.map((classification) =>
        classification.classification === "EXECUTION"
          ? { ...classification, activity: { ...classification.activity, status: "DONE", currentVersion: 3 } }
          : classification
      ),
    }),
  };
}

function ok(data, status = 200) {
  return { response: { ok: true, status }, data };
}

test("canonical detail yields the exact execution, Workstream, and EXECUTION Activity snapshot", () => {
  const detail = normalizeApprovedWorkExecution(executionDetail(), { jobId: JOB_ID, detail: true });
  const snapshot = buildApprovedWorkCompletionSnapshot(detail);
  assert.deepEqual(snapshot, {
    expectedExecutionVersion: 1,
    expectedWorkstreams: [{ workstreamId: WORKSTREAM_ID, expectedVersion: 1 }],
    expectedActivities: [{ activityId: ACTIVITY_ID, expectedVersion: 3 }],
  });
});

test("NON_EXECUTION Activity versions never enter the completion command", () => {
  const snapshot = buildApprovedWorkCompletionSnapshot(executionDetail());
  assert.equal(snapshot.expectedActivities.length, 1);
  assert.equal(snapshot.expectedActivities[0].activityId, ACTIVITY_ID);
  assert.equal(snapshot.expectedActivities.some((entry) => entry.activityId === NON_EXECUTION_ACTIVITY_ID), false);
});

test("completion fails closed without start evidence or COMPLETE_WORK safe action", () => {
  assert.throws(
    () => buildApprovedWorkCompletionSnapshot(executionDetail({
      startEvents: { count: 0, firstStartedAt: null, latestStartedAt: null },
    })),
    ApprovedWorkExecutionApiError
  );
  assert.throws(
    () => buildApprovedWorkCompletionSnapshot(executionDetail({ safeNextActions: [] })),
    ApprovedWorkExecutionApiError
  );
});

test("eligible execution discovery is read-only and loads exact detail", async () => {
  const calls = [];
  const detail = await fetchCompletableApprovedWorkExecution({
    jobId: JOB_ID,
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      if (calls.length === 1) {
        return ok({ success: true, code: "APPROVED_WORK_EXECUTIONS_FOUND", executions: [executionBase()] });
      }
      return ok({ success: true, code: "APPROVED_WORK_EXECUTION_FOUND", execution: executionDetail() });
    },
  });
  assert.equal(detail.id, EXECUTION_ID);
  assert.deepEqual(calls.map((call) => call.options.method), ["GET", "GET"]);
  assert.equal(calls.some((call) => call.endpoint.endsWith("/complete-work")), false);
});

test("CTA authority is absent when no active execution advertises COMPLETE_WORK", async () => {
  const result = await fetchCompletableApprovedWorkExecution({
    jobId: JOB_ID,
    authFetchImpl: async () => ok({
      success: true,
      code: "APPROVED_WORK_EXECUTIONS_FOUND",
      executions: [executionBase({ state: "CLOSED", currentVersion: 2, safeNextActions: [] })],
    }),
  });
  assert.equal(result, null);
});

test("one deliberate attempt receives one stable bounded idempotency key", () => {
  const key = createApprovedWorkCompletionIdempotencyKey({
    randomUUID: () => "66666666-6666-4666-8666-666666666666",
  });
  assert.equal(key, "approved-work:complete:66666666-6666-4666-8666-666666666666");
});

test("confirmation performs exactly one complete-work mutation with the fresh canonical snapshot", async () => {
  const calls = [];
  const result = await completeApprovedWork({
    jobId: JOB_ID,
    executionId: EXECUTION_ID,
    idempotencyKey: "approved-work:complete:fixed-attempt",
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return calls.length === 1
        ? ok({ success: true, code: "APPROVED_WORK_EXECUTION_FOUND", execution: executionDetail() })
        : ok(completionResponse());
    },
  });
  const mutations = calls.filter((call) => call.options.method === "POST");
  assert.equal(mutations.length, 1);
  assert.equal(mutations[0].endpoint, `/jobs/${JOB_ID}/approved-work-executions/${EXECUTION_ID}/complete-work`);
  assert.equal(mutations[0].options.headers["Idempotency-Key"], "approved-work:complete:fixed-attempt");
  assert.deepEqual(JSON.parse(mutations[0].options.body), {
    expectedExecutionVersion: 1,
    expectedWorkstreams: [{ workstreamId: WORKSTREAM_ID, expectedVersion: 1 }],
    expectedActivities: [{ activityId: ACTIVITY_ID, expectedVersion: 3 }],
  });
  assert.equal(result.completion.state, "WORK_COMPLETED");
  assert.equal(result.completion.nextAction.code, "READY_TO_INVOICE");
});

test("server rejection remains professional-facing and hides concurrency internals", () => {
  const message = completeWorkFailureMessage({
    status: 409,
    code: "STALE_APPROVED_WORK_COMPLETION_SNAPSHOT",
  });
  assert.equal(message, "This work changed before completion. Refresh the Work Plan and try again.");
  assert.doesNotMatch(message, /expectedVersion|SERIALIZABLE|idempotency|fingerprint|Workstream version|Activity version/i);
});

test("Work In Progress renders one governed Complete Work CTA and a cancelable confirmation", () => {
  const source = readFileSync(
    new URL("../src/components/ProfessionalWorkPlanWorkspace.jsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /mode === "IN_PROGRESS"[\s\S]*safeNextActions\.includes\("COMPLETE_WORK"\)/);
  assert.match(source, /onClick=\{openCompleteWorkConfirmation\}>Complete Work<\/button>/);
  assert.match(source, /role="dialog"[\s\S]*Complete this work\?/);
  assert.match(source, /onClick=\{cancelCompleteWorkConfirmation\}[\s\S]*>Cancel<\/button>/);
  assert.match(source, /disabled=\{completionAttempt\.submitting/);
  assert.match(source, /completionInFlight\.current/);
});

test("success waits for the canonical response, refreshes execution, Work Plan, and live Job, then shows Invoice handoff", () => {
  const source = readFileSync(
    new URL("../src/components/ProfessionalWorkPlanWorkspace.jsx", import.meta.url),
    "utf8"
  );
  const submitStart = source.indexOf("async function confirmCompleteWork");
  const submit = source.slice(submitStart, source.indexOf("\n  return (", submitStart));
  assert.match(submit, /await completeApprovedWork/);
  assert.match(submit, /setCompletion\(result\.completion\)/);
  assert.match(submit, /execution: result\.execution/);
  assert.match(submit, /setRefreshKey/);
  assert.match(submit, /await Promise\.resolve\(onCanonicalChange/);
  assert.match(source, /Work Completed[\s\S]*The approved work has been finished\.[\s\S]*Prepare Final Invoice/);
});

test("normal client path contains no Activity, Workstream, Job completion, Invoice, payment, or History mutation chain", () => {
  const api = readFileSync(
    new URL("../src/utils/approvedWorkExecutionApi.js", import.meta.url),
    "utf8"
  );
  const workspace = readFileSync(
    new URL("../src/components/ProfessionalWorkPlanWorkspace.jsx", import.meta.url),
    "utf8"
  );
  const posts = [...api.matchAll(/method: "POST"/g)];
  assert.equal(posts.length, 1);
  assert.match(api, /\/complete-work`/);
  assert.doesNotMatch(workspace, /completeWorkArea|completeActivity|completeWorkstream|completeJob|createInvoice|recordPayment/);
  assert.doesNotMatch(api, /activities\/.*complete|workstreams\/.*complete|job-completion|invoices|payments|history/i);
});
