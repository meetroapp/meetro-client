export const LEAD_WORKFLOW_STAGES = Object.freeze([
  "lead",
  "contact",
  "information",
  "appointment",
  "quote",
  "decision",
  "work",
  "completion",
  "history",
]);

export const LEAD_WORKFLOW_WARNING_CODES = Object.freeze({
  MISSING_LEAD_IDENTITY: "missing-lead-identity",
  MISSING_CUSTOMER_CONTACT: "missing-customer-contact",
  MISSING_INFORMATION: "missing-information",
  QUOTE_BEFORE_INFORMATION: "quote-before-information",
  APPOINTMENT_REQUIRED_MISSING: "appointment-required-missing",
  APPOINTMENT_NOT_COMPLETED: "appointment-not-completed",
  APPOINTMENT_OUTCOME_MISSING: "appointment-outcome-missing",
  APPOINTMENT_EXCEPTION_UNAPPROVED: "appointment-exception-unapproved",
  WORK_BEFORE_QUOTE: "work-before-quote",
  WORK_BEFORE_DECISION: "work-before-quote-decision",
  COMPLETION_WITHOUT_WORK: "completion-without-work",
  HISTORY_WITHOUT_COMPLETION: "history-without-completion",
  STAGE_TIMESTAMP_CONFLICT: "stage-timestamp-conflict",
});

const RISK_WEIGHTS = Object.freeze({
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
});

const COMPLETED_APPOINTMENT_STATUSES = new Set([
  "completed",
  "complete",
  "visited",
  "visit_completed",
  "appointment_completed",
]);

const QUOTE_DECISION_STATUSES = new Set([
  "accepted",
  "approved",
  "declined",
  "rejected",
  "revision_requested",
  "change_requested",
]);

const ACTIVE_WORK_STATUSES = new Set([
  "active",
  "started",
  "in_progress",
  "enroute",
  "arrived",
  "ready_to_start",
  "paused_materials",
]);

const COMPLETION_STATUSES = new Set([
  "completed",
  "complete",
  "awaiting_customer_confirmation",
  "confirmed",
  "followup_requested",
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function firstValue(...values) {
  return values.find(hasValue);
}

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(isRecord);
  return isRecord(value) ? [value] : [];
}

function hasTruthyFlag(...values) {
  return values.some(
    (value) =>
      value === true ||
      value === 1 ||
      ["true", "yes", "complete", "completed"].includes(normalizeToken(value))
  );
}

function hasStatus(records, statuses) {
  return records.some((record) =>
    statuses.has(normalizeToken(firstValue(record.status, record.workflowStatus)))
  );
}

function hasLeadIdentity(lead) {
  return Boolean(
    firstValue(
      lead.projectId,
      lead.project_id,
      lead.requestId,
      lead.request_id,
      lead.quoteRequestId,
      lead.postId,
      lead.leadIdentity?.explicitTokens?.[0]
    )
  );
}

function getAppointmentException(input, lead) {
  const exception = isRecord(input.appointmentException)
    ? input.appointmentException
    : isRecord(lead.appointmentException)
    ? lead.appointmentException
    : {};
  const approved = exception.approved === true;
  const hasReason = hasValue(exception.reason || exception.type);
  const hasApprover = hasValue(
    exception.approvedBy || exception.approvedByRole || exception.authority
  );

  return {
    requested: Object.keys(exception).length > 0,
    approved: approved && hasReason && hasApprover,
    reason: String(exception.reason || exception.type || ""),
    approvedBy: String(
      exception.approvedBy ||
        exception.approvedByRole ||
        exception.authority ||
        ""
    ),
  };
}

function getTimestamp(value) {
  if (!hasValue(value)) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function createWarning(code, stage, riskLevel, message, evidence = []) {
  return {
    code,
    stage,
    riskLevel,
    message,
    evidence: [...evidence],
  };
}

function getRiskLevel(warnings) {
  if (warnings.length === 0) return "LOW";
  return warnings.reduce(
    (highest, warning) =>
      RISK_WEIGHTS[warning.riskLevel] > RISK_WEIGHTS[highest]
        ? warning.riskLevel
        : highest,
    "LOW"
  );
}

function getWorkflowStage(evidence) {
  for (let index = LEAD_WORKFLOW_STAGES.length - 1; index >= 0; index -= 1) {
    const stage = LEAD_WORKFLOW_STAGES[index];
    if (evidence[stage]) return stage;
  }
  return "lead";
}

function getMissingStages(evidence, appointmentRequired) {
  const furthestStage = getWorkflowStage(evidence);
  const furthestIndex = LEAD_WORKFLOW_STAGES.indexOf(furthestStage);

  return LEAD_WORKFLOW_STAGES.slice(0, furthestIndex + 1).filter((stage) => {
    if (stage === "appointment" && !appointmentRequired) return false;
    return !evidence[stage];
  });
}

function addTimestampWarnings(warnings, timestamps) {
  const ordered = [
    ["contact", timestamps.contact],
    ["information", timestamps.information],
    ["appointment", timestamps.appointment],
    ["quote", timestamps.quote],
    ["decision", timestamps.decision],
    ["work", timestamps.work],
    ["completion", timestamps.completion],
    ["history", timestamps.history],
  ].filter(([, timestamp]) => timestamp !== null);

  ordered.forEach(([stage, timestamp], index) => {
    const laterConflict = ordered
      .slice(index + 1)
      .find(([, laterTimestamp]) => laterTimestamp < timestamp);

    if (!laterConflict) return;
    warnings.push(
      createWarning(
        LEAD_WORKFLOW_WARNING_CODES.STAGE_TIMESTAMP_CONFLICT,
        laterConflict[0],
        "MEDIUM",
        "Workflow timestamps place a later stage before an earlier stage.",
        [stage, laterConflict[0]]
      )
    );
  });
}

// Warning-only workflow characterization. This utility never grants quote or
// work eligibility and never changes the supplied lead or context records.
export function evaluateLeadWorkflowCompliance(input = {}) {
  const safeInput = isRecord(input) ? input : {};
  const lead = isRecord(safeInput.lead) ? safeInput.lead : safeInput;
  const appointments = [
    ...normalizeArray(safeInput.appointments),
    ...normalizeArray(lead.appointments),
    ...normalizeArray(lead.appointment),
    ...normalizeArray(lead.schedule),
  ];
  const quotes = [
    ...normalizeArray(safeInput.quotes),
    ...normalizeArray(lead.quotes),
    ...normalizeArray(lead.quotesReceived),
    ...normalizeArray(lead.acceptedQuote),
    ...normalizeArray(lead.quote),
  ];
  const workRecords = [
    ...normalizeArray(safeInput.work),
    ...normalizeArray(safeInput.workRecords),
    ...normalizeArray(lead.work),
    ...normalizeArray(lead.activeWork),
    ...normalizeArray(lead.job),
  ];
  const completions = [
    ...normalizeArray(safeInput.completions),
    ...normalizeArray(lead.completions),
    ...normalizeArray(lead.completion),
  ];
  const historyRecords = [
    ...normalizeArray(safeInput.history),
    ...normalizeArray(lead.history),
  ];
  const leadStatus = normalizeToken(lead.status);
  const workflowType = normalizeToken(
    firstValue(
      safeInput.workflowType,
      lead.workflowType,
      lead.requestType,
      lead.type,
      lead.source
    )
  );
  const isEmergency =
    safeInput.isEmergency === true ||
    lead.isEmergency === true ||
    workflowType.includes("emergency");
  const exception = getAppointmentException(safeInput, lead);
  const appointmentRequired =
    !isEmergency &&
    (safeInput.appointmentRequired === true ||
      lead.appointmentRequired === true ||
      normalizeToken(lead.appointmentPolicy) === "required");
  const contact = hasTruthyFlag(
    safeInput.customerContacted,
    lead.customerContacted,
    lead.contacted,
    lead.contactComplete
  ) || hasValue(
    firstValue(
      safeInput.contactedAt,
      lead.contactedAt,
      lead.customerContactedAt,
      lead.contactCompletedAt
    )
  );
  const information = hasTruthyFlag(
    safeInput.informationComplete,
    lead.informationComplete,
    lead.detailsComplete,
    lead.informationGathered
  ) || hasValue(
    firstValue(
      safeInput.informationCompletedAt,
      lead.informationCompletedAt,
      lead.informationGatheredAt
    )
  );
  const appointmentCompleted = hasStatus(
    appointments,
    COMPLETED_APPOINTMENT_STATUSES
  ) || appointments.some((appointment) =>
    hasValue(
      firstValue(
        appointment.completedAt,
        appointment.visitCompletedAt,
        appointment.appointmentCompletedAt
      )
    )
  );
  const appointmentOutcome = appointments.some((appointment) =>
    hasValue(
      firstValue(
        appointment.visitOutcome,
        appointment.outcome,
        appointment.projectOutcome
      )
    )
  );
  const quote = quotes.length > 0 || hasValue(
    firstValue(lead.quoteId, lead.quoteCreatedAt, lead.quoteSentAt)
  ) || ["quoted", "quote_sent"].includes(leadStatus);
  const decision =
    hasStatus(quotes, QUOTE_DECISION_STATUSES) ||
    hasValue(firstValue(lead.quoteDecision, lead.quoteDecisionAt)) ||
    Boolean(lead.acceptedQuote) ||
    ["accepted", "approved", "declined"].includes(leadStatus);
  const work =
    workRecords.length > 0 ||
    hasStatus(workRecords, ACTIVE_WORK_STATUSES) ||
    hasValue(firstValue(lead.workStartedAt, lead.startedAt, lead.activeWorkId)) ||
    ACTIVE_WORK_STATUSES.has(leadStatus);
  const completion =
    completions.length > 0 ||
    hasStatus(completions, COMPLETION_STATUSES) ||
    hasValue(firstValue(lead.completionId, lead.completedAt)) ||
    COMPLETION_STATUSES.has(leadStatus);
  const history =
    historyRecords.length > 0 ||
    hasTruthyFlag(lead.savedToHistory, lead.saved_to_history) ||
    hasValue(firstValue(lead.historyId, lead.archivedAt));
  const evidence = {
    lead: true,
    contact,
    information,
    appointment:
      isEmergency ||
      !appointmentRequired ||
      appointmentCompleted ||
      exception.approved,
    quote,
    decision,
    work,
    completion,
    history,
  };
  const warnings = [];

  if (!hasLeadIdentity(lead)) {
    warnings.push(
      createWarning(
        LEAD_WORKFLOW_WARNING_CODES.MISSING_LEAD_IDENTITY,
        "lead",
        "HIGH",
        "No explicit project or request identity is available.",
        []
      )
    );
  }
  if (!contact && (information || quote || decision || work || completion)) {
    warnings.push(
      createWarning(
        LEAD_WORKFLOW_WARNING_CODES.MISSING_CUSTOMER_CONTACT,
        "contact",
        "MEDIUM",
        "A later workflow stage exists without explicit customer contact evidence.",
        []
      )
    );
  }
  if (!information && (quote || decision || work || completion)) {
    warnings.push(
      createWarning(
        quote
          ? LEAD_WORKFLOW_WARNING_CODES.QUOTE_BEFORE_INFORMATION
          : LEAD_WORKFLOW_WARNING_CODES.MISSING_INFORMATION,
        "information",
        "MEDIUM",
        "A later workflow stage exists without completed information gathering.",
        []
      )
    );
  }
  if (appointmentRequired && exception.requested && !exception.approved) {
    warnings.push(
      createWarning(
        LEAD_WORKFLOW_WARNING_CODES.APPOINTMENT_EXCEPTION_UNAPPROVED,
        "appointment",
        "MEDIUM",
        "The appointment exception lacks explicit approval, reason, or authority.",
        [exception.reason, exception.approvedBy].filter(Boolean)
      )
    );
  }
  if (
    appointmentRequired &&
    !appointmentCompleted &&
    !exception.approved &&
    quote
  ) {
    warnings.push(
      createWarning(
        appointments.length > 0
          ? LEAD_WORKFLOW_WARNING_CODES.APPOINTMENT_NOT_COMPLETED
          : LEAD_WORKFLOW_WARNING_CODES.APPOINTMENT_REQUIRED_MISSING,
        "appointment",
        "HIGH",
        "A quote exists before the required appointment is completed.",
        []
      )
    );
  }
  if (
    appointmentRequired &&
    appointmentCompleted &&
    !appointmentOutcome &&
    quote
  ) {
    warnings.push(
      createWarning(
        LEAD_WORKFLOW_WARNING_CODES.APPOINTMENT_OUTCOME_MISSING,
        "appointment",
        "MEDIUM",
        "A quote exists after an appointment without a recorded visit outcome.",
        []
      )
    );
  }
  if (work && !quote) {
    warnings.push(
      createWarning(
        LEAD_WORKFLOW_WARNING_CODES.WORK_BEFORE_QUOTE,
        "work",
        "HIGH",
        "Work evidence exists without quote evidence.",
        []
      )
    );
  }
  if (work && !decision) {
    warnings.push(
      createWarning(
        LEAD_WORKFLOW_WARNING_CODES.WORK_BEFORE_DECISION,
        "decision",
        "HIGH",
        "Work evidence exists without an accepted or otherwise recorded quote decision.",
        []
      )
    );
  }
  if (completion && !work) {
    warnings.push(
      createWarning(
        LEAD_WORKFLOW_WARNING_CODES.COMPLETION_WITHOUT_WORK,
        "completion",
        "HIGH",
        "Completion evidence exists without a preceding work stage.",
        []
      )
    );
  }
  if (history && !completion) {
    warnings.push(
      createWarning(
        LEAD_WORKFLOW_WARNING_CODES.HISTORY_WITHOUT_COMPLETION,
        "history",
        "HIGH",
        "History evidence exists without completion evidence.",
        []
      )
    );
  }

  addTimestampWarnings(warnings, {
    contact: getTimestamp(
      firstValue(
        safeInput.contactedAt,
        lead.contactedAt,
        lead.customerContactedAt
      )
    ),
    information: getTimestamp(
      firstValue(
        safeInput.informationCompletedAt,
        lead.informationCompletedAt,
        lead.informationGatheredAt
      )
    ),
    appointment: getTimestamp(
      firstValue(
        appointments[0]?.completedAt,
        appointments[0]?.visitCompletedAt
      )
    ),
    quote: getTimestamp(
      firstValue(
        quotes[0]?.createdAt,
        quotes[0]?.sentAt,
        lead.quoteCreatedAt,
        lead.quoteSentAt
      )
    ),
    decision: getTimestamp(
      firstValue(
        quotes[0]?.decisionAt,
        quotes[0]?.acceptedAt,
        lead.quoteDecisionAt
      )
    ),
    work: getTimestamp(
      firstValue(workRecords[0]?.startedAt, lead.workStartedAt, lead.startedAt)
    ),
    completion: getTimestamp(
      firstValue(completions[0]?.completedAt, lead.completedAt)
    ),
    history: getTimestamp(
      firstValue(historyRecords[0]?.recordedAt, lead.archivedAt)
    ),
  });

  const stageIndexes = new Map(
    LEAD_WORKFLOW_STAGES.map((stage, index) => [stage, index])
  );
  warnings.sort(
    (left, right) =>
      stageIndexes.get(left.stage) - stageIndexes.get(right.stage) ||
      left.code.localeCompare(right.code)
  );

  return {
    compliant: warnings.length === 0,
    warnings,
    workflowStage: getWorkflowStage(evidence),
    missingStages: getMissingStages(evidence, appointmentRequired),
    riskLevel: getRiskLevel(warnings),
    evidence,
    appointmentPolicy: {
      applicable: !isEmergency,
      required: appointmentRequired,
      exception,
    },
  };
}
