import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { normalizeCanonicalMessage } from "../src/utils/canonicalConversationMessaging.js";
import {
  buildCustomerInvoiceReviewRoute,
  parseCustomerInvoiceReviewRoute,
} from "../src/utils/customerInvoiceReviewRoute.js";

const INVOICE_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "22222222-2222-4222-8222-222222222222";

function message() {
  return {
    id: 501,
    sender: { id: 65, isViewer: false },
    recipient: { id: 64 },
    content: { text: "BGone Services shared an Invoice.", imageUrl: null, type: "invoice_shared" },
    workflow: {
      type: "INVOICE_SHARED", status: "SENT",
      payload: {
        schemaVersion: 1, invoiceId: INVOICE_ID, invoiceNumber: "INV-111111111111",
        jobId: JOB_ID, status: "SENT", totalMinor: 92000, balanceMinor: 92000,
        currency: "USD", due: { mode: "DUE_ON_RECEIPT", date: null },
        business: { displayName: "BGone Services" },
        job: { title: "Kitchen repair", service: "Plumbing" },
        issuedAt: "2026-08-15T16:00:00.000Z",
      },
    },
    reference: { type: "invoice", invoiceId: INVOICE_ID, jobId: JOB_ID },
    createdAt: "2026-08-15T16:00:00.000Z",
  };
}

test("canonical Conversation normalizes only exact INVOICE_SHARED identity", () => {
  const normalized = normalizeCanonicalMessage(message(), "homeowner");
  assert.equal(normalized.invoiceShare.invoiceId, INVOICE_ID);
  assert.deepEqual(normalized.reference, { type: "invoice", invoiceId: INVOICE_ID, jobId: JOB_ID });
  assert.equal(normalizeCanonicalMessage({ ...message(), reference: { ...message().reference, invoiceId: JOB_ID } }, "homeowner"), null);
  assert.equal(normalizeCanonicalMessage({ ...message(), reference: { ...message().reference, publicUrl: "https://example.test" } }, "homeowner"), null);
});
test("Invoice Review route preserves exact Invoice, Job, and Conversation identity", () => {
  const route = buildCustomerInvoiceReviewRoute({ invoiceId: INVOICE_ID, jobId: JOB_ID, conversationId: 340 });
  assert.deepEqual(parseCustomerInvoiceReviewRoute(route), {
    page: "customerInvoiceReview", invoiceId: INVOICE_ID, jobId: JOB_ID,
    conversationId: 340, valid: true,
  });
  assert.equal(parseCustomerInvoiceReviewRoute(`${route}&public=true`).valid, false);
});

test("Conversation renders structured Invoice cards and exact review routing", () => {
  const source = readFileSync(new URL("../src/pages/ConversationThread.jsx", import.meta.url), "utf8");
  assert.match(source, /msg\.type === "invoice_shared" && msg\.invoiceShare/);
  assert.match(source, /buildCustomerInvoiceReviewRoute\(\{/);
  assert.match(source, /invoiceId: msg\.reference\?\.invoiceId/);
  assert.match(source, /jobId: msg\.reference\?\.jobId/);
  assert.doesNotMatch(source, /invoiceShare[\s\S]{0,500}public.*(?:url|link)/i);
});
