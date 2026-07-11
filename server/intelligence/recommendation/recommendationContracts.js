export const RECOMMENDATION_ENGINE_ID = "recommendation";
export const RECOMMENDATION_ENGINE_PRIORITY = 130;
export const RECOMMENDATION_PRIORITIES = Object.freeze(["critical", "high", "medium", "low", "deferred"]);
export const RECOMMENDATION_MODES = Object.freeze(["recommended", "deferred", "blocked", "clarification_required", "no_safe_recommendation", "no_action"]);
export const RECOMMENDATION_CATEGORIES = Object.freeze(["workflow", "relationship", "business", "community", "knowledge", "communication", "document", "scheduling", "follow_up", "emergency", "review", "maintenance", "informational", "no_action"]);
export const RECOMMENDATION_LIMITS = Object.freeze({ recommendations: 6, deferred: 6, blocked: 6, evidence: 20 });
export function emptyRecommendationContext(mode = "no_safe_recommendation") { return { recommendations: [], highestPriority: null, deferredRecommendations: [], blockedRecommendations: [], recommendationMode: mode, confidence: "withheld", warnings: [], execution: { performed: false, executableNow: false }, metadata: { truncated: false } }; }

