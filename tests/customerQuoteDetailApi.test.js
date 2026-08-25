import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchCustomerQuoteDetail,
  normalizeCustomerQuoteDetail,
} from "../src/utils/customerQuoteDetailApi.js";

const QUOTE_ID = "decf3f61-acd2-4756-b5fa-8d610eb9b8d0";
const JOB_ID = "7e742dc1-e2a2-49c6-a493-11e351c80d54";
const CUSTOMER_TERMS = Object.freeze({
  schemaVersion: 1,
  paymentTerms: "50% deposit; balance due on completion.",
  estimatedDuration: "3 days",
  customerNotes: "Protect the existing landscaping.",
  agreement: Object.freeze({
    exclusions: Object.freeze(["Permit fees"]),
    additionalWorkTerms: "Written approval is required.",
    hiddenConditionsTerms: "Hidden conditions require a revised Quote.",
    diagnosticTerms: "",
    customerResponsibilities: "Provide safe access.",
    warrantyTerms: "One-year workmanship warranty.",
    cancellationTerms: "Cancellation terms apply.",
    acceptanceTerms: "Approval accepts this exact issued Quote.",
    preauthorizedAdditionalWorkLimit: "$0",
  }),
});

function quote(overrides = {}) {
  return {
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
    status: "ISSUED",
    businessStatus: "WAITING_ON_CUSTOMER",
    customerDecision: null,
    lineageLabel: "Original",
    totalMinor: 265000,
    currency: "USD",
    scopeItems: [
      { description: "Repair the sink cabinet", quantity: 1, amountMinor: 265000 },
    ],
    conditions: ["Customer provides access."],
    exclusions: [{ description: "Hidden wall damage", quantity: 1 }],
    issuedAt: "2026-08-12T12:00:00.000Z",
    decidedAt: null,
    decisionCommandVersion: 7,
    actions: { canViewQuote: true, canApprove: true, canDecline: true },
    ...overrides,
  };
}

function payload(overrides = {}) {
  return {
    success: true,
    code: "CUSTOMER_QUOTE_FOUND",
    quote: quote(),
    ...overrides,
  };
}

test("customer detail accepts and freezes the exact customer-safe contract", () => {
  const normalized = normalizeCustomerQuoteDetail(payload({
    quote: quote({ customerTermsSnapshot: CUSTOMER_TERMS }),
  }), {
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
  });
  assert.equal(normalized.source, "CUSTOMER_QUOTE_DETAIL");
  assert.equal(normalized.quote.quoteId, QUOTE_ID);
  assert.equal(normalized.quote.jobId, JOB_ID);
  assert.equal(normalized.quote.scopeItems[0].amountMinor, 265000);
  assert.equal(normalized.quote.decisionCommandVersion, 7);
  assert.equal(
    normalized.quote.customerTermsSnapshot.paymentTerms,
    "50% deposit; balance due on completion."
  );
  assert.equal(Object.isFrozen(normalized.quote.customerTermsSnapshot.agreement), true);
  assert.equal(Object.isFrozen(normalized.quote.scopeItems), true);
  assert.equal(Object.isFrozen(normalized.quote.actions), true);
});

test("pending, Approved, and Declined action truth is strict", () => {
  const approveOnly = normalizeCustomerQuoteDetail(
    payload({
      quote: quote({
        actions: { canViewQuote: true, canApprove: true, canDecline: false },
      }),
    }),
    { quoteId: QUOTE_ID, jobId: JOB_ID }
  );
  const approved = normalizeCustomerQuoteDetail(
    payload({
      quote: quote({
        businessStatus: "APPROVED",
        customerDecision: "APPROVED",
        decidedAt: "2026-08-13T12:00:00.000Z",
        actions: { canViewQuote: true, canApprove: false, canDecline: false },
      }),
    }),
    { quoteId: QUOTE_ID, jobId: JOB_ID }
  );
  const declined = normalizeCustomerQuoteDetail(
    payload({
      quote: quote({
        businessStatus: "DECLINED",
        customerDecision: "DECLINED",
        decidedAt: "2026-08-13T12:00:00.000Z",
        actions: { canViewQuote: true, canApprove: false, canDecline: false },
      }),
    }),
    { quoteId: QUOTE_ID, jobId: JOB_ID }
  );
  assert.equal(approveOnly.quote.actions.canDecline, false);
  assert.equal(approved.quote.businessStatus, "APPROVED");
  assert.equal(declined.quote.businessStatus, "DECLINED");
  assert.equal(
    normalizeCustomerQuoteDetail(
      payload({
        quote: quote({
          businessStatus: "APPROVED",
          customerDecision: "APPROVED",
          decidedAt: "2026-08-13T12:00:00.000Z",
        }),
      }),
      { quoteId: QUOTE_ID, jobId: JOB_ID }
    ),
    null
  );
});

test("customer detail rejects mismatched identity, drafts, unknown fields, and private data", () => {
  const invalid = [
    payload({ privateField: "unsafe" }),
    payload({ quote: quote({ jobId: "10000000-0000-4000-8000-000000000001" }) }),
    payload({ quote: quote({ status: "DRAFT" }) }),
    payload({ quote: quote({ markup: 20 }) }),
    payload({ quote: quote({ materialsSubtotalMinor: 100 }) }),
    payload({ quote: quote({ integrityHash: "private" }) }),
    payload({ quote: quote({ scopeItems: [{ description: "Work", quantity: 1, amountMinor: 1, source: {} }] }) }),
    payload({ quote: quote({ conditions: [{ description: "Internal" }] }) }),
    payload({ quote: quote({ decisionCommandVersion: 0 }) }),
    payload({ quote: quote({ customerTermsSnapshot: { ...CUSTOMER_TERMS, paid: true } }) }),
    payload({ quote: quote({
      customerTermsSnapshot: {
        ...CUSTOMER_TERMS,
        agreement: { ...CUSTOMER_TERMS.agreement, paymentState: "PAID" },
      },
    }) }),
  ];
  invalid.forEach((value) => {
    assert.equal(
      normalizeCustomerQuoteDetail(value, { quoteId: QUOTE_ID, jobId: JOB_ID }),
      null
    );
  });
});

test("customer detail transport uses the exact authenticated Quote route and Job guard", async () => {
  const calls = [];
  const normalized = await fetchCustomerQuoteDetail({
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
    authFetchImpl: async (...args) => {
      calls.push(args);
      return { response: { ok: true, status: 200 }, data: payload() };
    },
  });
  assert.equal(normalized.quote.businessStatus, "WAITING_ON_CUSTOMER");
  assert.deepEqual(calls, [[
    `/quotes/${QUOTE_ID}/customer`,
    { method: "GET", cache: "no-store" },
    undefined,
  ]]);
});

test("unsafe and malformed deployed truth fail closed without fallback", async () => {
  await assert.rejects(
    fetchCustomerQuoteDetail({
      quoteId: QUOTE_ID,
      jobId: JOB_ID,
      authFetchImpl: async () => ({
        response: { ok: true, status: 200 },
        data: payload({ quote: quote({ internalNotes: "private" }) }),
      }),
    }),
    (error) => error.code === "UNSAFE_CUSTOMER_QUOTE_RESPONSE"
  );
  await assert.rejects(
    fetchCustomerQuoteDetail({
      quoteId: QUOTE_ID,
      jobId: JOB_ID,
      authFetchImpl: async () => ({
        response: { ok: true, status: 200 },
        data: payload({ quote: quote({ arbitrarySentinel: true }) }),
      }),
    }),
    (error) => error.code === "INVALID_CUSTOMER_QUOTE_RESPONSE"
  );
});
