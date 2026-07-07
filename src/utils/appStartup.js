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

export function isNativeUpdateSurface() {
  return Boolean(
    globalThis.Capacitor?.isNativePlatform?.() ||
      globalThis.Capacitor?.getPlatform?.() === "ios"
  );
}

export function applyAppUpdateNow({
  currentBuildId = getCurrentAppBuildId(),
  storage = globalThis.localStorage,
  reload = () => globalThis.location?.reload?.(),
  notifyNativeUpdate,
} = {}) {
  if (isNativeUpdateSurface()) {
    if (globalThis.MeetroNative?.openAppUpdate) {
      globalThis.MeetroNative.openAppUpdate();
      return "native_update_opened";
    }

    notifyNativeUpdate?.();
    return "native_update_instruction";
  }

  acceptCurrentAppBuild({ currentBuildId, storage });
  reload();
  return "web_reload";
}
