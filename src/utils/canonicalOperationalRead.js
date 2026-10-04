const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const WORKSTREAM_STATES = Object.freeze([
  "OPEN",
  "ACTIVE",
  "BLOCKED",
  "COMPLETED",
  "DEFERRED",
  "EXCLUDED",
]);
export const ACTIVITY_STATUSES = Object.freeze([
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
]);
export const OBLIGATION_STATUSES = Object.freeze([
  "OPEN",
  "SATISFIED",
  "DEFERRED",
  "EXCLUDED",
]);
export const COMPLETION_ELIGIBILITY_REASONS = Object.freeze([
  "INELIGIBLE_WORKSTREAM_STATE",
  "OPEN_FINDING",
  "PARTIAL_FINDING",
  "OPEN_OBLIGATION",
  "ACTIVE_ACTIVITY",
]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, keys) {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key))
  );
}

function canonicalUuid(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function nonnegativeInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function canonicalTimestamp(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function boundedText(value, maximum, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    return null;
  }
  return value;
}

export function getCanonicalOperationalJobContext(record = {}) {
  const jobId = canonicalUuid(record.jobId);
  if (
    record.source !== "CANONICAL_BACKEND_READ" ||
    record.readOnly !== true ||
    record.lifecycleVerified !== true ||
    positiveInteger(record.lifecycleContractVersion) !== 2 ||
    !jobId
  ) {
    return null;
  }
  return Object.freeze({
    authoritySource: "CANONICAL_BACKEND_READ",
    lifecycleContractVersion: 2,
    readOnly: true,
    jobId,
  });
}

export function validateCanonicalWorkstreamProjection(value) {
  const keys = [
    "id",
    "jobId",
    "sequence",
    "title",
    "state",
    "currentVersion",
    "createdByParticipantId",
    "createdAt",
    "versionCreatedAt",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const id = canonicalUuid(value.id);
  const jobId = canonicalUuid(value.jobId);
  const sequence = positiveInteger(value.sequence);
  const title = boundedText(value.title, 200);
  const currentVersion = positiveInteger(value.currentVersion);
  const createdByParticipantId = canonicalUuid(value.createdByParticipantId);
  const createdAt = canonicalTimestamp(value.createdAt);
  const versionCreatedAt = canonicalTimestamp(value.versionCreatedAt);
  if (
    !id ||
    !jobId ||
    !sequence ||
    !title ||
    !WORKSTREAM_STATES.includes(value.state) ||
    !currentVersion ||
    !createdByParticipantId ||
    !createdAt ||
    !versionCreatedAt
  ) {
    return null;
  }
  return {
    id,
    jobId,
    sequence,
    title,
    state: value.state,
    currentVersion,
    createdByParticipantId,
    createdAt,
    versionCreatedAt,
  };
}

export function validateCanonicalWorkstreams(value, { jobId } = {}) {
  const expectedJobId = canonicalUuid(jobId);
  if (!expectedJobId || !Array.isArray(value) || value.length > 100) return null;
  const workstreams = value.map(validateCanonicalWorkstreamProjection);
  if (
    workstreams.some((workstream) => !workstream) ||
    workstreams.some((workstream) => workstream.jobId !== expectedJobId) ||
    new Set(workstreams.map((workstream) => workstream.id)).size !==
      workstreams.length ||
    new Set(workstreams.map((workstream) => workstream.sequence)).size !==
      workstreams.length
  ) {
    return null;
  }
  return workstreams;
}

export function validateCanonicalActivityProjection(value) {
  const keys = [
    "id",
    "workstreamId",
    "jobId",
    "actorParticipantId",
    "activityType",
    "statement",
    "status",
    "temporaryIntervention",
    "temporaryDetails",
    "customerVisible",
    "performedAt",
    "currentVersion",
    "createdAt",
    "versionCreatedAt",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const id = canonicalUuid(value.id);
  const workstreamId = canonicalUuid(value.workstreamId);
  const jobId = canonicalUuid(value.jobId);
  const actorParticipantId = canonicalUuid(value.actorParticipantId);
  const activityType = boundedText(value.activityType, 80);
  const statement = boundedText(value.statement, 5000);
  const temporaryDetails = boundedText(value.temporaryDetails, 2000, {
    nullable: true,
  });
  const performedAt = canonicalTimestamp(value.performedAt, { nullable: true });
  const currentVersion = positiveInteger(value.currentVersion);
  const createdAt = canonicalTimestamp(value.createdAt);
  const versionCreatedAt = canonicalTimestamp(value.versionCreatedAt);
  if (
    !id ||
    !workstreamId ||
    !jobId ||
    !actorParticipantId ||
    !activityType ||
    !/^[A-Z][A-Z0-9_]{2,79}$/.test(activityType) ||
    !statement ||
    !ACTIVITY_STATUSES.includes(value.status) ||
    typeof value.temporaryIntervention !== "boolean" ||
    typeof value.customerVisible !== "boolean" ||
    (value.temporaryIntervention && !temporaryDetails) ||
    (!value.temporaryIntervention && value.temporaryDetails != null) ||
    (value.performedAt != null && !performedAt) ||
    (value.status === "DONE" && !performedAt) ||
    !currentVersion ||
    !createdAt ||
    !versionCreatedAt
  ) {
    return null;
  }
  return {
    id,
    workstreamId,
    jobId,
    actorParticipantId,
    activityType,
    statement,
    status: value.status,
    temporaryIntervention: value.temporaryIntervention,
    temporaryDetails,
    customerVisible: value.customerVisible,
    performedAt,
    currentVersion,
    createdAt,
    versionCreatedAt,
  };
}

export function validateCanonicalActivities(value, { jobId, workstreamId } = {}) {
  const expectedJobId = canonicalUuid(jobId);
  const expectedWorkstreamId = canonicalUuid(workstreamId);
  if (
    !expectedJobId ||
    !expectedWorkstreamId ||
    !Array.isArray(value) ||
    value.length > 200
  ) {
    return null;
  }
  const activities = value.map(validateCanonicalActivityProjection);
  if (
    activities.some((activity) => !activity) ||
    activities.some(
      (activity) =>
        activity.jobId !== expectedJobId ||
        activity.workstreamId !== expectedWorkstreamId
    ) ||
    new Set(activities.map((activity) => activity.id)).size !== activities.length
  ) {
    return null;
  }
  return activities;
}

export function validateCanonicalObligationProjection(value) {
  const keys = [
    "id",
    "workstreamId",
    "jobId",
    "sequence",
    "sourceFindingId",
    "statement",
    "status",
    "currentVersion",
    "createdByParticipantId",
    "createdAt",
    "versionCreatedAt",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const id = canonicalUuid(value.id);
  const workstreamId = canonicalUuid(value.workstreamId);
  const jobId = canonicalUuid(value.jobId);
  const sequence = positiveInteger(value.sequence);
  const sourceFindingId = canonicalUuid(value.sourceFindingId, { nullable: true });
  const statement = boundedText(value.statement, 5000);
  const currentVersion = positiveInteger(value.currentVersion);
  const createdByParticipantId = canonicalUuid(value.createdByParticipantId);
  const createdAt = canonicalTimestamp(value.createdAt);
  const versionCreatedAt = canonicalTimestamp(value.versionCreatedAt);
  if (
    !id ||
    !workstreamId ||
    !jobId ||
    !sequence ||
    (value.sourceFindingId != null && !sourceFindingId) ||
    !statement ||
    !OBLIGATION_STATUSES.includes(value.status) ||
    !currentVersion ||
    !createdByParticipantId ||
    !createdAt ||
    !versionCreatedAt
  ) {
    return null;
  }
  return {
    id,
    workstreamId,
    jobId,
    sequence,
    sourceFindingId,
    statement,
    status: value.status,
    currentVersion,
    createdByParticipantId,
    createdAt,
    versionCreatedAt,
  };
}

export function validateCanonicalObligations(value, { jobId, workstreamId } = {}) {
  const expectedJobId = canonicalUuid(jobId);
  const expectedWorkstreamId = canonicalUuid(workstreamId);
  if (
    !expectedJobId ||
    !expectedWorkstreamId ||
    !Array.isArray(value) ||
    value.length > 200
  ) {
    return null;
  }
  const obligations = value.map(validateCanonicalObligationProjection);
  if (
    obligations.some((obligation) => !obligation) ||
    obligations.some(
      (obligation) =>
        obligation.jobId !== expectedJobId ||
        obligation.workstreamId !== expectedWorkstreamId
    ) ||
    new Set(obligations.map((obligation) => obligation.id)).size !==
      obligations.length ||
    new Set(obligations.map((obligation) => obligation.sequence)).size !==
      obligations.length
  ) {
    return null;
  }
  return obligations;
}

export function validateCanonicalCompletionEligibility(
  value,
  { jobId, workstream } = {}
) {
  const canonicalWorkstream = validateCanonicalWorkstreamProjection(workstream);
  const expectedJobId = canonicalUuid(jobId);
  const keys = [
    "eligible",
    "reasons",
    "workstreamId",
    "jobId",
    "workstreamState",
    "workstreamVersion",
    "blockers",
    "deferredScope",
  ];
  if (!canonicalWorkstream || !expectedJobId || !hasExactKeys(value, keys)) {
    return null;
  }
  const workstreamId = canonicalUuid(value.workstreamId);
  const projectedJobId = canonicalUuid(value.jobId);
  const reasons = Array.isArray(value.reasons) ? [...value.reasons] : null;
  const workstreamVersion = positiveInteger(value.workstreamVersion);
  const blockers = value.blockers;
  const deferredScope = value.deferredScope;
  if (
    typeof value.eligible !== "boolean" ||
    !reasons ||
    reasons.length > COMPLETION_ELIGIBILITY_REASONS.length ||
    reasons.some((reason) => !COMPLETION_ELIGIBILITY_REASONS.includes(reason)) ||
    new Set(reasons).size !== reasons.length ||
    value.eligible !== (reasons.length === 0) ||
    workstreamId !== canonicalWorkstream.id ||
    projectedJobId !== expectedJobId ||
    canonicalWorkstream.jobId !== expectedJobId ||
    value.workstreamState !== canonicalWorkstream.state ||
    workstreamVersion !== canonicalWorkstream.currentVersion ||
    !hasExactKeys(blockers, [
      "openFindings",
      "partialFindings",
      "openObligations",
      "activeActivities",
    ]) ||
    !hasExactKeys(deferredScope, ["findings", "obligations"])
  ) {
    return null;
  }
  const normalizedBlockers = {
    openFindings: nonnegativeInteger(blockers.openFindings),
    partialFindings: nonnegativeInteger(blockers.partialFindings),
    openObligations: nonnegativeInteger(blockers.openObligations),
    activeActivities: nonnegativeInteger(blockers.activeActivities),
  };
  const normalizedDeferredScope = {
    findings: nonnegativeInteger(deferredScope.findings),
    obligations: nonnegativeInteger(deferredScope.obligations),
  };
  if (
    Object.values(normalizedBlockers).some((count) => count == null) ||
    Object.values(normalizedDeferredScope).some((count) => count == null)
  ) {
    return null;
  }
  return {
    eligible: value.eligible,
    reasons,
    workstreamId,
    jobId: projectedJobId,
    workstreamState: value.workstreamState,
    workstreamVersion,
    blockers: normalizedBlockers,
    deferredScope: normalizedDeferredScope,
  };
}
