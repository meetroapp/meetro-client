const STATUS_ALIASES = new Map([
  ["complete", "completed"],
  ["closed", "completed"],
  ["awaiting customer confirmation", "awaiting_confirmation"],
  ["awaiting_customer_confirmation", "awaiting_confirmation"],
  ["awaiting-confirmation", "awaiting_confirmation"],
  ["completion_submitted", "submitted"],
  ["workflow_completion_submitted", "submitted"],
  ["completion_confirmed", "confirmed"],
  ["workflow_completion_confirmed", "confirmed"],
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function firstValue(...values) {
  return values.find(hasValue);
}

function stringValue(value) {
  return hasValue(value) ? String(value).trim() : "";
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

function getPayload(record) {
  return isRecord(record.payload) ? record.payload : {};
}

function getNestedCompletion(record) {
  if (isRecord(record.completion)) return record.completion;
  const payload = getPayload(record);
  return isRecord(payload.completion) ? payload.completion : {};
}

function getCompletionIdentity(record, kind) {
  const payload = getPayload(record);
  const completion = getNestedCompletion(record);
  const explicit = firstValue(
    record.completionId,
    record.completionRecordId,
    payload.completionId,
    payload.completionRecordId,
    completion.completionId,
    completion.completionRecordId
  );

  if (hasValue(explicit)) {
    return {
      value: stringValue(explicit),
      trust: "AUTHORITATIVE",
      source: "completion-identity",
    };
  }

  const fallback =
    kind === "reconciled"
      ? firstValue(record.completionId, record.id?.replace(/^history:/, ""))
      : firstValue(completion.id, record.id);

  return hasValue(fallback)
    ? {
        value: stringValue(fallback),
        trust: "FALLBACK",
        source: kind === "reconciled" ? "history-id" : "legacy-id",
      }
    : { value: "", trust: "MISSING", source: "unresolved" };
}

function getProjectIdentity(record) {
  const payload = getPayload(record);
  const completion = getNestedCompletion(record);
  return stringValue(
    firstValue(
      record.projectId,
      record.project_id,
      payload.projectId,
      payload.project_id,
      completion.projectId,
      completion.project_id
    )
  );
}

function normalizeStatus(record) {
  const rawStatus = stringValue(
    firstValue(
      record.status,
      record.completionStatus,
      record.eventType,
      record.type,
      getPayload(record).status
    )
  ).toLowerCase();

  if (!rawStatus) return "unknown";
  return STATUS_ALIASES.get(rawStatus) || rawStatus.replaceAll("-", "_");
}

function summarizeRecord(record, index, kind) {
  const identity = getCompletionIdentity(record, kind);
  const provenance = isRecord(record.provenance)
    ? cloneValue(record.provenance)
    : {};

  return {
    index,
    identity: identity.value,
    identityTrust: identity.trust,
    identitySource: identity.source,
    projectId: getProjectIdentity(record),
    status: normalizeStatus(record),
    provenance,
  };
}

function groupByIdentity(records) {
  const groups = new Map();

  records.forEach((record) => {
    if (!record.identity) return;
    const group = groups.get(record.identity) || [];
    group.push(record);
    groups.set(record.identity, group);
  });

  return groups;
}

function createDuplicateFindings(groups, side) {
  return [...groups.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([identity, records]) => ({
      side,
      identity,
      count: records.length,
      indexes: records.map((record) => record.index),
    }))
    .sort((left, right) => left.identity.localeCompare(right.identity));
}

function createUnidentifiedFindings(records, side) {
  return records
    .filter((record) => !record.identity)
    .map((record) => ({
      side,
      index: record.index,
      reason: "missing-completion-identity",
      provenance: cloneValue(record.provenance),
    }));
}

function roundScore(value) {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function calculateParity({
  legacyGroups,
  reconciledGroups,
  matchedIdentities,
  orderingDifferences,
  identityDifferences,
  statusDifferences,
  duplicateRecords,
  unidentifiedRecords,
}) {
  const unionCount = new Set([
    ...legacyGroups.keys(),
    ...reconciledGroups.keys(),
  ]).size;
  const matchedCount = matchedIdentities.length;
  const coverageRatio = unionCount === 0 ? 1 : matchedCount / unionCount;
  const orderingRatio =
    matchedCount === 0
      ? unionCount === 0
        ? 1
        : 0
      : 1 - orderingDifferences.length / matchedCount;
  const identityRatio =
    matchedCount === 0
      ? unionCount === 0
        ? 1
        : 0
      : 1 - identityDifferences.length / matchedCount;
  const statusRatio =
    matchedCount === 0
      ? unionCount === 0
        ? 1
        : 0
      : 1 - statusDifferences.length / matchedCount;
  const score = roundScore(
    coverageRatio * 60 +
      orderingRatio * 15 +
      identityRatio * 15 +
      statusRatio * 10
  );

  return {
    score,
    exact:
      score === 100 &&
      duplicateRecords.length === 0 &&
      unidentifiedRecords.length === 0,
    matchedCount,
    uniqueLegacyCount: legacyGroups.size,
    uniqueReconciledCount: reconciledGroups.size,
    coveragePercentage: roundScore(coverageRatio * 100),
  };
}

// Shadow-only comparison for the legacy Work Center completed-work projection.
// Matching is limited to explicit or retained completion identity; display
// text, customer names, timestamps, and project titles are never match keys.
export function compareWorkCenterHistory(input = {}) {
  const safeInput = isRecord(input) ? input : {};
  const legacyHistory = Array.isArray(safeInput.legacyHistory)
    ? safeInput.legacyHistory
    : [];
  const reconciledHistory = Array.isArray(safeInput.reconciledHistory)
    ? safeInput.reconciledHistory
    : [];
  const legacyRecords = legacyHistory.map((record, index) =>
    summarizeRecord(isRecord(record) ? record : {}, index, "legacy")
  );
  const reconciledRecords = reconciledHistory.map((record, index) =>
    summarizeRecord(isRecord(record) ? record : {}, index, "reconciled")
  );
  const legacyGroups = groupByIdentity(legacyRecords);
  const reconciledGroups = groupByIdentity(reconciledRecords);
  const matchedIdentities = [...legacyGroups.keys()]
    .filter((identity) => reconciledGroups.has(identity))
    .sort();
  const missingRecords = [...legacyGroups.entries()]
    .filter(([identity]) => !reconciledGroups.has(identity))
    .map(([identity, records]) => ({
      identity,
      legacyIndexes: records.map((record) => record.index),
      projectId: records[0].projectId,
      status: records[0].status,
    }))
    .sort((left, right) => left.identity.localeCompare(right.identity));
  const extraRecords = [...reconciledGroups.entries()]
    .filter(([identity]) => !legacyGroups.has(identity))
    .map(([identity, records]) => ({
      identity,
      reconciledIndexes: records.map((record) => record.index),
      projectId: records[0].projectId,
      status: records[0].status,
      provenance: cloneValue(records[0].provenance),
    }))
    .sort((left, right) => left.identity.localeCompare(right.identity));
  const legacyMatchedOrder = legacyRecords
    .filter((record) => matchedIdentities.includes(record.identity))
    .filter(
      (record, index, records) =>
        records.findIndex((entry) => entry.identity === record.identity) ===
        index
    )
    .map((record) => record.identity);
  const reconciledMatchedOrder = reconciledRecords
    .filter((record) => matchedIdentities.includes(record.identity))
    .filter(
      (record, index, records) =>
        records.findIndex((entry) => entry.identity === record.identity) ===
        index
    )
    .map((record) => record.identity);
  const orderingDifferences = matchedIdentities
    .map((identity) => ({
      identity,
      legacyPosition: legacyMatchedOrder.indexOf(identity),
      reconciledPosition: reconciledMatchedOrder.indexOf(identity),
    }))
    .filter(
      (difference) =>
        difference.legacyPosition !== difference.reconciledPosition
    );
  const identityDifferences = matchedIdentities.flatMap((identity) => {
    const legacy = legacyGroups.get(identity)[0];
    const reconciled = reconciledGroups.get(identity)[0];
    const differences = [];

    if (
      legacy.projectId &&
      reconciled.projectId &&
      legacy.projectId !== reconciled.projectId
    ) {
      differences.push({
        identity,
        field: "projectId",
        legacyValue: legacy.projectId,
        reconciledValue: reconciled.projectId,
        provenance: cloneValue(reconciled.provenance),
      });
    } else if (!legacy.projectId || !reconciled.projectId) {
      differences.push({
        identity,
        field: "projectId",
        legacyValue: legacy.projectId,
        reconciledValue: reconciled.projectId,
        reason: "missing-project-identity",
        provenance: cloneValue(reconciled.provenance),
      });
    }

    if (
      legacy.identityTrust !== reconciled.identityTrust &&
      reconciled.identityTrust !== "AUTHORITATIVE"
    ) {
      differences.push({
        identity,
        field: "completionIdTrust",
        legacyValue: legacy.identityTrust,
        reconciledValue: reconciled.identityTrust,
        provenance: cloneValue(reconciled.provenance),
      });
    }

    return differences;
  });
  const statusDifferences = matchedIdentities
    .map((identity) => {
      const legacy = legacyGroups.get(identity)[0];
      const reconciled = reconciledGroups.get(identity)[0];
      return {
        identity,
        legacyStatus: legacy.status,
        reconciledStatus: reconciled.status,
      };
    })
    .filter(
      (difference) =>
        difference.legacyStatus !== difference.reconciledStatus
    );
  const duplicateRecords = [
    ...createDuplicateFindings(legacyGroups, "legacy"),
    ...createDuplicateFindings(reconciledGroups, "reconciled"),
  ];
  const unidentifiedRecords = [
    ...createUnidentifiedFindings(legacyRecords, "legacy"),
    ...createUnidentifiedFindings(reconciledRecords, "reconciled"),
  ];
  const parity = calculateParity({
    legacyGroups,
    reconciledGroups,
    matchedIdentities,
    orderingDifferences,
    identityDifferences,
    statusDifferences,
    duplicateRecords,
    unidentifiedRecords,
  });

  return {
    parity,
    missingRecords,
    extraRecords,
    orderingDifferences,
    identityDifferences,
    statusDifferences,
    duplicateRecords,
    unidentifiedRecords,
    provenanceSummary: {
      high: reconciledRecords.filter(
        (record) => record.provenance.quality === "HIGH"
      ).length,
      medium: reconciledRecords.filter(
        (record) => record.provenance.quality === "MEDIUM"
      ).length,
      low: reconciledRecords.filter(
        (record) => record.provenance.quality === "LOW"
      ).length,
      unspecified: reconciledRecords.filter(
        (record) =>
          !["HIGH", "MEDIUM", "LOW"].includes(record.provenance.quality)
      ).length,
    },
  };
}
