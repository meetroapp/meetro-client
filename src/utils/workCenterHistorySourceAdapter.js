const SOURCE_LABELS = Object.freeze({
  schedule: "meetro_business_schedule",
  completedProject: "completedProjects",
  homeownerRequest: "homeownerRequests",
});

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function firstValue(...values) {
  return values.find(hasValue);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      cloneValue(nestedValue),
    ])
  );
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function isCompletedStatus(value) {
  return ["completed", "complete", "closed"].includes(normalizeStatus(value));
}

function getSourceLocalIdentity(record) {
  return firstValue(
    record.completionId,
    record.completionRecordId,
    record.id,
    record.requestId,
    record.scheduleId
  );
}

function createAdapterMeta({
  source,
  sourceType,
  sourceIndex,
  legacyOrder,
  record,
}) {
  const sourceLocalIdentity = getSourceLocalIdentity(record);

  return {
    source,
    sourceType,
    sourceIndex,
    legacyOrder,
    sourceLocalIdentity: hasValue(sourceLocalIdentity)
      ? String(sourceLocalIdentity)
      : "",
  };
}

function adaptScheduleRecord(record, sourceIndex, legacyOrder) {
  const source = SOURCE_LABELS.schedule;
  const adapterMeta = createAdapterMeta({
    source,
    sourceType: "schedule",
    sourceIndex,
    legacyOrder,
    record,
  });
  const normalized = {
    ...cloneValue(record),
    customer: firstValue(record.customer, record.location, ""),
    revenue: firstValue(record.revenue, record.amount, 0),
    source: record.source || "schedule",
    workCenterHistorySource: source,
    workCenterHistoryAdapter: adapterMeta,
  };

  return {
    legacy: cloneValue(normalized),
    reconciliation: { source, record: normalized },
    meta: adapterMeta,
  };
}

function adaptCompletedProjectRecord(record, sourceIndex, legacyOrder) {
  const source = SOURCE_LABELS.completedProject;
  const adapterMeta = createAdapterMeta({
    source,
    sourceType: "completedProject",
    sourceIndex,
    legacyOrder,
    record,
  });
  const normalized = {
    ...cloneValue(record),
    workCenterHistorySource: source,
    workCenterHistoryAdapter: adapterMeta,
  };

  return {
    legacy: cloneValue(normalized),
    reconciliation: { source, record: normalized },
    meta: adapterMeta,
  };
}

function adaptHomeownerRequestRecord(record, sourceIndex, legacyOrder) {
  const source = SOURCE_LABELS.homeownerRequest;
  const adapterMeta = createAdapterMeta({
    source,
    sourceType: "homeownerRequest",
    sourceIndex,
    legacyOrder,
    record,
  });
  const normalized = {
    ...cloneValue(record),
    revenue: firstValue(
      record.revenue,
      record.acceptedQuote?.amount,
      record.quoteAmount,
      0
    ),
    source: record.source || "homeownerProject",
    workCenterHistorySource: source,
    workCenterHistoryAdapter: adapterMeta,
  };

  return {
    legacy: cloneValue(normalized),
    reconciliation: { source, record: normalized },
    meta: adapterMeta,
  };
}

// Pure characterization adapter. The output preserves the current Work Center
// source-bucket order without reading storage or granting any source authority.
export function adaptWorkCenterHistorySources(input = {}) {
  const safeInput = isRecord(input) ? input : {};
  const scheduleRecords = Array.isArray(safeInput.scheduleRecords)
    ? safeInput.scheduleRecords
    : [];
  const completedProjects = Array.isArray(safeInput.completedProjects)
    ? safeInput.completedProjects
    : [];
  const homeownerRequests = Array.isArray(safeInput.homeownerRequests)
    ? safeInput.homeownerRequests
    : [];
  const workflowEvents = Array.isArray(safeInput.workflowEvents)
    ? cloneValue(safeInput.workflowEvents)
    : [];
  const projects = Array.isArray(safeInput.projects)
    ? cloneValue(safeInput.projects)
    : [];
  const conversations = Array.isArray(safeInput.conversations)
    ? cloneValue(safeInput.conversations)
    : [];
  const entries = [];

  scheduleRecords
    .filter((record) => isRecord(record) && isCompletedStatus(record.status))
    .forEach((record, sourceIndex) => {
      entries.push(adaptScheduleRecord(record, sourceIndex, entries.length));
    });

  completedProjects
    .filter(isRecord)
    .forEach((record, sourceIndex) => {
      entries.push(
        adaptCompletedProjectRecord(record, sourceIndex, entries.length)
      );
    });

  const completedProjectIds = new Set(
    completedProjects
      .filter(isRecord)
      .map((record) => firstValue(record.requestId, record.id))
      .filter(hasValue)
      .map(String)
  );

  homeownerRequests
    .filter((record) => isRecord(record) && isCompletedStatus(record.status))
    .filter((record) => {
      const identity = firstValue(record.requestId, record.id);
      return !hasValue(identity) || !completedProjectIds.has(String(identity));
    })
    .forEach((record, sourceIndex) => {
      entries.push(
        adaptHomeownerRequestRecord(record, sourceIndex, entries.length)
      );
    });

  return {
    legacyHistory: entries.map((entry) => cloneValue(entry.legacy)),
    reconciliationInput: {
      completions: entries.map((entry) => cloneValue(entry.reconciliation)),
      workflowEvents,
      projects,
      conversations,
    },
    sourceMetadata: entries.map((entry) => cloneValue(entry.meta)),
    sourceSummary: {
      scheduleCount: entries.filter(
        (entry) => entry.meta.sourceType === "schedule"
      ).length,
      completedProjectCount: entries.filter(
        (entry) => entry.meta.sourceType === "completedProject"
      ).length,
      homeownerRequestCount: entries.filter(
        (entry) => entry.meta.sourceType === "homeownerRequest"
      ).length,
      totalLegacyCount: entries.length,
      excludedHomeownerDuplicateCount: homeownerRequests.filter((record) => {
        if (!isRecord(record) || !isCompletedStatus(record.status)) return false;
        const identity = firstValue(record.requestId, record.id);
        return hasValue(identity) && completedProjectIds.has(String(identity));
      }).length,
    },
  };
}

export const WORK_CENTER_HISTORY_SOURCE_LABELS = SOURCE_LABELS;
