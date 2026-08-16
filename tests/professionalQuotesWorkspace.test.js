import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);
const workspace = readFileSync(
  new URL("../src/components/ProfessionalQuotesWorkspace.jsx", import.meta.url),
  "utf8"
);
const adapter = readFileSync(
  new URL("../src/utils/professionalQuotesProjection.js", import.meta.url),
  "utf8"
);
const panel = readFileSync(
  new URL("../src/components/CanonicalQuotesPanel.jsx", import.meta.url),
  "utf8"
);
const card = readFileSync(
  new URL("../src/components/CanonicalQuoteCard.jsx", import.meta.url),
  "utf8"
);
const language = readFileSync(
  new URL("../src/utils/dailyWorkflowLanguage.js", import.meta.url),
  "utf8"
);
const workspaceSystem = readFileSync(
  new URL("../src/components/WorkCenterWorkspaceSystem.jsx", import.meta.url),
  "utf8"
);
const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("Work Center Quotes count comes only from the confirmed server summary", () => {
  assert.match(dashboard, /professionalQuotesSource\.confirmed\?\.summary/);
  assert.match(dashboard, /serverQuotesSummary\.drafts[\s\S]*serverQuotesSummary\.declined/);
  assert.doesNotMatch(dashboard, /serverQuotesTotal\s*\|\|\s*quoteHistory\.length/);
});

test("global workspace preserves the four canonical classifications and business actions", () => {
  for (const classification of ["DRAFT", "WAITING_ON_CUSTOMER", "APPROVED", "DECLINED"]) {
    assert.match(workspace, new RegExp(`classification: "${classification}"`));
  }
  assert.match(workspace, /canContinueDraft/);
  assert.match(workspace, /professionalQuotesContinue/);
  assert.match(workspace, /professionalQuotesView/);
  assert.doesNotMatch(workspace, /Approve Quote|Decline Quote|Schedule Work/);
});

test("legacy global Quotes rendering is unreachable from the canonical Quotes surface", () => {
  assert.match(dashboard, /const isCanonicalQuotesSurface = activeTab === "quotes"/);
  assert.match(
    dashboard,
    /activeTab === "quotes" && !isCanonicalQuotesSurface && !isLegacyCommandSurfaceContained/
  );
  assert.match(dashboard, /<ProfessionalQuotesWorkspace/);
});

test("Quote navigation uses exact canonical quote and job identity", () => {
  assert.match(workspace, /quoteId: quote\.id, jobId: quote\.jobId/);
  assert.match(dashboard, /String\(job\?\.jobId \|\| ""\) === String\(jobId \|\| ""\)/);
  assert.match(dashboard, /setSelectedWorkCenterQuoteId\(String\(quoteId \|\| ""\)\)/);
  assert.match(panel, /String\(quote\.id\) === String\(focusQuoteId\)/);
  assert.match(card, /data-quote-id=\{quote\.id\}/);
  assert.match(card, /aria-current=\{focused \? "true" : undefined\}/);
});

test("Back returns from exact Quote detail to canonical Quotes & Approvals", () => {
  assert.match(dashboard, /workCenterJobReturnSurface === "quotes"/);
  assert.match(dashboard, /translate\("professionalQuotesBack", activeLanguage\)/);
  assert.match(dashboard, /const returnTab = workCenterJobReturnSurface === "quotes"[\s\S]*\? "quotes"/);
});

test("loading, unavailable, empty, refresh, and pagination remain distinct", () => {
  for (const key of [
    "professionalQuotesLoading",
    "professionalQuotesUnavailable",
    "professionalQuotesRefreshing",
    "professionalQuotesShowMore",
    "professionalQuotesMoreUnavailable",
  ]) assert.match(workspace, new RegExp(key));
  assert.match(workspace, /quotesEmptyTitle/);
  assert.match(workspace, /quotesEmptyBody/);
  assert.match(adapter, /status: current\.confirmed \? "confirmed" : "error"/);
  assert.match(adapter, /nextCursor/);
});

test("workspace stays compact, responsive, touch-safe, and clear of persistent navigation", () => {
  assert.match(workspace, /repeat\(auto-fit, minmax\(min\(100%, 290px\), 1fr\)\)/);
  assert.match(workspace, /minHeight: 44/);
  assert.match(workspace, /work-center-workspace/);
  assert.match(workspaceSystem, /WorkCenterMetricGrid/);
  assert.match(css, /--meetro-mobile-persistent-control-clearance/);
  assert.match(workspace, /minWidth: 0/);
});

test("all new visible Quotes copy has EN, ES, FR, and PT-BR registry entries", () => {
  const rows = language.match(/\["professionalQuotes[^\n]+\],/g) || [];
  assert.ok(rows.length >= 26);
  for (const row of rows) {
    const stringCells = row.match(/"(?:[^"\\]|\\.)*"/g) || [];
    assert.equal(stringCells.length, 5, row);
  }
});
