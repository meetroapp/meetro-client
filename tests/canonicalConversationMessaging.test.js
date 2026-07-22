import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CANONICAL_MESSAGE_MAX_LENGTH,
  CONVERSATION_THREAD_TYPES,
  buildCanonicalMessagePayload,
  getOpportunityThreadIdentity,
  normalizeCanonicalConversationDetail,
  normalizeCanonicalConversationId,
  normalizeCanonicalMessageCollection,
  validateCanonicalMessageText,
} from "../src/utils/canonicalConversationMessaging.js";
import { normalizeRequestConversations } from "../src/utils/requestCommunication.js";

const inboxSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);
const threadSource = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);

const canonicalLoadBlock = threadSource.slice(
  threadSource.indexOf("const loadMessages = async () =>"),
  threadSource.indexOf("const selectedQuoteRequestId =", threadSource.indexOf("const loadMessages = async () =>"))
);
const canonicalSendBlock = threadSource.slice(
  threadSource.indexOf("const sendCanonicalMessage = async"),
  threadSource.indexOf("const sendMessage =", threadSource.indexOf("const sendCanonicalMessage = async"))
);

function opportunity(overrides = {}) {
  return {
    request_id: 71,
    title: "Repair entry door",
    status: "open",
    ...overrides,
  };
}

function detail(overrides = {}) {
  return {
    success: true,
    conversation: { id: 91, status: "active" },
    participants: {
      homeowner: { id: 7, displayName: "Jordan" },
      business: { id: 9, name: "Door Pro" },
    },
    relationship: { id: 21, requestId: 71, title: "Repair entry door" },
    permissions: { canSendMessages: true },
    ...overrides,
  };
}

function message(id, isViewer, text) {
  return {
    id,
    sender: { id: isViewer ? 9 : 7, isViewer },
    recipient: { id: isViewer ? 7 : 9 },
    content: { text, imageUrl: null, type: "text" },
    workflow: { type: null, status: null, payload: {} },
    createdAt: "2026-07-21T12:00:00.000Z",
  };
}

test("valid opportunity conversation_id projects a canonical thread", () => {
  const [record] = normalizeRequestConversations(
    { opportunities: [opportunity({ conversation_id: 91 })] },
    "business"
  );

  assert.equal(record.request_id, 71);
  assert.equal(record.conversationId, 91);
  assert.equal(record.threadType, CONVERSATION_THREAD_TYPES.CANONICAL);
  assert.equal(record.conversation_type, CONVERSATION_THREAD_TYPES.CANONICAL);
});

test("missing opportunity conversation_id never falls back to request identity", () => {
  const identity = getOpportunityThreadIdentity(opportunity());
  const [record] = normalizeRequestConversations(
    { opportunities: [opportunity()] },
    "business"
  );

  assert.equal(identity.requestId, 71);
  assert.equal(identity.conversationId, null);
  assert.equal(record.conversationId, null);
  assert.equal(record.threadType, CONVERSATION_THREAD_TYPES.REQUEST_OPPORTUNITY);
});

test("canonical conversation IDs fail closed unless they are positive safe integers", () => {
  assert.equal(normalizeCanonicalConversationId(91), 91);

  for (const invalid of [
    null,
    undefined,
    0,
    -1,
    1.5,
    "91",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.equal(normalizeCanonicalConversationId(invalid), null);
  }
});

test("canonical detail accepts only matching authoritative identity", () => {
  assert.equal(normalizeCanonicalConversationDetail(detail(), 91)?.conversationId, 91);
  assert.equal(normalizeCanonicalConversationDetail(detail(), 92), null);
  assert.equal(
    normalizeCanonicalConversationDetail(
      detail({ conversation: { id: "91", status: "active" } }),
      91
    ),
    null
  );
});

test("canSendMessages is enabled only by the exact true permission", () => {
  assert.equal(normalizeCanonicalConversationDetail(detail(), 91).canSendMessages, true);
  assert.equal(
    normalizeCanonicalConversationDetail(
      detail({ permissions: { canSendMessages: false } }),
      91
    ).canSendMessages,
    false
  );
  assert.equal(
    normalizeCanonicalConversationDetail(detail({ permissions: {} }), 91)
      .canSendMessages,
    false
  );
  assert.equal(
    normalizeCanonicalConversationDetail(
      detail({ permissions: { canSendMessages: "true" } }),
      91
    ).canSendMessages,
    false
  );
});

test("canonical message collection preserves backend identity and viewer direction", () => {
  const messages = normalizeCanonicalMessageCollection(
    {
      success: true,
      conversationId: 91,
      messages: [message(201, true, "Hello"), message(202, false, "Hi")],
    },
    91,
    "business"
  );

  assert.deepEqual(
    messages.map(({ backendId, sender, senderRole, text, status }) => ({
      backendId,
      sender,
      senderRole,
      text,
      status,
    })),
    [
      { backendId: 201, sender: "me", senderRole: "business", text: "Hello", status: "delivered" },
      { backendId: 202, sender: "them", senderRole: "homeowner", text: "Hi", status: "delivered" },
    ]
  );
});

test("canonical message collection rejects mismatched or malformed responses", () => {
  assert.equal(
    normalizeCanonicalMessageCollection(
      { success: true, conversationId: 92, messages: [] },
      91,
      "business"
    ),
    null
  );
  assert.equal(
    normalizeCanonicalMessageCollection(
      { success: true, conversationId: 91, messages: [{}] },
      91,
      "business"
    ),
    null
  );
});

test("canonical text validation mirrors the backend contract", () => {
  assert.deepEqual(validateCanonicalMessageText("  Hello\nthere  "), {
    valid: true,
    code: "",
    text: "Hello\nthere",
  });
  assert.equal(validateCanonicalMessageText("   ").code, "MESSAGE_TEXT_REQUIRED");
  assert.equal(
    validateCanonicalMessageText("x".repeat(CANONICAL_MESSAGE_MAX_LENGTH + 1)).code,
    "MESSAGE_TEXT_TOO_LONG"
  );
});

test("canonical send body contains message_text and no client-owned identity", () => {
  assert.deepEqual(buildCanonicalMessagePayload("Hello"), {
    message_text: "Hello",
  });
  assert.deepEqual(Object.keys(buildCanonicalMessagePayload("Hello")), ["message_text"]);
});

test("canonical load uses detail and message endpoints before legacy identity is read", () => {
  assert.match(canonicalLoadBlock, /`\/conversations\/\$\{canonicalConversationId\}`/);
  assert.match(canonicalLoadBlock, /`\/conversations\/\$\{canonicalConversationId\}\/messages`/);
  assert.doesNotMatch(canonicalLoadBlock, /selectedQuoteRequestId|`\/messages\//);
});

test("canonical send uses only the conversation message endpoint", () => {
  assert.match(canonicalSendBlock, /method: "POST"/);
  assert.match(canonicalSendBlock, /`\/conversations\/\$\{canonicalConversationId\}\/messages`/);
  assert.match(canonicalSendBlock, /buildCanonicalMessagePayload\(validation\.text\)/);
  assert.doesNotMatch(canonicalSendBlock, /quote_request_id|receiver_id|authFetch\(\s*"\/messages"/);
});

test("canonical composer and local persistence fail closed", () => {
  assert.match(
    threadSource,
    /canonicalConversationState\.canSendMessages !== true/
  );
  assert.match(
    threadSource,
    /useEffect\(\(\) => \{\s*if \(isCanonicalThread\) return;\s*if \(messages\.length > 0\)/
  );
  assert.match(threadSource, /conversationOpportunityMessagingUnavailable/);
  assert.match(threadSource, /canonicalConversationState\.phase === "error"/);
});

test("legacy quote messaging remains isolated and available", () => {
  assert.match(threadSource, /`\/messages\/\$\{selectedQuoteRequestId\}`/);
  assert.match(threadSource, /authFetch\(\s*"\/messages"/);
  assert.match(threadSource, /quote_request_id: Number\(selectedQuoteRequestId\)/);
});

test("inbox stages explicit request and canonical identities separately", () => {
  assert.match(inboxSource, /requestId: isOpportunityThread \? requestId/);
  assert.match(
    inboxSource,
    /conversationId: isOpportunityThread\s*\? opportunityIdentity\.conversationId/
  );
  assert.match(inboxSource, /safeSetStorage\("selectedQuoteRequestId", requestId\)/);
  assert.match(inboxSource, /`request-opportunity-\$\{requestId\}`/);
  assert.match(inboxSource, /safeSetStorage\("activeConversationId", activeThreadId\)/);
});
