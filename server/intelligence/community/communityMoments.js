function active(record, now) { const expires = Date.parse(record.expiresAt || ""); return !["expired", "deleted", "archived"].includes(record.status) && (!Number.isFinite(expires) || expires > now); }
export function buildCommunityMoments(records = [], now = Date.now()) {
  const moments = records.filter((item) => item.kind === "moment" && active(item, now));
  return { activeCount: moments.length, interactionCount: moments.reduce((sum, item) => sum + item.reactionCount + item.commentCount + item.shareCount + item.saveCount, 0), categories: [...new Set(moments.map((item) => item.category).filter(Boolean))].sort() };
}
