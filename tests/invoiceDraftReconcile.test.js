import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildInvoiceBuilderRoute,
  parseInvoiceBuilderRoute,
  resolveCompletedJobInvoiceHandoff,
} from "../src/utils/completedJobInvoiceHandoff.js";

const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";
const INVOICE_ID = "93792224-2cfd-44d0-ada7-8efd5e48a5da";
const INVOICE_NUMBER = "INV-937922242CFD";

const invoice = Object.freeze({
  invoiceId: INVOICE_ID,
  invoiceNumber: INVOICE_NUMBER,
  jobId: JOB_ID,
  status: "DRAFT",
  currency: "USD",
  totalMinor: 68000,
  paidMinor: 51000,
  balanceMinor: 17000,
});

const readyJob = Object.freeze({
  jobId: JOB_ID,
  approvedAmount: { currency: "USD", totalMinor: 68000 },
  paymentsReceivedMinor: 51000,
  amountStillDueMinor: 17000,
});

function workspace({ invoices = [], readyJobs = [] } = {}) {
  return { invoices, readyJobs };
}

test("1. Work Completed with no Invoice offers Prepare Invoice", () => {
  const result = resolveCompletedJobInvoiceHandoff(workspace({ readyJobs: [readyJob] }), JOB_ID);
  assert.equal(result.status, "ready");
  assert.equal(result.actionLabel, "Prepare Invoice");
  assert.equal(result.route, `invoiceBuilder?jobId=${JOB_ID}`);
});

test("2. a legitimate DRAFT Invoice offers review of the existing draft", () => {
  const result = resolveCompletedJobInvoiceHandoff(workspace({ invoices: [invoice] }), JOB_ID);
  assert.equal(result.status, "existing");
  assert.equal(result.heading, "Invoice draft ready");
  assert.equal(result.statusLabel, "Draft");
  assert.equal(result.actionLabel, "Review Invoice");
});

test("3. the existing draft route carries the exact invoiceId", () => {
  const result = resolveCompletedJobInvoiceHandoff(workspace({ invoices: [invoice] }), JOB_ID);
  assert.equal(result.route, `invoiceBuilder?jobId=${JOB_ID}&invoiceId=${INVOICE_ID}`);
});

test("4. resume resolution is read-only and never creates an Invoice", () => {
  const before = workspace({ invoices: [invoice] });
  const snapshot = structuredClone(before);
  resolveCompletedJobInvoiceHandoff(before, JOB_ID);
  assert.deepEqual(before, snapshot);
  const source = readFileSync(new URL("../src/components/CompletedJobInvoiceHandoff.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /createCanonicalInvoice|createReviewedCompletedJobInvoice|POST/);
});

test("5. resume preserves the exact Invoice number", () => {
  const result = resolveCompletedJobInvoiceHandoff(workspace({ invoices: [invoice] }), JOB_ID);
  assert.equal(result.invoice.invoiceNumber, INVOICE_NUMBER);
});

test("6. canonical total remains $680", () => {
  const result = resolveCompletedJobInvoiceHandoff(workspace({ invoices: [invoice] }), JOB_ID);
  assert.equal(result.invoice.totalMinor, 68000);
});

test("7. canonical payments received remains $510", () => {
  const result = resolveCompletedJobInvoiceHandoff(workspace({ invoices: [invoice] }), JOB_ID);
  assert.equal(result.invoice.paidMinor, 51000);
});

test("8. canonical amount due remains $170", () => {
  const result = resolveCompletedJobInvoiceHandoff(workspace({ invoices: [invoice] }), JOB_ID);
  assert.equal(result.invoice.balanceMinor, 17000);
});

test("9. readyJobs filtering cannot hide an existing Invoice", () => {
  const result = resolveCompletedJobInvoiceHandoff(workspace({ invoices: [invoice], readyJobs: [] }), JOB_ID);
  assert.equal(result.status, "existing");
  assert.equal(result.invoice.invoiceId, INVOICE_ID);
});

test("10. a sent Invoice never offers Prepare Invoice", () => {
  const result = resolveCompletedJobInvoiceHandoff(
    workspace({ invoices: [{ ...invoice, status: "SENT" }], readyJobs: [readyJob] }),
    JOB_ID
  );
  assert.equal(result.heading, "Invoice sent");
  assert.equal(result.actionLabel, "Review Invoice");
});

test("11. a paid Invoice reports Paid and never offers Prepare Invoice", () => {
  const result = resolveCompletedJobInvoiceHandoff(
    workspace({ invoices: [{ ...invoice, status: "PAID", paidMinor: 68000, balanceMinor: 0 }] }),
    JOB_ID
  );
  assert.equal(result.heading, "Invoice paid");
  assert.equal(result.statusLabel, "Paid");
  assert.equal(result.actionLabel, "View Invoice");
});

test("12. refresh parsing restores the exact job and Invoice authority", () => {
  const route = buildInvoiceBuilderRoute({ jobId: JOB_ID, invoiceId: INVOICE_ID });
  assert.deepEqual(parseInvoiceBuilderRoute(`#${route}`), {
    page: "invoiceBuilder",
    jobId: JOB_ID,
    invoiceId: INVOICE_ID,
    valid: true,
    invalidJobId: false,
    invalidInvoiceId: false,
    intent: "EXACT_CANONICAL_INVOICE",
  });
  assert.equal(parseInvoiceBuilderRoute(`#invoiceBuilder?invoiceId=${INVOICE_ID}`).valid, false);
});

test("13. exact resume contains no Job closure, History, Payment, or delivery mutation", () => {
  const sources = [
    "../src/utils/completedJobInvoiceHandoff.js",
    "../src/components/CompletedJobInvoiceHandoff.jsx",
    "../src/pages/InvoiceBuilder.jsx",
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(sources, /closeCanonicalJob|recordCanonicalPayment|issueCanonicalInvoice|deliverBusinessDocumentDraft/);
});
