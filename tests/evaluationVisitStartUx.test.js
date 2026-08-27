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

test("direct Quote entry warns truthfully while governed send remains explicit", () => {
  assert.match(
    evaluation,
    /Evaluation not completed\. This Quote is being prepared from professional-entered information\./
  );
  assert.match(evaluation, /Continue to Quote/);
  assert.match(evaluation, /return to Evaluation/i);
  assert.match(evaluation, /onPrepareQuote\(\)/);
  assert.doesNotMatch(evaluation, /createOrdinaryJobEvaluation[\s\S]*prepareQuoteDirectly/);
  assert.match(quoteWorkspace, /Send Quote to Customer/);
  assert.match(quoteWorkspace, /beginGovernedQuoteIssue/);
});
