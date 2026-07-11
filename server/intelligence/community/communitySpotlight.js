function active(record, now) { const expires = Date.parse(record.expiresAt || ""); return !["expired", "deleted", "archived"].includes(record.status) && (!Number.isFinite(expires) || expires > now); }
export function buildCommunitySpotlight(records = [], now = Date.now()) {
  const items = records.filter((item) => item.kind === "spotlight" && active(item, now));
  return { activeCount: items.length, interactionCount: items.reduce((sum, item) => sum + item.reactionCount + item.commentCount + item.shareCount, 0), categories: [...new Set(items.map((item) => item.category).filter(Boolean))].sort() };
}
