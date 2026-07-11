export function resolveRecommendationMode(collected = {}, recommendations = []) {
  const decision = collected.decision || {}; const validation = collected.validation || {};
  if (validation.responseConstraints?.clarificationRequired || decision.recommendationMode === "clarification_required") return "clarification_required";
  if (validation.status === "blocked" || decision.recommendationMode === "blocked") return "blocked";
  if (collected.workflow?.completion?.finished && !decision.recommendedOption) return "no_action";
  if (["no_safe_option", "unsupported"].includes(decision.recommendationMode) || !recommendations.some((item) => !item.blocked && item.priority !== "deferred")) return "no_safe_recommendation";
  if (!decision.recommendedOption && recommendations.some((item) => !item.blocked)) return "deferred";
  return "recommended";
}

