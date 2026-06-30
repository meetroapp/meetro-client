function firstValue(...values) {
  return values.find((value) => String(value || "").trim()) || "";
}

function safeJsonFromStorage(storage, key, fallback) {
  try {
    const value = JSON.parse(storage.getItem(key) || "");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function readArray(storage, keys = []) {
  return keys.flatMap((key) => {
    const value = safeJsonFromStorage(storage, key, []);
    if (Array.isArray(value)) return value;
    return value && typeof value === "object" ? [value] : [];
  });
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeStatus(value) {
  return normalizeText(value).toLowerCase().replace(/[_-]+/g, " ");
}

function normalizeIdentity(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function minutesUntil(start, now) {
  return Math.round((start.getTime() - now.getTime()) / 60000);
}

function getProjectId(record = {}) {
  return firstValue(record.projectId, record.requestId, record.jobId, record.id);
}

function getConversationId(record = {}) {
  return firstValue(
    record.conversationId,
    record.activeConversationId,
    record.projectConversationId,
    record.threadId
  );
}

function getScheduleStart(record = {}) {
  return firstValue(
    record.scheduledStartAt,
    record.startAt,
    record.startsAt,
    record.startTime,
    record.scheduledAt,
    record.visitAt,
    record.appointmentAt,
    record.dateTime
  );
}

function isCompletedOrCancelled(record = {}) {
  return /completed|complete|cancelled|canceled|closed/i.test(normalizeStatus(record.status));
}

function hasPendingConfirmation(record = {}) {
  const status = normalizeStatus(firstValue(record.status, record.visitStatus, record.confirmationStatus));
  return /awaiting.*confirm|waiting.*confirm|pending.*confirm|needs.*confirm|confirmation requested/.test(status);
}

function hasEvaluationSaved(record = {}) {
  return Boolean(
    record.evaluationSaved ||
      record.evaluationComplete ||
      record.evaluation?.saved ||
      record.evaluation?.completed ||
      /evaluation saved|evaluation complete/.test(normalizeStatus(record.status))
  );
}

function hasProposal(record = {}) {
  return Boolean(
    record.proposalCreated ||
      record.proposalSent ||
      record.quoteCreated ||
      record.quoteSent ||
      record.proposal ||
      record.quote
  );
}

function hasProposalApproved(record = {}) {
  return Boolean(
    record.proposalApproved ||
      record.quoteApproved ||
      record.approved ||
      record.proposal?.approved ||
      record.quote?.approved ||
      /proposal approved|quote approved|approved/.test(normalizeStatus(record.status))
  );
}

function hasPaymentRecorded(record = {}) {
  return Boolean(
    record.paymentRecorded ||
      record.depositRecorded ||
      record.depositPaid ||
      record.paid ||
      record.payment?.recorded ||
      record.payment?.paid ||
      /deposit paid|payment recorded|paid/.test(normalizeStatus(record.status))
  );
}

function hasWorkCompleted(record = {}) {
  return Boolean(
    record.workCompleted ||
      record.completionSubmitted ||
      record.completion?.recorded ||
      record.completion?.submitted ||
      /work completed|completion submitted|completed/.test(normalizeStatus(record.status))
  );
}

function hasClosureRecorded(record = {}) {
  return Boolean(
    record.closureRecorded ||
      record.closed ||
      record.closure?.recorded ||
      /closed|closure recorded|history/.test(normalizeStatus(record.status))
  );
}

function commitmentInsightBase({
  id,
  priority = "medium",
  icon = "commitment",
  titleKey = "commitmentInsightTitle",
  messageKey = "",
  message = "",
  actionLabelKey = "hide",
  actionType = "dismiss",
  relatedId = "",
  record = null,
}) {
  return {
    id,
    type: "commitment",
    priority,
    icon,
    titleKey,
    messageKey,
    message,
    actionLabelKey,
    actionType,
    relatedId,
    record,
  };
}

export function buildCommitmentInsightContextFromStorage({
  storage = globalThis?.localStorage,
  currentPage = "",
} = {}) {
  const store = storage || { getItem: () => null };
  const currentProject =
    safeJsonFromStorage(store, "selectedConversation", null) ||
    safeJsonFromStorage(store, "selectedHomeownerRequest", null) ||
    safeJsonFromStorage(store, "selectedQuoteRequest", null) ||
    safeJsonFromStorage(store, "lastCompletedProject", null);
  const schedules = readArray(store, [
    "scheduleItems",
    "scheduledVisits",
    "workSchedule",
    "meetroScheduleItems",
  ]);
  const currentSchedule = safeJsonFromStorage(store, "selectedScheduleItem", null);

  return {
    role: store.getItem("activeAccountMode") === "business" ? "business" : "personal",
    currentPage,
    currentProject,
    schedules: currentSchedule ? [currentSchedule, ...schedules] : schedules,
  };
}

export function getCommitmentInsights(context = {}) {
  const now = parseDate(context.now) || new Date();
  const currentProject = context.currentProject || {};
  const schedules = Array.isArray(context.schedules) ? context.schedules : [];
  const insights = [];

  const upcomingVisit = schedules.find((schedule) => {
    if (isCompletedOrCancelled(schedule)) return false;
    const start = parseDate(getScheduleStart(schedule));
    if (!start) return false;
    const minutes = minutesUntil(start, now);
    return minutes >= 0 && minutes <= 60;
  });

  if (upcomingVisit) {
    const start = parseDate(getScheduleStart(upcomingVisit));
    const minutes = Math.max(0, minutesUntil(start, now));
    insights.push(
      commitmentInsightBase({
        id: `commitment:upcoming-visit:${getProjectId(upcomingVisit) || start.toISOString()}`,
        priority: "high",
        titleKey: "commitmentInsightTitle",
        messageKey: minutes <= 35
          ? "commitmentInsightVisitBeginsSoonMinutes"
          : "commitmentInsightScheduledWorkBeginsSoon",
        message: minutes <= 35
          ? `Your visit begins in ${minutes} minutes.`
          : "Your scheduled work begins soon.",
        actionLabelKey: "openSchedule",
        actionType: "schedule",
        relatedId: getProjectId(upcomingVisit),
        record: upcomingVisit,
      })
    );
  }

  const pendingConfirmationRecord = [currentProject, ...schedules].find(
    (record) => hasPendingConfirmation(record) && (getConversationId(record) || getProjectId(record))
  );
  if (pendingConfirmationRecord) {
    insights.push(
      commitmentInsightBase({
        id: `commitment:awaiting-confirmation:${getProjectId(pendingConfirmationRecord) || getConversationId(pendingConfirmationRecord)}`,
        priority: "high",
        titleKey: "commitmentInsightTitle",
        messageKey: "commitmentInsightAwaitingVisitConfirmation",
        message: "Customer is waiting for visit confirmation.",
        actionLabelKey: "openConversation",
        actionType: "conversation",
        relatedId: getConversationId(pendingConfirmationRecord) || getProjectId(pendingConfirmationRecord),
        record: pendingConfirmationRecord,
      })
    );
  }

  const projectId = getProjectId(currentProject);
  const nextStepId = projectId || normalizeIdentity(firstValue(currentProject.title, currentProject.projectTitle));

  if (hasEvaluationSaved(currentProject) && !hasProposal(currentProject) && nextStepId) {
    insights.push(
      commitmentInsightBase({
        id: `commitment:next-step:proposal:${nextStepId}`,
        messageKey: "commitmentInsightEvaluationProposalNext",
        message: "Evaluation is saved. Proposal is the next step.",
        actionLabelKey: "reviewProject",
        actionType: "reviewProject",
        relatedId: projectId,
        record: currentProject,
      })
    );
  } else if (hasProposalApproved(currentProject) && !hasPaymentRecorded(currentProject) && nextStepId) {
    insights.push(
      commitmentInsightBase({
        id: `commitment:next-step:payment:${nextStepId}`,
        messageKey: "commitmentInsightProposalPaymentNext",
        message: "Proposal is approved. Payment is the next step.",
        actionLabelKey: "reviewProject",
        actionType: "reviewProject",
        relatedId: projectId,
        record: currentProject,
      })
    );
  } else if (hasWorkCompleted(currentProject) && !hasClosureRecorded(currentProject) && nextStepId) {
    insights.push(
      commitmentInsightBase({
        id: `commitment:next-step:closure:${nextStepId}`,
        messageKey: "commitmentInsightWorkClosureNext",
        message: "Work is completed. Closure is the next step.",
        actionLabelKey: "reviewProject",
        actionType: "reviewProject",
        relatedId: projectId,
        record: currentProject,
      })
    );
  }

  return insights;
}
