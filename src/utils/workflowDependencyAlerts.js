const INFO = "informational";
const WARNING = "warning";
const CRITICAL = "critical_warning";

export const WORKFLOW_DEPENDENCY_ALERT_TYPES = Object.freeze({
  CUSTOMER_RESPONSE: "waiting_for_customer_response",
  VISIT_CONFIRMATION: "waiting_for_visit_confirmation",
  EVALUATION_ACCESS: "waiting_for_evaluation_access",
  PROPOSAL_APPROVAL: "waiting_for_proposal_approval",
  PROPOSAL_CHANGES: "waiting_for_proposal_changes",
  ADDITIONAL_WORK_APPROVAL: "waiting_for_additional_work_approval",
  PAYMENT: "waiting_for_payment",
  WORK_DATE_CONFIRMATION: "waiting_for_work_date_confirmation",
  COMPLETION_CONFIRMATION: "waiting_for_completion_confirmation",
  SIGNATURE: "waiting_for_signature",
  DOCUMENT_ACKNOWLEDGMENT: "waiting_for_document_acknowledgment",
  CLOSURE_OBLIGATION: "waiting_for_closure_obligation",
});

const DEPENDENCY_COPY = {
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.CUSTOMER_RESPONSE]: {
    severity: WARNING,
    title: "Waiting on Customer",
    message: "Waiting for the customer to respond before arranging the evaluation visit.",
    waitingOn: "Customer",
    expectedAction: "Customer response",
    continueWarning: "Continuing may record workflow progress before the customer has responded.",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.VISIT_CONFIRMATION]: {
    severity: WARNING,
    title: "Evaluation visit confirmation is still pending.",
    message: "Evaluation visit confirmation is still pending.",
    waitingOn: "Customer",
    expectedAction: "Confirm evaluation visit",
    continueWarning: "This step should normally happen after the customer confirms the evaluation visit.",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.EVALUATION_ACCESS]: {
    severity: WARNING,
    title: "Evaluation information is incomplete.",
    message: "Evaluation information from the customer is still incomplete.",
    waitingOn: "Customer",
    expectedAction: "Provide access, photos, or requested details",
    continueWarning: "Continuing may create a proposal from incomplete customer information.",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL]: {
    severity: WARNING,
    title: "Customer approval is still pending.",
    message: "Customer approval is still pending.",
    waitingOn: "Customer",
    expectedAction: "Approve proposal",
    continueWarning: "This work should normally continue only after the customer approves the proposal.",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_CHANGES]: {
    severity: WARNING,
    title: "Proposal changes are unresolved.",
    message: "The customer requested proposal changes. Review the requested changes before continuing.",
    waitingOn: "Professional",
    expectedAction: "Resolve requested proposal changes",
    continueWarning: "Continuing may treat an unresolved proposal as ready.",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.ADDITIONAL_WORK_APPROVAL]: {
    severity: CRITICAL,
    title: "Additional work approval is still pending.",
    message: "Additional work or a change order is still waiting for customer approval.",
    waitingOn: "Customer",
    expectedAction: "Approve additional work or change order",
    continueWarning: "Continuing may include unapproved additional work in the job record or invoice.",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT]: {
    severity: CRITICAL,
    title: "Required payment or deposit has not been recorded.",
    message: "Required payment or deposit has not been recorded.",
    waitingOn: "Customer",
    expectedAction: "Pay required deposit or balance",
    continueWarning: "Starting or closing work before payment may create financial risk.",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.WORK_DATE_CONFIRMATION]: {
    severity: WARNING,
    title: "Work appointment confirmation is still pending.",
    message: "Work appointment confirmation is still pending.",
    waitingOn: "Customer",
    expectedAction: "Confirm work date",
    continueWarning: "Continuing may send the professional to unconfirmed work.",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.COMPLETION_CONFIRMATION]: {
    severity: WARNING,
    title: "Customer completion acknowledgment is still pending.",
    message: "Customer completion acknowledgment is still pending.",
    waitingOn: "Customer",
    expectedAction: "Acknowledge completion",
    continueWarning: "Closing before customer acknowledgment may leave the project record incomplete.",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.SIGNATURE]: {
    severity: CRITICAL,
    title: "Customer signature is still pending.",
    message: "A required customer signature is still pending.",
    waitingOn: "Customer",
    expectedAction: "Provide required signature",
    continueWarning: "Continuing may create a legal or authorization record before signature.",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.DOCUMENT_ACKNOWLEDGMENT]: {
    severity: WARNING,
    title: "Required final documents are still pending.",
    message: "Required final documents are still pending.",
    waitingOn: "Customer",
    expectedAction: "Acknowledge receipt, report, warranty, or final documents",
    continueWarning: "Closing before document acknowledgment may leave closeout documentation incomplete.",
  },
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.CLOSURE_OBLIGATION]: {
    severity: CRITICAL,
    title: "Closure obligations remain incomplete.",
    message: "Closure obligations remain incomplete.",
    waitingOn: "Customer / Compliance",
    expectedAction: "Resolve signoff, permit, inspection, documentation, or closure obligations",
    continueWarning: "Closing with unresolved obligations may leave the job incomplete.",
  },
};

const ACTION_DEPENDENCIES = {
  schedule_visit: [WORKFLOW_DEPENDENCY_ALERT_TYPES.CUSTOMER_RESPONSE],
  mark_contacted: [WORKFLOW_DEPENDENCY_ALERT_TYPES.CUSTOMER_RESPONSE],
  begin_evaluation: [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.CUSTOMER_RESPONSE,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.VISIT_CONFIRMATION,
  ],
  record_evaluation: [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.VISIT_CONFIRMATION,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.EVALUATION_ACCESS,
  ],
  mark_visit_complete: [WORKFLOW_DEPENDENCY_ALERT_TYPES.VISIT_CONFIRMATION],
  create_proposal: [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.VISIT_CONFIRMATION,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.EVALUATION_ACCESS,
  ],
  mark_approved: [WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_CHANGES],
  record_payment: [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_CHANGES,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL,
  ],
  schedule_work: [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_CHANGES,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT,
  ],
  purchase_materials: [WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL],
  on_the_way: [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.WORK_DATE_CONFIRMATION,
  ],
  arrived: [WORKFLOW_DEPENDENCY_ALERT_TYPES.WORK_DATE_CONFIRMATION],
  start_work: [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_CHANGES,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.WORK_DATE_CONFIRMATION,
  ],
  perform_additional_work: [WORKFLOW_DEPENDENCY_ALERT_TYPES.ADDITIONAL_WORK_APPROVAL],
  complete_work: [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.ADDITIONAL_WORK_APPROVAL,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL,
  ],
  finalize_invoice: [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.ADDITIONAL_WORK_APPROVAL,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL,
  ],
  send_final_invoice: [WORKFLOW_DEPENDENCY_ALERT_TYPES.COMPLETION_CONFIRMATION],
  create_receipt: [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.COMPLETION_CONFIRMATION,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT,
  ],
  mark_paid: [WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT],
  close_job: [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.COMPLETION_CONFIRMATION,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.SIGNATURE,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.DOCUMENT_ACKNOWLEDGMENT,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.CLOSURE_OBLIGATION,
  ],
  move_to_history: [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.COMPLETION_CONFIRMATION,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.DOCUMENT_ACKNOWLEDGMENT,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.CLOSURE_OBLIGATION,
  ],
};

const DEPENDENCY_PRIORITY = {
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.CLOSURE_OBLIGATION]: 10,
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.SIGNATURE]: 20,
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.ADDITIONAL_WORK_APPROVAL]: 30,
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_CHANGES]: 40,
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL]: 50,
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT]: 60,
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.WORK_DATE_CONFIRMATION]: 70,
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.DOCUMENT_ACKNOWLEDGMENT]: 80,
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.COMPLETION_CONFIRMATION]: 90,
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.VISIT_CONFIRMATION]: 100,
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.EVALUATION_ACCESS]: 110,
  [WORKFLOW_DEPENDENCY_ALERT_TYPES.CUSTOMER_RESPONSE]: 120,
};

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function hasTruthy(value) {
  return value === true || ["true", "yes", "confirmed", "approved", "paid", "complete", "completed", "received", "acknowledged", "signed", "closed"].includes(normalize(value));
}

function hasAny(record = {}, keys = []) {
  return keys.some((key) => hasTruthy(record[key]));
}

function statusIsClosedOrHistory(jobRecord = {}) {
  const values = [
    jobRecord.status,
    jobRecord.workflowStatus,
    jobRecord.stage,
    jobRecord.workflowStage,
    jobRecord.lifecycleStage,
    jobRecord.closureStatus,
  ].map(normalize);
  return values.some((value) =>
    ["history", "history_only", "closed", "closure_completed", "archived"].includes(value)
  );
}

function paymentIsPendingForAction(jobRecord = {}, action = "") {
  const paymentStatus = normalize(jobRecord.paymentStatus || jobRecord.invoiceStatus || jobRecord.payment?.status);
  const finalPaymentStatus = normalize(jobRecord.finalPaymentStatus || jobRecord.finalInvoiceStatus || jobRecord.balanceStatus);
  const depositRecorded =
    hasTruthy(paymentStatus) ||
    hasAny(jobRecord, [
      "paymentReceived",
      "depositReceived",
      "paid",
      "paymentRecorded",
      "depositPaid",
    ]);
  const finalPaymentRecorded =
    hasTruthy(finalPaymentStatus) ||
    hasAny(jobRecord, [
      "finalPaymentReceived",
      "finalBalancePaid",
      "balancePaid",
      "paid",
      "paymentReceived",
      "paymentRecorded",
    ]);
  const depositPending = hasTruthy(jobRecord.paymentRequired) && !depositRecorded;
  const finalPaymentPending =
    hasTruthy(jobRecord.finalPaymentPending) ||
    hasTruthy(jobRecord.finalBalancePending) ||
    hasTruthy(jobRecord.balanceDue) ||
    (hasTruthy(jobRecord.finalPaymentRequired) && !finalPaymentRecorded);

  if (["schedule_work", "on_the_way", "arrived", "start_work"].includes(action)) {
    return depositPending;
  }
  if (["create_receipt", "mark_paid", "close_job", "move_to_history"].includes(action)) {
    return depositPending || finalPaymentPending;
  }
  return depositPending || finalPaymentPending;
}

export function getWorkflowAlertScope(jobRecord = {}) {
  const customerId = String(
    jobRecord.customerId ||
      jobRecord.customerAccountId ||
      jobRecord.homeownerId ||
      jobRecord.relationshipId ||
      jobRecord.customerEmail ||
      jobRecord.email ||
      jobRecord.customerName ||
      jobRecord.homeownerName ||
      jobRecord.customer ||
      "unknown-customer"
  );
  const jobId = String(
    jobRecord.jobId ||
      jobRecord.projectId ||
      jobRecord.requestId ||
      jobRecord.scheduleId ||
      jobRecord.quoteId ||
      jobRecord.id ||
      "unknown-job"
  );
  const conversationId = String(
    jobRecord.conversationId ||
      jobRecord.projectConversationId ||
      jobRecord.activeConversationId ||
      ""
  );

  return { customerId, jobId, conversationId };
}

function dependencyIsPending(jobRecord = {}, type = "", action = "") {
  if (statusIsClosedOrHistory(jobRecord)) return false;
  const status = normalize(jobRecord.status || jobRecord.workflowStatus || jobRecord.stage || jobRecord.workflowStage);
  const proposalStatus = normalize(jobRecord.proposalStatus || jobRecord.quoteStatus || jobRecord.quote?.status || jobRecord.acceptedQuote?.status);
  const closureStatus = normalize(jobRecord.closureStatus || jobRecord.closure?.status);

  switch (type) {
    case WORKFLOW_DEPENDENCY_ALERT_TYPES.CUSTOMER_RESPONSE:
      return hasTruthy(jobRecord.customerResponsePending) || status === "contact_requested" || status === "pending_customer_response";
    case WORKFLOW_DEPENDENCY_ALERT_TYPES.VISIT_CONFIRMATION:
      return hasTruthy(jobRecord.visitConfirmationPending) || status === "pending_customer_confirmation" || normalize(jobRecord.scheduleConfirmationStatus) === "pending";
    case WORKFLOW_DEPENDENCY_ALERT_TYPES.EVALUATION_ACCESS:
      return hasTruthy(jobRecord.evaluationAccessPending) || hasTruthy(jobRecord.customerInfoIncomplete) || hasTruthy(jobRecord.evaluationInfoIncomplete);
    case WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL:
      return !dependencyIsPending(jobRecord, WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_CHANGES, action) && (hasTruthy(jobRecord.proposalApprovalPending) || proposalStatus === "sent" || proposalStatus === "quote_sent" || proposalStatus === "pending_customer_approval");
    case WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_CHANGES:
      return hasTruthy(jobRecord.proposalChangesPending) || proposalStatus === "change_requested" || proposalStatus === "changes_requested";
    case WORKFLOW_DEPENDENCY_ALERT_TYPES.ADDITIONAL_WORK_APPROVAL:
      return hasTruthy(jobRecord.additionalWorkApprovalPending) || hasTruthy(jobRecord.changeOrderApprovalPending) || normalize(jobRecord.additionalWorkStatus) === "pending_customer_approval" || normalize(jobRecord.changeOrderStatus) === "pending_customer_approval";
    case WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT:
      return paymentIsPendingForAction(jobRecord, action);
    case WORKFLOW_DEPENDENCY_ALERT_TYPES.WORK_DATE_CONFIRMATION:
      return hasTruthy(jobRecord.workDateConfirmationPending) || normalize(jobRecord.workDateConfirmationStatus) === "pending" || normalize(jobRecord.workScheduleStatus) === "pending_customer_confirmation";
    case WORKFLOW_DEPENDENCY_ALERT_TYPES.COMPLETION_CONFIRMATION:
      return hasTruthy(jobRecord.completionConfirmationPending) || normalize(jobRecord.completionStatus) === "awaiting_customer_confirmation";
    case WORKFLOW_DEPENDENCY_ALERT_TYPES.SIGNATURE:
      return hasTruthy(jobRecord.signatureRequired) && !hasAny(jobRecord, ["signatureReceived", "signed", "customerSigned"]);
    case WORKFLOW_DEPENDENCY_ALERT_TYPES.DOCUMENT_ACKNOWLEDGMENT:
      return hasTruthy(jobRecord.documentAcknowledgmentPending) || hasTruthy(jobRecord.finalDocumentsPending) || (hasTruthy(jobRecord.finalDocumentsRequired) && !hasAny(jobRecord, ["documentsAcknowledged", "receiptAcknowledged", "warrantyAcknowledged"]));
    case WORKFLOW_DEPENDENCY_ALERT_TYPES.CLOSURE_OBLIGATION:
      return hasTruthy(jobRecord.closureObligationsPending) || hasTruthy(jobRecord.permitClosurePending) || hasTruthy(jobRecord.compliancePending) || closureStatus === "pending" || closureStatus === "blocked";
    default:
      return false;
  }
}

export function createWorkflowDependencyAlert({
  jobRecord = {},
  type,
  attemptedNextAction = "",
  createdAt = new Date().toISOString(),
} = {}) {
  const copy = DEPENDENCY_COPY[type];
  if (!copy) return null;
  const scope = getWorkflowAlertScope(jobRecord);
  const currentWorkflowStage = jobRecord.workflowStage || jobRecord.stage || jobRecord.workflowStatus || jobRecord.status || "";
  const finalPaymentIsPending =
    type === WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT &&
    (hasTruthy(jobRecord.finalPaymentPending) ||
      hasTruthy(jobRecord.finalBalancePending) ||
      hasTruthy(jobRecord.balanceDue));
  const depositIsPending =
    type === WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT &&
    ["schedule_work", "on_the_way", "arrived", "start_work"].includes(attemptedNextAction);
  return {
    id: `${scope.jobId}:${scope.customerId}:${type}:${currentWorkflowStage || "workflow"}`,
    type,
    severity: copy.severity,
    title: finalPaymentIsPending
      ? "Final payment is still pending."
      : depositIsPending
        ? "Required deposit has not been recorded."
        : copy.title,
    message:
      finalPaymentIsPending
        ? "Final payment or balance is still outstanding."
        : depositIsPending
          ? "The required deposit has not been recorded."
        : copy.message,
    waitingOn: copy.waitingOn,
    expectedAction:
      finalPaymentIsPending
        ? "Pay final balance"
        : depositIsPending
          ? "Record required deposit"
        : copy.expectedAction,
    currentWorkflowStage,
    attemptedNextAction,
    continueAllowed: true,
    continueWarning: finalPaymentIsPending
      ? "You may continue, but Meetro will record that closure occurred before final payment."
      : depositIsPending
        ? "You may continue, but Meetro will record that work started before the required deposit."
        : copy.continueWarning,
    customerId: scope.customerId,
    jobId: scope.jobId,
    conversationId: scope.conversationId,
    requestedAt: jobRecord.dependencyRequestedAt || jobRecord.requestedAt || jobRecord.createdAt || "",
    lastReminderAt: jobRecord.lastReminderAt || jobRecord.dependencyReminderAt || "",
    createdAt,
  };
}

export function getPendingWorkflowDependencies(jobRecord = {}, options = {}) {
  const attemptedNextAction = options.attemptedNextAction || "";
  return Object.values(WORKFLOW_DEPENDENCY_ALERT_TYPES)
    .filter((type) => dependencyIsPending(jobRecord, type, attemptedNextAction))
    .map((type) => createWorkflowDependencyAlert({ jobRecord, type, attemptedNextAction }))
    .filter(Boolean)
    .sort((a, b) => (DEPENDENCY_PRIORITY[a.type] || 999) - (DEPENDENCY_PRIORITY[b.type] || 999));
}

export function getDependenciesForAttemptedAction(jobRecord = {}, action = "") {
  const allowedTypes = ACTION_DEPENDENCIES[action] || [];
  return getPendingWorkflowDependencies(jobRecord, { attemptedNextAction: action }).filter((alert) =>
    allowedTypes.includes(alert.type)
  );
}

export function getDependencyForAttemptedAction(jobRecord = {}, action = "") {
  return getDependenciesForAttemptedAction(jobRecord, action)[0] || null;
}

export function shouldWarnBeforeAction(jobRecord = {}, action = "") {
  const dependency = getDependencyForAttemptedAction(jobRecord, action);
  const dependencies = getDependenciesForAttemptedAction(jobRecord, action);
  return {
    shouldWarn: Boolean(dependency),
    dependency: dependency ? { ...dependency, relatedDependencies: dependencies } : null,
    dependencies,
    continueAllowed: true,
  };
}

export function createWorkflowOverrideEvent(dependency = {}, action = "", options = {}) {
  const timestamp = options.timestamp || new Date().toISOString();
  return {
    id: `workflow-dependency-override:${dependency.id || "unknown"}:${action || dependency.attemptedNextAction || "continue"}`,
    type: "workflow_dependency_override",
    stage: dependency.currentWorkflowStage || "",
    attemptedAction: action || dependency.attemptedNextAction || "",
    pendingDependency: dependency.type,
    pendingDependencies: Array.isArray(dependency.relatedDependencies)
      ? dependency.relatedDependencies.map((item) => item.type)
      : [dependency.type].filter(Boolean),
    pendingDependencyTitle: dependency.title || "",
    continuedByProfessional: true,
    customerId: dependency.customerId || "",
    jobId: dependency.jobId || "",
    conversationId: dependency.conversationId || "",
    timestamp,
    message: getWorkflowOverrideHistoryMessage(dependency, action),
  };
}

export function appendWorkflowOverrideHistory(jobRecord = {}, dependency = {}, action = "", options = {}) {
  const event = createWorkflowOverrideEvent(dependency, action, options);
  const existing = Array.isArray(jobRecord.projectTimeline) ? jobRecord.projectTimeline : [];
  if (existing.some((item) => item.id === event.id || (item.type === event.type && item.pendingDependency === event.pendingDependency && item.attemptedAction === event.attemptedAction))) {
    return { ...jobRecord, projectTimeline: existing };
  }
  return {
    ...jobRecord,
    projectTimeline: [event, ...existing],
    workflowDependencyOverrides: [event, ...(Array.isArray(jobRecord.workflowDependencyOverrides) ? jobRecord.workflowDependencyOverrides : [])],
  };
}

export function getWorkflowOverrideHistoryMessage(dependency = {}, action = "") {
  const type = dependency.type;
  if (type === WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL && action === "schedule_work") {
    return "Work scheduling continued before customer proposal approval.";
  }
  if (type === WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT && ["start_work", "on_the_way"].includes(action)) {
    return "Work began before the required deposit was recorded.";
  }
  if (type === WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT && ["close_job", "move_to_history"].includes(action)) {
    return "Job closure continued before final payment was recorded.";
  }
  if (type === WORKFLOW_DEPENDENCY_ALERT_TYPES.ADDITIONAL_WORK_APPROVAL) {
    return "Additional work continued before customer approval was recorded.";
  }
  if (type === WORKFLOW_DEPENDENCY_ALERT_TYPES.COMPLETION_CONFIRMATION && action === "close_job") {
    return "Job was closed with outstanding customer signoff.";
  }
  if (type === WORKFLOW_DEPENDENCY_ALERT_TYPES.CLOSURE_OBLIGATION && action === "close_job") {
    return "Job closure continued with outstanding permit obligations.";
  }
  return `${dependency.title || "Workflow"} continued before the expected customer action was complete.`;
}

export function resolveWorkflowDependency(jobRecord = {}, customerAction = "") {
  const resolvedByAction = {
    customer_responded: [WORKFLOW_DEPENDENCY_ALERT_TYPES.CUSTOMER_RESPONSE],
    visit_confirmed: [WORKFLOW_DEPENDENCY_ALERT_TYPES.VISIT_CONFIRMATION],
    evaluation_access_provided: [WORKFLOW_DEPENDENCY_ALERT_TYPES.EVALUATION_ACCESS],
    proposal_approved: [WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL],
    proposal_changes_resolved: [WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_CHANGES],
    additional_work_approved: [WORKFLOW_DEPENDENCY_ALERT_TYPES.ADDITIONAL_WORK_APPROVAL],
    payment_recorded: [WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT],
    work_date_confirmed: [WORKFLOW_DEPENDENCY_ALERT_TYPES.WORK_DATE_CONFIRMATION],
    completion_confirmed: [WORKFLOW_DEPENDENCY_ALERT_TYPES.COMPLETION_CONFIRMATION],
    signature_received: [WORKFLOW_DEPENDENCY_ALERT_TYPES.SIGNATURE],
    documents_acknowledged: [WORKFLOW_DEPENDENCY_ALERT_TYPES.DOCUMENT_ACKNOWLEDGMENT],
    closure_obligation_resolved: [WORKFLOW_DEPENDENCY_ALERT_TYPES.CLOSURE_OBLIGATION],
  };
  const resolvedTypes = new Set(resolvedByAction[customerAction] || []);
  return {
    ...jobRecord,
    activeWorkflowDependencyAlerts: (Array.isArray(jobRecord.activeWorkflowDependencyAlerts)
      ? jobRecord.activeWorkflowDependencyAlerts
      : []
    ).filter((alert) => !resolvedTypes.has(alert.type)),
    resolvedWorkflowDependencyAlerts: [
      ...(Array.isArray(jobRecord.activeWorkflowDependencyAlerts)
        ? jobRecord.activeWorkflowDependencyAlerts.filter((alert) => resolvedTypes.has(alert.type)).map((alert) => ({
            ...alert,
            resolvedAt: new Date().toISOString(),
            resolvedBy: customerAction,
          }))
        : []),
      ...(Array.isArray(jobRecord.resolvedWorkflowDependencyAlerts) ? jobRecord.resolvedWorkflowDependencyAlerts : []),
    ],
  };
}

export function dedupeWorkflowDependencyAlerts(alerts = []) {
  const seen = new Set();
  return alerts.filter((alert) => {
    const key = alert?.id || `${alert?.jobId}:${alert?.customerId}:${alert?.type}:${alert?.currentWorkflowStage}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getWorkflowDependencyHardGateAudit() {
  return [
    {
      gate: "Evaluation completion",
      decision: "preserve_hard_validation",
      reason: "Evaluation Notes still require service/context and enough content before creating a quote.",
    },
    {
      gate: "Proposal approval and payment before work scheduling",
      decision: "supplement_with_warning",
      reason: "Existing readiness helpers remain available; dependency alerts add advisory override documentation where the professional surface permits continuation.",
    },
    {
      gate: "Completion and closure validation",
      decision: "preserve_hard_validation",
      reason: "Closure readiness still validates obligations; dependency alerts warn when closing or moving to history with pending customer/compliance dependencies.",
    },
  ];
}
