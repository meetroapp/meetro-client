import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  APP_BUILD_STORAGE_KEY,
  APP_UPDATE_RELOAD_GUARD_KEY,
  applyAppUpdateNow,
} from "../src/utils/appStartup.js";
import { getAppLayoutSnapshot } from "../src/utils/appLayout.js";
import { getCommunicationLayout } from "../src/utils/communicationLayout.js";

const messagesSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function layoutAt(width) {
  return getAppLayoutSnapshot({
    windowObject: { innerWidth: width, innerHeight: 900 },
    documentObject: {
      documentElement: { clientWidth: width, clientHeight: 900 },
    },
    capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
  });
}

function createServiceWorkerContainer() {
  const listeners = new Set();
  return {
    addEventListener(type, listener) {
      if (type === "controllerchange") listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "controllerchange") listeners.delete(listener);
    },
    dispatchControllerChange() {
      for (const listener of [...listeners]) listener();
    },
  };
}

test("Communication Center uses post-sidebar width for iPad and desktop columns", () => {
  const portrait = getCommunicationLayout(layoutAt(768));
  const landscape = getCommunicationLayout(layoutAt(1180));
  const desktop = getCommunicationLayout(layoutAt(1440));
  const phone = getCommunicationLayout(layoutAt(390));

  assert.deepEqual([portrait.mode, portrait.columns, portrait.contextMode], ["mobile", 1, "mobile"]);
  assert.deepEqual([landscape.mode, landscape.columns, landscape.contextMode], ["desktop", 2, "inline"]);
  assert.deepEqual([desktop.mode, desktop.columns, desktop.contextMode], ["desktop", 3, "column"]);
  assert.deepEqual([phone.mode, phone.columns, phone.contextMode], ["mobile", 1, "mobile"]);
  assert.equal(landscape.contentWidth, 896);
});

test("Communication Center keeps every desktop composition bounded and context reachable", () => {
  assert.match(messagesSource, /data-communication-layout=/);
  assert.match(messagesSource, /data-communication-context-mode=/);
  assert.match(messagesSource, /data-communication-columns=/);
  assert.match(messagesSource, /gridTemplateColumns: "minmax\(220px, 0\.38fr\) minmax\(0, 0\.62fr\)"/);
  assert.match(messagesSource, /width: "100%",\n\s*maxWidth: "100%",\n\s*minWidth: 0,[\s\S]*const workspaceContextPane/);
  assert.match(messagesSource, /aria-controls="communication-inline-context"/);
  assert.match(messagesSource, /compactContextOpen && \(/);
  assert.match(messagesSource, /const appLayoutMetrics = useAppLayoutMetrics\(\)/);
  assert.match(messagesSource, /getCommunicationLayout\(appLayoutMetrics\)/);
  assert.doesNotMatch(messagesSource, /addEventListener\("orientationchange"/);
  assert.doesNotMatch(messagesSource, /gridTemplateColumns:\s*"minmax\(280px[\s\S]{0,100}layout\.layoutWidth >= 1180/);
});

test("web update activates a waiting service worker and reloads exactly once", async () => {
  const storage = createStorage({ [APP_BUILD_STORAGE_KEY]: "old", token: "session" });
  const sessionStorage = createStorage();
  const serviceWorkerContainer = createServiceWorkerContainer();
  let messages = 0;
  let reloads = 0;
  const registration = {
    waiting: {
      postMessage(message) {
        messages += 1;
        assert.deepEqual(message, { type: "SKIP_WAITING" });
        queueMicrotask(() => serviceWorkerContainer.dispatchControllerChange());
      },
    },
  };

  const result = await applyAppUpdateNow({
    currentBuildId: "new",
    storage,
    sessionStorage,
    capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
    serviceWorkerContainer,
    serviceWorkerRegistration: registration,
    reload: () => {
      reloads += 1;
    },
  });

  assert.equal(result, "service_worker_reload");
  assert.equal(messages, 1);
  assert.equal(reloads, 1);
  assert.equal(storage.getItem("token"), "session");
});

test("native build mismatch uses bundled-content reload without inventing an App Store URL", async () => {
  const storage = createStorage({ [APP_BUILD_STORAGE_KEY]: "old", token: "session" });
  const sessionStorage = createStorage();
  let reloads = 0;

  const result = await applyAppUpdateNow({
    currentBuildId: "new",
    storage,
    sessionStorage,
    capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
    nativeUpdateAction: undefined,
    reload: () => {
      reloads += 1;
    },
  });

  assert.equal(result, "native_bundle_reload");
  assert.equal(reloads, 1);
  assert.equal(storage.getItem("token"), "session");
  assert.doesNotMatch(appSource, /apps\.apple\.com|itunes\.apple\.com/);
});

test("duplicate update taps share one operation and failed reload remains retryable", async () => {
  const storage = createStorage({ [APP_BUILD_STORAGE_KEY]: "old", token: "session" });
  const sessionStorage = createStorage();
  let resolveRegistration;
  const serviceWorkerContainer = {
    getRegistration: () => new Promise((resolve) => {
      resolveRegistration = resolve;
    }),
  };
  let reloads = 0;
  const options = {
    currentBuildId: "new",
    storage,
    sessionStorage,
    capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
    serviceWorkerContainer,
    reload: () => {
      reloads += 1;
    },
  };

  const first = applyAppUpdateNow(options);
  const second = applyAppUpdateNow(options);
  assert.equal(first, second);
  resolveRegistration(undefined);
  await first;
  assert.equal(reloads, 1);

  const retryStorage = createStorage({ [APP_BUILD_STORAGE_KEY]: "old", token: "session" });
  const retrySession = createStorage();
  await assert.rejects(
    applyAppUpdateNow({
      currentBuildId: "newer",
      storage: retryStorage,
      sessionStorage: retrySession,
      capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
      serviceWorkerContainer: undefined,
      reload: () => {
        throw new Error("reload unavailable");
      },
    }),
    /reload unavailable/
  );
  assert.equal(retryStorage.getItem(APP_BUILD_STORAGE_KEY), "old");
  assert.equal(retryStorage.getItem("token"), "session");
  assert.equal(retrySession.getItem(APP_UPDATE_RELOAD_GUARD_KEY), null);
});

test("update notice exposes progress failure and temporary Later behavior", () => {
  assert.match(appSource, /disabled=\{updating\}/);
  assert.match(appSource, /aria-busy=\{updating\}/);
  assert.match(appSource, /Updating…/);
  assert.match(appSource, /if \(updateActionState\.status === "updating"\) return/);
  assert.match(appSource, /await new Promise\(\(resolve\) => window\.requestAnimationFrame\(resolve\)\)/);
  assert.match(appSource, /The update could not be completed\. Please try again\./);
  assert.match(appSource, /dismissAppUpdateNotice/);
  assert.doesNotMatch(appSource, /localStorage\.clear|removeItem\("token"\)/);
});
