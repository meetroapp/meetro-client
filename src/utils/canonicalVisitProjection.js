import { authFetch } from "./authFetch.js";
import { normalizePreWorkDepositGate } from "./preWorkDepositApi.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VISIT_PURPOSES = Object.freeze(["EVALUATION", "APPROVED_WORK"]);
const VISIT_STATES = Object.freeze([
  "PROPOSED",
  "SCHEDULED",
  "STARTED",
  "CANCELLED",
  "COMPLETED",
]);
const VISIT_LOCATION_MODES = Object.freeze([
  "JOB_SERVICE_LOCATION",
  "REMOTE",
]);
const VISIT_EVENT_TYPES = Object.freeze([
  "VISIT_PROPOSED",
  "VISIT_SCHEDULE_PROPOSED",
  "VISIT_CONFIRMED",
  "VISIT_CHANGE_REQUESTED",
  "VISIT_RESCHEDULED",
  "VISIT_CANCELLED",
  "VISIT_STARTED",
  "VISIT_COMPLETED",
]);
const PROFESSIONAL_ACTIONS = Object.freeze([
  "canReschedule",
  "canCancel",
  "canStart",
  "canComplete",
]);
const CUSTOMER_CAPABILITIES = Object.freeze([
  "visit.read",
  "visit.confirm",
  "visit.change_request",
]);
const PROFESSIONAL_CAPABILITIES = Object.freeze([
  "visit.read",
  "visit.propose",
  "visit.reschedule",
  "visit.cancel",
  "visit.start",
  "visit.complete",
]);
const AUTHORITY_SOURCES = Object.freeze({
  EVALUATION: "CANONICAL_EVALUATION_VISIT_AUTHORITY",
  APPROVED_WORK: "CANONICAL_APPROVED_WORK_VISIT_AUTHORITY",
});

export class CanonicalVisitError extends Error {
  constructor({
    status = 500,
    code = "CANONICAL_VISIT_FAILED",
    message = "Visit scheduling is unavailable.",
  } = {}) {
    super(message);
    this.name = "CanonicalVisitError";
    this.status = status;
    this.code = code;
  }
}

function canonicalUuid(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function boundedText(value, maximum = 2000, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= maximum ? normalized : null;
}

function canonicalTimestamp(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function canonicalTimeZone(value) {
  const normalized = boundedText(value, 255);
  if (!normalized) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format();
    return normalized;
  } catch {
    return null;
  }
}

function normalizeSchedule(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const scheduledStartAt = canonicalTimestamp(value.scheduledStartAt);
  const scheduledEndAt = canonicalTimestamp(value.scheduledEndAt, {
    nullable: true,
  });
  const timeZone = canonicalTimeZone(value.timeZone);
  if (
    !scheduledStartAt ||
    (value.scheduledEndAt != null && !scheduledEndAt) ||
    (scheduledEndAt && Date.parse(scheduledEndAt) <= Date.parse(scheduledStartAt)) ||
    !timeZone ||
    !VISIT_LOCATION_MODES.includes(value.locationMode)
  ) {
    return null;
  }
  return {
    scheduledStartAt,
    scheduledEndAt,
    timeZone,
    locationMode: value.locationMode,
  };
}

function normalizeCapabilities(value, allowed) {
  if (!Array.isArray(value)) return null;
  const normalized = value.map((item) => boundedText(item, 80));
  if (
    normalized.some((item) => !item || !allowed.includes(item)) ||
    new Set(normalized).size !== normalized.length
  ) {
    return null;
  }
  return normalized;
}

function normalizeVisitActions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = [
    "canConfirm",
    "canRequestChange",
    ...PROFESSIONAL_ACTIONS.filter((key) => key !== "canStart"),
  ];
  if (keys.some((key) => typeof value[key] !== "boolean")) return null;
  return Object.freeze({
    canConfirm: value.canConfirm === true,
    canRequestChange: value.canRequestChange === true,
    canReschedule: value.canReschedule === true,
    canCancel: value.canCancel === true,
    canStart: value.canStart === true,
    canComplete: value.canComplete === true,
  });
}

function normalizeVisitVersion(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const version = positiveInteger(value.version);
  const scheduledStartAt = canonicalTimestamp(value.scheduledStartAt);
  const scheduledEndAt = canonicalTimestamp(value.scheduledEndAt, {
    nullable: true,
  });
  const timeZone = canonicalTimeZone(value.timeZone);
  const cancellationReason = boundedText(value.cancellationReason, 2000, {
    nullable: true,
  });
  const cancelledAt = canonicalTimestamp(value.cancelledAt, { nullable: true });
  const startedAt = canonicalTimestamp(value.startedAt, { nullable: true });
  const completedAt = canonicalTimestamp(value.completedAt, { nullable: true });
  const recordedByParticipantId = canonicalUuid(value.recordedByParticipantId);
  const createdAt = canonicalTimestamp(value.createdAt);
  if (
    !version ||
    !VISIT_STATES.includes(value.state) ||
    !scheduledStartAt ||
    (value.scheduledEndAt != null && !scheduledEndAt) ||
    (scheduledEndAt && Date.parse(scheduledEndAt) <= Date.parse(scheduledStartAt)) ||
    !timeZone ||
    !VISIT_LOCATION_MODES.includes(value.locationMode) ||
    (value.cancellationReason != null && !cancellationReason) ||
    (value.cancelledAt != null && !cancelledAt) ||
    (value.startedAt != null && !startedAt) ||
    (value.completedAt != null && !completedAt) ||
    !recordedByParticipantId ||
    !createdAt
  ) {
    return null;
  }
  return {
    version,
    state: value.state,
    scheduledStartAt,
    scheduledEndAt,
    timeZone,
    locationMode: value.locationMode,
    cancellationReason,
    startedAt,
    cancelledAt,
    completedAt,
    createdAt,
  };
}

function normalizeVisitEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = canonicalUuid(value.id);
  const visitVersion = positiveInteger(value.visitVersion);
  const previousVisitVersion =
    value.previousVisitVersion == null
      ? null
      : positiveInteger(value.previousVisitVersion);
  const reason = boundedText(value.reason, 2000, { nullable: true });
  const recordedByParticipantId = canonicalUuid(value.recordedByParticipantId);
  const createdAt = canonicalTimestamp(value.createdAt);
  if (
    !id ||
    !VISIT_EVENT_TYPES.includes(value.type) ||
    !visitVersion ||
    (value.previousVisitVersion != null && !previousVisitVersion) ||
    !VISIT_STATES.includes(value.visitState) ||
    (value.reason != null && !reason) ||
    !recordedByParticipantId ||
    !createdAt
  ) {
    return null;
  }
  return {
    id,
    type: value.type,
    visitVersion,
    previousVisitVersion,
    visitState: value.visitState,
    reason,
    createdAt,
  };
}

function normalizeVisitHistory(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!Array.isArray(value.versions) || !Array.isArray(value.events)) return null;
  const versions = value.versions.map(normalizeVisitVersion);
  const events = value.events.map(normalizeVisitEvent);
  if (
    versions.some((item) => !item) ||
    events.some((item) => !item) ||
    versions.some((item, index) => item.version !== index + 1)
  ) {
    return null;
  }
  return { versions, events };
}

export function normalizeCanonicalVisit(value, { jobId, detail = false } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const expectedJobId = canonicalUuid(jobId);
  const id = canonicalUuid(value.id);
  const normalizedJobId = canonicalUuid(value.jobId);
  const currentVersion = positiveInteger(value.currentVersion);
  const scheduledStartAt = canonicalTimestamp(value.scheduledStartAt);
  const scheduledEndAt = canonicalTimestamp(value.scheduledEndAt, {
    nullable: true,
  });
  const timeZone = canonicalTimeZone(value.timeZone);
  const cancellationReason = boundedText(value.cancellationReason, 2000, {
    nullable: true,
  });
  const cancelledAt = canonicalTimestamp(value.cancelledAt, { nullable: true });
  const startedAt = canonicalTimestamp(value.startedAt, { nullable: true });
  const completedAt = canonicalTimestamp(value.completedAt, { nullable: true });
  const evaluationId = canonicalUuid(value.evaluationId, { nullable: true });
  const createdAt = canonicalTimestamp(value.createdAt);
  const versionCreatedAt = canonicalTimestamp(value.versionCreatedAt);
  const actions = normalizeVisitActions(value.actions);
  const approvedEvidence = value.approvedQuoteDecisionEvidence == null
    ? null
    : {
        decisionId: canonicalUuid(value.approvedQuoteDecisionEvidence?.decisionId),
        decision: value.approvedQuoteDecisionEvidence?.decision,
      };
  const workstreamIds = Array.isArray(value.workstreamIds)
    ? value.workstreamIds.map((item) => canonicalUuid(item))
    : null;
  const history = detail ? normalizeVisitHistory(value.history) : null;
  if (
    !expectedJobId ||
    !id ||
    normalizedJobId !== expectedJobId ||
    !VISIT_PURPOSES.includes(value.purpose) ||
    !VISIT_STATES.includes(value.state) ||
    !currentVersion ||
    !scheduledStartAt ||
    (value.scheduledEndAt != null && !scheduledEndAt) ||
    (scheduledEndAt && Date.parse(scheduledEndAt) <= Date.parse(scheduledStartAt)) ||
    !timeZone ||
    !VISIT_LOCATION_MODES.includes(value.locationMode) ||
    (value.cancellationReason != null && !cancellationReason) ||
    (value.cancelledAt != null && !cancelledAt) ||
    (value.startedAt != null && !startedAt) ||
    (value.completedAt != null && !completedAt) ||
    (value.evaluationId != null && !evaluationId) ||
    !workstreamIds ||
    workstreamIds.some((item) => !item) ||
    new Set(workstreamIds).size !== workstreamIds.length ||
    !canonicalUuid(value.createdByParticipantId) ||
    !canonicalUuid(value.recordedByParticipantId) ||
    !createdAt ||
    !versionCreatedAt ||
    !actions ||
    (value.purpose === "EVALUATION" && approvedEvidence) ||
    (value.purpose === "APPROVED_WORK" &&
      (evaluationId ||
        !approvedEvidence?.decisionId ||
        approvedEvidence.decision !== "APPROVED")) ||
    (detail && !history) ||
    (history && history.versions.at(-1)?.version !== currentVersion)
  ) {
    return null;
  }
  return Object.freeze({
    authoritySource: "CANONICAL_VISIT_READ",
    id,
    jobId: normalizedJobId,
    purpose: value.purpose,
    state: value.state,
    currentVersion,
    scheduledStartAt,
    scheduledEndAt,
    timeZone,
    locationMode: value.locationMode,
    cancellationReason,
    startedAt,
    cancelledAt,
    completedAt,
    evaluationId,
    workstreamIds,
    approvedQuoteDecisionEvidence: approvedEvidence,
    createdAt,
    versionCreatedAt,
    actions,
    history,
  });
}

export function normalizeCanonicalVisitAuthority(
  payload,
  { jobId, purpose, subjectId } = {}
) {
  const value = payload?.authority;
  const expectedJobId = canonicalUuid(jobId);
  const expectedSubjectId = canonicalUuid(subjectId);
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !expectedJobId ||
    !expectedSubjectId ||
    !VISIT_PURPOSES.includes(purpose)
  ) {
    return null;
  }
  const normalizedJobId = canonicalUuid(value.jobId);
  const customerCapabilities = normalizeCapabilities(
    value.customerCapabilities,
    CUSTOMER_CAPABILITIES
  );
  const professionalCapabilities = normalizeCapabilities(
    value.professionalCapabilities,
    PROFESSIONAL_CAPABILITIES
  );
  const activatedAt = canonicalTimestamp(value.activatedAt, { nullable: true });
  const canActivate = value.actions?.canActivate;
  const proposeKey =
    purpose === "EVALUATION"
      ? "canProposeEvaluationVisit"
      : "canProposeApprovedWorkVisit";
  const canPropose = value.actions?.[proposeKey];
  const stateAllowed =
    purpose === "EVALUATION"
      ? ["AVAILABLE", "ACTIVE", "UNAVAILABLE"].includes(value.state)
      : ["AVAILABLE", "ACTIVE", "LOCKED"].includes(value.state);
  const evaluationId = canonicalUuid(value.evaluationId, { nullable: true });
  const quoteId = canonicalUuid(value.quoteId, { nullable: true });
  const approvedQuoteDecisionId = canonicalUuid(
    value.approvedQuoteDecisionId,
    { nullable: true }
  );
  const issuedQuoteVersion =
    value.issuedQuoteVersion == null
      ? null
      : positiveInteger(value.issuedQuoteVersion);
  const deposit = purpose === "APPROVED_WORK"
    ? normalizePreWorkDepositGate(value.deposit)
    : null;
  const hasCompleteCapabilities =
    CUSTOMER_CAPABILITIES.every((capability) =>
      customerCapabilities?.includes(capability)
    ) &&
    PROFESSIONAL_CAPABILITIES
      .filter((capability) => capability !== "visit.start")
      .every((capability) => professionalCapabilities?.includes(capability));
  if (
    value.authoritySource !== AUTHORITY_SOURCES[purpose] ||
    normalizedJobId !== expectedJobId ||
    value.purpose !== purpose ||
    !stateAllowed ||
    !customerCapabilities ||
    !professionalCapabilities ||
    typeof canActivate !== "boolean" ||
    typeof canPropose !== "boolean" ||
    (value.activatedAt != null && !activatedAt) ||
    (value.state === "ACTIVE" && !activatedAt) ||
    (value.state === "ACTIVE" && (!hasCompleteCapabilities || canActivate)) ||
    (value.state !== "ACTIVE" && canPropose) ||
    (purpose === "EVALUATION" &&
      (evaluationId !== expectedSubjectId ||
        quoteId ||
        approvedQuoteDecisionId ||
        issuedQuoteVersion)) ||
    (purpose === "APPROVED_WORK" &&
      (quoteId !== expectedSubjectId ||
        evaluationId ||
        !approvedQuoteDecisionId ||
        !issuedQuoteVersion ||
        !deposit ||
        (value.state === "LOCKED") !== deposit.schedulingLocked))
  ) {
    return null;
  }
  return Object.freeze({
    authoritySource: value.authoritySource,
    jobId: normalizedJobId,
    purpose,
    state: value.state,
    activatedAt,
    evaluationId,
    quoteId,
    approvedQuoteDecisionId,
    issuedQuoteVersion,
    ...(purpose === "APPROVED_WORK" ? { deposit } : {}),
    customerCapabilities,
    professionalCapabilities,
    actions: Object.freeze({
      canActivate: canActivate === true,
      canPropose: canPropose === true,
    }),
  });
}

function invalidResponse(message = "The server returned invalid canonical Visit data.") {
  return new CanonicalVisitError({
    status: 502,
    code: "INVALID_CANONICAL_VISIT_RESPONSE",
    message,
  });
}

async function request({ endpoint, options = {}, setPage, authFetchImpl }) {
  const result = await authFetchImpl(endpoint, options, setPage);
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw new CanonicalVisitError({
      status: result?.response?.status || 500,
      code: result?.data?.code,
      message: result?.data?.message,
    });
  }
  return result.data;
}

function idempotencyKey(command, cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider || typeof cryptoProvider.randomUUID !== "function") {
    throw new CanonicalVisitError({
      status: 500,
      code: "VISIT_IDEMPOTENCY_UNAVAILABLE",
      message: "Visit changes are unavailable on this device.",
    });
  }
  return `visit:${command}:${cryptoProvider.randomUUID()}`;
}

function commandOptions(command, body, cryptoProvider) {
  return {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey(command, cryptoProvider) },
    body: JSON.stringify(body),
  };
}

export async function fetchCanonicalVisitAuthority({
  jobId,
  purpose,
  subjectId,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  if (
    !canonicalUuid(jobId) ||
    !canonicalUuid(subjectId) ||
    !VISIT_PURPOSES.includes(purpose)
  ) {
    throw new CanonicalVisitError({
      status: 400,
      code: "INVALID_VISIT_AUTHORITY_SUBJECT",
      message: "The Visit authority subject is invalid.",
    });
  }
  const endpoint = purpose === "EVALUATION"
    ? `/jobs/${encodeURIComponent(jobId)}/evaluations/${encodeURIComponent(subjectId)}/visit-authority`
    : `/jobs/${encodeURIComponent(jobId)}/quotes/${encodeURIComponent(subjectId)}/approved-work-visit-authority`;
  const data = await request({
    endpoint,
    options: { method: "GET", cache: "no-store" },
    setPage,
    authFetchImpl,
  });
  const authority = normalizeCanonicalVisitAuthority(data, {
    jobId,
    purpose,
    subjectId,
  });
  if (!authority) throw invalidResponse("The server returned invalid Visit authority.");
  return authority;
}

export async function activateCanonicalVisitAuthority({
  jobId,
  purpose,
  subjectId,
  setPage,
  authFetchImpl = authFetch,
  cryptoProvider = globalThis.crypto,
} = {}) {
  if (
    !canonicalUuid(jobId) ||
    !canonicalUuid(subjectId) ||
    !VISIT_PURPOSES.includes(purpose)
  ) {
    throw new CanonicalVisitError({
      status: 400,
      code: "INVALID_VISIT_AUTHORITY_SUBJECT",
      message: "The Visit authority subject is invalid.",
    });
  }
  const endpoint = purpose === "EVALUATION"
    ? `/jobs/${encodeURIComponent(jobId)}/evaluations/${encodeURIComponent(subjectId)}/visit-authority`
    : `/jobs/${encodeURIComponent(jobId)}/quotes/${encodeURIComponent(subjectId)}/approved-work-visit-authority`;
  const data = await request({
    endpoint,
    options: commandOptions("activate-authority", {}, cryptoProvider),
    setPage,
    authFetchImpl,
  });
  const authority = normalizeCanonicalVisitAuthority(data, {
    jobId,
    purpose,
    subjectId,
  });
  if (!authority) throw invalidResponse("The server returned invalid Visit authority.");
  return authority;
}

export async function fetchCanonicalVisits({
  jobId,
  purpose,
  evaluationId = null,
  approvedQuoteDecisionId = null,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  if (
    !canonicalUuid(jobId) ||
    !VISIT_PURPOSES.includes(purpose) ||
    (purpose === "APPROVED_WORK" && !canonicalUuid(approvedQuoteDecisionId))
  ) {
    throw new CanonicalVisitError({
      status: 400,
      code: "INVALID_VISIT_READ_SUBJECT",
      message: "The Visit read subject is invalid.",
    });
  }
  const endpoint = `/jobs/${encodeURIComponent(jobId)}/visits`;
  const data = await request({
    endpoint,
    options: { method: "GET", cache: "no-store" },
    setPage,
    authFetchImpl,
  });
  if (!Array.isArray(data.visits)) throw invalidResponse();
  const visits = data.visits
    .map((visit) => normalizeCanonicalVisit(visit, { jobId }))
    .filter((visit) =>
      purpose === "EVALUATION"
        ? visit?.purpose === purpose &&
          (evaluationId == null || visit.evaluationId === canonicalUuid(evaluationId))
        : visit?.purpose === purpose &&
          visit.approvedQuoteDecisionEvidence?.decisionId === approvedQuoteDecisionId
    );
  if (visits.length !== data.visits.filter((visit) => {
    if (purpose === "EVALUATION") {
      return visit?.purpose === purpose &&
        (evaluationId == null || visit?.evaluationId === canonicalUuid(evaluationId));
    }
    return visit?.purpose === purpose &&
      visit?.approvedQuoteDecisionEvidence?.decisionId === approvedQuoteDecisionId;
  }).length) {
    throw invalidResponse();
  }
  return visits;
}

export async function fetchCanonicalVisitDetail({
  jobId,
  visitId,
  purpose,
  evaluationId = null,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  if (
    !canonicalUuid(jobId) ||
    !canonicalUuid(visitId) ||
    !VISIT_PURPOSES.includes(purpose) ||
    (evaluationId != null && !canonicalUuid(evaluationId))
  ) {
    throw new CanonicalVisitError({
      status: 400,
      code: "INVALID_VISIT_READ_SUBJECT",
      message: "The Visit read subject is invalid.",
    });
  }
  const endpoint = `/jobs/${encodeURIComponent(jobId)}/visits/${encodeURIComponent(visitId)}`;
  const data = await request({
    endpoint,
    options: { method: "GET", cache: "no-store" },
    setPage,
    authFetchImpl,
  });
  const visit = normalizeCanonicalVisit(data.visit, { jobId, detail: true });
  if (
    !visit ||
    visit.id !== canonicalUuid(visitId) ||
    visit.purpose !== purpose ||
    (evaluationId != null && visit.evaluationId !== canonicalUuid(evaluationId))
  ) {
    throw invalidResponse();
  }
  return visit;
}

export async function runCanonicalVisitCommand({
  jobId,
  command,
  visit = null,
  purpose = null,
  evaluationId = null,
  approvedQuoteDecisionId = null,
  schedule = null,
  reason = null,
  acknowledgeScheduleVariance = false,
  setPage,
  authFetchImpl = authFetch,
  cryptoProvider = globalThis.crypto,
} = {}) {
  const normalizedJobId = canonicalUuid(jobId);
  const normalizedVisitId = canonicalUuid(visit?.id);
  const expectedVersion = positiveInteger(visit?.currentVersion);
  const normalizedSchedule = schedule == null ? null : normalizeSchedule(schedule);
  const normalizedReason = boundedText(reason, 2000, { nullable: true });
  let endpoint;
  let body;
  if (command === "propose") {
    endpoint = `/jobs/${encodeURIComponent(normalizedJobId)}/visits`;
    body = {
      purpose,
      scheduledStartAt: normalizedSchedule?.scheduledStartAt,
      scheduledEndAt: normalizedSchedule?.scheduledEndAt,
      timeZone: normalizedSchedule?.timeZone,
      locationMode: normalizedSchedule?.locationMode,
      evaluationId:
        purpose === "EVALUATION" && evaluationId
          ? canonicalUuid(evaluationId)
          : null,
      workstreamIds: [],
      approvedQuoteDecisionId:
        purpose === "APPROVED_WORK"
          ? canonicalUuid(approvedQuoteDecisionId)
          : null,
    };
    if (normalizedReason) body.reason = normalizedReason;
  } else {
    endpoint = `/jobs/${encodeURIComponent(normalizedJobId)}/visits/${encodeURIComponent(normalizedVisitId)}/${command}`;
    body = { expectedVersion };
    if (["reschedule", "change-request"].includes(command)) {
      Object.assign(body, normalizedSchedule, { reason: normalizedReason });
    }
    if (command === "cancel") body.reason = normalizedReason;
    if (command === "start") {
      body.acknowledgeScheduleVariance = acknowledgeScheduleVariance === true;
    }
  }
  const allowed = [
    "propose",
    "confirm",
    "change-request",
    "reschedule",
    "cancel",
    "start",
    "complete",
  ];
  if (
    !normalizedJobId ||
    !allowed.includes(command) ||
    (command !== "propose" && (!normalizedVisitId || !expectedVersion)) ||
    (command === "propose" &&
      (!VISIT_PURPOSES.includes(purpose) ||
        !normalizedSchedule ||
        (purpose === "APPROVED_WORK" &&
          !canonicalUuid(approvedQuoteDecisionId)))) ||
    (["reschedule", "change-request"].includes(command) && !normalizedSchedule) ||
    (reason != null && !normalizedReason) ||
    typeof acknowledgeScheduleVariance !== "boolean"
  ) {
    throw new CanonicalVisitError({
      status: 400,
      code: "INVALID_VISIT_COMMAND",
      message: "The Visit command is invalid.",
    });
  }
  const data = await request({
    endpoint,
    options: commandOptions(command, body, cryptoProvider),
    setPage,
    authFetchImpl,
  });
  const result = normalizeCanonicalVisit(data.visit, { jobId: normalizedJobId });
  if (!result) throw invalidResponse();
  return result;
}

export {
  AUTHORITY_SOURCES as CANONICAL_VISIT_AUTHORITY_SOURCES,
  VISIT_LOCATION_MODES as CANONICAL_VISIT_LOCATION_MODES,
  VISIT_PURPOSES as CANONICAL_VISIT_PURPOSES,
  VISIT_STATES as CANONICAL_VISIT_STATES,
};
