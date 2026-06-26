const SOURCE_PRECEDENCE = Object.freeze({
  completedProjects: 0,
  homeownerRequests: 1,
  meetro_business_schedule: 2,
  completion: 3,
  "workflow-event": 4,
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

function getSourceRank(source) {
  return SOURCE_PRECEDENCE[source] ?? Number.MAX_SAFE_INTEGER;
}

function getPreferredSourceRecord(historyRecord) {
  const sourceRecords = Array.isArray(historyRecord.sourceRecords)
    ? historyRecord.sourceRecords
    : [];

  return sourceRecords
    .map((entry, index) => ({
      source: String(entry?.source || ""),
      kind: String(entry?.kind || ""),
      record: isRecord(entry?.record) ? entry.record : {},
      index,
    }))
    .sort((left, right) => {
      const rankDifference =
        getSourceRank(left.source) - getSourceRank(right.source);
      return rankDifference !== 0 ? rankDifference : left.index - right.index;
    })[0];
}

function getCompletionDateLabel(value) {
  if (!hasValue(value)) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function createWarning(field, code, message) {
  return { field, code, message };
}

function adaptRecord(historyRecord, index) {
  const safeRecord = isRecord(historyRecord) ? historyRecord : {};
  const preferred = getPreferredSourceRecord(safeRecord);
  const legacy = preferred?.record || {};
  const title = firstValue(legacy.title, legacy.service, legacy.category, "");
  const customer = firstValue(
    legacy.homeownerName,
    legacy.username,
    legacy.customer,
    safeRecord.customer,
    ""
  );
  const category = firstValue(legacy.category, "Project");
  const location = firstValue(legacy.location, "");
  const completionDate = firstValue(
    safeRecord.completionDate,
    legacy.completedAt,
    ""
  );
  const sourceLabel = firstValue(
    preferred?.source,
    legacy.workCenterHistorySource,
    legacy.source,
    ""
  );
  const warnings = [];

  if (!hasValue(title)) {
    warnings.push(
      createWarning(
        "title",
        "missing-project-label",
        "No title, service, or category is available for Work Center display."
      )
    );
  }
  if (!hasValue(customer)) {
    warnings.push(
      createWarning(
        "customer",
        "missing-customer-label",
        "No homeowner, username, or customer label is available."
      )
    );
  }
  if (!hasValue(safeRecord.projectId)) {
    warnings.push(
      createWarning(
        "projectId",
        "missing-project-identity",
        "The reconciled history record has no projectId."
      )
    );
  }
  if (!hasValue(completionDate)) {
    warnings.push(
      createWarning(
        "completionDate",
        "missing-completion-date",
        "No completion date is available; no current date fallback was invented."
      )
    );
  }
  if (!preferred) {
    warnings.push(
      createWarning(
        "legacyDetailReference",
        "missing-legacy-detail-reference",
        "No source record is available for legacy detail navigation."
      )
    );
  }

  return {
    id: safeRecord.id || `work-center-history:${index}`,
    completionId: safeRecord.completionId || "",
    projectId: safeRecord.projectId || "",
    category: String(category),
    title: hasValue(title) ? String(title) : "",
    customer: hasValue(customer) ? String(customer) : "",
    status: safeRecord.status || "unknown",
    statusLabel: "Completed",
    completedAt: getCompletionDateLabel(completionDate),
    completionDateLabel: getCompletionDateLabel(completionDate),
    location: hasValue(location) ? String(location) : "",
    source: hasValue(sourceLabel) ? String(sourceLabel) : "",
    sourceLabel: hasValue(sourceLabel) ? String(sourceLabel) : "",
    legacyOrder:
      legacy.workCenterHistoryAdapter?.legacyOrder ??
      preferred?.index ??
      index,
    legacyDetailReference: preferred
      ? {
          source: preferred.source,
          record: cloneValue(preferred.record),
        }
      : null,
    provenance: cloneValue(safeRecord.provenance || {}),
    warnings,
    fieldCoverage: {
      title: hasValue(title),
      customer: hasValue(customer),
      projectId: hasValue(safeRecord.projectId),
      completionDate: hasValue(getCompletionDateLabel(completionDate)),
      source: hasValue(sourceLabel),
      legacyDetailReference: Boolean(preferred),
    },
  };
}

// Presentation-only characterization. Status remains the current Work Center
// display label while canonical status is preserved separately for comparison.
export function adaptReconciledHistoryToWorkCenterPresentation(
  reconciledHistory = []
) {
  const records = Array.isArray(reconciledHistory) ? reconciledHistory : [];
  return records.map((record, index) => adaptRecord(record, index));
}

export const WORK_CENTER_HISTORY_PRESENTATION_SOURCE_PRECEDENCE =
  SOURCE_PRECEDENCE;
