export const COMMUNITY_ENGINE_ID = "community";
export const COMMUNITY_ENGINE_PRIORITY = 85;
export const COMMUNITY_CONTEXT_LIMITS = Object.freeze({ categories: 10, signals: 10, opportunities: 8, evidence: 16 });
export const COMMUNITY_VISIBILITY = Object.freeze(["public", "community", "connections", "relationship", "business", "private", "hidden", "deleted", "blocked", "archived"]);
export function emptyCommunityContext() { return {}; }
