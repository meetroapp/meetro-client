import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const evaluation = readFileSync(
  new URL("../src/components/CanonicalJobEvaluation.jsx", import.meta.url),
  "utf8"
);
const conversation = readFileSync(
  new URL("../src/components/CanonicalConversationVisitCard.jsx", import.meta.url),
  "utf8"
);
const workCenterVisits = readFileSync(
  new URL("../src/components/CanonicalJobVisits.jsx", import.meta.url),
  "utf8"
);
const schedule = readFileSync(
  new URL("../src/components/ProfessionalScheduleWorkspace.jsx", import.meta.url),
  "utf8"
);
const quoteWorkspace = readFileSync(
  new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
  "utf8"
);
const contractorDashboard = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

test("all operational Visit surfaces expose one canonical Start and In Progress state", () => {
  for (const source of [conversation, workCenterVisits, schedule]) {
    assert.match(source, /Start Visit/);
    assert.match(source, /runCanonicalVisitCommand/);
  }
  assert.match(conversation, /Evaluation Visit In Progress/);
  assert.match(workCenterVisits, /STARTED: "In Progress"/);
  assert.match(schedule, /title: "In Progress"/);
  assert.match(schedule, /canonicalGroups\.inProgress/);
});

test("onsite Evaluation uses simple manual and assisted entry only after Visit Start", () => {
  assert.match(evaluation, /visitAllowsDocumentation/);
  assert.match(evaluation, /activeState === "STARTED"/);
  assert.match(evaluation, /Fill manually/);
  assert.match(evaluation, /ContextualAskMeetro/);
  assert.match(evaluation, /What did you find\?/);
  assert.match(evaluation, /What do you recommend\?/);
  assert.match(evaluation, /<details style=\{styles\.advancedFields\}>/);
  assert.match(evaluation, /evaluationVisitState\.startedVisitId/);
  assert.match(evaluation, /completedVisitId \|\|[\s\S]*startedVisitId/);
});

test("valid assistant actions mutate visible Evaluation work and Dismiss removes reviewed items", () => {
  assert.match(evaluation, /addEvaluationDraft/);
  assert.match(evaluation, /setAssistantFindingDraft/);
  assert.match(evaluation, /setAssistantRecommendationDraft/);
  assert.match(evaluation, /Added to What did you find\?/);
  assert.match(evaluation, /Added to What do you recommend\?/);
  assert.match(evaluation, /setDismissedIds/);
  assert.match(evaluation, /filter\(\(item\) => !dismissedIds\.includes\(item\.id\)\)/);
});

test("Evaluation omits direct Quote promotion while exact Job Quote entry remains available", () => {
  assert.doesNotMatch(
    evaluation,
    /Prepare Quote Directly|prepareQuoteDirectly|Need to prepare a Quote without a completed Evaluation/
  );
  assert.doesNotMatch(evaluation, /onPrepareQuote/);
  assert.match(contractorDashboard, /quoteBuilder\?jobId=/);
  assert.match(contractorDashboard, /encodeURIComponent\(/);
  assert.match(
    contractorDashboard,
    /getIncompleteEvaluationQuoteWarning/
  );
  assert.match(quoteWorkspace, /Send Quote to Customer/);
  assert.match(quoteWorkspace, /beginGovernedQuoteIssue/);
});

test("completed Visit with a draft Evaluation is a dismissible reminder, not a lock", () => {
  assert.match(evaluation, /Evaluation documentation not complete/);
  assert.match(
    evaluation,
    /You can document the Evaluation now or return later\./
  );
  assert.match(evaluation, /Continue Evaluation/);
  assert.match(evaluation, /Evaluation draft saved/);
  assert.match(evaluation, /Review Findings &amp; Recommendations/);
  assert.match(evaluation, /Do this later/);
  assert.match(evaluation, /onClick=\{beginEditing\}/);
  assert.match(evaluation, /setDocumentationReminderDismissed\(true\)/);
  assert.doesNotMatch(evaluation, /Do this later[\s\S]{0,160}completeEvaluation/);
  assert.match(workCenterVisits, /evaluationVisitCompleted[\s\S]*STATE_LABELS\.COMPLETED/);
});
