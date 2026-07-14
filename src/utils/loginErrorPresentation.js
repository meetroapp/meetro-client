export const LOGIN_FAILURE = Object.freeze({
  ACCOUNT_SERVICE_UNAVAILABLE: "account_service_unavailable",
  ACCOUNT_ALREADY_EXISTS: "account_already_exists",
  INVALID_CREDENTIALS: "invalid_credentials",
  PASSWORD_POLICY_FAILED: "password_policy_failed",
  TOO_MANY_ATTEMPTS: "too_many_attempts",
  UNEXPECTED_RESPONSE: "unexpected_response",
});

export function normalizeLoginFailure({
  status = 0,
  mode = "login",
  code = "",
  networkError = false,
  malformedResponse = false,
} = {}) {
  if (mode === "signup" && String(code).trim().toUpperCase() === "PASSWORD_POLICY_FAILED") {
    return LOGIN_FAILURE.PASSWORD_POLICY_FAILED;
  }
  if (networkError) return LOGIN_FAILURE.ACCOUNT_SERVICE_UNAVAILABLE;
  if (malformedResponse) return LOGIN_FAILURE.UNEXPECTED_RESPONSE;
  if (status === 429) return LOGIN_FAILURE.TOO_MANY_ATTEMPTS;
  if (mode === "login" && status === 401) {
    return LOGIN_FAILURE.INVALID_CREDENTIALS;
  }
  if (mode === "signup" && status === 409) {
    return LOGIN_FAILURE.ACCOUNT_ALREADY_EXISTS;
  }
  if (status >= 500 || status === 0) {
    return LOGIN_FAILURE.ACCOUNT_SERVICE_UNAVAILABLE;
  }
  return LOGIN_FAILURE.UNEXPECTED_RESPONSE;
}
