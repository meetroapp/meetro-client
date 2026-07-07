import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  COMMUNITY_RULE_CATEGORIES,
  getCommunityIntelligenceRules,
} from "../intelligence/community/communityRules.js";

test("Community Intelligence rules cover local capability networks", () => {
  const rules = getCommunityIntelligenceRules();
  const text = rules.map((rule) => rule.rule).join(" ");

  assert.ok(rules.some((rule) => rule.category === COMMUNITY_RULE_CATEGORIES.capabilityGaps));
  assert.ok(rules.some((rule) => rule.category === COMMUNITY_RULE_CATEGORIES.supportPatterns));
  assert.ok(rules.some((rule) => rule.category === COMMUNITY_RULE_CATEGORIES.professionalParticipation));
  assert.match(text, /capability gaps/i);
  assert.match(text, /neighborhood support patterns|common, seasonal, repeated, or missing/i);
  assert.match(text, /local professionals/i);
});

test("Community Intelligence rules include anti-marketplace boundaries", () => {
  const rules = getCommunityIntelligenceRules();
  const text = rules.map((rule) => `${rule.id} ${rule.rule}`).join(" ");

  assert.match(text, /No lead selling|never sell leads/i);
  assert.match(text, /pay-to-rank|paid placement|hidden ranking/i);
  assert.match(text, /lead extraction/i);
  assert.match(text, /must strengthen local trust/i);
});

test("Community Intelligence rules protect private user data", () => {
  const rules = getCommunityIntelligenceRules();
  const privacyRules = rules.filter((rule) => rule.category === COMMUNITY_RULE_CATEGORIES.privacyBoundary);

  assert.equal(privacyRules.length, 1);
  assert.match(privacyRules[0].rule, /private user data/i);
  assert.match(privacyRules[0].rule, /unrelated conversations|hidden relationship data/i);
});

test("Community Intelligence rule helper returns safe copies", () => {
  const firstRead = getCommunityIntelligenceRules();
  firstRead[0].rule = "mutated";

  const secondRead = getCommunityIntelligenceRules();
  assert.notEqual(secondRead[0].rule, "mutated");
});

test("Community Intelligence rules are not wired into Gateway or Orchestrator", () => {
  const gatewaySource = fs.readFileSync(
    new URL("../intelligence/gateway.js", import.meta.url),
    "utf8"
  );
  const orchestratorSource = fs.readFileSync(
    new URL("../intelligence/orchestrator/companionOrchestrator.js", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(gatewaySource, /communityRules|getCommunityIntelligenceRules|Community Intelligence rules/);
  assert.doesNotMatch(orchestratorSource, /communityRules|getCommunityIntelligenceRules/);
});

