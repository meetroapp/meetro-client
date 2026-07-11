import { COMMUNITY_CONTEXT_LIMITS, COMMUNITY_ENGINE_ID, COMMUNITY_ENGINE_PRIORITY, emptyCommunityContext } from "./communityContracts.js";
import { evaluateCommunityConfidence } from "./communityConfidence.js";
import { deduplicateCommunityRecords } from "./communityDeduplication.js";
import { buildCommunityEngagement } from "./communityEngagement.js";
import { buildCommunityMoments } from "./communityMoments.js";
import { normalizeCommunityRecord } from "./communityNormalizer.js";
import { buildCommunityOpportunities } from "./communityOpportunities.js";
import { buildCommunityRelationships } from "./communityRelationships.js";
import { buildCommunityServiceDiscovery } from "./communityServiceDiscovery.js";
import { buildCommunitySignals } from "./communitySignals.js";
import { buildCommunitySpotlight } from "./communitySpotlight.js";
import { resolveCommunitySource } from "./communitySourceResolver.js";
import { buildCommunityTrends } from "./communityTrends.js";
import { evaluateCommunityVisibility } from "./communityVisibility.js";
import { buildCommunityWonderPass } from "./communityWonderPass.js";

function communityPreferences(persistentMemory = {}) {
  return (persistentMemory.memories || [])
    .filter((item) => item.scope === "community" && ["preference", "service_preference", "product_preference"].includes(item.category))
    .map((item) => ({ category: item.category, key: item.key, value: structuredClone(item.value) }))
    .slice(0, 5);
}

function safeEvidence(activity, serviceDiscovery) {
  return [
    { type: "visible_moment_count", value: activity.activeMoments },
    { type: "visible_spotlight_count", value: activity.activeSpotlights },
    { type: "visible_wonder_pass_count", value: activity.activeWonderPassOffers },
    ...serviceDiscovery.activeCategories.map((item) => ({ type: "active_service_category", category: item.category, visibleProfessionalCount: item.visibleProfessionals })),
  ].filter((item) => item.value > 0 || item.visibleProfessionalCount > 0).slice(0, COMMUNITY_CONTEXT_LIMITS.evidence);
}

export function communityEngineSupports(request = {}) {
  const authorized = request.backendContext?.authorizedCommunityIds || request.user?.authorizedCommunityIds || [];
  return Boolean(request.backendContext?.publicCommunityId || request.backendContext?.communityId || request.user?.communityId || authorized.length);
}

export async function collectCommunityIntelligence({ request = {}, collected = {}, logger = null, now = Date.now() } = {}) {
  const startedAt = Date.now();
  logger?.info?.("intelligence.community.started", { requestId: request.requestId });
  try {
    const resolution = await resolveCommunitySource({ request });
    if (!resolution || !resolution.records.length) return emptyCommunityContext();
    logger?.info?.("intelligence.community.scope_resolved", { requestId: request.requestId, communityId: resolution.communityId });
    const relationshipIds = [...new Set([
      collected.relationship?.relationshipId,
      ...(Array.isArray(request.backendContext?.authorizedRelationshipIds) ? request.backendContext.authorizedRelationshipIds : []),
    ].filter(Boolean))];
    const visible = []; const warnings = [];
    for (const item of resolution.records) {
      const access = evaluateCommunityVisibility(item.record, { member: resolution.member, publicScope: resolution.publicScope, relationshipIds });
      if (access.warning) warnings.push(access.warning);
      if (access.visible) visible.push(item);
    }
    logger?.info?.("intelligence.community.visibility_filtered", { requestId: request.requestId, communityId: resolution.communityId, sourceCount: resolution.records.length, visibleRecordCount: visible.length });
    if (!visible.length) return emptyCommunityContext();
    const normalized = visible.map((item) => normalizeCommunityRecord({ ...item, resolution }));
    if (normalized.some((item) => ["active", "available", "published"].includes(item.status) && Number.isFinite(Date.parse(item.expiresAt || "")) && Date.parse(item.expiresAt) <= now)) {
      warnings.push("active_after_expiration");
    }
    const deduped = deduplicateCommunityRecords(normalized);
    warnings.push(...deduped.warnings);
    const moments = buildCommunityMoments(deduped.records, now);
    const spotlight = buildCommunitySpotlight(deduped.records, now);
    const wonderPass = buildCommunityWonderPass(deduped.records, now);
    const serviceDiscovery = buildCommunityServiceDiscovery(deduped.records);
    const relationships = buildCommunityRelationships(deduped.records, collected.relationship || {}, resolution.communityId);
    const engagement = buildCommunityEngagement(deduped.records, { moments, spotlight, wonderPass });
    const activity = {
      activeMoments: moments.activeCount,
      activeSpotlights: spotlight.activeCount,
      activeWonderPassOffers: wonderPass.activeCount,
      recentCommunityPosts: deduped.records.filter((item) => item.kind === "post").length,
      visibleProfessionalProfiles: new Set(deduped.records.filter((item) => item.kind === "profile").map((item) => item.professionalId || item.profileId)).size,
      visibleServiceCategories: serviceDiscovery.activeCategories.length,
    };
    const communitySignals = buildCommunitySignals({ serviceDiscovery, moments, spotlight, wonderPass, engagement, relationships });
    const opportunities = buildCommunityOpportunities({ serviceDiscovery, moments, spotlight, wonderPass, relationships });
    const firstLocation = deduped.records.map((item) => item.location).find((location) => location?.serviceAreaId || location?.city || location?.region) || {};
    const confidence = evaluateCommunityConfidence({ recordCount: deduped.records.length, warnings, missingTimestamps: deduped.records.filter((item) => !item.createdAt && !item.startsAt).length });
    const context = {
      communityId: resolution.communityId,
      source: resolution.source,
      scope: { type: "community", communityId: resolution.communityId, ...(firstLocation.serviceAreaId ? { serviceAreaId: firstLocation.serviceAreaId } : {}), ...(firstLocation.city ? { city: firstLocation.city } : {}), ...(firstLocation.region ? { region: firstLocation.region } : {}) },
      activity,
      serviceDiscovery: { ...serviceDiscovery, activeCategories: serviceDiscovery.activeCategories.slice(0, COMMUNITY_CONTEXT_LIMITS.categories) },
      engagement,
      relationships,
      opportunities,
      communitySignals,
      trends: buildCommunityTrends(deduped.records),
      preferences: communityPreferences(collected.persistentMemory),
      confidence,
      evidence: safeEvidence(activity, serviceDiscovery),
      warnings: [...new Set(warnings)],
      metadata: { truncated: serviceDiscovery.activeCategories.length > COMMUNITY_CONTEXT_LIMITS.categories },
    };
    logger?.info?.("intelligence.community.context_built", {
      requestId: request.requestId, communityId: resolution.communityId, sourceCount: resolution.records.length,
      visibleRecordCount: deduped.records.length, signalCount: communitySignals.length,
      opportunityCount: opportunities.length, confidence, truncated: context.metadata.truncated,
      elapsedMs: Date.now() - startedAt,
    });
    return context;
  } catch {
    logger?.warn?.("intelligence.community.failed", { requestId: request.requestId, elapsedMs: Date.now() - startedAt });
    return emptyCommunityContext();
  }
}

export const communityEngine = Object.freeze({
  id: COMMUNITY_ENGINE_ID, priority: COMMUNITY_ENGINE_PRIORITY,
  supports: communityEngineSupports,
  async collectContext(request, collected = {}) {
    return { section: "community", priority: COMMUNITY_ENGINE_PRIORITY, data: await collectCommunityIntelligence({ request, collected }) };
  },
});
