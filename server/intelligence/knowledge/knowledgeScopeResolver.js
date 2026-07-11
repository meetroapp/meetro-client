function safeIds(value) {
  return Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === "string" && item))] : [];
}

export function resolveKnowledgeScope(request = {}) {
  const backend = request.backendContext || {};
  const user = request.user || {};
  const userId = String(request.userId || user.id || user.userId || "").trim();
  return Object.freeze({
    userId,
    language: String(backend.language || user.language || "en").toLowerCase(),
    productVersion: backend.productVersion || null,
    allowInternal: backend.allowInternalKnowledge === true,
    authorizedSourceIds: safeIds(backend.authorizedKnowledgeSourceIds),
    authorizedBusinessIds: safeIds(backend.authorizedBusinessIds || user.authorizedBusinessIds),
    authorizedRelationshipIds: safeIds(backend.authorizedRelationshipIds),
    authorizedCommunityIds: safeIds(backend.authorizedCommunityIds || user.authorizedCommunityIds),
    historical: backend.allowHistoricalKnowledge === true,
  });
}

