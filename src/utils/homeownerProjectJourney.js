import { t } from "./language.js";

function normalizeStatus(value = "") {
  return String(value || "").toLowerCase().trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasTimelineType(request = {}, matcher) {
  return asArray(request.projectTimeline).some((event) =>
    matcher(normalizeStatus(event?.type || event?.status || event?.label))
  );
}

function hasAnyValue(...values) {
  return values.some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value);
  });
}

function getQuote(request = {}) {
  if (request.acceptedQuote) return request.acceptedQuote;
  if (!Array.isArray(request.quotesReceived)) return {};

  return (
    request.quotesReceived.find((quote) =>
      ["sent", "viewed", "pending", "revision_requested", "accepted", "approved"].includes(
        normalizeStatus(quote?.status || quote?.quoteStatus)
      )
    ) ||
    request.quotesReceived[0] ||
    {}
  );
}

function isEmergencyRequest(request = {}) {
  const text = [
    request.type,
    request.requestType,
    request.workflowType,
    request.category,
    request.service,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return Boolean(request.isEmergency || text.includes("emergency"));
}

export function getHomeownerJourneyStages(request = {}, language = "en") {
  if (isEmergencyRequest(request)) {
    return [
      { key: "request", label: t("journeyEmergency", language) },
      { key: "review", label: t("journeyDispatch", language) },
      { key: "work", label: t("journeyActive", language) },
      { key: "completion", label: t("journeyComplete", language) },
    ];
  }

  const hasAppointment = hasAnyValue(
    request.scheduledAt,
    request.appointmentDate,
    request.evaluationDate,
    request.schedule,
    request.appointment,
    request.linkedAppointment
  ) || hasTimelineType(request, (type) => type.includes("schedule") || type.includes("appointment"));

  return [
    { key: "request", label: t("journeyRequest", language) },
    { key: "review", label: t("journeyReview", language) },
    ...(hasAppointment
      ? [{ key: "appointment", label: t("journeyAppointment", language) }]
      : []),
    { key: "quote", label: t("journeyQuote", language) },
    { key: "work", label: t("journeyWork", language) },
    { key: "completion", label: t("journeyComplete", language) },
  ];
}

export function getHomeownerProjectJourney(request = {}, language = "en") {
  const status = normalizeStatus(request.status);
  const quote = getQuote(request);
  const quoteStatus = normalizeStatus(quote.status || quote.quoteStatus);
  const hasQuote = Boolean(quote.quoteId || quote.id || request.acceptedQuote) || asArray(request.quotesReceived).length > 0;
  const hasAcceptedQuote =
    Boolean(request.acceptedQuote) ||
    ["accepted", "approved"].includes(quoteStatus) ||
    ["accepted", "approved"].includes(status);
  const hasAppointment =
    hasAnyValue(
      request.scheduledAt,
      request.appointmentDate,
      request.evaluationDate,
      request.schedule,
      request.appointment,
      request.linkedAppointment
    ) ||
    hasTimelineType(request, (type) => type.includes("schedule") || type.includes("appointment"));
  const hasCompletion =
    ["completed", "work_completed", "closure_completed"].includes(status) ||
    Boolean(request.completionRecord) ||
    hasTimelineType(request, (type) => type.includes("completion"));
  const isClosed =
    ["closed", "history"].includes(status) ||
    request.closureStatus === "closed" ||
    request.closedAt ||
    request.savedToHistory;
  const workStatus = normalizeStatus(
    request.activeWorkStatus ||
      request.workStatus ||
      request.workflowStage ||
      status
  );

  let currentKey = "review";
  let currentTitle = t("professionalReviewing", language);
  let currentSummary = t("professionalReviewingSummary", language);
  let primaryActionKey = "messageProfessional";
  let primaryActionLabel = t("messageProfessional", language);

  if (status === "cancelled") {
    currentKey = "completion";
    currentTitle = t("requestCancelled", language);
    currentSummary = t("requestCancelledSummary", language);
    primaryActionKey = "openProject";
    primaryActionLabel = t("openProject", language);
  } else if (isClosed) {
    currentKey = "completion";
    currentTitle = t("completed", language);
    currentSummary = t("completedSummary", language);
    primaryActionKey = "leaveReview";
    primaryActionLabel = t("leaveReview", language);
  } else if (hasCompletion) {
    currentKey = "completion";
    currentTitle = t("completionSubmitted", language);
    currentSummary = t("completionSubmittedSummary", language);
    primaryActionKey = "reviewCompletion";
    primaryActionLabel = t("reviewCompletion", language);
  } else if (["active", "in_progress", "working", "started"].includes(workStatus)) {
    currentKey = "work";
    currentTitle = t("workInProgress", language);
    currentSummary = t("workInProgressSummary", language);
    primaryActionKey = "messageProfessional";
    primaryActionLabel = t("continueConversation", language);
  } else if (["work_scheduled", "scheduled_work", "scheduled"].includes(workStatus) && hasAcceptedQuote) {
    currentKey = "work";
    currentTitle = t("workScheduled", language);
    currentSummary = t("workScheduledSummary", language);
    primaryActionKey = "viewSchedule";
    primaryActionLabel = t("viewSchedule", language);
  } else if (hasAcceptedQuote) {
    currentKey = "quote";
    currentTitle = t("decisionRequired", language);
    currentSummary = t("decisionRequiredSummary", language);
    primaryActionKey = "reviewQuote";
    primaryActionLabel = t("reviewQuote", language);
  } else if (hasQuote) {
    currentKey = "quote";
    currentTitle = ["sent", "viewed", "pending", "revision_requested", ""].includes(quoteStatus)
      ? t("quoteReady", language)
      : t("decisionRequired", language);
    currentSummary = t("quoteReadySummary", language);
    primaryActionKey = "reviewQuote";
    primaryActionLabel = t("reviewQuote", language);
  } else if (hasAppointment) {
    currentKey = "appointment";
    currentTitle = t("appointmentScheduled", language);
    currentSummary = t("appointmentScheduledSummary", language);
    primaryActionKey = "viewAppointment";
    primaryActionLabel = t("viewAppointment", language);
  } else if (["new", "requested", "open", "pending"].includes(status)) {
    currentKey = "request";
    currentTitle = t("requestSubmitted", language);
    currentSummary = t("requestSubmittedSummary", language);
    primaryActionKey = "messageProfessional";
    primaryActionLabel = t("messageProfessional", language);
  }

  const stages = getHomeownerJourneyStages(request, language);
  const currentIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.key === currentKey)
  );

  const professionalName =
    quote.businessName ||
    request.selectedProfessional ||
    request.businessName ||
    request.professionalName ||
    request.contractorName ||
    "";

  return {
    currentKey,
    currentIndex,
    currentTitle,
    currentSummary,
    primaryActionKey,
    primaryActionLabel,
    professionalName,
    quote,
    stages: stages.map((stage, index) => ({
      ...stage,
      complete: index < currentIndex,
      current: index === currentIndex,
    })),
  };
}

export function getHomeownerProjectTimelineEvents(request = {}, language = "en") {
  const events = [];
  const push = (key, date, exists = true) => {
    if (!exists) return;
    events.push({
      key,
      label: t(key, language),
      date: date || "",
    });
  };

  push("requestSubmitted", request.createdAt || request.submittedAt || request.date, true);
  push(
    "professionalResponded",
    request.firstResponseAt || request.respondedAt,
    Boolean(
      request.firstResponseAt ||
        request.respondedAt ||
        request.selectedProfessional ||
        request.businessName ||
        request.professionalName ||
        Number(request.messagesCount || 0) > 0
    )
  );
  push(
    "appointmentScheduled",
    request.scheduledAt || request.appointmentDate || request.evaluationDate,
    Boolean(request.scheduledAt || request.appointmentDate || request.evaluationDate || request.schedule || request.appointment)
  );
  push(
    "appointmentCompleted",
    request.appointmentCompletedAt || request.evaluationCompletedAt,
    Boolean(request.appointmentCompletedAt || request.evaluationCompletedAt || hasTimelineType(request, (type) => type.includes("evaluation")))
  );
  push(
    "quoteSent",
    getQuote(request).sentAt || getQuote(request).createdAt || request.quoteSentAt,
    Boolean(getQuote(request).quoteId || getQuote(request).id || asArray(request.quotesReceived).length > 0)
  );
  push(
    "quoteApproved",
    request.quoteApprovedAt || request.acceptedAt || getQuote(request).acceptedAt,
    Boolean(request.acceptedQuote || ["accepted", "approved"].includes(normalizeStatus(getQuote(request).status || getQuote(request).quoteStatus)))
  );
  push(
    "workStarted",
    request.workStartedAt || request.startedAt,
    Boolean(request.workStartedAt || request.startedAt || ["active", "in_progress", "working", "started"].includes(normalizeStatus(request.workStatus || request.status)))
  );
  push(
    "completionSubmitted",
    request.completedAt || request.completionSubmittedAt,
    Boolean(request.completedAt || request.completionSubmittedAt || request.completionRecord)
  );
  push(
    "jobCompleted",
    request.closedAt || request.completedAt,
    Boolean(request.closedAt || request.savedToHistory || ["closed", "completed"].includes(normalizeStatus(request.status)))
  );

  return events;
}
