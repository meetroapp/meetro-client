const NOTIFICATIONS_KEY = "meetro_notifications";
const PREFERENCES_KEY = "meetro_notification_preferences";

function safeParse(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeRole(role) {
  const normalized = String(role || "all").toLowerCase();
  if (["business", "professional"].includes(normalized)) return "professional";
  if (["homeowner", "customer", "personal"].includes(normalized)) return "homeowner";
  return normalized || "all";
}

function buildDedupeKey(notification = {}) {
  return [
    notification.type || "general",
    normalizeRole(notification.role || notification.targetRole),
    notification.requestId || "",
    notification.conversationId || "",
    notification.appointmentId || notification.scheduleId || "",
    notification.quoteId || "",
    notification.emergencyId || "",
    notification.dedupeKey || "",
  ].join(":");
}

export function getNotificationPreferences() {
  const preferences = safeParse(PREFERENCES_KEY, {});
  return preferences && typeof preferences === "object" ? preferences : {};
}

export function saveNotificationPreferences(preferences = {}) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event("meetro-notifications-updated"));
  return preferences;
}

export function getNotifications(role) {
  const notifications = safeParse(NOTIFICATIONS_KEY, []);
  const list = Array.isArray(notifications) ? notifications : [];
  const normalizedRole = normalizeRole(role);

  if (!role) return list;

  return list.filter((item) => {
    const itemRole = normalizeRole(item.role || item.targetRole);
    return itemRole === "all" || itemRole === normalizedRole;
  });
}

export function saveNotifications(notifications) {
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(safeNotifications));
  window.dispatchEvent(new Event("meetro-notifications-updated"));
  window.dispatchEvent(new Event("storage"));
  return safeNotifications;
}

export function createNotification(notification = {}) {
  const timestamp = notification.timestamp || notification.createdAt || new Date().toISOString();
  const role = normalizeRole(notification.role || notification.targetRole);
  const nextNotification = {
    id: notification.id || `${notification.type || "notification"}-${Date.now()}`,
    type: notification.type || "general",
    title: notification.title || "Meetro notification",
    message: notification.message || "",
    role,
    targetRole: role,
    timestamp,
    createdAt: timestamp,
    read: Boolean(notification.read),
    unread: notification.read ? false : true,
    requestId: notification.requestId || "",
    conversationId: notification.conversationId || "",
    appointmentId: notification.appointmentId || notification.scheduleId || "",
    quoteId: notification.quoteId || "",
    emergencyId: notification.emergencyId || "",
    dedupeKey: notification.dedupeKey || "",
    metadata: notification.metadata || {},
  };
  const dedupeKey = buildDedupeKey(nextNotification);
  const existing = getNotifications();

  if (existing.some((item) => buildDedupeKey(item) === dedupeKey)) {
    return existing.find((item) => buildDedupeKey(item) === dedupeKey);
  }

  saveNotifications([{ ...nextNotification, dedupeKey }, ...existing]);
  return nextNotification;
}

export function markNotificationRead(notificationId) {
  const notifications = getNotifications().map((item) =>
    String(item.id) === String(notificationId)
      ? { ...item, read: true, unread: false, readAt: new Date().toISOString() }
      : item
  );
  return saveNotifications(notifications);
}

export function markAllNotificationsRead(role) {
  const normalizedRole = normalizeRole(role);
  const notifications = getNotifications().map((item) => {
    const itemRole = normalizeRole(item.role || item.targetRole);
    if (role && itemRole !== "all" && itemRole !== normalizedRole) return item;
    return { ...item, read: true, unread: false, readAt: new Date().toISOString() };
  });
  return saveNotifications(notifications);
}

export function getUnreadNotificationCount(role) {
  return getNotifications(role).filter((item) => !item.read).length;
}
