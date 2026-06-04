export function getNotifications() {
  try {
    return JSON.parse(localStorage.getItem("meetroNotifications") || "[]");
  } catch {
    return [];
  }
}

export function saveNotifications(notifications) {
  localStorage.setItem(
    "meetroNotifications",
    JSON.stringify(Array.isArray(notifications) ? notifications : [])
  );

  window.dispatchEvent(new Event("meetroNotificationsUpdated"));
}

export function addNotification(notification) {
  const notifications = getNotifications();

  const newNotification = {
    id: notification.id || `notification-${Date.now()}`,
    type: notification.type || "general",
    title: notification.title || "Notification",
    message: notification.message || "",
    priority: notification.priority || "normal",
    targetRole: notification.targetRole || "all",
    requestId: notification.requestId || "",
    quoteId: notification.quoteId || "",
    read: false,
    createdAt: notification.createdAt || new Date().toISOString(),
  };

  saveNotifications([newNotification, ...notifications]);

  return newNotification;
}

export function markNotificationRead(notificationId) {
  const notifications = getNotifications();

  saveNotifications(
    notifications.map((item) =>
      item.id === notificationId ? { ...item, read: true } : item
    )
  );
}

export function getUnreadNotificationCount(targetRole) {
  return getNotifications().filter((item) => {
    const roleMatches =
      !targetRole || item.targetRole === "all" || item.targetRole === targetRole;

    return roleMatches && !item.read;
  }).length;
}
