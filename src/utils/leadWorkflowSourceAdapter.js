export const LEAD_WORKFLOW_SOURCE_TYPES = Object.freeze({
  BUSINESS_LEADS: "businessLeads",
  CONTRACTOR_DASHBOARD: "contractorDashboard",
  SCHEDULING: "scheduling",
  QUOTES: "quotes",
  EMERGENCY: "emergency",
  LEGACY: "legacy",
});

const SUPPORTED_SOURCES = new Set(Object.values(LEAD_WORKFLOW_SOURCE_TYPES));

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function firstValue(...values) {
  return values.find(hasValue);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      cloneValue(nestedValue),
    ])
  );
}

function asRecords(value) {
  if (Array.isArray(value)) return value.filter(isRecord).map(cloneValue);
  return isRecord(value) ? [cloneValue(value)] : [];
}

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function createWarning(code, message, field = "") {
  return { code, message, field };
}

function copyDefined(target, source, fields) {
  fields.forEach((field) => {
    if (source[field] !== undefined) target[field] = cloneValue(source[field]);
  });
}

function getExplicitIdentity(record) {
  const projectId = firstValue(record.projectId, record.project_id);
  const requestId = firstValue(
    record.requestId,
    record.request_id,
    record.quoteRequestId
  );
  const postId = firstValue(record.postId);

  return {
    projectId: hasValue(projectId) ? String(projectId) : "",
    requestId: hasValue(requestId) ? String(requestId) : "",
    postId: hasValue(postId) ? String(postId) : "",
  };
}

function createLead(record, source, warnings) {
  const identity = getExplicitIdentity(record);
  const lead = {
    ...identity,
    source,
  };

  copyDefined(lead, record, [
    "status",
    "workflowStatus",
    "workflowType",
    "requestType",
    "type",
    "customerContacted",
    "contacted",
    "contactComplete",
    "contactedAt",
    "customerContactedAt",
    "contactCompletedAt",
    "informationComplete",
    "detailsComplete",
    "informationGathered",
    "informationCompletedAt",
    "informationGatheredAt",
    "appointmentRequired",
    "appointmentPolicy",
    "appointmentException",
    "quoteId",
    "quoteCreatedAt",
    "quoteSentAt",
    "quoteDecision",
    "quoteDecisionAt",
    "acceptedQuote",
    "workStartedAt",
    "startedAt",
    "activeWorkId",
    "completionId",
    "completedAt",
    "savedToHistory",
    "saved_to_history",
    "historyId",
    "archivedAt",
  ]);

  if (!identity.projectId && !identity.requestId && !identity.postId) {
    warnings.push(
      createWarning(
        "missing-explicit-source-identity",
        "No explicit project, request, quote-request, or post identity is available.",
        "identity"
      )
    );
  }

  if (
    !identity.projectId &&
    !identity.requestId &&
    !identity.postId &&
    hasValue(record.id)
  ) {
    warnings.push(
      createWarning(
        "generic-id-preserved-not-promoted",
        "The source-local id is preserved in provenance but is not promoted to canonical lead identity.",
        "id"
      )
    );
  }

  return lead;
}

function getCommonInput(record, context, source, warnings) {
  const lead = createLead(record, source, warnings);
  const input = {
    lead,
    appointments: asRecords(
      firstValue(context.appointments, record.appointments, record.appointment)
    ),
    quotes: asRecords(
      firstValue(context.quotes, record.quotes, record.quotesReceived)
    ),
    work: asRecords(
      firstValue(
        context.work,
        context.workRecords,
        record.work,
        record.activeWork,
        record.job
      )
    ),
    completions: asRecords(
      firstValue(context.completions, record.completions, record.completion)
    ),
    history: asRecords(firstValue(context.history, record.history)),
  };

  copyDefined(input, context, [
    "customerContacted",
    "contactedAt",
    "informationComplete",
    "informationCompletedAt",
    "appointmentRequired",
    "appointmentException",
    "workflowType",
    "isEmergency",
  ]);

  if (
    input.appointmentException === undefined &&
    record.appointmentException !== undefined
  ) {
    input.appointmentException = cloneValue(record.appointmentException);
  }
  if (
    input.appointmentRequired === undefined &&
    record.appointmentRequired !== undefined
  ) {
    input.appointmentRequired = record.appointmentRequired;
  }

  return input;
}

function adaptBusinessLead(record, context, warnings) {
  const input = getCommonInput(
    record,
    context,
    LEAD_WORKFLOW_SOURCE_TYPES.BUSINESS_LEADS,
    warnings
  );

  if (!input.lead.postId && hasValue(record.postId)) {
    input.lead.postId = String(record.postId);
  }

  return input;
}

function adaptContractorDashboard(record, context, warnings) {
  const input = getCommonInput(
    record,
    context,
    LEAD_WORKFLOW_SOURCE_TYPES.CONTRACTOR_DASHBOARD,
    warnings
  );

  input.appointments = [
    ...input.appointments,
    ...asRecords(firstValue(record.schedule, context.schedule)),
  ];
  input.work = [
    ...input.work,
    ...asRecords(firstValue(context.activeWork, context.activeJob)),
  ];

  return input;
}

function adaptSchedule(record, context, warnings) {
  const input = getCommonInput(
    context.lead || record,
    context,
    LEAD_WORKFLOW_SOURCE_TYPES.SCHEDULING,
    warnings
  );
  const scheduleRecord = cloneValue(record);

  if (!input.lead.projectId && !input.lead.requestId && !input.lead.postId) {
    const identity = getExplicitIdentity(record);
    Object.assign(input.lead, identity);
  }

  input.appointments = [scheduleRecord, ...input.appointments];

  if (
    normalizeToken(record.status) === "completed" &&
    !hasValue(record.visitOutcome) &&
    !hasValue(record.outcome) &&
    !hasValue(record.projectOutcome)
  ) {
    warnings.push(
      createWarning(
        "completed-appointment-outcome-unavailable",
        "The completed schedule record has no explicit visit outcome.",
        "visitOutcome"
      )
    );
  }

  return input;
}

function adaptQuote(record, context, warnings) {
  const input = getCommonInput(
    context.lead || record,
    context,
    LEAD_WORKFLOW_SOURCE_TYPES.QUOTES,
    warnings
  );
  const quoteRecord = cloneValue(record);

  if (!input.lead.projectId && !input.lead.requestId && !input.lead.postId) {
    const identity = getExplicitIdentity(record);
    Object.assign(input.lead, identity);
  }

  input.quotes = [quoteRecord, ...input.quotes];

  if (
    ["converted_to_job", "completed"].includes(
      normalizeToken(firstValue(record.status, record.quoteStatus))
    ) &&
    !hasValue(record.projectId) &&
    !hasValue(record.requestId) &&
    !hasValue(record.quoteRequestId)
  ) {
    warnings.push(
      createWarning(
        "quote-lifecycle-identity-unavailable",
        "The quote lifecycle status cannot be safely connected to a project.",
        "identity"
      )
    );
  }

  return input;
}

function adaptEmergency(record, context, warnings) {
  const emergencyId = firstValue(
    record.emergencyRequestId,
    record.emergencyId,
    record.requestId,
    record.id
  );
  const emergencyRecord = {
    ...record,
    requestId: hasValue(emergencyId) ? String(emergencyId) : "",
    workflowType: "emergency",
    isEmergency: true,
  };
  const input = getCommonInput(
    emergencyRecord,
    {
      ...context,
      workflowType: "emergency",
      isEmergency: true,
      appointmentRequired: false,
    },
    LEAD_WORKFLOW_SOURCE_TYPES.EMERGENCY,
    warnings
  );
  const status = normalizeToken(record.status);

  input.lead.emergencyRequestId = hasValue(emergencyId)
    ? String(emergencyId)
    : "";
  input.lead.conversationId = hasValue(record.conversationId)
    ? String(record.conversationId)
    : "";

  if (["accepted", "enroute", "arrived", "started"].includes(status)) {
    input.work = [cloneValue(record), ...input.work];
  }
  if (status === "completed" || hasValue(record.completedAt)) {
    input.completions = [cloneValue(record), ...input.completions];
  }
  if (
    record.savedToHistory === true ||
    record.saved_to_history === true ||
    hasValue(record.archivedAt)
  ) {
    input.history = [cloneValue(record), ...input.history];
  }

  return input;
}

function adaptLegacy(record, context, warnings) {
  warnings.push(
    createWarning(
      "legacy-shape-requires-source-review",
      "The record is evaluated through the generic compatibility shape and retains unknown fields only in provenance.",
      "source"
    )
  );
  return getCommonInput(
    record,
    context,
    LEAD_WORKFLOW_SOURCE_TYPES.LEGACY,
    warnings
  );
}

function getAdapter(source) {
  return {
    [LEAD_WORKFLOW_SOURCE_TYPES.BUSINESS_LEADS]: adaptBusinessLead,
    [LEAD_WORKFLOW_SOURCE_TYPES.CONTRACTOR_DASHBOARD]:
      adaptContractorDashboard,
    [LEAD_WORKFLOW_SOURCE_TYPES.SCHEDULING]: adaptSchedule,
    [LEAD_WORKFLOW_SOURCE_TYPES.QUOTES]: adaptQuote,
    [LEAD_WORKFLOW_SOURCE_TYPES.EMERGENCY]: adaptEmergency,
    [LEAD_WORKFLOW_SOURCE_TYPES.LEGACY]: adaptLegacy,
  }[source];
}

// Compatibility-only normalization for warning and fixture analysis. It never
// reads source stores, joins records by display text, or grants workflow state.
export function adaptLeadWorkflowSource({
  source,
  record,
  context = {},
} = {}) {
  const normalizedSource = SUPPORTED_SOURCES.has(source)
    ? source
    : LEAD_WORKFLOW_SOURCE_TYPES.LEGACY;
  const safeRecord = isRecord(record) ? record : {};
  const safeContext = isRecord(context) ? context : {};
  const warnings = [];

  if (normalizedSource !== source) {
    warnings.push(
      createWarning(
        "unsupported-source-treated-as-legacy",
        "The source is not registered and was evaluated through the legacy adapter.",
        "source"
      )
    );
  }
  if (!isRecord(record)) {
    warnings.push(
      createWarning(
        "invalid-source-record",
        "A source record object is required.",
        "record"
      )
    );
  }

  const input = getAdapter(normalizedSource)(
    safeRecord,
    safeContext,
    warnings
  );
  const identity = getExplicitIdentity(input.lead);

  return {
    id: String(
      firstValue(
        identity.projectId,
        identity.requestId,
        identity.postId,
        safeRecord.emergencyRequestId,
        safeRecord.emergencyId,
        safeRecord.id,
        ""
      )
    ),
    source: normalizedSource,
    input,
    provenance: {
      source: normalizedSource,
      sourceRecordId: hasValue(safeRecord.id)
        ? String(safeRecord.id)
        : "",
      projectId: identity.projectId,
      requestId: identity.requestId,
      postId: identity.postId,
      identityFields: Object.entries(identity)
        .filter(([, value]) => hasValue(value))
        .map(([field]) => field),
      warnings: warnings.map(cloneValue),
      sourceRecord: cloneValue(safeRecord),
    },
  };
}

export function adaptLeadWorkflowSources(entries = []) {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => adaptLeadWorkflowSource(entry));
}
