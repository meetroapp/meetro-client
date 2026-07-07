import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { isIntelligenceEngineResult } from "../intelligence/contracts/intelligenceEngineContract.js";
import { buildCompanionCommunityIntelligence } from "../intelligence/community/companionCommunityEngine.js";

test("Companion Community Engine returns contract-shaped safe community intelligence", () => {
  const result = buildCompanionCommunityIntelligence({
    intent: "reasoning",
    userMessage: "What can this neighborhood handle locally?",
    source: { page: "community", surface: "discover" },
    capabilities: {
      primaryCapabilities: ["local SEO", "social media marketing"],
      supportingCapabilities: ["photography", "copywriting"],
      capabilityFamilies: ["marketing", "local business growth"],
    },
    workflow: {
      currentStage: "communication",
      guidanceCategory: "clarify_next_step",
    },
    relationship: {
      relationshipType: "community_professional",
      communicationPosture: "community_trust",
    },
  });

  assert.equal(isIntelligenceEngineResult(result), true);
  assert.equal(result.ok, true);
  assert.equal(result.engine, "community");
  assert.equal(result.data.communityLens, "local_capability_network");
  assert.ok(result.data.capabilityGapSignals.some((signal) => /marketing|local business growth/i.test(signal)));
  assert.ok(result.data.neighborhoodSupportGuidance.some((item) => /common, seasonal, repeated, or missing/i.test(item)));
  assert.ok(result.data.trustBoundaries.some((item) => /must never sell leads/i.test(item)));
  assert.equal(typeof result.data.confidence, "number");
  assert.match(result.data.summary, /local capability network/i);
});

test("Companion Community Engine uses only supplied safe inputs", () => {
  const result = buildCompanionCommunityIntelligence({
    intent: "reasoning",
    userMessage: "Find help nearby.",
    source: { page: "community" },
    user: { id: "private-user", email: "private@example.com" },
    businesses: [{ name: "Injected Business" }],
    listings: [{ rank: 1 }],
    privateUserData: "hidden",
    capabilities: {
      primaryCapabilities: ["door installation"],
      capabilityFamilies: ["carpentry"],
    },
  });
  const serialized = JSON.stringify(result);

  assert.doesNotMatch(serialized, /private-user|private@example|Injected Business|"rank":1|privateUserData/);
  assert.match(serialized, /carpentry|door installation/);
});

test("Companion Community Engine preserves anti-marketplace boundaries", () => {
  const result = buildCompanionCommunityIntelligence({
    userMessage: "Which business should be ranked first?",
    source: { page: "community" },
    capabilities: {
      capabilityFamilies: ["home repair"],
    },
  });
  const text = result.data.trustBoundaries.join(" ");

  assert.match(text, /never sell leads/i);
  assert.match(text, /pay-to-rank|paid placement|hidden ranking/i);
  assert.match(text, /private user data|private business records/i);
  assert.equal("professionals" in result.data, false);
  assert.equal("businessRankings" in result.data, false);
  assert.equal("recommendedBusinesses" in result.data, false);
});

test("Companion Community Engine has conservative fallback when no capabilities are supplied", () => {
  const result = buildCompanionCommunityIntelligence({
    intent: "explanation",
    userMessage: "How should the community think about this?",
    source: { page: "home" },
  });

  assert.equal(result.data.communityLens, "local_capability_network");
  assert.deepEqual(result.data.capabilityGapSignals, []);
  assert.equal(result.data.confidence, 0.58);
  assert.ok(result.data.trustBoundaries.length >= 3);
});

test("Companion Community Engine is not wired into Gateway or Orchestrator", () => {
  const gatewaySource = fs.readFileSync(
    new URL("../intelligence/gateway.js", import.meta.url),
    "utf8"
  );
  const orchestratorSource = fs.readFileSync(
    new URL("../intelligence/orchestrator/companionOrchestrator.js", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(gatewaySource, /buildCompanionCommunityIntelligence|companionCommunityEngine/);
  assert.doesNotMatch(orchestratorSource, /buildCompanionCommunityIntelligence|companionCommunityEngine/);
});
