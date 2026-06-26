import { WORKFLOW_EVENT_ACTOR_ROLES } from "./workflowEventContract.js";

const IDENTITY_FIELDS = Object.freeze([
  "projectId",
  "conversationId",
  "actor",
  "actorRole",
  "recordedAt",
]);

const ACTOR_ROLES = new Set(WORKFLOW_EVENT_ACTOR_ROLES);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function canonicalValue(value) {
  return hasValue(value) ? String(value).trim() : "";
}

function isUtcIsoTimestamp(value) {
  if (typeof value !== "string" || !value.endsWith("Z")) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function createWarning(field, code, message, sources = []) {
  return {
    field,
    code,
    message,
    sources: [...sources],
  };
}

function resolveOwnedField({
  field,
  event,
  owner,
  ownerSource,
  warnings,
}) {
  const eventValue = canonicalValue(event[field]);
  const ownerValue = canonicalValue(owner[field]);

  if (eventValue) {
    if (ownerValue && ownerValue !== eventValue) {
      warnings.push(
        createWarning(
          field,
          `${field}-conflict`,
          `Existing event ${field} conflicts with the supplied ${ownerSource} value; the immutable event value was preserved.`,
          ["event", ownerSource]
        )
      );
    }

    return { value: eventValue, source: "event" };
  }

  if (ownerValue) {
    return { value: ownerValue, source: ownerSource };
  }

  warnings.push(
    createWarning(
      field,
      `missing-${field}`,
      `No authoritative ${field} is available.`,
      []
    )
  );

  return { value: "", source: "unresolved" };
}

function isComplete(field, value) {
  if (!hasValue(value)) return false;
  if (field === "actor") return value.toLowerCase() !== "unknown";
  if (field === "actorRole") return ACTOR_ROLES.has(value);
  if (field === "recordedAt") return isUtcIsoTimestamp(value);
  return true;
}

// Read-only identity resolution foundation. Existing event identity is
// immutable; missing values may only be supplied by their matching owner.
export function resolveWorkflowIdentity(input = {}) {
  const safeInput = isRecord(input) ? input : {};
  const event = isRecord(safeInput.event) ? safeInput.event : {};
  const project = isRecord(safeInput.project) ? safeInput.project : {};
  const conversation = isRecord(safeInput.conversation)
    ? safeInput.conversation
    : {};
  const actorContext = isRecord(safeInput.actorContext)
    ? safeInput.actorContext
    : {};
  const warnings = [];

  const projectResolution = resolveOwnedField({
    field: "projectId",
    event,
    owner: project,
    ownerSource: "project",
    warnings,
  });
  const conversationResolution = resolveOwnedField({
    field: "conversationId",
    event,
    owner: conversation,
    ownerSource: "conversation",
    warnings,
  });
  const actorResolution = resolveOwnedField({
    field: "actor",
    event,
    owner: actorContext,
    ownerSource: "actorContext",
    warnings,
  });
  const actorRoleResolution = resolveOwnedField({
    field: "actorRole",
    event,
    owner: actorContext,
    ownerSource: "actorContext",
    warnings,
  });

  const recordedAt = canonicalValue(event.recordedAt);
  const recordedAtResolution = recordedAt
    ? { value: recordedAt, source: "event" }
    : { value: "", source: "unresolved" };

  if (!recordedAt) {
    warnings.push(
      createWarning(
        "recordedAt",
        "missing-recordedAt",
        "No persistence-owned recordedAt value is available.",
        []
      )
    );
  }

  const resolved = {
    projectId: projectResolution.value,
    conversationId: conversationResolution.value,
    actor: actorResolution.value,
    actorRole: actorRoleResolution.value,
    recordedAt: recordedAtResolution.value,
  };

  if (
    resolved.actor &&
    resolved.actor.toLowerCase() === "unknown"
  ) {
    warnings.push(
      createWarning(
        "actor",
        "unknown-actor",
        "Unknown is not an authoritative actor identity.",
        [actorResolution.source]
      )
    );
  }

  if (resolved.actorRole && !ACTOR_ROLES.has(resolved.actorRole)) {
    warnings.push(
      createWarning(
        "actorRole",
        "unsupported-actor-role",
        "actorRole must be homeowner, business, or system.",
        [actorRoleResolution.source]
      )
    );
  }

  if (resolved.recordedAt && !isUtcIsoTimestamp(resolved.recordedAt)) {
    warnings.push(
      createWarning(
        "recordedAt",
        "invalid-recorded-at",
        "recordedAt must be a normalized UTC ISO-8601 timestamp.",
        [recordedAtResolution.source]
      )
    );
  }

  const completeFieldCount = IDENTITY_FIELDS.filter((field) =>
    isComplete(field, resolved[field])
  ).length;

  return {
    ...resolved,
    resolutionSource: {
      projectId: projectResolution.source,
      conversationId: conversationResolution.source,
      actor: actorResolution.source,
      actorRole: actorRoleResolution.source,
      recordedAt: recordedAtResolution.source,
    },
    completenessScore: completeFieldCount * 20,
    warnings,
  };
}

