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

test("Start Work copy stays plain while authority remains absent", () => {
  assert.match(workPlan, /Start Work is temporarily unavailable\./);
  assert.doesNotMatch(workPlan, /atomic Work-level authority|command chaining|canonical command/i);
});
