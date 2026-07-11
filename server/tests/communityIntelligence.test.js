import test from "node:test";
import assert from "node:assert/strict";

import { askCompanionGateway } from "../intelligence/gateway.js";
import {
  buildCommunityOpportunities,
  buildCommunityTrends,
  collectCommunityIntelligence,
  communityEngine,
  deduplicateCommunityRecords,
  evaluateCommunityVisibility,
  normalizeCommunityRecord,
  resolveCommunitySource,
} from "../intelligence/community/index.js";
import { createDefaultOrchestrationEngines } from "../intelligence/orchestrator/defaultEngines.js";
import { createEngineRegistry } from "../intelligence/orchestrator/engineRegistry.js";
import { selectEngineIds } from "../intelligence/orchestrator/engineSelector.js";

const COMMUNITY = "community-1";
const NOW = Date.parse("2026-07-11T16:00:00.000Z");

function request(overrides = {}) {
  return {
    requestId: "request-1",
    userId: "user-1",
    user: { id: "user-1", accountType: "standard", authorizedCommunityIds: [COMMUNITY] },
    feature: "community",
    source: { page: "community", surface: "discover" },
    backendContext: { authorizedCommunityIds: [COMMUNITY], communityId: COMMUNITY },
    repositories: {},
    ...overrides,
  };
}

function record(overrides = {}) {
  return { communityId: COMMUNITY, visibility: "community", status: "active", createdAt: "2026-07-10T12:00:00.000Z", ...overrides };
}

async function context(backend = {}, collected = {}, overrides = {}) {
  return collectCommunityIntelligence({
    request: request({ ...overrides, backendContext: { ...request().backendContext, ...backend } }),
    collected,
    now: NOW,
  });
}

test("Community Engine conforms to shared executable engine interface", () => {
  assert.equal(communityEngine.id, "community");
  assert.equal(communityEngine.priority, 85);
  assert.equal(typeof communityEngine.supports, "function");
  assert.equal(typeof communityEngine.collectContext, "function");
});

test("data-less and unscoped requests return empty context", async () => {
  assert.deepEqual(await collectCommunityIntelligence({ request: request({ backendContext: {}, user: { id: "user-1" } }) }), {});
  assert.deepEqual(await collectCommunityIntelligence({ request: request() }), {});
});

test("authorized community scope resolves and forged client community ID is ignored", async () => {
  const req = request({ communityId: "forged", body: { communityId: "forged" }, backendContext: { authorizedCommunityIds: [COMMUNITY], communityId: COMMUNITY, moments: [record({ momentId: "m1" })] } });
  const result = await resolveCommunitySource({ request: req });
  assert.equal(result.communityId, COMMUNITY);
  assert.equal(result.records.length, 1);
});

test("name-only community matching and ambiguous multi-community scope are rejected", async () => {
  assert.equal(await resolveCommunitySource({ request: request({ user: { id: "u" }, backendContext: { communityName: "Cape Coral", moments: [{ communityName: "Cape Coral" }] } }) }), null);
  assert.equal(await resolveCommunitySource({ request: request({ user: { id: "u", authorizedCommunityIds: ["a", "b"] }, backendContext: { authorizedCommunityIds: ["a", "b"] } }) }), null);
});

test("cross-community content remains isolated", async () => {
  const result = await context({ moments: [record({ momentId: "m1" }), record({ communityId: "community-2", momentId: "m2" })] });
  assert.equal(result.activity.activeMoments, 1);
});

test("private, hidden, blocked, deleted, and archived content is excluded", async () => {
  const result = await context({ moments: [
    record({ momentId: "public", visibility: "public" }),
    record({ momentId: "private", visibility: "private" }),
    record({ momentId: "hidden", visibility: "hidden" }),
    record({ momentId: "blocked", visibility: "public", blocked: true }),
    record({ momentId: "deleted", visibility: "deleted" }),
    record({ momentId: "archived", visibility: "archived" }),
  ] });
  assert.equal(result.activity.activeMoments, 1);
});

test("public content requires a valid public or member scope", () => {
  assert.equal(evaluateCommunityVisibility({ visibility: "public" }, { member: false, publicScope: false }).visible, false);
  assert.equal(evaluateCommunityVisibility({ visibility: "public" }, { member: false, publicScope: true }).visible, true);
});

test("connections-only content requires exact Relationship Intelligence linkage", async () => {
  const denied = await context({ moments: [record({ momentId: "m1", visibility: "connections", relationshipId: "relationship-1" })] });
  assert.deepEqual(denied, {});
  const allowed = await context(
    { moments: [record({ momentId: "m1", visibility: "connections", relationshipId: "relationship-1" })] },
    { relationship: { relationshipId: "relationship-1", communityId: COMMUNITY } }
  );
  assert.equal(allowed.activity.activeMoments, 1);
});

test("location minimization removes precise coordinates and addresses while preserving coarse scope", async () => {
  const result = await context({ moments: [record({ momentId: "m1", serviceAreaId: "service-area-1", city: "Cape Coral", region: "FL", address: "PRIVATE ADDRESS", latitude: 1, longitude: 2, coordinates: [1, 2] })] });
  assert.deepEqual(result.scope, { type: "community", communityId: COMMUNITY, serviceAreaId: "service-area-1", city: "Cape Coral", region: "FL" });
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE ADDRESS|latitude|longitude|coordinates/);
});

test("active Moments count once and expired Moments are excluded", async () => {
  const result = await context({ moments: [
    record({ momentId: "m1", category: "home_services", reactionCount: 2 }),
    record({ momentId: "m1", category: "home_services", reactionCount: 2 }),
    record({ momentId: "expired", category: "home_services", expiresAt: "2026-07-10T00:00:00Z" }),
  ] });
  assert.equal(result.activity.activeMoments, 1);
  assert.equal(result.engagement.momentInteractions, 2);
});

test("Moment engagement events deduplicate by stable ID", () => {
  const normalized = [
    normalizeCommunityRecord({ source: "communityEngagement", record: record({ engagementId: "e1", reactionCount: 1 }), resolution: { communityId: COMMUNITY } }),
    normalizeCommunityRecord({ source: "communityEngagement", record: record({ engagementId: "e1", reactionCount: 1 }), resolution: { communityId: COMMUNITY } }),
  ];
  assert.equal(deduplicateCommunityRecords(normalized).records.length, 1);
});

test("Spotlight is counted factually without endorsement, quality, or trust scoring", async () => {
  const result = await context({ spotlights: [record({ spotlightId: "s1", category: "creative", visibility: "public" })] });
  assert.equal(result.activity.activeSpotlights, 1);
  assert.doesNotMatch(JSON.stringify(result), /endorsement|qualityScore|trustScore|superiority/i);
});

test("Wonder Pass includes active aggregate activity and excludes expired offers and individual redemption history", async () => {
  const result = await context({ wonderPasses: [
    record({ wonderPassId: "w1", status: "active", category: "home_services", redemptionCount: 4, redemptionsAggregateAuthorized: true, redemptionUsers: ["PRIVATE USER"] }),
    record({ wonderPassId: "w2", status: "active", expiresAt: "2026-07-10T00:00:00Z", redemptionCount: 9, redemptionsAggregateAuthorized: true }),
  ] });
  assert.equal(result.activity.activeWonderPassOffers, 1);
  assert.equal(result.engagement.wonderPassInteractions, 4);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE USER|redemptionUsers/);
  assert.ok(result.warnings.includes("active_after_expiration"));
});

test("professional profiles deduplicate globally while preserving category counts", async () => {
  const result = await context({ professionalProfiles: [
    record({ profileId: "profile-1", professionalId: "professional-1", category: "handyman", visibility: "public" }),
    record({ profileId: "profile-1", professionalId: "professional-1", category: "painting", visibility: "public" }),
  ] });
  assert.equal(result.activity.visibleProfessionalProfiles, 1);
  assert.deepEqual(result.serviceDiscovery.activeCategories.map((item) => item.category), ["handyman", "painting"]);
});

test("one visible interest does not become a demand trend or opportunity", async () => {
  const result = await context({ serviceInterests: [record({ id: "interest-1", category: "handyman", aggregateInterestCount: 1 })] });
  assert.equal(result.opportunities.length, 0);
  assert.equal(result.trends.serviceInterest, "insufficient_data");
});

test("service opportunities require explicit aggregate evidence and remain advisory", async () => {
  const result = await context({ serviceInterests: [record({ id: "interest-1", category: "handyman", aggregateInterestCount: 4 })] });
  assert.equal(result.opportunities[0].code, "low_visible_service_supply");
  assert.equal(result.opportunities.some((item) => "action" in item || "leadId" in item), false);
});

test("duplicate opportunity codes are removed deterministically", () => {
  const result = buildCommunityOpportunities({
    serviceDiscovery: { activeCategories: [{ category: "handyman", visibleProfessionals: 0, recentActivityCount: 4 }], underservedCategories: ["handyman"] },
    moments: { categories: [], activeCount: 0 }, spotlight: { categories: [], activeCount: 0 }, wonderPass: { categories: [], activeCount: 0 }, relationships: { existingCommunityConnections: 0 },
  });
  assert.equal(new Set(result.map((item) => `${item.code}:${item.category}`)).size, result.length);
});

test("community relationships use exact scoped records and do not merge unrelated service relationships", async () => {
  const result = await context({ communityRelationships: [
    record({ relationshipId: "r1", conversationId: "c1", explicitlyLinked: true }),
    record({ relationshipId: "r2", conversationId: "c2", explicitlyLinked: false }),
  ] });
  assert.equal(result.relationships.existingCommunityConnections, 2);
  assert.equal(result.relationships.serviceRelationships, 1);
  assert.equal(result.relationships.conversationLinkedRelationships, 2);
});

test("Business Intelligence private metrics are excluded from Community context", async () => {
  const result = await context({ moments: [record({ momentId: "m1" })] }, { business: { recordedRevenue: 999999, workload: { customerNames: ["PRIVATE"] } } });
  assert.doesNotMatch(JSON.stringify(result), /999999|PRIVATE|recordedRevenue|customerNames/);
});

test("only approved community-scoped Persistent Memory preferences contribute", async () => {
  const result = await context({ moments: [record({ momentId: "m1" })] }, { persistentMemory: { memories: [
    { scope: "community", category: "service_preference", key: "category", value: { category: "handyman" } },
    { scope: "business", category: "business_preference", key: "revenue", value: { private: 999 } },
  ] } });
  assert.deepEqual(result.preferences, [{ category: "service_preference", key: "category", value: { category: "handyman" } }]);
  assert.doesNotMatch(JSON.stringify(result), /999|revenue/);
});

test("private engagement identities, comments, messages, and sensitive attributes are excluded", async () => {
  const result = await context({ communityEngagement: [record({ engagementId: "e1", reactionCount: 2, viewers: ["PRIVATE VIEWER"], commentBody: "PRIVATE COMMENT", messageBody: "PRIVATE MESSAGE", email: "private@example.com", religion: "private", politicalView: "private" })] });
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE VIEWER|PRIVATE COMMENT|PRIVATE MESSAGE|private@example.com|religion|political/i);
});

test("visibility contradictions and unsafe expiration lower confidence", async () => {
  const result = await context({
    moments: [record({ momentId: "conflict", visibility: "public", private: true })],
    wonderPasses: [record({ wonderPassId: "expired-active", status: "active", expiresAt: "2026-07-10T00:00:00Z" })],
  });
  assert.ok(result.warnings.includes("visibility_conflict"));
  assert.ok(result.warnings.includes("active_after_expiration"));
  assert.equal(result.confidence, "low");
});

test("trend analysis requires sufficient timestamps and never forecasts", () => {
  assert.deepEqual(buildCommunityTrends([normalizeCommunityRecord({ source: "moments", record: record({ momentId: "m1" }), resolution: { communityId: COMMUNITY } })]), {
    moments: "insufficient_data", spotlight: "insufficient_data", wonderPass: "insufficient_data", serviceInterest: "insufficient_data",
  });
});

test("context limits categories and reports truncation", async () => {
  const profiles = Array.from({ length: 12 }, (_, index) => record({ profileId: `p${index}`, professionalId: `pro${index}`, category: `category_${index}`, visibility: "public" }));
  const result = await context({ professionalProfiles: profiles });
  assert.equal(result.serviceDiscovery.activeCategories.length, 10);
  assert.equal(result.metadata.truncated, true);
});

test("Community intelligence logs contain safe counts only", async () => {
  const events = [];
  await collectCommunityIntelligence({
    request: request({ backendContext: { ...request().backendContext, moments: [record({ momentId: "m1", content: "PRIVATE CONTENT", address: "PRIVATE ADDRESS" })] } }),
    logger: { info(event, fields) { events.push({ event, fields }); }, warn(event, fields) { events.push({ event, fields }); } }, now: NOW,
  });
  assert.doesNotMatch(JSON.stringify(events), /PRIVATE CONTENT|PRIVATE ADDRESS/);
});

test("source Moments, Spotlight, Wonder Pass, and recommendation records remain immutable", async () => {
  const backend = { moments: [record({ momentId: "m1" })], spotlights: [record({ spotlightId: "s1" })], wonderPasses: [record({ wonderPassId: "w1" })], recommendations: [{ id: "recommendation-1" }] };
  const before = structuredClone(backend);
  await context(backend);
  assert.deepEqual(backend, before);
});

test("Community selection follows Business where authorized and excludes unscoped requests", () => {
  const registry = createEngineRegistry(createDefaultOrchestrationEngines());
  const professional = request({ user: { id: "p1", accountType: "professional", businessId: "b1", authorizedCommunityIds: [COMMUNITY] }, backendContext: { authorizedCommunityIds: [COMMUNITY], communityId: COMMUNITY, authorizedBusinessIds: ["b1"], businessId: "b1" }, feature: "community" });
  const ids = selectEngineIds(professional, registry);
  assert.ok(ids.indexOf("business") < ids.indexOf("community"));
  assert.equal(selectEngineIds({ userId: "u", user: { id: "u" }, feature: "community", backendContext: {}, source: {} }, registry).includes("community"), false);
});

test("Community context reaches Unified Context with one provider call and one usage event", async () => {
  const calls = []; const usage = [];
  const result = await askCompanionGateway({
    user: { id: "user-1", accountType: "standard", authorizedCommunityIds: [COMMUNITY] },
    body: { question: "What is happening locally?", feature: "community" },
    backendContext: { authorizedCommunityIds: [COMMUNITY], communityId: COMMUNITY, moments: [record({ momentId: "m1", visibility: "community" })] },
    providers: { openai: { name: "openai", async complete(payload) { calls.push(payload); return { answer: "One visible Moment is active." }; } } },
    recordUsage(event) { usage.push(event); }, logger: null,
  });
  assert.equal(result.success, true);
  assert.equal(calls.length, 1);
  assert.equal(usage.length, 1);
  const payload = JSON.parse(calls[0].messages[1].content);
  assert.equal(payload.unifiedContext.community.communityId, COMMUNITY);
  assert.equal("provider" in result, false);
});
