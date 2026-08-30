import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCanonicalConversationRoute,
  normalizeCanonicalMessage,
  parseCanonicalConversationRoute,
} from "../src/utils/canonicalConversationMessaging.js";

const QUOTE_ID = "44444444-4444-4444-8444-444444444444";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const INVOICE_ID = "11111111-1111-4111-8111-111111111111";

function paymentMessage(type, payload) {
  return {
    id: type === "payment_request" ? 601 : 602,
    sender: { id: 65, isViewer: false },
    recipient: { id: 64 },
    content: { text: "Payment update", imageUrl: null, type },
    workflow: {
      type: type === "payment_request" ? "PAYMENT_REQUEST" : "PAYMENT_RECEIVED",
      status: "SENT",
      payload,
    },
    reference: { type: "payment", quoteId: QUOTE_ID, jobId: JOB_ID },
    createdAt: "2026-08-29T16:00:00.000Z",
  };
}

test("$680 approval presents a $510 unpaid Payment Request with approved terms", () => {
  const normalized = normalizeCanonicalMessage(paymentMessage("payment_request", {
    schemaVersion: 1,
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
    issuedQuoteVersion: 13,
    state: "PAYMENT_REQUIRED",
    currency: "USD",
    quoteTotalMinor: 68000,
    requiredMinor: 51000,
    receivedMinor: 0,
    remainingMinor: 51000,
    balanceRemainingMinor: 17000,
    paymentTerms: "75% deposit required before scheduling. Remaining balance due upon completion.",
    payment: null,
  }), "homeowner");
  assert.equal(normalized.paymentLifecycle.requiredMinor, 51000);
  assert.equal(normalized.paymentLifecycle.receivedMinor, 0);
  assert.equal(normalized.paymentLifecycle.balanceRemainingMinor, 17000);
  assert.match(normalized.paymentLifecycle.paymentTerms, /75% deposit/);
});

test("explicit Deposit Request message preserves exact durable request authority", () => {
  const normalized = normalizeCanonicalMessage(paymentMessage("payment_request", {
    schemaVersion: 1,
    depositRequestDocumentId: "66666666-6666-4666-8666-666666666666",
    depositRequestReference: "WDR-ABCDEF12",
    paymentRequirementId: "77777777-7777-4777-8777-777777777777",
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
    issuedQuoteVersion: 13,
    state: "PAYMENT_REQUIRED",
    currency: "USD",
    quoteTotalMinor: 68000,
    requiredMinor: 51000,
    receivedMinor: 0,
    remainingMinor: 51000,
    balanceRemainingMinor: 17000,
    paymentTerms: "Pay by check.",
    payment: null,
  }), "homeowner");
  assert.equal(normalized.paymentLifecycle.depositRequestReference, "WDR-ABCDEF12");
  assert.equal(normalized.paymentLifecycle.paymentRequirementId, "77777777-7777-4777-8777-777777777777");
});

test("partial and satisfied Payment evidence preserve cumulative deposit truth", () => {
  const base = {
    schemaVersion: 1, quoteId: QUOTE_ID, jobId: JOB_ID, issuedQuoteVersion: 13,
    currency: "USD", quoteTotalMinor: 68000, requiredMinor: 51000,
    paymentTerms: "75% deposit required before scheduling.",
  };
  const partial = normalizeCanonicalMessage(paymentMessage("payment_received", {
    ...base, state: "PARTIALLY_RECEIVED", receivedMinor: 20000,
    remainingMinor: 31000, balanceRemainingMinor: 48000,
    payment: { receiptId: "receipt-1", grossAmountMinor: 20000, allocatedMinor: 20000, displayMethod: "Venmo", receivedAt: "2026-08-29T16:00:00.000Z", externalReference: null },
  }), "homeowner");
  assert.equal(partial.paymentLifecycle.remainingMinor, 31000);
  const satisfied = normalizeCanonicalMessage(paymentMessage("payment_received", {
    ...base, state: "DEPOSIT_RECEIVED", receivedMinor: 51000,
    remainingMinor: 0, balanceRemainingMinor: 17000,
    payment: { receiptId: "receipt-2", grossAmountMinor: 31000, allocatedMinor: 31000, displayMethod: "Check", receivedAt: "2026-08-29T17:00:00.000Z", externalReference: null },
  }), "homeowner");
  assert.equal(satisfied.paymentLifecycle.remainingMinor, 0);
  assert.equal(satisfied.paymentLifecycle.receivedMinor, 51000);
});

test("created Invoice handoff preserves exact conversation identity and cannot send on open", () => {
  const route = buildCanonicalConversationRoute(340, "invoiceBuilder", {
    shell: "communicationCenter",
    invoiceId: INVOICE_ID,
  });
  const parsed = parseCanonicalConversationRoute(route);
  assert.equal(parsed.conversationId, 340);
  assert.equal(parsed.invoiceId, INVOICE_ID);

  const source = readFileSync(new URL("../src/pages/ConversationThread.jsx", import.meta.url), "utf8");
  const hydrate = source.slice(source.indexOf("void fetchProfessionalInvoice"), source.indexOf("const sendCanonicalMessage"));
  assert.doesNotMatch(hydrate, /issueCanonicalInvoice/);
  const send = source.slice(source.indexOf("const sendReviewedInvoice"), source.indexOf("const sendMessage"));
  assert.match(send, /issueCanonicalInvoice/);
  assert.match(send, /messageText: message/);
});

test("Payment and final Invoice cards use customer-facing commercial labels", () => {
  const paymentCard = readFileSync(new URL("../src/components/ConversationPaymentLifecycleCard.jsx", import.meta.url), "utf8");
  const invoiceCard = readFileSync(new URL("../src/components/ConversationInvoiceCard.jsx", import.meta.url), "utf8");
  for (const label of ["Payment Required", "Deposit Required", "Payment Received", "Remaining Deposit", "Balance Remaining", "How to Pay"]) {
    assert.match(paymentCard, new RegExp(label));
  }
  for (const label of ["Invoice Total", "Payments Received", "Balance Due"]) {
    assert.match(invoiceCard, new RegExp(label));
  }
});
