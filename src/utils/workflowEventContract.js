import { getProjectIdentity } from "./projectIdentity.js";

export const WORKFLOW_EVENT_CONTRACT_VERSION = 1;

export const WORKFLOW_EVENT_TYPES = Object.freeze({
  WORKFLOW_REQUEST_CREATED: "WORKFLOW_REQUEST_CREATED",
  WORKFLOW_APPOINTMENT_CREATED: "WORKFLOW_APPOINTMENT_CREATED",
  WORKFLOW_APPOINTMENT_UPDATED: "WORKFLOW_APPOINTMENT_UPDATED",
  WORKFLOW_QUOTE_CREATED: "WORKFLOW_QUOTE_CREATED",
  WORKFLOW_QUOTE_SENT: "WORKFLOW_QUOTE_SENT",
  WORKFLOW_QUOTE_ACCEPTED: "WORKFLOW_QUOTE_ACCEPTED",
  WORKFLOW_WORK_STARTED: "WORKFLOW_WORK_STARTED",
  WORKFLOW_MATERIALS_REQUESTED: "WORKFLOW_MATERIALS_REQUESTED",
  WORKFLOW_COMPLETION_SUBMITTED: "WORKFLOW_COMPLETION_SUBMITTED",
  WORKFLOW_COMPLETION_CONFIRMED: "WORKFLOW_COMPLETION_CONFIRMED",
  MESSAGE_CREATED: "MESSAGE_CREATED",
  UNKNOWN_WORKFLOW_EVENT: "UNKNOWN_WORKFLOW_EVENT",
});

export const CANONICAL_WORKFLOW_EVENT_TYPES = Object.freeze(
  Object.values(WORKFLOW_EVENT_TYPES)
);

export const WORKFLOW_EVENT_REQUIRED_FIELDS = Object.freeze([
  "id",
  "eventType",
  "projectId",
  "conversationId",
  "actor",
  "actorRole",
  "recordedAt",
  "source",
  "payload",
]);

export const WORKFLOW_EVENT_OPTIONAL_FIELDS = Object.freeze([
  "legacy",
  "metadata",
  "migrationSource",
]);

// Retained as the combined canonical field list for existing report callers.
export const WORKFLOW_EVENT_FIELDS = Object.freeze([
  ...WORKFLOW_EVENT_REQUIRED_FIELDS,
  ...WORKFLOW_EVENT_OPTIONAL_FIELDS,
]);

export const WORKFLOW_EVENT_ACTOR_ROLES = Object.freeze([
  "homeowner",
  "business",
  "system",
]);

const SUPPORTED_EVENT_TYPES = new Set(CANONICAL_WORKFLOW_EVENT_TYPES);
const SUPPORTED_ACTOR_ROLES = new Set(WORKFLOW_EVENT_ACTOR_ROLES);
const SOURCE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function firstValue(...values) {
  return values.find(hasValue);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isPlainObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      cloneValue(nestedValue),
    ])
  );
}

function clonePlainObject(value) {
  return isPlainObject(value) ? cloneValue(value) : {};
}

function createWarning(code, message, source) {
  return { code, message, source };
}

function normalizeTimestamp(value) {
  if (!hasValue(value)) return "";

  const date =
    typeof value === "number" || /^\d+$/.test(String(value))
      ? new Date(Number(value))
      : new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function isUtcIsoTimestamp(value) {
  if (typeof value !== "string" || !value.endsWith("Z")) return false;
  const normalized = normalizeTimestamp(value);
  return Boolean(normalized && normalized === value);
}

function addValidationError(errors, field, code, message) {
  errors.push({ field, code, message });
}

function attachCompatibilityDiagnostics(event, diagnostics) {
  const aliases = {
    eventId: event.id,
    actorId: event.actor,
    occurredAt: diagnostics.occurredAt,
    payloadVersion: diagnostics.payloadVersion,
    requestId: diagnostics.requestId,
    sequence: diagnostics.sequence,
    identitySource: diagnostics.identitySource,
    warnings: diagnostics.warnings,
  };

  Object.entries(aliases).forEach(([field, value]) => {
    Object.defineProperty(event, field, {
      configurable: true,
      enumerable: false,
      value,
      writable: false,
    });
  });

  return event;
}

// Strict validation is intentionally not adopted by runtime writers yet.
// Phase 3J can reuse this pure gate when aligning the factory.
export function validateCanonicalWorkflowEvent(record) {
  const errors = [];

  if (!isPlainObject(record)) {
    return {
      ok: false,
      errors: [
        {
          field: "",
          code: "invalid-event-object",
          message: "A canonical workflow event must be a plain object.",
        },
      ],
    };
  }

  WORKFLOW_EVENT_REQUIRED_FIELDS.forEach((field) => {
    const value = record[field];
    const missing =
      field === "payload" ? !isPlainObject(value) : !hasValue(value);

    if (missing) {
      addValidationError(
        errors,
        field,
        `missing-${field}`,
        `Canonical field ${field} is required.`
      );
    }
  });

  if (
    hasValue(record.eventType) &&
    (!SUPPORTED_EVENT_TYPES.has(record.eventType) ||
      record.eventType === WORKFLOW_EVENT_TYPES.UNKNOWN_WORKFLOW_EVENT)
  ) {
    addValidationError(
      errors,
      "eventType",
      "unsupported-event-type",
      "Canonical writers must use an approved non-unknown event type."
    );
  }

  if (
    hasValue(record.actor) &&
    String(record.actor).trim().toLowerCase() === "unknown"
  ) {
    addValidationError(
      errors,
      "actor",
      "unknown-actor",
      "Canonical actor identity cannot be unknown."
    );
  }

  if (
    hasValue(record.actorRole) &&
    !SUPPORTED_ACTOR_ROLES.has(String(record.actorRole).trim())
  ) {
    addValidationError(
      errors,
      "actorRole",
      "unsupported-actor-role",
      "Canonical actorRole must use the approved role vocabulary."
    );
  }

  if (hasValue(record.recordedAt) && !isUtcIsoTimestamp(record.recordedAt)) {
    addValidationError(
      errors,
      "recordedAt",
      "invalid-recorded-at",
      "Canonical recordedAt must be a normalized UTC ISO-8601 timestamp."
    );
  }

  if (
    hasValue(record.source) &&
    (!SOURCE_PATTERN.test(String(record.source)) ||
      String(record.source) === "unknown")
  ) {
    addValidationError(
      errors,
      "source",
      "invalid-source",
      "Canonical source must be a registered lowercase kebab-case value."
    );
  }

  ["legacy", "metadata"].forEach((field) => {
    if (record[field] !== undefined && !isPlainObject(record[field])) {
      addValidationError(
        errors,
        field,
        `invalid-${field}`,
        `Optional field ${field} must be a plain object when present.`
      );
    }
  });

  if (
    record.migrationSource !== undefined &&
    !hasValue(record.migrationSource)
  ) {
    addValidationError(
      errors,
      "migrationSource",
      "invalid-migration-source",
      "Optional migrationSource must be a non-empty string when present."
    );
  }

  return { ok: errors.length === 0, errors };
}

export function isCanonicalWorkflowEvent(record) {
  return validateCanonicalWorkflowEvent(record).ok;
}

// Tolerant read normalization preserves legacy records for reconciliation.
// It does not certify the result as an authoritative canonical write.
export function normalizeWorkflowEvent(record, { source = "unknown" } = {}) {
  const safeRecord = isPlainObject(record) ? record : {};
  const payload = clonePlainObject(
    isPlainObject(safeRecord.payload)
      ? safeRecord.payload
      : safeRecord.workflow_payload
  );
  const identity = getProjectIdentity({
    projectId: firstValue(safeRecord.projectId, payload.projectId),
    requestId: firstValue(
      safeRecord.requestId,
      safeRecord.request_id,
      payload.requestId,
      payload.request_id
    ),
    jobId: firstValue(safeRecord.jobId, payload.jobId),
    quoteRequestId: firstValue(
      safeRecord.quoteRequestId,
      payload.quoteRequestId
    ),
    emergencyId: firstValue(safeRecord.emergencyId, payload.emergencyId),
    postId: firstValue(safeRecord.postId, payload.postId),
  });
  const canonicalId = firstValue(safeRecord.id, payload.id);
  const aliasId = firstValue(
    safeRecord.eventId,
    safeRecord.event_id,
    safeRecord.backendId,
    safeRecord.backend_id,
    payload.eventId,
    payload.event_id
  );
  const id = firstValue(canonicalId, aliasId, "");
  const eventType = String(
    firstValue(
      safeRecord.eventType,
      safeRecord.workflowType,
      safeRecord.workflow_type,
      safeRecord.type,
      payload.eventType,
      payload.workflowType,
      payload.type,
      ""
    ) ?? ""
  );
  const canonicalActor = firstValue(safeRecord.actor, payload.actor);
  const aliasActor = firstValue(
    safeRecord.actorId,
    safeRecord.senderId,
    safeRecord.sender_id,
    payload.actorId,
    payload.senderId
  );
  const actor = String(firstValue(canonicalActor, aliasActor, "") ?? "");
  const actorRole = String(
    firstValue(
      safeRecord.actorRole,
      safeRecord.senderRole,
      payload.actorRole,
      payload.senderRole,
      ""
    ) ?? ""
  );
  const canonicalRecordedAt = firstValue(
    safeRecord.recordedAt,
    payload.recordedAt
  );
  const aliasRecordedAt = firstValue(
    safeRecord.savedAt,
    safeRecord.updatedAt,
    safeRecord.occurredAt,
    safeRecord.createdAt,
    safeRecord.created_at,
    safeRecord.timestamp,
    payload.savedAt,
    payload.occurredAt,
    payload.createdAt
  );
  const recordedAt = normalizeTimestamp(
    firstValue(canonicalRecordedAt, aliasRecordedAt)
  );
  const resolvedSource = String(
    firstValue(safeRecord.source, source, "unknown")
  );
  const warnings = identity.warnings.map((warning) => ({
    ...warning,
    source: resolvedSource,
  }));

  if (!id) {
    warnings.push(
      createWarning(
        "missing-event-id",
        "The event has no canonical or legacy identifier.",
        resolvedSource
      )
    );
  } else if (!canonicalId && aliasId) {
    warnings.push(
      createWarning(
        "legacy-event-id-alias",
        "The event uses a legacy identifier alias instead of canonical id.",
        resolvedSource
      )
    );
  }

  if (!eventType) {
    warnings.push(
      createWarning(
        "missing-event-type",
        "The event type is missing.",
        resolvedSource
      )
    );
  }

  if (!actor) {
    warnings.push(
      createWarning(
        "missing-event-actor-id",
        "The persisted event does not identify its actor.",
        resolvedSource
      )
    );
  } else if (!canonicalActor && aliasActor) {
    warnings.push(
      createWarning(
        "legacy-actor-alias",
        "The event uses a legacy actor alias instead of canonical actor.",
        resolvedSource
      )
    );
  }

  if (!actorRole) {
    warnings.push(
      createWarning(
        "missing-event-actor-role",
        "The persisted event does not identify its actor role.",
        resolvedSource
      )
    );
  }

  if (!recordedAt) {
    warnings.push(
      createWarning(
        hasValue(firstValue(canonicalRecordedAt, aliasRecordedAt))
          ? "invalid-event-recorded-at"
          : "missing-event-recorded-at",
        "The event has no valid canonical or legacy timestamp.",
        resolvedSource
      )
    );
  } else if (!canonicalRecordedAt && aliasRecordedAt) {
    warnings.push(
      createWarning(
        "legacy-recorded-at-alias",
        "The event uses a legacy timestamp alias instead of canonical recordedAt.",
        resolvedSource
      )
    );
  }

  const normalized = {
    id: String(id),
    eventType,
    projectId: identity.projectId,
    conversationId: String(
      firstValue(
        safeRecord.conversationId,
        payload.conversationId,
        ""
      ) ?? ""
    ),
    actor,
    actorRole,
    recordedAt,
    source: resolvedSource,
    payload,
  };

  if (isPlainObject(safeRecord.legacy)) {
    normalized.legacy = cloneValue(safeRecord.legacy);
  }
  if (isPlainObject(safeRecord.metadata)) {
    normalized.metadata = cloneValue(safeRecord.metadata);
  }
  if (hasValue(safeRecord.migrationSource)) {
    normalized.migrationSource = String(safeRecord.migrationSource);
  }

  return attachCompatibilityDiagnostics(normalized, {
    occurredAt: normalizeTimestamp(
      firstValue(
        safeRecord.occurredAt,
        safeRecord.createdAt,
        safeRecord.created_at,
        safeRecord.timestamp,
        payload.occurredAt,
        payload.createdAt
      )
    ),
    payloadVersion: Number(
      firstValue(
        safeRecord.payloadVersion,
        payload.payloadVersion,
        WORKFLOW_EVENT_CONTRACT_VERSION
      )
    ),
    requestId: String(
      firstValue(
        safeRecord.requestId,
        safeRecord.request_id,
        payload.requestId,
        payload.request_id,
        ""
      ) ?? ""
    ),
    sequence: firstValue(safeRecord.sequence, payload.sequence, null),
    identitySource: identity.identitySource,
    warnings,
  });
}

export function getWorkflowEventContractReport(
  records = [],
  { source = "unknown", declaredTypes = [], renderedTypes = [] } = {}
) {
  const normalizedEvents = Array.isArray(records)
    ? records.map((record) => normalizeWorkflowEvent(record, { source }))
    : [];
  const warningCounts = {};

  normalizedEvents.forEach((event) => {
    event.warnings.forEach((warning) => {
      warningCounts[warning.code] = (warningCounts[warning.code] || 0) + 1;
    });
  });

  const declared = new Set(declaredTypes);
  const rendered = new Set(renderedTypes);

  return {
    contractVersion: WORKFLOW_EVENT_CONTRACT_VERSION,
    requiredFields: [...WORKFLOW_EVENT_REQUIRED_FIELDS],
    optionalFields: [...WORKFLOW_EVENT_OPTIONAL_FIELDS],
    supportedEventTypes: [...CANONICAL_WORKFLOW_EVENT_TYPES],
    eventCount: normalizedEvents.length,
    safeProjectIdentityCount: normalizedEvents.filter(
      (event) => event.projectId
    ).length,
    immutableEventIdCount: normalizedEvents.filter(
      (event) =>
        event.id &&
        !event.warnings.some(
          (warning) => warning.code === "legacy-event-id-alias"
        )
    ).length,
    warningCounts,
    schemaDifferences: {
      renderedButUndeclared: [...rendered].filter((type) => !declared.has(type)),
      declaredButNotRendered: [...declared].filter((type) => !rendered.has(type)),
    },
    normalizedEvents,
  };
}
