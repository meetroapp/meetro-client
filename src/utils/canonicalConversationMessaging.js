export const CONVERSATION_THREAD_TYPES = Object.freeze({
  CANONICAL: "canonical_conversation",
  LEGACY_QUOTE_REQUEST: "legacy_quote_request",
  REQUEST_OPPORTUNITY: "request_opportunity",
});

export const CANONICAL_MESSAGE_MAX_LENGTH = 5000;

export function normalizeCanonicalConversationId(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function getOpportunityThreadIdentity(record = {}) {
  const conversationId = normalizeCanonicalConversationId(
    record.conversation_id
  );
  const requestId = record.request_id ?? record.id ?? null;

  return {
    threadType: conversationId
      ? CONVERSATION_THREAD_TYPES.CANONICAL
      : CONVERSATION_THREAD_TYPES.REQUEST_OPPORTUNITY,
    conversationId,
    requestId,
  };
}

export function normalizeCanonicalConversationDetail(payload = {}, expectedId) {
  const conversationId = normalizeCanonicalConversationId(
    payload?.conversation?.id
  );
  const normalizedExpectedId = normalizeCanonicalConversationId(expectedId);

  if (
    payload?.success !== true ||
    !conversationId ||
    !normalizedExpectedId ||
    conversationId !== normalizedExpectedId ||
    typeof payload?.conversation?.status !== "string"
  ) {
    return null;
  }

  return {
    conversationId,
    status: payload.conversation.status,
    canSendMessages: payload?.permissions?.canSendMessages === true,
    participants:
      payload.participants && typeof payload.participants === "object"
        ? payload.participants
        : {},
    relationship:
      payload.relationship && typeof payload.relationship === "object"
        ? payload.relationship
        : {},
  };
}

export function normalizeCanonicalMessage(message = {}, viewerRole = "homeowner") {
  const backendId = normalizeCanonicalConversationId(message.id);
  const content = message.content;

  if (
    !backendId ||
    !content ||
    typeof content !== "object" ||
    typeof message?.sender?.isViewer !== "boolean"
  ) {
    return null;
  }

  const isViewer = message?.sender?.isViewer === true;
  const senderRole = isViewer
    ? viewerRole
    : viewerRole === "business"
    ? "homeowner"
    : "business";

  return {
    id: `canonical-message-${backendId}`,
    backendId,
    type: typeof content.type === "string" && content.type ? content.type : "text",
    sender: isViewer ? "me" : "them",
    senderRole,
    text: typeof content.text === "string" ? content.text : "",
    imageUrl: typeof content.imageUrl === "string" ? content.imageUrl : null,
    workflowType:
      typeof message?.workflow?.type === "string" ? message.workflow.type : "",
    workflowStatus:
      typeof message?.workflow?.status === "string" ? message.workflow.status : "",
    workflowPayload:
      message?.workflow?.payload && typeof message.workflow.payload === "object"
        ? message.workflow.payload
        : {},
    status: "delivered",
    createdAt: message.createdAt || null,
    time: message.createdAt || "",
    unsent: false,
  };
}

export function normalizeCanonicalMessageCollection(
  payload = {},
  expectedConversationId,
  viewerRole = "homeowner"
) {
  const responseConversationId = normalizeCanonicalConversationId(
    payload.conversationId
  );
  const normalizedExpectedId = normalizeCanonicalConversationId(
    expectedConversationId
  );

  if (
    payload.success !== true ||
    !responseConversationId ||
    responseConversationId !== normalizedExpectedId ||
    !Array.isArray(payload.messages)
  ) {
    return null;
  }

  const messages = payload.messages.map((message) =>
    normalizeCanonicalMessage(message, viewerRole)
  );

  return messages.every(Boolean) ? messages : null;
}

export function validateCanonicalMessageText(value) {
  if (typeof value !== "string") {
    return { valid: false, code: "MESSAGE_TEXT_REQUIRED", text: "" };
  }

  const text = value.trim();
  if (!text) {
    return { valid: false, code: "MESSAGE_TEXT_REQUIRED", text: "" };
  }
  if (text.length > CANONICAL_MESSAGE_MAX_LENGTH) {
    return { valid: false, code: "MESSAGE_TEXT_TOO_LONG", text };
  }

  return { valid: true, code: "", text };
}

export function buildCanonicalMessagePayload(text) {
  return { message_text: text };
}
