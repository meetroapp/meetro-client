import { WORKFLOW_DEPENDENCY_ALERT_TYPES } from "./workflowDependencyAlerts.js";

export const WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES = Object.freeze({
  IDENTIFIED: "workflow_dependency_identified",
  REMINDER_SENT: "workflow_dependency_reminder_sent",
  RESOLVED: "workflow_dependency_resolved",
  OVERRIDE: "workflow_dependency_override",
});

const EVENT_TYPES = new Set(Object.values(WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES));

const DEPENDENCY_LABELS = {
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.CUSTOMER_RESPONSE]: {
    pending: "Customer response was pending.",
    reminder: "A reminder was sent requesting a customer response.",
    resolved: "Customer response was received.",
    short: "Customer response",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.VISIT_CONFIRMATION]: {
    pending: "Evaluation visit confirmation was pending.",
    reminder: "A reminder was sent requesting evaluation visit confirmation.",
    resolved: "Evaluation visit confirmation was received.",
    short: "Evaluation visit confirmation",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.EVALUATION_ACCESS]: {
    pending: "Evaluation access or customer information was pending.",
    reminder: "A reminder was sent requesting evaluation access or information.",
    resolved: "Evaluation access or customer information was received.",
    short: "Evaluation information",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL]: {
    pending: "Customer proposal approval was pending.",
    reminder: "A reminder was sent requesting proposal approval.",
    resolved: "Customer proposal approval was received.",
    short: "Proposal approval",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_CHANGES]: {
    pending: "Requested proposal changes were unresolved.",
    reminder: "A reminder was sent about requested proposal changes.",
    resolved: "Requested proposal changes were resolved.",
    short: "Proposal changes",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.ADDITIONAL_WORK_APPROVAL]: {
    pending: "Additional work approval was pending.",
    reminder: "A reminder was sent requesting additional work approval.",
    resolved: "Additional work approval was received.",
    short: "Additional work approval",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT]: {
    pending: "Required payment or deposit was still outstanding.",
    reminder: "A reminder was sent requesting payment.",
    resolved: "Required payment was recorded.",
    short: "Payment",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.WORK_DATE_CONFIRMATION]: {
    pending: "Work appointment confirmation was pending.",
    reminder: "A reminder was sent requesting work appointment confirmation.",
    resolved: "Work appointment confirmation was received.",
    short: "Work appointment confirmation",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.COMPLETION_CONFIRMATION]: {
    pending: "Customer completion acknowledgment was pending.",
    reminder: "A reminder was sent requesting completion acknowledgment.",
    resolved: "Customer completion acknowledgment was received.",
    short: "Completion acknowledgment",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.SIGNATURE]: {
    pending: "Customer signature was pending.",
    reminder: "A reminder was sent requesting signature.",
    resolved: "Customer signature was received.",
    short: "Customer signature",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.DOCUMENT_ACKNOWLEDGMENT]: {
    pending: "Required final documents were pending.",
    reminder: "A reminder was sent about required final documents.",
    resolved: "Required final documents were acknowledged.",
    short: "Final documents",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.CLOSURE_OBLIGATION]: {
    pending: "Closure obligations remained incomplete.",
    reminder: "A reminder was sent about closure obligations.",
    resolved: "Closure obligations were resolved.",
    short: "Closure obligations",
  },
};

function normalizeText(value) {
  return String(value || "").trim();
}

function getDependencyCopy(type = "") {
  return DEPENDENCY_LABELS[type] || {
    pending: "Workflow dependency was pending.",
    reminder: "A workflow dependency reminder was sent.",
    resolved: "Workflow dependency was resolved.",
    short: "Workflow dependency",
  };
}

function getEventDependencyType(event = {}) {
  return event.dependencyType || event.pendingDependency || event.typeKey || event.alertType || "";
}

function getEventTimestamp(event = {}) {
  return (
    event.timestamp ||
    event.recordedAt ||
    event.createdAt ||
    event.savedAt ||
    event.reminderSentAt ||
    event.resolvedAt ||
    ""
  );
}

function buildEventId(event = {}, dependencyType = "", timestamp = "") {
  return (
    event.id ||
    [
      "workflow-dependency-history",
      event.type || "event",
      event.jobId || "job",
      event.customerId || "customer",
      dependencyType || "dependency",
      event.attemptedAction || event.affectedWorkflowAction || "",
      event.stage || event.currentWorkflowStage || "",
      timestamp || "",
    ]
      .filter(Boolean)
      .join(":")
  );
}

export function formatWorkflowDependencyEvent(event = {}) {
  const eventType = EVENT_TYPES.has(event.type) ? event.type : "";
  const dependencyType = getEventDependencyType(event);
  const copy = getDependencyCopy(dependencyType);

  if (event.message) return event.message;
  if (event.summary) return event.summary;
  if (event.label) return event.label;

  if (eventType === WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.REMINDER_SENT) {
    return copy.reminder;
  }
  if (eventType === WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.RESOLVED) {
    return copy.resolved;
  }
  if (eventType === WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.OVERRIDE) {
    return `${copy.short} continued before the expected action was complete.`;
  }
  if (eventType === WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.IDENTIFIED) {
    return copy.pending;
  }
  return "Workflow dependency history event.";
}

export function normalizeWorkflowDependencyEvent(event = {}) {
  if (!event || typeof event !== "object") return null;
  if (!EVENT_TYPES.has(event.type)) return null;
  const dependencyType = getEventDependencyType(event);
  const timestamp = getEventTimestamp(event);

  return {
    id: buildEventId(event, dependencyType, timestamp),
    type: event.type,
    dependencyType,
    dependencyLabel: getDependencyCopy(dependencyType).short,
    summary: formatWorkflowDependencyEvent(event),
    waitingOn: event.waitingOn || "",
    affectedWorkflowStage: event.stage || event.currentWorkflowStage || event.affectedWorkflowStage || "",
    affectedWorkflowAction: event.attemptedAction || event.affectedWorkflowAction || event.attemptedNextAction || "",
    customerId: normalizeText(event.customerId),
    jobId: normalizeText(event.jobId),
    conversationId: normalizeText(event.conversationId),
    timestamp,
    reminderChannel: event.reminderChannel || "",
    continuedByProfessional: event.continuedByProfessional === true,
    readOnly: true,
  };
}

export function getWorkflowDependencyHistory(jobRecord = {}) {
  const sources = [
    ...(Array.isArray(jobRecord.projectTimeline) ? jobRecord.projectTimeline : []),
    ...(Array.isArray(jobRecord.workflowDependencyHistory) ? jobRecord.workflowDependencyHistory : []),
    ...(Array.isArray(jobRecord.workflowDependencyOverrides) ? jobRecord.workflowDependencyOverrides : []),
    ...(Array.isArray(jobRecord.resolvedWorkflowDependencyAlerts)
      ? jobRecord.resolvedWorkflowDependencyAlerts.map((alert) => ({
          ...alert,
          type: WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.RESOLVED,
          dependencyType: alert.type,
          timestamp: alert.resolvedAt || alert.createdAt,
        }))
      : []),
  ];
  const scoped = sources
    .map(normalizeWorkflowDependencyEvent)
    .filter(Boolean)
    .filter((event) => {
      const customerMatches = !jobRecord.customerId || !event.customerId || event.customerId === String(jobRecord.customerId);
      const jobMatches =
        !jobRecord.id ||
        !event.jobId ||
        [jobRecord.id, jobRecord.jobId, jobRecord.projectId, jobRecord.requestId, jobRecord.scheduleId]
          .filter(Boolean)
          .map(String)
          .includes(event.jobId);
      const conversationMatches =
        !jobRecord.conversationId || !event.conversationId || event.conversationId === String(jobRecord.conversationId);
      return customerMatches && jobMatches && conversationMatches;
    });
  const seen = new Set();
  return scoped
    .filter((event) => {
      const key = `${event.id}:${event.type}:${event.dependencyType}:${event.affectedWorkflowAction}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
}

export function groupWorkflowDependencyHistory(events = []) {
  return events.reduce((groups, event) => {
    const key = event.dependencyType || "unknown";
    groups[key] = groups[key] || [];
    groups[key].push(event);
    return groups;
  }, {});
}

export function buildWorkflowDependencyReportSection(events = []) {
  const history = events.map(normalizeWorkflowDependencyEvent).filter(Boolean);
  if (history.length === 0) return "";

  const lines = ["Workflow Dependencies"];
  history.forEach((event) => {
    const details = [
      event.waitingOn ? `Waiting on: ${event.waitingOn}` : "",
      event.affectedWorkflowStage ? `Stage: ${event.affectedWorkflowStage}` : "",
      event.affectedWorkflowAction ? `Action: ${event.affectedWorkflowAction}` : "",
      event.timestamp ? `Time: ${event.timestamp}` : "",
    ].filter(Boolean);
    lines.push(`* ${event.summary}${details.length ? ` (${details.join("; ")})` : ""}`);
  });
  return lines.join("\n");
}

export function createWorkflowDependencyIdentifiedEvent(dependency = {}, action = "", options = {}) {
  const timestamp = options.timestamp || new Date().toISOString();
  return {
    id: `workflow-dependency-identified:${dependency.id || dependency.jobId || "unknown"}:${action || dependency.attemptedNextAction || "action"}`,
    type: WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.IDENTIFIED,
    dependencyType: dependency.type,
    waitingOn: dependency.waitingOn || "",
    stage: dependency.currentWorkflowStage || "",
    affectedWorkflowAction: action || dependency.attemptedNextAction || "",
    customerId: dependency.customerId || "",
    jobId: dependency.jobId || "",
    conversationId: dependency.conversationId || "",
    timestamp,
    summary: getDependencyCopy(dependency.type).pending,
    readOnly: true,
  };
}

export function createWorkflowDependencyReminderSentEvent(dependency = {}, options = {}) {
  const timestamp = options.timestamp || new Date().toISOString();
  return {
    id: `workflow-dependency-reminder:${dependency.id || dependency.jobId || "unknown"}:${options.channel || "message"}:${timestamp}`,
    type: WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.REMINDER_SENT,
    dependencyType: dependency.type,
    waitingOn: dependency.waitingOn || "",
    stage: dependency.currentWorkflowStage || "",
    affectedWorkflowAction: dependency.attemptedNextAction || options.action || "",
    customerId: dependency.customerId || "",
    jobId: dependency.jobId || "",
    conversationId: dependency.conversationId || "",
    reminderChannel: options.channel || "message",
    timestamp,
    summary: getDependencyCopy(dependency.type).reminder,
    readOnly: true,
  };
}

export function createWorkflowDependencyResolvedEvent(dependency = {}, options = {}) {
  const timestamp = options.timestamp || new Date().toISOString();
  return {
    id: `workflow-dependency-resolved:${dependency.id || dependency.jobId || "unknown"}:${options.resolvedBy || dependency.type || "resolved"}`,
    type: WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.RESOLVED,
    dependencyType: dependency.type || dependency.dependencyType,
    waitingOn: dependency.waitingOn || "",
    stage: dependency.currentWorkflowStage || dependency.stage || "",
    affectedWorkflowAction: dependency.attemptedNextAction || options.action || "",
    customerId: dependency.customerId || "",
    jobId: dependency.jobId || "",
    conversationId: dependency.conversationId || "",
    timestamp,
    resolvedBy: options.resolvedBy || "",
    summary: getDependencyCopy(dependency.type || dependency.dependencyType).resolved,
    readOnly: true,
  };
}

export function appendWorkflowDependencyHistoryEvent(jobRecord = {}, event = {}) {
  const normalized = normalizeWorkflowDependencyEvent(event);
  if (!normalized) return jobRecord;
  const existing = Array.isArray(jobRecord.projectTimeline) ? jobRecord.projectTimeline : [];
  if (
    existing.some((item) => {
      const current = normalizeWorkflowDependencyEvent(item);
      return current && current.id === normalized.id;
    })
  ) {
    return { ...jobRecord, projectTimeline: existing };
  }
  return {
    ...jobRecord,
    projectTimeline: [event, ...existing],
    workflowDependencyHistory: [
      event,
      ...(Array.isArray(jobRecord.workflowDependencyHistory) ? jobRecord.workflowDependencyHistory : []),
    ],
  };
}
