import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getCanonicalEvaluationDraftProgress,
  getIncompleteEvaluationQuoteWarning,
  getNewFindingDraftText,
  getNewRecommendationDraftText,
} from "../src/utils/evaluationDraftProgression.js";
import { ordinaryCanonicalEvaluationFixture } from "./canonicalEvaluation.test.js";

const observations =
  "Water damage inside cabinet holding door, all 3 trims are also damage";
const diagnosisSummary =
  "Replacement of all water damage area and inspect for mold and drywall repair as needed";

function evaluationWithContent(content = {}) {
  return ordinaryCanonicalEvaluationFixture({
    aggregate: { version: 1 },
    evaluation: {
      status: "draft",
      completedAt: null,
      content: {
        observations: "",
        diagnosisSummary: "",
        findings: [],
        scopeRecommendations: [],
        ...content,
      },
    },
  });
}

test("saved draft progression uses only hydrated canonical assessment content", () => {
  assert.equal(
    getCanonicalEvaluationDraftProgress(evaluationWithContent())
      .hasMeaningfulSavedContent,
    false
  );
  assert.equal(
    getCanonicalEvaluationDraftProgress(
      evaluationWithContent({ observations })
    ).hasMeaningfulSavedContent,
    true
  );
  assert.equal(
    getCanonicalEvaluationDraftProgress(
      evaluationWithContent({ diagnosisSummary })
    ).hasMeaningfulSavedContent,
    true
  );
  assert.equal(
    getCanonicalEvaluationDraftProgress(
      evaluationWithContent({ observations: "   ", diagnosisSummary: "\n" })
    ).hasMeaningfulSavedContent,
    false
  );
});

test("exact Job Quote entry warns for incomplete Evaluation without hard-blocking", () => {
  assert.equal(
    getIncompleteEvaluationQuoteWarning("EVALUATION_IN_PROGRESS"),
    "Evaluation not completed. This Quote is being prepared from professional-entered information. Continue to Quote?"
  );
  assert.ok(getIncompleteEvaluationQuoteWarning("EVALUATION_NEEDED"));
  assert.equal(getIncompleteEvaluationQuoteWarning("FINDINGS_REVIEW_NEEDED"), "");
  assert.equal(getIncompleteEvaluationQuoteWarning("QUOTE_NEEDED"), "");
});

test("new Finding draft reuses exact Evaluation observations without overwriting work", () => {
  const evaluation = evaluationWithContent({ observations });
  assert.equal(getNewFindingDraftText({ evaluation }), observations);
  assert.equal(
    getNewFindingDraftText({ evaluation, existingFindings: [{ id: "finding-1" }] }),
    ""
  );
  assert.equal(
    getNewFindingDraftText({ evaluation, currentDraft: "Unsaved professional edit" }),
    "Unsaved professional edit"
  );
  assert.equal(
    getNewFindingDraftText({ evaluation, explicitDraft: "Reviewed assistant draft" }),
    "Reviewed assistant draft"
  );
  assert.equal(
    getNewFindingDraftText({ evaluation: evaluationWithContent() }),
    ""
  );
});

test("new Recommendation draft reuses exact diagnosis summary without overwriting work", () => {
  assert.equal(
    getNewRecommendationDraftText({ evaluationDiagnosisSummary: diagnosisSummary }),
    diagnosisSummary
  );
  assert.equal(
    getNewRecommendationDraftText({
      evaluationDiagnosisSummary: diagnosisSummary,
      existingRecommendations: [{ id: "recommendation-1" }],
    }),
    ""
  );
  assert.equal(
    getNewRecommendationDraftText({
      evaluationDiagnosisSummary: diagnosisSummary,
      currentDraft: "Unsaved recommendation edit",
    }),
    "Unsaved recommendation edit"
  );
  assert.equal(
    getNewRecommendationDraftText({
      evaluationDiagnosisSummary: diagnosisSummary,
      explicitDraft: "Reviewed assistant recommendation",
    }),
    "Reviewed assistant recommendation"
  );
  assert.equal(getNewRecommendationDraftText(), "");
});

test("component integration keeps prefills local until explicit structured saves", () => {
  const evaluation = readFileSync(
    new URL("../src/components/CanonicalJobEvaluation.jsx", import.meta.url),
    "utf8"
  );
  const findings = readFileSync(
    new URL("../src/components/CanonicalFindingsPanel.jsx", import.meta.url),
    "utf8"
  );
  const recommendations = readFileSync(
    new URL("../src/components/CanonicalRecommendationsPanel.jsx", import.meta.url),
    "utf8"
  );
  const dashboard = readFileSync(
    new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
    "utf8"
  );

  assert.match(findings, /getNewFindingDraftText/);
  assert.match(findings, /existingFindings: state\.findings/);
  assert.match(findings, /submitCanonicalFinding/);
  assert.match(recommendations, /getNewRecommendationDraftText/);
  assert.match(recommendations, /existingRecommendations: state\.recommendations/);
  assert.match(recommendations, /createCanonicalRecommendation/);
  assert.match(evaluation, /Review Findings &amp; Recommendations/);
  assert.match(evaluation, /findingsReviewRequest/);
  assert.doesNotMatch(evaluation, /Prepare Quote Directly|prepareQuoteDirectly/);
  assert.doesNotMatch(
    dashboard,
    /<CanonicalJobEvaluation[\s\S]{0,1200}onPrepareQuote=/
  );
  assert.match(
    dashboard,
    /projection\.job\?\.id[\s\S]{0,700}quoteBuilder\?jobId=\$\{encodeURIComponent\(quoteJobId\)\}/
  );
  assert.match(
    dashboard,
    /getIncompleteEvaluationQuoteWarning/
  );
});

test("saved-draft reminder and dismissal are presentation-only", () => {
  const evaluation = readFileSync(
    new URL("../src/components/CanonicalJobEvaluation.jsx", import.meta.url),
    "utf8"
  );
  assert.match(evaluation, /Evaluation draft saved/);
  assert.match(
    evaluation,
    /Your latest Evaluation work is saved\. You can finish it now or return later\./
  );
  assert.match(evaluation, /copy\.evaluationUpdated/);
  assert.match(evaluation, /copy\.saveUpdate/);
  assert.match(evaluation, /setLoadState\(\{[\s\S]{0,260}evaluation: confirmed/);
  assert.match(evaluation, /setDocumentationReminderDismissed\(true\)/);
  assert.doesNotMatch(
    evaluation,
    /setDocumentationReminderDismissed\(true\)[\s\S]{0,180}(?:saveCanonical|completeCanonical|submitCanonical|createCanonical)/
  );
});
