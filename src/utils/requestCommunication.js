import {
  CONVERSATION_THREAD_TYPES,
  getOpportunityThreadIdentity,
  normalizeCanonicalConversationId,
} from "./canonicalConversationMessaging.js";

export function getRequestCommunicationEndpoint(accountMode = "personal") {
  return accountMode === "business"
    ? "/professional-request-opportunities"
    : "/conversations?perspective=homeowner";
}

function normalizeHomeownerConversation(record = {}) {
  const conversationId = normalizeCanonicalConversationId(
    record.conversation_id
  );
  const requestId = normalizeCanonicalConversationId(record.request_id);

  if (!conversationId || !requestId) return null;

  const display =
    record.display && typeof record.display === "object"
      ? record.display
      : {};
  const status =
    record.status && typeof record.status === "object"
      ? record.status
      : {};
  const permissions =
    record.permissions && typeof record.permissions === "object"
      ? record.permissions
      : {};
  const title = String(
    record.request_title || record.relationship?.title || "Conversation"
  ).trim();
  const businessName = String(display.name || "").trim();
  const businessAvatar = String(display.image_url || "").trim();
  const lastMessage = String(record.last_message_preview || "").trim();
  const lastActivity = record.last_activity || "";
  const unreadCount = Number.isSafeInteger(record.unread_count)
    ? Math.max(0, record.unread_count)
    : 0;

  return {
    id: conversationId,
    request_id: requestId,
    conversation_id: conversationId,
    conversationId,
    conversation_available: record.conversation_available === true,
    threadType: CONVERSATION_THREAD_TYPES.CANONICAL,
    conversation_type: CONVERSATION_THREAD_TYPES.CANONICAL,
    project_title: title,
    project_description: lastMessage,
    businessName,
    business_name: businessName,
    participantAvatar: businessAvatar,
    businessProfilePhoto: businessAvatar,
    category: String(display.category || "").trim(),
    status: String(status.value || "active").trim(),
    archived: status.archived === true,
    canSendMessages: permissions.canSendMessages === true,
    lastMessage,
    lastMessageAt: lastActivity,
    createdAt: lastActivity,
    updatedAt: lastActivity,
    unreadCount,
    unread: unreadCount > 0,
    relationshipScope: "personal",
    accountMode: "personal",
  };
}

function normalizeProfessionalOpportunity(record = {}) {
  const id = record.request_id ?? record.id;
  const title = String(record.title || "").trim();
  if (!id || !title) return null;
  const opportunityIdentity = getOpportunityThreadIdentity(record);

  return {
    ...record,
    id,
    request_id: id,
    conversationId: opportunityIdentity.conversationId,
    threadType: opportunityIdentity.threadType,
    createdAt: record.createdAt || record.created_at || "",
    updatedAt: record.updatedAt || record.updated_at || "",
    project_title: title,
    project_description: String(record.description || "").trim(),
    relationshipScope: "business",
    accountMode: "business",
    conversation_type: opportunityIdentity.threadType,
    status: record.status || "open",
    unread: false,
  };
}

export function normalizeRequestConversations(payload = {}, accountMode = "personal") {
  const isBusiness = accountMode === "business";
  const source = isBusiness
    ? payload?.opportunities
    : payload?.conversations;

  if (!Array.isArray(source)) return null;

  return source
    .filter((record) => record && typeof record === "object" && !Array.isArray(record))
    .map(isBusiness ? normalizeProfessionalOpportunity : normalizeHomeownerConversation)
    .filter(Boolean);
}
