import { authFetch } from "./authFetch.js";
import {
  CANONICAL_ALERT_CATEGORIES,
  CANONICAL_ALERT_LIFECYCLES,
  CANONICAL_ALERT_PRIORITIES,
  normalizeAlertCountsResponse,
  normalizeAlertListResponse,
  normalizeAlertMutationResponse,
  normalizeAlertReadAllResponse,
} from "./canonicalAlert.js";

const CATEGORY_SET = new Set(CANONICAL_ALERT_CATEGORIES);
const PRIORITY_SET = new Set(CANONICAL_ALERT_PRIORITIES);
const LIFECYCLE_SET = new Set(CANONICAL_ALERT_LIFECYCLES);
const MAX_SAFE_ALERT_ERROR_MESSAGE_LENGTH = 400;
const MAX_BACKEND_ERROR_CODE_LENGTH = 128;
const BACKEND_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const ALERT_ERROR_MARKUP_PATTERN =
  /<\s*(?:\/\s*)?[A-Za-z][A-Za-z0-9:-]*(?:\s|\/?>|$)|<\s*(?:!|\?)/;

export const ALERT_API_ERROR_KINDS = Object.freeze({
  AUTHENTICATION: "authentication",
  VALIDATION: "validation",
  NOT_FOUND: "not_found",
  CONFLICT: "conflict",
  SERVER: "server",
  NETWORK: "network",
  MALFORMED_RESPONSE: "malformed_response",
});

export class AlertApiError extends Error {
  constructor({
    status = 0,
    code = "ALERT_REQUEST_FAILED",
    message = "The alert operation could not be completed.",
    operation = "unknown",
    kind = ALERT_API_ERROR_KINDS.SERVER,
    retryable = false,
  } = {}) {
    super(message);
    this.name = "AlertApiError";
    this.status = status;
    this.code = code;
    this.operation = operation;
    this.kind = kind;
    this.retryable = retryable;
  }
}

function hasUnsafeControlCharacter(value) {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint <= 8 ||
      codePoint === 11 ||
      codePoint === 12 ||
      (codePoint >= 14 && codePoint <= 31) ||
      (codePoint >= 127 && codePoint <= 159)
    ) {
      return true;
    }
  }
  return false;
}

function safeBackendMessage(value) {
  const fallback = "The alert operation could not be completed.";
  if (typeof value !== "string") return fallback;

  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > MAX_SAFE_ALERT_ERROR_MESSAGE_LENGTH ||
    hasUnsafeControlCharacter(normalized) ||
    ALERT_ERROR_MARKUP_PATTERN.test(normalized)
  ) {
    return fallback;
  }

  return normalized;
}

function safeBackendCode(value) {
  return typeof value === "string" &&
    value.length <= MAX_BACKEND_ERROR_CODE_LENGTH &&
    BACKEND_ERROR_CODE_PATTERN.test(value)
    ? value
    : "ALERT_REQUEST_FAILED";
}

function classifyStatus(status) {
  if (status === 401) return ALERT_API_ERROR_KINDS.AUTHENTICATION;
  if (status === 400 || status === 422) {
    return ALERT_API_ERROR_KINDS.VALIDATION;
  }
  if (status === 404) return ALERT_API_ERROR_KINDS.NOT_FOUND;
  if (status === 409) return ALERT_API_ERROR_KINDS.CONFLICT;
  return ALERT_API_ERROR_KINDS.SERVER;
}

function requestFailure({ response, data, operation }) {
  const status = Number.isInteger(response?.status) ? response.status : 0;
  const kind = classifyStatus(status);
  return new AlertApiError({
    status,
    code: safeBackendCode(data?.code),
    message: safeBackendMessage(data?.message),
    operation,
    kind,
    retryable: status >= 500,
  });
}

function invalidInput(operation, code, message) {
  return new AlertApiError({
    status: 400,
    code,
    message,
    operation,
    kind: ALERT_API_ERROR_KINDS.VALIDATION,
    retryable: false,
  });
}

function malformedResponse(operation) {
  return new AlertApiError({
    status: 502,
    code: "INVALID_ALERT_RESPONSE",
    message: "The server returned an invalid alert response.",
    operation,
    kind: ALERT_API_ERROR_KINDS.MALFORMED_RESPONSE,
    retryable: true,
  });
}

async function requestAlert({
  endpoint,
  options,
  operation,
  normalize,
  setPage,
  authFetchImpl,
}) {
  let result;
  try {
    result = await authFetchImpl(endpoint, options, setPage);
  } catch {
    throw new AlertApiError({
      status: 0,
      code: "ALERT_NETWORK_FAILURE",
      message: "Alerts could not be reached.",
      operation,
      kind: ALERT_API_ERROR_KINDS.NETWORK,
      retryable: true,
    });
  }

  const { response, data } = result || {};
  if (!response?.ok || data?.success !== true) {
    throw requestFailure({ response, data, operation });
  }

  const normalized = normalize(data);
  if (!normalized) throw malformedResponse(operation);
  return normalized;
}

function normalizeListQuery(query, operation) {
  if (!query || typeof query !== "object" || Array.isArray(query)) {
    throw invalidInput(
      operation,
      "INVALID_ALERT_QUERY",
      "Alert query is invalid."
    );
  }

  const params = new URLSearchParams();
  if (query.limit !== undefined && query.limit !== null) {
    if (
      !Number.isSafeInteger(query.limit) ||
      query.limit < 1 ||
      query.limit > 50
    ) {
      throw invalidInput(
        operation,
        "INVALID_ALERT_QUERY",
        "Alert limit must be between 1 and 50."
      );
    }
    params.set("limit", String(query.limit));
  }

  if (query.cursor !== undefined && query.cursor !== null) {
    if (
      typeof query.cursor !== "string" ||
      query.cursor.length < 1 ||
      query.cursor.length > 1024
    ) {
      throw invalidInput(
        operation,
        "INVALID_ALERT_CURSOR",
        "Alert cursor is invalid."
      );
    }
    params.set("cursor", query.cursor);
  }

  const enumFilters = [
    ["category", CATEGORY_SET, "INVALID_ALERT_CATEGORY"],
    ["priority", PRIORITY_SET, "INVALID_ALERT_PRIORITY"],
    ["lifecycle", LIFECYCLE_SET, "INVALID_ALERT_LIFECYCLE"],
  ];
  for (const [field, values, code] of enumFilters) {
    if (query[field] === undefined || query[field] === null) continue;
    if (!values.has(query[field])) {
      throw invalidInput(operation, code, `Alert ${field} is invalid.`);
    }
    params.set(field, query[field]);
  }

  if (query.unread !== undefined && query.unread !== null) {
    if (typeof query.unread !== "boolean") {
      throw invalidInput(
        operation,
        "INVALID_ALERT_UNREAD_FILTER",
        "Alert unread filter is invalid."
      );
    }
    params.set("unread", String(query.unread));
  }

  return params.toString();
}

function normalizeAlertIdForPath(value, operation) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throw invalidInput(
      operation,
      "INVALID_ALERT_ID",
      "Alert ID is invalid."
    );
  }
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 1) {
    throw invalidInput(
      operation,
      "INVALID_ALERT_ID",
      "Alert ID is invalid."
    );
  }
  return value;
}

export function fetchAlerts(
  query = {},
  { setPage, authFetchImpl = authFetch } = {}
) {
  const operation = "fetch_alerts";
  const queryString = normalizeListQuery(query, operation);
  return requestAlert({
    endpoint: `/alerts${queryString ? `?${queryString}` : ""}`,
    options: { method: "GET", cache: "no-store" },
    operation,
    normalize: normalizeAlertListResponse,
    setPage,
    authFetchImpl,
  });
}

export function fetchAlertCounts({ setPage, authFetchImpl = authFetch } = {}) {
  return requestAlert({
    endpoint: "/alerts/counts",
    options: { method: "GET", cache: "no-store" },
    operation: "fetch_alert_counts",
    normalize: normalizeAlertCountsResponse,
    setPage,
    authFetchImpl,
  });
}

export function markAllAlertsRead({
  category,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const operation = "mark_all_alerts_read";
  if (category !== undefined && category !== null && !CATEGORY_SET.has(category)) {
    throw invalidInput(
      operation,
      "INVALID_ALERT_CATEGORY",
      "Alert category is invalid."
    );
  }
  const body = category === undefined || category === null ? {} : { category };
  return requestAlert({
    endpoint: "/alerts/read-all",
    options: { method: "POST", body: JSON.stringify(body) },
    operation,
    normalize: normalizeAlertReadAllResponse,
    setPage,
    authFetchImpl,
  });
}

export function markAlertRead(
  alertId,
  { setPage, authFetchImpl = authFetch } = {}
) {
  const operation = "mark_alert_read";
  const normalizedId = normalizeAlertIdForPath(alertId, operation);
  return requestAlert({
    endpoint: `/alerts/${normalizedId}/read`,
    options: { method: "POST", body: JSON.stringify({}) },
    operation,
    normalize: (data) =>
      normalizeAlertMutationResponse(data, "ALERT_MARKED_READ"),
    setPage,
    authFetchImpl,
  });
}

export function dismissAlert(
  alertId,
  { setPage, authFetchImpl = authFetch } = {}
) {
  const operation = "dismiss_alert";
  const normalizedId = normalizeAlertIdForPath(alertId, operation);
  return requestAlert({
    endpoint: `/alerts/${normalizedId}/dismiss`,
    options: { method: "POST", body: JSON.stringify({}) },
    operation,
    normalize: (data) =>
      normalizeAlertMutationResponse(data, "ALERT_DISMISSED"),
    setPage,
    authFetchImpl,
  });
}
