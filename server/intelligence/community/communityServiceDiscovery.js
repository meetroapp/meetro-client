export function buildCommunityServiceDiscovery(records = []) {
  const profiles = records.filter((item) => item.kind === "profile");
  const interests = records.filter((item) => item.kind === "service_interest");
  const categories = [...new Set([...profiles, ...interests].map((item) => item.category).filter(Boolean))].sort();
  const activeCategories = categories.map((category) => ({
    category,
    visibleProfessionals: new Set(profiles.filter((item) => item.category === category).map((item) => item.professionalId || item.profileId)).size,
    recentActivityCount: interests.filter((item) => item.category === category).reduce((sum, item) => sum + item.serviceInterestCount, 0),
  }));
  return { activeCategories, underservedCategories: activeCategories.filter((item) => item.recentActivityCount >= 3 && item.visibleProfessionals === 0).map((item) => item.category), emergingCategories: [] };
}
