import assert from "node:assert/strict";
import test from "node:test";

import {
  completeCanonicalJob,
  createJobCompletionIdempotencyKey,
  fetchCustomerJobHistory,
  fetchJobCompletionReview,
  fetchProfessionalJobHistory,
  validateJobCompletion,
  validateJobCompletionReview,
  validateJobHistoryDetail,
  validateJobHistorySummary,
  validateProfessionalJobHistory,
} from "../src/utils/jobCompletionApi.js";

const JOB_ID = "7e742dc1-e2a2-49c6-a493-11e351c80d54";
const COMPLETION_ID = "7a02ee20-7f32-48eb-96dc-a3217bc5dcda";

function review(overrides = {}) {
  return {
    contractVersion: 1,
    jobId: JOB_ID,
    requestId: 14,
    relationshipId: 22,
    currentVersion: 0,
    state: "ACTIVE",
    eligible: true,
    canComplete: true,
    reasons: [],
    work: { workstreamCount: 2, completedWorkstreamCount: 2, workItemCount: 4, completedWorkItemCount: 4 },
    outstanding: { workstreams: 0, workItems: 0, obligations: 0, findings: 0 },
    customerUpdates: { count: 2, status: "UP_TO_DATE" },
    completedAt: null,
    ...overrides,
  };
}

function completion(overrides = {}) {
  return {
    contractVersion: 1,
    id: COMPLETION_ID,
    jobId: JOB_ID,
    requestId: 14,
    relationshipId: 22,
    currentVersion: 1,
    status: "COMPLETED",
    completedAt: "2026-08-15T14:00:00.000Z",
    summary: { workstreamCount: 2, workItemCount: 4, customerUpdateCount: 2 },
    nextAction: { code: "READY_TO_INVOICE", label: "Ready to Invoice" },
    ...overrides,
  };
}

function historySummary(overrides = {}) {
  return {
    contractVersion: 1,
    jobId: JOB_ID,
    requestId: 14,
    relationshipId: 22,
    conversationId: 340,
    customerName: "Liam Molina",
    professionalName: "Staging Professional",
    serviceTitle: "Kitchen repair",
    status: "COMPLETED",
    completedAt: "2026-08-15T14:00:00.000Z",
    approvedQuote: { totalMinor: 92000, currency: "USD" },
    completionSummary: { workstreamCount: 2, workItemCount: 4, customerUpdateCount: 2 },
    nextAction: { code: "READY_TO_INVOICE", label: "Ready to Invoice" },
    ...overrides,
  };
}

function historyDetail(audience, overrides = {}) {
  return {
    ...historySummary(),
    audience,
    originalRequest: { concern: "dishwasher issue", reportedAt: "2026-08-14T12:00:00.000Z" },
    preservedRecords: {
      evaluation: true,
      findings: true,
      recommendations: true,
      approvedQuotes: true,
      visits: true,
      workPlan: true,
    },
    actions: audience === "customer" ? { canMessageProfessional: true } : { canViewJob: true },
    ...overrides,
  };
}

test("completion contracts accept exact canonical truth and reject extra authority", () => {
  assert.equal(validateJobCompletionReview(review(), { jobId: JOB_ID }).canComplete, true);
  assert.equal(validateJobCompletion(completion(), { jobId: JOB_ID }).status, "COMPLETED");
  assert.equal(validateJobHistorySummary(historySummary()).approvedQuote.totalMinor, 92000);
  assert.equal(validateJobHistoryDetail(historyDetail("customer"), {
    jobId: JOB_ID,
    audience: "customer",
  }).conversationId, 340);

  assert.equal(validateJobCompletionReview({ ...review(), invoiceId: 9 }, { jobId: JOB_ID }), null);
  assert.equal(validateJobCompletion({ ...completion(), paymentStatus: "paid" }, { jobId: JOB_ID }), null);
  assert.equal(validateJobHistorySummary({ ...historySummary(), internalCostMinor: 41000 }), null);
  assert.equal(validateJobHistoryDetail({ ...historyDetail("customer"), marginMinor: 51000 }, {
    jobId: JOB_ID,
    audience: "customer",
  }), null);
});

test("completion review and command use exact authenticated routes and command safety fields", async () => {
  const calls = [];
  const authFetchImpl = async (endpoint, options) => {
    calls.push({ endpoint, options });
    if (options.method === "GET") {
      return { response: { ok: true, status: 200 }, data: { success: true, completionReview: review() } };
    }
    return { response: { ok: true, status: 200 }, data: { success: true, completion: completion() } };
  };

  await fetchJobCompletionReview({ jobId: JOB_ID, authFetchImpl });
  const key = createJobCompletionIdempotencyKey({
    randomUUID: () => "11111111-1111-4111-8111-111111111111",
  });
  await completeCanonicalJob({ jobId: JOB_ID, expectedVersion: 0, idempotencyKey: key, authFetchImpl });

  assert.deepEqual(calls[0], {
    endpoint: `/professional/jobs/${JOB_ID}/completion-review`,
    options: { method: "GET", cache: "no-store" },
  });
  assert.equal(calls[1].endpoint, `/professional/jobs/${JOB_ID}/complete`);
  assert.equal(calls[1].options.headers["Idempotency-Key"], key);
  assert.deepEqual(JSON.parse(calls[1].options.body), { expectedVersion: 0 });
});

test("history reads preserve exact identity, pagination, and audience allowlists", async () => {
  const calls = [];
  const page = {
    contractVersion: 1,
    totalCount: 1,
    jobs: [historySummary()],
    pagination: { limit: 20, nextCursor: null },
  };
  assert.equal(validateProfessionalJobHistory(page).jobs[0].jobId, JOB_ID);

  await fetchProfessionalJobHistory({
    limit: 20,
    cursor: "opaque-cursor",
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return { response: { ok: true, status: 200 }, data: { success: true, jobHistory: page } };
    },
  });
  await fetchCustomerJobHistory({
    jobId: JOB_ID,
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return { response: { ok: true, status: 200 }, data: { success: true, jobHistory: historyDetail("customer") } };
    },
  });

  assert.equal(calls[0].endpoint, "/professional/jobs/history?limit=20&cursor=opaque-cursor");
  assert.equal(calls[1].endpoint, `/customer/jobs/${JOB_ID}/history`);
  assert.equal(calls.every((call) => call.options.method === "GET"), true);
});

test("unsafe history and completion responses fail closed", async () => {
  await assert.rejects(() => fetchJobCompletionReview({
    jobId: JOB_ID,
    authFetchImpl: async () => ({
      response: { ok: true, status: 200 },
      data: { success: true, completionReview: { ...review(), quoteStatus: "APPROVED" } },
    }),
  }), { code: "UNSAFE_JOB_COMPLETION_RESPONSE" });

  await assert.rejects(() => fetchCustomerJobHistory({
    jobId: JOB_ID,
    authFetchImpl: async () => ({
      response: { ok: true, status: 200 },
      data: { success: true, jobHistory: { ...historyDetail("customer"), grants: ["admin"] } },
    }),
  }), { code: "UNSAFE_JOB_COMPLETION_RESPONSE" });
});
