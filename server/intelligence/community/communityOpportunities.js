export function buildCommunityOpportunities({ serviceDiscovery, moments, spotlight, wonderPass, relationships }) {
  const map = new Map();
  const add = (code, category, priority, count, label) => { if (count > 0) map.set(`${code}:${category}`, { code, category, priority, evidenceCount: count, label }); };
  for (const item of serviceDiscovery.activeCategories) if (item.recentActivityCount >= 3) add("local_service_interest", item.category, 70, item.recentActivityCount, `Visible local interest exists for ${item.category} services`);
  for (const category of serviceDiscovery.underservedCategories) add("low_visible_service_supply", category, 75, 3, `Visible service interest has limited public professional coverage`);
  for (const category of moments.categories) add("active_community_moment", category, 50, moments.activeCount, "Visible community Moment activity exists");
  for (const category of spotlight.categories) add("active_spotlight", category, 45, spotlight.activeCount, "Visible Spotlight activity exists");
  for (const category of wonderPass.categories) add("wonder_pass_participation", category, 40, wonderPass.activeCount, "Visible Wonder Pass participation exists");
  if (relationships.existingCommunityConnections) add("community_connection_follow_up", "community", 35, relationships.existingCommunityConnections, "An authorized community connection exists");
  return [...map.values()].sort((a, b) => b.priority - a.priority || a.code.localeCompare(b.code)).slice(0, 8);
}
