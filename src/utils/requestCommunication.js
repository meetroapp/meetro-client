import {
  getOpportunityThreadIdentity,
} from "./canonicalConversationMessaging.js";

export function getRequestCommunicationEndpoint(accountMode = "personal") {
  return accountMode === "business"
    ? "/professional-request-opportunities"
    : "/posts";
}

export function normalizeRequestConversations(payload = {}, accountMode = "personal") {
  const source = accountMode === "business"
    ? payload?.opportunities
    : payload?.posts;
  if (!Array.isArray(source)) return null;

  return source
    .filter((record) => record && typeof record === "object" && !Array.isArray(record))
    .map((record) => {
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
        relationshipScope: accountMode === "business" ? "business" : "personal",
        accountMode,
        conversation_type: opportunityIdentity.threadType,
        status: record.status || "open",
        unread: false,
      };
    })
    .filter(Boolean);
}
