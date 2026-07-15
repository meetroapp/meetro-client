import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const messagesSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);
const conversationThreadSource = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);
const visualConstitutionSource = readFileSync(
  new URL(
    "../docs/KnowledgeBase/MEETRO_COMMUNITY_VISUAL_CONSTITUTION.md",
    import.meta.url
  ),
  "utf8"
);

test("Communication Center adopts the shared Meetro Community visual constitution classes", () => {
  assert.match(messagesSource, /meetro-wide-page meetro-visual-page messages-inbox-page/);
  assert.match(messagesSource, /meetro-visual-surface/);
  assert.match(messagesSource, /meetro-visual-empty-state/);
  assert.match(conversationThreadSource, /conversation-thread-page chat-thread-page meetro-visual-page/);
});

test("Communication Center uses approved warm visual tokens instead of legacy cold-only styling", () => {
  const expectedTokens = [
    "--meetro-gradient-community-page",
    "--meetro-gradient-community-action",
    "--meetro-surface-paper",
    "--meetro-surface-warm",
    "--meetro-surface-sage",
    "--meetro-color-forest",
    "--meetro-color-wood",
    "--meetro-color-muted",
    "--meetro-color-line",
    "--meetro-shadow-soft",
  ];

  const combinedSource = `${messagesSource}\n${conversationThreadSource}`;

  for (const token of expectedTokens) {
    assert.match(combinedSource, new RegExp(token.replace(/-/g, "\\-")));
  }
});

test("Communication Center rows and workspace context express relationship-first understanding", () => {
  assert.match(messagesSource, /getCommunicationIntent\(conversation\)\.trim\(\)/);
  assert.match(messagesSource, /getCommunicationIntent\(primaryConversation, relationship\)\.trim\(\)/);
  assert.match(messagesSource, /messagesContextAria/);
  assert.match(messagesSource, /messagesRelationship/);
  assert.match(messagesSource, /messagesCommunication/);
  assert.match(messagesSource, /messagesRelatedWork/);
  assert.match(messagesSource, /messagesMemory/);
});

test("Communication Center preserves live conversation routing and does not introduce role switching", () => {
  assert.match(messagesSource, /function openConversationRow\(summaryOrRecord = \{\}, options = \{\}\)/);
  assert.match(messagesSource, /setPage\("conversationThread"\)/);
  assert.match(messagesSource, /searchedVisibleQuotes\.map\(\(quote\) => renderConversationRow\(quote\)\)/);
  assert.match(messagesSource, /if \(section === "hiring"\) return isHiringConversation\(quote\)/);
  assert.match(messagesSource, /if \(section === "emergency"\) return isEmergencyConversationType\(quote\)/);
  assert.doesNotMatch(messagesSource, /setActiveAccountMode\("personal"\)|setActiveAccountMode\("business"\)/);
});

test("Visual Constitution documents the Communication Center wonder pass", () => {
  assert.match(visualConstitutionSource, /Communication Center Wonder Pass/);
  assert.match(visualConstitutionSource, /How do we understand each other\?/);
  assert.match(visualConstitutionSource, /Community begins relationships\./);
  assert.match(visualConstitutionSource, /No routes changed\./);
});
