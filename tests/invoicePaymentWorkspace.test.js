import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getInvoiceCopy } from "../src/utils/invoicePaymentLanguage.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Work Center Revenue is owned by canonical Invoice workspace", () => {
  const source = read("../src/pages/ContractorDashboard.jsx");
  const start = source.indexOf('{activeTab === "revenue"');
  const end = source.indexOf("{materialDeleteTarget", start);
  const revenue = source.slice(start, end);
  assert.match(revenue, /ProfessionalInvoiceWorkspace/);
  assert.doesNotMatch(revenue, /totalJobRevenue|completedProjectsRevenue|localStorage/);
});

test("canonical Invoice workspace routes completed Jobs to the builder and final Send review while keeping Payment and sharing controls", () => {
  const source = read("../src/components/ProfessionalInvoiceWorkspace.jsx");
  for (const required of [
    "invoiceBuilder\\?jobId=", "buildCanonicalConversationRoute", "recordCanonicalPayment",
    "shareInvoiceExternally", "buildInvoiceEmailUrl", "copyInvoiceDetails",
    "expectedVersion", "Payments received", "Amount still due",
  ]) assert.match(source, new RegExp(required));
  assert.doesNotMatch(source, /createCanonicalInvoice|data-invoice-create-job-id/);
  assert.doesNotMatch(source, /issueCanonicalInvoice/);
  assert.doesNotMatch(source, /Pay Now|stripe|paypal|publicInvoice|invoiceUrl/);
  assert.match(source, /minHeight: 44/);
  assert.match(source, /WorkCenterMetricGrid/);
  assert.match(source, /summary\.readyToInvoice/);
  assert.match(source, /summary\.totalOutstandingMinor/);
  assert.match(source, /WorkCenterEmptyState/);
  assert.doesNotMatch(source, /No canonical Invoice records yet/);
});

test("Project Journey and Conversation route read canonical customer Invoice truth", () => {
  assert.match(read("../src/pages/ProjectDetails.jsx"), /CustomerInvoicePanel/);
  assert.match(read("../src/components/CustomerInvoicePanel.jsx"), /fetchCustomerJobInvoice/);
  assert.match(read("../src/pages/CustomerInvoiceReviewRoute.jsx"), /fetchCustomerInvoice/);
});

test("completed Job History preserves canonical professional Invoice and Payment truth", () => {
  const source = read("../src/components/ProfessionalJobHistoryWorkspace.jsx");
  assert.match(source, /fetchProfessionalJobInvoice/);
  assert.match(source, /CanonicalInvoiceDetail/);
  assert.match(source, /INVOICE_UNAVAILABLE/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|paid\s*=\s*true/);
});

test("Invoice copy is complete for active EN, ES, FR, and PT-BR locales", () => {
  const keys = Object.keys(getInvoiceCopy("en")).sort();
  for (const language of ["es", "fr", "pt-BR"]) {
    const copy = getInvoiceCopy(language);
    assert.deepEqual(Object.keys(copy).sort(), keys);
    assert.equal(keys.every((key) => typeof copy[key] === "string" && copy[key].trim()), true);
  }
});
