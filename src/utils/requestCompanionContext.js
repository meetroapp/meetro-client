export const REQUEST_COMPANION_CONTEXT_KEY = "meetroRequestCompanionContext";

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function firstText(...values) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function compactRecord(record = {}) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== "";
    })
  );
}

function getQuoteStatus(record = {}) {
  const quote =
    record.acceptedQuote ||
    (Array.isArray(record.quotesReceived) ? record.quotesReceived[0] : null) ||
    record.quote ||
    {};

  return firstText(
    quote.status,
    quote.quoteStatus,
    record.quoteStatus,
    record.proposalStatus
  );
}

function getScheduleStatus(record = {}) {
  const appointment =
    record.appointment ||
    record.schedule ||
    record.scheduledVisit ||
    record.visit ||
    {};

  return firstText(
    appointment.customerConfirmationStatus,
    appointment.confirmationStatus,
    appointment.workflowStatus,
    appointment.status,
    record.scheduleStatus,
    record.appointmentStatus
  );
}

export function buildRequestCompanionContext({
  request = null,
  rolePerspective = "",
  nextStep = "",
  pageContext = "request_detail",
} = {}) {
  if (!isRecord(request)) return null;

  const requestId = firstText(request.requestId, request.id, request.quoteRequestId);
  const projectId = firstText(request.projectId, request.jobId, request.id, request.requestId);
  const conversationId = firstText(
    request.conversationId,
    request.activeConversationId,
    request.projectConversationId,
    request.threadId
  );

  if (!requestId && !projectId && !conversationId) return null;

  return compactRecord({
    pageContext,
    requestId,
    projectId,
    conversationId,
    status: firstText(request.status, request.workflowStatus, request.stage),
    nextStep,
    serviceType: firstText(
      request.serviceType,
      request.service,
      request.category,
      request.projectCategory
    ),
    title: firstText(request.title, request.projectTitle, request.service, request.category),
    rolePerspective,
    quoteStatus: getQuoteStatus(request),
    scheduleStatus: getScheduleStatus(request),
  });
}

export function writeRequestCompanionContext(context, storage = globalThis.localStorage) {
  if (!storage || typeof storage.setItem !== "function") return null;
  if (!isRecord(context)) return null;
  if (context.pageContext !== "request_detail") return null;

  try {
    storage.setItem(REQUEST_COMPANION_CONTEXT_KEY, JSON.stringify(context));
    return context;
  } catch {
    return null;
  }
}

export function clearRequestCompanionContext(storage = globalThis.localStorage) {
  if (!storage || typeof storage.removeItem !== "function") return;

  try {
    storage.removeItem(REQUEST_COMPANION_CONTEXT_KEY);
  } catch {}
}

export function readRequestCompanionContext(storage = globalThis.localStorage) {
  if (!storage || typeof storage.getItem !== "function") return null;

  try {
    const parsed = JSON.parse(storage.getItem(REQUEST_COMPANION_CONTEXT_KEY) || "null");
    return isRecord(parsed) && parsed.pageContext === "request_detail" ? parsed : null;
  } catch {
    return null;
  }
}
