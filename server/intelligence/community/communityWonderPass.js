function active(record, now) { const expires = Date.parse(record.expiresAt || ""); return ["active", "available", "published"].includes(record.status) && (!Number.isFinite(expires) || expires > now); }
export function buildCommunityWonderPass(records = [], now = Date.now()) {
  const items = records.filter((item) => item.kind === "wonder_pass" && active(item, now));
  return { activeCount: items.length, interactionCount: items.reduce((sum, item) => sum + item.redemptionCount, 0), categories: [...new Set(items.map((item) => item.category).filter(Boolean))].sort() };
}
