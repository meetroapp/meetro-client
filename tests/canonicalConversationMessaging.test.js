import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CANONICAL_MESSAGE_MAX_LENGTH,
  CONVERSATION_THREAD_TYPES,
  buildCanonicalConversationRoute,
  buildCanonicalMessagePayload,
  getOpportunityThreadIdentity,
  normalizeCanonicalConversationDetail,
  normalizeCanonicalConversationId,
  normalizeCanonicalMessageCollection,
  parseCanonicalConversationRoute,
  validateCanonicalMessageText,
} from "../src/utils/canonicalConversationMessaging.js";
import {
  findCanonicalEmergencyConversation,
  normalizeRequestConversations,
} from "../src/utils/requestCommunication.js";

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

function homeownerConversation(overrides = {}) {
  return {
    id: 91,
    conversation_id: 91,
    request_id: 71,
    request_title: "Repair entry door",
    relationship: {
      title: "Repair entry door",
      stage: "conversation",
    },
    display: {
      name: "Door Pro",
      image_url: "https://example.test/door-pro.jpg",
      category: "handyman",
    },
    status: {
      value: "active",
      active: true,
      archived: false,
      requires_attention: false,
    },
    last_activity: "2026-07-22T12:00:00.000Z",
    last_message_preview: "I can help with this repair.",
    unread_count: 1,
    conversation_available: true,
    permissions: { canSendMessages: true },
    ...overrides,
  };
}

function professionalConversation(overrides = {}) {
  return {
    id: 94,
    relationship: {
      id: 24,
      title: "Repair entry door",
      stage: "conversation",
    },
    display: {
      name: "Jordan",
      image_url: "",
      category: "",
    },
    status: {
      value: "active",
      active: true,
      archived: false,
      requires_attention: false,
    },
    last_activity: "2026-07-22T12:00:00.000Z",
    last_message_preview: "Can you visit tomorrow?",
    unread_count: 0,
    conversation_available: true,
    ...overrides,
  };
}

function emergencyConversation(overrides = {}) {
  return {
    id: 95,
    conversation_id: 95,
    request_id: null,
    emergency_request_id: 81,
    request_title: "Electrical Emergency",
    relationship: {
      title: "Electrical Emergency",
      stage: "conversation",
    },
    source: {
      type: "emergency",
      id: 81,
      title: "Electrical Emergency",
      serviceDomain: "home_services",
      serviceSpecialty: "electrical",
      isEmergency: true,
    },
    display: {
      name: "Jordan",
      image_url: "",
      category: "",
    },
    status: {
      value: "active",
      active: true,
      archived: false,
      requires_attention: false,
    },
    workflow: {
      status: "assigned",
      allowedActions: ["mark_en_route"],
    },
    permissions: {
      canSendMessages: true,
      canManageWorkflow: true,
      canMarkEnRoute: true,
    },
    conversation_available: true,
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

test("professional canonical list keeps standard conversations without a request id", () => {
  const [record] = normalizeRequestConversations(
    { conversations: [professionalConversation()] },
    "business"
  );

  assert.equal(record.request_id, null);
  assert.equal(record.conversationId, 94);
  assert.equal(record.threadType, CONVERSATION_THREAD_TYPES.CANONICAL);
  assert.equal(record.conversation_type, CONVERSATION_THREAD_TYPES.CANONICAL);
  assert.equal(record.customerName, "Jordan");
});

test("homeowner canonical list projects one authoritative conversation thread", () => {
  const [record] = normalizeRequestConversations(
    { conversations: [homeownerConversation()] },
    "personal"
  );

  assert.equal(record.id, 91);
  assert.equal(record.request_id, 71);
  assert.equal(record.conversation_id, 91);
  assert.equal(record.conversationId, 91);
  assert.equal(record.threadType, CONVERSATION_THREAD_TYPES.CANONICAL);
  assert.equal(record.conversation_type, CONVERSATION_THREAD_TYPES.CANONICAL);
  assert.equal(record.businessName, "Door Pro");
  assert.equal(record.project_title, "Repair entry door");
  assert.equal(record.unread, true);
  assert.equal(record.canSendMessages, true);
});

test("homeowner list preserves multiple conversations per request and across requests", () => {
  const records = normalizeRequestConversations(
    {
      conversations: [
        homeownerConversation(),
        homeownerConversation({
          id: 92,
          conversation_id: 92,
          display: { name: "Second Door Pro" },
        }),
        homeownerConversation({
          id: 93,
          conversation_id: 93,
          request_id: 72,
          request_title: "Repair window",
          display: { name: "Window Pro" },
        }),
      ],
    },
    "personal"
  );

  assert.deepEqual(
    records.map(({ conversationId, request_id }) => ({ conversationId, request_id })),
    [
      { conversationId: 91, request_id: 71 },
      { conversationId: 92, request_id: 71 },
      { conversationId: 93, request_id: 72 },
    ]
  );
});

test("homeowner request-only records do not fabricate conversation threads", () => {
  assert.deepEqual(
    normalizeRequestConversations({ conversations: [] }, "personal"),
    []
  );
  assert.equal(
    normalizeRequestConversations(
      { posts: [{ id: 71, title: "Repair entry door" }] },
      "personal"
    ),
    null
  );
  assert.deepEqual(
    normalizeRequestConversations(
      {
        conversations: [
          homeownerConversation({ id: null, conversation_id: null }),
          homeownerConversation({ request_id: null }),
        ],
      },
      "personal"
    ),
    []
  );
});

test("homeowner normalization drops internal identity fields", () => {
  const [record] = normalizeRequestConversations(
    {
      conversations: [homeownerConversation({
        relationship_id: 51,
        contractor_id: 80,
        participant_id: 9,
        homeowner_id: 7,
        relationship: { id: 51, title: "Repair entry door" },
      })],
    },
    "personal"
  );

  for (const privateField of [
    "relationship",
    "relationship_id",
    "contractor_id",
    "participant_id",
    "homeowner_id",
  ]) {
    assert.equal(Object.hasOwn(record, privateField), false);
  }
});

test("homeowner canonical identity survives authoritative list refresh", () => {
  const payload = { conversations: [homeownerConversation()] };
  const first = normalizeRequestConversations(payload, "personal");
  const refreshed = normalizeRequestConversations(payload, "personal");

  assert.equal(first[0].conversationId, 91);
  assert.equal(refreshed[0].conversationId, 91);
  assert.equal(refreshed[0].request_id, 71);
});

test("opportunity identity never falls back to request identity", () => {
  const identity = getOpportunityThreadIdentity(opportunity());

  assert.equal(identity.requestId, 71);
  assert.equal(identity.conversationId, null);
  assert.equal(
    identity.threadType,
    CONVERSATION_THREAD_TYPES.REQUEST_OPPORTUNITY
  );
});

test("Emergency list projection preserves canonical identity without private location", () => {
  const [record] = normalizeRequestConversations(
    {
      conversations: [
        emergencyConversation({
          location: {
            locationText: "Must not be projected from a list",
            accessNotes: "Private",
          },
        }),
      ],
    },
    "business"
  );

  assert.equal(record.conversationId, 95);
  assert.equal(record.emergencyRequestId, 81);
  assert.equal(record.sourceType, "emergency");
  assert.equal(record.conversation_type, "emergency");
  assert.deepEqual(record.workflow.allowedActions, ["mark_en_route"]);
  assert.equal(record.permissions.canManageWorkflow, true);
  assert.equal(Object.hasOwn(record, "location"), false);
  assert.equal(
    findCanonicalEmergencyConversation([record], 81),
    record
  );
});

test("Emergency request identity cannot be promoted to conversation identity", () => {
  const [record] = normalizeRequestConversations(
    {
      conversations: [
        emergencyConversation({
          id: 195,
          conversation_id: 195,
          emergency_request_id: 8,
          source: {
            type: "emergency",
            id: 8,
            title: "Emergency request",
            isEmergency: true,
          },
        }),
      ],
    },
    "business"
  );

  assert.equal(record.conversationId, 195);
  assert.equal(record.emergencyRequestId, 8);
  assert.equal(record.request_id, null);
  assert.notEqual(record.emergencyRequestId, record.conversationId);
});

test("canonical Emergency routes survive reload without browser storage identity", () => {
  const route = buildCanonicalConversationRoute(95, "messagesInbox");
  const parsed = parseCanonicalConversationRoute(`#${route}`);

  assert.equal(
    route,
    "conversationThread?conversationId=95&returnPage=messagesInbox"
  );
  assert.deepEqual(parsed, {
    page: "conversationThread",
    conversationId: 95,
    returnPage: "messagesInbox",
    shell: "",
    valid: true,
  });
});

test("canonical conversation IDs fail closed unless they are positive safe integers", () => {
  assert.equal(normalizeCanonicalConversationId(91), 91);
  assert.equal(normalizeCanonicalConversationId("91"), 91);

  for (const invalid of [
    null,
    undefined,
    0,
    -1,
    1.5,
    "",
    " ",
    "91.0",
    "1e3",
    "00195",
    "abc91",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
    { id: 91 },
    [91],
  ]) {
    assert.equal(normalizeCanonicalConversationId(invalid), null);
  }
});

test("canonical conversation IDs do not parse decimal or symbolic text", () => {
  for (const invalid of ["195.0", "1e3", "-195", "0", "abc195", "195abc", "195 ", " 195"]) {
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
    )?.conversationId,
    91
  );
});

test("Emergency detail accepts backend workflow and post-selection location", () => {
  const normalized = normalizeCanonicalConversationDetail(
    detail({
      conversation: {
        id: 91,
        type: "emergency",
        status: "active",
      },
      relationship: {
        id: 21,
        emergencyRequestId: 81,
        title: "Electrical Emergency",
      },
      workflow: {
        status: "professional_arrived",
        assignedAt: "2026-07-22T12:00:00.000Z",
        enRouteAt: "2026-07-22T12:05:00.000Z",
        arrivedAt: "2026-07-22T12:20:00.000Z",
        workStartedAt: null,
        completedAt: null,
        allowedActions: ["start_work"],
      },
      permissions: {
        canRead: true,
        canSendMessages: true,
        canManageWorkflow: true,
        canStartWork: true,
      },
      location: {
        locationText: "101 Test Ave",
        unitNumber: "Unit 2",
        accessNotes: "Call at gate",
      },
    }),
    91
  );

  assert.equal(normalized.type, "emergency");
  assert.equal(normalized.emergencyRequestId, 81);
  assert.equal(normalized.workflow.status, "professional_arrived");
  assert.deepEqual(normalized.workflow.allowedActions, ["start_work"]);
  assert.equal(normalized.permissions.canStartWork, true);
  assert.deepEqual(normalized.location, {
    locationText: "101 Test Ave",
    unitNumber: "Unit 2",
    accessNotes: "Call at gate",
  });
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

test("professional canonical message renders once for the homeowner", () => {
  const messages = normalizeCanonicalMessageCollection(
    {
      success: true,
      conversationId: 91,
      messages: [message(202, false, "I can help with this repair.")],
    },
    91,
    "homeowner"
  );

  assert.equal(messages.length, 1);
  assert.equal(messages[0].senderRole, "business");
  assert.equal(messages[0].text, "I can help with this repair.");
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
