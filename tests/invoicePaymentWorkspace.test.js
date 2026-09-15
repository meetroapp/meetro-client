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
  assert.match(source, /issueCanonicalInvoice/);
  assert.match(source, /fetchJobCompletionReview/);
  assert.doesNotMatch(source, /Pay Now|stripe|paypal|publicInvoice|invoiceUrl/);
  assert.match(source, /minHeight: 44/);
  assert.match(source, /WorkCenterMetricGrid/);
  assert.match(source, /const revenue = workspace\?\.revenue/);
  assert.match(source, /revenue\.cashReceivedMinor/);
  assert.match(source, /revenue\.invoicedMinor/);
  assert.match(source, /revenue\.outstandingMinor/);
  assert.match(source, /revenue\.paidInvoices/);
  assert.match(source, /data-revenue-period/);
  assert.match(source, /data-revenue-state/);
  assert.match(source, /WorkCenterEmptyState/);
  assert.doesNotMatch(source, /No canonical Invoice records yet/);
});

test("Revenue period UI reads only governed server projection and keeps failure states non-destructive", () => {
  const source =
    read("../src/components/ProfessionalInvoiceWorkspace.jsx");

  for (const period of [
    "THIS_MONTH",
    "LAST_30_DAYS",
    "LAST_90_DAYS",
    "THIS_YEAR",
  ]) {
    assert.match(
      source,
      new RegExp(period)
    );
  }

  for (const state of [
    "TIME_ZONE_REQUIRED",
    "MULTI_CURRENCY",
    "UNSAFE_FINANCIAL_HISTORY",
  ]) {
    assert.match(
      source,
      new RegExp(state)
    );
  }

  assert.match(
    source,
    /fetchProfessionalInvoiceWorkspace\(\{[\s\S]*period: revenuePeriod/
  );

  const revenueStart =
    source.indexOf(
      "const revenue = workspace?.revenue"
    );

  const invoiceListStart =
    source.indexOf(
      "workspace?.readyJobs.length",
      revenueStart
    );

  assert.ok(
    revenueStart >= 0 &&
    invoiceListStart > revenueStart
  );

  const revenuePresentation =
    source.slice(
      revenueStart,
      invoiceListStart
    );

  assert.doesNotMatch(
    revenuePresentation,
    /localStorage|sessionStorage|\.reduce\(/
  );

  assert.match(
    source,
    /workspace\?\.invoices\.length > 0/
  );

  assert.match(
    source,
    /const revenueIsCurrent\s*=\s*revenue\?\.period === revenuePeriod/
  );

  assert.match(
    source,
    /const revenueMoney = useCallback/
  );

  assert.match(
    source,
    /Number\(minor\) === 0[\s\S]*\? "0"[\s\S]*: "-"/
  );

  assert.match(
    source,
    /data-revenue-zero-state="actionable"/
  );

  assert.match(
    source,
    /revenueHasNoActivity/
  );

  assert.match(
    source,
    /hasActionableFinancialWork/
  );

  assert.match(
    source,
    /revenueIsCurrent[\s\S]*revenue\?\.state === "READY"/
  );

  assert.match(
    source,
    /disabled=\{[\s\S]*workspacePhase === "loading"[\s\S]*Boolean\(busy\)/
  );
});

test("exact Invoice review hydrates one canonical detail read with one visible loading owner", () => {
  const source = read("../src/components/ProfessionalInvoiceWorkspace.jsx");
  const workspaceEffectStart = source.indexOf("useEffect(() => {", source.indexOf("const loadWorkspace"));
  const workspaceEffectEnd = source.indexOf("useEffect(() => {", workspaceEffectStart + 1);
  const exactInvoiceEffect = source.slice(workspaceEffectEnd, source.indexOf("const money", workspaceEffectEnd));

  assert.match(source, /if \(initialInvoiceId\) \{[\s\S]*setWorkspacePhase\("idle"\)/);
  assert.doesNotMatch(exactInvoiceEffect, /fetchProfessionalInvoiceWorkspace/);
  assert.match(exactInvoiceEffect, /fetchProfessionalInvoice\(\{ invoiceId: initialInvoiceId/);
  assert.match(source, /const isLoading = phase === "loading" \|\| invoicePhase === "loading"/);
  assert.equal(
    (source.match(/\{isLoading && <p role="status">\{copy\.loading\}<\/p>\}/g) || []).length,
    1
  );
  assert.doesNotMatch(source, /busy\.startsWith\("read:"\)/);
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
