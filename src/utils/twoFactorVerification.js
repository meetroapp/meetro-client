export const VERIFY_TWO_FACTOR_ENDPOINT = "/auth/verify-2fa-code";
export const REQUEST_TWO_FACTOR_ENDPOINT = "/auth/request-2fa-code";

export const TWO_FACTOR_FAILURE = Object.freeze({
  INVALID_CODE: "invalid_code",
  CODE_EXPIRED: "code_expired",
  VERIFICATION_TIMED_OUT: "verification_timed_out",
  TOO_MANY_ATTEMPTS: "too_many_attempts",
  SESSION_EXPIRED: "session_expired",
  NETWORK_PROBLEM: "network_problem",
  SERVICE_UNAVAILABLE: "service_unavailable",
});

function normalizeToken(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function firstValue(...values) {
  return values
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";
}

function getResponseCode(data = {}) {
  return normalizeToken(
    firstValue(
      data.code,
      data.errorCode,
      data.error_code,
      data.reason,
      data.type,
      data.status
    )
  );
}

function getResponseMessage(data = {}) {
  return String(
    firstValue(data.message, data.error, data.detail, data.description)
  ).trim();
}

export function normalizeTwoFactorFailure({ status = 0, data = {}, networkError = false } = {}) {
  if (networkError) return TWO_FACTOR_FAILURE.NETWORK_PROBLEM;

  const responseCode = getResponseCode(data);
  const message = getResponseMessage(data);
  const normalizedMessage = normalizeToken(message);
  const combined = `${responseCode} ${normalizedMessage}`.trim();

  if (
    status === 408 ||
    combined.includes("verification_timeout") ||
    combined.includes("verification_timed_out") ||
    combined.includes("request_timeout") ||
    combined.includes("timed_out")
  ) {
    return TWO_FACTOR_FAILURE.VERIFICATION_TIMED_OUT;
  }

  if (
    status === 410 ||
    combined.includes("code_expired") ||
    combined.includes("expired_code") ||
    combined.includes("verification_code_expired") ||
    (combined.includes("code") && combined.includes("expired"))
  ) {
    return TWO_FACTOR_FAILURE.CODE_EXPIRED;
  }

  if (
    status === 401 ||
    status === 403 ||
    status === 419 ||
    combined.includes("invalid_session") ||
    combined.includes("session_invalid") ||
    combined.includes("verification_session_invalid") ||
    combined.includes("missing_token") ||
    combined.includes("invalid_token") ||
    combined.includes("session_expired") ||
    combined.includes("login_expired") ||
    combined.includes("token_expired") ||
    combined.includes("challenge_invalid") ||
    combined.includes("invalid_challenge") ||
    combined.includes("challenge_expired") ||
    combined.includes("challenge_not_found") ||
    combined.includes("challenge_context_required") ||
    combined.includes("session_timed_out")
  ) {
    return TWO_FACTOR_FAILURE.SESSION_EXPIRED;
  }

  if (
    status === 429 ||
    combined.includes("too_many_attempts") ||
    combined.includes("attempts_exceeded") ||
    combined.includes("max_attempts") ||
    combined.includes("rate_limited") ||
    combined.includes("locked_out")
  ) {
    return TWO_FACTOR_FAILURE.TOO_MANY_ATTEMPTS;
  }

  if (
    combined.includes("invalid_code") ||
    combined.includes("incorrect_code") ||
    combined.includes("wrong_code") ||
    combined.includes("code_incorrect") ||
    normalizedMessage === "invalid_code" ||
    normalizedMessage === "incorrect_code"
  ) {
    return TWO_FACTOR_FAILURE.INVALID_CODE;
  }

  if (status === 0) return TWO_FACTOR_FAILURE.NETWORK_PROBLEM;

  return TWO_FACTOR_FAILURE.SERVICE_UNAVAILABLE;
}

export function buildTwoFactorPayload({ code, email, pendingData = {}, session = {} } = {}) {
  const user = pendingData.user || {};
  const verificationSessionId = firstValue(
    session.verificationSessionId,
    session.verification_session_id,
    pendingData.verificationSessionId,
    pendingData.verification_session_id,
    pendingData.twoFactorSessionId,
    pendingData.two_factor_session_id,
    pendingData.sessionId,
    pendingData.session_id
  );
  const challengeId = firstValue(
    session.challengeId,
    session.challenge_id,
    pendingData.challengeId,
    pendingData.challenge_id,
    pendingData.twoFactorChallengeId,
    pendingData.two_factor_challenge_id
  );
  const verificationToken = firstValue(
    session.verificationToken,
    session.verification_token,
    pendingData.verificationToken,
    pendingData.verification_token,
    pendingData.twoFactorToken,
    pendingData.two_factor_token,
    pendingData.mfaToken,
    pendingData.mfa_token
  );

  return {
    email: firstValue(user.email, pendingData.email, session.email, email),
    code: String(code || "").trim(),
    verificationSessionId,
    verification_session_id: verificationSessionId,
    challengeId,
    challenge_id: challengeId,
    verificationToken,
    verification_token: verificationToken,
    loginToken: firstValue(pendingData.loginToken, pendingData.login_token),
  };
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function verifyTwoFactorCode({
  apiUrl,
  code,
  email,
  pendingData = {},
  session = {},
  fetchImpl = fetch,
} = {}) {
  const payload = buildTwoFactorPayload({ code, email, pendingData, session });

  try {
    const response = await fetchImpl(`${apiUrl}${VERIFY_TWO_FACTOR_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await readJsonSafely(response);

    if (!response.ok) {
      return {
        ok: false,
        failure: normalizeTwoFactorFailure({ status: response.status, data }),
        status: response.status,
        data,
      };
    }

    return {
      ok: true,
      data,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      failure: normalizeTwoFactorFailure({ networkError: true }),
      error,
      payload,
    };
  }
}

export async function requestTwoFactorCode({
  apiUrl,
  email,
  pendingData = {},
  session = {},
  fetchImpl = fetch,
} = {}) {
  const context = buildTwoFactorPayload({
    email,
    pendingData,
    session,
  });
  const payload = {
    email: context.email,
    challengeId: context.challengeId,
  };

  if (!payload.email || !payload.challengeId) {
    return {
      ok: false,
      failure: TWO_FACTOR_FAILURE.SESSION_EXPIRED,
      payload,
    };
  }

  try {
    const response = await fetchImpl(
      `${apiUrl}${REQUEST_TWO_FACTOR_ENDPOINT}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await readJsonSafely(response);
    const retryAfterSeconds = Math.max(
      0,
      Number(data.retryAfterSeconds || 0) || 0
    );

    if (!response.ok) {
      return {
        ok: false,
        failure: normalizeTwoFactorFailure({
          status: response.status,
          data,
        }),
        status: response.status,
        retryAfterSeconds,
        data,
        payload,
      };
    }

    return {
      ok: true,
      status: response.status,
      retryAfterSeconds: retryAfterSeconds || 60,
      data,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      failure: TWO_FACTOR_FAILURE.NETWORK_PROBLEM,
      error,
      payload,
    };
  }
}
