import {
  CANONICAL_WORKFLOW_EVENT_TYPES,
  normalizeWorkflowEvent,
  validateCanonicalWorkflowEvent,
  WORKFLOW_EVENT_TYPES,
} from "./workflowEventContract.js";

export const CONVERSATION_EVENT_TYPES = WORKFLOW_EVENT_TYPES;

const CANONICAL_EVENT_TYPES = new Set(CANONICAL_WORKFLOW_EVENT_TYPES);

const LEGACY_EVENT_TYPE_MAP = new Map([
  ["request.created", CONVERSATION_EVENT_TYPES.WORKFLOW_REQUEST_CREATED],
  ["request_created", CONVERSATION_EVENT_TYPES.WORKFLOW_REQUEST_CREATED],
  ["workflow_request_created", CONVERSATION_EVENT_TYPES.WORKFLOW_REQUEST_CREATED],
  ["appointment.created", CONVERSATION_EVENT_TYPES.WORKFLOW_APPOINTMENT_CREATED],
  ["appointment_created", CONVERSATION_EVENT_TYPES.WORKFLOW_APPOINTMENT_CREATED],
  ["appointment", CONVERSATION_EVENT_TYPES.WORKFLOW_APPOINTMENT_CREATED],
  ["schedule.created", CONVERSATION_EVENT_TYPES.WORKFLOW_APPOINTMENT_CREATED],
  ["schedule_created", CONVERSATION_EVENT_TYPES.WORKFLOW_APPOINTMENT_CREATED],
  ["schedule", CONVERSATION_EVENT_TYPES.WORKFLOW_APPOINTMENT_CREATED],
  ["appointment.updated", CONVERSATION_EVENT_TYPES.WORKFLOW_APPOINTMENT_UPDATED],
  ["appointment_updated", CONVERSATION_EVENT_TYPES.WORKFLOW_APPOINTMENT_UPDATED],
  ["appointment.rescheduled", CONVERSATION_EVENT_TYPES.WORKFLOW_APPOINTMENT_UPDATED],
  ["schedule.updated", CONVERSATION_EVENT_TYPES.WORKFLOW_APPOINTMENT_UPDATED],
  ["schedule_updated", CONVERSATION_EVENT_TYPES.WORKFLOW_APPOINTMENT_UPDATED],
  ["quote.created", CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_CREATED],
  ["quote_created", CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_CREATED],
  ["quote.drafted", CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_CREATED],
  ["workflow_quote_created", CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_CREATED],
  ["quote.sent", CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_SENT],
  ["quote_sent", CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_SENT],
  ["workflow_quote_sent", CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_SENT],
  ["workflow_revised_quote", CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_SENT],
  ["quote.accepted", CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_ACCEPTED],
  ["quote_accepted", CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_ACCEPTED],
  ["workflow_quote_accepted", CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_ACCEPTED],
  ["work.started", CONVERSATION_EVENT_TYPES.WORKFLOW_WORK_STARTED],
  ["work.activated", CONVERSATION_EVENT_TYPES.WORKFLOW_WORK_STARTED],
  ["work_started", CONVERSATION_EVENT_TYPES.WORKFLOW_WORK_STARTED],
  ["workflow_work_started", CONVERSATION_EVENT_TYPES.WORKFLOW_WORK_STARTED],
  ["materials.approval_requested", CONVERSATION_EVENT_TYPES.WORKFLOW_MATERIALS_REQUESTED],
  ["materials_requested", CONVERSATION_EVENT_TYPES.WORKFLOW_MATERIALS_REQUESTED],
  ["workflow_materials_approval", CONVERSATION_EVENT_TYPES.WORKFLOW_MATERIALS_REQUESTED],
  ["completion.submitted", CONVERSATION_EVENT_TYPES.WORKFLOW_COMPLETION_SUBMITTED],
  ["completion_submitted", CONVERSATION_EVENT_TYPES.WORKFLOW_COMPLETION_SUBMITTED],
  ["workflow_completion_closeout", CONVERSATION_EVENT_TYPES.WORKFLOW_COMPLETION_SUBMITTED],
  ["completion.confirmed", CONVERSATION_EVENT_TYPES.WORKFLOW_COMPLETION_CONFIRMED],
  ["completion_confirmed", CONVERSATION_EVENT_TYPES.WORKFLOW_COMPLETION_CONFIRMED],
  ["message.created", CONVERSATION_EVENT_TYPES.MESSAGE_CREATED],
  ["message_created", CONVERSATION_EVENT_TYPES.MESSAGE_CREATED],
  ["text", CONVERSATION_EVENT_TYPES.MESSAGE_CREATED],
  ["message", CONVERSATION_EVENT_TYPES.MESSAGE_CREATED],
]);

const STABLE_ENTITY_FIELDS = [
  ["appointment", "appointmentId"],
  ["schedule", "scheduleId"],
  ["quote", "quoteId"],
  ["work", "workId"],
  ["job", "jobId"],
  ["completion", "completionId"],
  ["completion", "completionRecordId"],
];

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function firstValue(...values) {
  return values.find(hasValue);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      cloneValue(nestedValue),
    ])
  );
}

function normalizeLegacyType(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveEventType(record, normalized) {
  const rawType = firstValue(
    record?.eventType,
    record?.workflowType,
    record?.workflow_type,
    record?.type,
    record?.payload?.eventType,
    record?.payload?.type,
    record?.workflow_payload?.eventType,
    record?.workflow_payload?.type,
    normalized.eventType
  );
  const rawStatus = normalizeLegacyType(
    firstValue(
      record?.status,
      record?.workflowStatus,
      record?.workflow_status,
      record?.payload?.status,
      record?.workflow_payload?.status
    )
  );
  const canonicalCandidate = String(rawType || "").trim().toUpperCase();

  if (CANONICAL_EVENT_TYPES.has(canonicalCandidate)) {
    return canonicalCandidate;
  }

  const mappedType = LEGACY_EVENT_TYPE_MAP.get(normalizeLegacyType(rawType));

  if (
    mappedType === CONVERSATION_EVENT_TYPES.WORKFLOW_COMPLETION_SUBMITTED &&
    rawStatus === "confirmed"
  ) {
    return CONVERSATION_EVENT_TYPES.WORKFLOW_COMPLETION_CONFIRMED;
  }

  if (
    mappedType === CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_SENT &&
    rawStatus === "accepted"
  ) {
    return CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_ACCEPTED;
  }

  if (mappedType) return mappedType;

  return normalizeLegacyType(rawType).startsWith("workflow_")
    ? CONVERSATION_EVENT_TYPES.UNKNOWN_WORKFLOW_EVENT
    : CONVERSATION_EVENT_TYPES.MESSAGE_CREATED;
}

function normalizeRecordedAt(normalized) {
  return normalized.recordedAt || normalized.occurredAt || null;
}

function getLegacyEventIdAlias(record) {
  return firstValue(
    record?.eventId,
    record?.event_id,
    record?.backendId,
    record?.backend_id,
    record?.payload?.eventId,
    record?.payload?.event_id,
    record?.workflow_payload?.eventId,
    record?.workflow_payload?.event_id
  );
}

function getStableEntityPair(record, eventType) {
  const payload =
    record?.payload && typeof record.payload === "object"
      ? record.payload
      : record?.workflow_payload &&
        typeof record.workflow_payload === "object"
      ? record.workflow_payload
      : {};

  for (const [entityType, field] of STABLE_ENTITY_FIELDS) {
    const entityId = firstValue(record?.[field], payload?.[field]);
    if (hasValue(entityId)) {
      return `${entityType}:${String(entityId)}:${eventType}`;
    }
  }

  return "";
}

function createDedupeKey(record, eventType, isCanonical) {
  if (isCanonical && hasValue(record?.id)) {
    return `event:${String(record.id)}`;
  }

  const legacyEventId = getLegacyEventIdAlias(record);
  if (hasValue(legacyEventId)) {
    return `legacy-event:${String(legacyEventId)}`;
  }

  const stableEntityPair = getStableEntityPair(record, eventType);
  return stableEntityPair ? `entity:${stableEntityPair}` : "";
}

function getSourceEntry(entry, index) {
  if (
    entry &&
    typeof entry === "object" &&
    !Array.isArray(entry) &&
    Object.prototype.hasOwnProperty.call(entry, "event")
  ) {
    return {
      event: entry.event,
      source: String(entry.source || "legacy"),
      sourceIndex: index,
    };
  }

  return {
    event: entry,
    source: "legacy",
    sourceIndex: index,
  };
}

export function normalizeConversationTimelineEvent(
  event,
  { source = "legacy", index = 0 } = {}
) {
  const safeEvent =
    event && typeof event === "object" && !Array.isArray(event) ? event : {};
  const canonicalValidation = validateCanonicalWorkflowEvent(safeEvent);
  const isCanonical = canonicalValidation.ok;
  const normalized = normalizeWorkflowEvent(safeEvent, { source });
  const legacyEventId = getLegacyEventIdAlias(safeEvent);
  const preservedLegacyId = firstValue(safeEvent.id, safeEvent.payload?.id);
  const eventType = resolveEventType(safeEvent, normalized);
  const actor = normalized.actor;
  const missingFields = [];

  if (!legacyEventId && !preservedLegacyId) missingFields.push("id");
  if (!normalized.projectId) missingFields.push("projectId");
  if (!normalized.conversationId) missingFields.push("conversationId");
  if (!actor) missingFields.push("actor");
  if (!normalized.actorRole) missingFields.push("actorRole");
  if (!normalizeRecordedAt(normalized)) missingFields.push("recordedAt");

  const legacyWarnings = normalized.warnings.map((warning) => warning.code);
  const canonicalPayload = isCanonical
    ? cloneValue(normalized.payload)
    : cloneValue(safeEvent);
  const existingLegacy =
    safeEvent.legacy &&
    typeof safeEvent.legacy === "object" &&
    !Array.isArray(safeEvent.legacy)
      ? cloneValue(safeEvent.legacy)
      : {};

  return {
    id: hasValue(preservedLegacyId)
      ? String(preservedLegacyId)
      : hasValue(legacyEventId)
      ? String(legacyEventId)
      : `legacy:${source}:${index}`,
    eventType,
    projectId: normalized.projectId || "",
    conversationId: normalized.conversationId || "",
    actor: actor ? String(actor) : "unknown",
    actorRole: normalized.actorRole || "unknown",
    recordedAt: normalizeRecordedAt(normalized),
    source: normalized.source || source,
    payload: canonicalPayload,
    legacy: {
      ...existingLegacy,
      isLegacy:
        existingLegacy.isLegacy === true ||
        !isCanonical ||
        missingFields.length > 0 ||
        normalizeLegacyType(normalized.eventType) !==
          normalizeLegacyType(eventType),
      originalType:
        existingLegacy.originalType ||
        existingLegacy.originalEventType ||
        normalized.eventType ||
        "",
      originalEventType:
        existingLegacy.originalEventType ||
        existingLegacy.originalType ||
        normalized.eventType ||
        "",
      originalId:
        existingLegacy.originalId ||
        (hasValue(legacyEventId) ? String(legacyEventId) : ""),
      missingFields,
      warnings: [...new Set([
        ...(Array.isArray(existingLegacy.warnings)
          ? existingLegacy.warnings
          : []),
        ...legacyWarnings,
      ])],
      dedupeKey: createDedupeKey(safeEvent, eventType, isCanonical),
      reconciliationSource: source,
      duplicateSources: [],
    },
    ...(normalized.metadata ? { metadata: cloneValue(normalized.metadata) } : {}),
    ...(normalized.migrationSource
      ? { migrationSource: normalized.migrationSource }
      : {}),
  };
}

export function reconcileConversationTimelineEvents(sourceEvents = []) {
  const entries = Array.isArray(sourceEvents) ? sourceEvents : [];
  const normalizedEvents = entries.map((entry, index) => {
    const sourceEntry = getSourceEntry(entry, index);
    return {
      event: normalizeConversationTimelineEvent(sourceEntry.event, {
        source: sourceEntry.source,
        index: sourceEntry.sourceIndex,
      }),
      sourceIndex: index,
    };
  });
  const deduplicated = [];
  const dedupeIndexes = new Map();

  normalizedEvents.forEach(({ event, sourceIndex }) => {
    const dedupeKey = event.legacy.dedupeKey;

    if (!dedupeKey || !dedupeIndexes.has(dedupeKey)) {
      if (dedupeKey) dedupeIndexes.set(dedupeKey, deduplicated.length);
      deduplicated.push({ event, sourceIndex });
      return;
    }

    const existingIndex = dedupeIndexes.get(dedupeKey);
    const existingEntry = deduplicated[existingIndex];
    const existing = existingEntry.event;
    deduplicated[existingIndex] = {
      ...existingEntry,
      event: {
        ...existing,
        legacy: {
          ...existing.legacy,
          duplicateSources: [
            ...new Set([
              ...existing.legacy.duplicateSources,
              event.legacy.reconciliationSource || event.source,
            ]),
          ],
        },
      },
    };
  });

  return deduplicated
    .sort((left, right) => {
      const leftTime = left.event.recordedAt
        ? new Date(left.event.recordedAt).getTime()
        : Number.NaN;
      const rightTime = right.event.recordedAt
        ? new Date(right.event.recordedAt).getTime()
        : Number.NaN;
      const leftHasTime = Number.isFinite(leftTime);
      const rightHasTime = Number.isFinite(rightTime);

      if (leftHasTime && rightHasTime && leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      if (leftHasTime !== rightHasTime) return leftHasTime ? -1 : 1;
      return left.sourceIndex - right.sourceIndex;
    })
    .map(({ event }) => event);
}
