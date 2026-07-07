import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  BUSINESS_RULE_CATEGORIES,
  getBusinessIntelligenceRules,
} from "../intelligence/business/businessRules.js";

test("Business Intelligence rules exist for healthier business operation guidance", () => {
  const rules = getBusinessIntelligenceRules();
  const text = rules.map((rule) => rule.rule).join(" ");

  assert.ok(rules.some((rule) => rule.category === BUSINESS_RULE_CATEGORIES.workloadAwareness));
  assert.ok(rules.some((rule) => rule.category === BUSINESS_RULE_CATEGORIES.scheduleHealth));
  assert.ok(rules.some((rule) => rule.category === BUSINESS_RULE_CATEGORIES.customerCommunicationContinuity));
  assert.ok(rules.some((rule) => rule.category === BUSINESS_RULE_CATEGORIES.proposalFollowUpGuidance));
  assert.ok(rules.some((rule) => rule.category === BUSINESS_RULE_CATEGORIES.revenueAwareness));
  assert.ok(rules.some((rule) => rule.category === BUSINESS_RULE_CATEGORIES.operationalOrganization));
  assert.ok(rules.some((rule) => rule.category === BUSINESS_RULE_CATEGORIES.serviceCapabilityGrowth));
  assert.ok(rules.some((rule) => rule.category === BUSINESS_RULE_CATEGORIES.businessContinuity));
  assert.match(text, /workload patterns|capacity pressure/i);
  assert.match(text, /schedule health/i);
  assert.match(text, /customer communication continuity/i);
  assert.match(text, /proposal follow-up guidance/i);
  assert.match(text, /high-level revenue awareness/i);
  assert.match(text, /service capability growth/i);
});

test("Business Intelligence rules include anti-automation boundaries", () => {
  const rules = getBusinessIntelligenceRules();
  const automationRules = rules.filter((rule) => rule.category === BUSINESS_RULE_CATEGORIES.automationBoundary);
  const text = automationRules.map((rule) => `${rule.id} ${rule.rule}`).join(" ");

  assert.match(text, /automatic business decisions/i);
  assert.match(text, /automatic pricing decisions|set prices|change prices/i);
  assert.match(text, /automatically schedule|reschedule|cancel appointments/i);
  assert.match(text, /automatically send customer messages/i);
  assert.match(text, /without professional action|commit a professional's time/i);
});

test("Business Intelligence rules reject legal, financial, and tax guarantees", () => {
  const rules = getBusinessIntelligenceRules();
  const guaranteeRules = rules.filter((rule) => rule.category === BUSINESS_RULE_CATEGORIES.guaranteeBoundary);
  const text = guaranteeRules.map((rule) => `${rule.id} ${rule.rule}`).join(" ");

  assert.match(text, /financial guarantees|revenue guarantees|profit guarantees/i);
  assert.match(text, /legal guarantees|legal conclusions|replace qualified legal advice/i);
  assert.match(text, /tax advice|tax guarantees|replace qualified tax professionals/i);
});

test("Business Intelligence rules do not allow automatic pricing behavior", () => {
  const pricingRule = getBusinessIntelligenceRules().find((rule) => rule.id === "no-automatic-pricing-decisions");

  assert.ok(pricingRule);
  assert.match(pricingRule.rule, /must never set prices/i);
  assert.match(pricingRule.rule, /automatic pricing decisions/i);
});

test("Business Intelligence rules do not allow automatic scheduling behavior", () => {
  const schedulingRule = getBusinessIntelligenceRules().find((rule) => rule.id === "no-automatic-scheduling");

  assert.ok(schedulingRule);
  assert.match(schedulingRule.rule, /must never automatically schedule visits/i);
  assert.match(schedulingRule.rule, /commit a professional's time/i);
});

test("Business Intelligence rules do not allow automatic customer messaging", () => {
  const messagingRule = getBusinessIntelligenceRules().find((rule) => rule.id === "no-automatic-customer-messaging");

  assert.ok(messagingRule);
  assert.match(messagingRule.rule, /must never automatically send customer messages/i);
  assert.match(messagingRule.rule, /relationship-impacting communication/i);
});

test("Business Intelligence rule helper returns immutable safe copies", () => {
  const firstRead = getBusinessIntelligenceRules();

  assert.throws(() => {
    firstRead[0].rule = "mutated";
  }, TypeError);

  const secondRead = getBusinessIntelligenceRules();
  assert.notEqual(secondRead[0].rule, "mutated");
});

test("Business Intelligence rules are not wired into Gateway or Orchestrator", () => {
  const gatewaySource = fs.readFileSync(new URL("../intelligence/gateway.js", import.meta.url), "utf8");
  const orchestratorSource = fs.readFileSync(
    new URL("../intelligence/orchestrator/companionOrchestrator.js", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(gatewaySource, /businessRules|getBusinessIntelligenceRules/);
  assert.doesNotMatch(orchestratorSource, /businessRules|getBusinessIntelligenceRules/);
});
