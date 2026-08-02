export const CONVERSATION_THREAD_TYPES = Object.freeze({
  CANONICAL: "canonical_conversation",
  LEGACY_QUOTE_REQUEST: "legacy_quote_request",
  REQUEST_OPPORTUNITY: "request_opportunity",
});

export const CANONICAL_MESSAGE_MAX_LENGTH = 5000;
export const CANONICAL_CONVERSATION_ROUTE_PAGE = "conversationThread";
export const CANONICAL_CONVERSATION_ROUTE_PARAM = "conversationId";
export const CANONICAL_CONVERSATION_RETURN_PARAM = "returnPage";

export function normalizeCanonicalConversationId(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function normalizeRouteId(value) {
  const normalized = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(normalized)) return null;
  return normalizeCanonicalConversationId(Number(normalized));
}

export function parseCanonicalConversationRoute(routeValue = "") {
  const route = String(routeValue || "").replace(/^#/, "").trim();
  const queryIndex = route.indexOf("?");
  const page = queryIndex >= 0 ? route.slice(0, queryIndex) : route;
  const query = queryIndex >= 0 ? route.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(query);
  const conversationId = normalizeRouteId(
    params.get(CANONICAL_CONVERSATION_ROUTE_PARAM)
  );
  const returnPage = String(
    params.get(CANONICAL_CONVERSATION_RETURN_PARAM) || ""
  ).trim();

  return {
    page,
    conversationId,
    returnPage,
    valid:
      page === CANONICAL_CONVERSATION_ROUTE_PAGE &&
      Boolean(conversationId),
  };
}

export function buildCanonicalConversationRoute(
  conversationId,
  returnPage = "messagesInbox"
) {
  const normalizedId = normalizeCanonicalConversationId(conversationId);
  if (!normalizedId) return CANONICAL_CONVERSATION_ROUTE_PAGE;

  const params = new URLSearchParams({
    [CANONICAL_CONVERSATION_ROUTE_PARAM]: String(normalizedId),
  });
  const normalizedReturnPage = String(returnPage || "").trim();

  if (normalizedReturnPage) {
    params.set(
      CANONICAL_CONVERSATION_RETURN_PARAM,
      normalizedReturnPage
    );
  }

  return `${CANONICAL_CONVERSATION_ROUTE_PAGE}?${params.toString()}`;
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

  const conversationType =
    payload.conversation.type === "emergency"
      ? "emergency"
      : "request";
  const workflow =
    payload.workflow &&
    typeof payload.workflow === "object" &&
    !Array.isArray(payload.workflow)
      ? payload.workflow
      : {};
  const allowedActions = Array.isArray(workflow.allowedActions)
    ? workflow.allowedActions.filter(
        (action) => typeof action === "string" && action.trim()
      )
    : [];
  const permissions =
    payload.permissions &&
    typeof payload.permissions === "object" &&
    !Array.isArray(payload.permissions)
      ? payload.permissions
      : {};
  const relationship =
    payload.relationship &&
    typeof payload.relationship === "object"
      ? payload.relationship
      : {};
  const location =
    conversationType === "emergency" &&
    payload.location &&
    typeof payload.location === "object" &&
    !Array.isArray(payload.location)
      ? {
          locationText: String(payload.location.locationText || "").trim(),
          unitNumber: String(payload.location.unitNumber || "").trim(),
          accessNotes: String(payload.location.accessNotes || "").trim(),
        }
      : null;

  return {
    conversationId,
    type: conversationType,
    status: payload.conversation.status,
    canSendMessages: permissions.canSendMessages === true,
    participants:
      payload.participants && typeof payload.participants === "object"
        ? payload.participants
        : {},
    relationship,
    emergencyRequestId:
      conversationType === "emergency"
        ? normalizeCanonicalConversationId(
            relationship.emergencyRequestId
          )
        : null,
    workflow: {
      status:
        typeof workflow.status === "string"
          ? workflow.status
          : null,
      assignedAt: workflow.assignedAt || null,
      enRouteAt: workflow.enRouteAt || null,
      arrivedAt: workflow.arrivedAt || null,
      workStartedAt: workflow.workStartedAt || null,
      completedAt: workflow.completedAt || null,
      allowedActions,
    },
    permissions: {
      canRead: permissions.canRead === true,
      canSendMessages: permissions.canSendMessages === true,
      canManageWorkflow: permissions.canManageWorkflow === true,
      canMarkEnRoute: permissions.canMarkEnRoute === true,
      canMarkArrived: permissions.canMarkArrived === true,
      canStartWork: permissions.canStartWork === true,
      canCompleteWork: permissions.canCompleteWork === true,
    },
    location,
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
