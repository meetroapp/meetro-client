import {
  isCanonicalWorkflowEvent,
  normalizeWorkflowEvent,
} from "./workflowEventContract.js";

const CONVERSATION_PREFIX = "meetro_conversation_";
const JOB_RECORD_PREFIX = "meetro_job_record_";
const WORKFLOW_PREFIX = "workflow_";

const STABLE_ENTITY_FIELDS = [
  ["appointment", "appointmentId"],
  ["schedule", "scheduleId"],
  ["quote", "quoteId"],
  ["work", "workId"],
  ["completion", "completionId"],
  ["invoice", "invoiceId"],
];

function getStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readJson(storage, key, fallback) {
  try {
    const value = storage?.getItem(key);
    return value === null || value === undefined ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readArray(storage, key) {
  const value = readJson(storage, key, []);
  return Array.isArray(value) ? value : [];
}

function getStorageKeys(storage) {
  if (!storage) return [];

  if (typeof storage.length === "number" && typeof storage.key === "function") {
    return Array.from({ length: storage.length }, (_, index) =>
      storage.key(index)
    ).filter(Boolean);
  }

  return Object.keys(storage).filter(
    (key) => typeof storage[key] !== "function"
  );
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function firstValue(...values) {
  return values.find(hasValue);
}

function createWarning(code, source, metadata = {}) {
  return { code, source, ...metadata };
}

function getConversationId(record, fallback = "") {
  return String(
    firstValue(
      record?.conversationId,
      record?.projectConversationId,
      record?.workflow_payload?.conversationId,
      record?.payload?.conversationId,
      fallback,
      ""
    ) ?? ""
  );
}

function getExplicitEventId(record, source) {
  if (isCanonicalWorkflowEvent(record) && hasValue(record?.id)) {
    return String(record.id);
  }

  const eventId = firstValue(
    record?.eventId,
    record?.event_id,
    record?.workflow_payload?.eventId,
    record?.workflow_payload?.event_id,
    record?.payload?.eventId,
    record?.payload?.event_id
  );

  if (hasValue(eventId)) return String(eventId);

  const backendId = firstValue(record?.backendId, record?.backend_id);
  if (hasValue(backendId)) return `backend:${String(backendId)}`;

  if (source === "backend-message" && hasValue(record?.id)) {
    return `backend:${String(record.id)}`;
  }

  return "";
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
    const value = firstValue(record?.[field], payload?.[field]);
    if (hasValue(value) && hasValue(eventType)) {
      return {
        entityType,
        entityId: String(value),
        eventType: String(eventType),
      };
    }
  }

  return null;
}

function getConversationProjectLinks(storage) {
  const links = readArray(storage, "meetroProjectLinks")
    .filter((link) => link?.commandType === "linkConversationToProject")
    .map((link) => ({
      commandId: String(link?.commandId || ""),
      conversationId: String(link?.conversationId || ""),
      projectId: String(link?.projectId || ""),
      createdAt: String(link?.createdAt || ""),
    }));
  const projectIdsByConversation = new Map();

  links.forEach((link) => {
    if (!link.conversationId || !link.projectId) return;
    if (!projectIdsByConversation.has(link.conversationId)) {
      projectIdsByConversation.set(link.conversationId, new Set());
    }
    projectIdsByConversation.get(link.conversationId).add(link.projectId);
  });

  return {
    links,
    projectIdsByConversation,
    conflicts: [...projectIdsByConversation.entries()]
      .filter(([, projectIds]) => projectIds.size > 1)
      .map(([conversationId, projectIds]) => ({
        conversationId,
        projectIds: [...projectIds].sort(),
      })),
  };
}

function normalizeSourceRecord(
  record,
  { source, conversationId = "", projectLinks }
) {
  const resolvedConversationId = getConversationId(record, conversationId);
  const linkedProjectIds = resolvedConversationId
    ? projectLinks.projectIdsByConversation.get(resolvedConversationId)
    : null;
  const explicitProjectId = firstValue(
    record?.projectId,
    record?.project_id,
    record?.workflow_payload?.projectId,
    record?.payload?.projectId
  );
  const linkedProjectId =
    linkedProjectIds?.size === 1 ? [...linkedProjectIds][0] : "";
  const projectId = firstValue(explicitProjectId, linkedProjectId, "");
  const explicitEventId = getExplicitEventId(record, source);
  const eventInput = {
    ...record,
    eventId: explicitEventId || record?.eventId,
    projectId,
    conversationId: resolvedConversationId,
  };
  const normalized = normalizeWorkflowEvent(eventInput, { source });
  const stableEntityPair = getStableEntityPair(record, normalized.eventType);
  const warnings = normalized.warnings.map((warning) => ({
    code: warning.code,
    source: warning.source || source,
  }));

  if (resolvedConversationId && linkedProjectIds?.size > 1) {
    warnings.push(
      createWarning("conflicting-conversation-project-links", source, {
        conversationId: resolvedConversationId,
        projectCount: linkedProjectIds.size,
      })
    );
  }

  if (
    explicitProjectId &&
    linkedProjectIds?.size === 1 &&
    !linkedProjectIds.has(String(explicitProjectId))
  ) {
    warnings.push(
      createWarning("event-project-link-conflict", source, {
        conversationId: resolvedConversationId,
      })
    );
  }

  const reconciliationKey = explicitEventId
    ? `event:${explicitEventId}`
    : stableEntityPair
    ? `entity:${stableEntityPair.entityType}:${stableEntityPair.entityId}:event:${stableEntityPair.eventType}`
    : "";

  return {
    source,
    id: normalized.id,
    eventId: explicitEventId,
    eventType: normalized.eventType,
    projectId: normalized.projectId,
    requestId: normalized.requestId,
    conversationId: normalized.conversationId,
    actor: normalized.actor,
    actorId: normalized.actorId,
    actorRole: normalized.actorRole,
    occurredAt: normalized.occurredAt,
    recordedAt: normalized.recordedAt,
    sequence: normalized.sequence,
    stableEntityPair,
    reconciliationKey,
    warnings,
  };
}

function isWorkflowRecord(record) {
  const type = String(
    firstValue(
      record?.eventType,
      record?.workflowType,
      record?.workflow_type,
      record?.type,
      record?.workflow_payload?.type,
      ""
    ) ?? ""
  );
  return type.startsWith(WORKFLOW_PREFIX);
}

function readConversationRecords(storage) {
  const records = [];

  getStorageKeys(storage)
    .filter(
      (key) =>
        key.startsWith(CONVERSATION_PREFIX) &&
        key !== "meetro_conversation_registry" &&
        !key.startsWith("meetro_conversation_meta_") &&
        !key.startsWith("meetro_conversation_read_") &&
        !key.startsWith("meetro_conversation_saved_") &&
        !key.startsWith("meetro_conversation_owner_role_")
    )
    .forEach((key) => {
      const conversationId = key.slice(CONVERSATION_PREFIX.length);
      readArray(storage, key).forEach((record) => {
        records.push({ record, conversationId });
      });
    });

  return records;
}

function readJobRecords(storage) {
  return getStorageKeys(storage)
    .filter((key) => key.startsWith(JOB_RECORD_PREFIX))
    .flatMap((key) => {
      const conversationId = key.slice(JOB_RECORD_PREFIX.length);
      return readArray(storage, key).map((record) => ({
        record,
        conversationId,
      }));
    });
}

function readLegacyTimelineRecords(storage) {
  const globalEvents = [
    ...readArray(storage, "meetroWorkflowTimeline"),
    ...readArray(storage, "projectTimeline"),
  ];
  const requestEvents = readArray(storage, "homeownerRequests").flatMap(
    (request) =>
      (Array.isArray(request?.projectTimeline)
        ? request.projectTimeline
        : []
      ).map((event) => ({
        ...event,
        projectId: event?.projectId || request?.projectId,
        requestId:
          event?.requestId || request?.requestId || request?.id || "",
        conversationId:
          event?.conversationId ||
          request?.conversationId ||
          request?.projectConversationId ||
          "",
      }))
  );

  return [...globalEvents, ...requestEvents];
}

function readShadowTimelineRecords(storage) {
  return readArray(storage, "meetroProjectTimelineEvents").map((command) => ({
    ...(command?.event && typeof command.event === "object"
      ? command.event
      : {}),
    projectId: command?.projectId || command?.event?.projectId || "",
    recordedAt: command?.createdAt || command?.event?.recordedAt || "",
  }));
}

function summarizeWarnings(events) {
  const reasonCounts = {};
  events.forEach((event) => {
    event.warnings.forEach((warning) => {
      reasonCounts[warning.code] = (reasonCounts[warning.code] || 0) + 1;
    });
  });
  return reasonCounts;
}

function groupByReconciliationKey(events) {
  const groups = new Map();

  events.forEach((event) => {
    if (!event.reconciliationKey) return;
    if (!groups.has(event.reconciliationKey)) {
      groups.set(event.reconciliationKey, []);
    }
    groups.get(event.reconciliationKey).push(event);
  });

  return groups;
}

export function getConversationTimelineSources({
  storage: suppliedStorage,
  backendMessages = [],
} = {}) {
  const storage = getStorage(suppliedStorage);
  const projectLinks = getConversationProjectLinks(storage);
  const conversationRecords = readConversationRecords(storage);
  const localMessages = conversationRecords.filter(
    ({ record }) => !isWorkflowRecord(record)
  );
  const workflowCards = conversationRecords.filter(({ record }) =>
    isWorkflowRecord(record)
  );
  const normalize = (record, source, conversationId = "") =>
    normalizeSourceRecord(record, {
      source,
      conversationId,
      projectLinks,
    });

  return {
    conversationMessages: localMessages.map(({ record, conversationId }) =>
      normalize(record, "conversation-message", conversationId)
    ),
    workflowCards: workflowCards.map(({ record, conversationId }) =>
      normalize(record, "workflow-card", conversationId)
    ),
    backendMessages: (Array.isArray(backendMessages) ? backendMessages : []).map(
      (record) => normalize(record, "backend-message")
    ),
    legacyTimelineEvents: readLegacyTimelineRecords(storage).map((record) =>
      normalize(record, "legacy-timeline")
    ),
    jobRecordEvents: readJobRecords(storage).map(
      ({ record, conversationId }) =>
        normalize(record, "job-record", conversationId)
    ),
    shadowTimelineEvents: readShadowTimelineRecords(storage).map((record) =>
      normalize(record, "shadow-timeline")
    ),
    conversationProjectLinks: projectLinks.links,
    conversationProjectLinkConflicts: projectLinks.conflicts,
  };
}

export function getConversationTimelineReconciliationReport(options = {}) {
  const sources = getConversationTimelineSources(options);
  const sourceEntries = Object.entries(sources).filter(([name]) =>
    [
      "conversationMessages",
      "workflowCards",
      "backendMessages",
      "legacyTimelineEvents",
      "jobRecordEvents",
      "shadowTimelineEvents",
    ].includes(name)
  );
  const events = sourceEntries.flatMap(([, sourceEvents]) => sourceEvents);
  const groups = groupByReconciliationKey(events);
  const duplicateGroups = [...groups.entries()]
    .filter(([, groupEvents]) => groupEvents.length > 1)
    .map(([reconciliationKey, groupEvents]) => ({
      reconciliationKey,
      eventCount: groupEvents.length,
      sources: [...new Set(groupEvents.map((event) => event.source))].sort(),
      projectIds: [
        ...new Set(groupEvents.map((event) => event.projectId).filter(Boolean)),
      ].sort(),
      hasProjectConflict:
        new Set(groupEvents.map((event) => event.projectId).filter(Boolean))
          .size > 1,
    }));
  const shadowKeys = new Set(
    sources.shadowTimelineEvents
      .map((event) => event.reconciliationKey)
      .filter(Boolean)
  );
  const legacyRelationshipEvents = events.filter(
    (event) => event.source !== "shadow-timeline"
  );
  const reconcilableLegacyEvents = legacyRelationshipEvents.filter(
    (event) => event.reconciliationKey
  );
  const shadowedLegacyEvents = reconcilableLegacyEvents.filter((event) =>
    shadowKeys.has(event.reconciliationKey)
  );
  const unsafeEvents = events.filter((event) => !event.reconciliationKey);
  const sourceCounts = Object.fromEntries(
    sourceEntries.map(([name, sourceEvents]) => [name, sourceEvents.length])
  );
  const projectIds = [
    ...new Set(events.map((event) => event.projectId).filter(Boolean)),
  ].sort();

  return {
    sourceCounts,
    totalSourceEventCount: events.length,
    reconcilableEventCount: events.length - unsafeEvents.length,
    unsafeEventCount: unsafeEvents.length,
    uniqueReconciliationKeyCount: groups.size,
    duplicateGroupCount: duplicateGroups.length,
    conflictingDuplicateGroupCount: duplicateGroups.filter(
      (group) => group.hasProjectConflict
    ).length,
    legacyRelationshipEventCount: legacyRelationshipEvents.length,
    reconcilableLegacyEventCount: reconcilableLegacyEvents.length,
    shadowedLegacyEventCount: shadowedLegacyEvents.length,
    shadowCoveragePercentage:
      reconcilableLegacyEvents.length > 0
        ? Math.round(
            (shadowedLegacyEvents.length /
              reconcilableLegacyEvents.length) *
              10000
          ) / 100
        : 0,
    safeProjectIdentityCount: events.filter((event) => event.projectId).length,
    missingProjectIdentityCount: events.filter((event) => !event.projectId)
      .length,
    warningCounts: summarizeWarnings(events),
    conversationProjectLinkCount: sources.conversationProjectLinks.length,
    conversationProjectLinkConflictCount:
      sources.conversationProjectLinkConflicts.length,
    conversationProjectLinkConflicts:
      sources.conversationProjectLinkConflicts,
    duplicateGroups,
    coverageByProject: projectIds.map((projectId) => {
      const projectEvents = events.filter(
        (event) => event.projectId === projectId
      );
      return {
        projectId,
        sourceEventCount: projectEvents.length,
        sourceTypes: [
          ...new Set(projectEvents.map((event) => event.source)),
        ].sort(),
        reconcilableEventCount: projectEvents.filter(
          (event) => event.reconciliationKey
        ).length,
        warningCount: projectEvents.reduce(
          (total, event) => total + event.warnings.length,
          0
        ),
      };
    }),
    unsafeEvents: unsafeEvents.map((event) => ({
      source: event.source,
      eventType: event.eventType,
      projectId: event.projectId,
      requestId: event.requestId,
      conversationId: event.conversationId,
      warningCodes: [...new Set(event.warnings.map((warning) => warning.code))],
    })),
  };
}
