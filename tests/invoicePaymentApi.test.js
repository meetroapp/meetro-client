import assert from "node:assert/strict";
import test from "node:test";

import {
  createCanonicalInvoice,
  fetchProfessionalJobInvoice,
  issueCanonicalInvoice,
  normalizeInvoiceDeliverySnapshot,
  recordCanonicalPayment,
  validateInvoice,
  validateInvoiceWorkspace,
} from "../src/utils/invoicePaymentApi.js";

const INVOICE_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const LINE_ID = "33333333-3333-4333-8333-333333333333";
const QUOTE_ID = "44444444-4444-4444-8444-444444444444";
const PAYMENT_ID = "55555555-5555-4555-8555-555555555555";

function invoice(audience = "professional", overrides = {}) {
  const value = {
    contractVersion: 1,
    invoiceId: INVOICE_ID,
    invoiceNumber: "INV-111111111111",
    jobId: JOB_ID,
    requestId: 14,
    relationshipId: 9,
    conversationId: 340,
    business: { displayName: "BGone Services" },
    customer: { displayName: "Liam Molina" },
    job: { title: "Kitchen repair", service: "Plumbing" },
    status: "SENT",
    currency: "USD",
    invoiceDate: "2026-08-15",
    due: { mode: "DUE_ON_RECEIPT", date: null },
    lineItems: [{
      sequence: 1,
      lineageLabel: "ORIGINAL",
      description: "Replace disposal",
      quantity: 1,
      unitAmountMinor: 92000,
      lineTotalMinor: 92000,
      ...(audience === "professional" ? {
        lineItemId: LINE_ID,
        sourceQuoteId: QUOTE_ID,
        sourceQuoteVersion: 3,
      } : {}),
    }],
    subtotalMinor: 92000,
    totalMinor: 92000,
    paidMinor: 0,
    balanceMinor: 92000,
    customerNotes: "Thank you.",
    terms: "Due on receipt.",
    issuedAt: "2026-08-15T16:00:00.000Z",
    payments: [],
    actions: audience === "professional"
      ? { canIssue: false, canRecordPayment: true, canShareExternal: true }
      : { canReview: true, canPayOnline: false },
    ...(audience === "professional" ? { currentVersion: 2 } : {}),
    ...overrides,
  };
  return value;
}

test("strict Invoice validators separate professional command state from customer truth", () => {
  assert.ok(validateInvoice(invoice("professional"), { audience: "professional", invoiceId: INVOICE_ID }));
  const customer = validateInvoice(invoice("customer"), { audience: "customer", jobId: JOB_ID });
  assert.ok(customer);
  assert.equal("currentVersion" in customer, false);
  assert.equal("lineItemId" in customer.lineItems[0], false);
  assert.equal(validateInvoice({ ...invoice("customer"), internalCostMinor: 40000 }, { audience: "customer" }), null);
  assert.equal(validateInvoice(invoice("customer", { actions: { canReview: true, canPayOnline: true } }), { audience: "customer" }), null);
  assert.equal(validateInvoice(invoice("customer", { status: "DRAFT", issuedAt: null }), { audience: "customer" }), null);
});

test("Invoice validator derives no status and rejects arithmetic drift", () => {
  assert.equal(validateInvoice(invoice("professional", { balanceMinor: 91000 }), { audience: "professional" }), null);
  assert.equal(validateInvoice(invoice("professional", { status: "PAID", paidMinor: 92000, balanceMinor: 0 }), { audience: "professional" }).status, "PAID");
  assert.equal(validateInvoice(invoice("professional", { status: "PROCESSING" }), { audience: "professional" }), null);
});

test("workspace validator accepts only server-owned financial summary and exact records", () => {
  const workspace = {
    contractVersion: 1,
    summary: { readyToInvoice: 1, drafts: 0, waitingForPayment: 1, paid: 0, totalOutstandingMinor: 92000, currency: "USD" },
    readyJobs: [{
      jobId: JOB_ID, requestId: 14, relationshipId: 9, customerName: "Liam Molina",
      serviceTitle: "Kitchen repair", completedAt: "2026-08-15T12:00:00.000Z",
      completionVersion: 1, approvedAmount: { currency: "USD", totalMinor: 92000 },
    }],
    invoices: [{
      invoiceId: INVOICE_ID, invoiceNumber: "INV-111111111111", jobId: JOB_ID,
      requestId: 14, relationshipId: 9, customerName: "Liam Molina",
      serviceTitle: "Kitchen repair", currentVersion: 2, status: "SENT", currency: "USD",
      totalMinor: 92000, paidMinor: 0, balanceMinor: 92000, invoiceDate: "2026-08-15",
      due: { mode: "DUE_ON_RECEIPT", date: null }, issuedAt: "2026-08-15T16:00:00.000Z",
    }],
    limit: 50,
  };
  assert.ok(validateInvoiceWorkspace(workspace));
  assert.equal(validateInvoiceWorkspace({ ...workspace, revenueEstimate: 100000 }), null);
});

test("Invoice delivery snapshot is exact-identity and customer-safe", () => {
  const snapshot = {
    schemaVersion: 1, invoiceId: INVOICE_ID, invoiceNumber: "INV-111111111111",
    jobId: JOB_ID, status: "SENT", totalMinor: 92000, balanceMinor: 92000,
    currency: "USD", due: { mode: "DUE_ON_RECEIPT", date: null },
    business: { displayName: "BGone Services" },
    job: { title: "Kitchen repair", service: "Plumbing" },
    issuedAt: "2026-08-15T16:00:00.000Z",
  };
  assert.ok(normalizeInvoiceDeliverySnapshot(snapshot, { invoiceId: INVOICE_ID, jobId: JOB_ID }));
  assert.equal(normalizeInvoiceDeliverySnapshot({ ...snapshot, integrityHash: "sentinel" }, { invoiceId: INVOICE_ID, jobId: JOB_ID }), null);
  assert.equal(normalizeInvoiceDeliverySnapshot(snapshot, { invoiceId: QUOTE_ID, jobId: JOB_ID }), null);
});

test("Invoice commands send only exact governed fields and never accept client status", async () => {
  const calls = [];
  const authFetchImpl = async (endpoint, options) => {
    calls.push({ endpoint, options, body: JSON.parse(options.body) });
    const isCreate = endpoint.includes("/jobs/");
    const isIssue = endpoint.endsWith("/issue");
    const isPayment = endpoint.endsWith("/payments");
    const resultInvoice = isPayment
      ? invoice("professional", {
          status: "PARTIALLY_PAID", currentVersion: 3,
          paidMinor: 46000, balanceMinor: 46000,
          payments: [{
            amountMinor: 46000, currency: "USD", receivedDate: "2026-08-15",
            method: "CHECK", customerReference: null,
            recordedAt: "2026-08-15T17:00:00.000Z", paymentId: PAYMENT_ID,
          }],
        })
      : isCreate
        ? invoice("professional", { status: "DRAFT", currentVersion: 1, issuedAt: null, actions: { canIssue: true, canRecordPayment: false, canShareExternal: false } })
        : invoice("professional");
    return {
      response: { ok: true, status: isCreate ? 201 : 200 },
      data: {
        success: true, invoice: resultInvoice,
        ...(isIssue ? { delivery: { invoiceId: INVOICE_ID } } : {}),
        ...(isPayment ? { payment: { paymentId: PAYMENT_ID } } : {}),
      },
    };
  };
  await createCanonicalInvoice({ jobId: JOB_ID, expectedCompletionVersion: 1, due: { mode: "DUE_ON_RECEIPT", date: null }, idempotencyKey: "create-1", authFetchImpl });
  await issueCanonicalInvoice({ invoiceId: INVOICE_ID, expectedVersion: 1, idempotencyKey: "issue-1", authFetchImpl });
  await recordCanonicalPayment({ invoiceId: INVOICE_ID, expectedVersion: 2, amountMinor: 46000, method: "CHECK", receivedDate: "2026-08-15", idempotencyKey: "payment-1", authFetchImpl });
  assert.deepEqual(calls[0].body, { expectedCompletionVersion: 1, due: { mode: "DUE_ON_RECEIPT", date: null }, customerNotes: null, terms: null });
  assert.deepEqual(calls[1].body, { expectedVersion: 1 });
  assert.deepEqual(calls[2].body, { expectedVersion: 2, amountMinor: 46000, method: "CHECK", receivedDate: "2026-08-15", customerReference: null });
  assert.equal(calls.some(({ body }) => "status" in body || "paid" in body || "balanceMinor" in body), false);
});

test("professional Job History Invoice read is exact-Job scoped", async () => {
  let endpoint;
  const result = await fetchProfessionalJobInvoice({
    jobId: JOB_ID,
    authFetchImpl: async (value, options) => {
      endpoint = value;
      assert.deepEqual(options, { method: "GET", cache: "no-store" });
      return {
        response: { ok: true, status: 200 },
        data: { success: true, invoice: invoice("professional") },
      };
    },
  });
  assert.equal(endpoint, `/professional/jobs/${JOB_ID}/invoice`);
  assert.equal(result.jobId, JOB_ID);
});
