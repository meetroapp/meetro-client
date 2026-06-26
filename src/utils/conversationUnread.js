import { createNotification } from "./meetroNotifications";

export function getConversationRegistry() {
  try {
    const registry = JSON.parse(
      localStorage.getItem("meetro_conversation_registry") || "[]"
    );

    return Array.isArray(registry) ? registry : [];
  } catch {
    return [];
  }
}

export function getConversationViewerRole(role) {
  const normalized = String(
    role || localStorage.getItem("activeAccountMode") || "personal"
  ).toLowerCase();

  return normalized === "business" || normalized === "professional"
    ? "business"
    : "homeowner";
}

export function getOppositeConversationRole(role) {
  return getConversationViewerRole(role) === "business" ? "homeowner" : "business";
}

function getRoleReadKey(conversationId, role) {
  return `meetro_conversation_read_${conversationId}_${getConversationViewerRole(role)}`;
}

export function isConversationUnreadForRole(conversationId, role, fallbackUnread = false) {
  const id = String(conversationId || "");

  if (!id) return false;

  const roleRead = localStorage.getItem(getRoleReadKey(id, role));

  if (roleRead !== null) {
    return roleRead !== "true";
  }

  const legacyRead = localStorage.getItem(`meetro_conversation_read_${id}`);

  if (legacyRead !== null) {
    return legacyRead !== "true";
  }

  return Boolean(fallbackUnread);
}

export function getUnreadConversationCount(registry = getConversationRegistry()) {
  const role = getConversationViewerRole();
  return registry.filter((item) =>
    isConversationUnreadForRole(item.id || item.conversationId, role, item.unread)
  ).length;
}

export function writeUnreadConversationCount(registry = getConversationRegistry()) {
  const unreadCount = getUnreadConversationCount(registry);
  localStorage.setItem("mockUnreadMessages", String(unreadCount));
  return unreadCount;
}

export function setConversationUnread(conversationId, unread, fallback = {}, role) {
  const id = String(conversationId || "");

  if (!id) return getConversationRegistry();

  const viewerRole = getConversationViewerRole(role);
  localStorage.setItem(getRoleReadKey(id, viewerRole), unread ? "false" : "true");

  if (viewerRole === getConversationViewerRole()) {
    localStorage.setItem(`meetro_conversation_read_${id}`, unread ? "false" : "true");
  }

  const registry = getConversationRegistry();
  const existing = registry.find((item) => String(item.id) === id);
  const visibleUnread = viewerRole === getConversationViewerRole()
    ? Boolean(unread)
    : isConversationUnreadForRole(id, getConversationViewerRole(), existing?.unread);

  const registryItem = {
    ...(existing || {}),
    ...fallback,
    id,
    unread: visibleUnread,
  };

  const updatedRegistry = [
    registryItem,
    ...registry.filter((item) => String(item.id) !== id),
  ];

  localStorage.setItem(
    "meetro_conversation_registry",
    JSON.stringify(updatedRegistry)
  );
  writeUnreadConversationCount(updatedRegistry);
  window.dispatchEvent(new Event("meetro-messages-updated"));

  return updatedRegistry;
}

export function markConversationRead(conversationId, fallback = {}, role) {
  return setConversationUnread(conversationId, false, fallback, role);
}

export function markConversationUnread(conversationId, fallback = {}, role) {
  return setConversationUnread(conversationId, true, fallback, role);
}

export function markConversationUnreadForRecipient(conversationId, senderRole, fallback = {}) {
  const recipientRole = getOppositeConversationRole(senderRole);
  const registry = markConversationUnread(
    conversationId,
    fallback,
    recipientRole
  );

  createNotification({
    type: "unread_message",
    title: "New Meetro message",
    message: fallback.project_description || fallback.lastMessage || "You have a new unread message.",
    role: recipientRole === "business" ? "professional" : "homeowner",
    conversationId,
    requestId: fallback.requestId || fallback.activeJobId || "",
    dedupeKey: `unread_message:${recipientRole}:${conversationId}`,
  });

  return registry;
}
