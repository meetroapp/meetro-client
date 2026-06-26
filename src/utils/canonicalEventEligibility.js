import {
  CANONICAL_WORKFLOW_EVENT_TYPES,
  WORKFLOW_EVENT_TYPES,
} from "./workflowEventContract.js";

export const CANONICAL_EVENT_FIELD_TRUST = Object.freeze({
  AUTHORITATIVE: "AUTHORITATIVE",
  INFERRED: "INFERRED",
  FALLBACK: "FALLBACK",
  CONFLICTING: "CONFLICTING",
  MISSING: "MISSING",
});

export const CANONICAL_EVENT_SHADOW_RISK = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
});

const APPROVED_EVENT_TYPES = new Set(
  CANONICAL_WORKFLOW_EVENT_TYPES.filter(
    (eventType) => eventType !== WORKFLOW_EVENT_TYPES.UNKNOWN_WORKFLOW_EVENT
  )
);

const AUTHORITIES = Object.freeze({
  projectId: new Set([
    "canonical-event",
    "project-aggregate",
    "authoritative-project-link",
    "backend-acknowledgement",
  ]),
  conversationId: new Set([
    "canonical-event",
    "conversation-authority",
    "authoritative-conversation-link",
    "backend-acknowledgement",
  ]),
  actorId: new Set([
    "authentication-context",
    "backend-acknowledgement",
    "registered-system-principal",
  ]),
  actorRole: new Set([
    "authorization-context",
    "backend-acknowledgement",
    "registered-system-principal",
  ]),
  entityId: new Set([
    "canonical-event",
    "domain-aggregate",
    "quote-authority",
    "scheduling-authority",
    "message-persistence",
    "project-aggregate",
    "completion-authority",
    "backend-acknowledgement",
  ]),
  eventId: new Set([
    "canonical-event",
    "backend-event-store",
    "idempotency-authority",
    "backend-acknowledgement",
  ]),
  occurredAt: new Set(["domain-authority", "backend-acknowledgement"]),
  recordedAt: new Set(["event-persistence", "backend-acknowledgement"]),
});

const INFERRED_AUTHORITIES = new Set([
  "compatibility-layer",
  "conversation-id",
  "generic-id",
  "legacy-alias",
  "reconciliation",
  "request-id",
]);

const FALLBACK_AUTHORITIES = new Set([
  "active-selection",
  "client-clock",
  "current-viewer",
  "display-value",
  "local-storage",
  "route-state",
  "ui-context",
]);

const REQUIRED_TRUSTED_FIELDS = Object.freeze([
  "projectId",
  "conversationId",
  "actorId",
  "actorRole",
  "entityId",
  "eventId",
]);

const TIMESTAMP_FIELDS = Object.freeze(["occurredAt", "recordedAt"]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeValue(value) {
  return hasValue(value) ? String(value).trim() : "";
}

function readEvidence(value) {
  if (!isRecord(value)) {
    return {
      value: normalizeValue(value),
      authority: "",
      conflicting: false,
    };
  }

  return {
    value: normalizeValue(value.value),
    authority: normalizeValue(
      value.authority || value.provenance || value.source
    ).toLowerCase(),
    conflicting:
      value.conflicting === true ||
      String(value.classification || "").toUpperCase() ===
        CANONICAL_EVENT_FIELD_TRUST.CONFLICTING,
  };
}

function readAcknowledgement(input) {
  const acknowledgement = isRecord(input.acknowledgement)
    ? input.acknowledgement
    : {};

  return {
    acknowledged:
      acknowledgement.acknowledged === true ||
      acknowledgement.ok === true ||
      acknowledgement.status === "acknowledged",
    authority: normalizeValue(acknowledgement.authority).toLowerCase(),
    projectId: normalizeValue(acknowledgement.projectId),
    conversationId: normalizeValue(acknowledgement.conversationId),
    actorId: normalizeValue(
      acknowledgement.actorId || acknowledgement.actor
    ),
    actorRole: normalizeValue(acknowledgement.actorRole),
    entityId: normalizeValue(acknowledgement.entityId),
    eventId: normalizeValue(
      acknowledgement.eventId || acknowledgement.id
    ),
    recordedAt: normalizeValue(acknowledgement.recordedAt),
    completionPolicyApproved:
      acknowledgement.completionPolicyApproved === true,
  };
}

function isValidTimestamp(value) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function isGenericIdentifier(evidence) {
  const value = evidence.value.toLowerCase();

  if (evidence.authority === "generic-id") return true;
  if (!value) return false;

  return [
    "id",
    "unknown",
    "temp",
    "temporary",
    "demo",
    "placeholder",
  ].includes(value);
}

function acknowledgementValue(field, acknowledgement) {
  return normalizeValue(acknowledgement[field]);
}

function classifyIdentityField(field, evidence, acknowledgement) {
  if (!evidence.value) return CANONICAL_EVENT_FIELD_TRUST.MISSING;
  if (evidence.conflicting) return CANONICAL_EVENT_FIELD_TRUST.CONFLICTING;

  const acknowledgedValue = acknowledgementValue(field, acknowledgement);
  if (
    acknowledgement.acknowledged &&
    acknowledgedValue &&
    acknowledgedValue !== evidence.value
  ) {
    return CANONICAL_EVENT_FIELD_TRUST.CONFLICTING;
  }

  if (isGenericIdentifier(evidence)) {
    return CANONICAL_EVENT_FIELD_TRUST.INFERRED;
  }

  if (AUTHORITIES[field].has(evidence.authority)) {
    return CANONICAL_EVENT_FIELD_TRUST.AUTHORITATIVE;
  }

  if (
    acknowledgement.acknowledged &&
    acknowledgedValue === evidence.value &&
    acknowledgement.authority === "backend-event-store"
  ) {
    return CANONICAL_EVENT_FIELD_TRUST.AUTHORITATIVE;
  }

  if (FALLBACK_AUTHORITIES.has(evidence.authority)) {
    return CANONICAL_EVENT_FIELD_TRUST.FALLBACK;
  }

  if (
    INFERRED_AUTHORITIES.has(evidence.authority) ||
    !evidence.authority
  ) {
    return CANONICAL_EVENT_FIELD_TRUST.INFERRED;
  }

  return CANONICAL_EVENT_FIELD_TRUST.INFERRED;
}

function classifyTimestampField(field, evidence, acknowledgement) {
  if (!evidence.value) return CANONICAL_EVENT_FIELD_TRUST.MISSING;
  if (evidence.conflicting || !isValidTimestamp(evidence.value)) {
    return CANONICAL_EVENT_FIELD_TRUST.CONFLICTING;
  }

  const acknowledgedValue = acknowledgementValue(field, acknowledgement);
  if (
    acknowledgement.acknowledged &&
    acknowledgedValue &&
    acknowledgedValue !== evidence.value
  ) {
    return CANONICAL_EVENT_FIELD_TRUST.CONFLICTING;
  }

  if (AUTHORITIES[field].has(evidence.authority)) {
    return CANONICAL_EVENT_FIELD_TRUST.AUTHORITATIVE;
  }

  if (
    field === "recordedAt" &&
    acknowledgement.acknowledged &&
    acknowledgement.recordedAt === evidence.value &&
    acknowledgement.authority === "backend-event-store"
  ) {
    return CANONICAL_EVENT_FIELD_TRUST.AUTHORITATIVE;
  }

  if (
    FALLBACK_AUTHORITIES.has(evidence.authority) ||
    evidence.authority === "client-clock"
  ) {
    return CANONICAL_EVENT_FIELD_TRUST.FALLBACK;
  }

  return CANONICAL_EVENT_FIELD_TRUST.INFERRED;
}

function createFinding(field, code, trust, message) {
  return { field, code, trust, message };
}

function getRequiredFieldMessage(field, trust) {
  if (trust === CANONICAL_EVENT_FIELD_TRUST.MISSING) {
    return `Required field ${field} is missing.`;
  }
  if (trust === CANONICAL_EVENT_FIELD_TRUST.CONFLICTING) {
    return `Required field ${field} conflicts with supplied provenance or acknowledgement.`;
  }
  if (field === "actorId") {
    return "Actor identity is not authenticated.";
  }
  if (field === "actorRole") {
    return "Actor role is not authorization-derived.";
  }
  if (field === "projectId") {
    return "Project identity is inferred or fallback rather than explicit and authoritative.";
  }
  if (field === "conversationId") {
    return "Conversation identity is inferred or fallback rather than explicit and authoritative.";
  }
  if (field === "entityId") {
    return "Stable workflow entity identity is not authoritative.";
  }
  return "Event identity is generic, inferred, or fallback rather than canonical.";
}

function getRequiredFieldCode(field, trust) {
  if (trust === CANONICAL_EVENT_FIELD_TRUST.MISSING) {
    return `missing-${field}`;
  }
  if (trust === CANONICAL_EVENT_FIELD_TRUST.CONFLICTING) {
    return `conflicting-${field}`;
  }
  if (field === "actorId") return "inferred-actor";
  if (field === "actorRole") return "inferred-actor-role";
  if (field === "projectId") return "inferred-project";
  if (field === "conversationId") return "inferred-conversation";
  if (field === "entityId") return "unstable-entity-id";
  return "generic-event-id";
}

function isCompletionEvent(eventType) {
  return [
    WORKFLOW_EVENT_TYPES.WORKFLOW_COMPLETION_SUBMITTED,
    WORKFLOW_EVENT_TYPES.WORKFLOW_COMPLETION_CONFIRMED,
  ].includes(eventType);
}

function calculateShadowRisk(blockers, warnings) {
  if (blockers.length > 0) return CANONICAL_EVENT_SHADOW_RISK.HIGH;
  if (warnings.length > 0) return CANONICAL_EVENT_SHADOW_RISK.MEDIUM;
  return CANONICAL_EVENT_SHADOW_RISK.LOW;
}

// This validator measures eligibility only. It does not construct, persist,
// emit, or authorize a canonical event.
export function validateCanonicalEventEligibility(input = {}) {
  const safeInput = isRecord(input) ? input : {};
  const acknowledgement = readAcknowledgement(safeInput);
  const eventType = normalizeValue(safeInput.eventType);
  const evidence = Object.fromEntries(
    [
      ...REQUIRED_TRUSTED_FIELDS,
      ...TIMESTAMP_FIELDS,
    ].map((field) => [field, readEvidence(safeInput[field])])
  );
  const eventTypeTrust = APPROVED_EVENT_TYPES.has(eventType)
    ? CANONICAL_EVENT_FIELD_TRUST.AUTHORITATIVE
    : eventType
    ? CANONICAL_EVENT_FIELD_TRUST.INFERRED
    : CANONICAL_EVENT_FIELD_TRUST.MISSING;
  const fieldTrust = {
    eventType: eventTypeTrust,
    ...Object.fromEntries(
      REQUIRED_TRUSTED_FIELDS.map((field) => [
        field,
        classifyIdentityField(field, evidence[field], acknowledgement),
      ])
    ),
    ...Object.fromEntries(
      TIMESTAMP_FIELDS.map((field) => [
        field,
        classifyTimestampField(field, evidence[field], acknowledgement),
      ])
    ),
    acknowledgement: acknowledgement.acknowledged
      ? acknowledgement.authority === "backend-event-store"
        ? CANONICAL_EVENT_FIELD_TRUST.AUTHORITATIVE
        : CANONICAL_EVENT_FIELD_TRUST.INFERRED
      : CANONICAL_EVENT_FIELD_TRUST.MISSING,
  };
  const blockers = [];
  const warnings = [];

  if (eventTypeTrust !== CANONICAL_EVENT_FIELD_TRUST.AUTHORITATIVE) {
    blockers.push(
      createFinding(
        "eventType",
        eventType ? "unknown-event-type" : "missing-event-type",
        eventTypeTrust,
        "A future shadow event requires an approved non-unknown canonical event type."
      )
    );
  }

  REQUIRED_TRUSTED_FIELDS.forEach((field) => {
    const trust = fieldTrust[field];
    if (trust === CANONICAL_EVENT_FIELD_TRUST.AUTHORITATIVE) return;

    blockers.push(
      createFinding(
        field,
        getRequiredFieldCode(field, trust),
        trust,
        getRequiredFieldMessage(field, trust)
      )
    );
  });

  if (
    isCompletionEvent(eventType) &&
    !acknowledgement.completionPolicyApproved
  ) {
    blockers.push(
      createFinding(
        "eventType",
        "completion-policy-unresolved",
        CANONICAL_EVENT_FIELD_TRUST.CONFLICTING,
        "Completion shadow eligibility is blocked until completion finality and Closure policy are explicitly approved."
      )
    );
  }

  if (
    fieldTrust.occurredAt === CANONICAL_EVENT_FIELD_TRUST.FALLBACK ||
    fieldTrust.recordedAt === CANONICAL_EVENT_FIELD_TRUST.FALLBACK
  ) {
    warnings.push(
      createFinding(
        "timestamps",
        "client-only-timestamp",
        CANONICAL_EVENT_FIELD_TRUST.FALLBACK,
        "One or more timestamps come only from a client clock."
      )
    );
  }

  if (fieldTrust.occurredAt === CANONICAL_EVENT_FIELD_TRUST.CONFLICTING) {
    warnings.push(
      createFinding(
        "occurredAt",
        "invalid-occurred-at",
        fieldTrust.occurredAt,
        "Occurrence time is invalid or conflicts with acknowledgement evidence."
      )
    );
  }

  if (fieldTrust.recordedAt === CANONICAL_EVENT_FIELD_TRUST.MISSING) {
    warnings.push(
      createFinding(
        "recordedAt",
        "missing-recorded-at",
        fieldTrust.recordedAt,
        "No backend recording timestamp is available."
      )
    );
  } else if (
    fieldTrust.recordedAt === CANONICAL_EVENT_FIELD_TRUST.CONFLICTING
  ) {
    warnings.push(
      createFinding(
        "recordedAt",
        "conflicting-recorded-at",
        fieldTrust.recordedAt,
        "The recording timestamp is invalid or conflicts with backend acknowledgement."
      )
    );
  }

  if (!acknowledgement.acknowledged) {
    warnings.push(
      createFinding(
        "acknowledgement",
        "missing-backend-acknowledgement",
        fieldTrust.acknowledgement,
        "No backend acknowledgement is available for this proposed shadow event."
      )
    );
  } else if (
    fieldTrust.acknowledgement !==
    CANONICAL_EVENT_FIELD_TRUST.AUTHORITATIVE
  ) {
    warnings.push(
      createFinding(
        "acknowledgement",
        "untrusted-backend-acknowledgement",
        fieldTrust.acknowledgement,
        "Acknowledgement exists but is not attributed to the backend event store."
      )
    );
  }

  return {
    eligible: blockers.length === 0,
    fieldTrust,
    blockers,
    warnings,
    shadowRisk: calculateShadowRisk(blockers, warnings),
  };
}
