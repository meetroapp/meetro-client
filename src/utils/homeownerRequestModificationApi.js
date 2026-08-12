import { authFetch } from "./authFetch.js";
import {
  normalizeRequestLifecycleFoundation,
} from "./requestLifecycleFoundation.js";
import {
  normalizeHomeownerRequestModificationAuthority,
} from "./homeownerRequestModificationPolicy.js";

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function stableIdentifier(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function failedResult(result, fallbackCode, fallbackMessage) {
  const code = String(result?.data?.code || fallbackCode);
  return {
    ok: false,
    code,
    message: String(result?.data?.message || fallbackMessage),
    httpStatus: Number(result?.response?.status || 0),
    versionConflict: code === "REQUEST_VERSION_CONFLICT",
  };
}

export function createRequestModificationIdempotencyKey(
  prefix,
  cryptoApi = globalThis.crypto
) {
  const safePrefix = String(prefix || "request-command")
    .trim()
    .replace(/[^A-Za-z0-9._:-]+/g, "-")
    .slice(0, 80) || "request-command";
  const unique =
    typeof cryptoApi?.randomUUID === "function"
      ? cryptoApi.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${safePrefix}:${unique}`.slice(0, 200);
}

export async function fetchHomeownerRequestModification({
  requestId,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  const normalizedRequestId = positiveInteger(requestId);
  if (!normalizedRequestId) {
    return {
      ok: false,
      code: "INVALID_REQUEST_ID",
      message: "A canonical request ID is required.",
      httpStatus: 0,
      versionConflict: false,
    };
  }

  let result;
  try {
    result = await authFetchImpl(
      `/posts/${encodeURIComponent(normalizedRequestId)}/lifecycle`,
      { cache: "no-store" },
      setPage
    );
  } catch {
    return {
      ok: false,
      code: "REQUEST_LIFECYCLE_FETCH_FAILED",
      message: "Request actions could not be loaded.",
      httpStatus: 0,
      versionConflict: false,
    };
  }

  if (!result?.response?.ok) {
    return failedResult(
      result,
      "REQUEST_LIFECYCLE_FETCH_FAILED",
      "Request actions could not be loaded."
    );
  }

  const lifecycle = normalizeRequestLifecycleFoundation(result.data);
  const authority = normalizeHomeownerRequestModificationAuthority(result.data);
  if (!lifecycle || !authority || lifecycle.contractVersion !== 2) {
    return {
      ok: false,
      code: "INVALID_REQUEST_MODIFICATION_AUTHORITY",
      message: "Request actions are unavailable for this request.",
      httpStatus: Number(result?.response?.status || 0),
      versionConflict: false,
    };
  }

  return {
    ok: true,
    code: String(result?.data?.code || "REQUEST_LIFECYCLE_FOUND"),
    lifecycle,
    authority,
  };
}

export async function editHomeownerRequest({
  requestId,
  expectedVersion,
  updates,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  const normalizedRequestId = positiveInteger(requestId);
  const normalizedVersion = positiveInteger(expectedVersion);
  if (!normalizedRequestId || !normalizedVersion) {
    return {
      ok: false,
      code: "INVALID_REQUEST_VERSION",
      message: "The current request version is required.",
      httpStatus: 0,
      versionConflict: false,
    };
  }

  let result;
  try {
    result = await authFetchImpl(
      `/posts/${encodeURIComponent(normalizedRequestId)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          ...(updates && typeof updates === "object" ? updates : {}),
          expected_version: normalizedVersion,
        }),
      },
      setPage
    );
  } catch {
    return {
      ok: false,
      code: "REQUEST_UPDATE_NETWORK_FAILED",
      message: "The request could not be updated. Try again.",
      httpStatus: 0,
      versionConflict: false,
    };
  }

  if (!result?.response?.ok || !result?.data?.post) {
    return failedResult(
      result,
      "REQUEST_UPDATE_FAILED",
      "The request could not be updated."
    );
  }

  return {
    ok: true,
    code: String(result.data.code || "REQUEST_UPDATED"),
    post: result.data.post,
    concernSupersession: result.data.concernSupersession || null,
  };
}

export async function appendHomeownerRequestUpdate({
  requestId,
  concernId,
  text,
  idempotencyKey,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  const normalizedRequestId = positiveInteger(requestId);
  const normalizedConcernId = stableIdentifier(concernId);
  const normalizedText = String(text || "").trim();
  if (!normalizedRequestId || !normalizedConcernId || !normalizedText) {
    return {
      ok: false,
      code: "INVALID_CONCERN_CLARIFICATION",
      message: "Update text is required.",
      httpStatus: 0,
      versionConflict: false,
    };
  }

  let result;
  try {
    result = await authFetchImpl(
      `/posts/${encodeURIComponent(normalizedRequestId)}/reported-concerns/${encodeURIComponent(normalizedConcernId)}/clarifications`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          semantics: "CLARIFIES",
          text: normalizedText,
        }),
      },
      setPage
    );
  } catch {
    return {
      ok: false,
      code: "CONCERN_CLARIFICATION_NETWORK_FAILED",
      message: "The update could not be added. Try again.",
      httpStatus: 0,
      versionConflict: false,
    };
  }

  if (!result?.response?.ok || !result?.data?.clarification) {
    return failedResult(
      result,
      "CONCERN_CLARIFICATION_FAILED",
      "The update could not be added."
    );
  }

  return {
    ok: true,
    code: String(result.data.code || "CONCERN_CLARIFICATION_CREATED"),
    clarification: result.data.clarification,
    replayed: result.data.replayed === true,
  };
}

export async function appendHomeownerRequestPhoto({
  requestId,
  concernId,
  expectedVersion,
  media,
  idempotencyKey,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  const normalizedRequestId = positiveInteger(requestId);
  const normalizedConcernId = stableIdentifier(concernId);
  const normalizedVersion = positiveInteger(expectedVersion);
  if (!normalizedRequestId || !normalizedConcernId || !normalizedVersion) {
    return {
      ok: false,
      code: "INVALID_REQUEST_PHOTO_APPEND",
      message: "Current request photo authority is required.",
      httpStatus: 0,
      versionConflict: false,
    };
  }

  let result;
  try {
    result = await authFetchImpl(
      `/posts/${encodeURIComponent(normalizedRequestId)}/reported-concerns/${encodeURIComponent(normalizedConcernId)}/photos`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          expected_version: normalizedVersion,
          media: {
            purpose: "request-photo",
            media,
          },
        }),
      },
      setPage
    );
  } catch {
    return {
      ok: false,
      code: "REQUEST_PHOTO_APPEND_NETWORK_FAILED",
      message: "The photo could not be attached. Try again.",
      httpStatus: 0,
      versionConflict: false,
    };
  }

  if (!result?.response?.ok || !result?.data?.photo) {
    return failedResult(
      result,
      "REQUEST_PHOTO_APPEND_FAILED",
      "The photo could not be attached."
    );
  }

  return {
    ok: true,
    code: String(result.data.code || "REQUEST_PHOTO_ATTACHED"),
    post: result.data.post || null,
    photo: result.data.photo,
    requestVersion: positiveInteger(result.data.requestVersion),
    replayed: result.data.replayed === true,
  };
}
