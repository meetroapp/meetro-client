export function buildCommunitySignals({ serviceDiscovery, moments, spotlight, wonderPass, engagement, relationships }) {
  const signals = [];
  const add = (condition, code, category, count) => { if (condition) signals.push({ code, ...(category ? { category } : {}), strength: count >= 5 ? "high" : count >= 2 ? "medium" : "low", evidenceCount: count }); };
  for (const item of serviceDiscovery.activeCategories) add(item.visibleProfessionals > 0, "active_local_service_category", item.category, item.visibleProfessionals);
  for (const category of moments.categories) add(true, "recent_moment_activity", category, moments.activeCount);
  for (const category of spotlight.categories) add(true, "active_spotlight_category", category, spotlight.activeCount);
  for (const category of wonderPass.categories) add(true, "active_wonder_pass_category", category, wonderPass.activeCount);
  add(engagement.totalVisibleInteractions > 0, "community_engagement_present", "", engagement.totalVisibleInteractions);
  add(relationships.existingCommunityConnections > 0, "community_connection_exists", "", relationships.existingCommunityConnections);
  return signals.slice(0, 10);
}
