import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getWorkPreparationCopy, WORK_PREPARATION_LANGUAGES } from "../src/utils/workPreparationLanguage.js";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Materials & Preparation copy is complete for every supported language", () => {
  const english = getWorkPreparationCopy("en");
  const keys = Object.keys(english).sort();
  assert.deepEqual(WORK_PREPARATION_LANGUAGES, ["en", "es", "fr", "pt-BR"]);
  for (const language of WORK_PREPARATION_LANGUAGES) {
    const copy = getWorkPreparationCopy(language);
    assert.deepEqual(Object.keys(copy).sort(), keys);
    assert.ok(Object.values(copy).every((value) => typeof value === "string" && value.trim()));
  }
});

test("professional workspace is adjacent to Work Plan and reads the dedicated authority route", () => {
  const dashboard = source("src/pages/ContractorDashboard.jsx");
  const workspace = source("src/components/ProfessionalWorkPreparationWorkspace.jsx");
  const api = source("src/utils/workPreparationApi.js");
  assert.match(dashboard, /canonical-job-work-plan[\s\S]*canonical-job-work-preparation[\s\S]*canonical-job-quotes/);
  assert.match(dashboard, /ProfessionalWorkPreparationWorkspace/);
  assert.match(api, /\/jobs\/\$\{encodeURIComponent\(normalizedJobId\)\}\/work-preparation/);
  assert.doesNotMatch(workspace, /fetchProfessionalJobWorkPlan|fetchProfessionalWorkPlanSummary|liveJob|localStorage|sessionStorage/);
});

test("workspace exposes three dimensions, explicit materialization, and refresh-after-write", () => {
  const workspace = source("src/components/ProfessionalWorkPreparationWorkspace.jsx");
  for (const marker of [
    "readiness.planningState", "readiness.acquisitionState", "readiness.preparationState",
    "materializeWorkPreparation", "recordWorkPreparationPurchase", "recordWorkPreparationEvent",
    "reviseWorkPreparation", "await load()", "commitmentLocked", "safeNextActions",
  ]) assert.match(workspace, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(getWorkPreparationCopy("en").emptyBody, /Viewing this section does not create a plan/);
});

test("actions stay bounded by provider, item kind, deposit gate, and canonical safe actions", () => {
  const workspace = source("src/components/ProfessionalWorkPreparationWorkspace.jsx");
  assert.match(workspace, /providerResponsibility === "BUSINESS"/);
  assert.match(workspace, /providerResponsibility === "CUSTOMER"/);
  assert.match(workspace, /INCLUDED_IN_ACCEPTED_TOTAL", "NOT_CUSTOMER_BILLABLE/);
  assert.match(workspace, /canPurchase.*commitmentLocked/);
  assert.match(workspace, /canPrepare.*commitmentLocked/);
  for (const action of [
    "BUSINESS_INVENTORY_ALLOCATED", "CUSTOMER_ITEM_RECEIVED", "MATERIAL_STAGED",
    "TOOLS_READY", "EQUIPMENT_READY", "PREPARATION_STARTED", "PREPARATION_READY", "PREPARATION_BLOCKED",
  ]) assert.match(workspace, new RegExp(action));
  assert.doesNotMatch(workspace, /correctMaterialPurchase|attachEvidenceReference/);
});

test("uncertain retries preserve the same key for the same payload and responsive controls remain usable", () => {
  const workspace = source("src/components/ProfessionalWorkPreparationWorkspace.jsx");
  assert.match(workspace, /current\?\.fingerprint === fingerprint/);
  assert.match(workspace, /commandKeys\.current\.delete\(scope\)/);
  assert.match(workspace, /repeat\(auto-fit, minmax/);
  assert.match(workspace, /minHeight: 44/);
  assert.match(workspace, /overflowWrap: "anywhere"/);
});

test("privacy and scope boundaries are explicit", () => {
  const workspace = source("src/components/ProfessionalWorkPreparationWorkspace.jsx");
  const english = getWorkPreparationCopy("en");
  assert.match(workspace, /providerResponsibility === "BUSINESS".*estimatedCost/s);
  assert.equal(english.privateCosts, "Internal cost details are business-only.");
  assert.match(english.workStartNotice, /does not enforce Work start/);
  assert.doesNotMatch(workspace, /invoice|payroll|billing|schedule|Clock In|Clock Out|EVV/);
});
