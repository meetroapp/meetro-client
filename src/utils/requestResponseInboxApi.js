import { authFetch } from "./authFetch.js";

const RESPONSE_RELATIONSHIP_STATUS_PAIRS = Object.freeze({
  submitted: "pending",
  selected: "active",
  withdrawn: "closed",
  declined: "closed",
  not_selected: "closed",
  expired: "closed",
  cancelled: "closed",
  closed: "closed",
});

function positiveCanonicalId(value) {
  const normalized = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function positiveOpaqueId(value) {
  const normalized = String(value ?? "").trim();
  return /^[1-9]\d*$/.test(normalized) ? normalized : null;
}

function cleanText(value, maxLength = 2000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeRequesterResponse(row = {}) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;

  const responseId = positiveOpaqueId(row.response_id);
  const requestId = positiveCanonicalId(row.request_id);
  const relationshipId = positiveCanonicalId(row.id);
  const responseStatus = cleanText(row.response_status, 40);
  const relationshipStatus = cleanText(row.relationship_status, 40);

  if (
    !responseId ||
    !requestId ||
    !relationshipId ||
    row.authority_source !== "professional_response" ||
    RESPONSE_RELATIONSHIP_STATUS_PAIRS[responseStatus] !== relationshipStatus
  ) {
    return null;
  }

  return {
    responseId,
    requestId,
    relationshipId,
    responseStatus,
    relationshipStatus,
    unresolved: responseStatus === "submitted" && relationshipStatus === "pending",
    selected: responseStatus === "selected" && relationshipStatus === "active",
    requestTitle: cleanText(row.request_title, 300),
    businessName: cleanText(row.business_name, 200),
    businessImageUrl: cleanText(row.business_image_url, 2000),
    professionalCategory: cleanText(row.professional_category, 120),
    introductionText: cleanText(row.introduction_text, 2000),
    submittedAt: row.submitted_at || null,
  };
}

export function normalizeRequesterResponseInbox(payload = {}) {
  if (payload?.success !== true || !Array.isArray(payload.relationships)) {
    return null;
  }

  const canonicalRows = payload.relationships.filter(
    (row) => row?.response_id != null || row?.authority_source === "professional_response"
  );
  const responses = canonicalRows.map(normalizeRequesterResponse);

  if (responses.some((response) => response === null)) return null;
  if (new Set(responses.map((response) => response.responseId)).size !== responses.length) {
    return null;
  }

  return responses;
}

export async function getRequesterResponseInbox({
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  if (typeof authFetchImpl !== "function") {
    return { ok: false, status: 0, code: "INVALID_RESPONSE_INBOX_TRANSPORT", responses: [] };
  }

  try {
    const result = await authFetchImpl(
      "/my-request-relationships",
      { cache: "no-store" },
      setPage
    );
    const responses = result?.response?.ok
      ? normalizeRequesterResponseInbox(result.data || {})
      : null;

    if (!responses) {
      return {
        ok: false,
        status: Number(result?.response?.status || 0),
        code: String(result?.data?.code || "REQUEST_RESPONSE_INBOX_FETCH_FAILED"),
        responses: [],
      };
    }

    return {
      ok: true,
      status: Number(result?.response?.status || 200),
      code: String(result?.data?.code || ""),
      responses,
    };
  } catch {
    return { ok: false, status: 0, code: "REQUEST_RESPONSE_INBOX_FETCH_FAILED", responses: [] };
  }
}
