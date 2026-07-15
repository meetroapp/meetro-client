const PREFERENCES_KEY = "meetro_notification_preferences";

function safeParse(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "");
    return value ?? fallback;
  } catch {
    return fallback;
  }
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

export function getNotifications() {
  return [];
}

export function saveNotifications() {
  return [];
}

export function createNotification() {
  return null;
}

export function upsertNotification() {
  return null;
}

export function markNotificationRead() {
  return [];
}

export function markAllNotificationsRead() {
  return [];
}

export function getUnreadNotificationCount() {
  return 0;
}
