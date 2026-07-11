const HISTORY_ID_FIELDS = [
  "emergencyRequestId",
  "jobId",
  "requestId",
  "projectId",
  "closureRecordId",
  "completionId",
  "conversationId",
  "scheduleId",
  "id",
];

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function firstValue(...values) {
  return values.find(hasValue);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getTypedHistoryIdentities(record = {}) {
  if (!isRecord(record)) return new Set();

  return new Set(
    HISTORY_ID_FIELDS.flatMap((field) => {
      const value = record[field];
      return hasValue(value) ? [`${field}:${String(value).trim()}`] : [];
    })
  );
}

export function isSameUnifiedHistoryJob(left = {}, right = {}) {
  const leftIdentities = getTypedHistoryIdentities(left);
  const rightIdentities = getTypedHistoryIdentities(right);

  return [...leftIdentities].some((identity) => rightIdentities.has(identity));
}

export function upsertUnifiedClosedJob(history = [], closedRecord = {}) {
  if (!isRecord(closedRecord)) return asArray(history);

  return [
    closedRecord,
    ...asArray(history).filter(
      (record) => !isSameUnifiedHistoryJob(closedRecord, record)
    ),
  ];
}

export function normalizeEmergencyClosedJob({
  emergencyRecord = {},
  completionRecord = {},
  conversationId = "",
  closedAt = new Date().toISOString(),
  closureNotes = "",
} = {}) {
  const emergencyRequestId = firstValue(
    emergencyRecord.emergencyRequestId,
    emergencyRecord.id,
    completionRecord.emergencyRequestId
  );
  const jobId = firstValue(
    completionRecord.jobId,
    emergencyRecord.jobId,
    completionRecord.requestId,
    emergencyRequestId
  );
  const resolvedConversationId = firstValue(
    conversationId,
    emergencyRecord.conversationId,
    emergencyRecord.emergencyConversationId,
    completionRecord.conversationId
  );
  const customerName = firstValue(
    completionRecord.customerName,
    completionRecord.customer,
    emergencyRecord.customerName,
    emergencyRecord.customer,
    "Emergency Customer"
  );
  const title = firstValue(
    completionRecord.title,
    completionRecord.jobTitle,
    completionRecord.service,
    emergencyRecord.title,
    emergencyRecord.service,
    "Emergency Service"
  );
  const address = firstValue(
    completionRecord.address,
    completionRecord.location,
    emergencyRecord.address,
    emergencyRecord.location,
    ""
  );
  const completedAt = firstValue(
    completionRecord.completedAt,
    completionRecord.completionDate,
    emergencyRecord.completedAt,
    closedAt
  );
  const revenue = Number(
    firstValue(
      completionRecord.revenue,
      completionRecord.finalTotal,
      completionRecord.amount,
      completionRecord.total,
      emergencyRecord.revenue,
      emergencyRecord.finalTotal,
      emergencyRecord.amount,
      emergencyRecord.total,
      0
    )
  );
  const completionNotes = firstValue(
    completionRecord.completionNotes,
    completionRecord.completionSummary,
    completionRecord.notes,
    emergencyRecord.completionNotes,
    emergencyRecord.notes,
    ""
  );
  const photos = [
    ...asArray(completionRecord.photos),
    ...asArray(completionRecord.completionPhotos),
    ...asArray(emergencyRecord.photos),
    ...asArray(emergencyRecord.completionPhotos),
  ].filter(
    (photo, index, records) =>
      records.findIndex(
        (candidate) =>
          (candidate?.id && candidate.id === photo?.id) || candidate === photo
      ) === index
  );
  const payment =
    completionRecord.payment ||
    emergencyRecord.payment || {
      status: firstValue(
        emergencyRecord.paymentStatus,
        completionRecord.paymentStatus,
        completionRecord.paymentReceived === "yes" ? "paid" : "pending",
        ""
      ),
      type: firstValue(completionRecord.paymentType, emergencyRecord.paymentType, ""),
      amount: revenue,
      paidAt: firstValue(emergencyRecord.paidAt, completionRecord.paidAt, ""),
    };
  const closureRecordId = firstValue(
    completionRecord.closureRecordId,
    emergencyRecord.closureRecordId,
    emergencyRequestId ? `emergency-closure-${emergencyRequestId}` : ""
  );
  const resolvedClosureNotes = firstValue(
    closureNotes,
    completionRecord.closureNotes,
    emergencyRecord.closureNotes,
    completionNotes
  );

  return {
    ...completionRecord,
    id: firstValue(
      completionRecord.id,
      emergencyRequestId ? `emergency-history-${emergencyRequestId}` : "",
      `emergency-history-${closedAt}`
    ),
    type: "closed_job",
    source: "emergency",
    sourceType: "emergency",
    sourceLabel: "Emergency",
    status: "closed",
    finalStatus: "Closed",
    workStatus: "closed",
    jobStage: "closed",
    closureStatus: "closed",
    readOnly: true,
    readonly: true,
    readOnlyHistory: true,
    customerId: firstValue(
      completionRecord.customerId,
      emergencyRecord.customerId,
      emergencyRecord.customerAccountId,
      ""
    ),
    customerName,
    customer: customerName,
    jobId,
    requestId: firstValue(completionRecord.requestId, emergencyRequestId, jobId, ""),
    emergencyRequestId: emergencyRequestId || "",
    conversationId: resolvedConversationId || "",
    closureRecordId: closureRecordId || "",
    service: title,
    serviceType: firstValue(
      completionRecord.serviceType,
      emergencyRecord.serviceType,
      title
    ),
    title,
    jobTitle: title,
    address,
    location: address,
    completedAt,
    completionDate: completedAt,
    closedAt,
    closeDate: closedAt,
    completionNotes,
    completionSummary: completionNotes,
    completion: {
      ...(isRecord(completionRecord.completion)
        ? completionRecord.completion
        : {}),
      completedAt,
      notes: completionNotes,
      photos,
    },
    closureNotes: resolvedClosureNotes,
    photos,
    completionPhotos: photos,
    quote: completionRecord.quote || emergencyRecord.quote || null,
    proposal:
      completionRecord.proposal ||
      emergencyRecord.proposal ||
      completionRecord.quote ||
      emergencyRecord.quote ||
      null,
    payment,
    payments: asArray(completionRecord.payments).length
      ? completionRecord.payments
      : asArray(emergencyRecord.payments).length
      ? emergencyRecord.payments
      : [payment].filter((record) => record.status || record.amount),
    invoice: completionRecord.invoice || emergencyRecord.invoice || null,
    receipt:
      completionRecord.receipt ||
      emergencyRecord.receipt ||
      completionRecord.invoice?.receipt ||
      emergencyRecord.invoice?.receipt ||
      null,
    timeline:
      completionRecord.timeline ||
      completionRecord.timelineEvents ||
      emergencyRecord.timeline ||
      emergencyRecord.timelineEvents ||
      [],
    timelineEvents:
      completionRecord.timelineEvents ||
      completionRecord.timeline ||
      emergencyRecord.timelineEvents ||
      emergencyRecord.timeline ||
      [],
    jobTimelineEvents:
      completionRecord.jobTimelineEvents ||
      completionRecord.timelineEvents ||
      completionRecord.timeline ||
      emergencyRecord.jobTimelineEvents ||
      emergencyRecord.timelineEvents ||
      emergencyRecord.timeline ||
      [],
    workflowDependencyHistory:
      completionRecord.workflowDependencyHistory ||
      emergencyRecord.workflowDependencyHistory ||
      [],
    closureRecord:
      completionRecord.closureRecord ||
      emergencyRecord.closureRecord || {
        id: closureRecordId || "",
        status: "closed",
        sourceType: "emergency",
        closedAt,
        notes: resolvedClosureNotes,
      },
    revenue,
    amount: revenue,
    finalTotal: revenue,
  };
}
