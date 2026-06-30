const CLOSED_STATUSES = new Set([
  "closed",
  "closure_completed",
  "history",
  "archived",
  "deleted",
  "cancelled",
  "canceled",
]);

const WORK_STATUSES = new Set([
  "accepted",
  "selected",
  "scheduled",
  "work_scheduled",
  "scheduled_work",
  "quote_approved",
  "proposal_approved",
  "payment_pending",
  "deposit_pending",
  "deposit_paid",
  "on_the_way",
  "enroute",
  "arrived",
  "active",
  "in_progress",
  "working",
  "started",
  "work_started",
  "needs_resolution",
]);

const QUOTE_STATUSES = new Set([
  "quoted",
  "quote_sent",
  "proposal_sent",
  "proposal_created",
  "quote_created",
]);

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function normalizeIdentity(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeName(value = "") {
  return normalizeIdentity(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function safeReadJsonObject(storage, key) {
  try {
    const parsed = JSON.parse(storage?.getItem(key) || "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function getRequestStatus(request = {}) {
  return normalizeStatus(
    firstValue(
      request.status,
      request.workflowStatus,
      request.workflowStage,
      request.lifecycleState,
      request.workStatus,
      request.activeWorkStatus
    )
  );
}

export function getRequestProfessionalRelationshipSignals(request = {}) {
  const quote = request.acceptedQuote || request.quote || {};
  const ids = [
    request.professionalId,
    request.businessId,
    request.contractorId,
    request.assignedProfessionalId,
    request.selectedBusinessId,
    request.acceptedByBusinessId,
    request.matchedBusinessId,
    request.providerId,
    request.acceptedProfessionalId,
    request.selectedProfessionalId,
    request.acceptedByProfessionalId,
    quote.professionalId,
    quote.businessId,
    quote.contractorId,
    quote.providerId,
  ]
    .map(normalizeIdentity)
    .filter(Boolean);
  const names = [
    request.selectedProfessional,
    request.assignedProfessional,
    request.assignedProfessionalName,
    request.targetProfessionalName,
    request.businessName,
    request.professionalName,
    request.providerName,
    quote.businessName,
    quote.professionalName,
  ]
    .map(normalizeName)
    .filter(Boolean);

  return {
    ids: [...new Set(ids)],
    names: [...new Set(names)],
    connected: ids.length > 0 || names.length > 0,
  };
}

export function getProfessionalRelationshipSignals(professional = {}, storage = getStorage()) {
  const profile = safeReadJsonObject(storage, "contractorProfile");
  const ids = [
    professional.id,
    professional.professionalId,
    professional.businessId,
    professional.contractorId,
    professional.providerId,
    professional.selectedProfessionalId,
    professional.profileId,
    profile.id,
    profile.professionalId,
    profile.businessId,
    profile.contractorId,
    storage?.getItem?.("businessId"),
    storage?.getItem?.("professionalId"),
    storage?.getItem?.("contractorId"),
    storage?.getItem?.("selectedProfessionalId"),
  ]
    .map(normalizeIdentity)
    .filter(Boolean);
  const names = [
    professional.businessName,
    professional.name,
    professional.business_name,
    professional.professionalName,
    profile.businessName,
    profile.business_name,
    profile.name,
    storage?.getItem?.("businessName"),
    storage?.getItem?.("companyName"),
    storage?.getItem?.("selectedProfessionalName"),
  ]
    .map(normalizeName)
    .filter(Boolean);

  return {
    ids: [...new Set(ids)],
    names: [...new Set(names)],
  };
}

export function isRequestConnectedToProfessional(
  request = {},
  professional = {},
  options = {}
) {
  const requestSignals = getRequestProfessionalRelationshipSignals(request);
  if (!requestSignals.connected) return false;

  const professionalSignals =
    options.professionalSignals ||
    getProfessionalRelationshipSignals(professional, options.storage);
  const professionalIds = new Set(professionalSignals.ids || []);
  const professionalNames = new Set(professionalSignals.names || []);

  return Boolean(
    requestSignals.ids.some((id) => professionalIds.has(id)) ||
      requestSignals.names.some((name) => professionalNames.has(name))
  );
}

export function isRequestClosedForProfessionalProjection(request = {}) {
  const status = getRequestStatus(request);
  const closureStatus = normalizeStatus(request.closureStatus);

  return Boolean(
    CLOSED_STATUSES.has(status) ||
      CLOSED_STATUSES.has(closureStatus) ||
      request.closedAt ||
      request.archivedAt ||
      request.deletedAt ||
      request.archived === true ||
      request.deleted === true ||
      request.isArchived === true ||
      request.isDeleted === true ||
      request.savedToHistory
  );
}

export function getRequestScheduleDate(request = {}) {
  const schedule = request.schedule || request.appointment || request.linkedAppointment || {};

  return firstValue(
    request.scheduledAt,
    request.appointmentDate,
    request.evaluationDate,
    request.visitDate,
    request.startDate,
    schedule.date,
    schedule.scheduledAt,
    schedule.appointmentDate,
    schedule.visitDate
  );
}

export function hasRequestSchedule(request = {}) {
  const status = getRequestStatus(request);

  return Boolean(
    !isRequestClosedForProfessionalProjection(request) &&
      (status === "scheduled" ||
        status === "work_scheduled" ||
        status === "scheduled_work" ||
        getRequestScheduleDate(request))
  );
}

export function isRequestProfessionalWork(request = {}) {
  if (!request || isRequestClosedForProfessionalProjection(request)) return false;

  const status = getRequestStatus(request);
  const quoteStatus = normalizeStatus(
    request.quoteStatus ||
      request.proposalStatus ||
      request.acceptedQuote?.status ||
      request.acceptedQuote?.quoteStatus
  );

  return Boolean(
      WORK_STATUSES.has(status) ||
      WORK_STATUSES.has(quoteStatus) ||
      getRequestProfessionalRelationshipSignals(request).connected ||
      request.acceptedQuote ||
      request.selectedProfessional ||
      request.acceptedByProfessionalId ||
      request.acceptedAt ||
      request.depositPaid ||
      request.depositRecorded ||
      request.paymentReceivedAt ||
      request.workStartedAt ||
      request.arrivedAt ||
      request.onTheWayAt ||
      hasRequestSchedule(request)
  );
}

export function hasRequestQuoteProjection(request = {}) {
  if (!request || isRequestClosedForProfessionalProjection(request)) return false;

  const status = getRequestStatus(request);
  const quoteStatus = normalizeStatus(request.quoteStatus || request.proposalStatus);

  return Boolean(
    QUOTE_STATUSES.has(status) ||
      QUOTE_STATUSES.has(quoteStatus) ||
      request.acceptedQuote ||
      (Array.isArray(request.quotesReceived) && request.quotesReceived.length > 0)
  );
}

export function createScheduleProjectionFromRequest(request = {}) {
  const schedule = request.schedule || request.appointment || request.linkedAppointment || {};
  const scheduleDate = getRequestScheduleDate(request);
  const requestId = firstValue(request.requestId, request.id);

  return {
    ...schedule,
    id: firstValue(schedule.id, schedule.scheduleId, request.scheduleId, requestId),
    scheduleId: firstValue(schedule.scheduleId, schedule.id, request.scheduleId, requestId),
    requestId,
    projectId: firstValue(request.projectId, requestId),
    conversationId: firstValue(request.conversationId, schedule.conversationId),
    title: firstValue(request.title, request.projectTitle, request.service, request.category),
    customer: firstValue(request.customerName, request.homeownerName, request.name, schedule.customer),
    location: firstValue(
      request.location,
      request.fullAddress,
      request.address,
      schedule.location,
      schedule.address
    ),
    date: firstValue(schedule.date, scheduleDate),
    time: firstValue(schedule.time, request.appointmentTime, request.visitTime),
    status: firstValue(request.status, request.workflowStatus, schedule.status, "scheduled"),
    source: "homeownerRequests",
  };
}

export function createQuoteProjectionFromRequest(request = {}) {
  const quote =
    request.acceptedQuote ||
    (Array.isArray(request.quotesReceived) ? request.quotesReceived[0] : null) ||
    {};
  const requestId = firstValue(request.requestId, request.id);

  return {
    ...quote,
    id: firstValue(quote.id, quote.quoteId, request.quoteId, requestId),
    quoteId: firstValue(quote.quoteId, quote.id, request.quoteId, requestId),
    requestId,
    projectId: firstValue(request.projectId, requestId),
    conversationId: firstValue(request.conversationId, quote.conversationId),
    title: firstValue(request.title, request.projectTitle, quote.title),
    projectTitle: firstValue(request.title, request.projectTitle, quote.projectTitle),
    amount: firstValue(quote.amount, request.quoteAmount, request.budget),
    status: firstValue(quote.status, quote.quoteStatus, request.quoteStatus, request.status, "quoted"),
    source: "homeownerRequests",
  };
}
