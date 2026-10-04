import { authFetch } from "./authFetch.js";

const IDEMPOTENCY_KEY_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

function positiveCanonicalId(value) {
  if (Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function positiveOpaqueId(value) {
  if (Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : value;
}

function cleanText(value, maxLength = 2000) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function normalizeBusinessProfile(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return {
    businessName: cleanText(value.business_name, 200),
    category: cleanText(value.category, 120),
    imageUrl: cleanText(value.image_url, 2000),
  };
}

export function createRequestSelectionIdempotencyKey(
  cryptoSource = globalThis.crypto
) {
  if (!cryptoSource || typeof cryptoSource.randomUUID !== "function") {
    return null;
  }
  return `request-selection:${cryptoSource.randomUUID()}`;
}

export function prepareRequestSelectionCommand(
  previous = {},
  requestId,
  responseId,
  { keyFactory = createRequestSelectionIdempotencyKey } = {}
) {
  const normalizedRequestId = positiveCanonicalId(requestId);
  const normalizedResponseId = positiveOpaqueId(responseId);
  if (!normalizedRequestId || !normalizedResponseId) return null;

  if (
    previous.requestId === normalizedRequestId &&
    previous.responseId === normalizedResponseId &&
    IDEMPOTENCY_KEY_PATTERN.test(previous.idempotencyKey || "")
  ) {
    return previous;
  }

  const idempotencyKey = keyFactory();
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey || "")) return null;
  return {
    requestId: normalizedRequestId,
    responseId: normalizedResponseId,
    idempotencyKey,
  };
}

function normalizeResponse(row, requestId) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const id = positiveOpaqueId(row.id);
  const responseRequestId = positiveCanonicalId(row.request_id);
  const currentVersion = positiveCanonicalId(row.current_version);
  const conversationId = positiveCanonicalId(row.conversation_id);
  const businessProfile = normalizeBusinessProfile(row.business_profile);
  const allowedPairs = {
    submitted: "pending",
    selected: "active",
    not_selected: "closed",
    declined: "closed",
    withdrawn: "closed",
    expired: "closed",
    cancelled: "closed",
    closed: "closed",
  };
  const selected = row.status === "selected";

  if (
    !id ||
    responseRequestId !== requestId ||
    !currentVersion ||
    !businessProfile ||
    allowedPairs[row.status] !== row.relationship_status ||
    typeof row.introduction_text !== "string" ||
    row.introduction_text.length > 2000 ||
    typeof row.selection_eligible !== "boolean" ||
    typeof row.selected !== "boolean" ||
    typeof row.conversation_available !== "boolean" ||
    row.selected !== selected ||
    row.conversation_available !== selected ||
    (selected ? !conversationId : conversationId !== null)
  ) {
    return null;
  }

  if (
    row.selection_eligible !==
      (row.status === "submitted" && row.relationship_status === "pending") &&
    row.selection_eligible === true
  ) {
    return null;
  }

  return {
    id,
    requestId,
    status: row.status,
    currentVersion,
    introductionText: row.introduction_text.trim(),
    submittedAt: row.submitted_at || null,
    selectedAt: row.selected_at || null,
    relationshipStatus: row.relationship_status,
    selectionEligible: row.selection_eligible,
    selected,
    conversationAvailable: selected,
    conversationId: selected ? conversationId : null,
    businessProfile,
  };
}

export function normalizeHomeownerProfessionalResponses(payload = {}) {
  const requestId = positiveCanonicalId(payload?.request?.id);
  if (
    payload?.success !== true ||
    !requestId ||
    typeof payload.request.title !== "string" ||
    typeof payload.request.status !== "string" ||
    !Array.isArray(payload.responses)
  ) {
    return null;
  }

  const responses = payload.responses.map((row) =>
    normalizeResponse(row, requestId)
  );
  if (responses.some((row) => row === null)) return null;
  if (new Set(responses.map((row) => row.id)).size !== responses.length) {
    return null;
  }
  if (responses.filter((row) => row.selected).length > 1) return null;

  return {
    request: {
      id: requestId,
      title: payload.request.title.trim(),
      status: payload.request.status,
    },
    responses,
  };
}

export function normalizeRequestSelectionResult(payload = {}) {
  const selection = payload?.selection;
  const response = payload?.response;
  const relationship = payload?.relationship;
  const conversation = payload?.conversation;
  const selectionId = positiveOpaqueId(selection?.id);
  const requestId = positiveCanonicalId(selection?.request_id);
  const selectionResponseId = positiveOpaqueId(selection?.response_id);
  const responseId = positiveOpaqueId(response?.id);
  const responseRequestId = positiveCanonicalId(response?.request_id);
  const relationshipId = positiveCanonicalId(relationship?.id);
  const relationshipRequestId = positiveCanonicalId(relationship?.request_id);
  const conversationId = positiveCanonicalId(conversation?.id);
  const conversationRelationshipId = positiveCanonicalId(
    conversation?.relationship_id
  );
  const selectedVersion = positiveCanonicalId(
    selection?.selected_response_version
  );
  const responseVersion = positiveCanonicalId(response?.current_version);
  const relationshipVersion = positiveCanonicalId(
    relationship?.current_version
  );
  const classification = payload?.resultClassification;
  const businessProfile = normalizeBusinessProfile(
    response?.business_profile
  );

  if (
    payload?.success !== true ||
    !selectionId ||
    !requestId ||
    !selectionResponseId ||
    selectionResponseId !== responseId ||
    requestId !== responseRequestId ||
    requestId !== relationshipRequestId ||
    !relationshipId ||
    !conversationId ||
    conversationRelationshipId !== relationshipId ||
    !selectedVersion ||
    selectedVersion !== responseVersion ||
    selectedVersion !== relationshipVersion ||
    response?.status !== "selected" ||
    relationship?.status !== "active" ||
    relationship?.authority_source !== "professional_response" ||
    conversation?.status !== "active" ||
    payload?.privacy_stage !== 3 ||
    !["created", "existing", "replayed"].includes(classification) ||
    !businessProfile
  ) {
    return null;
  }

  return {
    selection: {
      id: selectionId,
      requestId,
      responseId,
      selectedResponseVersion: selectedVersion,
      selectedAt: selection.selected_at || null,
    },
    response: {
      id: responseId,
      requestId,
      status: "selected",
      currentVersion: responseVersion,
      introductionText: cleanText(response.introduction_text),
      submittedAt: response.submitted_at || null,
      selectedAt: response.selected_at || null,
      businessProfile,
    },
    relationship: {
      id: relationshipId,
      requestId,
      status: "active",
      authoritySource: "professional_response",
      currentVersion: relationshipVersion,
      activatedAt: relationship.activated_at || null,
    },
    conversation: {
      id: conversationId,
      relationshipId,
      status: "active",
    },
    privacyStage: 3,
    resultClassification: classification,
    replayed: payload.replayed === true,
  };
}

export async function getHomeownerProfessionalResponses(
  requestId,
  { authFetchImpl = authFetch, setPage } = {}
) {
  const normalizedRequestId = positiveCanonicalId(requestId);
  if (!normalizedRequestId || typeof authFetchImpl !== "function") {
    return { ok: false, status: 0, code: "INVALID_REQUEST_ID" };
  }
  try {
    const result = await authFetchImpl(
      `/posts/${normalizedRequestId}/professional-responses`,
      {},
      setPage
    );
    const normalized = result?.response?.ok
      ? normalizeHomeownerProfessionalResponses(result.data)
      : null;
    if (!normalized) {
      return {
        ok: false,
        status: Number(result?.response?.status || 0),
        code: result?.data?.code || "PROFESSIONAL_RESPONSES_FETCH_FAILED",
        message: "Professional responses are unavailable.",
      };
    }
    return { ok: true, status: Number(result.response.status || 200), ...normalized };
  } catch {
    return {
      ok: false,
      status: 0,
      code: "PROFESSIONAL_RESPONSES_FETCH_FAILED",
      message: "Professional responses are unavailable.",
    };
  }
}

export async function selectHomeownerProfessionalResponse(
  command,
  { authFetchImpl = authFetch, setPage } = {}
) {
  const requestId = positiveCanonicalId(command?.requestId);
  const responseId = positiveOpaqueId(command?.responseId);
  const idempotencyKey = command?.idempotencyKey;
  if (
    !requestId ||
    !responseId ||
    !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey || "") ||
    typeof authFetchImpl !== "function"
  ) {
    return {
      ok: false,
      status: 0,
      code: "INVALID_REQUEST_SELECTION_COMMAND",
      message: "The professional could not be selected.",
    };
  }

  try {
    const result = await authFetchImpl(
      `/posts/${requestId}/professional-responses/${responseId}/select`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({}),
      },
      setPage
    );
    const normalized = result?.response?.ok
      ? normalizeRequestSelectionResult(result.data)
      : null;
    if (!normalized) {
      return {
        ok: false,
        status: Number(result?.response?.status || 0),
        code: result?.data?.code || "REQUEST_SELECTION_FAILED",
        message:
          typeof result?.data?.message === "string" && result.data.message.trim()
            ? result.data.message.trim()
            : "The professional could not be selected.",
      };
    }
    return {
      ok: true,
      status: Number(result.response.status || 200),
      code: String(result.data.code || ""),
      ...normalized,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      code: "REQUEST_SELECTION_FAILED",
      message: "The professional could not be selected.",
    };
  }
}
