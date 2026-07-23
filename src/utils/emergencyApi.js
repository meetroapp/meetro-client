import { authFetch } from "./authFetch.js";

export const EMERGENCY_API_ENDPOINTS = Object.freeze({
  createDraft: "/emergency-requests/drafts",
  request: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}`,
  safetyAssessment: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}/safety-assessment`,
  prepare: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}/prepare`,
  cancel: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}/cancel`,
});

export const EMERGENCY_CLIENT_ERROR = Object.freeze({
  INVALID_REQUEST_ID: "INVALID_EMERGENCY_REQUEST_ID",
  INVALID_TRANSPORT: "INVALID_EMERGENCY_TRANSPORT",
  NETWORK_FAILURE: "EMERGENCY_NETWORK_FAILURE",
  INVALID_RESPONSE: "INVALID_EMERGENCY_RESPONSE",
});

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeEmergencyRequestId(value) {
  const normalized = String(value ?? "").trim();

  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function buildEmergencyClientFailure({
  code,
  message,
  status = 0,
  data = {},
} = {}) {
  return {
    ok: false,
    status,
    code: String(code || EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE),
    message: String(
      message || "The Emergency request could not be processed."
    ),
    emergencyRequest: null,
    data: isRecord(data) ? data : {},
  };
}

export function normalizeEmergencyApiResult(result) {
  const response = result?.response;
  const data = isRecord(result?.data) ? result.data : {};
  const status = Number(response?.status || 0);
  const emergencyRequest = isRecord(data.emergencyRequest)
    ? data.emergencyRequest
    : null;

  if (!response || typeof response.ok !== "boolean") {
    return buildEmergencyClientFailure({
      code: EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE,
      message: "The Emergency service returned an invalid response.",
      status,
      data,
    });
  }

  if (!response.ok || data.success === false) {
    return buildEmergencyClientFailure({
      code:
        data.code ||
        data.error ||
        EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE,
      message:
        data.message ||
        "The Emergency request could not be processed.",
      status,
      data,
    });
  }

  if (data.success !== true || !emergencyRequest) {
    return buildEmergencyClientFailure({
      code: EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE,
      message:
        "The Emergency service did not return a canonical request.",
      status,
      data,
    });
  }

  return {
    ok: true,
    status,
    code: String(data.code || ""),
    message: String(data.message || ""),
    emergencyRequest,
    data,
  };
}

async function executeEmergencyRequest({
  endpoint,
  method = "GET",
  body,
  authFetchImpl = authFetch,
  setPage,
}) {
  if (typeof authFetchImpl !== "function") {
    return buildEmergencyClientFailure({
      code: EMERGENCY_CLIENT_ERROR.INVALID_TRANSPORT,
      message: "The authenticated Emergency transport is unavailable.",
    });
  }

  const options = {
    method,
    cache: "no-store",
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  try {
    const result = await authFetchImpl(endpoint, options, setPage);
    return normalizeEmergencyApiResult(result);
  } catch {
    return buildEmergencyClientFailure({
      code: EMERGENCY_CLIENT_ERROR.NETWORK_FAILURE,
      message: "The Emergency service could not be reached.",
    });
  }
}

function invalidEmergencyRequestIdResult() {
  return buildEmergencyClientFailure({
    code: EMERGENCY_CLIENT_ERROR.INVALID_REQUEST_ID,
    message: "A valid Emergency request ID is required.",
    status: 400,
  });
}

export function createEmergencyDraft(
  payload,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.createDraft,
    method: "POST",
    body: payload,
    authFetchImpl,
    setPage,
  });
}

export function getEmergencyRequest(
  emergencyRequestId,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.request(normalizedId),
    method: "GET",
    authFetchImpl,
    setPage,
  });
}

export function updateEmergencyDraft(
  emergencyRequestId,
  payload,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.request(normalizedId),
    method: "PATCH",
    body: payload,
    authFetchImpl,
    setPage,
  });
}

export function saveEmergencySafetyAssessment(
  emergencyRequestId,
  payload,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  return executeEmergencyRequest({
    endpoint:
      EMERGENCY_API_ENDPOINTS.safetyAssessment(normalizedId),
    method: "POST",
    body: payload,
    authFetchImpl,
    setPage,
  });
}

export function prepareEmergencyRequest(
  emergencyRequestId,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.prepare(normalizedId),
    method: "POST",
    authFetchImpl,
    setPage,
  });
}

export function cancelEmergencyRequest(
  emergencyRequestId,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.cancel(normalizedId),
    method: "POST",
    authFetchImpl,
    setPage,
  });
}
