const ORDER = Object.freeze({ critical: 0, high: 1, medium: 2, low: 3, deferred: 4 });
export function recommendationCategory(option = {}, collected = {}) {
  const domain = String(option.capabilityId || "").split(".")[0];
  if (collected.workflow?.workflowType === "emergency" || domain === "emergency") return "emergency";
  if (domain === "workflow" && /schedule/.test(option.capabilityId)) return "scheduling";
  if (domain === "communication") return "communication";
  if (domain === "document") return "document";
  return ["workflow", "relationship", "business", "community", "knowledge"].includes(domain) ? domain : "informational";
}
export function recommendationPriority(option = {}, collected = {}, selected = false) {
  if (option.blocked) return "deferred";
  if (recommendationCategory(option, collected) === "emergency") return "critical";
  if (collected.workflow?.blocked || collected.workflow?.waitingOn === "professional") return "high";
  if (selected && option.validationStatus === "supported" && option.confidence === "high") return "high";
  return selected ? "medium" : "deferred";
}
export function sortRecommendations(left, right) { return ORDER[left.priority] - ORDER[right.priority] || left.recommendationId.localeCompare(right.recommendationId); }

