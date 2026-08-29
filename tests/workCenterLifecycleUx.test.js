import assert from "node:assert/strict";
import test from "node:test";
import {
  WORK_CENTER_LIFECYCLE,
  WORK_LEVEL_AUTHORITY_GAPS,
  buildApprovedWorkProjection,
  buildEvaluationAssistantProfessionalInput,
  buildEvaluationTruthProjection,
  buildExecutionSafeViewModel,
  buildReadinessProjection,
  deriveWorkExecutionMode,
  selectApprovedQuote,
} from "../src/utils/workCenterLifecycleUx.js";

const evaluation = { evaluation: { content: {
  observations: "Water staining below sink.",
  diagnosisSummary: "Supply fitting is leaking.",
  findings: "Narrative finding retained.",
  measurements: [{ label: "Cabinet width", value: 36, unit: "in" }],
  limitations: "Rear wall not opened.",
  scopeRecommendations: "Replace fitting; bring 1/2 in adapter.",
  supportingMediaReferences: ["photo-1"],
  internalNotes: "Customer prefers morning.",
} } };
const finding = { id: "finding-1", statement: "Corroded supply fitting", confirmationState: "CONFIRMED" };
const quote = { id: "quote-1", status: "ISSUED", decisionState: "APPROVED", decisionVersion: 3, decidedAt: "2026-01-01T00:00:00Z", scopeItems: [
  { scopeItemId: "scope-2", scopeItemRevision: 1, sequence: 2, description: "Install fitting", quantity: 1, classification: "LABOR_SERVICE", scopeSemantic: "FUTURE_WORK", materialResponsibility: "NOT_APPLICABLE", includedInTotal: true, unitAmountMinor: 9000, lineTotalMinor: 9000, source: { type: "FINDING" } },
  { scopeItemId: "scope-1", scopeItemRevision: 2, sequence: 1, description: "Supply fitting", quantity: 1, classification: "MATERIAL", scopeSemantic: "MATERIAL_INCLUDED", materialResponsibility: "PROFESSIONAL_SUPPLIED", includedInTotal: true, unitAmountMinor: 4000, lineTotalMinor: 4000, source: { type: "RECOMMENDATION" } },
  { scopeItemId: "scope-x", scopeItemRevision: 1, sequence: 3, description: "Cabinet replacement", quantity: 1, classification: "LABOR_SERVICE", scopeSemantic: "SEPARATE_PROPOSAL", materialResponsibility: "NOT_APPLICABLE", includedInTotal: false, unitAmountMinor: 100, lineTotalMinor: 100, source: { type: "MANUAL_PROFESSIONAL" } },
] };
const plan = { workstreams: [{ id: "ws-1", title: "Repair", state: "OPEN", status: "IN_PROGRESS", activities: [{ id: "act-1", statement: "Install fitting", status: "IN_PROGRESS", updatedAt: "2026-01-02" }] }] };
const preparation = { exists: true, deposit: { state: "NOT_REQUIRED" }, readiness: { planningState: "PLANNED", acquisitionState: "READY", preparationState: "READY", workStartBlocked: false } };
const schedule = { visits: [{ id: "visit-1", state: "SCHEDULED", scheduledStartAt: "2026-01-03", scheduledEndAt: null }] };

test("1. lifecycle starts with Evaluation", () => assert.equal(WORK_CENTER_LIFECYCLE[0], "Evaluation"));
test("2. lifecycle places Quote & Approval second", () => assert.equal(WORK_CENTER_LIFECYCLE[1], "Quote & Approval"));
test("3. lifecycle places Work Plan before Start Work", () => assert.ok(WORK_CENTER_LIFECYCLE.indexOf("Work Plan") < WORK_CENTER_LIFECYCLE.indexOf("Start Work")));
test("4. lifecycle places Invoice & Closeout after Complete Work", () => assert.ok(WORK_CENTER_LIFECYCLE.indexOf("Invoice & Closeout") > WORK_CENTER_LIFECYCLE.indexOf("Complete Work")));
test("5. Ask Meetro is not a lifecycle stage", () => assert.equal(WORK_CENTER_LIFECYCLE.includes("Ask Meetro"), false));
test("6. Deposit is not a lifecycle stage", () => assert.equal(WORK_CENTER_LIFECYCLE.includes("Deposit"), false));
test("7. Ready to Start is not a lifecycle stage", () => assert.equal(WORK_CENTER_LIFECYCLE.includes("Ready to Start"), false));
test("8. Evaluation observations remain canonical truth", () => assert.equal(buildEvaluationTruthProjection({ evaluation }).observations, "Water staining below sink."));
test("9. Evaluation assessment summary remains canonical truth", () => assert.match(buildEvaluationTruthProjection({ evaluation }).assessmentSummary, /fitting/));
test("10. Evaluation narrative finding remains canonical truth", () => assert.match(buildEvaluationTruthProjection({ evaluation }).narrativeFindings, /retained/));
test("11. Evaluation measurements are normalized", () => assert.deepEqual(buildEvaluationTruthProjection({ evaluation }).measurements, ["Cabinet width: 36 in"]));
test("12. Evaluation photos contribute information", () => assert.equal(buildEvaluationTruthProjection({ evaluation }).hasEvaluationInformation, true));
test("13. zero structured findings is explicit", () => assert.equal(buildEvaluationTruthProjection({ evaluation }).hasStructuredFindings, false));
test("14. structured findings are preserved", () => assert.equal(buildEvaluationTruthProjection({ evaluation, structuredFindings: [finding] }).structuredFindings[0].statement, finding.statement));
test("15. narrative reference exists without structured findings", () => assert.match(buildEvaluationTruthProjection({ evaluation }).narrativeReference, /Water staining/));
test("16. empty evaluation is not misrepresented", () => assert.equal(buildEvaluationTruthProjection({ evaluation: null }).hasEvaluationInformation, false));
test("17. Ask Meetro receives observations", () => assert.match(buildEvaluationAssistantProfessionalInput({ evaluation }).observations, /Water/));
test("18. Ask Meetro receives measurements", () => assert.deepEqual(buildEvaluationAssistantProfessionalInput({ evaluation }).measurements, ["Cabinet width: 36 in"]));
test("19. Ask Meetro receives assessment summary", () => assert.match(buildEvaluationAssistantProfessionalInput({ evaluation }).notes, /Assessment summary/));
test("20. Ask Meetro receives structured findings", () => assert.match(buildEvaluationAssistantProfessionalInput({ evaluation, structuredFindings: [finding] }).notes, /Structured finding 1/));
test("21. Ask Meetro receives recommendations", () => assert.match(buildEvaluationAssistantProfessionalInput({ evaluation, recommendations: [{ statement: "Replace valve" }] }).notes, /Replace valve/));
test("22. Ask Meetro receives material context", () => assert.match(buildEvaluationAssistantProfessionalInput({ evaluation }).notes, /1\/2 in adapter/));
test("23. Ask Meetro receives the professional prompt last", () => assert.match(buildEvaluationAssistantProfessionalInput({ evaluation, prompt: "Draft it" }).notes, /Professional request: Draft it$/));
test("24. preferred approved quote wins", () => assert.equal(selectApprovedQuote([quote, { ...quote, id: "quote-2" }], "quote-2").id, "quote-2"));
test("25. unapproved quotes cannot become approved work", () => assert.equal(selectApprovedQuote([{ ...quote, decisionState: null }]), null));
test("26. approved work uses exact quote descriptions", () => assert.deepEqual(buildApprovedWorkProjection(quote).scope.map((item) => item.description), ["Supply fitting", "Install fitting"]));
test("27. approved work retains quote sequence", () => assert.deepEqual(buildApprovedWorkProjection(quote).scope.map((item) => item.sequence), [1, 2]));
test("28. excluded scope is not approved work", () => assert.equal(buildApprovedWorkProjection(quote).scope.some((item) => item.scopeItemId === "scope-x"), false));
test("29. approved work strips unit prices", () => assert.equal("unitAmountMinor" in buildApprovedWorkProjection(quote).scope[0], false));
test("30. approved work strips totals", () => assert.equal("totalMinor" in buildApprovedWorkProjection(quote), false));
test("31. planned activity is pre-work", () => assert.equal(deriveWorkExecutionMode({ plan: { workstreams: [{ state: "OPEN", status: "PLANNED", activities: [{ status: "PLANNED" }] }] } }), "PRE_WORK"));
test("32. in-progress activity selects Work In Progress", () => assert.equal(deriveWorkExecutionMode({ plan }), "IN_PROGRESS"));
test("33. done activity with open Workstream stays Work In Progress", () => assert.equal(deriveWorkExecutionMode({ plan: { workstreams: [{ state: "OPEN", status: "IN_PROGRESS", activities: [{ status: "DONE" }] }] } }), "IN_PROGRESS"));
test("34. canonical completed Job selects completed mode", () => assert.equal(deriveWorkExecutionMode({ plan, liveJob: { stage: { code: "JOB_COMPLETED" } } }), "COMPLETED"));
test("35. all canonical Workstreams complete selects completed mode", () => assert.equal(deriveWorkExecutionMode({ plan: { workstreams: [{ state: "COMPLETED", status: "COMPLETED", activities: [] }] } }), "COMPLETED"));
test("36. complete readiness yields Ready to Start status", () => assert.equal(buildReadinessProjection({ approvedWork: buildApprovedWorkProjection(quote), preparation, schedule }).label, "Ready to Start"));
test("37. readiness fails closed without schedule", () => assert.equal(buildReadinessProjection({ approvedWork: buildApprovedWorkProjection(quote), preparation, schedule: [] }).readyToStart, false));
test("38. execution view model contains both authority gaps", () => assert.deepEqual(buildExecutionSafeViewModel({ approvedWork: buildApprovedWorkProjection(quote), plan, preparation, schedule }).authorityGaps, WORK_LEVEL_AUTHORITY_GAPS));
test("39. execution view model exposes no commercial amounts", () => assert.doesNotMatch(JSON.stringify(buildExecutionSafeViewModel({ approvedWork: buildApprovedWorkProjection(quote), plan, preparation, schedule })), /price|deposit|payment|balance|margin|invoice|AmountMinor|TotalMinor/i));
test("40. execution view model preserves approved scope and progress", () => { const view = buildExecutionSafeViewModel({ approvedWork: buildApprovedWorkProjection(quote), plan, preparation, schedule }); assert.deepEqual([view.approvedScope.length, view.progress.length], [2, 1]); });
