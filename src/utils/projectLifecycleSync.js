import { getCanonicalProjectId } from "./projectIdentity.js";

const ARRAY_KEYS = {
  homeownerRequests: "homeownerRequests",
  businessSchedule: "meetro_business_schedule",
  completedProjects: "completedProjects",
  conversationRegistry: "meetro_conversation_registry",
};

const ACTIVE_KEYS = [
  "activeWorkRequestId",
  "activeWorkQuoteId",
  "activeWorkConversationId",
  "activeWorkScheduleId",
  "activeWorkStatus",
  "activeWorkStage",
  "activeWorkService",
  "activeWorkLocation",
  "activeWorkType",
  "activeWorkSource",
  "activeJobId",
  "activeConversationId",
  "activeJobStatus",
  "activeJobService",
  "activeJobCustomer",
  "activeJobEta",
  "activeJobLocation",
];

const CLOSED_STATES = new Set(["closed", "closure_completed", "history"]);

function getDefaultStorage() {
  return typeof localStorage !== "undefined" ? localStorage : null;
}

function emitLifecycleUpdate() {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }

  [
    "storage",
    "meetro-workcenter-updated",
    "meetro-active-work-updated",
    "meetro-messages-updated",
    "meetroJobRecordUpdated",
  ].forEach((eventName) => window.dispatchEvent(new Event(eventName)));
}

function safeReadArray(storage, key) {
  if (!storage) return [];

  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteArray(storage, key, records) {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(Array.isArray(records) ? records : []));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function collectIdentityValues(record, values = new Set()) {
  if (!record || typeof record !== "object") return values;

  [
    getCanonicalProjectId(record),
    record.projectId,
    record.project_id,
    record.requestId,
    record.request_id,
    record.jobId,
    record.quoteRequestId,
    record.conversationId,
    record.activeConversationId,
    record.projectConversationId,
    record.scheduleId,
    record.visitId,
    record.appointmentId,
    record.quoteId,
    record.completionId,
    record.historyId,
    record.id,
  ].forEach((value) => {
    if (hasValue(value)) values.add(String(value));
  });

  [
    record.project,
    record.request,
    record.schedule,
    record.visitSchedule,
    record.workAppointment,
    record.evaluationVisit,
    record.quote,
    record.proposal,
    record.active,
    record.activeWork,
    record.history,
    record.completion,
    record.completionRecord,
  ].forEach((child) => collectIdentityValues(child, values));

  if (Array.isArray(record.schedules)) {
    record.schedules.forEach((schedule) => collectIdentityValues(schedule, values));
  }

  return values;
}

export function getLifecycleProjectIds(record = {}) {
  return [...collectIdentityValues(record)].filter(Boolean);
}

export function recordsShareLifecycle(record = {}, target = {}) {
  const recordIds = getLifecycleProjectIds(record);
  const targetIds = getLifecycleProjectIds(target);
  return Boolean(
    recordIds.length &&
      targetIds.length &&
      recordIds.some((id) => targetIds.includes(id))
  );
}

function buildLifecyclePatch(nextState, metadata = {}) {
  const updatedAt = metadata.updatedAt || new Date().toISOString();
  return {
    ...metadata,
    status: metadata.status || nextState,
    workflowStatus: metadata.workflowStatus || nextState,
    workStatus: metadata.workStatus || nextState,
    activeWorkStatus: metadata.activeWorkStatus || nextState,
    jobStage: metadata.jobStage || nextState,
    lifecycleState: nextState,
    updatedAt,
  };
}

function updateArrayByLifecycle(storage, key, target, patch, { allowInsert = false } = {}) {
  const records = safeReadArray(storage, key);
  const foundMatch = records.some((record) => recordsShareLifecycle(record, target));
  const nextRecords = foundMatch
    ? records.map((record) =>
        recordsShareLifecycle(record, target) ? { ...record, ...patch } : record
      )
    : allowInsert
    ? [{ ...target, ...patch }, ...records]
    : records;

  safeWriteArray(storage, key, nextRecords);
  return { foundMatch, records: nextRecords };
}

function updateActiveSnapshots(storage, target, nextState, metadata = {}) {
  if (!storage) return;

  const activeTarget = {
    requestId: storage.getItem("activeWorkRequestId") || "",
    quoteId: storage.getItem("activeWorkQuoteId") || "",
    conversationId:
      storage.getItem("activeWorkConversationId") ||
      storage.getItem("activeConversationId") ||
      "",
    scheduleId: storage.getItem("activeWorkScheduleId") || "",
    id: storage.getItem("activeJobId") || "",
  };

  const shouldUpdate =
    recordsShareLifecycle(activeTarget, target) ||
    getLifecycleProjectIds(activeTarget).length === 0;

  if (!shouldUpdate) return;

  if (CLOSED_STATES.has(nextState)) {
    ACTIVE_KEYS.forEach((key) => storage.removeItem(key));
    return;
  }

  storage.setItem("activeWorkStatus", nextState);
  storage.setItem("activeWorkStage", nextState);
  storage.setItem("activeJobStatus", nextState);

  if (metadata.requestId || target.requestId) {
    storage.setItem("activeWorkRequestId", String(metadata.requestId || target.requestId));
  }
  if (metadata.conversationId || target.conversationId) {
    const conversationId = metadata.conversationId || target.conversationId;
    storage.setItem("activeWorkConversationId", String(conversationId));
    storage.setItem("activeConversationId", String(conversationId));
  }
  if (metadata.scheduleId || target.scheduleId) {
    storage.setItem("activeWorkScheduleId", String(metadata.scheduleId || target.scheduleId));
  }
  if (metadata.service || metadata.title || target.service || target.title) {
    storage.setItem(
      "activeWorkService",
      String(metadata.service || metadata.title || target.service || target.title)
    );
    storage.setItem(
      "activeJobService",
      String(metadata.service || metadata.title || target.service || target.title)
    );
  }
  if (metadata.location || target.location || target.address) {
    storage.setItem("activeWorkLocation", String(metadata.location || target.location || target.address));
    storage.setItem("activeJobLocation", String(metadata.location || target.location || target.address));
  }
  if (metadata.customerName || metadata.customer || target.customerName || target.customer) {
    storage.setItem(
      "activeJobCustomer",
      String(metadata.customerName || metadata.customer || target.customerName || target.customer)
    );
  }
}

function updateConversationRegistry(storage, target, nextState, metadata = {}) {
  const registry = safeReadArray(storage, ARRAY_KEYS.conversationRegistry);
  const conversationId = metadata.conversationId || target.conversationId || target.activeConversationId || "";
  const updatedAt = metadata.updatedAt || new Date().toISOString();
  const patch = {
    ...metadata,
    id: conversationId || target.id,
    conversationId: conversationId || target.conversationId,
    status: metadata.conversationStatus || metadata.statusLabel || nextState,
    workflowStatus: metadata.workflowStatus || nextState,
    lifecycleState: nextState,
    resolutionStatus: metadata.resolutionStatus,
    project_title: metadata.projectTitle || metadata.title || target.projectTitle || target.title,
    projectTitle: metadata.projectTitle || metadata.title || target.projectTitle || target.title,
    lastMessage: metadata.lastMessage,
    updatedAt,
  };

  const foundMatch = registry.some(
    (record) =>
      (conversationId && String(record.id || record.conversationId) === String(conversationId)) ||
      recordsShareLifecycle(record, target)
  );

  const nextRegistry = foundMatch
    ? registry.map((record) =>
        (conversationId && String(record.id || record.conversationId) === String(conversationId)) ||
        recordsShareLifecycle(record, target)
          ? { ...record, ...patch, id: record.id || conversationId || target.id }
          : record
      )
    : conversationId
    ? [{ ...target, ...patch, id: conversationId }, ...registry]
    : registry;

  safeWriteArray(storage, ARRAY_KEYS.conversationRegistry, nextRegistry);
  return { foundMatch, records: nextRegistry };
}

export function updateProjectLifecycleState(target = {}, nextState = "active", metadata = {}, options = {}) {
  const storage = options.storage || getDefaultStorage();
  if (!storage || !target || typeof target !== "object") {
    return { updated: false, reason: "missing-storage-or-target" };
  }

  const patch = buildLifecyclePatch(nextState, metadata);
  const effectiveTarget = { ...target, ...metadata };

  const homeowner = updateArrayByLifecycle(
    storage,
    ARRAY_KEYS.homeownerRequests,
    effectiveTarget,
    patch
  );
  const schedule = updateArrayByLifecycle(
    storage,
    ARRAY_KEYS.businessSchedule,
    effectiveTarget,
    patch
  );

  updateActiveSnapshots(storage, effectiveTarget, nextState, patch);
  const conversation = updateConversationRegistry(storage, effectiveTarget, nextState, patch);

  if (options.updateLastCompletedProject !== false) {
    const currentLast = (() => {
      try {
        return JSON.parse(storage.getItem("lastCompletedProject") || "null");
      } catch {
        return null;
      }
    })();

    if (currentLast && recordsShareLifecycle(currentLast, effectiveTarget)) {
      storage.setItem("lastCompletedProject", JSON.stringify({ ...currentLast, ...patch }));
    }
  }

  emitLifecycleUpdate();

  return {
    updated: homeowner.foundMatch || schedule.foundMatch || conversation.foundMatch,
    homeownerUpdated: homeowner.foundMatch,
    scheduleUpdated: schedule.foundMatch,
    conversationUpdated: conversation.foundMatch,
  };
}

export function syncConversationProjectState(conversationOrProject = {}, nextState = "active", metadata = {}, options = {}) {
  return updateProjectLifecycleState(
    conversationOrProject,
    nextState,
    {
      ...metadata,
      conversationId:
        metadata.conversationId ||
        conversationOrProject.conversationId ||
        conversationOrProject.activeConversationId ||
        conversationOrProject.id ||
        "",
    },
    options
  );
}

function buildHistoryRecord(target = {}, metadata = {}) {
  const closedAt = metadata.closedAt || metadata.completedAt || new Date().toISOString();
  const id =
    target.historyId ||
    target.projectId ||
    target.requestId ||
    target.jobId ||
    target.scheduleId ||
    target.conversationId ||
    target.id ||
    `closed-job-${Date.now()}`;

  return {
    ...target,
    ...metadata,
    id,
    type: metadata.type || target.type || "closed_job",
    status: "closed",
    workflowStatus: "closed",
    workStatus: "closed",
    jobStage: "closed",
    lifecycleState: "history",
    closureStatus: "closed",
    savedToHistory: true,
    completedAt: metadata.completedAt || target.completedAt || closedAt,
    closedAt,
    closeDate: metadata.closeDate || closedAt,
  };
}

export function moveJobToHistory(target = {}, metadata = {}, options = {}) {
  const storage = options.storage || getDefaultStorage();
  if (!storage || !target || typeof target !== "object") {
    return { moved: false, reason: "missing-storage-or-target", record: null };
  }

  const historyRecord = buildHistoryRecord(target, metadata);
  const history = safeReadArray(storage, ARRAY_KEYS.completedProjects);
  const withoutDuplicate = history.filter(
    (record) => !recordsShareLifecycle(record, historyRecord)
  );
  safeWriteArray(storage, ARRAY_KEYS.completedProjects, [historyRecord, ...withoutDuplicate]);
  storage.setItem("lastCompletedProject", JSON.stringify(historyRecord));

  updateProjectLifecycleState(
    historyRecord,
    "closed",
    {
      ...metadata,
      status: "closed",
      workflowStatus: "closed",
      workStatus: "closed",
      activeWorkStatus: "closed",
      jobStage: "closed",
      closureStatus: "closed",
      savedToHistory: true,
      closedAt: historyRecord.closedAt,
      closeDate: historyRecord.closeDate,
      conversationStatus: metadata.conversationStatus || "saved_to_history",
      saved_to_history: true,
      archivedAt: metadata.archivedAt || historyRecord.closedAt,
    },
    { ...options, storage, updateLastCompletedProject: false }
  );

  emitLifecycleUpdate();
  return { moved: true, record: historyRecord };
}

export const __projectLifecycleSyncInternals = {
  safeReadArray,
  recordsShareLifecycle,
  buildHistoryRecord,
};
