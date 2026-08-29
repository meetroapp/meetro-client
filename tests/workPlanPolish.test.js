import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildApprovedWorkProjection, buildExecutionSafeViewModel, buildMaterialPreparationProjection } from "../src/utils/workCenterLifecycleUx.js";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = source("src/components/ProfessionalWorkPlanWorkspace.jsx");
const compact = source("src/components/CompactWorkPlanPreparation.jsx");
const dashboard = source("src/pages/ContractorDashboard.jsx");
const visits = source("src/components/CanonicalJobVisits.jsx");
const css = source("src/index.css");

const quote = { id: "quote-1", status: "ISSUED", decisionState: "APPROVED", decisionVersion: 3, scopeItems: [
  { scopeItemId: "scope-1", sequence: 1, description: "Replace approved trim", quantity: 3, includedInTotal: true },
  { scopeItemId: "scope-x", sequence: 2, description: "Invented repair", quantity: 1, includedInTotal: false },
] };
const preparation = { exists: true, readiness: { preparationState: "READY" }, items: [
  { id: "business-1", kind: "MATERIAL", description: "Approved trim", quantity: 3, unit: "pieces", providerResponsibility: "BUSINESS", acquisitionState: "READY", preparationState: "READY", readyForWorkStart: true, requiredForWorkStart: true, internalEstimatedCostMinor: 4200, vendor: "Private vendor", internalNotes: "Private note" },
  { id: "customer-1", kind: "MATERIAL", description: "Matching paint", quantity: 1, unit: "can", providerResponsibility: "CUSTOMER", acquisitionState: "CUSTOMER_ITEM_PENDING", preparationState: "NOT_STARTED", readyForWorkStart: false, requiredForWorkStart: true },
  { id: "tool-1", kind: "TOOL", description: "Moisture meter", quantity: 1, unit: "each", providerResponsibility: "BUSINESS", acquisitionState: "READY", preparationState: "READY", readyForWorkStart: true, requiredForWorkStart: true },
] };
const materials = buildMaterialPreparationProjection(preparation);

test("1. Work Plan remains the primary container", () => assert.match(workspace, /data-work-plan-primary-container="true"/));
test("2. Approved Work comes from approved Quote scope", () => assert.equal(buildApprovedWorkProjection(quote).scope[0].description, "Replace approved trim"));
test("3. Approved Work does not fabricate excluded scope", () => assert.equal(buildApprovedWorkProjection(quote).scope.some((item) => item.description === "Invented repair"), false));
test("4. Materials summary uses the canonical business count and status", () => assert.equal(materials.materialsSummary, "1 item ready"));
test("5. Materials expands inline", () => assert.match(compact, /work-plan-materials-details/));
test("6. Materials detail contains only business-provided items", () => assert.deepEqual(materials.businessMaterials.map((item) => item.id), ["business-1"]));
test("7. Customer Supplies expands independently", () => { assert.match(compact, /expanded=\{open\.customer\}/); assert.match(compact, /toggle\("customer"\)/); });
test("8. Customer Supplies contains only customer-responsibility items", () => assert.deepEqual(materials.customerSupplies.map((item) => item.id), ["customer-1"]));
test("9. Empty customer supplies has plain-language copy", () => assert.equal(buildMaterialPreparationProjection({ ...preparation, items: [] }).customerSuppliesSummary, "None required"));
test("10. Preparation expands inline", () => assert.match(compact, /work-plan-preparation-details/));
test("11. No new materials route or tab is introduced", () => { assert.doesNotMatch(dashboard, /key: "(?:materials|customerSupplies|preWork)"/); assert.doesNotMatch(compact, /setPage\(/); });
test("12. Existing Work Preparation remains the only material model", () => { assert.match(compact, /buildMaterialPreparationProjection\(preparation\)/); assert.match(compact, /data-materials-model="existing-work-preparation"/); });
test("13. Private material data is stripped from compact and execution-safe projections", () => { assert.doesNotMatch(JSON.stringify(materials), /Private vendor|Private note|4200/); assert.doesNotMatch(JSON.stringify(buildExecutionSafeViewModel({ preparation })), /vendor|internalNotes|internalEstimatedCostMinor/i); });
test("14. Work Schedule uses field-friendly wording", () => { assert.match(workspace, /Assigned to/); assert.match(workspace, /At the job address/); });
test("15. Readiness uses the approved four labels", () => { for (const label of ["Customer approved", "Deposit received", "Materials ready", "Work scheduled"]) assert.match(workspace, new RegExp(label)); });
test("16. Technical authority language is not user-facing", () => {
  for (const surface of [workspace, visits, dashboard]) assert.doesNotMatch(surface, /atomic Work-level authority|lower-level commands|lifecycle authority|canonical Work completion|Activity state/);
  assert.match(workspace, /Start Work is temporarily unavailable/);
});
test("17. No lower-level command chaining is introduced", () => { for (const command of ["startActivity", "completeActivity", "startWorkstream", "completeJob"]) assert.doesNotMatch(workspace, new RegExp(command)); });
test("18. Ask Meetro stays outside the lifecycle Work Plan", () => assert.doesNotMatch(workspace, /ContextualAskMeetro|Ask Meetro/));
test("19. Evaluation remains before Work Plan", () => assert.ok(dashboard.indexOf('id="canonical-job-evaluation"') < dashboard.indexOf('id="canonical-job-work-plan"')));
test("20. Mobile layout stacks and avoids horizontal overflow", () => { assert.match(css, /max-width: 720px[\s\S]*work-plan-compact-area[\s\S]*grid-template-columns: minmax\(0, 1fr\)/); assert.match(compact, /minWidth: 0/); assert.match(compact, /overflow: "hidden"/); });
