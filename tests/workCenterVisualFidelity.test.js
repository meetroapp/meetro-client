import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const header = read("src/components/CompactCurrentJobHeader.jsx");
const workPlan = read("src/components/ProfessionalWorkPlanWorkspace.jsx");
const preparation = read("src/components/CompactWorkPlanPreparation.jsx");
const dashboard = read("src/pages/ContractorDashboard.jsx");
const css = read("src/index.css");

test("visual fidelity keeps one compact Current Job header with supporting details", () => {
  assert.match(header, /compact-current-job-header__primary/);
  assert.match(header, /compact-current-job-header__details/);
  assert.match(css, /font-size: clamp\(20px, 2\.2vw, 22px\)/);
  assert.match(css, /compact-current-job-header__concern p[\s\S]*font-size: 14px/);
});

test("canonical Job view removes the legacy card-on-card hero", () => {
  assert.match(dashboard, /isCanonicalReadOnlyJob \? canonicalJobWorkflowShell : jobWorkflowFirstHero/);
  assert.match(dashboard, /const canonicalJobWorkflowShell = \{[\s\S]*textAlign: "left"/);
});

test("Work Plan is one divided operational panel with restrained typography", () => {
  assert.match(workPlan, /work-plan-compact-area__header/);
  assert.match(workPlan, /borderTop: "1px solid #dce5de"/);
  assert.match(workPlan, /fontSize: 16/);
  assert.match(workPlan, /fontSize: 14/);
  assert.doesNotMatch(workPlan, /gridTemplateColumns: "minmax\(180px, 230px\)/);
});

test("Approved Work remains visually primary without changing its source", () => {
  assert.match(workPlan, /emphasis="primary"/);
  assert.match(workPlan, /buildApprovedWorkProjection/);
  assert.match(workPlan, /What the customer approved\./);
});

test("materials summaries use compact icon-led expandable controls", () => {
  assert.match(preparation, /gridTemplateColumns: "34px minmax\(0, 1fr\) auto"/);
  assert.match(preparation, /icon="materials"/);
  assert.match(preparation, /icon="people"/);
  assert.match(preparation, /icon="activeWork"/);
});

test("responsive header and Work Plan stack without tiny copy", () => {
  assert.match(css, /max-width: 820px[\s\S]*compact-current-job-header__primary[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /max-width: 480px[\s\S]*compact-current-job-header__state[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /work-plan-compact-area__body[\s\S]*padding-left: 0 !important/);
});

test("iPad landscape Job Overview reflows within sidebar and Companion width", () => {
  const start = css.indexOf("@media (min-width: 900px) and (max-width: 1179px)", css.indexOf(".compact-current-job-header__participants ul"));
  const end = css.indexOf(".professional-work-plan", start);
  const tabletLandscape = css.slice(start, end);

  assert.ok(start >= 0);
  assert.match(tabletLandscape, /#root\[data-app-layout="tablet"\]\[data-app-orientation="landscape"\]/);
  assert.match(tabletLandscape, /compact-current-job-header__primary[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(tabletLandscape, /compact-current-job-header__state[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)[\s\S]*"status next"[\s\S]*"responsibility responsibility"/);
  assert.match(tabletLandscape, /compact-current-job-header__state-item[\s\S]*min-width: 0/);
  assert.match(tabletLandscape, /state-item--status[\s\S]*grid-area: status/);
  assert.match(tabletLandscape, /state-item--next[\s\S]*grid-area: next/);
  assert.match(tabletLandscape, /state-item--responsibility[\s\S]*grid-area: responsibility/);
  assert.match(tabletLandscape, /state-item > \*[\s\S]*min-width: 0[\s\S]*max-width: 100%/);
  assert.match(tabletLandscape, /state-item strong,[\s\S]*compact-current-job-header__pill[\s\S]*line-height: 1\.35[\s\S]*white-space: normal[\s\S]*overflow-wrap: normal[\s\S]*word-break: normal[\s\S]*hyphens: none/);
  assert.match(tabletLandscape, /compact-current-job-header__pill[\s\S]*box-sizing: border-box[\s\S]*inline-size: fit-content[\s\S]*min-inline-size: 0[\s\S]*max-inline-size: 100%[\s\S]*justify-self: start/);
  assert.match(tabletLandscape, /compact-current-job-header__details[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(tabletLandscape, /"concern concern"[\s\S]*"record participants"/);
  assert.match(tabletLandscape, /compact-current-job-header__concern[\s\S]*grid-column: 1 \/ -1[\s\S]*min-width: 0/);
  assert.match(tabletLandscape, /compact-current-job-header__record,[\s\S]*compact-current-job-header__participants[\s\S]*min-width: 0/);
  assert.match(tabletLandscape, /compact-current-job-header__record[\s\S]*grid-area: record/);
  assert.match(tabletLandscape, /compact-current-job-header__participants[\s\S]*grid-area: participants/);
  assert.match(tabletLandscape, /compact-current-job-header__participants li[\s\S]*line-height: 1\.4[\s\S]*white-space: normal/);
  assert.match(tabletLandscape, /overflow-wrap: normal[\s\S]*word-break: normal[\s\S]*hyphens: none/);
  assert.doesNotMatch(tabletLandscape, /font-size|negative|overflow: hidden|text-overflow|overflow-wrap: anywhere|word-break: break-(?:all|word)/);
});

test("Job Overview markup assigns each lifecycle value a stable landscape grid area", () => {
  assert.match(header, /state-item--status[\s\S]*>Job status</);
  assert.match(header, /state-item--next[\s\S]*>Next</);
  assert.match(header, /state-item--responsibility[\s\S]*>Who acts next</);
  assert.equal((header.match(/compact-current-job-header__state-item--/g) || []).length, 3);
});

test("iPad portrait keeps the established single-column Job Overview rule", () => {
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*compact-current-job-header__primary,[\s\S]*compact-current-job-header__details[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*compact-current-job-header__participants summary[\s\S]*white-space: normal/);
});

test("Start Work copy stays plain while authority remains absent", () => {
  assert.match(workPlan, /Start Work is temporarily unavailable\./);
  assert.doesNotMatch(workPlan, /atomic Work-level authority|command chaining|canonical command/i);
});
