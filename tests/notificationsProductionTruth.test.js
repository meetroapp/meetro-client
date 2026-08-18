import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  addNotification,
  getNotifications as getLegacyNotifications,
  getUnreadNotificationCount as getLegacyUnreadCount,
  markNotificationRead as markLegacyRead,
  saveNotifications as saveLegacyNotifications,
} from "../src/utils/notifications.js";
import {
  createNotification,
  getNotifications as getMeetroNotifications,
  getUnreadNotificationCount as getMeetroUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  saveNotifications,
  upsertNotification,
} from "../src/utils/meetroNotifications.js";

const notificationsSource = readFileSync(
  new URL("../src/pages/Notifications.jsx", import.meta.url),
  "utf8"
);
const bottomNavSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const languageSource = readFileSync(
  new URL("../src/utils/language.js", import.meta.url),
  "utf8"
);

function createStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    snapshot: () => Object.fromEntries(values),
  };
}

test("Notifications route renders the canonical Alert API-backed center without local registries", () => {
  assert.match(notificationsSource, /utils\/alertApi/);
  assert.match(notificationsSource, /fetchAlerts/);
  assert.match(notificationsSource, /alert-center-workspace/);
  assert.doesNotMatch(notificationsSource, /utils\/(?:meetroNotifications|notifications)/);
  assert.doesNotMatch(notificationsSource, /notificationCenter/);
  assert.doesNotMatch(notificationsSource, /notificationsEmptyTitle|markAllNotificationsRead/);
});

test("both legacy notification stores ignore stale records and reject browser-local writes", () => {
  const previousStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  const storage = createStorage({
    meetro_notifications: JSON.stringify([{ id: "stale-meetro", read: false }]),
    meetroNotifications: JSON.stringify([{ id: "stale-legacy", read: false }]),
  });
  globalThis.localStorage = storage;
  globalThis.window = { dispatchEvent() {} };

  try {
    const before = storage.snapshot();

    assert.deepEqual(getMeetroNotifications("professional"), []);
    assert.deepEqual(getLegacyNotifications(), []);
    assert.equal(getMeetroUnreadCount("professional"), 0);
    assert.equal(getLegacyUnreadCount("professional"), 0);

    assert.equal(createNotification({ type: "quote_sent" }), null);
    assert.equal(upsertNotification({ type: "new_message" }), null);
    assert.equal(addNotification({ type: "appointment_confirmed" }), null);
    assert.deepEqual(saveNotifications([{ id: "new" }]), []);
    assert.deepEqual(saveLegacyNotifications([{ id: "new" }]), []);
    assert.deepEqual(markNotificationRead("stale-meetro"), []);
    assert.deepEqual(markAllNotificationsRead("professional"), []);
    assert.deepEqual(markLegacyRead("stale-legacy"), []);

    assert.deepEqual(storage.snapshot(), before);
  } finally {
    globalThis.localStorage = previousStorage;
    globalThis.window = previousWindow;
  }
});

test("legacy notification stores remain unavailable while canonical Alert counts project to owning navigation", () => {
  assert.match(bottomNavSource, /subscribeAlertCounts/);
  assert.match(
    bottomNavSource,
    /alertCountSnapshot\.response\?\.counts\?\.byCategory/
  );
  assert.match(bottomNavSource, /canonicalCategoryUnreadCount/);
  assert.match(bottomNavSource, /communicationAlertCount/);
  assert.match(bottomNavSource, /workCenterAlertCount/);
  assert.match(bottomNavSource, /leadsAlertCount/);
  assert.match(bottomNavSource, /profileAlertCount/);
  assert.match(
    bottomNavSource,
    /canonicalCategoryUnreadCount\("business_verification"\)/
  );

  assert.doesNotMatch(
    bottomNavSource,
    /item\.page === "notifications"/
  );

  assert.equal(getMeetroUnreadCount("homeowner"), 0);
  assert.equal(getMeetroUnreadCount("professional"), 0);
  assert.equal(getLegacyUnreadCount("homeowner"), 0);
  assert.equal(getLegacyUnreadCount("professional"), 0);
});

test("canonical Alert Center copy is localized in all supported languages", () => {
  assert.match(languageSource, /You have no alerts requiring attention\./);
  assert.match(languageSource, /No tienes alertas que requieran atención\./);
  assert.match(languageSource, /Vous n’avez aucune alerte nécessitant votre attention\./);
  assert.match(languageSource, /Você não tem alertas que exigem atenção\./);
});
