import {
  CLOSURE_OBLIGATION_CATEGORIES,
  CLOSURE_OBLIGATION_STATUSES,
  evaluateClosureReadiness,
} from "./closureReadinessContract.js";

export const WORK_CENTER_OBLIGATION_STATUSES = Object.freeze({
  IDENTIFIED: "identified",
  EVIDENCE_COLLECTED: "evidence_collected",
  REVIEWED: "reviewed",
  SATISFIED: "satisfied",
  NOT_REQUIRED: "not_required",
  WAIVED: "waived",
});

const OPEN_WORK_CENTER_STATUSES = new Set([
  WORK_CENTER_OBLIGATION_STATUSES.IDENTIFIED,
  WORK_CENTER_OBLIGATION_STATUSES.EVIDENCE_COLLECTED,
  WORK_CENTER_OBLIGATION_STATUSES.REVIEWED,
]);

const SATISFIED_WORK_CENTER_STATUSES = new Set([
  WORK_CENTER_OBLIGATION_STATUSES.SATISFIED,
  WORK_CENTER_OBLIGATION_STATUSES.NOT_REQUIRED,
  WORK_CENTER_OBLIGATION_STATUSES.WAIVED,
]);

const PERMIT_CLOSED_STATUSES = new Set([
  "closed",
  "permit_closed",
  "finaled",
  "completed",
]);

const INSPECTION_PASSED_STATUSES = new Set([
  "passed",
  "inspection_passed",
  "approved",
  "completed",
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function firstValue(...values) {
  return values.find(hasValue) || "";
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function buildCompletionRecord({
  job = {},
  completion = {},
  completedAt = new Date().toISOString(),
} = {}) {
  const schedule = job.schedule || {};
  const quote = job.quote || {};
  const jobId = firstValue(
    completion.jobId,
    job.id,
    schedule.jobId,
    schedule.requestId,
    quote.requestId,
    schedule.id,
    schedule.scheduleId
  );
  const completionId = firstValue(
    completion.completionId,
    completion.id,
    schedule.completionId,
    `completion-${jobId || Date.now()}`
  );

  return {
    ...cloneValue(completion),
    id: completion.id || completionId,
    completionId,
    jobId,
    scheduleId: firstValue(completion.scheduleId, schedule.id, schedule.scheduleId),
    visitId: firstValue(completion.visitId, schedule.visitId, schedule.id),
    quoteId: firstValue(completion.quoteId, quote.quoteId, quote.id, schedule.quoteId),
    evaluationId: firstValue(
      completion.evaluationId,
      schedule.evaluation?.evaluationId,
      schedule.evaluation?.id
    ),
    customerId: firstValue(
      completion.customerId,
      job.customerId,
      schedule.customerId,
      schedule.relationshipId,
      job.conversationId,
      schedule.conversationId,
      job.customer,
      schedule.customerName
    ),
    completedAt,
    completionNotes: firstValue(
      completion.completionNotes,
      completion.notes,
      schedule.completionNotes
    ),
    completionSummary: firstValue(
      completion.completionSummary,
      completion.summary,
      completion.notes,
      schedule.completionSummary,
      schedule.completionNotes
    ),
    completionPhotos: toArray(
      completion.completionPhotos?.length
        ? completion.completionPhotos
        : completion.photos?.length
          ? completion.photos
          : schedule.completionPhotos
    ),
  };
}

function hasPaymentEvidence(job = {}) {
  const quote = job.quote || {};
  const schedule = job.schedule || {};
  return Boolean(
    quote.paymentReceivedAt ||
      quote.depositPaidAt ||
      quote.paidAt ||
      schedule.paymentReceivedAt ||
      schedule.depositPaidAt ||
      schedule.paidAt ||
      ["paid", "deposit_received", "payment_received"].includes(
        normalizeToken(quote.paymentStatus || schedule.paymentStatus)
      )
  );
}

function getCompletionRecord(job = {}) {
  const schedule = job.schedule || {};
  return schedule.completionRecord || job.completion || job.history?.completion || {};
}

function hasCompletionEvidence(job = {}) {
  const schedule = job.schedule || {};
  const completion = getCompletionRecord(job);
  return Boolean(
    completion.completedAt ||
      completion.completionId ||
      schedule.completedAt ||
      ["completed", "work_completed"].includes(
        normalizeToken(schedule.status || schedule.workStatus || schedule.jobStage)
      )
  );
}

function getCompletionPhotos(job = {}) {
  const schedule = job.schedule || {};
  const completion = getCompletionRecord(job);
  return [
    ...toArray(completion.completionPhotos),
    ...toArray(completion.photos),
    ...toArray(schedule.completionPhotos),
  ];
}

function normalizeWorkCenterObligationStatus(value) {
  const status = normalizeToken(value);
  if (status === "resolved" || status === "complete" || status === "completed") {
    return WORK_CENTER_OBLIGATION_STATUSES.SATISFIED;
  }
  if (status === "required" || status === "open" || status === "pending") {
    return WORK_CENTER_OBLIGATION_STATUSES.IDENTIFIED;
  }
  if (status === "not_required") return WORK_CENTER_OBLIGATION_STATUSES.NOT_REQUIRED;
  if (status === "waived") return WORK_CENTER_OBLIGATION_STATUSES.WAIVED;
  if (Object.values(WORK_CENTER_OBLIGATION_STATUSES).includes(status)) return status;
  return WORK_CENTER_OBLIGATION_STATUSES.IDENTIFIED;
}

function toClosureReadinessStatus(status) {
  const normalized = normalizeWorkCenterObligationStatus(status);
  if (normalized === WORK_CENTER_OBLIGATION_STATUSES.SATISFIED) {
    return CLOSURE_OBLIGATION_STATUSES.RESOLVED;
  }
  if (normalized === WORK_CENTER_OBLIGATION_STATUSES.NOT_REQUIRED) {
    return CLOSURE_OBLIGATION_STATUSES.NOT_REQUIRED;
  }
  if (normalized === WORK_CENTER_OBLIGATION_STATUSES.WAIVED) {
    return CLOSURE_OBLIGATION_STATUSES.WAIVED;
  }
  return CLOSURE_OBLIGATION_STATUSES.OPEN;
}

function createObligation({
  id,
  type,
  title,
  status,
  required = true,
  evidenceRequired = false,
  evidenceRefs = [],
  confirmationRequired = false,
  confirmationRefs = [],
  responsibleParty = "Professional",
  source = "work_center",
} = {}) {
  const normalizedStatus = normalizeWorkCenterObligationStatus(status);
  return {
    id,
    type,
    category: type,
    title,
    status: normalizedStatus,
    required,
    evidenceRequired,
    evidenceRefs: toArray(evidenceRefs),
    confirmationRequired,
    confirmationRefs: toArray(confirmationRefs),
    responsibleParty,
    source,
  };
}

function getExplicitObligations(job = {}) {
  const schedule = job.schedule || {};
  const history = job.history || {};
  return [
    ...toArray(schedule.closureObligations),
    ...toArray(schedule.complianceObligations),
    ...toArray(history.closureObligations),
    ...toArray(job.closureObligations),
  ].map((obligation, index) =>
    createObligation({
      ...obligation,
      id: obligation.id || obligation.obligationId || `explicit-obligation-${index + 1}`,
      type:
        obligation.type ||
        obligation.category ||
        CLOSURE_OBLIGATION_CATEGORIES.FUTURE,
      title: obligation.title || obligation.name || "Closure obligation",
      source: obligation.source || "explicit_closure_obligation",
    })
  );
}

function getPermitObligations(job = {}) {
  const schedule = job.schedule || {};
  const permitRecords = [
    ...toArray(schedule.permits),
    ...toArray(schedule.permitRecords),
    ...toArray(job.permits),
    ...toArray(job.permitRecords),
  ];
  const inspectionRecords = [
    ...toArray(schedule.inspections),
    ...toArray(schedule.inspectionRecords),
    ...toArray(job.inspections),
    ...toArray(job.inspectionRecords),
  ];
  const permitRequired =
    schedule.permitRequired === true ||
    job.permitRequired === true ||
    permitRecords.length > 0;
  const inspectionRequired =
    schedule.inspectionRequired === true ||
    job.inspectionRequired === true ||
    inspectionRecords.length > 0;

  const obligations = [];
  if (permitRequired) {
    const permitClosed = permitRecords.some((permit) =>
      PERMIT_CLOSED_STATUSES.has(normalizeToken(permit.status || permit.permitStatus))
    );
    obligations.push(
      createObligation({
        id: "permit-closure",
        type: CLOSURE_OBLIGATION_CATEGORIES.PERMIT,
        title: "Permit Closed",
        status: permitClosed
          ? WORK_CENTER_OBLIGATION_STATUSES.SATISFIED
          : WORK_CENTER_OBLIGATION_STATUSES.IDENTIFIED,
        evidenceRequired: true,
        evidenceRefs: permitClosed ? ["permit-closed"] : [],
        source: "permit_center_alignment",
      })
    );
  }

  if (inspectionRequired) {
    const inspectionPassed = inspectionRecords.some((inspection) =>
      INSPECTION_PASSED_STATUSES.has(
        normalizeToken(inspection.status || inspection.inspectionStatus)
      )
    );
    obligations.push(
      createObligation({
        id: "inspection-passed",
        type: CLOSURE_OBLIGATION_CATEGORIES.INSPECTION,
        title: "Inspection Passed",
        status: inspectionPassed
          ? WORK_CENTER_OBLIGATION_STATUSES.SATISFIED
          : WORK_CENTER_OBLIGATION_STATUSES.IDENTIFIED,
        evidenceRequired: true,
        evidenceRefs: inspectionPassed ? ["inspection-passed"] : [],
        source: "permit_center_alignment",
      })
    );
  }

  return obligations;
}

export function getWorkCenterClosureObligations(job = {}) {
  const completionPhotos = getCompletionPhotos(job);
  const requiresCompletionPhotos =
    job.requiredCompletionPhotos === true ||
    job.schedule?.requiredCompletionPhotos === true ||
    job.schedule?.requiresCompletionPhotos === true;

  return [
    createObligation({
      id: "payment-requirements-satisfied",
      type: CLOSURE_OBLIGATION_CATEGORIES.PAYMENT,
      title: "Payment Requirements Satisfied",
      status: hasPaymentEvidence(job)
        ? WORK_CENTER_OBLIGATION_STATUSES.SATISFIED
        : WORK_CENTER_OBLIGATION_STATUSES.IDENTIFIED,
      confirmationRequired: true,
      confirmationRefs: hasPaymentEvidence(job) ? ["payment-recorded"] : [],
    }),
    createObligation({
      id: "completion-report-generated",
      type: CLOSURE_OBLIGATION_CATEGORIES.REQUIRED_DOCUMENTATION,
      title: "Completion Report Generated",
      status: hasCompletionEvidence(job)
        ? WORK_CENTER_OBLIGATION_STATUSES.SATISFIED
        : WORK_CENTER_OBLIGATION_STATUSES.IDENTIFIED,
      evidenceRequired: true,
      evidenceRefs: hasCompletionEvidence(job) ? ["completion-record"] : [],
    }),
    createObligation({
      id: "required-completion-photos",
      type: CLOSURE_OBLIGATION_CATEGORIES.REQUIRED_DOCUMENTATION,
      title: "Required Completion Photos Uploaded",
      status: requiresCompletionPhotos
        ? completionPhotos.length > 0
          ? WORK_CENTER_OBLIGATION_STATUSES.SATISFIED
          : WORK_CENTER_OBLIGATION_STATUSES.IDENTIFIED
        : WORK_CENTER_OBLIGATION_STATUSES.NOT_REQUIRED,
      required: requiresCompletionPhotos,
      evidenceRequired: requiresCompletionPhotos,
      evidenceRefs: completionPhotos.length > 0 ? ["completion-photos"] : [],
    }),
    ...getExplicitObligations(job),
    ...getPermitObligations(job),
  ];
}

function toReadinessObligation(obligation) {
  return {
    ...cloneValue(obligation),
    category: obligation.type || obligation.category,
    status: toClosureReadinessStatus(obligation.status),
  };
}

function getClosureEvidence(job = {}) {
  const evidence = [];
  if (hasCompletionEvidence(job)) evidence.push({ id: "completion-record" });
  if (getCompletionPhotos(job).length > 0) evidence.push({ id: "completion-photos" });
  if (getPermitObligations(job).some((obligation) => obligation.id === "permit-closure" && SATISFIED_WORK_CENTER_STATUSES.has(obligation.status))) {
    evidence.push({ id: "permit-closed" });
  }
  if (getPermitObligations(job).some((obligation) => obligation.id === "inspection-passed" && SATISFIED_WORK_CENTER_STATUSES.has(obligation.status))) {
    evidence.push({ id: "inspection-passed" });
  }
  return evidence;
}

function getClosureConfirmations(job = {}) {
  return hasPaymentEvidence(job) ? [{ id: "payment-recorded" }] : [];
}

export function evaluateWorkCenterClosureReadiness(job = {}) {
  const schedule = job.schedule || {};
  const obligations = getWorkCenterClosureObligations(job);
  const readiness = evaluateClosureReadiness({
    aggregateId: firstValue(
      job.id,
      schedule.jobId,
      schedule.requestId,
      schedule.id,
      schedule.scheduleId
    ),
    aggregateType: "WorkCenterJob",
    completionStatus: hasCompletionEvidence(job) ? "completed" : "",
    obligations: obligations.map(toReadinessObligation),
    evidence: getClosureEvidence(job),
    confirmations: getClosureConfirmations(job),
    outstandingItems: toArray(schedule.outstandingItems),
  });

  return {
    ...readiness,
    obligations,
    satisfiedObligations: obligations.filter((obligation) =>
      SATISFIED_WORK_CENTER_STATUSES.has(obligation.status)
    ),
    outstandingObligations: obligations.filter((obligation) =>
      OPEN_WORK_CENTER_STATUSES.has(obligation.status)
    ),
    closureEligibility: readiness.closureReady ? "eligible" : "blocked",
  };
}

export function buildClosureRecord({
  job = {},
  reviewedAt = new Date().toISOString(),
  closedAt = reviewedAt,
  notes = "",
} = {}) {
  const readiness = evaluateWorkCenterClosureReadiness(job);
  const schedule = job.schedule || {};
  const completion = getCompletionRecord(job);
  const jobId = firstValue(
    job.id,
    schedule.jobId,
    schedule.requestId,
    schedule.id,
    schedule.scheduleId
  );

  return {
    closureId: `closure-${jobId || Date.now()}`,
    jobId,
    customerId: firstValue(
      job.customerId,
      schedule.customerId,
      schedule.relationshipId,
      job.conversationId,
      schedule.conversationId,
      job.customer,
      schedule.customerName
    ),
    completionId: firstValue(completion.completionId, completion.id, schedule.completionId),
    obligations: readiness.obligations,
    outstandingObligations: readiness.outstandingObligations,
    satisfiedObligations: readiness.satisfiedObligations,
    blockers: readiness.blockers,
    reviewedAt,
    closureAuthorized: readiness.closureReady,
    closedAt: readiness.closureReady ? closedAt : "",
    closureNotes: notes,
  };
}
