export const WORKFLOW_IDENTITY_TRUST = Object.freeze({
  AUTHORITATIVE: "AUTHORITATIVE",
  INFERRED: "INFERRED",
  FALLBACK: "FALLBACK",
  CONFLICTING: "CONFLICTING",
  MISSING: "MISSING",
});

export const WORKFLOW_IDENTITY_MIGRATION_RISK = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
});

const FIELDS = Object.freeze([
  "projectId",
  "conversationId",
  "actor",
  "actorRole",
  "recordedAt",
]);

const AUTHORITATIVE_AUTHORITIES = Object.freeze({
  projectId: new Set([
    "canonical-event",
    "project-aggregate",
    "authoritative-project-link",
  ]),
  conversationId: new Set([
    "canonical-event",
    "conversation-authority",
    "authoritative-conversation-link",
  ]),
  actor: new Set([
    "canonical-event",
    "authentication-context",
    "registered-system-principal",
  ]),
  actorRole: new Set([
    "canonical-event",
    "authorization-context",
    "registered-system-principal",
  ]),
  recordedAt: new Set(["canonical-event", "event-persistence"]),
});

const FALLBACK_AUTHORITIES = new Set([
  "active-selection",
  "client-clock",
  "display-value",
  "local-storage",
  "route-state",
  "timestamp-fallback",
  "ui-context",
]);

const INFERRED_AUTHORITIES = new Set([
  "compatibility-layer",
  "conversation-id",
  "generic-id",
  "legacy-alias",
  "reconciliation",
  "request-id",
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function canonicalValue(value) {
  return hasValue(value) ? String(value).trim() : "";
}

function getSourceObject(field, source, inputs) {
  if (source === "event") return inputs.event;
  if (field === "projectId" && source === "project") return inputs.project;
  if (field === "conversationId" && source === "conversation") {
    return inputs.conversation;
  }
  if (
    (field === "actor" || field === "actorRole") &&
    source === "actorContext"
  ) {
    return inputs.actorContext;
  }
  return {};
}

function getProvenanceRecord(field, sourceObject) {
  const provenance = isRecord(sourceObject.identityProvenance)
    ? sourceObject.identityProvenance[field]
    : undefined;

  if (typeof provenance === "string") {
    return { authority: provenance };
  }

  return isRecord(provenance) ? provenance : {};
}

function hasResolverConflict(field, resolvedIdentity) {
  return Array.isArray(resolvedIdentity.warnings)
    ? resolvedIdentity.warnings.some(
        (warning) =>
          warning?.field === field &&
          warning?.code === `${field}-conflict`
      )
    : false;
}

function hasValueConflict(field, value, sourceObject, provenance) {
  const sourceValue = canonicalValue(sourceObject[field]);
  const declaredValue = canonicalValue(provenance.value);

  return Boolean(
    (sourceValue && sourceValue !== value) ||
      (declaredValue && declaredValue !== value)
  );
}

function classifyField(field, inputs) {
  const value = canonicalValue(inputs.resolvedIdentity[field]);

  if (!value) {
    return {
      trust: WORKFLOW_IDENTITY_TRUST.MISSING,
      authority: "",
      source: "unresolved",
    };
  }

  const source =
    canonicalValue(inputs.resolvedIdentity.resolutionSource?.[field]) ||
    "unresolved";
  const sourceObject = getSourceObject(field, source, inputs);
  const provenance = getProvenanceRecord(field, sourceObject);
  const authority = canonicalValue(provenance.authority).toLowerCase();

  if (
    hasResolverConflict(field, inputs.resolvedIdentity) ||
    hasValueConflict(field, value, sourceObject, provenance)
  ) {
    return {
      trust: WORKFLOW_IDENTITY_TRUST.CONFLICTING,
      authority,
      source,
    };
  }

  if (AUTHORITATIVE_AUTHORITIES[field].has(authority)) {
    return {
      trust: WORKFLOW_IDENTITY_TRUST.AUTHORITATIVE,
      authority,
      source,
    };
  }

  if (
    FALLBACK_AUTHORITIES.has(authority) ||
    provenance.classification === WORKFLOW_IDENTITY_TRUST.FALLBACK
  ) {
    return {
      trust: WORKFLOW_IDENTITY_TRUST.FALLBACK,
      authority,
      source,
    };
  }

  if (
    INFERRED_AUTHORITIES.has(authority) ||
    provenance.classification === WORKFLOW_IDENTITY_TRUST.INFERRED ||
    !authority
  ) {
    return {
      trust: WORKFLOW_IDENTITY_TRUST.INFERRED,
      authority,
      source,
    };
  }

  return {
    trust: WORKFLOW_IDENTITY_TRUST.INFERRED,
    authority,
    source,
  };
}

function createFinding(field, classification) {
  return {
    field,
    trust: classification.trust,
    source: classification.source,
    authority: classification.authority,
  };
}

function getMigrationRisk(fieldTrust) {
  const trustValues = Object.values(fieldTrust);

  if (
    trustValues.some((trust) =>
      [
        WORKFLOW_IDENTITY_TRUST.MISSING,
        WORKFLOW_IDENTITY_TRUST.FALLBACK,
        WORKFLOW_IDENTITY_TRUST.CONFLICTING,
      ].includes(trust)
    )
  ) {
    return WORKFLOW_IDENTITY_MIGRATION_RISK.HIGH;
  }

  if (
    trustValues.some(
      (trust) => trust === WORKFLOW_IDENTITY_TRUST.INFERRED
    )
  ) {
    return WORKFLOW_IDENTITY_MIGRATION_RISK.MEDIUM;
  }

  return WORKFLOW_IDENTITY_MIGRATION_RISK.LOW;
}

// Provenance validation is intentionally separate from completeness. A
// canonical-looking value is trusted only when its owning source declares an
// approved field-specific authority.
export function validateWorkflowIdentityProvenance(input = {}) {
  const safeInput = isRecord(input) ? input : {};
  const inputs = {
    resolvedIdentity: isRecord(safeInput.resolvedIdentity)
      ? safeInput.resolvedIdentity
      : {},
    event: isRecord(safeInput.event) ? safeInput.event : {},
    project: isRecord(safeInput.project) ? safeInput.project : {},
    conversation: isRecord(safeInput.conversation)
      ? safeInput.conversation
      : {},
    actorContext: isRecord(safeInput.actorContext)
      ? safeInput.actorContext
      : {},
  };
  const classifications = Object.fromEntries(
    FIELDS.map((field) => [field, classifyField(field, inputs)])
  );
  const fieldTrust = Object.fromEntries(
    FIELDS.map((field) => [field, classifications[field].trust])
  );
  const blockers = FIELDS.filter(
    (field) =>
      fieldTrust[field] !== WORKFLOW_IDENTITY_TRUST.AUTHORITATIVE
  ).map((field) => createFinding(field, classifications[field]));
  const warnings = FIELDS.filter(
    (field) =>
      fieldTrust[field] === WORKFLOW_IDENTITY_TRUST.INFERRED
  ).map((field) => createFinding(field, classifications[field]));
  const migrationRisk = getMigrationRisk(fieldTrust);

  return {
    trusted: blockers.length === 0,
    fieldTrust,
    blockers,
    warnings,
    migrationRisk,
  };
}

