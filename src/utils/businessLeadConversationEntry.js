import {
  CONVERSATION_THREAD_TYPES,
  normalizeCanonicalConversationId,
} from "./canonicalConversationMessaging.js";

export const BUSINESS_LEADS_PAGE = "businessLeads";
export const CONVERSATION_THREAD_PAGE = "conversationThread";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getBusinessLeadConversationContext(opportunity = {}) {
  const conversationId = normalizeCanonicalConversationId(
    opportunity.conversationId
  );
  const requestId = normalizeCanonicalConversationId(opportunity.request_id);
  const canonicalType = CONVERSATION_THREAD_TYPES.CANONICAL;

  if (
    !conversationId ||
    !requestId ||
    opportunity.conversation_available === false ||
    opportunity.threadType !== canonicalType ||
    opportunity.conversation_type !== canonicalType
  ) {
    return null;
  }

  const projectTitle = text(opportunity.project_title) || "Conversation";
  const requestPhotos = Array.isArray(opportunity.request_photos)
    ? [...opportunity.request_photos]
    : [];
  const threadPayload = {
    id: conversationId,
    requestId,
    request_id: requestId,
    conversationId,
    conversation_id: conversationId,
    activeConversationId: String(conversationId),
    threadType: canonicalType,
    conversation_type: canonicalType,
    conversation_available: opportunity.conversation_available === true,
    relationshipScope: "business",
    accountMode: "business",
    project_title: projectTitle,
    project_description: text(opportunity.project_description),
    category: text(opportunity.category),
    request_category: text(opportunity.request_category),
    service_domain: text(opportunity.service_domain),
    service_specialty: text(opportunity.service_specialty),
    location: text(opportunity.location),
    status: text(opportunity.status) || "open",
    createdAt: text(opportunity.createdAt),
    updatedAt: text(opportunity.updatedAt),
    image_url: text(opportunity.image_url),
    request_photos: requestPhotos,
  };

  return {
    requestId,
    conversationId,
    activeConversationName: projectTitle,
    conversationType: canonicalType,
    returnPage: BUSINESS_LEADS_PAGE,
    threadPayload,
  };
}

export function stageBusinessLeadConversation(
  opportunity = {},
  storage = globalThis.localStorage
) {
  const context = getBusinessLeadConversationContext(opportunity);
  if (!context || typeof storage?.setItem !== "function") return null;

  try {
    const payload = JSON.stringify(context.threadPayload);

    storage.setItem("selectedQuoteRequestId", String(context.requestId));
    storage.setItem("selectedQuoteRequest", payload);
    storage.setItem("selectedConversation", payload);
    storage.setItem("conversationReturnPage", context.returnPage);
    storage.setItem("returnPage", context.returnPage);
    storage.setItem("activeConversationId", String(context.conversationId));
    storage.setItem("activeConversationName", context.activeConversationName);
    storage.setItem("meetroConversationType", context.conversationType);
    storage.removeItem?.("selectedMessageReceiverId");

    return context;
  } catch {
    return null;
  }
}
