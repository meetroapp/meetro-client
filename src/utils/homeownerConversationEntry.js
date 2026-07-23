import {
  CONVERSATION_THREAD_TYPES,
  normalizeCanonicalConversationId,
} from "./canonicalConversationMessaging.js";

export const HOMEOWNER_CONVERSATION_ENTRY_ACTIONS = Object.freeze({
  REQUEST: "request",
  CONVERSATION: "conversation",
  INBOX: "inbox",
});

export const HOMEOWNER_CONVERSATION_RETURN_PAGE = "home";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getCanonicalConversationIdentity(conversation = {}) {
  const requestId = normalizeCanonicalConversationId(
    conversation.request_id ?? conversation.requestId
  );
  const conversationId = normalizeCanonicalConversationId(
    conversation.conversation_id ?? conversation.conversationId
  );
  const canonicalType = CONVERSATION_THREAD_TYPES.CANONICAL;

  if (
    !requestId ||
    !conversationId ||
    conversation.conversation_available === false ||
    conversation.threadType !== canonicalType ||
    conversation.conversation_type !== canonicalType
  ) {
    return null;
  }

  return { requestId, conversationId };
}

export function groupHomeownerCanonicalConversations(
  canonicalConversations = []
) {
  const grouped = new Map();

  if (!Array.isArray(canonicalConversations)) return grouped;

  canonicalConversations.forEach((conversation) => {
    if (!conversation || typeof conversation !== "object") return;

    const identity = getCanonicalConversationIdentity(conversation);
    if (!identity) return;

    const requestRows = grouped.get(identity.requestId) || [];
    const isDuplicate = requestRows.some(
      (row) =>
        getCanonicalConversationIdentity(row)?.conversationId ===
        identity.conversationId
    );

    if (!isDuplicate) {
      grouped.set(identity.requestId, [...requestRows, conversation]);
    }
  });

  return grouped;
}

export function resolveHomeownerConversationEntry({
  request = {},
  canonicalConversations = [],
} = {}) {
  const requestId = normalizeCanonicalConversationId(
    request.requestId ?? request.id
  );

  if (!requestId) {
    return {
      action: HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.REQUEST,
      requestId: null,
      conversationId: null,
      conversation: null,
      matchingConversationCount: 0,
      reason: "invalid_request_id",
    };
  }

  const matchingConversations =
    groupHomeownerCanonicalConversations(canonicalConversations).get(requestId) ||
    [];

  if (matchingConversations.length === 0) {
    return {
      action: HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.REQUEST,
      requestId,
      conversationId: null,
      conversation: null,
      matchingConversationCount: 0,
      reason: "no_canonical_conversation",
    };
  }

  if (matchingConversations.length > 1) {
    return {
      action: HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.INBOX,
      requestId,
      conversationId: null,
      conversation: null,
      matchingConversationCount: matchingConversations.length,
      reason: "multiple_canonical_conversations",
    };
  }

  const conversation = matchingConversations[0];
  const identity = getCanonicalConversationIdentity(conversation);

  if (!identity || identity.requestId !== requestId) {
    return {
      action: HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.REQUEST,
      requestId,
      conversationId: null,
      conversation: null,
      matchingConversationCount: 0,
      reason: "invalid_canonical_conversation",
    };
  }

  return {
    action: HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.CONVERSATION,
    requestId,
    conversationId: identity.conversationId,
    conversation,
    matchingConversationCount: 1,
    reason: "exact_canonical_conversation",
  };
}

export function getHomeownerConversationContext(decision = {}) {
  if (decision.action !== HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.CONVERSATION) {
    return null;
  }

  const identity = getCanonicalConversationIdentity(decision.conversation);
  const requestId = normalizeCanonicalConversationId(decision.requestId);
  const conversationId = normalizeCanonicalConversationId(
    decision.conversationId
  );

  if (
    !identity ||
    !requestId ||
    !conversationId ||
    identity.requestId !== requestId ||
    identity.conversationId !== conversationId
  ) {
    return null;
  }

  const conversation = decision.conversation;
  const canonicalType = CONVERSATION_THREAD_TYPES.CANONICAL;
  const businessName =
    text(conversation.businessName) || text(conversation.business_name);
  const projectTitle = text(conversation.project_title) || "Conversation";
  const participantAvatar =
    text(conversation.participantAvatar) ||
    text(conversation.businessProfilePhoto);
  const threadPayload = {
    id: conversationId,
    requestId,
    request_id: requestId,
    conversationId,
    conversation_id: conversationId,
    activeConversationId: String(conversationId),
    threadType: canonicalType,
    conversation_type: canonicalType,
    conversation_available: true,
    relationshipScope: "personal",
    accountMode: "personal",
    project_title: projectTitle,
    project_description: text(conversation.project_description),
    businessName,
    business_name: businessName,
    participantAvatar,
    businessProfilePhoto: participantAvatar,
    category: text(conversation.category),
    status: text(conversation.status) || "active",
    archived: conversation.archived === true,
    canSendMessages: conversation.canSendMessages === true,
    lastMessage: text(conversation.lastMessage),
    lastMessageAt: conversation.lastMessageAt || "",
    createdAt: conversation.createdAt || "",
    updatedAt: conversation.updatedAt || "",
  };

  return {
    requestId,
    conversationId,
    activeConversationName: businessName || "Conversation",
    conversationType: canonicalType,
    returnPage: HOMEOWNER_CONVERSATION_RETURN_PAGE,
    threadPayload,
  };
}

export function stageHomeownerCanonicalConversation(
  decision = {},
  request = {},
  storage = globalThis.localStorage
) {
  const context = getHomeownerConversationContext(decision);
  if (!context || typeof storage?.setItem !== "function") return null;

  try {
    const payload = JSON.stringify(context.threadPayload);

    storage.setItem("selectedHomeownerRequestId", String(context.requestId));
    storage.setItem("selectedHomeownerRequest", JSON.stringify(request));
    storage.setItem("selectedQuoteRequestId", String(context.requestId));
    storage.setItem("selectedQuoteRequest", payload);
    storage.setItem("selectedConversation", payload);
    storage.setItem("conversationReturnPage", context.returnPage);
    storage.setItem("returnPage", context.returnPage);
    storage.setItem("activeConversationId", String(context.conversationId));
    storage.setItem("activeConversationName", context.activeConversationName);
    storage.setItem("meetroConversationType", context.conversationType);
    storage.removeItem?.("selectedMessageReceiverId");
    storage.removeItem?.("conversationBusinessName");
    storage.removeItem?.("selectedContractor");

    return context;
  } catch {
    return null;
  }
}
