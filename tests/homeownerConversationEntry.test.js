import assert from "node:assert/strict";
import test from "node:test";

import { CONVERSATION_THREAD_TYPES } from "../src/utils/canonicalConversationMessaging.js";
import {
  HOMEOWNER_CONVERSATION_ENTRY_ACTIONS,
  getHomeownerConversationContext,
  groupHomeownerCanonicalConversations,
  resolveHomeownerConversationEntry,
  stageHomeownerCanonicalConversation,
} from "../src/utils/homeownerConversationEntry.js";

function request(overrides = {}) {
  return {
    id: 12,
    requestId: 12,
    title: "Repair front door",
    ...overrides,
  };
}

function canonicalConversation(overrides = {}) {
  return {
    id: 91,
    request_id: 12,
    conversation_id: 91,
    conversationId: 91,
    conversation_available: true,
    threadType: CONVERSATION_THREAD_TYPES.CANONICAL,
    conversation_type: CONVERSATION_THREAD_TYPES.CANONICAL,
    businessName: "Cape Door Repair",
    business_name: "Cape Door Repair",
    project_title: "Repair front door",
    status: "active",
    archived: false,
    canSendMessages: true,
    ...overrides,
  };
}

function createStorage(initial = {}) {
  const values = new Map(
    Object.entries(initial).map(([key, value]) => [key, String(value)])
  );

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    snapshot() {
      return Object.fromEntries(values);
    },
  };
}

test("zero canonical rows resolves to request details without a conversation ID", () => {
  const result = resolveHomeownerConversationEntry({
    request: request(),
    canonicalConversations: [],
  });

  assert.equal(result.action, HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.REQUEST);
  assert.equal(result.requestId, 12);
  assert.equal(result.conversationId, null);
  assert.equal(result.matchingConversationCount, 0);
});

test("one canonical row resolves the exact conversation and preserves its business name", () => {
  const conversation = canonicalConversation();
  const result = resolveHomeownerConversationEntry({
    request: request(),
    canonicalConversations: [conversation],
  });

  assert.equal(
    result.action,
    HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.CONVERSATION
  );
  assert.equal(result.requestId, 12);
  assert.equal(result.conversationId, 91);
  assert.notEqual(result.requestId, result.conversationId);
  assert.equal(result.conversation, conversation);
  assert.equal(result.conversation.businessName, "Cape Door Repair");
});

test("multiple canonical rows for one request resolve to the inbox without choosing one", () => {
  const result = resolveHomeownerConversationEntry({
    request: request(),
    canonicalConversations: [
      canonicalConversation(),
      canonicalConversation({
        id: 92,
        conversation_id: 92,
        conversationId: 92,
        businessName: "Second Door Company",
      }),
    ],
  });

  assert.equal(result.action, HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.INBOX);
  assert.equal(result.conversationId, null);
  assert.equal(result.conversation, null);
  assert.equal(result.matchingConversationCount, 2);
});

test("missing, zero, negative, decimal, and string conversation IDs fail closed", () => {
  const invalidIds = [undefined, 0, -91, 91.5, "91"];

  invalidIds.forEach((conversationId) => {
    const result = resolveHomeownerConversationEntry({
      request: request(),
      canonicalConversations: [
        canonicalConversation({
          id: conversationId,
          conversation_id: conversationId,
          conversationId,
        }),
      ],
    });

    assert.equal(result.action, HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.REQUEST);
    assert.equal(result.conversationId, null);
  });
});

test("missing request_id and rows for another request are ignored", () => {
  const result = resolveHomeownerConversationEntry({
    request: request(),
    canonicalConversations: [
      canonicalConversation({ request_id: undefined }),
      canonicalConversation({ request_id: 13 }),
    ],
  });

  assert.equal(result.action, HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.REQUEST);
  assert.equal(result.matchingConversationCount, 0);
});

test("invalid request IDs never become conversation IDs", () => {
  const result = resolveHomeownerConversationEntry({
    request: request({ id: "12", requestId: "12" }),
    canonicalConversations: [canonicalConversation()],
  });

  assert.equal(result.action, HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.REQUEST);
  assert.equal(result.requestId, null);
  assert.equal(result.conversationId, null);
  assert.equal(result.reason, "invalid_request_id");
});

test("one valid row plus malformed rows still resolves exact-one", () => {
  const result = resolveHomeownerConversationEntry({
    request: request(),
    canonicalConversations: [
      canonicalConversation({ conversation_id: 0, conversationId: 0 }),
      null,
      canonicalConversation(),
      canonicalConversation({ request_id: 14 }),
    ],
  });

  assert.equal(
    result.action,
    HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.CONVERSATION
  );
  assert.equal(result.conversationId, 91);
  assert.equal(result.matchingConversationCount, 1);
});

test("duplicate identical rows do not fabricate multiple relationships", () => {
  const conversation = canonicalConversation();
  const result = resolveHomeownerConversationEntry({
    request: request(),
    canonicalConversations: [conversation, { ...conversation }],
  });

  assert.equal(
    result.action,
    HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.CONVERSATION
  );
  assert.equal(result.matchingConversationCount, 1);
});

test("grouping keeps different requests and conversation IDs independent", () => {
  const grouped = groupHomeownerCanonicalConversations([
    canonicalConversation(),
    canonicalConversation({
      id: 92,
      conversation_id: 92,
      conversationId: 92,
    }),
    canonicalConversation({
      id: 101,
      request_id: 13,
      conversation_id: 101,
      conversationId: 101,
    }),
  ]);

  assert.deepEqual(
    grouped.get(12).map((row) => row.conversation_id),
    [91, 92]
  );
  assert.deepEqual(
    grouped.get(13).map((row) => row.conversation_id),
    [101]
  );
});

test("canonical staging keeps request and conversation identity separate", () => {
  const decision = resolveHomeownerConversationEntry({
    request: request(),
    canonicalConversations: [canonicalConversation()],
  });
  const storage = createStorage({
    selectedMessageReceiverId: "777",
    conversationBusinessName: "Stale Business",
    selectedContractor: '{"id":777}',
  });
  const context = stageHomeownerCanonicalConversation(
    decision,
    request(),
    storage
  );
  const selectedConversation = JSON.parse(
    storage.getItem("selectedConversation")
  );

  assert.equal(context.requestId, 12);
  assert.equal(context.conversationId, 91);
  assert.equal(storage.getItem("selectedQuoteRequestId"), "12");
  assert.equal(storage.getItem("activeConversationId"), "91");
  assert.equal(storage.getItem("activeConversationName"), "Cape Door Repair");
  assert.equal(storage.getItem("conversationReturnPage"), "home");
  assert.equal(storage.getItem("returnPage"), "home");
  assert.equal(
    storage.getItem("meetroConversationType"),
    CONVERSATION_THREAD_TYPES.CANONICAL
  );
  assert.notEqual(storage.getItem("meetroConversationType"), "standard");
  assert.equal(selectedConversation.request_id, 12);
  assert.equal(selectedConversation.conversation_id, 91);
  assert.equal(selectedConversation.businessName, "Cape Door Repair");
  assert.equal(storage.getItem("selectedMessageReceiverId"), null);
  assert.equal(storage.getItem("conversationBusinessName"), null);
  assert.equal(storage.getItem("selectedContractor"), null);
});

test("canonical staging does not expose internal relationship metadata", () => {
  const conversation = canonicalConversation({
    relationship_id: 501,
    contractor_id: 601,
    participant_id: 701,
    ranking: 1,
  });
  const decision = resolveHomeownerConversationEntry({
    request: request(),
    canonicalConversations: [conversation],
  });
  const context = getHomeownerConversationContext(decision);

  assert.ok(context);
  assert.equal("relationship_id" in context.threadPayload, false);
  assert.equal("contractor_id" in context.threadPayload, false);
  assert.equal("participant_id" in context.threadPayload, false);
  assert.equal("ranking" in context.threadPayload, false);
});

test("missing canonical display metadata uses a neutral validated fallback", () => {
  const decision = resolveHomeownerConversationEntry({
    request: request(),
    canonicalConversations: [
      canonicalConversation({ businessName: "", business_name: "" }),
    ],
  });
  const context = getHomeownerConversationContext(decision);

  assert.equal(context.activeConversationName, "Conversation");
  assert.notEqual(context.activeConversationName, "Professional");
});

test("zero and multiple decisions do not mutate conversation storage", () => {
  const storage = createStorage({ activeConversationId: "800" });
  const initial = storage.snapshot();
  const zero = resolveHomeownerConversationEntry({
    request: request(),
    canonicalConversations: [],
  });
  const multiple = resolveHomeownerConversationEntry({
    request: request(),
    canonicalConversations: [
      canonicalConversation(),
      canonicalConversation({
        conversation_id: 92,
        conversationId: 92,
      }),
    ],
  });

  assert.equal(stageHomeownerCanonicalConversation(zero, request(), storage), null);
  assert.equal(
    stageHomeownerCanonicalConversation(multiple, request(), storage),
    null
  );
  assert.deepEqual(storage.snapshot(), initial);
});

test("later canonical selection replaces stale prior context", () => {
  const storage = createStorage();
  const firstDecision = resolveHomeownerConversationEntry({
    request: request(),
    canonicalConversations: [canonicalConversation()],
  });
  const secondRequest = request({ id: 13, requestId: 13, title: "Paint room" });
  const secondDecision = resolveHomeownerConversationEntry({
    request: secondRequest,
    canonicalConversations: [
      canonicalConversation({
        id: 101,
        request_id: 13,
        conversation_id: 101,
        conversationId: 101,
        businessName: "Cape Painting",
        business_name: "Cape Painting",
      }),
    ],
  });

  stageHomeownerCanonicalConversation(firstDecision, request(), storage);
  stageHomeownerCanonicalConversation(secondDecision, secondRequest, storage);

  assert.equal(storage.getItem("selectedHomeownerRequestId"), "13");
  assert.equal(storage.getItem("activeConversationId"), "101");
  assert.equal(storage.getItem("activeConversationName"), "Cape Painting");
});

test("malformed decisions fail closed without generating an identity", () => {
  const storage = createStorage();
  const context = stageHomeownerCanonicalConversation(
    {
      action: HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.CONVERSATION,
      requestId: 12,
      conversationId: 12,
      conversation: canonicalConversation(),
    },
    request(),
    storage
  );

  assert.equal(context, null);
  assert.deepEqual(storage.snapshot(), {});
});
