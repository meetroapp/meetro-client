import { RECOMMENDATION_ENGINE_ID, RECOMMENDATION_ENGINE_PRIORITY, RECOMMENDATION_LIMITS, emptyRecommendationContext } from "./recommendationContracts.js";
import { recommendationLog } from "./recommendationLogging.js";
import { resolveRecommendationMode } from "./recommendationMode.js";
import { orderRecommendations } from "./recommendationOrdering.js";

export async function collectRecommendationIntelligence({ request = {}, collected = {}, logger = null } = {}) {
  const startedAt = Date.now(); const snapshot = structuredClone(collected);
  if (!snapshot.decision || !snapshot.validation) return emptyRecommendationContext();
  const ordered = orderRecommendations(snapshot); const mode = resolveRecommendationMode(snapshot, ordered);
  const active = mode === "recommended" ? ordered.filter((item) => !item.blocked && item.priority !== "deferred") : [];
  const deferred = ordered.filter((item) => !item.blocked && item.priority === "deferred").slice(0, RECOMMENDATION_LIMITS.deferred);
  const blocked = ordered.filter((item) => item.blocked).slice(0, RECOMMENDATION_LIMITS.blocked);
  const result = {
    recommendations: active, highestPriority: active[0]?.recommendationId || null,
    deferredRecommendations: deferred, blockedRecommendations: blocked,
    recommendationMode: mode, confidence: active.length ? snapshot.decision.confidence : "withheld",
    warnings: [...new Set([...(snapshot.decision.warnings || []), ...(mode === "no_safe_recommendation" ? ["no_safe_recommendation"] : [])])].sort(),
    execution: { performed: false, executableNow: false }, metadata: { truncated: ordered.length >= RECOMMENDATION_LIMITS.recommendations },
  };
  recommendationLog(logger, "info", "intelligence.recommendation.completed", { requestId: request.requestId, recommendationCount: active.length, highestPriority: result.highestPriority, blockedCount: blocked.length, confidence: result.confidence, elapsedMs: Date.now() - startedAt });
  return result;
}
export const recommendationEngine = Object.freeze({ id: RECOMMENDATION_ENGINE_ID, priority: RECOMMENDATION_ENGINE_PRIORITY, supports: () => true, async collectContext(request, collected = {}) { return { section: "recommendation", priority: RECOMMENDATION_ENGINE_PRIORITY, data: await collectRecommendationIntelligence({ request, collected }) }; } });

