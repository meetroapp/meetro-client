import assert from "node:assert/strict";
import test from "node:test";

import {
  INTELLIGENCE_OPERATION,
  IntelligenceApiError,
  recordWorkflowReview,
  requestWorkflowIntelligence,
  validateEstimateDraft,
  validateInvoiceAssistance,
} from "../src/utils/contextualIntelligence.js";

const ids = Object.freeze({
  job: "11111111-1111-4111-8111-111111111111",
  invoice: "22222222-2222-4222-8222-222222222222",
  proposal: "33333333-3333-4333-8333-333333333333",
  key: "44444444-4444-4444-8444-444444444444",
});

function boundary(authorityClassification = "ADVISORY_NON_CANONICAL") {
  return {
    schemaVersion: 1,
    proposalId: ids.proposal,
    authorityClassification,
    jobId: ids.job,
    humanToCanonicalBoundary: { directMutationAllowed: false },
  };
}

test("Estimate Draft validator keeps internal costs private and rejects customer leakage", () => {
  const value = {
    ...boundary("INTERNAL_ESTIMATE_DRAFT_NON_CANONICAL"),
    materials: [], labor: [], internalCost: { totalMinor: 90000, customerVisible: false },
    customerQuoteDraft: { id: "customer_quote_draft", customerWording: "Repair the wall." },
  };
  assert.equal(validateEstimateDraft(value, { jobId: ids.job }), value);
  assert.throws(() => validateEstimateDraft({
    ...value,
    customerQuoteDraft: { ...value.customerQuoteDraft, retailerReference: "Home Depot" },
  }, { jobId: ids.job }), (error) => error instanceof IntelligenceApiError && error.code === "UNSAFE_INTELLIGENCE_RESPONSE");
});

test("Invoice assistance copies financial truth but rejects secrets and mismatched identity", () => {
  const value = {
    ...boundary(), invoiceId: ids.invoice,
    canonicalFinancialTruth: { totalMinor: 10000, paidMinor: 0, balanceMinor: 10000, status: "DRAFT", currency: "USD" },
    lineDescriptions: [], customerNotes: { id: "customer_notes", text: "Thanks" },
  };
  assert.equal(validateInvoiceAssistance(value, { jobId: ids.job, invoiceId: ids.invoice }), value);
  assert.equal(validateInvoiceAssistance(value, { jobId: ids.job, invoiceId: ids.proposal }), null);
  assert.throws(() => validateInvoiceAssistance({ ...value, token: "unsafe" }), /Unsafe assistant metadata/);
});

test("provider-unavailable response is explicit and performs no local fallback", async () => {
  await assert.rejects(() => requestWorkflowIntelligence({
    operation: INTELLIGENCE_OPERATION.INVOICE,
    input: { jobId: ids.job },
    idempotencyKey: ids.key,
    authFetchImpl: async () => ({
      response: { ok: false, status: 503 },
      data: { success: false, code: "INTELLIGENCE_PROVIDER_UNAVAILABLE" },
    }),
  }), (error) => error.code === "INTELLIGENCE_PROVIDER_UNAVAILABLE" && /not connected/.test(error.message));
});

test("workflow review requires exact proposal identity and preserves non-canonical result", async () => {
  const calls = [];
  const review = await recordWorkflowReview({
    proposalId: ids.proposal,
    elementId: "customer_notes",
    action: "ACCEPTED",
    idempotencyKey: ids.key,
    authFetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        response: { ok: true, status: 201 },
        data: {
          success: true,
          code: "INTELLIGENCE_REVIEW_RECORDED",
          canonicalMutationPerformed: false,
          review: { proposalId: ids.proposal, elementId: "customer_notes", action: "ACCEPTED" },
        },
      };
    },
  });
  assert.equal(review.action, "ACCEPTED");
  assert.equal(calls[0].url, `/api/intelligence/proposals/${ids.proposal}/review`);
  assert.equal(JSON.parse(calls[0].options.body).elementId, "customer_notes");
});
