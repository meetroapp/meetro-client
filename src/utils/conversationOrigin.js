import {
  CANONICAL_CONVERSATION_COMMUNICATION_SHELL,
  buildCanonicalConversationRoute,
  normalizeCanonicalConversationId,
  parseCanonicalConversationRoute,
} from "./canonicalConversationMessaging.js";

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

  const route = parseCanonicalConversationRoute(
    typeof window === "undefined" ? "" : window.location?.hash || ""
  );
  const conversationId =
    (route.valid && route.conversationId) ||
    normalizeCanonicalConversationId(
      localStorage.getItem("activeConversationId") || ""
    );
  if (!conversationId) return null;

  const conversationShell =
    route.shell === CANONICAL_CONVERSATION_COMMUNICATION_SHELL ||
    extra.sourcePage === "messagesInbox"
      ? CANONICAL_CONVERSATION_COMMUNICATION_SHELL
      : "";

  const context = {
    origin: "conversation",
    conversationId,
    activeConversationName: localStorage.getItem("activeConversationName") || "",
    conversationType: localStorage.getItem("meetroConversationType") || "standard",
    selectedConversation: safeParse(localStorage.getItem("selectedConversation"), null),
    conversationReturnPage:
      route.returnPage ||
      localStorage.getItem("conversationReturnPage") ||
      "",
    returnPage: localStorage.getItem("returnPage") || "",
    conversationShell,
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

  const conversationId = normalizeCanonicalConversationId(
    context.conversationId
  );
  if (!conversationId) return false;

  const returnPage =
    context.conversationReturnPage || context.returnPage || "messagesInbox";
  const conversationShell =
    context.conversationShell ===
    CANONICAL_CONVERSATION_COMMUNICATION_SHELL
      ? CANONICAL_CONVERSATION_COMMUNICATION_SHELL
      : undefined;

  localStorage.setItem("activeConversationId", String(conversationId));
  localStorage.setItem("activeConversationName", context.activeConversationName || "");
  localStorage.setItem("meetroConversationType", context.conversationType || "standard");

  if (context.selectedConversation) {
    localStorage.setItem("selectedConversation", JSON.stringify(context.selectedConversation));
  }

  localStorage.setItem("conversationReturnPage", returnPage);
  localStorage.setItem("returnPage", context.returnPage || returnPage);
  localStorage.removeItem(CONVERSATION_ORIGIN_CONTEXT_KEY);

  if (typeof setPage === "function") {
    setPage(
      buildCanonicalConversationRoute(conversationId, returnPage, {
        shell: conversationShell,
      })
    );
  }

  return true;
}
