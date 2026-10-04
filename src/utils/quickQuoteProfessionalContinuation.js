const canonicalJobIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REVIEWABLE_SUGGESTION_CATEGORIES = new Set([
  "repairSuggestions",
  "materialSuggestions",
]);

export function isQuickQuoteSuggestionReviewable(category) {
  return REVIEWABLE_SUGGESTION_CATEGORIES.has(String(category || ""));
}

export function getQuickQuoteProfessionalContinuation({
  professionalInput,
  canonicalJobId,
} = {}) {
  const exactProfessionalInput =
    typeof professionalInput === "string" ? professionalInput : "";
  const normalizedJobId = String(canonicalJobId || "").trim();
  const governedJobId = canonicalJobIdPattern.test(normalizedJobId)
    ? normalizedJobId
    : "";

  return Object.freeze({
    canContinue: Boolean(exactProfessionalInput.trim()),
    professionalInput: exactProfessionalInput,
    canonicalJobId: governedJobId,
    nextStep: governedJobId
      ? "INTERNAL_ESTIMATE"
      : "CANONICAL_JOB_REQUIRED",
  });
}
