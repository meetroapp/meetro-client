import { authFetch } from "./authFetch.js";
import {
  JOB_REQUEST_DRAFT_VERSION,
  JOB_REQUEST_DRAFT_SOURCE,
  JOB_REQUEST_DRAFT_UNCERTAINTY,
  updateDraftField,
} from "./jobRequestDraft.js";

export const JOB_REQUEST_INTERPRET_ROUTE = "/api/companion/ask";
export const JOB_REQUEST_INTERPRET_OPERATION = "job_request.interpret";
export const JOB_REQUEST_INTERPRET_CAPABILITY = "job_request.interpret";
export const JOB_REQUEST_INTERPRET_PATCH_PATHS = Object.freeze([
  "job.title",
  "job.description",
  "service.category",
  "service.requestCategory",
  "service.domain",
  "service.specialty",
  "location.affectedArea",
  "timing.urgency",
  "timing.desiredTiming",
  "timing.availability",
  "details.measurements",
  "details.expectations",
  "details.additionalNotes",
]);
export const JOB_REQUEST_INTERPRET_INTENT_STATUS = Object.freeze({
  PENDING: "pending",
  AMBIGUOUS: "ambiguous",
  COMPLETED: "completed",
});

const PATCH_PATHS = new Set(JOB_REQUEST_INTERPRET_PATCH_PATHS);
const SERVICE_PATHS = new Set([
  "service.category",
  "service.requestCategory",
  "service.domain",
  "service.specialty",
]);
const ASSISTANT_PROVENANCE = new Set([
  JOB_REQUEST_DRAFT_SOURCE.ASSISTANT_SUGGESTED,
  JOB_REQUEST_DRAFT_SOURCE.ASSISTANT_INFERRED,
]);
const DRAFT_PROVENANCE = new Set([
  JOB_REQUEST_DRAFT_SOURCE.USER_ENTERED,
  JOB_REQUEST_DRAFT_SOURCE.ASSISTANT_SUGGESTED,
  JOB_REQUEST_DRAFT_SOURCE.ASSISTANT_INFERRED,
  JOB_REQUEST_DRAFT_SOURCE.SYSTEM_DERIVED,
  JOB_REQUEST_DRAFT_SOURCE.LEGACY_MIGRATED,
]);
const ASSISTANT_UNCERTAINTY = new Set([
  JOB_REQUEST_DRAFT_UNCERTAINTY.ASSISTANT_SUGGESTED,
  JOB_REQUEST_DRAFT_UNCERTAINTY.APPROXIMATE,
  JOB_REQUEST_DRAFT_UNCERTAINTY.UNCERTAIN,
]);
const DRAFT_UNCERTAINTY = new Set(Object.values(JOB_REQUEST_DRAFT_UNCERTAINTY));
const PATCH_VALUE_LIMITS = Object.freeze({
  "job.title": 160,
  "job.description": 4000,
  "service.category": 120,
  "service.requestCategory": 120,
  "service.domain": 80,
  "service.specialty": 120,
  "location.affectedArea": 200,
  "timing.urgency": 120,
  "timing.desiredTiming": 300,
  "timing.availability": 500,
  "details.measurements": 1000,
  "details.expectations": 2000,
  "details.additionalNotes": 2000,
});
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUCCESS_CODES = new Set([
  "INTELLIGENCE_OPERATION_COMPLETED",
  "INTELLIGENCE_OPERATION_REPLAYED",
]);

function getPath(target, path) {
  return String(path).split(".").reduce((cursor, key) => cursor?.[key], target);
}

function cleanBoundedText(value, maxLength, { required = false } = {}) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new TypeError("Job Request interpretation values must be text.");
  }
  const text = String(value || "").trim();
  if ((required && !text) || text.length > maxLength) {
    throw new TypeError("Job Request interpretation text exceeds the allowed bounds.");
  }
  return text;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function createUuid({ cryptoImpl = globalThis.crypto } = {}) {
  if (cryptoImpl?.randomUUID) return cryptoImpl.randomUUID();
  if (!cryptoImpl?.getRandomValues) {
    throw new Error("Secure random values are required for an interpretation intent.");
  }
  const bytes = new Uint8Array(16);
  cryptoImpl.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

function buildFieldState(draft) {
  return JOB_REQUEST_INTERPRET_PATCH_PATHS.map((path) => {
    const meta = getPath(draft?.fieldMeta, path) || {};
    const provenance = meta.provenance || meta.source;
    return {
      path,
      provenance: DRAFT_PROVENANCE.has(provenance)
        ? provenance
        : JOB_REQUEST_DRAFT_SOURCE.SYSTEM_DERIVED,
      confirmed: meta.confirmed === true,
      uncertainty: DRAFT_UNCERTAINTY.has(meta.uncertainty)
        ? meta.uncertainty
        : JOB_REQUEST_DRAFT_UNCERTAINTY.KNOWN,
    };
  });
}

export function buildJobRequestInterpretRequest({ text, draft, locale = "en-US" } = {}) {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    throw new TypeError("A Job Request draft is required for interpretation.");
  }
  if (draft.version !== JOB_REQUEST_DRAFT_VERSION) {
    throw new TypeError("The Job Request draft version is not supported for interpretation.");
  }
  const normalizedLocale = cleanBoundedText(locale, 35, { required: true });
  return {
    operation: JOB_REQUEST_INTERPRET_OPERATION,
    capability: JOB_REQUEST_INTERPRET_CAPABILITY,
    locale: normalizedLocale,
    context: {
      draft: {
        version: 1,
        job: {
          title: cleanBoundedText(draft.job?.title, PATCH_VALUE_LIMITS["job.title"]),
          description: cleanBoundedText(
            draft.job?.description,
            PATCH_VALUE_LIMITS["job.description"]
          ),
        },
        service: {
          category: cleanBoundedText(
            draft.service?.category,
            PATCH_VALUE_LIMITS["service.category"]
          ),
          requestCategory: cleanBoundedText(
            draft.service?.requestCategory,
            PATCH_VALUE_LIMITS["service.requestCategory"]
          ),
          domain: cleanBoundedText(
            draft.service?.domain,
            PATCH_VALUE_LIMITS["service.domain"]
          ),
          specialty: cleanBoundedText(
            draft.service?.specialty,
            PATCH_VALUE_LIMITS["service.specialty"]
          ),
        },
        location: {
          affectedArea: cleanBoundedText(
            draft.location?.affectedArea,
            PATCH_VALUE_LIMITS["location.affectedArea"]
          ),
        },
        timing: {
          urgency: cleanBoundedText(
            draft.timing?.urgency,
            PATCH_VALUE_LIMITS["timing.urgency"]
          ),
          desiredTiming: cleanBoundedText(
            draft.timing?.desiredTiming,
            PATCH_VALUE_LIMITS["timing.desiredTiming"]
          ),
          availability: cleanBoundedText(
            draft.timing?.availability,
            PATCH_VALUE_LIMITS["timing.availability"]
          ),
        },
        details: {
          measurements: cleanBoundedText(
            draft.details?.measurements,
            PATCH_VALUE_LIMITS["details.measurements"]
          ),
          expectations: cleanBoundedText(
            draft.details?.expectations,
            PATCH_VALUE_LIMITS["details.expectations"]
          ),
          additionalNotes: cleanBoundedText(
            draft.details?.additionalNotes,
            PATCH_VALUE_LIMITS["details.additionalNotes"]
          ),
        },
        fieldState: buildFieldState(draft),
        photosAttached: Boolean(draft.media?.photos?.length),
      },
    },
    input: {
      text: cleanBoundedText(text, 4000, { required: true }),
    },
  };
}

export function createJobRequestInterpretKey(options = {}) {
  const key = createUuid(options);
  if (!UUID_PATTERN.test(key)) {
    throw new Error("A secure UUID interpretation key is required.");
  }
  return key.toLowerCase();
}

export function createJobRequestInterpretIntent({
  text,
  draft,
  locale = "en-US",
  previousIntent,
  cryptoImpl,
} = {}) {
  const request = buildJobRequestInterpretRequest({ text, draft, locale });
  const fingerprint = stableStringify(request);
  const canRetry =
    previousIntent?.fingerprint === fingerprint &&
    UUID_PATTERN.test(String(previousIntent?.idempotencyKey || "")) &&
    [
      JOB_REQUEST_INTERPRET_INTENT_STATUS.PENDING,
      JOB_REQUEST_INTERPRET_INTENT_STATUS.AMBIGUOUS,
    ].includes(previousIntent?.status);
  return {
    idempotencyKey: canRetry
      ? previousIntent.idempotencyKey
      : createJobRequestInterpretKey({ cryptoImpl }),
    fingerprint,
    request,
    status: JOB_REQUEST_INTERPRET_INTENT_STATUS.PENDING,
  };
}

export function markJobRequestInterpretIntentAmbiguous(intent) {
  return {
    ...intent,
    status: JOB_REQUEST_INTERPRET_INTENT_STATUS.AMBIGUOUS,
  };
}

export class JobRequestInterpretError extends Error {
  constructor(message, { classification = "definitive", code = "", status = 0 } = {}) {
    super(message);
    this.name = "JobRequestInterpretError";
    this.classification = classification;
    this.code = code;
    this.status = status;
  }
}

function validateGatewayInterpretation(result) {
  if (
    !result ||
    typeof result !== "object" ||
    result.schemaVersion !== 1 ||
    typeof result.summary !== "string" ||
    !Array.isArray(result.draftPatch?.fields) ||
    !Array.isArray(result.clarifications) ||
    !Array.isArray(result.warnings) ||
    !result.validation ||
    typeof result.validation !== "object"
  ) {
    throw new JobRequestInterpretError("The interpretation result is invalid.", {
      classification: "ambiguous",
      code: "INTELLIGENCE_RESULT_INVALID",
    });
  }
  return result;
}

export async function requestJobRequestInterpretation({
  intent,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  if (
    !intent ||
    !UUID_PATTERN.test(String(intent.idempotencyKey || "")) ||
    intent.request?.operation !== JOB_REQUEST_INTERPRET_OPERATION
  ) {
    throw new TypeError("A valid Job Request interpretation intent is required.");
  }

  let result;
  try {
    result = await authFetchImpl(
      JOB_REQUEST_INTERPRET_ROUTE,
      {
        method: "POST",
        headers: { "Idempotency-Key": intent.idempotencyKey },
        body: JSON.stringify(intent.request),
      },
      setPage
    );
  } catch {
    throw new JobRequestInterpretError("The interpretation response is uncertain.", {
      classification: "ambiguous",
      code: "INTELLIGENCE_NETWORK_AMBIGUOUS",
    });
  }

  const status = Number(result?.response?.status || 0);
  const data = result?.data || {};
  if (
    !result?.response?.ok ||
    data.success !== true ||
    !SUCCESS_CODES.has(data.code)
  ) {
    const classification =
      data.code === "INTELLIGENCE_OPERATION_CONFLICT"
        ? "conflict"
        : data.code === "INTELLIGENCE_OPERATION_IN_PROGRESS" || status >= 500
          ? "ambiguous"
          : "definitive";
    throw new JobRequestInterpretError("The interpretation could not be completed.", {
      classification,
      code: String(data.code || "INTELLIGENCE_REQUEST_FAILED"),
      status,
    });
  }
  if (data.operation !== JOB_REQUEST_INTERPRET_OPERATION) {
    throw new JobRequestInterpretError("The interpretation operation did not match.", {
      classification: "ambiguous",
      code: "INTELLIGENCE_OPERATION_MISMATCH",
      status,
    });
  }

  return {
    operationId: data.operationId,
    correlationId: data.correlationId,
    interpretation: validateGatewayInterpretation(data.result),
    usage: data.usage,
    replayed: data.code === "INTELLIGENCE_OPERATION_REPLAYED",
  };
}

function rejectPatch(rejectedFields, field, reason) {
  rejectedFields.push({ path: String(field?.path || ""), reason });
}

function validateDraftPatchField(field) {
  if (!field || typeof field !== "object" || Array.isArray(field)) return "invalid_patch";
  if (!PATCH_PATHS.has(field.path)) return "unsupported_path";
  if (
    typeof field.value !== "string" ||
    !field.value.trim() ||
    field.value !== field.value.trim() ||
    field.value.length > PATCH_VALUE_LIMITS[field.path]
  ) {
    return "invalid_value";
  }
  if (!ASSISTANT_PROVENANCE.has(field.provenance)) return "invalid_provenance";
  if (!Number.isFinite(field.confidence) || field.confidence < 0 || field.confidence > 1) {
    return "invalid_confidence";
  }
  if (!ASSISTANT_UNCERTAINTY.has(field.uncertainty)) return "invalid_uncertainty";
  if (field.requiresConfirmation !== true) return "confirmation_required";
  if (SERVICE_PATHS.has(field.path) && field.taxonomy?.validated !== true) {
    return "taxonomy_not_validated";
  }
  return "";
}

export function applyJobRequestInterpretationPatch(draft, interpretation) {
  const fields = interpretation?.draftPatch?.fields;
  if (!draft || typeof draft !== "object" || !Array.isArray(fields)) {
    throw new TypeError("A draft and normalized interpretation are required.");
  }
  const originalSubmission = draft.submission;
  const appliedFields = [];
  const rejectedFields = [];
  const seenPaths = new Set();
  let next = draft;

  for (const field of fields) {
    if (seenPaths.has(field?.path)) {
      rejectPatch(rejectedFields, field, "duplicate_path");
      continue;
    }
    seenPaths.add(field?.path);
    const invalidReason = validateDraftPatchField(field);
    if (invalidReason) {
      rejectPatch(rejectedFields, field, invalidReason);
      continue;
    }
    const currentValue = String(getPath(next, field.path) || "").trim();
    const currentMeta = getPath(next.fieldMeta, field.path) || {};
    const currentProvenance = currentMeta.provenance || currentMeta.source;
    if (currentMeta.confirmed === true || currentProvenance === JOB_REQUEST_DRAFT_SOURCE.USER_ENTERED) {
      rejectPatch(rejectedFields, field, "homeowner_value_protected");
      continue;
    }
    if (currentValue && !ASSISTANT_PROVENANCE.has(currentProvenance)) {
      rejectPatch(rejectedFields, field, "existing_value_protected");
      continue;
    }

    next = updateDraftField(next, field.path, field.value, {
      source: field.provenance,
      confirmed: false,
      uncertainty: field.uncertainty,
    });
    appliedFields.push(field.path);
  }

  if (next !== draft) next.submission = originalSubmission;
  return { draft: next, appliedFields, rejectedFields };
}
