export function evaluateRelationshipConfidence({ matchedBy = "", conflicts = [], parties = {}, recordCount = 0 } = {}) {
  if (conflicts.length || !parties.customerId || (!parties.businessId && !parties.professionalId)) return { level: "low", score: 0.4 };
  if (matchedBy === "relationshipId" && recordCount > 1) return { level: "high", score: 0.92 };
  if (["conversationId", "projectId", "jobId", "requestId", "emergencyRequestId"].includes(matchedBy)) return { level: "high", score: 0.86 };
  return { level: "medium", score: 0.7 };
}
