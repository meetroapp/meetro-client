export const CANONICAL_COMMERCIAL_AUTHORITY_SOURCE =
  "canonical-commercial-authority";
export const CANONICAL_COMMERCIAL_OWNING_ENGINE = "authorization_engine";

export const CANONICAL_COMMERCIAL_AGGREGATE_TYPES = Object.freeze([
  "evaluation",
  "quote",
  "customer_decision",
  "authorization",
  "change_order",
  "invoice",
  "payment",
  "receipt",
  "commercial_completion",
]);

export const COMMERCIAL_CAPABILITIES = Object.freeze([
  "evaluation",
  "quote",
  "customer_decision",
  "authorization",
  "scheduling",
  "change_order",
  "invoice",
  "payment",
  "receipt",
  "commercial_completion",
  "project_closeout",
]);

export const CANONICAL_COMMERCIAL_EVIDENCE_TYPES = Object.freeze([
  "commercial.aggregate.created",
  "commercial.aggregate.version_advanced",
  "evaluation_created",
  "evaluation_draft_updated",
  "evaluation_completed",
]);

const EVIDENCE_COMMANDS = Object.freeze({
  "commercial.aggregate.created": "commercial.aggregate.create",
  "commercial.aggregate.version_advanced":
    "commercial.aggregate.version.advance",
  evaluation_created: "evaluation.create",
  evaluation_draft_updated: "evaluation.draft.update",
  evaluation_completed: "evaluation.complete",
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function canonicalUuid(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

function normalizeSourceContext(value) {
  if (!isPlainObject(value)) return null;
  const relationshipId =
    value.relationshipId == null ? null : positiveInteger(value.relationshipId);
  if (value.relationshipId != null && !relationshipId) return null;

  if (value.type === "ordinary_request") {
    const requestId = positiveInteger(value.requestId);
    const allowed = new Set(["type", "requestId", "relationshipId"]);
    if (!requestId || Object.keys(value).some((key) => !allowed.has(key))) {
      return null;
    }
    return { type: value.type, requestId, relationshipId };
  }

  if (value.type === "ordinary_job") {
    const jobId = canonicalUuid(value.jobId);
    const requestId = positiveInteger(value.requestId);
    const allowed = new Set([
      "type",
      "jobId",
      "requestId",
      "relationshipId",
    ]);
    if (
      !jobId ||
      !requestId ||
      Object.keys(value).some((key) => !allowed.has(key))
    ) {
      return null;
    }
    return { type: value.type, jobId, requestId, relationshipId };
  }

  if (value.type === "emergency_request") {
    const emergencyRequestId = positiveInteger(value.emergencyRequestId);
    const allowed = new Set(["type", "emergencyRequestId", "relationshipId"]);
    if (
      !emergencyRequestId ||
      Object.keys(value).some((key) => !allowed.has(key))
    ) {
      return null;
    }
    return { type: value.type, emergencyRequestId, relationshipId };
  }

  return null;
}

export function validateCanonicalCommercialAuthorityProjection(value) {
  const errors = [];
  if (!isPlainObject(value)) {
    return {
      ok: false,
      errors: ["Canonical commercial authority must be a plain object."],
    };
  }

  const aggregate = isPlainObject(value.aggregate) ? value.aggregate : {};
  const id = canonicalUuid(aggregate.id);
  const type =
    typeof aggregate.type === "string" ? aggregate.type.trim() : "";
  const version = positiveInteger(aggregate.version);
  const sourceContext = normalizeSourceContext(aggregate.sourceContext);

  if (value.authoritySource !== CANONICAL_COMMERCIAL_AUTHORITY_SOURCE) {
    errors.push("The authority source is not canonical.");
  }
  if (value.confirmed !== true) {
    errors.push("Canonical commercial authority is not backend-confirmed.");
  }
  if (!id) errors.push("A canonical aggregate UUID is required.");
  if (!CANONICAL_COMMERCIAL_AGGREGATE_TYPES.includes(type)) {
    errors.push("The canonical aggregate type is invalid.");
  }
  if (aggregate.owningEngine !== CANONICAL_COMMERCIAL_OWNING_ENGINE) {
    errors.push("The aggregate is not owned by the Authorization Engine.");
  }
  if (!version) errors.push("A positive canonical aggregate version is required.");
  if (!sourceContext) errors.push("The canonical source context is invalid.");

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    value: {
      authoritySource: CANONICAL_COMMERCIAL_AUTHORITY_SOURCE,
      confirmed: true,
      aggregate: {
        id,
        type,
        owningEngine: CANONICAL_COMMERCIAL_OWNING_ENGINE,
        version,
        sourceContext,
      },
    },
  };
}

export function getConfirmedCanonicalCommercialAuthority(response) {
  if (!isPlainObject(response) || response.success !== true) return null;
  const validation = validateCanonicalCommercialAuthorityProjection(response);
  return validation.ok ? validation.value : null;
}

export function isCanonicalCommercialEvidence(value) {
  if (!isPlainObject(value)) return false;
  if (value.authoritySource !== CANONICAL_COMMERCIAL_AUTHORITY_SOURCE) {
    return false;
  }
  const evidence = isPlainObject(value.evidence) ? value.evidence : null;
  if (!evidence) return false;

  const previousVersion = Number(evidence.previousVersion);
  const resultingVersion = positiveInteger(evidence.resultingVersion);
  const traceability = isPlainObject(evidence.traceability)
    ? evidence.traceability
    : {};
  const evaluationEvidence = evidence.type.startsWith("evaluation_");

  return Boolean(
    canonicalUuid(evidence.id) &&
      canonicalUuid(evidence.aggregateId) &&
      CANONICAL_COMMERCIAL_AGGREGATE_TYPES.includes(evidence.aggregateType) &&
      evidence.owningEngine === CANONICAL_COMMERCIAL_OWNING_ENGINE &&
      CANONICAL_COMMERCIAL_EVIDENCE_TYPES.includes(evidence.type) &&
      ["homeowner", "professional"].includes(evidence.actorRole) &&
      Number.isSafeInteger(previousVersion) &&
      previousVersion >= 0 &&
      resultingVersion === previousVersion + 1 &&
      isPlainObject(evidence.payload) &&
      evidence.sourceCommand === EVIDENCE_COMMANDS[evidence.type] &&
      traceability.governingCharterId === "MC-WORKFLOW-001C" &&
      traceability.governingProgramId === "MC-WORKFLOW-001D" &&
      traceability.implementationMilestoneId === "MC-WORKFLOW-002A" &&
      (!evaluationEvidence ||
        traceability.capabilityMilestoneId === "MC-WORKFLOW-002B") &&
      traceability.certificationTarget === "MC-WORKFLOW-002R"
  );
}

export function isCommercialCapabilityAvailable() {
  return false;
}
