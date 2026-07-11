function text(value) { return value === undefined || value === null ? "" : String(value).trim(); }
function timestamp(record = {}) { const value = record.lastInteractionAt || record.lastMessageAt || record.updatedAt || record.createdAt || ""; const ms = Date.parse(value); return Number.isFinite(ms) ? { value, ms } : { value: "", ms: 0 }; }

function direction(record = {}, parties = {}) {
  const explicit = text(record.lastDirection || record.messageDirection);
  if (explicit) return explicit;
  const sender = text(record.lastSenderId || record.senderId);
  if (!sender) return "unknown";
  if (sender === parties.customerId) return "customer_to_professional";
  if (sender === parties.professionalId || sender === parties.businessId) return "professional_to_customer";
  return "unknown";
}

export function buildRelationshipCommunication(conversations = [], parties = {}) {
  const ordered = conversations.map((entry) => ({ entry, time: timestamp(entry.record) })).sort((a, b) => b.time.ms - a.time.ms);
  const latest = ordered[0];
  if (!latest) return {};
  const record = latest.entry.record;
  const lastDirection = direction(record, parties);
  const closed = Boolean(record.archived || record.closedAt) || ["closed", "archived", "blocked", "revoked"].includes(text(record.status).toLowerCase());
  const unreadCount = Number(record.unreadCount || (record.unread ? 1 : 0)) || 0;
  const responseState = closed
    ? "conversation_closed"
    : text(record.responseState) || (lastDirection === "customer_to_professional" && unreadCount > 0 ? "awaiting_professional_response" : lastDirection === "professional_to_customer" && record.responsePending === true ? "awaiting_customer_response" : "no_response_required");
  return {
    channel: text(record.channel || record.communicationChannel || "in_app"),
    activeConversationExists: !closed,
    conversationCount: conversations.length,
    lastInteractionAt: latest.time.value,
    lastDirection,
    responseState,
    unreadCount,
    conversationId: text(record.conversationId || record.id),
  };
}
