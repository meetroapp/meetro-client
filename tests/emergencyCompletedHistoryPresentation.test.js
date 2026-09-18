import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/pages/BusinessLeads.jsx", import.meta.url),
  "utf8"
);

test("completed Emergency conversations are separated from active presentation", () => {
  assert.match(
    source,
    /const completedEmergencyConversations =[\s\S]*?\["completed", "resolved"\]\.includes/
  );
  assert.match(
    source,
    /const currentEmergencyConversations =[\s\S]*?!\["completed", "resolved"\]\.includes/
  );

  assert.match(
    source,
    /currentEmergencyConversations\.length > 0[\s\S]*?professionalEmergencyActive/
  );
  assert.match(
    source,
    /currentEmergencyConversations\.map[\s\S]*?messagesActiveEmergency/
  );

  assert.doesNotMatch(
    source,
    /activeEmergencyConversations\.map/
  );
});

test("completed Emergency cards use history presentation without changing canonical routing", () => {
  assert.match(
    source,
    /completedEmergencyConversations\.length > 0[\s\S]*?messageLabelCompleted/
  );
  assert.match(
    source,
    /completedEmergencyConversations\.map[\s\S]*?completed-emergency-/
  );
  assert.match(
    source,
    /completedEmergencyConversations\.map[\s\S]*?CONVERSATION_ACTION_STAGE\.HISTORY/
  );
  assert.match(
    source,
    /completedEmergencyConversations\.map[\s\S]*?openCanonicalEmergencyConversation\(conversation\)/
  );
});

test("active Emergency cards retain active conversation authority only", () => {
  const start = source.indexOf(
    "{currentEmergencyConversations.length > 0"
  );
  const end = source.indexOf(
    "{completedEmergencyConversations.length > 0",
    start
  );
  const activeBlock = source.slice(start, end);

  assert.ok(start >= 0);
  assert.ok(end > start);
  assert.match(
    activeBlock,
    /CONVERSATION_ACTION_STAGE\.ACTIVE/
  );
  assert.doesNotMatch(
    activeBlock,
    /CONVERSATION_ACTION_STAGE\.HISTORY/
  );
});

test("presentation split adds no Emergency mutation authority", () => {
  const start = source.indexOf(
    "const completedEmergencyConversations"
  );
  const end = source.indexOf(
    "if (!isProfessional)",
    start
  );
  const projection = source.slice(start, end);

  assert.ok(start >= 0);
  assert.ok(end > start);
  assert.doesNotMatch(
    projection,
    /transitionEmergencyDispatch|respondToEmergencyOpportunity|authFetch|localStorage\.setItem/
  );
});
