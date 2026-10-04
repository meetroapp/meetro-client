import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/pages/BusinessLeads.jsx", import.meta.url),
  "utf8"
);

test("Business Leads contains only distributable Emergency opportunities", () => {
  for (const removed of [
    "activeEmergencyConversations",
    "completedEmergencyConversations",
    "currentEmergencyConversations",
    "fetchCanonicalConversations",
    "openCanonicalEmergencyConversation",
    "openCanonicalEmergencyEvaluation",
    "Open Evaluation",
    "completed-emergency-",
  ]) {
    assert.equal(source.includes(removed), false, `obsolete Emergency Leads source remains: ${removed}`);
  }

  assert.match(source, /listProfessionalEmergencyOpportunities\(\{[\s\S]*?setPage/);
  assert.match(source, /respondToEmergencyOpportunity\(requestId/);
  assert.match(source, /emergencyOpportunities\.map/);
});

test("ordinary opportunity conversation entry and filtering remain available", () => {
  assert.match(source, /requestProfessionalOpportunities\(\{/);
  assert.match(source, /function openOpportunityConversation\(opportunity\)/);
  assert.match(source, /stageBusinessLeadConversation\(opportunity\)/);
  assert.match(source, /getCanonicalConversationActionTarget/);
  assert.match(source, /matchesOpportunityFilter/);
  assert.match(source, /data-lead-request-id/);
  assert.match(source, /data-emergency-request-id/);
});

test("Business Leads does not own selected Emergency lifecycle mutation", () => {
  assert.doesNotMatch(
    source,
    /transitionEmergencyDispatch|transitionEmergencyStatus|EMERGENCY_DISPATCH_ACTIONS|START_WORK|COMPLETE_WORK/
  );
});
