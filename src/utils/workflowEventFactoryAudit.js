import {
  CONVERSATION_EVENT_TYPES,
  normalizeConversationTimelineEvent,
} from "./conversationTimelineReconciliation.js";
import { validateCanonicalWorkflowEvent } from "./workflowEventContract.js";

export const WORKFLOW_EVENT_MIGRATION_RISK = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
});

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function valuesMatch(left, right) {
  return stableSerialize(left) === stableSerialize(right);
}

function containsMetadata(actual, expected) {
  if (!isObject(expected)) return true;
  if (!isObject(actual)) return false;

  return Object.entries(expected).every(([key, expectedValue]) => {
    const actualValue = actual[key];

    if (isObject(expectedValue)) {
      return containsMetadata(actualValue, expectedValue);
    }

    return valuesMatch(actualValue, expectedValue);
  });
}

function addGap(gaps, condition, gap) {
  if (condition && !gaps.includes(gap)) gaps.push(gap);
}

function resolveMigrationRisk(schemaGaps) {
  const highRiskGaps = new Set([
    "invalid-canonical-envelope",
    "unsupported-event-type",
    "event-type-mismatch",
    "missing-project-id",
    "project-id-mismatch",
  ]);

  return schemaGaps.some((gap) => highRiskGaps.has(gap))
    ? WORKFLOW_EVENT_MIGRATION_RISK.HIGH
    : schemaGaps.length > 0
    ? WORKFLOW_EVENT_MIGRATION_RISK.MEDIUM
    : WORKFLOW_EVENT_MIGRATION_RISK.LOW;
}

// Pure comparison only. This utility does not create, persist, emit, mutate,
// log, or select a workflow event as authoritative.
export function compareLegacyToFactoryEvent(legacyEvent, factoryEvent) {
  const safeLegacy = isObject(legacyEvent) ? legacyEvent : {};
  const safeFactory = isObject(factoryEvent) ? factoryEvent : {};
  const normalizedLegacy = normalizeConversationTimelineEvent(safeLegacy, {
    source: String(safeFactory.source || safeLegacy.source || "legacy"),
  });
  const factoryValidation = validateCanonicalWorkflowEvent(safeFactory);
  const matchesId =
    hasValue(normalizedLegacy.id) &&
    hasValue(safeFactory.id) &&
    normalizedLegacy.id === safeFactory.id;
  const factoryProjectId = String(safeFactory.projectId || "").trim();
  const factoryConversationId = String(
    safeFactory.conversationId || ""
  ).trim();
  const matchesEventType =
    hasValue(safeFactory.eventType) &&
    normalizedLegacy.eventType === safeFactory.eventType;
  const matchesProjectId =
    hasValue(normalizedLegacy.projectId) &&
    hasValue(factoryProjectId) &&
    normalizedLegacy.projectId === factoryProjectId;
  const matchesConversationId =
    hasValue(normalizedLegacy.conversationId) &&
    hasValue(factoryConversationId) &&
    normalizedLegacy.conversationId === factoryConversationId;
  const hasActor =
    hasValue(safeFactory.actor) && safeFactory.actor !== "unknown";
  const hasActorRole =
    hasValue(safeFactory.actorRole) && safeFactory.actorRole !== "unknown";
  const hasRecordedAt = hasValue(safeFactory.recordedAt);
  const payloadPreserved = valuesMatch(
    safeFactory.payload,
    normalizedLegacy.payload
  );
  const expectedLegacyMetadata = {
    ...(isObject(safeLegacy.legacy) ? safeLegacy.legacy : {}),
    originalEventType: normalizedLegacy.legacy.originalEventType,
  };
  const legacyPreserved = containsMetadata(
    safeFactory.legacy,
    expectedLegacyMetadata
  );
  const unsupportedEventType =
    normalizedLegacy.eventType ===
      CONVERSATION_EVENT_TYPES.UNKNOWN_WORKFLOW_EVENT ||
    safeFactory.eventType ===
      CONVERSATION_EVENT_TYPES.UNKNOWN_WORKFLOW_EVENT ||
    safeFactory.legacy?.unsupportedEventType === true;
  const schemaGaps = [];

  addGap(
    schemaGaps,
    !factoryValidation.ok,
    "invalid-canonical-envelope"
  );
  addGap(schemaGaps, unsupportedEventType, "unsupported-event-type");
  addGap(schemaGaps, !matchesEventType, "event-type-mismatch");
  addGap(
    schemaGaps,
    !hasValue(normalizedLegacy.projectId) || !hasValue(factoryProjectId),
    "missing-project-id"
  );
  addGap(
    schemaGaps,
    hasValue(normalizedLegacy.projectId) &&
      hasValue(factoryProjectId) &&
      !matchesProjectId,
    "project-id-mismatch"
  );
  addGap(
    schemaGaps,
    !hasValue(normalizedLegacy.conversationId) ||
      !hasValue(factoryConversationId),
    "missing-conversation-id"
  );
  addGap(
    schemaGaps,
    hasValue(normalizedLegacy.conversationId) &&
      hasValue(factoryConversationId) &&
      !matchesConversationId,
    "conversation-id-mismatch"
  );
  addGap(schemaGaps, !hasActor, "missing-actor");
  addGap(schemaGaps, !hasActorRole, "missing-actor-role");
  addGap(schemaGaps, !hasRecordedAt, "missing-recorded-at");
  addGap(schemaGaps, !payloadPreserved, "payload-not-preserved");
  addGap(schemaGaps, !legacyPreserved, "legacy-not-preserved");

  return {
    matchesId,
    matchesEventType,
    matchesProjectId,
    matchesConversationId,
    hasActor,
    hasActorRole,
    hasRecordedAt,
    payloadPreserved,
    legacyPreserved,
    factoryContractValid: factoryValidation.ok,
    factoryValidationErrors: factoryValidation.errors.map((error) => ({
      field: error.field,
      code: error.code,
    })),
    schemaGaps,
    migrationRisk: resolveMigrationRisk(schemaGaps),
  };
}
