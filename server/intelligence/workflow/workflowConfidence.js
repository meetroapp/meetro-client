export function evaluateWorkflowConfidence({ matchedBy = "", warnings = [], ambiguous = false, explicitStatuses = [] } = {}) {
  if (ambiguous || warnings.length || !matchedBy) return { level: "low", score: 0.42 };
  if (explicitStatuses.length && matchedBy !== "active_backend_workflow") return { level: "high", score: 0.9 };
  return { level: "medium", score: 0.72 };
}
