export function buildCommunityRelationships(records = [], relationship = {}, communityId = "") {
  const relationIds = new Set(records.filter((item) => item.kind === "relationship").map((item) => item.relationshipId).filter(Boolean));
  const conversationIds = new Set(records.filter((item) => item.kind === "relationship").map((item) => item.conversationId).filter(Boolean));
  if (relationship.relationshipId && relationship.communityId === communityId) relationIds.add(relationship.relationshipId);
  return { existingCommunityConnections: relationIds.size, serviceRelationships: records.filter((item) => item.kind === "relationship" && item.linked).length, conversationLinkedRelationships: conversationIds.size };
}
