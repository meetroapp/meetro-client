import { createIntelligenceEngineSuccess } from "../contracts/intelligenceEngineContract.js";
import {
  COMMUNITY_RULE_CATEGORIES,
  getCommunityIntelligenceRules,
} from "./communityRules.js";

const COMMUNITY_ENGINE_NAME = "community";

function normalize(value = "") {
  return String(value || "").toLowerCase();
}

function safeText(value = "") {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function safeArray(value = []) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
}

function buildSearchText({
  intent = "",
  userMessage = "",
  capabilities = {},
  workflow = {},
  relationship = {},
  source = {},
} = {}) {
  return [
    intent,
    userMessage,
    source.page,
    source.surface,
    workflow.currentStage,
    workflow.guidanceCategory,
    relationship.relationshipType,
    relationship.communicationPosture,
    relationship.relationshipSafeGuidance,
    ...safeArray(capabilities.primaryCapabilities),
    ...safeArray(capabilities.supportingCapabilities),
    ...safeArray(capabilities.capabilityFamilies),
  ]
    .filter(Boolean)
    .join(" ");
}

function pickCommunityLens({ searchText = "", source = {} } = {}) {
  const normalized = normalize(`${searchText} ${source.page || ""} ${source.surface || ""}`);

  if (/community|discover|neighborhood|nearby|local/.test(normalized)) {
    return "local_capability_network";
  }

  if (/professional|business|service|customer/.test(normalized)) {
    return "professional_participation";
  }

  return "relationship_safe_discovery";
}

function buildCapabilityGapSignals(capabilities = {}) {
  const families = safeArray(capabilities.capabilityFamilies);
  const primary = safeArray(capabilities.primaryCapabilities);
  const supporting = safeArray(capabilities.supportingCapabilities);
  const signals = [];

  if (families.length) {
    signals.push(`Community may need visible ${families.slice(0, 3).join(", ")} capability coverage.`);
  }

  if (primary.length && supporting.length) {
    signals.push(
      `This need may involve primary capabilities like ${primary.slice(0, 3).join(", ")} with supporting help around ${supporting.slice(0, 3).join(", ")}.`
    );
  }

  return signals;
}

function pickRulesByCategory(category) {
  return getCommunityIntelligenceRules()
    .filter((rule) => rule.category === category)
    .map((rule) => rule.rule);
}

export function buildCompanionCommunityIntelligence({
  intent = "reasoning",
  userMessage = "",
  capabilities = {},
  workflow = {},
  relationship = {},
  source = {},
} = {}) {
  const searchText = buildSearchText({
    intent,
    userMessage,
    capabilities,
    workflow,
    relationship,
    source,
  });
  const communityLens = pickCommunityLens({ searchText, source });
  const capabilityGapSignals = buildCapabilityGapSignals(capabilities);
  const neighborhoodSupportGuidance = pickRulesByCategory(COMMUNITY_RULE_CATEGORIES.supportPatterns);
  const trustBoundaries = [
    ...pickRulesByCategory(COMMUNITY_RULE_CATEGORIES.trustPreservation),
    ...pickRulesByCategory(COMMUNITY_RULE_CATEGORIES.antiMarketplaceBoundary),
    ...pickRulesByCategory(COMMUNITY_RULE_CATEGORIES.privacyBoundary),
  ];
  const confidence = capabilityGapSignals.length ? 0.74 : 0.58;

  return createIntelligenceEngineSuccess({
    engine: COMMUNITY_ENGINE_NAME,
    data: {
      communityLens,
      capabilityGapSignals,
      neighborhoodSupportGuidance,
      trustBoundaries,
      confidence,
      summary:
        "Community Intelligence should frame this as a local capability network and preserve trust before any marketplace behavior.",
    },
    diagnostics: {
      ruleCount: getCommunityIntelligenceRules().length,
      capabilityGapSignalCount: capabilityGapSignals.length,
      sourcePage: safeText(source.page),
      sourceSurface: safeText(source.surface),
    },
  });
}

