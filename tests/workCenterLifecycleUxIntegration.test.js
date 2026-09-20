import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
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

test("1. primary section order is the canonical seven-stage lifecycle", () => {
  assert.deepEqual(WORK_CENTER_LIFECYCLE, ["Evaluation", "Quote", "Deposit", "Schedule", "Work Plan", "Complete Job", "Invoice"]);
  assert.match(dashboard, /canonical-job-evaluation[\s\S]*canonical-job-quotes[\s\S]*canonical-job-deposit[\s\S]*canonical-job-schedule[\s\S]*canonical-job-work-plan[\s\S]*canonical-job-complete[\s\S]*canonical-job-invoice/);
});
test("2. Ask Meetro is contextual and not a lifecycle stage", () => assert.equal(WORK_CENTER_LIFECYCLE.includes("Ask Meetro"), false));
test("3. Deposit is a distinct lifecycle page", () => { assert.equal(WORK_CENTER_LIFECYCLE.includes("Deposit"), true); assert.match(dashboard, /id="canonical-job-deposit"/); });
test("4. Ready to Start is a status and not a page", () => { assert.equal(WORK_CENTER_LIFECYCLE.includes("Ready to Start"), false); assert.match(dashboard, /status=\{workCenterLabel\(jobDisplayStatus, activeLanguage\)\}/); });
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
test("18. canonical completed state renders Work Completed", () => { assert.equal(deriveWorkExecutionMode({ liveJob: { stage: { code: "WORK_COMPLETED" } } }), "COMPLETED"); assert.equal(deriveWorkExecutionMode({ liveJob: { stage: { code: "JOB_COMPLETED" } } }), "COMPLETED"); assert.match(plan, /"Work Completed"/); });
test("19. Work execution does not infer financial Job closure", () => { assert.match(plan, /Complete the governed Job review/); assert.doesNotMatch(plan, /Prepare Final Invoice|authority\?\.kind|createInvoice|recordPayment/); });
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
test("32. contextual entry delegates suggestions and composition to Universal Ask", () => { assert.match(assistantUi, /UniversalAskMeetroEntry/); assert.doesNotMatch(assistantUi, /textarea|onRequest/); });
test("33. retained Evaluation context prevents a false empty-assessment model", () => assert.match(buildEvaluationAssistantProfessionalInput({ evaluation }).notes, /Evaluation findings: Inspect mold risk/));
test("34. compact Job header renders customer and service once for normal and Emergency Jobs", async () => {
  const vite = await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false}});
  try {
    const {default: Header} = await vite.ssrLoadModule('/src/components/CompactCurrentJobHeader.jsx');
    for (const sourceType of ['', 'emergency_request']) {
      const html = renderToStaticMarkup(React.createElement(Header,{sourceType,customer:'Customer Example',service:'Service Example'}));
      assert.equal(html.split('Customer Example').length-1,1);
      assert.equal(html.split('Service Example').length-1,1);
      assert.ok(html.includes(sourceType ? '<h2>Service Example</h2>' : '<h2>Customer Example</h2>'));
      if(sourceType) assert.ok(!html.includes('Customer concern'));
    }
  } finally {await vite.close();}
});
test("35. Job details use a compact responsive grid", () => { assert.match(header, /compact-current-job-header__primary/); assert.match(header, /compact-current-job-header__details/); });
test("36. compact iPhone layout avoids fixed-width horizontal overflow", () => { assert.match(header, /compact-current-job-header__state/); assert.doesNotMatch(header, /width: [4-9]\d\d/); });
test("37. lifecycle accordions remain touch friendly", () => { assert.match(workspaceSystem, /work-center-accordion__trigger/); assert.match(css, /work-center-accordion__trigger[\s\S]*min-height:\s*44px/); });
test("38. canonical top-of-page uses one compact card instead of two tall cards", () => { assert.equal((dashboard.match(/<CompactCurrentJobHeader/g) || []).length, 1); assert.doesNotMatch(dashboard, /meetro-job-persistent-context/); });
test("39. compact Current Job retains status and next action", () => { assert.match(dashboard, /status=\{workCenterLabel\(jobDisplayStatus, activeLanguage\)\}/); assert.match(dashboard, /nextStep=\{workCenterLabel\(jobDisplayNextStep, activeLanguage\)\}/); });
test("40. hard refresh restores the exact canonical Job route", () => { const hash = "#workCenter?jobId=072c8736-5d97-4253-ba3e-dd1bce281a20&quoteId=f1858dc5-0c68-4296-af12-2e714ee8a42a"; assert.deepEqual(parseProfessionalWorkCenterRoute(hash), { jobId: "072c8736-5d97-4253-ba3e-dd1bce281a20", quoteId: "f1858dc5-0c68-4296-af12-2e714ee8a42a" }); });
