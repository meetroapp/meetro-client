export function resolvePlanReadiness({ mode, missingInformation = [], requiredApprovals = [], prerequisites = [] } = {}) {
  if (mode === "no_action") return "not_applicable";
  if (mode === "blocked" || mode === "no_safe_plan") return "blocked";
  if (mode === "clarification_required" || missingInformation.length) return "awaiting_information";
  if (requiredApprovals.length) return "awaiting_approval";
  if (prerequisites.some((item) => item.status !== "satisfied")) return "partially_ready";
  return "ready";
}

export function resolveContextReadiness(mode, plans = []) {
  if (mode === "no_action") return "not_applicable";
  if (["blocked", "no_safe_plan"].includes(mode)) return "blocked";
  if (mode === "clarification_required") return "awaiting_information";
  return plans[0]?.readiness || (mode === "deferred" ? "partially_ready" : "blocked");
}
