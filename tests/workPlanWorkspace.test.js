import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getWorkPlanCopy, WORK_PLAN_LANGUAGES } from "../src/utils/workPlanLanguage.js";

const dashboard = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);
const projectDetails = readFileSync(
  new URL("../src/pages/ProjectDetails.jsx", import.meta.url),
  "utf8"
);
const workspace = readFileSync(
  new URL("../src/components/ProfessionalWorkPlanWorkspace.jsx", import.meta.url),
  "utf8"
);
const compactPreparation = readFileSync(
  new URL("../src/components/CompactWorkPlanPreparation.jsx", import.meta.url),
  "utf8"
);
const overview = readFileSync(
  new URL("../src/components/ProfessionalWorkPlanOverview.jsx", import.meta.url),
  "utf8"
);
const workspaceSystem = readFileSync(
  new URL("../src/components/WorkCenterWorkspaceSystem.jsx", import.meta.url),
  "utf8"
);
const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const customer = readFileSync(
  new URL("../src/components/CustomerWorkPlan.jsx", import.meta.url),
  "utf8"
);
const api = readFileSync(
  new URL("../src/utils/workPlanApi.js", import.meta.url),
  "utf8"
);

test("Work Center adds one canonical Work Plan card distinct from Current Jobs", () => {
  assert.match(dashboard, /key: "current"[\s\S]*workCenterCurrentJobsTitle/);
  assert.match(dashboard, /key: "workPlan"[\s\S]*workPlanCopy\.workPlan/);
  assert.match(dashboard, /workPlanCopy\.cardPurpose/);
  assert.match(dashboard, /fetchProfessionalWorkPlanSummary/);
  assert.match(dashboard, /professionalWorkPlanSource\.summary\?\.workItemCount/);
  assert.match(dashboard, /onOpenJob=\{\(jobId\) =>/);
  assert.match(dashboard, /isCanonicalWorkCenterEntry\(exactJob\)/);
  assert.doesNotMatch(api, /localStorage|activeJobs|workflow_quote_sent|completedProjects/);
});

test("professional Work Plan is an exact read projection and never composes Work authority", () => {
  for (const command of [
    "createWorkItem",
    "progressWorkItem",
    "updateWorkItem",
    "completeWorkArea",
  ]) {
    assert.doesNotMatch(workspace, new RegExp(`\\b${command}\\b`));
  }
  assert.match(workspace, /WORK_LEVEL_AUTHORITY_GAPS/);
  assert.match(workspace, /Start Work is temporarily unavailable/);
  assert.match(workspace, /buildApprovedWorkProjection/);
  assert.match(workspace, /CompactWorkPlanPreparation/);
  assert.match(compactPreparation, /ProfessionalWorkPreparationWorkspace/);
  assert.match(workspace, /purposeFilter="APPROVED_WORK"/);
  assert.doesNotMatch(workspace, /job\.complete|localStorage|sessionStorage/);
});

test("Project Journey renders only the strict customer-safe Work Plan projection", () => {
  assert.match(projectDetails, /<CustomerWorkPlan/);
  assert.match(projectDetails, /jobId=\{requestModificationState\.jobId\}/);
  assert.match(customer, /fetchCustomerJobWorkPlan/);
  assert.match(customer, /data-customer-work-plan-job-id/);
  assert.doesNotMatch(
    customer,
    /(?:\.|\[\s*["'])(?:blockers|obligations|internalCost|margin|approvedQuote|currentVersion|idempotencyKey)\b/i
  );
  assert.doesNotMatch(customer, /localStorage|sessionStorage|activeJobs/);
});

test("Work Plan copy is complete for EN, ES, FR, and PT-BR", () => {
  assert.deepEqual(WORK_PLAN_LANGUAGES, ["en", "es", "fr", "pt-BR"]);
  const required = [
    "workPlan",
    "cardPurpose",
    "viewWorkPlan",
    "addWorkItem",
    "startWork",
    "updateWork",
    "markComplete",
    "customerUpdate",
    "readyForCompletionReview",
    "customerPurpose",
  ];
  for (const language of WORK_PLAN_LANGUAGES) {
    const copy = getWorkPlanCopy(language);
    for (const key of required) assert.ok(copy[key], `${language}:${key}`);
  }
});

test("desktop and compact Work Plan surfaces preserve readable 44px controls", () => {
  assert.match(dashboard, /compactWorkCenterChildTabs = \[[\s\S]*"workPlan"/);
  assert.match(workspace, /gridTemplateColumns: "repeat\(auto-fit, minmax\(min\(100%, 150px\), 1fr\)\)"/);
  assert.match(overview, /WorkCenterMetricGrid/);
  assert.match(overview, /key: "jobs"/);
  assert.match(workspaceSystem, /work-center-metric-grid/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /last-child:nth-child\(odd\)/);
  assert.match(customer, /gridTemplateColumns: "minmax\(90px, auto\) 1fr"/);
  for (const source of [workspace, compactPreparation, overview, customer]) {
    assert.match(source, /minHeight: 44/);
    assert.match(source, /overflowWrap: "anywhere"|minWidth: 0/);
  }
});
