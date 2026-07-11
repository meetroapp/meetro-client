export function resolvePlanningMode(recommendation = {}, validation = {}, decision = {}) {
  if (["blocked", "unauthorized"].includes(validation.status) || decision.recommendationMode === "blocked") return "blocked";
  if (validation.responseConstraints?.clarificationRequired || decision.recommendationMode === "clarification_required") return "clarification_required";
  if (["conflicted", "insufficient_evidence", "stale_only"].includes(validation.status) || ["unsupported", "no_safe_option"].includes(decision.recommendationMode)) return "no_safe_plan";
  const mode = recommendation.recommendationMode;
  if (mode === "no_action") return "no_action";
  if (mode === "clarification_required") return "clarification_required";
  if (mode === "blocked") return "blocked";
  if (mode === "deferred") return "deferred";
  if (mode !== "recommended" || !recommendation.recommendations?.length) return "no_safe_plan";
  return "planned";
}
