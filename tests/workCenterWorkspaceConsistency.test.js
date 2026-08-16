import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getWorkCenterWorkspaceCopy,
  resolveWorkCenterSectionForNextAction,
  WORK_CENTER_WORKSPACE_LANGUAGES,
} from "../src/utils/workCenterWorkspaceLanguage.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const dashboard = read("../src/pages/ContractorDashboard.jsx");
const system = read("../src/components/WorkCenterWorkspaceSystem.jsx");
const css = read("../src/index.css");

test("shared Work Center copy is complete for every active locale", () => {
  assert.deepEqual(WORK_CENTER_WORKSPACE_LANGUAGES, ["en", "es", "fr", "pt-BR"]);
  const keys = Object.keys(getWorkCenterWorkspaceCopy("en")).sort();
  for (const language of WORK_CENTER_WORKSPACE_LANGUAGES) {
    const copy = getWorkCenterWorkspaceCopy(language);
    assert.deepEqual(Object.keys(copy).sort(), keys, language);
    assert.equal(keys.every((key) => typeof copy[key] === "string" && copy[key].trim()), true, language);
  }
});

test("server-owned next actions map only to their presentation section", () => {
  const cases = {
    START_OR_CONTINUE_EVALUATION: "evaluation",
    REVIEW_FINDINGS: "findings",
    PREPARE_RECOMMENDATIONS: "findings",
    BUILD_QUOTE: "quotes",
    REVIEW_DRAFT_QUOTE: "quotes",
    WAIT_FOR_CUSTOMER_DECISION: "quotes",
    REVIEW_DECLINED_QUOTE: "quotes",
    REVIEW_ACTIVE_WORK: "workPlan",
    REVIEW_BLOCKED_WORK: "workPlan",
    REVIEW_WORKSTREAM_COMPLETION: "workPlan",
    READY_TO_INVOICE: "completionInvoice",
    NEXT_STEP_NOT_YET_AVAILABLE: "visits",
  };
  for (const [code, section] of Object.entries(cases)) {
    assert.equal(resolveWorkCenterSectionForNextAction(code), section, code);
  }
  assert.equal(resolveWorkCenterSectionForNextAction(""), "visits");
});

test("shared system owns headers, truthful metrics, empty states, statuses, and accessible disclosure", () => {
  for (const component of [
    "WorkCenterPageHeader", "WorkCenterMetricGrid", "WorkCenterEmptyState",
    "WorkCenterStatusPill", "WorkCenterAccordion",
  ]) assert.match(system, new RegExp(`export function ${component}`));
  assert.match(system, /aria-expanded=\{open\}/);
  assert.match(system, /aria-controls=\{`\$\{sectionId\}-content`\}/);
  assert.match(css, /\.work-center-accordion__trigger \{[\s\S]*min-height: 68px/);
  assert.match(css, /\.work-center-empty-state \{[\s\S]*box-shadow:/);
});

test("all seven Work Center destinations adopt the shared presentation system", () => {
  const sources = [
    dashboard,
    read("../src/components/ProfessionalWorkPlanOverview.jsx"),
    read("../src/components/ProfessionalScheduleWorkspace.jsx"),
    read("../src/components/ProfessionalQuotesWorkspace.jsx"),
    read("../src/components/ProfessionalJobHistoryWorkspace.jsx"),
    read("../src/components/ProfessionalInvoiceWorkspace.jsx"),
  ].join("\n");
  assert.ok((sources.match(/WorkCenterPageHeader/g) || []).length >= 7);
  assert.ok((sources.match(/WorkCenterMetricGrid/g) || []).length >= 7);
  assert.ok((sources.match(/WorkCenterEmptyState/g) || []).length >= 7);
});

test("Current Job stays identity-first and progressively discloses canonical sections", () => {
  for (const id of [
    "canonical-job-visits", "canonical-job-evaluation", "canonical-job-work-plan",
    "canonical-job-quotes", "canonical-job-completion-invoice",
  ]) assert.match(dashboard, new RegExp(`id="${id}"`));
  assert.match(dashboard, /canonicalLiveJob\?\.nextAction\?\.code/);
  assert.match(dashboard, /resolveWorkCenterSectionForNextAction/);
  assert.match(dashboard, /canonicalAutoOpenToken/);
  assert.match(dashboard, /CanonicalJobVisits/);
  assert.match(dashboard, /CanonicalJobEvaluation/);
  assert.match(dashboard, /ProfessionalWorkPlanWorkspace/);
  assert.match(dashboard, /CanonicalQuotesPanel/);
});

test("compact contract uses two metric columns, full-width odd final card, and persistent-control clearance", () => {
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.work-center-metric-card:last-child:nth-child\(odd\)[\s\S]*grid-column: 1 \/ -1/);
  assert.match(css, /--meetro-mobile-persistent-control-clearance/);
  assert.match(css, /\.work-center-status-pill \{[\s\S]*white-space: normal;[\s\S]*overflow-wrap: anywhere;/);
});

test("normal Quote presentation hides technical version, lineage, and provenance detail", () => {
  const quote = read("../src/components/CanonicalQuoteCard.jsx");
  assert.match(quote, /<details/);
  assert.match(quote, /copy\.quoteDetails/);
  assert.doesNotMatch(quote, /Quote version|Parent Quote|Lineage:|Source:|currentVersion|decisionVersion/);
  assert.match(quote, /data-quote-id=\{quote\.id\}/);
});

test("Invoice and empty-state language is business-facing", () => {
  const invoiceCopy = read("../src/utils/invoicePaymentLanguage.js");
  assert.match(invoiceCopy, /empty: "No invoices yet\."/);
  assert.doesNotMatch(invoiceCopy, /canonical Invoice records|facturas canonicas|facture canonique|faturas canonicas/i);
});
