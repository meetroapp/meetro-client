function key(record) {
  if (record.kind === "profile" && record.profileId) return `profile:${record.profileId}:${record.category}`;
  for (const field of ["momentId", "spotlightId", "wonderPassId", "postId", "profileId", "engagementId", "relationshipId", "conversationId"]) if (record[field]) return `${record.kind}:${record[field]}`;
  return `${record.kind}:${record.businessId}:${record.professionalId}:${record.category}:${record.createdAt}`;
}
export function deduplicateCommunityRecords(records = []) {
  const map = new Map(); const warnings = [];
  for (const record of records) {
    const id = key(record); const existing = map.get(id);
    if (!existing) { map.set(id, record); continue; }
    if (existing.communityId !== record.communityId) { warnings.push("cross_community_identity_conflict"); continue; }
    map.set(id, { ...existing, ...record,
      reactionCount: Math.max(existing.reactionCount, record.reactionCount),
      commentCount: Math.max(existing.commentCount, record.commentCount),
      shareCount: Math.max(existing.shareCount, record.shareCount),
      saveCount: Math.max(existing.saveCount, record.saveCount),
      redemptionCount: Math.max(existing.redemptionCount, record.redemptionCount),
    });
  }
  return { records: [...map.values()], warnings };
}
