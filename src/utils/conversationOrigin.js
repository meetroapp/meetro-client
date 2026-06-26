export const CONVERSATION_ORIGIN_CONTEXT_KEY = "meetroConversationOriginContext";

function safeParse(value, fallback = null) {
  try {
    return JSON.parse(value || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function captureConversationOriginContext(extra = {}) {
  if (typeof localStorage === "undefined") return null;

  const conversationId = localStorage.getItem("activeConversationId") || "";
  if (!conversationId) return null;

  const context = {
    origin: "conversation",
    conversationId,
    activeConversationName: localStorage.getItem("activeConversationName") || "",
    conversationType: localStorage.getItem("meetroConversationType") || "standard",
    selectedConversation: safeParse(localStorage.getItem("selectedConversation"), null),
    conversationReturnPage: localStorage.getItem("conversationReturnPage") || "",
    returnPage: localStorage.getItem("returnPage") || "",
    accountMode: localStorage.getItem("activeAccountMode") || localStorage.getItem("accountMode") || "",
    viewerRole: extra.viewerRole || "",
    scrollY:
      typeof window !== "undefined" && Number.isFinite(window.scrollY)
        ? window.scrollY
        : 0,
    ...extra,
  };

  localStorage.setItem(CONVERSATION_ORIGIN_CONTEXT_KEY, JSON.stringify(context));
  return context;
}

export function getConversationOriginContext() {
  if (typeof localStorage === "undefined") return null;
  const context = safeParse(localStorage.getItem(CONVERSATION_ORIGIN_CONTEXT_KEY), null);
  return context?.origin === "conversation" && context.conversationId ? context : null;
}

export function hasConversationOriginContext() {
  return Boolean(getConversationOriginContext());
}

export function restoreConversationOriginContext(setPage) {
  const context = getConversationOriginContext();
  if (!context) return false;

  localStorage.setItem("activeConversationId", String(context.conversationId));
  localStorage.setItem("activeConversationName", context.activeConversationName || "");
  localStorage.setItem("meetroConversationType", context.conversationType || "standard");

  if (context.selectedConversation) {
    localStorage.setItem("selectedConversation", JSON.stringify(context.selectedConversation));
  }

  localStorage.setItem("conversationReturnPage", context.conversationReturnPage || context.returnPage || "messagesInbox");
  localStorage.setItem("returnPage", context.returnPage || context.conversationReturnPage || "messagesInbox");
  localStorage.removeItem(CONVERSATION_ORIGIN_CONTEXT_KEY);

  if (typeof setPage === "function") {
    setPage("conversationThread");
  }

  return true;
}
