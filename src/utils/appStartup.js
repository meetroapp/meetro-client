export const STARTUP_READINESS = Object.freeze({
  restoring: "restoring",
  ready: "ready",
  unauthenticated: "unauthenticated",
  invalid: "invalid",
  public: "public",
});

export const STARTUP_DIAGNOSTIC_STEPS = Object.freeze([
  "session restored",
  "user ready",
  "business profile ready",
  "language ready",
  "companion ready",
  "routes ready",
  "app ready",
]);

export const APP_BUILD_STORAGE_KEY = "meetroAppBuildId";
export const APP_BUILD_DISMISSED_KEY = "meetroAppBuildNoticeDismissed";
export const APP_UPDATE_RELOAD_GUARD_KEY = "meetroAppUpdateReloading";

let activeUpdatePromise = null;

function safeStorageGet(storage, key, fallback = "") {
  try {
    return storage?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeStorageSet(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage can be unavailable in restricted browser or native contexts.
  }
}

function safeStorageRemove(storage, key) {
  try {
    storage?.removeItem(key);
  } catch {
    // Storage can be unavailable in restricted browser or native contexts.
  }
}

export function logStartupStep(step, options = {}) {
  if (!options.dev) return;
  if (!STARTUP_DIAGNOSTIC_STEPS.includes(step)) return;
  console.info(`[Meetro startup] ${step}`);
}

export function coordinateAppStartup({
  targetPage = "",
  hasToken = false,
  restoreSession,
  syncAccountMode,
  needsBusinessProfile = false,
  readBusinessProfile,
  readLanguage,
  companionEnabled = false,
  dev = false,
} = {}) {
  const steps = [];
  const recordStep = (step) => {
    steps.push(step);
    logStartupStep(step, { dev });
  };

  if (!hasToken) {
    recordStep("language ready");
    recordStep("routes ready");
    recordStep("app ready");
    return {
      status: STARTUP_READINESS.unauthenticated,
      steps,
      routeDecisionsSafe: true,
      session: { authenticated: false, isProfessional: false, repaired: false },
    };
  }

  const session = restoreSession?.(targetPage) || {
    authenticated: false,
    isProfessional: false,
    repaired: false,
  };

  if (!session.authenticated) {
    recordStep("session restored");
    return {
      status: STARTUP_READINESS.invalid,
      steps,
      routeDecisionsSafe: false,
      session,
    };
  }

  recordStep("session restored");
  recordStep("user ready");

  if (needsBusinessProfile) {
    readBusinessProfile?.();
  }
  recordStep("business profile ready");

  readLanguage?.();
  recordStep("language ready");

  if (companionEnabled) {
    recordStep("companion ready");
  } else {
    recordStep("companion ready");
  }

  syncAccountMode?.(targetPage);
  recordStep("routes ready");
  recordStep("app ready");

  return {
    status: STARTUP_READINESS.ready,
    steps,
    routeDecisionsSafe: true,
    session,
  };
}

export function getCurrentAppBuildId() {
  const env = import.meta.env || {};
  const envBuild =
    env.VITE_APP_BUILD_ID ||
    env.VITE_APP_VERSION ||
    "";
  const definedBuild = globalThis.__MEETRO_BUILD_ID__ || "";

  return String(envBuild || definedBuild || "development").trim();
}

export function detectAvailableAppUpdate({
  currentBuildId = getCurrentAppBuildId(),
  storage = globalThis.localStorage,
  sessionStorage = globalThis.sessionStorage,
} = {}) {
  const current = String(currentBuildId || "").trim();
  if (!current) return { available: false, currentBuildId: "" };

  const stored = safeStorageGet(storage, APP_BUILD_STORAGE_KEY, "");
  const dismissed = safeStorageGet(sessionStorage, APP_BUILD_DISMISSED_KEY, "");

  if (!stored) {
    safeStorageSet(storage, APP_BUILD_STORAGE_KEY, current);
    return { available: false, currentBuildId: current };
  }

  return {
    available: stored !== current && dismissed !== current,
    currentBuildId: current,
    previousBuildId: stored,
  };
}

export function dismissAppUpdateNotice({
  currentBuildId = getCurrentAppBuildId(),
  sessionStorage = globalThis.sessionStorage,
} = {}) {
  safeStorageSet(sessionStorage, APP_BUILD_DISMISSED_KEY, currentBuildId);
}

export function acceptCurrentAppBuild({
  currentBuildId = getCurrentAppBuildId(),
  storage = globalThis.localStorage,
} = {}) {
  safeStorageSet(storage, APP_BUILD_STORAGE_KEY, currentBuildId);
}

export function isNativeUpdateSurface(capacitor = globalThis.Capacitor) {
  return Boolean(
    capacitor?.isNativePlatform?.() || capacitor?.getPlatform?.() === "ios"
  );
}

function waitForServiceWorkerControllerChange(serviceWorkerContainer, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      serviceWorkerContainer?.removeEventListener?.("controllerchange", handleChange);
      callback();
    };
    const handleChange = () => finish(resolve);
    const timeoutId = setTimeout(
      () => finish(() => reject(new Error("update_controller_timeout"))),
      timeoutMs
    );

    serviceWorkerContainer?.addEventListener?.("controllerchange", handleChange, {
      once: true,
    });
  });
}

async function performAppUpdate({
  currentBuildId = getCurrentAppBuildId(),
  storage = globalThis.localStorage,
  sessionStorage = globalThis.sessionStorage,
  reload = () => globalThis.location?.reload?.(),
  capacitor = globalThis.Capacitor,
  serviceWorkerContainer = globalThis.navigator?.serviceWorker,
  serviceWorkerRegistration,
  controllerChangeTimeoutMs = 4000,
  nativeUpdateAction = globalThis.MeetroNative?.openAppUpdate,
} = {}) {
  if (safeStorageGet(sessionStorage, APP_UPDATE_RELOAD_GUARD_KEY, "") === currentBuildId) {
    return "reload_already_requested";
  }

  const reloadCurrentBuild = (result) => {
    const previousBuildId = safeStorageGet(storage, APP_BUILD_STORAGE_KEY, "");
    acceptCurrentAppBuild({ currentBuildId, storage });
    safeStorageSet(sessionStorage, APP_UPDATE_RELOAD_GUARD_KEY, currentBuildId);
    try {
      reload();
      return result;
    } catch (error) {
      if (previousBuildId) {
        safeStorageSet(storage, APP_BUILD_STORAGE_KEY, previousBuildId);
      } else {
        safeStorageRemove(storage, APP_BUILD_STORAGE_KEY);
      }
      safeStorageRemove(sessionStorage, APP_UPDATE_RELOAD_GUARD_KEY);
      throw error;
    }
  };

  if (isNativeUpdateSurface(capacitor)) {
    if (typeof nativeUpdateAction === "function") {
      await nativeUpdateAction();
      return "native_update_opened";
    }

    return reloadCurrentBuild("native_bundle_reload");
  }

  const registration =
    serviceWorkerRegistration ||
    (await serviceWorkerContainer?.getRegistration?.());

  if (registration?.waiting) {
    const controllerChange = waitForServiceWorkerControllerChange(
      serviceWorkerContainer,
      controllerChangeTimeoutMs
    );
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    await controllerChange;
  }

  return reloadCurrentBuild(
    registration?.waiting ? "service_worker_reload" : "web_reload"
  );
}

export function applyAppUpdateNow(options = {}) {
  if (activeUpdatePromise) return activeUpdatePromise;

  activeUpdatePromise = performAppUpdate(options).finally(() => {
    activeUpdatePromise = null;
  });

  return activeUpdatePromise;
}
