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

function normalizeSavedProfessionalMutation(value = {}) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    invalidResponse(
      "The server returned invalid Saved Professional data."
    );
  }

  const savedProfessionalId =
    text(value.savedProfessionalId).toLowerCase();

  const contractorProfileId =
    positiveInteger(value.contractorProfileId);

  const businessName =
    text(value.businessName);

  const status =
    text(value.status).toUpperCase();

  const version =
    positiveInteger(value.version);

  const savedAt =
    isoOrNull(value.savedAt);

  const removedAt =
    isoOrNull(value.removedAt);

  if (
    !UUID_PATTERN.test(savedProfessionalId) ||
    !contractorProfileId ||
    !businessName ||
    !["SAVED", "REMOVED"].includes(status) ||
    !version ||
    (value.savedAt && !savedAt) ||
    (value.removedAt && !removedAt)
  ) {
    invalidResponse(
      "The server returned invalid Saved Professional data."
    );
  }

  if (
    status === "SAVED" &&
    removedAt !== null
  ) {
    invalidResponse(
      "The server returned inconsistent Saved Professional state."
    );
  }

  if (
    status === "REMOVED" &&
    removedAt === null
  ) {
    invalidResponse(
      "The server returned inconsistent Saved Professional state."
    );
  }

  return Object.freeze({
    savedProfessionalId,
    contractorProfileId,
    businessName,
    category: text(value.category),
    imageUrl: text(value.imageUrl),
    status,
    savedAt,
    removedAt,
    version,
  });
}

function validContractorProfileId(value) {
  const contractorProfileId =
    positiveInteger(value);

  if (!contractorProfileId) {
    throw new HomeownerProfessionalsApiError({
      status: 400,
      code: "PROFESSIONAL_ID_INVALID",
      message:
        "A valid professional is required.",
    });
  }

  return contractorProfileId;
}

function validCommandKey(value) {
  const normalized =
    text(value).toLowerCase();

  if (!UUID_PATTERN.test(normalized)) {
    throw new HomeownerProfessionalsApiError({
      status: 400,
      code:
        "SAVED_PROFESSIONAL_IDEMPOTENCY_REQUIRED",
      message:
        "A valid Saved Professional command identity is required.",
    });
  }

  return normalized;
}

export function createHomeownerProfessionalCommandKey(
  cryptoProvider = globalThis.crypto
) {
  const generated =
    cryptoProvider?.randomUUID?.();

  if (
    typeof generated !== "string" ||
    !UUID_PATTERN.test(generated)
  ) {
    throw new HomeownerProfessionalsApiError({
      status: 500,
      code:
        "SAVED_PROFESSIONAL_IDEMPOTENCY_UNAVAILABLE",
      message:
        "A Saved Professional command identity could not be created.",
    });
  }

  return generated.toLowerCase();
}

async function mutateHomeownerProfessional({
  contractorProfileId,
  operation,
  commandKey,
  setPage,
  fetcher = authFetch,
  cryptoProvider = globalThis.crypto,
} = {}) {
  const profileId =
    validContractorProfileId(
      contractorProfileId
    );

  const idempotencyKey =
    validCommandKey(
      commandKey ||
        createHomeownerProfessionalCommandKey(
          cryptoProvider
        )
    );

  const action =
    operation === "save"
      ? "save"
      : operation === "remove"
      ? "remove"
      : "";

  if (!action) {
    throw new HomeownerProfessionalsApiError({
      status: 400,
      code:
        "SAVED_PROFESSIONAL_OPERATION_INVALID",
      message:
        "A supported Saved Professional operation is required.",
    });
  }

  const result = await fetcher(
    `/my-professionals/${profileId}/${action}`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    },
    setPage
  );

  const response =
    result?.response || {
      ok: false,
      status: 500,
    };

  const data =
    result?.data || {};

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
        "The Saved Professional operation could not be completed.",
    });
  }

  return normalizeSavedProfessionalMutation(
    data.savedProfessional
  );
}

export function saveHomeownerProfessional(
  options = {}
) {
  return mutateHomeownerProfessional({
    ...options,
    operation: "save",
  });
}

export function removeHomeownerSavedProfessional(
  options = {}
) {
  return mutateHomeownerProfessional({
    ...options,
    operation: "remove",
  });
}
