export function buildBusinessTrends(records = []) {
  const dated = records.filter((item) => Number.isFinite(Date.parse(item.createdAt || item.updatedAt || "")));
  const value = dated.length >= 6 ? "unknown" : "insufficient_data";
  return { workload: value, emergencyActivity: value, proposalActivity: value };
}
