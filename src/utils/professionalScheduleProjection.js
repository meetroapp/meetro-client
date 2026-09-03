import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIEWS = Object.freeze(["active", "history"]);
const PURPOSES = Object.freeze(["EVALUATION", "APPROVED_WORK"]);
const APPROVAL_SOURCES = Object.freeze([
  "MEETRO_CUSTOMER",
  "EXTERNAL_EVIDENCE",
]);
const EXTERNAL_CONFIRMATION_METHODS = Object.freeze([
  "PHONE",
  "EMAIL",
  "TEXT_MESSAGE",
  "IN_PERSON",
  "OTHER",
]);
const VISIT_STATES = Object.freeze([
  "PROPOSED",
  "SCHEDULED",
  "STARTED",
  "CANCELLED",
  "COMPLETED",
]);
const SEMANTIC_STATES = Object.freeze([
  "READY_TO_SCHEDULE",
  "WAITING_FOR_CUSTOMER",
  "CHANGE_REQUESTED",
  "SCHEDULED",
  "STARTED",
  "CANCELLED",
  "COMPLETED",
]);
const LOCATION_MODES = Object.freeze(["JOB_SERVICE_LOCATION", "REMOTE"]);

export class ProfessionalScheduleError extends Error {
  constructor({
    status = 500,
    code = "PROFESSIONAL_SCHEDULE_FAILED",
    message = "Schedule is temporarily unavailable.",
  } = {}) {
    super(message);
    this.name = "ProfessionalScheduleError";
    this.status = status;
    this.code = code;
  }
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function uuid(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function text(value, maximum, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= maximum ? normalized : null;
}

function timestamp(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function integer(value, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function normalizeJob(value, jobId) {
  const source = record(value);
  const id = uuid(source?.id);
  const title = text(source?.title, 500);
  const category = text(source?.category, 200, { nullable: true });
  if (!source || id !== jobId || !title || (source.category != null && !category)) return null;
  return Object.freeze({ id, title, category });
}

function normalizeCustomer(value) {
  const source = record(value);
  const displayName = text(source?.displayName, 200);
  return source && displayName ? Object.freeze({ displayName }) : null;
}

function normalizeAddress(value) {
  if (value == null) return null;
  const source = record(value);
  if (!source) return null;
  const line1 = text(source.line1, 500, { nullable: true });
  const city = text(source.city, 120, { nullable: true });
  const region = text(source.region, 120, { nullable: true });
  const postalCode = text(source.postalCode, 40, { nullable: true });
  const countryCode = text(source.countryCode, 2, { nullable: true });
  if (
    (source.line1 != null && !line1) ||
    (source.city != null && !city) ||
    (source.region != null && !region) ||
    (source.postalCode != null && !postalCode) ||
    (source.countryCode != null && !countryCode)
  ) return null;
  return Object.freeze({ line1, city, region, postalCode, countryCode });
}

function normalizeLocation(value, expectedMode = null) {
  const source = record(value);
  if (!source || !LOCATION_MODES.includes(source.mode)) return null;
  if (expectedMode && source.mode !== expectedMode) return null;
  const serviceArea = text(source.serviceArea, 250, { nullable: true });
  const address = normalizeAddress(source.address);
  if (
    (source.serviceArea != null && !serviceArea) ||
    (source.address != null && !address) ||
    (source.mode === "REMOTE" && (serviceArea || address))
  ) return null;
  return Object.freeze({ mode: source.mode, serviceArea, address });
}

function normalizeOpportunity(value) {
  const source = record(value);
  const jobId = uuid(source?.jobId);
  const evaluationId = uuid(source?.evaluationId, { nullable: true });
  const quoteId = uuid(source?.quoteId, { nullable: true });
  const decisionId = uuid(source?.approvedQuoteDecisionId, { nullable: true });
  const hasQuoteApprovalId = Object.hasOwn(source || {}, "quoteApprovalId");
  const hasApprovalSource = Object.hasOwn(source || {}, "approvalSource");
  const quoteApprovalId = hasQuoteApprovalId
    ? uuid(source?.quoteApprovalId, { nullable: true })
    : null;
  const approvalSource = hasApprovalSource
    ? source?.approvalSource == null
      ? null
      : APPROVAL_SOURCES.includes(source.approvalSource)
        ? source.approvalSource
        : undefined
    : null;
  const authority = record(source?.authority);
  const job = normalizeJob(source?.job, jobId);
  const customer = normalizeCustomer(source?.customer);
  const location = normalizeLocation(source?.location, "JOB_SERVICE_LOCATION");
  const actions = record(source?.actions);
  if (
    !source ||
    source.semanticState !== "READY_TO_SCHEDULE" ||
    !jobId ||
    !PURPOSES.includes(source.purpose) ||
    !["AVAILABLE", "ACTIVE"].includes(authority?.state) ||
    !job ||
    !customer ||
    !location ||
    actions?.canStartScheduling !== true ||
    typeof actions?.canViewJob !== "boolean" ||
    approvalSource === undefined ||
    (source.purpose === "EVALUATION" &&
      (
        quoteId ||
        decisionId ||
        quoteApprovalId ||
        approvalSource
      )) ||
    (source.purpose === "APPROVED_WORK" &&
      (
        evaluationId ||
        !quoteId ||
        (
          approvalSource === "EXTERNAL_EVIDENCE"
            ? (!quoteApprovalId || decisionId)
            : approvalSource === "MEETRO_CUSTOMER"
              ? (!quoteApprovalId || !decisionId)
              : (quoteApprovalId || !decisionId)
        )
      ))
  ) return null;
  return Object.freeze({
    kind: "opportunity",
    semanticState: source.semanticState,
    jobId,
    purpose: source.purpose,
    evaluationId,
    quoteId,
    approvedQuoteDecisionId: decisionId,
    ...(hasQuoteApprovalId ? { quoteApprovalId } : {}),
    ...(hasApprovalSource ? { approvalSource } : {}),
    authority: Object.freeze({ state: authority.state }),
    job,
    customer,
    location,
    actions: Object.freeze({
      canStartScheduling: true,
      canViewJob: actions.canViewJob === true,
    }),
  });
}

function normalizeChangeRequest(value) {
  if (value == null) return null;
  const source = record(value);
  const visitVersion = integer(source?.visitVersion, { minimum: 1 });
  const reason = text(source?.reason, 2000);
  const createdAt = timestamp(source?.createdAt);
  return source && visitVersion && reason && createdAt
    ? Object.freeze({ visitVersion, reason, createdAt })
    : null;
}

function normalizeExternalScheduleConfirmation(value) {
  if (value == null) return null;

  const source = record(value);
  const id = uuid(source?.id);
  const method = EXTERNAL_CONFIRMATION_METHODS.includes(source?.method)
    ? source.method
    : null;
  const confirmedAt = timestamp(source?.confirmedAt);
  const proposedVisitVersion = integer(source?.proposedVisitVersion, {
    minimum: 1,
  });
  const scheduledVisitVersion = integer(source?.scheduledVisitVersion, {
    minimum: 1,
  });
  const proposedIntegrityHash =
    typeof source?.proposedIntegrityHash === "string" &&
    /^[0-9a-f]{64}$/.test(source.proposedIntegrityHash)
      ? source.proposedIntegrityHash
      : null;
  const recordedByParticipantId = uuid(source?.recordedByParticipantId);
  const recordedAt = timestamp(source?.recordedAt);

  if (
    !source ||
    source.source !== "BUSINESS_RECORDED_EXTERNAL_EVIDENCE" ||
    !id ||
    !method ||
    !confirmedAt ||
    !proposedVisitVersion ||
    !scheduledVisitVersion ||
    scheduledVisitVersion !== proposedVisitVersion + 1 ||
    !proposedIntegrityHash ||
    !recordedByParticipantId ||
    !recordedAt
  ) {
    return null;
  }

  return Object.freeze({
    id,
    source: source.source,
    method,
    confirmedAt,
    proposedVisitVersion,
    scheduledVisitVersion,
    proposedIntegrityHash,
    recordedByParticipantId,
    recordedAt,
  });
}

function normalizeVisit(value) {
  const source = record(value);
  const id = uuid(source?.id);
  const jobId = uuid(source?.jobId);
  const currentVersion = integer(source?.currentVersion, { minimum: 1 });
  const scheduledStartAt = timestamp(source?.scheduledStartAt);
  const scheduledEndAt = timestamp(source?.scheduledEndAt, { nullable: true });
  const timeZone = text(source?.timeZone, 100);
  const evaluationId = uuid(source?.evaluationId, { nullable: true });
  const hasQuoteApprovalId = Object.hasOwn(source || {}, "quoteApprovalId");
  const hasApprovalSource = Object.hasOwn(source || {}, "approvalSource");
  const hasExternalScheduleConfirmation = Object.hasOwn(
    source || {},
    "externalScheduleConfirmation"
  );
  const quoteApprovalId = hasQuoteApprovalId
    ? uuid(source?.quoteApprovalId, { nullable: true })
    : null;
  const approvalSource = hasApprovalSource
    ? source?.approvalSource == null
      ? null
      : APPROVAL_SOURCES.includes(source.approvalSource)
        ? source.approvalSource
        : undefined
    : null;
  const externalScheduleConfirmation = hasExternalScheduleConfirmation
    ? normalizeExternalScheduleConfirmation(
        source.externalScheduleConfirmation
      )
    : null;
  const approvedEvidence = record(source?.approvedQuoteDecisionEvidence);
  const approvedDecisionId = uuid(approvedEvidence?.decisionId, { nullable: true });
  const latestCustomerChangeRequest = normalizeChangeRequest(source?.latestCustomerChangeRequest);
  const job = normalizeJob(source?.job, jobId);
  const customer = normalizeCustomer(source?.customer);
  const location = normalizeLocation(source?.location, source?.locationMode);
  const actions = record(source?.actions);
  const cancellationReason = text(source?.cancellationReason, 2000, { nullable: true });
  const cancelledAt = timestamp(source?.cancelledAt, { nullable: true });
  const startedAt = timestamp(source?.startedAt, { nullable: true });
  const completedAt = timestamp(source?.completedAt, { nullable: true });
  const createdAt = timestamp(source?.createdAt);
  const versionCreatedAt = timestamp(source?.versionCreatedAt);
  if (
    !source ||
    !id ||
    !jobId ||
    !PURPOSES.includes(source.purpose) ||
    !VISIT_STATES.includes(source.state) ||
    !SEMANTIC_STATES.includes(source.semanticState) ||
    !currentVersion ||
    !scheduledStartAt ||
    (source.scheduledEndAt != null && !scheduledEndAt) ||
    (scheduledEndAt && Date.parse(scheduledEndAt) <= Date.parse(scheduledStartAt)) ||
    !timeZone ||
    !LOCATION_MODES.includes(source.locationMode) ||
    !location ||
    !job ||
    !customer ||
    !createdAt ||
    !versionCreatedAt ||
    !actions ||
    ["canConfirm", "canReschedule", "canCancel", "canComplete", "canViewJob"].some(
      (key) => typeof actions[key] !== "boolean"
    ) ||
    (
      Object.hasOwn(actions, "canRecordExternalConfirmation") &&
      typeof actions.canRecordExternalConfirmation !== "boolean"
    ) ||
    (source.cancellationReason != null && !cancellationReason) ||
    (source.cancelledAt != null && !cancelledAt) ||
    (source.startedAt != null && !startedAt) ||
    (source.completedAt != null && !completedAt) ||
    (source.latestCustomerChangeRequest != null && !latestCustomerChangeRequest) ||
    approvalSource === undefined ||
    (
      hasExternalScheduleConfirmation &&
      source.externalScheduleConfirmation != null &&
      !externalScheduleConfirmation
    ) ||
    (source.purpose === "EVALUATION" &&
      (
        approvedEvidence ||
        quoteApprovalId ||
        approvalSource ||
        externalScheduleConfirmation
      )) ||
    (source.purpose === "APPROVED_WORK" &&
      (
        evaluationId ||
        (
          approvalSource === "EXTERNAL_EVIDENCE"
            ? (!quoteApprovalId || approvedDecisionId)
            : approvalSource === "MEETRO_CUSTOMER"
              ? (
                  !quoteApprovalId ||
                  !approvedDecisionId ||
                  approvedEvidence?.decision !== "APPROVED"
                )
              : (
                  quoteApprovalId ||
                  !approvedDecisionId ||
                  approvedEvidence?.decision !== "APPROVED"
                )
        ) ||
        (
          externalScheduleConfirmation &&
          approvalSource !== "EXTERNAL_EVIDENCE"
        )
      )) ||
    (source.semanticState === "WAITING_FOR_CUSTOMER" && source.state !== "PROPOSED") ||
    (source.semanticState === "CHANGE_REQUESTED" && source.state !== "PROPOSED") ||
    (["SCHEDULED", "STARTED", "CANCELLED", "COMPLETED"].includes(source.semanticState) &&
      source.semanticState !== source.state)
  ) return null;
  return Object.freeze({
    kind: "visit",
    id,
    jobId,
    purpose: source.purpose,
    state: source.state,
    semanticState: source.semanticState,
    currentVersion,
    scheduledStartAt,
    scheduledEndAt,
    timeZone,
    locationMode: source.locationMode,
    location,
    cancellationReason,
    cancelledAt,
    startedAt,
    completedAt,
    evaluationId,
    ...(hasQuoteApprovalId ? { quoteApprovalId } : {}),
    ...(hasApprovalSource ? { approvalSource } : {}),
    ...(hasExternalScheduleConfirmation
      ? { externalScheduleConfirmation }
      : {}),
    approvedQuoteDecisionEvidence: approvedDecisionId
      ? Object.freeze({ decisionId: approvedDecisionId, decision: "APPROVED" })
      : null,
    latestCustomerChangeRequest,
    job,
    customer,
    createdAt,
    versionCreatedAt,
    actions: Object.freeze({
      canConfirm: actions.canConfirm === true,
      ...(Object.hasOwn(actions, "canRecordExternalConfirmation")
        ? {
            canRecordExternalConfirmation:
              actions.canRecordExternalConfirmation === true,
          }
        : {}),
      canReschedule: actions.canReschedule === true,
      canCancel: actions.canCancel === true,
      canStart: actions.canStart === true,
      canComplete: actions.canComplete === true,
      canViewJob: actions.canViewJob === true,
    }),
  });
}

function normalizeSummary(value) {
  const source = record(value);
  if (!source) return null;
  const summary = {
    readyToSchedule: integer(source.readyToSchedule),
    waitingOnCustomer: integer(source.waitingOnCustomer),
    changeRequested: integer(source.changeRequested),
    inProgress: source.inProgress == null ? 0 : integer(source.inProgress),
    upcoming: integer(source.upcoming),
  };
  return Object.values(summary).some((count) => count == null)
    ? null
    : Object.freeze(summary);
}

function normalizePage(value, requestedLimit) {
  const source = record(value);
  const limit = integer(source?.limit, { minimum: 1, maximum: 100 });
  const nextCursor = text(source?.nextCursor, 1000, { nullable: true });
  if (
    !source ||
    !limit ||
    limit !== requestedLimit ||
    typeof source.hasMore !== "boolean" ||
    (source.nextCursor != null && !nextCursor) ||
    (source.hasMore && !nextCursor) ||
    (!source.hasMore && nextCursor)
  ) return null;
  return Object.freeze({ limit, hasMore: source.hasMore, nextCursor });
}

export function normalizeProfessionalSchedule(payload, { view = "active", limit = 50 } = {}) {
  const schedule = record(payload?.schedule);
  if (
    payload?.success !== true ||
    payload?.code !== "PROFESSIONAL_SCHEDULE_LOADED" ||
    !schedule ||
    schedule.view !== view ||
    !Array.isArray(schedule.opportunities) ||
    !Array.isArray(schedule.visits)
  ) return null;
  const summary = normalizeSummary(schedule.summary);
  const opportunities = schedule.opportunities.map(normalizeOpportunity);
  const visits = schedule.visits.map(normalizeVisit);
  const page = normalizePage(schedule.page, limit);
  if (!summary || !page || opportunities.some((item) => !item) || visits.some((item) => !item)) {
    return null;
  }
  if (view === "history" && opportunities.length > 0) return null;
  if (view === "active" && visits.some((item) => !["PROPOSED", "SCHEDULED", "STARTED"].includes(item.state))) {
    return null;
  }
  if (view === "history" && visits.some((item) => !["CANCELLED", "COMPLETED"].includes(item.state))) {
    return null;
  }
  return Object.freeze({
    source: "PROFESSIONAL_SCHEDULE",
    view,
    summary,
    opportunities: Object.freeze(opportunities),
    visits: Object.freeze(visits),
    page,
  });
}

export async function fetchProfessionalSchedule({
  view = "active",
  limit = 50,
  cursor = null,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  if (!VIEWS.includes(view) || integer(limit, { minimum: 1, maximum: 100 }) == null) {
    throw new ProfessionalScheduleError({
      status: 400,
      code: "INVALID_SCHEDULE_READ",
      message: "The Schedule request is invalid.",
    });
  }
  const normalizedCursor = text(cursor, 1000, { nullable: true });
  if (cursor != null && !normalizedCursor) {
    throw new ProfessionalScheduleError({
      status: 400,
      code: "INVALID_SCHEDULE_CURSOR",
      message: "The Schedule page is invalid.",
    });
  }
  const query = new URLSearchParams({ view, limit: String(limit) });
  if (normalizedCursor) query.set("cursor", normalizedCursor);
  const result = await authFetchImpl(
    `/professional/schedule?${query.toString()}`,
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw new ProfessionalScheduleError({
      status: result?.response?.status || 500,
      code: result?.data?.code,
      message: result?.data?.message,
    });
  }
  const schedule = normalizeProfessionalSchedule(result.data, { view, limit });
  if (!schedule) {
    throw new ProfessionalScheduleError({
      status: 502,
      code: "INVALID_PROFESSIONAL_SCHEDULE_RESPONSE",
      message: "Schedule information could not be verified.",
    });
  }
  return schedule;
}

export function createProfessionalScheduleSourceState() {
  return Object.freeze({
    status: "idle",
    confirmed: null,
    error: "",
    refreshing: false,
  });
}

export function reduceProfessionalScheduleSourceState(state, action) {
  const current = state || createProfessionalScheduleSourceState();
  if (action?.type === "load") {
    return Object.freeze({
      ...current,
      status: current.confirmed ? "confirmed" : "loading",
      error: "",
      refreshing: Boolean(current.confirmed),
    });
  }
  if (action?.type === "success" && action.schedule?.source === "PROFESSIONAL_SCHEDULE") {
    return Object.freeze({
      status: "confirmed",
      confirmed: action.schedule,
      error: "",
      refreshing: false,
    });
  }
  if (action?.type === "failure") {
    return Object.freeze({
      status: current.confirmed ? "confirmed" : "error",
      confirmed: current.confirmed,
      error: text(action.message, 1000) || "Schedule is temporarily unavailable.",
      refreshing: false,
    });
  }
  return current;
}

function zonedDateKey(value, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(value));
    const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${fields.year}-${fields.month}-${fields.day}`;
  } catch {
    return null;
  }
}

export function groupProfessionalSchedule(schedule, { now = new Date() } = {}) {
  if (schedule?.source !== "PROFESSIONAL_SCHEDULE") return null;
  const scheduled = schedule.visits.filter(
    (item) => item.semanticState === "SCHEDULED"
  );
  const today = [];
  const upcoming = [];
  for (const item of scheduled) {
    const visitDay = zonedDateKey(item.scheduledStartAt, item.timeZone);
    const todayDay = zonedDateKey(now, item.timeZone);
    if (visitDay && visitDay === todayDay) today.push(item);
    else if (Date.parse(item.scheduledStartAt) > now.getTime()) upcoming.push(item);
  }
  return Object.freeze({
    needsScheduling: schedule.opportunities,
    changeRequested: Object.freeze(
      schedule.visits.filter((item) => item.semanticState === "CHANGE_REQUESTED")
    ),
    waitingOnCustomer: Object.freeze(
      schedule.visits.filter((item) => item.semanticState === "WAITING_FOR_CUSTOMER")
    ),
    inProgress: Object.freeze(
      schedule.visits.filter((item) => item.semanticState === "STARTED")
    ),
    today: Object.freeze(today),
    upcoming: Object.freeze(upcoming),
  });
}

export function getProfessionalScheduleCounts(schedule, options) {
  const groups = groupProfessionalSchedule(schedule, options);
  if (!groups) return null;
  return Object.freeze({
    needsScheduling: groups.needsScheduling.length,
    waiting: groups.waitingOnCustomer.length,
    changeRequested: groups.changeRequested.length,
    inProgress: groups.inProgress.length,
    today: groups.today.length,
    upcoming: groups.upcoming.length,
  });
}

function zonedParts(instant, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function wallTimeToInstant({ date, time, timeZone } = {}) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) ||
    !/^\d{2}:\d{2}$/.test(String(time || "")) ||
    !text(timeZone, 100)
  ) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    if (hour > 23 || minute > 59) return null;
    const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
    let candidate = desired;
    for (let index = 0; index < 3; index += 1) {
      const parts = zonedParts(new Date(candidate), timeZone);
      const observed = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second)
      );
      candidate += desired - observed;
    }
    const verification = zonedParts(new Date(candidate), timeZone);
    if (
      Number(verification.year) !== year ||
      Number(verification.month) !== month ||
      Number(verification.day) !== day ||
      Number(verification.hour) !== hour ||
      Number(verification.minute) !== minute
    ) return null;
    return new Date(candidate).toISOString();
  } catch {
    return null;
  }
}

export function buildProfessionalScheduleCommandSchedule({
  purpose,
  date,
  startTime,
  endTime = "",
  timeZone,
  locationMode,
} = {}) {
  if (!PURPOSES.includes(purpose) || !LOCATION_MODES.includes(locationMode)) {
    return null;
  }
  const scheduledStartAt = wallTimeToInstant({
    date,
    time: startTime,
    timeZone,
  });
  const hasOptionalEnd = Boolean(String(endTime || "").trim());
  const scheduledEndAt = hasOptionalEnd
    ? wallTimeToInstant({ date, time: endTime, timeZone })
    : null;
  if (
    !scheduledStartAt ||
    (hasOptionalEnd &&
      (!scheduledEndAt ||
        Date.parse(scheduledEndAt) <= Date.parse(scheduledStartAt)))
  ) {
    return null;
  }
  return Object.freeze({
    scheduledStartAt,
    scheduledEndAt,
    timeZone: validScheduleTimeZone(timeZone),
    locationMode,
  });
}

function validScheduleTimeZone(value) {
  const normalized = text(value, 100);
  if (!normalized) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format();
    return normalized;
  } catch {
    return null;
  }
}

export function resolveProfessionalScheduleTimeZone({
  visitTimeZone = null,
  jobTimeZone = null,
  businessTimeZone = null,
  deviceTimeZone = null,
} = {}) {
  for (const candidate of [
    visitTimeZone,
    jobTimeZone,
    businessTimeZone,
    deviceTimeZone,
    "UTC",
  ]) {
    const resolved = validScheduleTimeZone(candidate);
    if (resolved) return resolved;
  }
  return "UTC";
}

export function formatProfessionalScheduleTimeZone(
  timeZone,
  language = "en"
) {
  const canonical = validScheduleTimeZone(timeZone);
  if (!canonical) return "";
  try {
    const parts = new Intl.DateTimeFormat(language, {
      timeZone: canonical,
      timeZoneName: "longGeneric",
    }).formatToParts(new Date("2026-01-15T12:00:00.000Z"));
    return parts.find((part) => part.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}

export const PROFESSIONAL_SCHEDULE_SEMANTIC_STATES = SEMANTIC_STATES;
