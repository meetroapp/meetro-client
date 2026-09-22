import { authFetch } from "./authFetch.js";
import { EMERGENCY_SERVICE_OPTIONS } from "./emergencySpecialties.js";

export const EMERGENCY_REQUEST_INTERPRET_ROUTE = "/api/companion/ask";
export const EMERGENCY_REQUEST_INTERPRET_OPERATION = "emergency_request.interpret";
export const EMERGENCY_REQUEST_INTERPRET_CAPABILITY = "emergency_request.interpret";
export const EMERGENCY_REQUEST_INTERPRET_PATCH_PATHS = Object.freeze([
  "description",
  "service.specialty",
  "location.city",
  "location.region",
  "location.postalCode",
]);
export const EMERGENCY_REQUEST_INTERPRET_STAGES = Object.freeze([
  "describe",
  "location",
]);
export const EMERGENCY_REQUEST_INTERPRET_STAGE_PATCH_PATHS = Object.freeze({
  describe: Object.freeze(["description", "service.specialty"]),
  location: Object.freeze([
    "location.city",
    "location.region",
    "location.postalCode",
  ]),
});
export const EMPTY_EMERGENCY_INTAKE = Object.freeze({
  description: "",
  service: Object.freeze({ specialty: "" }),
  location: Object.freeze({ city: "", region: "", postalCode: "" }),
});

const PATCH_PATHS = new Set(EMERGENCY_REQUEST_INTERPRET_PATCH_PATHS);
const STAGES = new Set(EMERGENCY_REQUEST_INTERPRET_STAGES);
const STAGE_PATCH_PATHS = Object.freeze({
  describe: new Set(EMERGENCY_REQUEST_INTERPRET_STAGE_PATCH_PATHS.describe),
  location: new Set(EMERGENCY_REQUEST_INTERPRET_STAGE_PATCH_PATHS.location),
});
const SPECIALTIES = new Set(EMERGENCY_SERVICE_OPTIONS.map(({ value }) => value));
const PROVENANCE = new Set(["assistant_suggested", "assistant_inferred"]);
const UNCERTAINTY = new Set([
  "assistant_suggested",
  "approximate",
  "uncertain",
]);
const VALUE_LIMITS = Object.freeze({
  description: 4000,
  "service.specialty": 120,
  "location.city": 120,
  "location.region": 120,
  "location.postalCode": 32,
});
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUCCESS_CODES = new Set([
  "INTELLIGENCE_OPERATION_COMPLETED",
  "INTELLIGENCE_OPERATION_REPLAYED",
]);
const STREET_ADDRESS_PATTERN =
  /\b\d{1,6}\s+[a-z0-9][^,\n]{0,80}\b(?:street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|lane|ln\.?|boulevard|blvd\.?|court|ct\.?|highway|hwy\.?)\b/i;
const PRIVATE_DETAIL_PATTERNS = Object.freeze([
  /\b(?:street|service|home|full|exact)\s+address\b/i,
  /\bunit\s+#?(?:\d+[a-z]?|[a-z])\b/i,
  /\b(?:unit|apartment|apt\.?|suite)\s+(?:number|#)\b/i,
  /\b(?:apartment|apt\.?|suite)\s+#?[a-z0-9-]{1,12}\b/i,
  /\b(?:gate|door|access|entry)\s*(?:code|pin)\b/i,
  /\baccess\s+instructions?\b/i,
  /\b(?:phone|telephone|mobile)\s+number\b/i,
  /\bemail\s+(?:address|contact)\b/i,
  /\bcontact\s+(?:information|info|details)\b/i,
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,
  /(?:^|[^\d])(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)/,
]);
const DESCRIBE_LOCATION_QUESTION_PATTERN =
  /\b(?:city|zip(?:\s+code)?|postal(?:\s+code)?|service\s+area|general\s+area)\b/i;

const PROVIDER_CONTACT_REQUEST_PATTERN =
  /\b(?:phone|telephone|email)\b|\bmobile\s+(?:number|phone|contact)\b|\bcontact\s+(?:details?|information|info|number)\b|\b(?:reach|contact)\s+(?:you|the\s+homeowner)\b/i;

function plain(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      [Object.prototype, null].includes(Object.getPrototypeOf(value))
  );
}

function exactKeys(value, required, optional = []) {
  if (!plain(value)) return false;
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => allowed.has(key))
  );
}

function boundedText(value, maximum, { required = false } = {}) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new TypeError("Emergency intake values must be text.");
  }
  const text = String(value || "").trim();
  if ((required && !text) || text.length > maximum) {
    throw new TypeError("Emergency intake text exceeds the allowed bounds.");
  }
  return text;
}

function containsPrivateDetail(value) {
  const text = String(value || "");
  return (
    STREET_ADDRESS_PATTERN.test(text) ||
    PRIVATE_DETAIL_PATTERNS.some((pattern) => pattern.test(text))
  );
}

function containsProviderPrivateDetail(value) {
  return (
    containsPrivateDetail(value) ||
    PROVIDER_CONTACT_REQUEST_PATTERN.test(String(value || ""))
  );
}

function rejectPrivateDetail(value) {
  if (containsPrivateDetail(value)) {
    throw new EmergencyRequestInterpretError(
      "Ask Meetro only accepts a general service area before professional selection.",
      { code: "EMERGENCY_INTERPRET_PRIVATE_LOCATION_REJECTED" }
    );
  }
}

function normalizeStage(stage) {
  const normalized = boundedText(stage, 20, { required: true });
  if (!STAGES.has(normalized)) {
    throw new TypeError("The Emergency interpretation stage is not supported.");
  }
  return normalized;
}

function setPath(target, path, value) {
  const [group, key] = String(path).split(".");
  if (!key) return { ...target, [group]: value };
  return {
    ...target,
    [group]: {
      ...target[group],
      [key]: value,
    },
  };
}

export function normalizeEmergencyIntake(intake = {}) {
  const specialty = boundedText(
    intake?.service?.specialty,
    VALUE_LIMITS["service.specialty"]
  );
  if (specialty && !SPECIALTIES.has(specialty)) {
    throw new TypeError("The Emergency specialty is not supported.");
  }
  return {
    description: boundedText(intake?.description, VALUE_LIMITS.description),
    service: { specialty },
    location: {
      city: boundedText(intake?.location?.city, VALUE_LIMITS["location.city"]),
      region: boundedText(intake?.location?.region, VALUE_LIMITS["location.region"]),
      postalCode: boundedText(
        intake?.location?.postalCode,
        VALUE_LIMITS["location.postalCode"]
      ),
    },
  };
}

export function buildEmergencyRequestInterpretRequest({
  text,
  stage,
  intake = EMPTY_EMERGENCY_INTAKE,
  locale = "en-US",
} = {}) {
  const normalizedStage = normalizeStage(stage);
  const inputText = boundedText(text, 4000, { required: true });
  rejectPrivateDetail(inputText);
  return {
    operation: EMERGENCY_REQUEST_INTERPRET_OPERATION,
    capability: EMERGENCY_REQUEST_INTERPRET_CAPABILITY,
    locale: boundedText(locale, 35, { required: true }),
    context: {
      stage: normalizedStage,
      intake: normalizeEmergencyIntake(intake),
    },
    input: { text: inputText },
  };
}

export function createEmergencyRequestInterpretKey(cryptoImpl = globalThis.crypto) {
  const key = cryptoImpl?.randomUUID?.();
  if (!UUID_PATTERN.test(String(key || ""))) {
    throw new Error("A secure UUID Emergency interpretation key is required.");
  }
  return key.toLowerCase();
}

export class EmergencyRequestInterpretError extends Error {
  constructor(message, { classification = "definitive", code = "", status = 0 } = {}) {
    super(message);
    this.name = "EmergencyRequestInterpretError";
    this.classification = classification;
    this.code = code;
    this.status = status;
  }
}

function normalizePatch(field, allowedPaths) {
  if (!exactKeys(
    field,
    [
      "path",
      "value",
      "provenance",
      "confidence",
      "uncertainty",
      "requiresConfirmation",
    ],
    ["rationale"]
  )) return null;
  if (!PATCH_PATHS.has(field.path) || !allowedPaths.has(field.path)) return null;
  let value;
  try {
    value = boundedText(field.value, VALUE_LIMITS[field.path], { required: true });
    rejectPrivateDetail(value);
  } catch {
    return null;
  }
  if (
    (field.path === "service.specialty" && !SPECIALTIES.has(value)) ||
    !PROVENANCE.has(field.provenance) ||
    !UNCERTAINTY.has(field.uncertainty) ||
    !Number.isFinite(field.confidence) ||
    field.confidence < 0 ||
    field.confidence > 1 ||
    field.requiresConfirmation !== true
  ) return null;
  if (
    field.rationale != null &&
    (
      typeof field.rationale !== "string" ||
      field.rationale !== field.rationale.trim() ||
      field.rationale.length > 300 ||
      containsProviderPrivateDetail(field.rationale)
    )
  ) return null;
  return {
    path: field.path,
    value,
    provenance: field.provenance,
    confidence: field.confidence,
    uncertainty: field.uncertainty,
    requiresConfirmation: true,
    ...(typeof field.rationale === "string" ? { rationale: field.rationale } : {}),
  };
}

export function validateEmergencyRequestInterpretation(result, { stage } = {}) {
  let normalizedStage;
  try {
    normalizedStage = normalizeStage(stage);
  } catch {
    return null;
  }
  const allowedPaths = STAGE_PATCH_PATHS[normalizedStage];
  if (!exactKeys(
    result,
    ["schemaVersion", "summary", "draftPatch", "clarifications", "warnings", "validation"]
  )) return null;
  if (
    result.schemaVersion !== 1 ||
    typeof result.summary !== "string" ||
    !result.summary.trim() ||
    result.summary.length > 600 ||
    containsProviderPrivateDetail(result.summary) ||
    !exactKeys(result.draftPatch, ["fields"]) ||
    !Array.isArray(result.draftPatch.fields) ||
    result.draftPatch.fields.length > allowedPaths.size ||
    !Array.isArray(result.clarifications) ||
    result.clarifications.length > 3 ||
    !Array.isArray(result.warnings) ||
    result.warnings.length > 5 ||
    !exactKeys(
      result.validation,
      ["status", "taxonomy", "patchCount", "clarificationCount", "warningCount"]
    ) ||
    result.validation.status !== "accepted" ||
    result.validation.taxonomy !== "emergency_service"
  ) return null;

  const fields = result.draftPatch.fields.map((field) =>
    normalizePatch(field, allowedPaths)
  );
  if (
    fields.some((field) => !field) ||
    new Set(fields.map(({ path }) => path)).size !== fields.length
  ) return null;
  const clarifications = result.clarifications.map((clarification) => {
    if (!exactKeys(clarification, ["question"], ["fieldPath"])) return null;
    const question = typeof clarification.question === "string"
      ? clarification.question.trim()
      : "";
    if (
      !question ||
      question.length > 300 ||
      containsProviderPrivateDetail(question) ||
      (normalizedStage === "describe" &&
        DESCRIBE_LOCATION_QUESTION_PATTERN.test(question)) ||
      (clarification.fieldPath != null && !allowedPaths.has(clarification.fieldPath))
    ) return null;
    return clarification.fieldPath == null
      ? { question }
      : { question, fieldPath: clarification.fieldPath };
  });
  if (clarifications.some((clarification) => !clarification)) return null;
  const warnings = result.warnings.map((warning) => {
    if (!exactKeys(warning, ["code", "message"])) return null;
    if (
      typeof warning.code !== "string" ||
      !/^[a-z][a-z0-9_]{0,79}$/.test(warning.code) ||
      typeof warning.message !== "string" ||
      !warning.message.trim() ||
      warning.message !== warning.message.trim() ||
      warning.message.length > 300 ||
      containsProviderPrivateDetail(warning.message)
    ) return null;
    return { code: warning.code, message: warning.message };
  });
  if (warnings.some((warning) => !warning)) return null;
  if (
    result.validation.patchCount !== fields.length ||
    result.validation.clarificationCount !== clarifications.length ||
    result.validation.warningCount !== warnings.length
  ) return null;
  return {
    schemaVersion: 1,
    summary: result.summary.trim(),
    draftPatch: { fields },
    clarifications,
    warnings,
    validation: { ...result.validation },
  };
}

export async function requestEmergencyRequestInterpretation({
  text,
  stage,
  intake = EMPTY_EMERGENCY_INTAKE,
  locale = "en-US",
  idempotencyKey = createEmergencyRequestInterpretKey(),
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  if (!UUID_PATTERN.test(String(idempotencyKey || ""))) {
    throw new TypeError("A valid Emergency interpretation key is required.");
  }
  const request = buildEmergencyRequestInterpretRequest({
    text,
    stage,
    intake,
    locale,
  });
  let response;
  let data;
  try {
    ({ response, data } = await authFetchImpl(
      EMERGENCY_REQUEST_INTERPRET_ROUTE,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(request),
      },
      setPage
    ));
  } catch {
    throw new EmergencyRequestInterpretError(
      "Ask Meetro could not safely finish the Emergency suggestion.",
      { classification: "ambiguous", code: "INTELLIGENCE_NETWORK_AMBIGUOUS" }
    );
  }
  const status = Number(response?.status || 0);
  if (
    !response?.ok ||
    data?.success !== true ||
    !SUCCESS_CODES.has(data.code) ||
    data.operation !== EMERGENCY_REQUEST_INTERPRET_OPERATION
  ) {
    throw new EmergencyRequestInterpretError(
      data?.message || "Ask Meetro could not prepare the Emergency suggestion.",
      {
        classification: status >= 500 ? "ambiguous" : "definitive",
        code: String(data?.code || "INTELLIGENCE_REQUEST_FAILED"),
        status,
      }
    );
  }
  const interpretation = validateEmergencyRequestInterpretation(
    data.result,
    { stage }
  );
  if (!interpretation) {
    throw new EmergencyRequestInterpretError(
      "Ask Meetro returned an invalid Emergency suggestion.",
      { classification: "ambiguous", code: "INTELLIGENCE_RESULT_INVALID", status }
    );
  }
  return {
    operationId: data.operationId,
    correlationId: data.correlationId,
    interpretation,
    replayed: data.code === "INTELLIGENCE_OPERATION_REPLAYED",
  };
}

export function applyEmergencyRequestInterpretation(
  intake,
  interpretation,
  { stage } = {}
) {
  const normalizedInterpretation = validateEmergencyRequestInterpretation(
    interpretation,
    { stage }
  );
  if (!normalizedInterpretation) {
    throw new EmergencyRequestInterpretError(
      "Ask Meetro returned a proposal outside the active Emergency intake stage.",
      { code: "EMERGENCY_INTERPRET_STAGE_MISMATCH" }
    );
  }
  let next = normalizeEmergencyIntake(intake);
  const appliedFields = [];
  for (const field of normalizedInterpretation.draftPatch.fields) {
    next = setPath(next, field.path, field.value);
    appliedFields.push(field.path);
  }
  return { intake: next, appliedFields, rejectedFields: [] };
}

export function buildEmergencyGeneralArea(location = {}) {
  const city = boundedText(location.city, VALUE_LIMITS["location.city"]);
  const region = boundedText(location.region, VALUE_LIMITS["location.region"]);
  const postalCode = boundedText(
    location.postalCode,
    VALUE_LIMITS["location.postalCode"]
  );
  const regionAndPostal = [region, postalCode].filter(Boolean).join(" ");
  return [city, regionAndPostal].filter(Boolean).join(", ");
}

export function confirmEmergencyRequestInterpretation(intake) {
  const normalized = normalizeEmergencyIntake(intake);
  const locationText = buildEmergencyGeneralArea(normalized.location);
  if (!normalized.description || !normalized.service.specialty || !locationText) {
    throw new TypeError("A reviewed Emergency description, specialty, and general area are required.");
  }
  return Object.freeze({
    description: normalized.description,
    serviceSpecialty: normalized.service.specialty,
    locationText,
    unitNumber: "",
    accessNotes: "",
  });
}
