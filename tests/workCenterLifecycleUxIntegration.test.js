import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseProfessionalWorkCenterRoute } from "../src/utils/professionalWorkCenterRoute.js";
import {
  WORK_CENTER_LIFECYCLE,
  buildApprovedWorkProjection,
  buildEvaluationAssistantProfessionalInput,
  buildEvaluationTruthProjection,
  deriveWorkExecutionMode,
} from "../src/utils/workCenterLifecycleUx.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const dashboard = read("src/pages/ContractorDashboard.jsx");
const plan = read("src/components/ProfessionalWorkPlanWorkspace.jsx");
const visits = read("src/components/CanonicalJobVisits.jsx");
const evaluationUi = read("src/components/CanonicalJobEvaluation.jsx");
const findingsUi = read("src/components/CanonicalFindingsPanel.jsx");
const assistantUi = read("src/components/ContextualAskMeetro.jsx");
const header = read("src/components/CompactCurrentJobHeader.jsx");
const workspaceSystem = read("src/components/WorkCenterWorkspaceSystem.jsx");
const css = read("src/index.css");
const evaluation = { evaluation: { content: { observations: "Water damage documented", diagnosisSummary: "Replace damaged trim", findings: "Inspect mold risk", measurements: ["36 in"], scopeRecommendations: "Bring trim and sealant", supportingMediaReferences: ["photo-1"], limitations: "Wall closed", internalNotes: "" } } };
const approvedQuote = { id: "quote", status: "ISSUED", decisionState: "APPROVED", currentVersion: 3, scopeItems: [{ scopeItemId: "scope", scopeItemRevision: 1, sequence: 1, description: "Replace damaged trim", quantity: 3, classification: "LABOR_SERVICE", scopeSemantic: "FUTURE_WORK", materialResponsibility: "NOT_APPLICABLE", includedInTotal: true, source: {} }] };

test("1. primary section order is Evaluation, Quote & Approval, Work Plan, execution, Invoice & Closeout", () => {
  assert.deepEqual(WORK_CENTER_LIFECYCLE.slice(0, 7), ["Evaluation", "Quote & Approval", "Work Plan", "Start Work", "Work In Progress", "Complete Work", "Invoice & Closeout"]);
  assert.match(dashboard, /canonical-job-evaluation[\s\S]*canonical-job-quotes[\s\S]*canonical-job-work-plan[\s\S]*canonical-job-completion-invoice/);
});
test("2. Ask Meetro is contextual and not a lifecycle stage", () => assert.equal(WORK_CENTER_LIFECYCLE.includes("Ask Meetro"), false));
test("3. Deposit is readiness state and not a lifecycle page", () => { assert.equal(WORK_CENTER_LIFECYCLE.includes("Deposit"), false); assert.match(plan, /Deposit received/); });
test("4. Ready to Start is a status and not a page", () => { assert.equal(WORK_CENTER_LIFECYCLE.includes("Ready to Start"), false); assert.match(plan, /readiness\.label/); });
test("5. Work Plan contains its four locked areas", () => { for (const label of ["Approved Work", "Materials & Preparation", "Work Schedule", "Ready to Start"]) assert.match(plan, new RegExp(label.replace(/[&]/g, "&"))); });
test("6. Materials & Preparation has no separate lifecycle accordion", () => assert.doesNotMatch(dashboard, /id="canonical-job-work-preparation"/));
test("7. approved-work scheduling appears inside Work Plan", () => assert.match(plan, /purposeFilter="APPROVED_WORK"/));
test("8. Evaluation Visit remains associated with Evaluation", () => assert.match(dashboard, /canonical-job-evaluation[\s\S]*purposeFilter="EVALUATION"/));
test("9. approved-work scheduling suppresses duplicate deposit cards", () => { assert.match(plan, /showDeposit=\{false\}/); assert.match(visits, /showDeposit && subject\.purpose/); });
test("10. normal Work Plan has no mandatory Work Item counter strip", () => assert.doesNotMatch(plan, /summary\.workItemCount|remainingCount|needsAttentionCount/));
test("11. normal Work Plan has no Add Work Item control", () => assert.doesNotMatch(plan, /Add Work Item|createWorkItem/));
test("12. normal Work Plan has no Complete Work Area control", () => assert.doesNotMatch(plan, /Complete Work Area|completeWorkArea/));
test("13. canonical Activity and Workstream records remain readable", () => { assert.match(plan, /data-workstream-id/); assert.match(plan, /data-work-item-id/); });
test("14. Approved Work derives from an approved Quote", () => assert.equal(buildApprovedWorkProjection(approvedQuote).quoteId, "quote"));
test("15. approved scope wording is preserved exactly", () => assert.equal(buildApprovedWorkProjection(approvedQuote).scope[0].description, approvedQuote.scopeItems[0].description));
test("16. pre-work canonical state renders Work Plan mode", () => assert.equal(deriveWorkExecutionMode({ plan: { workstreams: [{ state: "OPEN", status: "PLANNED", activities: [{ status: "PLANNED" }] }] } }), "PRE_WORK"));
test("17. canonical started state renders Work In Progress mode", () => assert.equal(deriveWorkExecutionMode({ plan: { workstreams: [{ state: "OPEN", status: "IN_PROGRESS", activities: [{ status: "IN_PROGRESS" }] }] } }), "IN_PROGRESS"));
test("18. canonical completed state renders Work Completed", () => { assert.equal(deriveWorkExecutionMode({ liveJob: { stage: { code: "JOB_COMPLETED" } } }), "COMPLETED"); assert.match(plan, /"Work Completed"/); });
test("19. Work execution does not infer financial Job closure", () => { assert.match(plan, /mode === "COMPLETED" && <p/); assert.doesNotMatch(plan, /createInvoice|recordPayment/); });
test("20. Work Plan mount performs reads and no business command", () => { assert.match(plan, /Promise\.allSettled/); assert.doesNotMatch(plan, /createWorkItem|progressWorkItem|completeWorkArea|completeJob/); });
test("21. narrative Evaluation does not use no-findings copy as its only truth", () => { assert.match(findingsUi, /evaluationTruth\.hasEvaluationInformation/); assert.match(findingsUi, /Evaluation details recorded/); });
test("22. Evaluation information existence is explicit", () => assert.equal(buildEvaluationTruthProjection({ evaluation }).hasEvaluationInformation, true));
test("23. zero structured findings is stated without denying narrative truth", () => { assert.equal(buildEvaluationTruthProjection({ evaluation }).hasStructuredFindings, false); assert.match(findingsUi, /No structured findings yet/); });
test("24. Turn notes into findings remains optional", () => assert.match(findingsUi, /canReviewFindings[\s\S]*Turn evaluation notes into findings/));
test("25. Ask Meetro receives professional observations", () => assert.equal(buildEvaluationAssistantProfessionalInput({ evaluation }).observations, "Water damage documented"));
test("26. Ask Meetro receives assessment summary", () => assert.match(buildEvaluationAssistantProfessionalInput({ evaluation }).notes, /Replace damaged trim/));
test("27. Ask Meetro receives structured findings", () => assert.match(buildEvaluationAssistantProfessionalInput({ evaluation, structuredFindings: [{ statement: "Rot found" }] }).notes, /Rot found/));
test("28. Ask Meetro receives recommendations, measurements, and material context", () => { const input = buildEvaluationAssistantProfessionalInput({ evaluation, recommendations: [{ statement: "Replace panel" }] }); assert.deepEqual(input.measurements, ["36 in"]); assert.match(input.notes, /Replace panel/); assert.match(input.notes, /trim and sealant/); });
test("29. Ask Meetro proposes before any canonical apply", () => { const requestBlock = evaluationUi.slice(evaluationUi.indexOf("async function requestEvaluationHelp"), evaluationUi.indexOf("function mediaActions")); assert.match(requestBlock, /requestWorkflowIntelligence/); assert.doesNotMatch(requestBlock, /saveCanonicalEvaluationDraft|submitCanonicalFinding/); });
test("30. voice transcript is visible and editable before save", () => { assert.match(evaluationUi, /contextLabel="evaluation-observations"/); assert.match(evaluationUi, /observations: \[current\.observations\.trim\(\), transcript\.trim\(\)\]/); assert.match(evaluationUi, /value=\{form\[field\]\}/); });
test("31. AI does not silently save a finding", () => { assert.match(evaluationUi, /onAddFinding/); assert.match(findingsUi, /assistantFindingDraft/); assert.match(findingsUi, /onClick=\{\(\) => \{/); });
test("32. three suggestions are primary and remaining actions use More", () => { assert.match(assistantUi, /actions\.slice\(0, 3\)/); assert.match(assistantUi, />More</); });
test("33. retained Evaluation context prevents a false empty-assessment model", () => assert.match(buildEvaluationAssistantProfessionalInput({ evaluation }).notes, /Evaluation findings: Inspect mold risk/));
test("34. compact Job header renders customer and service once", () => { assert.equal((header.match(/<h2 style=\{styles\.title\}>\{customer\}<\/h2>/g) || []).length, 1); assert.equal((header.match(/<p style=\{styles\.service\}>\{service\}<\/p>/g) || []).length, 1); });
test("35. Job details use a compact responsive grid", () => assert.match(header, /repeat\(auto-fit, minmax\(220px, 1fr\)\)/));
test("36. compact iPhone layout avoids fixed-width horizontal overflow", () => { assert.match(header, /minWidth: 0/); assert.doesNotMatch(header, /width: [4-9]\d\d/); });
test("37. lifecycle accordions remain touch friendly", () => { assert.match(workspaceSystem, /work-center-accordion__trigger/); assert.match(css, /work-center-accordion__trigger[\s\S]*min-height:\s*44px/); });
test("38. canonical top-of-page uses one compact card instead of two tall cards", () => { assert.match(dashboard, /<CompactCurrentJobHeader/); assert.match(dashboard, /!isCanonicalReadOnlyJob && \([\s\S]*meetro-job-persistent-context/); });
test("39. compact Current Job retains status and next action", () => { assert.match(dashboard, /status=\{jobDisplayStatus\}/); assert.match(dashboard, /nextStep=\{jobDisplayNextStep\}/); });
test("40. hard refresh restores the exact canonical Job route", () => { const hash = "#workCenter?jobId=072c8736-5d97-4253-ba3e-dd1bce281a20&quoteId=f1858dc5-0c68-4296-af12-2e714ee8a42a"; assert.deepEqual(parseProfessionalWorkCenterRoute(hash), { jobId: "072c8736-5d97-4253-ba3e-dd1bce281a20", quoteId: "f1858dc5-0c68-4296-af12-2e714ee8a42a" }); });
