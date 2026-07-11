export function buildCommunityTrends(records = []) {
  const count = (kind) => records.filter((item) => item.kind === kind && Number.isFinite(Date.parse(item.createdAt || ""))).length;
  const trend = (kind) => count(kind) >= 6 ? "unknown" : "insufficient_data";
  return { moments: trend("moment"), spotlight: trend("spotlight"), wonderPass: trend("wonder_pass"), serviceInterest: trend("service_interest") };
}
