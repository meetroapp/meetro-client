import { authFetch } from "./authFetch.js";

const CONVERSATION_READ_OPERATION = "mark_canonical_conversation_read";
const MAX_SAFE_ERROR_MESSAGE_LENGTH = 400;
const MAX_BACKEND_ERROR_CODE_LENGTH = 128;
const BACKEND_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const ERROR_MARKUP_PATTERN =
  /<\s*(?:\/\s*)?[A-Za-z][A-Za-z0-9:-]*(?:\s|\/?>|$)|<\s*(?:!|\?)/;

export const CONVERSATION_READ_API_ERROR_KINDS = Object.freeze({
  AUTHENTICATION: "authentication",
  VALIDATION: "validation",
  NOT_FOUND: "not_found",
  SERVER: "server",
  NETWORK: "network",
  MALFORMED_RESPONSE: "malformed_response",
});

export class ConversationReadApiError extends Error {
  constructor({
    status = 0,
    code = "CONVERSATION_READ_FAILED",
    message = "The conversation read state could not be updated.",
    kind = CONVERSATION_READ_API_ERROR_KINDS.SERVER,
    retryable = false,
  } = {}) {
    super(message);
    this.name = "ConversationReadApiError";
    this.status = status;
    this.code = code;
    this.kind = kind;
    this.retryable = retryable;
    this.operation = CONVERSATION_READ_OPERATION;
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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
  const fallback = "The conversation read state could not be updated.";
  if (typeof value !== "string") return fallback;

  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > MAX_SAFE_ERROR_MESSAGE_LENGTH ||
    hasUnsafeControlCharacter(normalized) ||
    ERROR_MARKUP_PATTERN.test(normalized)
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
    : "CONVERSATION_READ_FAILED";
}

function classifyStatus(status) {
  if (status === 401) return CONVERSATION_READ_API_ERROR_KINDS.AUTHENTICATION;
  if (status === 400 || status === 422) {
    return CONVERSATION_READ_API_ERROR_KINDS.VALIDATION;
  }
  if (status === 404) return CONVERSATION_READ_API_ERROR_KINDS.NOT_FOUND;
  return CONVERSATION_READ_API_ERROR_KINDS.SERVER;
}

function invalidInput() {
  return new ConversationReadApiError({
    status: 400,
    code: "INVALID_CONVERSATION_ID",
    message: "A valid conversation ID is required.",
    kind: CONVERSATION_READ_API_ERROR_KINDS.VALIDATION,
    retryable: false,
  });
}

function invalidOptions() {
  return new ConversationReadApiError({
    status: 400,
    code: "INVALID_CONVERSATION_READ_OPTIONS",
    message: "Conversation read options are invalid.",
    kind: CONVERSATION_READ_API_ERROR_KINDS.VALIDATION,
    retryable: false,
  });
}

function requestFailure({ response, data }) {
  const status = Number.isInteger(response?.status) ? response.status : 0;
  return new ConversationReadApiError({
    status,
    code: safeBackendCode(data?.code ?? data?.error),
    message: safeBackendMessage(data?.message),
    kind: classifyStatus(status),
    retryable: status >= 500,
  });
}

function networkFailure() {
  return new ConversationReadApiError({
    status: 0,
    code: "CONVERSATION_READ_NETWORK_FAILURE",
    message: "The conversation read service could not be reached.",
    kind: CONVERSATION_READ_API_ERROR_KINDS.NETWORK,
    retryable: true,
  });
}

function malformedResponse() {
  return new ConversationReadApiError({
    status: 502,
    code: "INVALID_CONVERSATION_READ_RESPONSE",
    message: "The server returned an invalid conversation read response.",
    kind: CONVERSATION_READ_API_ERROR_KINDS.MALFORMED_RESPONSE,
    retryable: true,
  });
}

function normalizeCanonicalConversationId(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function normalizeOptions(value) {
  if (value === undefined) {
    return { setPage: undefined, authFetchImpl: authFetch };
  }
  if (!isPlainObject(value)) throw invalidOptions();

  const allowedKeys = new Set(["setPage", "authFetchImpl"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw invalidOptions();
  }

  const authFetchImpl =
    value.authFetchImpl === undefined ? authFetch : value.authFetchImpl;
  return { setPage: value.setPage, authFetchImpl };
}

function normalizeReadMessageId(value) {
  if (value === null) return { valid: true, value: null };
  return Number.isSafeInteger(value) && value > 0
    ? { valid: true, value }
    : { valid: false, value: null };
}

function normalizeIsoTimestamp(value) {
  if (value === null) return { valid: true, value: null };
  if (typeof value !== "string" || value.length === 0) {
    return { valid: false, value: null };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    return { valid: false, value: null };
  }

  return { valid: true, value };
}

export function normalizeCanonicalConversationReadResponse(
  data,
  requestedConversationId
) {
  if (!isPlainObject(data)) return null;
  if (data.success !== true) return null;
  if (data.code !== "CONVERSATION_MARKED_READ") return null;

  const conversationId = normalizeCanonicalConversationId(data.conversationId);
  if (!conversationId || conversationId !== requestedConversationId) {
    return null;
  }

  if (!isPlainObject(data.readState)) return null;
  const lastReadMessageId = normalizeReadMessageId(
    data.readState.lastReadMessageId
  );
  const lastReadAt = normalizeIsoTimestamp(data.readState.lastReadAt);
  if (!lastReadMessageId.valid || !lastReadAt.valid) return null;

  return {
    conversationId,
    readState: {
      lastReadMessageId: lastReadMessageId.value,
      lastReadAt: lastReadAt.value,
    },
  };
}

export async function markCanonicalConversationRead(
  conversationId,
  options
) {
  const normalizedConversationId =
    normalizeCanonicalConversationId(conversationId);
  if (!normalizedConversationId) throw invalidInput();

  const { setPage, authFetchImpl } = normalizeOptions(options);
  if (typeof authFetchImpl !== "function") {
    throw new ConversationReadApiError({
      status: 500,
      code: "CONVERSATION_READ_TRANSPORT_UNAVAILABLE",
      message: "The conversation read transport is unavailable.",
      kind: CONVERSATION_READ_API_ERROR_KINDS.SERVER,
      retryable: false,
    });
  }

  let result;
  try {
    result = await authFetchImpl(
      `/conversations/${normalizedConversationId}/read`,
      { method: "POST", cache: "no-store" },
      setPage
    );
  } catch {
    throw networkFailure();
  }

  const { response, data } = result || {};
  if (!response?.ok) {
    throw requestFailure({ response, data });
  }

  const normalized = normalizeCanonicalConversationReadResponse(
    data,
    normalizedConversationId
  );
  if (!normalized) throw malformedResponse();

  return normalized;
}
