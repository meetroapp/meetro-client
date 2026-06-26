import {
  validateCanonicalWorkflowEvent,
  WORKFLOW_EVENT_ACTOR_ROLES,
  WORKFLOW_EVENT_OPTIONAL_FIELDS,
  WORKFLOW_EVENT_REQUIRED_FIELDS,
  WORKFLOW_EVENT_TYPES,
} from "./workflowEventContract.js";

export {
  WORKFLOW_EVENT_ACTOR_ROLES,
  WORKFLOW_EVENT_OPTIONAL_FIELDS,
  WORKFLOW_EVENT_REQUIRED_FIELDS,
  WORKFLOW_EVENT_TYPES,
};

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

function canonicalString(value) {
  return typeof value === "string" ? value.trim() : value;
}

export class WorkflowEventValidationError extends TypeError {
  constructor(errors) {
    super("Canonical workflow event validation failed.");
    this.name = "WorkflowEventValidationError";
    this.errors = errors.map((error) => ({ ...error }));
  }
}

// Pure canonical factory. It performs no persistence, browser access, event
// dispatch, identity inference, timestamp fallback, or writer adoption.
export function createWorkflowEvent(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const event = {
    id: canonicalString(safeInput.id),
    eventType: canonicalString(safeInput.eventType),
    projectId: canonicalString(safeInput.projectId),
    conversationId: canonicalString(safeInput.conversationId),
    actor: canonicalString(safeInput.actor),
    actorRole: canonicalString(safeInput.actorRole),
    recordedAt: canonicalString(safeInput.recordedAt),
    source: canonicalString(safeInput.source),
    payload: isPlainObject(safeInput.payload)
      ? cloneValue(safeInput.payload)
      : safeInput.payload,
  };

  if (safeInput.legacy !== undefined) {
    event.legacy = isPlainObject(safeInput.legacy)
      ? cloneValue(safeInput.legacy)
      : safeInput.legacy;
  }
  if (safeInput.metadata !== undefined) {
    event.metadata = isPlainObject(safeInput.metadata)
      ? cloneValue(safeInput.metadata)
      : safeInput.metadata;
  }
  if (safeInput.migrationSource !== undefined) {
    event.migrationSource = canonicalString(safeInput.migrationSource);
  }

  const validation = validateCanonicalWorkflowEvent(event);

  if (!validation.ok) {
    throw new WorkflowEventValidationError(validation.errors);
  }

  return event;
}
