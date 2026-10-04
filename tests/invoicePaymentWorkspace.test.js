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

test("Invoice Revenue mobile layout keeps money and Invoice summaries readable without changing financial authority", () => {
  const source =
    read("../src/components/ProfessionalInvoiceWorkspace.jsx");

  const css =
    read("../src/index.css");

  assert.match(
    source,
    /className="work-center-workspace professional-invoice-workspace"/
  );

  for (const styleName of [
    "invoiceRowCopy",
    "invoiceRowNumber",
    "invoiceRowDescription",
    "invoiceRowAmount",
  ]) {
    assert.match(
      source,
      new RegExp(styleName)
    );
  }

  assert.match(
    source,
    /invoiceRowAmount:[\s\S]*whiteSpace: "nowrap"/
  );

  assert.match(
    css,
    /\.professional-invoice-workspace \.work-center-metric-card__value\s*\{[\s\S]*?white-space:\s*nowrap;[\s\S]*?overflow-wrap:\s*normal;[\s\S]*?word-break:\s*normal;/
  );

  const metricSelector =
    ".professional-invoice-workspace .work-center-metric-card__value";

  const globalMetricRule =
    css.indexOf(
      metricSelector
    );

  const mobileMetricRule =
    css.indexOf(
      metricSelector,
      globalMetricRule + metricSelector.length
    );

  const mobileMediaRule =
    css.lastIndexOf(
      "@media (max-width: 600px)",
      mobileMetricRule
    );

  assert.ok(
    globalMetricRule >= 0 &&
    mobileMetricRule > globalMetricRule &&
    mobileMediaRule > globalMetricRule &&
    mobileMediaRule < mobileMetricRule
  );

  const mobileMetricEnd =
    css.indexOf(
      "}",
      mobileMetricRule
    );

  const mobileMetricCss =
    css.slice(
      mobileMetricRule,
      mobileMetricEnd + 1
    );

  assert.match(
    mobileMetricCss,
    /font-size:\s*clamp\(21px, 5\.7vw, 24px\);/
  );

  assert.match(
    source,
    /revenue\.cashReceivedMinor/
  );

  assert.match(
    source,
    /revenue\.invoicedMinor/
  );

  assert.doesNotMatch(
    source,
    /cashReceivedMinor\s*[+\-*\/]/
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
  assert.match(
    source,
    /const isLoading\s*=\s*phase === "loading"\s*\|\|\s*invoicePhase === "loading"/
  );

  assert.equal(
    (source.match(/\{isLoading && \(/g) || []).length,
    1
  );

  const loadingOwnerStart =
    source.indexOf(
      "{isLoading && ("
    );

  const loadingOwnerEnd =
    source.indexOf(
      "{!isLoading && hasError",
      loadingOwnerStart
    );

  assert.ok(
    loadingOwnerStart >= 0 &&
    loadingOwnerEnd > loadingOwnerStart
  );

  const loadingOwner =
    source.slice(
      loadingOwnerStart,
      loadingOwnerEnd
    );

  assert.match(
    loadingOwner,
    /role="status"/
  );

  assert.match(
    loadingOwner,
    /copy\.loading/
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

test("Revenue Date and Custom Range controls use native calendars and server-owned range authority", () => {
  const source =
    read("../src/components/ProfessionalInvoiceWorkspace.jsx");

  for (const token of [
    "revenueDate",
    "revenueCustomRange",
    "revenueChooseDate",
    "revenueFrom",
    "revenueTo",
    "revenueApply",
    "revenueCancel",
  ]) {
    assert.match(
      source,
      new RegExp(token)
    );
  }

  assert.match(
    source,
    /data-revenue-date-trigger="true"/
  );

  assert.match(
    source,
    /data-revenue-range-trigger="true"/
  );

  assert.match(
    source,
    /data-revenue-range-editor/
  );

  assert.match(
    source,
    /data-revenue-date-input="true"/
  );

  assert.match(
    source,
    /data-revenue-start-date="true"/
  );

  assert.match(
    source,
    /data-revenue-end-date="true"/
  );

  assert.match(
    source,
    /data-revenue-range-apply="true"/
  );

  assert.match(
    source,
    /data-revenue-range-cancel="true"/
  );

  const revenueEditorStart =
    source.indexOf(
      "data-revenue-range-editor="
    );

  const revenueEditorEnd =
    source.indexOf(
      "{revenueMessage &&",
      revenueEditorStart
    );

  assert.ok(
    revenueEditorStart >= 0 &&
    revenueEditorEnd > revenueEditorStart
  );

  const revenueEditorSource =
    source.slice(
      revenueEditorStart,
      revenueEditorEnd
    );

  const nativeRevenueDateInputs =
    revenueEditorSource.match(
      /type="date"/g
    ) || [];

  assert.equal(
    nativeRevenueDateInputs.length,
    3
  );

  assert.match(
    source,
    /period:\s*revenuePeriod/
  );

  assert.match(
    source,
    /revenuePeriod === "CUSTOM_RANGE"[\s\S]*startDate:[\s\S]*revenueRange\.startDate[\s\S]*endDate:[\s\S]*revenueRange\.endDate/
  );

  assert.match(
    source,
    /setRevenuePeriod\("CUSTOM_RANGE"\)/
  );

  assert.match(
    source,
    /startDate > endDate/
  );

  assert.match(
    source,
    /revenueRangeMode === "DATE"/
  );

  assert.match(
    source,
    /revenueRangeMode === "RANGE"/
  );

  assert.doesNotMatch(
    source,
    /showPicker\s*\(/
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

  const financialPresentation =
    source.slice(
      revenueStart,
      invoiceListStart
    );

  assert.doesNotMatch(
    financialPresentation,
    /\.reduce\(|localStorage|sessionStorage/
  );
});

test("Revenue filter editor highlights immediately while financial authority still changes only on Apply", () => {
  const source =
    read("../src/components/ProfessionalInvoiceWorkspace.jsx");

  assert.match(
    source,
    /const revenuePresetControlsActive =[\s\S]*revenueRangeEditor === ""/
  );

  assert.match(
    source,
    /const revenueDateControlActive =[\s\S]*revenueRangeEditor === "DATE"[\s\S]*revenuePeriod === "CUSTOM_RANGE"[\s\S]*revenueRangeMode === "DATE"/
  );

  assert.match(
    source,
    /const revenueCustomRangeControlActive =[\s\S]*revenueRangeEditor === "RANGE"[\s\S]*revenuePeriod === "CUSTOM_RANGE"[\s\S]*revenueRangeMode === "RANGE"/
  );

  assert.match(
    source,
    /aria-pressed=\{[\s\S]*revenueDateControlActive/
  );

  assert.match(
    source,
    /aria-pressed=\{[\s\S]*revenueCustomRangeControlActive/
  );

  assert.match(
    source,
    /setRevenueRangeEditor\("DATE"\)/
  );

  assert.match(
    source,
    /setRevenueRangeEditor\("RANGE"\)/
  );

  assert.match(
    source,
    /function cancelRevenueRangeEditor\(\)[\s\S]*setRevenueRangeEditor\(""\)/
  );

  assert.match(
    source,
    /function applyRevenueRangeSelection\(\)[\s\S]*setRevenuePeriod\("CUSTOM_RANGE"\)/
  );

  assert.match(
    source,
    /const isRevenueRefresh =[\s\S]*workspacePhase === "loading"[\s\S]*Boolean\(workspace\)/
  );

  assert.match(
    source,
    /isRevenueRefresh[\s\S]*copy\.revenueUpdating[\s\S]*copy\.loading/
  );

  assert.match(
    source,
    /data-revenue-refresh/
  );
});
