import API_URL from "../api.js";

export const PASSWORD_RESET_REQUEST_ENDPOINT = "/auth/password-reset/request";
export const PASSWORD_RESET_COMPLETE_ENDPOINT = "/auth/password-reset/complete";
export const PASSWORD_RESET_TIMEOUT_MS = 12000;

export const PASSWORD_RESET_FAILURE = Object.freeze({
  EMAIL_REQUIRED: "EMAIL_REQUIRED",
  EMAIL_INVALID: "EMAIL_INVALID",
  TOKEN_INVALID: "TOKEN_INVALID",
  NEW_PASSWORD_REQUIRED: "NEW_PASSWORD_REQUIRED",
  CONFIRM_PASSWORD_REQUIRED: "CONFIRM_PASSWORD_REQUIRED",
  PASSWORDS_DO_NOT_MATCH: "PASSWORDS_DO_NOT_MATCH",
  PASSWORD_POLICY_FAILED: "PASSWORD_POLICY_FAILED",
  PASSWORD_REUSE_NOT_ALLOWED: "PASSWORD_REUSE_NOT_ALLOWED",
  RESET_LINK_INVALID: "RESET_LINK_INVALID",
  TOO_MANY_ATTEMPTS: "TOO_MANY_ATTEMPTS",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  REQUEST_FAILED: "REQUEST_FAILED",
  RESET_FAILED: "RESET_FAILED",
});

export function normalizePasswordResetEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

export function isValidPasswordResetEmail(email = "") {
  const normalizedEmail = normalizePasswordResetEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
}

export function buildPasswordResetRequest(email = "") {
  const normalizedEmail = normalizePasswordResetEmail(email);

  if (!normalizedEmail) {
    return { ok: false, email: "", errorCode: "email_required" };
  }

  if (!isValidPasswordResetEmail(normalizedEmail)) {
    return { ok: false, email: normalizedEmail, errorCode: "email_invalid" };
  }

  return { ok: true, email: normalizedEmail };
}

export function evaluateResetPasswordRequirements(password = "") {
  const value = typeof password === "string" ? password : "";
  return Object.freeze({
    minimumLength: value.length >= 10,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
  });
}

export function validatePasswordResetCompletion({ token, newPassword, confirmPassword } = {}) {
  const requirements = evaluateResetPasswordRequirements(newPassword);
  let failure = "";

  if (typeof token !== "string" || !token.trim() || /\s/.test(token)) {
    failure = PASSWORD_RESET_FAILURE.TOKEN_INVALID;
  } else if (!String(newPassword || "").trim()) {
    failure = PASSWORD_RESET_FAILURE.NEW_PASSWORD_REQUIRED;
  } else if (!String(confirmPassword || "").trim()) {
    failure = PASSWORD_RESET_FAILURE.CONFIRM_PASSWORD_REQUIRED;
  } else if (newPassword !== confirmPassword) {
    failure = PASSWORD_RESET_FAILURE.PASSWORDS_DO_NOT_MATCH;
  } else if (!Object.values(requirements).every(Boolean)) {
    failure = PASSWORD_RESET_FAILURE.PASSWORD_POLICY_FAILED;
  }

  return Object.freeze({ valid: !failure, failure, requirements });
}

function normalizeFailure({ status = 0, code = "", completing = false } = {}) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (normalizedCode === "TOO_MANY_ATTEMPTS" || status === 429) {
    return PASSWORD_RESET_FAILURE.TOO_MANY_ATTEMPTS;
  }
  if (normalizedCode === "PASSWORD_REUSE_NOT_ALLOWED") {
    return PASSWORD_RESET_FAILURE.PASSWORD_REUSE_NOT_ALLOWED;
  }
  if (normalizedCode === "PASSWORD_POLICY_FAILED") {
    return PASSWORD_RESET_FAILURE.PASSWORD_POLICY_FAILED;
  }
  if (
    completing &&
    ["RESET_TOKEN_REQUIRED", "RESET_TOKEN_INVALID", "RESET_TOKEN_EXPIRED", "RESET_TOKEN_USED"].includes(normalizedCode)
  ) {
    return PASSWORD_RESET_FAILURE.RESET_LINK_INVALID;
  }
  if (status === 0 || status === 404 || status >= 500) {
    return PASSWORD_RESET_FAILURE.SERVICE_UNAVAILABLE;
  }
  return completing ? PASSWORD_RESET_FAILURE.RESET_FAILED : PASSWORD_RESET_FAILURE.REQUEST_FAILED;
}

async function postPasswordReset(endpoint, body, { fetchImpl, apiUrl, timeoutMs, completing }) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(`${apiUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success !== true) {
      return { ok: false, failure: normalizeFailure({ status: response.status, code: data.code, completing }) };
    }
    return { ok: true, code: data.code };
  } catch (error) {
    return {
      ok: false,
      failure: PASSWORD_RESET_FAILURE.SERVICE_UNAVAILABLE,
      timedOut: error?.name === "AbortError",
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function requestPasswordReset({
  email,
  fetchImpl = fetch,
  apiUrl = API_URL,
  timeoutMs = PASSWORD_RESET_TIMEOUT_MS,
} = {}) {
  const request = buildPasswordResetRequest(email);
  if (!request.ok) {
    return {
      ok: false,
      failure: request.errorCode === "email_required"
        ? PASSWORD_RESET_FAILURE.EMAIL_REQUIRED
        : PASSWORD_RESET_FAILURE.EMAIL_INVALID,
    };
  }
  return postPasswordReset(
    PASSWORD_RESET_REQUEST_ENDPOINT,
    { email: request.email },
    { fetchImpl, apiUrl, timeoutMs, completing: false }
  );
}

export async function completePasswordReset({
  token,
  newPassword,
  confirmPassword,
  fetchImpl = fetch,
  apiUrl = API_URL,
  timeoutMs = PASSWORD_RESET_TIMEOUT_MS,
} = {}) {
  const validation = validatePasswordResetCompletion({ token, newPassword, confirmPassword });
  if (!validation.valid) return { ok: false, failure: validation.failure, validation };

  return postPasswordReset(
    PASSWORD_RESET_COMPLETE_ENDPOINT,
    { token, newPassword },
    { fetchImpl, apiUrl, timeoutMs, completing: true }
  );
}

export function capturePasswordResetToken({ locationImpl, historyImpl } = {}) {
  const locationValue = locationImpl || (typeof window !== "undefined" ? window.location : null);
  const historyValue = historyImpl || (typeof window !== "undefined" ? window.history : null);
  if (!locationValue) return "";

  const params = new URLSearchParams(locationValue.search || "");
  const token = params.get("token") || "";
  if (params.has("token") && historyValue?.replaceState) {
    params.delete("token");
    const query = params.toString();
    historyValue.replaceState(
      historyValue.state || null,
      "",
      `${locationValue.pathname || "/reset-password"}${query ? `?${query}` : ""}${locationValue.hash || ""}`
    );
  }
  return token;
}
