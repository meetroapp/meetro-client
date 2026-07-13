import { authFetch } from "./authFetch.js";
import { replaceMeetroSessionToken } from "./session.js";

export const CHANGE_PASSWORD_ENDPOINT = "/auth/change-password";
export const PASSWORD_CHANGE_TIMEOUT_MS = 12000;

export const ACCOUNT_SECURITY_FAILURE = Object.freeze({
  CURRENT_PASSWORD_REQUIRED: "CURRENT_PASSWORD_REQUIRED",
  NEW_PASSWORD_REQUIRED: "NEW_PASSWORD_REQUIRED",
  CONFIRM_PASSWORD_REQUIRED: "CONFIRM_PASSWORD_REQUIRED",
  PASSWORDS_DO_NOT_MATCH: "PASSWORDS_DO_NOT_MATCH",
  PASSWORD_POLICY_FAILED: "PASSWORD_POLICY_FAILED",
  PASSWORD_REUSE_NOT_ALLOWED: "PASSWORD_REUSE_NOT_ALLOWED",
  CURRENT_PASSWORD_INCORRECT: "CURRENT_PASSWORD_INCORRECT",
  SESSION_INVALID: "SESSION_INVALID",
  TOO_MANY_ATTEMPTS: "TOO_MANY_ATTEMPTS",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  PASSWORD_CHANGE_FAILED: "PASSWORD_CHANGE_FAILED",
  INVALID_RESPONSE: "INVALID_RESPONSE",
});

const BACKEND_FAILURES = new Set([
  "CURRENT_PASSWORD_REQUIRED",
  "NEW_PASSWORD_REQUIRED",
  "PASSWORD_POLICY_FAILED",
  "PASSWORD_REUSE_NOT_ALLOWED",
  "CURRENT_PASSWORD_INCORRECT",
  "AUTHENTICATION_REQUIRED",
  "SESSION_INVALID",
  "TOO_MANY_ATTEMPTS",
  "PASSWORD_CHANGE_FAILED",
]);

export function evaluatePasswordRequirements(password = "") {
  const value = typeof password === "string" ? password : "";

  return Object.freeze({
    minimumLength: value.length >= 10,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
  });
}

export function validatePasswordChangeInput(input = {}) {
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";
  const requirements = evaluatePasswordRequirements(newPassword);
  let failure = "";

  if (!currentPassword.trim()) {
    failure = ACCOUNT_SECURITY_FAILURE.CURRENT_PASSWORD_REQUIRED;
  } else if (!newPassword.trim()) {
    failure = ACCOUNT_SECURITY_FAILURE.NEW_PASSWORD_REQUIRED;
  } else if (!confirmPassword.trim()) {
    failure = ACCOUNT_SECURITY_FAILURE.CONFIRM_PASSWORD_REQUIRED;
  } else if (newPassword !== confirmPassword) {
    failure = ACCOUNT_SECURITY_FAILURE.PASSWORDS_DO_NOT_MATCH;
  } else if (newPassword === currentPassword) {
    failure = ACCOUNT_SECURITY_FAILURE.PASSWORD_REUSE_NOT_ALLOWED;
  } else if (!Object.values(requirements).every(Boolean)) {
    failure = ACCOUNT_SECURITY_FAILURE.PASSWORD_POLICY_FAILED;
  }

  return Object.freeze({
    valid: !failure,
    failure,
    requirements,
  });
}

export function isValidFreshToken(token) {
  if (typeof token !== "string" || token !== token.trim() || /\s/.test(token)) return false;
  const segments = token.split(".");
  return segments.length === 3 && segments.every((segment) => /^[A-Za-z0-9_-]+$/.test(segment));
}

export function normalizePasswordChangeFailure({ status = 0, code = "", networkError = false, timedOut = false } = {}) {
  if (timedOut || networkError || status === 0 || status === 404 || status === 503) {
    return ACCOUNT_SECURITY_FAILURE.SERVICE_UNAVAILABLE;
  }

  const normalizedCode = String(code || "").trim().toUpperCase();
  if (normalizedCode === "AUTHENTICATION_REQUIRED" || normalizedCode === "SESSION_INVALID") {
    return ACCOUNT_SECURITY_FAILURE.SESSION_INVALID;
  }
  if (BACKEND_FAILURES.has(normalizedCode)) return normalizedCode;
  if (status === 401 || status === 403 || status === 419) {
    return ACCOUNT_SECURITY_FAILURE.SESSION_INVALID;
  }
  return ACCOUNT_SECURITY_FAILURE.PASSWORD_CHANGE_FAILED;
}

export function getAccountSecurityCapabilities() {
  return Object.freeze({
    passwordChange: true,
    signOut: true,
    emailRecovery: false,
    twoFactorManagement: false,
    recoveryCodes: false,
    activeSessions: false,
    trustedDevices: false,
    revokeOtherSessions: false,
  });
}

export async function changeAccountPassword({
  currentPassword,
  newPassword,
  confirmPassword,
  authFetchImpl = authFetch,
  replaceTokenImpl = replaceMeetroSessionToken,
  timeoutMs = PASSWORD_CHANGE_TIMEOUT_MS,
} = {}) {
  const validation = validatePasswordChangeInput({ currentPassword, newPassword, confirmPassword });
  if (!validation.valid) return { ok: false, failure: validation.failure, validation };

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const result = await authFetchImpl(CHANGE_PASSWORD_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
      signal: controller?.signal,
      skipAuthExpirationHandling: true,
    });
    const response = result?.response || {};
    const data = result?.data || {};

    if (!response.ok) {
      const failure = normalizePasswordChangeFailure({ status: response.status, code: data.code });
      return { ok: false, failure, sessionExpired: failure === ACCOUNT_SECURITY_FAILURE.SESSION_INVALID };
    }

    if (data.success !== true || data.code !== "PASSWORD_CHANGED") {
      return { ok: false, failure: ACCOUNT_SECURITY_FAILURE.INVALID_RESPONSE };
    }

    if (!isValidFreshToken(data.token) || !replaceTokenImpl(data.token)) {
      return {
        ok: false,
        failure: ACCOUNT_SECURITY_FAILURE.SESSION_INVALID,
        sessionExpired: true,
      };
    }

    return { ok: true, code: "PASSWORD_CHANGED" };
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return {
      ok: false,
      failure: normalizePasswordChangeFailure({ networkError: !timedOut, timedOut }),
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
