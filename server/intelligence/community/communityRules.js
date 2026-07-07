export const COMMUNITY_RULE_CATEGORIES = Object.freeze({
  capabilityGaps: "community_capability_gaps",
  supportPatterns: "neighborhood_support_patterns",
  professionalParticipation: "local_professional_participation",
  trustPreservation: "community_trust_preservation",
  antiMarketplaceBoundary: "anti_marketplace_boundary",
  privacyBoundary: "privacy_boundary",
});

const COMMUNITY_INTELLIGENCE_RULES = [
  {
    id: "community-capability-gaps",
    category: COMMUNITY_RULE_CATEGORIES.capabilityGaps,
    rule:
      "Community Intelligence may identify capability gaps in a local network, but it must describe needs at a community level rather than route leads or rank businesses.",
  },
  {
    id: "neighborhood-support-patterns",
    category: COMMUNITY_RULE_CATEGORIES.supportPatterns,
    rule:
      "Community Intelligence may recognize neighborhood support patterns so members understand what kinds of help are common, seasonal, repeated, or missing nearby.",
  },
  {
    id: "local-professional-participation",
    category: COMMUNITY_RULE_CATEGORIES.professionalParticipation,
    rule:
      "Community Intelligence should help local professionals participate clearly and usefully in the community without turning participation into lead extraction.",
  },
  {
    id: "community-trust-preservation",
    category: COMMUNITY_RULE_CATEGORIES.trustPreservation,
    rule:
      "Community Intelligence must strengthen local trust, continuity, and relationship-safe discovery before any growth or marketplace objective.",
  },
  {
    id: "no-lead-selling",
    category: COMMUNITY_RULE_CATEGORIES.antiMarketplaceBoundary,
    rule:
      "Community Intelligence must never sell leads, package members as inventory, or expose community needs as monetized lead products.",
  },
  {
    id: "no-pay-to-rank",
    category: COMMUNITY_RULE_CATEGORIES.antiMarketplaceBoundary,
    rule:
      "Community Intelligence must never create pay-to-rank behavior, paid placement, hidden ranking advantages, or marketplace-style business ordering.",
  },
  {
    id: "no-private-user-data-exposure",
    category: COMMUNITY_RULE_CATEGORIES.privacyBoundary,
    rule:
      "Community Intelligence must never expose private user data, private business records, unrelated conversations, hidden relationship data, or individual activity without permission.",
  },
];

function cloneRule(rule = {}) {
  return { ...rule };
}

export function getCommunityIntelligenceRules() {
  return COMMUNITY_INTELLIGENCE_RULES.map(cloneRule);
}

