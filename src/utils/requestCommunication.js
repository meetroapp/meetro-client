import {
  CONVERSATION_THREAD_TYPES,
  getOpportunityThreadIdentity,
  normalizeCanonicalConversationId,
} from "./canonicalConversationMessaging.js";
import { authFetch } from "./authFetch.js";

export function getRequestCommunicationEndpoint(accountMode = "personal") {
  return accountMode === "business"
    ? "/conversations?perspective=professional"
    : "/conversations?perspective=homeowner";
}

function normalizeCanonicalConversation(record = {}, accountMode = "personal") {
  const conversationId = normalizeCanonicalConversationId(
    record.conversation_id ?? record.id
  );
  const source =
    record.source &&
    typeof record.source === "object" &&
    !Array.isArray(record.source)
      ? record.source
      : {};
  const isEmergency =
    source.type === "emergency" ||
    source.isEmergency === true ||
    normalizeCanonicalConversationId(record.emergency_request_id) !== null;
  const requestId = isEmergency
    ? null
    : normalizeCanonicalConversationId(record.request_id);
  const emergencyRequestId = isEmergency
    ? normalizeCanonicalConversationId(
        record.emergency_request_id ?? source.id
      )
    : null;

  if (
    !conversationId ||
    (!isEmergency &&
      accountMode !== "business" &&
      !requestId) ||
    (isEmergency && !emergencyRequestId)
  ) {
    return null;
  }

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
  const workflow =
    record.workflow && typeof record.workflow === "object"
      ? record.workflow
      : {};
  const title = String(
    record.request_title ||
      record.relationship?.title ||
      source.title ||
      "Conversation"
  ).trim();
  const participantName = String(display.name || "").trim();
  const participantAvatar = String(display.image_url || "").trim();
  const lastMessage = String(record.last_message_preview || "").trim();
  const lastActivity = record.last_activity || "";
  const unreadCount = Number.isSafeInteger(record.unread_count)
    ? Math.max(0, record.unread_count)
    : 0;

  return {
    id: conversationId,
    request_id: requestId,
    emergency_request_id: emergencyRequestId,
    emergencyRequestId,
    conversation_id: conversationId,
    conversationId,
    canonicalConversationId: conversationId,
    conversation_available: record.conversation_available === true,
    threadType: CONVERSATION_THREAD_TYPES.CANONICAL,
    conversation_type: isEmergency
      ? "emergency"
      : CONVERSATION_THREAD_TYPES.CANONICAL,
    sourceType: isEmergency ? "emergency" : "request",
    source: isEmergency
      ? {
          type: "emergency",
          id: emergencyRequestId,
          title,
          serviceDomain: String(source.serviceDomain || "").trim(),
          serviceSpecialty: String(source.serviceSpecialty || "").trim(),
          isEmergency: true,
        }
      : { type: "request", id: requestId, title },
    project_title: title,
    project_description: lastMessage,
    participantName,
    businessName:
      accountMode === "personal" ? participantName : "",
    business_name:
      accountMode === "personal" ? participantName : "",
    customerName:
      accountMode === "business" ? participantName : "",
    homeownerName:
      accountMode === "business" ? participantName : "",
    participantAvatar,
    businessProfilePhoto:
      accountMode === "personal" ? participantAvatar : "",
    category: String(
      display.category || source.serviceSpecialty || ""
    ).trim(),
    status: String(status.value || "active").trim(),
    archived: status.archived === true,
    canSendMessages: permissions.canSendMessages === true,
    workflow: {
      status:
        typeof workflow.status === "string"
          ? workflow.status
          : null,
      allowedActions: Array.isArray(workflow.allowedActions)
        ? workflow.allowedActions.filter(
            (action) => typeof action === "string" && action.trim()
          )
        : [],
    },
    permissions: {
      canSendMessages: permissions.canSendMessages === true,
      canManageWorkflow: permissions.canManageWorkflow === true,
    },
    lastMessage,
    lastMessageAt: lastActivity,
    createdAt: lastActivity,
    updatedAt: lastActivity,
    unreadCount,
    unread: unreadCount > 0,
    relationshipScope:
      accountMode === "business" ? "business" : "personal",
    accountMode,
  };
}

function normalizeProfessionalOpportunity(record = {}) {
  const id = record.request_id ?? record.id;
  const title = String(record.title || "").trim();
  if (!id || !title) return null;
  const opportunityIdentity = getOpportunityThreadIdentity(record);
  const responseId = normalizeCanonicalConversationId(
    record.professional_response_id
  );
  const hasCanonicalResponse = Boolean(
    record.has_responded === true &&
      responseId &&
      record.response_status === "submitted" &&
      record.relationship_status === "pending" &&
      record.response_submission_available === false
  );
  const responseSubmissionAvailable = Boolean(
    record.has_responded === false &&
      record.professional_response_id == null &&
      record.response_status == null &&
      record.relationship_status == null &&
      record.response_submission_available === true
  );

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
    hasResponded: hasCanonicalResponse,
    professionalResponseId: hasCanonicalResponse ? responseId : null,
    responseStatus: hasCanonicalResponse ? "submitted" : null,
    relationshipStatus: hasCanonicalResponse ? "pending" : null,
    responseSubmittedAt: hasCanonicalResponse
      ? record.submitted_at || null
      : null,
    responseSubmissionAvailable,
  };
}

export function normalizeRequestConversations(payload = {}, accountMode = "personal") {
  const hasOpportunityPayload =
    accountMode === "business" &&
    Array.isArray(payload?.opportunities);
  const source = hasOpportunityPayload
    ? payload.opportunities
    : payload?.conversations;

  if (!Array.isArray(source)) return null;

  return source
    .filter((record) => record && typeof record === "object" && !Array.isArray(record))
    .map((record) =>
      hasOpportunityPayload
        ? normalizeProfessionalOpportunity(record)
        : normalizeCanonicalConversation(record, accountMode)
    )
    .filter(Boolean);
}

export function findCanonicalEmergencyConversation(
  conversations = [],
  emergencyRequestId
) {
  const normalizedRequestId =
    normalizeCanonicalConversationId(emergencyRequestId);

  if (!normalizedRequestId || !Array.isArray(conversations)) {
    return null;
  }

  return (
    conversations.find(
      (conversation) =>
        conversation?.sourceType === "emergency" &&
        normalizeCanonicalConversationId(
          conversation.emergencyRequestId ??
            conversation.emergency_request_id
        ) === normalizedRequestId &&
        normalizeCanonicalConversationId(
          conversation.conversationId ??
            conversation.conversation_id
        )
    ) || null
  );
}

export async function fetchCanonicalConversations(
  accountMode = "personal",
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  if (typeof authFetchImpl !== "function") {
    return {
      ok: false,
      status: 0,
      code: "INVALID_CONVERSATION_TRANSPORT",
      conversations: [],
    };
  }

  try {
    const result = await authFetchImpl(
      getRequestCommunicationEndpoint(accountMode),
      { cache: "no-store" },
      setPage
    );
    const conversations = result?.response?.ok
      ? normalizeRequestConversations(
          result.data || {},
          accountMode
        )
      : null;

    if (!conversations) {
      return {
        ok: false,
        status: Number(result?.response?.status || 0),
        code:
          result?.data?.code ||
          "CONVERSATIONS_FETCH_FAILED",
        conversations: [],
      };
    }

    return {
      ok: true,
      status: Number(result?.response?.status || 200),
      code: String(result?.data?.code || ""),
      conversations,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      code: "CONVERSATIONS_FETCH_FAILED",
      conversations: [],
    };
  }
}
