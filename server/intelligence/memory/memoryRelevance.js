const SCOPE_POINTS = Object.freeze({ workflow: 500, relationship: 400, business: 300, user: 200, conversation: 450, community: 100, system: 50 });

export function scoreMemoryRelevance(memory = {}, query = {}) {
  const matchedBy = [];
  let relevanceScore = SCOPE_POINTS[memory.scope?.type] || 0;
  matchedBy.push(`${memory.scope?.type || "unknown"}_scope`);
  if (query.category && memory.category === query.category) { relevanceScore += 40; matchedBy.push("category_match"); }
  if (query.key && memory.key === query.key) { relevanceScore += 50; matchedBy.push("key_match"); }
  if (query.feature && memory.tags?.includes(query.feature)) { relevanceScore += 25; matchedBy.push("feature_match"); }
  if (query.capability && memory.tags?.includes(query.capability)) { relevanceScore += 20; matchedBy.push("capability_match"); }
  if (memory.category === "unfinished_work") { relevanceScore += 30; matchedBy.push("unfinished_work"); }
  return { relevanceScore, matchedBy };
}
