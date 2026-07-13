import test from "node:test";
import assert from "node:assert/strict";

import {
  APP_BUILD_DISMISSED_KEY,
  APP_BUILD_STORAGE_KEY,
  APP_UPDATE_RELOAD_GUARD_KEY,
  STARTUP_READINESS,
  applyAppUpdateNow,
  coordinateAppStartup,
  detectAvailableAppUpdate,
  dismissAppUpdateNotice,
} from "../src/utils/appStartup.js";

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    snapshot() {
      return Object.fromEntries(store.entries());
    },
  };
}

test("startup coordinator waits for session, profile, language, companion, and route readiness", () => {
  const calls = [];
  const result = coordinateAppStartup({
    targetPage: "businessDashboard",
    hasToken: true,
    restoreSession: (targetPage) => {
      calls.push(`restore:${targetPage}`);
      return { authenticated: true, repaired: true, isProfessional: true };
    },
    syncAccountMode: (targetPage) => calls.push(`sync:${targetPage}`),
    needsBusinessProfile: true,
    readBusinessProfile: () => calls.push("businessProfile"),
    readLanguage: () => calls.push("language"),
    companionEnabled: true,
  });

  assert.equal(result.status, STARTUP_READINESS.ready);
  assert.equal(result.routeDecisionsSafe, true);
  assert.deepEqual(result.steps, [
    "session restored",
    "user ready",
    "business profile ready",
    "language ready",
    "companion ready",
    "routes ready",
    "app ready",
  ]);
  assert.deepEqual(calls, [
    "restore:businessDashboard",
    "businessProfile",
    "language",
    "sync:businessDashboard",
  ]);
});

test("startup coordinator does not render authenticated routes for invalid sessions", () => {
  const result = coordinateAppStartup({
    targetPage: "businessDashboard",
    hasToken: true,
    restoreSession: () => ({ authenticated: false }),
  });

  assert.equal(result.status, STARTUP_READINESS.invalid);
  assert.equal(result.routeDecisionsSafe, false);
});

test("update detector shows notice for a changed build and Later dismisses temporarily", () => {
  const storage = createStorage({ [APP_BUILD_STORAGE_KEY]: "old-build" });
  const sessionStorage = createStorage();

  const detected = detectAvailableAppUpdate({
    currentBuildId: "new-build",
    storage,
    sessionStorage,
  });

  assert.equal(detected.available, true);
  assert.equal(storage.getItem(APP_BUILD_STORAGE_KEY), "old-build");

  dismissAppUpdateNotice({
    currentBuildId: "new-build",
    sessionStorage,
  });

  assert.equal(sessionStorage.getItem(APP_BUILD_DISMISSED_KEY), "new-build");
  assert.equal(
    detectAvailableAppUpdate({
      currentBuildId: "new-build",
      storage,
      sessionStorage,
    }).available,
    false
  );
});

test("Update now accepts the current web build, reloads safely, and preserves session data", async () => {
  const storage = createStorage({
    [APP_BUILD_STORAGE_KEY]: "old-build",
    token: "still-authenticated",
    user: JSON.stringify({ id: "user-1" }),
  });
  let reloaded = false;

  const sessionStorage = createStorage();
  const result = await applyAppUpdateNow({
    currentBuildId: "new-build",
    storage,
    sessionStorage,
    capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
    serviceWorkerContainer: undefined,
    reload: () => {
      reloaded = true;
    },
  });

  assert.equal(result, "web_reload");
  assert.equal(reloaded, true);
  assert.equal(storage.getItem(APP_BUILD_STORAGE_KEY), "new-build");
  assert.equal(storage.getItem("token"), "still-authenticated");
  assert.equal(storage.getItem("user"), JSON.stringify({ id: "user-1" }));
  assert.equal(sessionStorage.getItem(APP_UPDATE_RELOAD_GUARD_KEY), "new-build");
});
