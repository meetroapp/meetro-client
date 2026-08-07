import { authFetch } from "./authFetch.js";

const IDEMPOTENCY_KEY_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

function positiveCanonicalId(value) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : value;
}

function normalizedIntroduction(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function createProfessionalResponseIdempotencyKey(
  cryptoSource = globalThis.crypto
) {
  if (!cryptoSource || typeof cryptoSource.randomUUID !== "function") {
    return null;
  }

  return `professional-response:${cryptoSource.randomUUID()}`;
}

export function prepareProfessionalResponseCommand(
  previous = {},
  introductionText,
  { keyFactory = createProfessionalResponseIdempotencyKey } = {}
) {
  const introduction = normalizedIntroduction(introductionText);
  if (!introduction || introduction.length > 2000) return null;

  if (
    previous.introductionText === introduction &&
    IDEMPOTENCY_KEY_PATTERN.test(previous.idempotencyKey || "")
  ) {
    return {
      introductionText: introduction,
      idempotencyKey: previous.idempotencyKey,
    };
  }

  const idempotencyKey = keyFactory();
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey || "")) return null;

  return { introductionText: introduction, idempotencyKey };
}

export function normalizeProfessionalResponseResult(payload = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const response = payload.response;
  const relationship = payload.relationship;
  const responseId = positiveCanonicalId(response?.id);
  const requestId = positiveCanonicalId(response?.request_id);
  const relationshipId = positiveCanonicalId(relationship?.id);
  const relationshipRequestId = positiveCanonicalId(
    relationship?.request_id
  );
  const currentVersion = positiveCanonicalId(response?.current_version);
  const relationshipVersion = positiveCanonicalId(
    relationship?.current_version
  );
  const classification = payload.resultClassification;

  if (
    !responseId ||
    !requestId ||
    !relationshipId ||
    relationshipRequestId !== requestId ||
    response?.status !== "submitted" ||
    relationship?.status !== "pending" ||
    relationship?.authority_source !== "professional_response" ||
    currentVersion !== 1 ||
    relationshipVersion !== currentVersion ||
    !["created", "existing"].includes(classification) ||
    typeof response?.introduction_text !== "string" ||
    !response.introduction_text.trim() ||
    response.introduction_text.length > 2000 ||
    !response.submitted_at
  ) {
    return null;
  }

  return {
    response: {
      id: responseId,
      requestId,
      status: "submitted",
      currentVersion,
      introductionText: response.introduction_text,
      submittedAt: response.submitted_at,
    },
    relationship: {
      id: relationshipId,
      requestId,
      status: "pending",
      authoritySource: "professional_response",
      currentVersion: relationshipVersion,
      createdAt: relationship.created_at || null,
    },
    resultClassification: classification,
    created: classification === "created",
    replayed: payload.replayed === true,
  };
}

export async function submitProfessionalResponse(
  {
    requestId,
    introductionText,
    idempotencyKey,
  },
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedRequestId = positiveCanonicalId(requestId);
  const introduction = normalizedIntroduction(introductionText);

  if (
    !normalizedRequestId ||
    !introduction ||
    introduction.length > 2000 ||
    !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey || "") ||
    typeof authFetchImpl !== "function"
  ) {
    return {
      ok: false,
      status: 0,
      code: "INVALID_PROFESSIONAL_RESPONSE_COMMAND",
      message: "Enter a valid response and try again.",
    };
  }

  try {
    const result = await authFetchImpl(
      `/professional-request-opportunities/${normalizedRequestId}/respond`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ introduction_text: introduction }),
      },
      setPage
    );
    const normalized = result?.response?.ok
      ? normalizeProfessionalResponseResult(result.data)
      : null;

    if (!normalized) {
      return {
        ok: false,
        status: Number(result?.response?.status || 0),
        code:
          result?.data?.code ||
          "PROFESSIONAL_RESPONSE_SUBMISSION_FAILED",
        message:
          typeof result?.data?.message === "string" &&
          result.data.message.trim()
            ? result.data.message.trim()
            : "The response could not be submitted.",
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
      code: "PROFESSIONAL_RESPONSE_SUBMISSION_FAILED",
      message: "The response could not be submitted.",
    };
  }
}
