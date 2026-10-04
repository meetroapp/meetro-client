const EMPTY_ATTENTION = Object.freeze({
  unread: 0,
  customerUnread: 0,
  teamUnread: 0,
  byJob: Object.freeze([]),
  byConversation: Object.freeze([]),
});

export function getCommunicationAttention(snapshot, identity) {
  if (!identity || snapshot?.identity !== identity) return EMPTY_ATTENTION;
  return snapshot?.response?.counts?.communication || EMPTY_ATTENTION;
}

export function getJobCommunicationAttention(attention, businessId, jobId) {
  const exactBusinessId = Number(businessId);
  const exactJobId = String(jobId || "").trim().toLowerCase();
  const match = attention?.byJob?.find(
    (item) => item.businessId === exactBusinessId && item.jobId === exactJobId
  );
  return match || { businessId: exactBusinessId, jobId: exactJobId, customerUnread: 0, teamUnread: 0 };
}

export function getConversationCustomerAttention(attention, conversationId) {
  const exactConversationId = Number(conversationId);
  return attention?.byConversation?.find(
    (item) => item.conversationId === exactConversationId
  )?.customerUnread || 0;
}

export function formatAttentionCount(count) {
  return count > 99 ? "99+" : String(count);
}
