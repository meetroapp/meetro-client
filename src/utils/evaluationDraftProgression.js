function exactMeaningfulText(value) {
  return typeof value === "string" && value.trim() ? value : "";
}

function canonicalEvaluationContent(evaluation) {
  const content = evaluation?.evaluation?.content;
  return content && typeof content === "object" ? content : {};
}

export const INCOMPLETE_EVALUATION_QUOTE_WARNING =
  "Evaluation not completed. This Quote is being prepared from professional-entered information. Continue to Quote?";

export function getIncompleteEvaluationQuoteWarning(stageCode) {
  return ["EVALUATION_NEEDED", "EVALUATION_IN_PROGRESS"].includes(
    String(stageCode || "").trim()
  )
    ? INCOMPLETE_EVALUATION_QUOTE_WARNING
    : "";
}

export function getCanonicalEvaluationDraftProgress(evaluation) {
  const content = canonicalEvaluationContent(evaluation);
  const observations = exactMeaningfulText(content.observations);
  const diagnosisSummary = exactMeaningfulText(content.diagnosisSummary);
  return {
    observations,
    diagnosisSummary,
    hasMeaningfulSavedContent: Boolean(observations || diagnosisSummary),
  };
}

export function getNewFindingDraftText({
  evaluation,
  existingFindings = [],
  currentDraft = null,
  explicitDraft = "",
} = {}) {
  if (currentDraft != null) return String(currentDraft);
  const reviewedDraft = exactMeaningfulText(explicitDraft);
  if (reviewedDraft) return reviewedDraft;
  if (Array.isArray(existingFindings) && existingFindings.length > 0) return "";
  return getCanonicalEvaluationDraftProgress(evaluation).observations;
}

export function getNewRecommendationDraftText({
  evaluationDiagnosisSummary = "",
  existingRecommendations = [],
  currentDraft = null,
  explicitDraft = "",
} = {}) {
  if (currentDraft != null) return String(currentDraft);
  const reviewedDraft = exactMeaningfulText(explicitDraft);
  if (reviewedDraft) return reviewedDraft;
  if (
    Array.isArray(existingRecommendations) &&
    existingRecommendations.length > 0
  ) return "";
  return exactMeaningfulText(evaluationDiagnosisSummary);
}
