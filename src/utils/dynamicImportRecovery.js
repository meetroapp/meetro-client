export const DYNAMIC_IMPORT_RELOAD_GUARD_KEY =
  "meetroDynamicImportReloadAttemptAt";

export const DYNAMIC_IMPORT_RELOAD_COOLDOWN_MS = 30_000;

const DYNAMIC_IMPORT_FAILURE_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /chunkloaderror/i,
  /loading (?:css )?chunk\b.*\bfailed/i,
];

function getErrorMessage(error) {
  if (typeof error === "string") return error;
  return typeof error?.message === "string" ? error.message : "";
}

export function isDynamicImportFailure(error) {
  const message = getErrorMessage(error);
  return DYNAMIC_IMPORT_FAILURE_PATTERNS.some((pattern) => pattern.test(message));
}

export function attemptDynamicImportRecovery(
  error,
  {
    storage = globalThis.sessionStorage,
    reload = () => globalThis.location?.reload?.(),
    now = Date.now(),
    cooldownMs = DYNAMIC_IMPORT_RELOAD_COOLDOWN_MS,
  } = {}
) {
  if (!isDynamicImportFailure(error)) return false;
  if (
    typeof storage?.getItem !== "function" ||
    typeof storage?.setItem !== "function"
  ) {
    return false;
  }

  let previousAttempt;
  try {
    previousAttempt = Number(storage?.getItem(DYNAMIC_IMPORT_RELOAD_GUARD_KEY)) || 0;
  } catch {
    return false;
  }

  if (previousAttempt > 0 && now - previousAttempt < cooldownMs) {
    return false;
  }

  try {
    storage?.setItem(DYNAMIC_IMPORT_RELOAD_GUARD_KEY, String(now));
  } catch {
    return false;
  }

  try {
    reload();
    return true;
  } catch {
    try {
      storage?.removeItem(DYNAMIC_IMPORT_RELOAD_GUARD_KEY);
    } catch {
      // The existing route error boundary remains the truthful fallback.
    }
    return false;
  }
}
