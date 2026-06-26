import { getProjectIdentity } from "./projectIdentity.js";

export const LEAD_SOURCE_NAMES = Object.freeze({
  POSTS: "posts",
  QUOTE_REQUESTS: "quoteRequests",
  HOMEOWNER_REQUESTS: "homeownerRequests",
});

const CLOSED_STATUSES = new Set([
  "accepted",
  "selected",
  "scheduled",
  "active",
  "completed",
  "cancelled",
  "closed",
]);

const EXPLICIT_IDENTITY_FIELDS = [
  "projectId",
  "project_id",
  "requestId",
  "request_id",
  "jobId",
  "quoteRequestId",
  "conversationId",
  "emergencyId",
  "emergencyRequestId",
  "postId",
];

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function cloneRecord(record) {
  return record && typeof record === "object" && !Array.isArray(record)
    ? { ...record }
    : {};
}

function createWarning(code, message, source) {
  return { code, message, source };
}

function getExplicitIdentityTokens(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return [];

  const tokens = [];
  const containers = [record, record.project].filter(
    (value) => value && typeof value === "object" && !Array.isArray(value)
  );

  containers.forEach((container) => {
    EXPLICIT_IDENTITY_FIELDS.forEach((field) => {
      if (!hasValue(container[field])) return;
      tokens.push(`${field}:${String(container[field]).trim()}`);
    });
  });

  return [...new Set(tokens)];
}

function hasAcceptedQuote(record) {
  return Boolean(
    record?.acceptedQuote ||
      record?.selectedProfessional ||
      record?.quotesReceived?.some(
        (quote) => normalizeStatus(quote?.status) === "accepted"
      )
  );
}

function getLeadState(record) {
  const status = normalizeStatus(record?.status);
  return {
    status,
    isClosed: CLOSED_STATUSES.has(status) || hasAcceptedQuote(record),
    hasAcceptedQuote: hasAcceptedQuote(record),
  };
}

export function normalizeLeadRecord(record, source) {
  const safeRecord = cloneRecord(record);
  const identity = getProjectIdentity(safeRecord);
  const identityTokens = getExplicitIdentityTokens(safeRecord);
  const warnings = identity.warnings.map((warning) => ({
    ...warning,
    source,
  }));

  if (identity.identitySource === "id") {
    warnings.push(
      createWarning(
        "source-generic-id-not-cross-source-safe",
        "The source id is retained for reporting but is not used alone to reconcile records across lead sources.",
        source
      )
    );
  }

  if (identityTokens.length === 0) {
    warnings.push(
      createWarning(
        "missing-explicit-lead-identity",
        "No explicit project or request identity is available for safe cross-source reconciliation.",
        source
      )
    );
  }

  return {
    ...safeRecord,
    leadSource: source,
    projectId: identity.projectId,
    leadIdentity: {
      primaryId: identity.projectId,
      primarySource: identity.identitySource,
      explicitTokens: identityTokens,
      warnings,
    },
    leadState: getLeadState(safeRecord),
  };
}

function normalizeSource(records, source) {
  if (!Array.isArray(records)) return [];
  return records.map((record) => normalizeLeadRecord(record, source));
}

function buildIdentityGroups(records) {
  const tokenGroups = new Map();

  records.forEach((record) => {
    record.leadIdentity.explicitTokens.forEach((token) => {
      if (!tokenGroups.has(token)) tokenGroups.set(token, []);
      tokenGroups.get(token).push(record);
    });
  });

  return [...tokenGroups.entries()].map(([identityToken, matches]) => {
    const sources = [...new Set(matches.map((record) => record.leadSource))];
    const statuses = [
      ...new Set(
        matches
          .map((record) => record.leadState.status)
          .filter((status) => status)
      ),
    ];

    return {
      identityToken,
      recordCount: matches.length,
      sources,
      statuses,
      hasStatusConflict: statuses.length > 1,
      isCrossSource: sources.length > 1,
      records: matches.map((record) => ({
        source: record.leadSource,
        projectId: record.projectId,
        identitySource: record.leadIdentity.primarySource,
        status: record.leadState.status,
        isClosed: record.leadState.isClosed,
      })),
    };
  });
}

export function getLeadSourceReconciliation({
  posts = [],
  quoteRequests = [],
  homeownerRequests = [],
} = {}) {
  const normalizedSources = {
    [LEAD_SOURCE_NAMES.POSTS]: normalizeSource(
      posts,
      LEAD_SOURCE_NAMES.POSTS
    ),
    [LEAD_SOURCE_NAMES.QUOTE_REQUESTS]: normalizeSource(
      quoteRequests,
      LEAD_SOURCE_NAMES.QUOTE_REQUESTS
    ),
    [LEAD_SOURCE_NAMES.HOMEOWNER_REQUESTS]: normalizeSource(
      homeownerRequests,
      LEAD_SOURCE_NAMES.HOMEOWNER_REQUESTS
    ),
  };

  const records = Object.values(normalizedSources).flat();
  const identityGroups = buildIdentityGroups(records);
  const unresolvedRecords = records
    .filter((record) => record.leadIdentity.explicitTokens.length === 0)
    .map((record) => ({
      source: record.leadSource,
      projectId: record.projectId,
      identitySource: record.leadIdentity.primarySource,
      warnings: record.leadIdentity.warnings.map((warning) => ({
        ...warning,
      })),
    }));
  const warningCounts = {};

  records.forEach((record) => {
    record.leadIdentity.warnings.forEach((warning) => {
      warningCounts[warning.code] = (warningCounts[warning.code] || 0) + 1;
    });
  });

  return {
    sourceCounts: Object.fromEntries(
      Object.entries(normalizedSources).map(([source, sourceRecords]) => [
        source,
        sourceRecords.length,
      ])
    ),
    totalRecordCount: records.length,
    safeCrossSourceGroupCount: identityGroups.filter(
      (group) => group.isCrossSource
    ).length,
    unresolvedRecordCount: unresolvedRecords.length,
    statusConflictCount: identityGroups.filter(
      (group) => group.hasStatusConflict
    ).length,
    warningCounts,
    normalizedSources,
    identityGroups,
    unresolvedRecords,
  };
}
