import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value) {
  return String(value ?? "").trim();
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

function nonNegativeInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? parsed
    : null;
}

function isoOrNull(value) {
  if (value == null || value === "") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString();
}

export class HomeownerProfessionalsApiError extends Error {
  constructor({
    status = 500,
    code = "HOMEOWNER_PROFESSIONALS_FAILED",
    message = "My Professionals could not be loaded.",
  } = {}) {
    super(message);
    this.name = "HomeownerProfessionalsApiError";
    this.status = status;
    this.code = code;
  }
}

function invalidResponse(message = "The server returned invalid My Professionals data.") {
  throw new HomeownerProfessionalsApiError({
    code: "HOMEOWNER_PROFESSIONALS_RESPONSE_INVALID",
    message,
  });
}

function normalizeIdentity(value = {}) {
  const contractorProfileId = positiveInteger(
    value.contractorProfileId
  );
  const professionalUserId = positiveInteger(
    value.professionalUserId
  );
  const businessName = text(value.businessName);

  if (
    !contractorProfileId ||
    !professionalUserId ||
    !businessName
  ) {
    invalidResponse();
  }

  return {
    contractorProfileId,
    professionalUserId,
    businessName,
    category: text(value.category),
    imageUrl: text(value.imageUrl),
  };
}

function normalizeWorkedWith(value = {}) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    invalidResponse();
  }

  const meetroRelationshipId =
    text(value.meetroRelationshipId).toLowerCase();

  const requestCount = nonNegativeInteger(
    value.requestCount
  );
  const jobCount = nonNegativeInteger(
    value.jobCount
  );

  if (
    !UUID_PATTERN.test(meetroRelationshipId) ||
    requestCount == null ||
    jobCount == null ||
    typeof value.saved !== "boolean"
  ) {
    invalidResponse();
  }

  const establishedAt =
    isoOrNull(value.establishedAt);

  const lastSelectedAt =
    isoOrNull(value.lastSelectedAt);

  if (
    value.establishedAt &&
    !establishedAt
  ) {
    invalidResponse();
  }

  if (
    value.lastSelectedAt &&
    !lastSelectedAt
  ) {
    invalidResponse();
  }

  return Object.freeze({
    meetroRelationshipId,
    ...normalizeIdentity(value),
    establishedAt,
    lastSelectedAt,
    requestCount,
    jobCount,
    saved: value.saved,
  });
}

function normalizeSaved(value = {}) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    invalidResponse();
  }

  const savedProfessionalId =
    text(value.savedProfessionalId).toLowerCase();

  if (
    !UUID_PATTERN.test(savedProfessionalId) ||
    typeof value.workedWith !== "boolean"
  ) {
    invalidResponse();
  }

  const savedAt = isoOrNull(value.savedAt);

  if (value.savedAt && !savedAt) {
    invalidResponse();
  }

  return Object.freeze({
    savedProfessionalId,
    ...normalizeIdentity(value),
    savedAt,
    workedWith: value.workedWith,
  });
}

export function normalizeHomeownerProfessionalsResponse(
  data = {}
) {
  if (
    !data ||
    typeof data !== "object" ||
    data.success !== true ||
    !Array.isArray(data.workedWith) ||
    !Array.isArray(data.saved)
  ) {
    invalidResponse();
  }

  return Object.freeze({
    workedWith: Object.freeze(
      data.workedWith.map(normalizeWorkedWith)
    ),
    saved: Object.freeze(
      data.saved.map(normalizeSaved)
    ),
  });
}

export async function listHomeownerProfessionals({
  setPage,
  fetcher = authFetch,
} = {}) {
  const result = await fetcher(
    "/my-professionals",
    {
      method: "GET",
      cache: "no-store",
    },
    setPage
  );

  const response =
    result?.response || {
      ok: false,
      status: 500,
    };

  const data = result?.data || {};

  if (
    !response.ok ||
    data.success !== true
  ) {
    throw new HomeownerProfessionalsApiError({
      status: response.status,
      code:
        data.code ||
        "HOMEOWNER_PROFESSIONALS_FAILED",
      message:
        data.message ||
        "My Professionals could not be loaded.",
    });
  }

  return normalizeHomeownerProfessionalsResponse(
    data
  );
}
