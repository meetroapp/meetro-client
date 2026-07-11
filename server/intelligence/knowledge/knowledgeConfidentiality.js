export const KNOWLEDGE_CONFIDENTIALITY = Object.freeze(["public", "user_visible", "internal", "restricted", "prohibited"]);

function includes(values, target) {
  return Array.isArray(values) && values.map(String).includes(String(target));
}

export function authorizeKnowledgeSource(source = {}, scope = {}) {
  if (source.confidentiality === "prohibited") return false;
  if (source.businessId && !includes(scope.authorizedBusinessIds, source.businessId)) return false;
  if (source.relationshipId && !includes(scope.authorizedRelationshipIds, source.relationshipId)) return false;
  if (source.communityId && !includes(scope.authorizedCommunityIds, source.communityId)) return false;
  if (["public", "user_visible"].includes(source.confidentiality)) return source.confidentiality === "public" || Boolean(scope.userId);
  if (source.confidentiality === "internal") return scope.allowInternal === true;
  if (source.confidentiality === "restricted") return includes(scope.authorizedSourceIds, source.sourceId);
  return false;
}

