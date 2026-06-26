const APPROVED_QUOTE_STATUSES = new Set([
  "approved",
  "accepted",
  "customer_accepted",
  "quote_approved",
]);

const PAYMENT_SATISFIED_STATUSES = new Set([
  "paid",
  "deposit_received",
  "payment_received",
]);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function getVisitIdentity(schedule = {}) {
  return String(
    schedule.visitId ||
      schedule.appointmentId ||
      schedule.scheduleId ||
      schedule.id ||
      ""
  );
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasSavedEvaluationMarker(schedule = {}, evaluation = {}) {
  return Boolean(
    evaluation.savedAt ||
      evaluation.updatedAt ||
      evaluation.evaluationSavedAt ||
      evaluation.status === "saved" ||
      schedule.evaluationSavedAt ||
      schedule.evaluationStatus === "saved"
  );
}

export function getVisitEvaluation(schedule = {}) {
  return schedule.evaluation && typeof schedule.evaluation === "object"
    ? schedule.evaluation
    : {};
}

export function isEvaluationLinkedToVisit(schedule = {}, evaluation = getVisitEvaluation(schedule)) {
  const visitId = getVisitIdentity(schedule);
  if (!visitId) return false;

  const evaluationVisitIds = [
    evaluation.visitId,
    evaluation.appointmentId,
    evaluation.scheduleId,
  ]
    .map((value) => String(value || ""))
    .filter(Boolean);

  if (!evaluationVisitIds.includes(visitId)) return false;

  const scheduleCustomerId = String(
    schedule.customerId ||
      schedule.customerUid ||
      schedule.relationshipId ||
      schedule.conversationId ||
      schedule.projectConversationId ||
      schedule.customerName ||
      schedule.homeownerName ||
      ""
  );
  const evaluationCustomerId = String(evaluation.customerId || "");

  return !scheduleCustomerId || !evaluationCustomerId || scheduleCustomerId === evaluationCustomerId;
}

export function hasSavedEvaluation(evaluationSource = {}) {
  const evaluation = getVisitEvaluation(evaluationSource);

  return Boolean(
    Object.keys(evaluation).length > 0 &&
      hasSavedEvaluationMarker(evaluationSource, evaluation) &&
      isEvaluationLinkedToVisit(evaluationSource, evaluation)
  );
}

export function hasApprovedProposal(quote = {}) {
  return APPROVED_QUOTE_STATUSES.has(
    normalize(quote.status || quote.quoteStatus || quote.workflowStatus)
  );
}

export function hasPaymentOrDepositEvidence(quote = {}) {
  return Boolean(
    quote.paymentReceivedAt ||
      quote.depositPaidAt ||
      quote.paidAt ||
      PAYMENT_SATISFIED_STATUSES.has(normalize(quote.paymentStatus))
  );
}

export function canCreateProposal({ schedule = {} } = {}) {
  return hasSavedEvaluation(schedule);
}

export function canScheduleWork({ quote = {}, paymentRequired = true } = {}) {
  if (!hasApprovedProposal(quote)) return false;
  if (!paymentRequired) return true;
  return hasPaymentOrDepositEvidence(quote);
}

export function getEvaluationPayloadReadiness(evaluation = {}) {
  const requiredFields = [
    "serviceType",
    "context",
	    "evaluationTemplateMatched",
	    "templateRequirements",
	    "findings",
	    "serviceRecommendations",
	  ];
  const missingFields = requiredFields.filter((field) => {
    if (field === "evaluationTemplateMatched") {
      return typeof evaluation.evaluationTemplateMatched !== "boolean";
    }
	    if (field === "templateRequirements") {
	      return !Array.isArray(evaluation.templateRequirements);
	    }
	    if (field === "findings" || field === "serviceRecommendations") {
	      return !Array.isArray(evaluation[field]);
	    }
    return !hasValue(evaluation[field]);
  });

  return {
    ready: missingFields.length === 0,
    missingFields,
  };
}

export function getEvaluationRecommendationLineage(evaluation = {}) {
  const findings = toArray(evaluation.findings);
  const recommendations = toArray(
    evaluation.recommendations?.length
      ? evaluation.recommendations
      : evaluation.serviceRecommendations
  );
  const findingIds = new Set(
    findings
      .map((finding) => finding.id || finding.findingId || finding.findingType)
      .filter(Boolean)
  );

  const missingTrace = recommendations.filter((recommendation) => {
    const sourceFindingId =
      recommendation.sourceFindingId ||
      recommendation.findingId ||
      (Array.isArray(recommendation.sourceFindingIds)
        ? recommendation.sourceFindingIds[0]
        : "");
    if (!sourceFindingId) return true;
    return findingIds.size > 0 && !findingIds.has(sourceFindingId);
  });

  return {
    ready: missingTrace.length === 0,
    missingTrace,
  };
}

function getRecommendationId(recommendation = {}) {
  return recommendation.id || recommendation.serviceId || recommendation.serviceType || "";
}

function attachRecommendationFindingTrace(recommendation = {}, findings = []) {
  const recommendationId = getRecommendationId(recommendation);
  const sourceFindingIds = findings
    .filter((finding) =>
      toArray(finding.recommendedServices).includes(recommendationId)
    )
    .map((finding) => finding.id || finding.findingId || finding.findingType)
    .filter(Boolean);

  if (recommendation.sourceFindingId || recommendation.findingId) {
    return {
      ...recommendation,
      sourceFindingId: recommendation.sourceFindingId || recommendation.findingId,
      sourceFindingIds:
        recommendation.sourceFindingIds || sourceFindingIds,
    };
  }

  return {
    ...recommendation,
    sourceFindingId: sourceFindingIds[0] || "",
    sourceFindingIds,
  };
}

function collectEvaluationMeasurements(evaluation = {}) {
  const directMeasurements = toArray(evaluation.measurements);
  const workItemMeasurements = toArray(evaluation.workItems).flatMap((workItem) =>
    toArray(workItem.measurements).map((measurement) => ({
      ...measurement,
      workItemId: workItem.id || "",
      workItemTitle: workItem.title || "",
    }))
  );

  return directMeasurements.length > 0 ? directMeasurements : workItemMeasurements;
}

function collectEvaluationPhotos(evaluation = {}) {
  const photosById = new Map();
  [...toArray(evaluation.photos), ...toArray(evaluation.workItems).flatMap((workItem) =>
    toArray(workItem.photos).map((photo) => ({
      ...photo,
      workItemId: photo.workItemId || workItem.id || "",
      workItemTitle: photo.workItemTitle || workItem.title || "",
    }))
  )].forEach((photo, index) => {
    const key = photo.id || photo.name || `photo-${index}`;
    photosById.set(key, photo);
  });

  return [...photosById.values()];
}

export function buildVisitEvaluationPayload({
  schedule = {},
  evaluation = {},
  customerId = "",
} = {}) {
  const visitId = String(
    evaluation.visitId ||
      evaluation.appointmentId ||
      evaluation.scheduleId ||
      getVisitIdentity(schedule)
  );
  const evaluationId = String(
    evaluation.evaluationId || evaluation.id || `evaluation-${visitId || "visit"}`
  );
  const scopedCustomerId = String(
    customerId ||
      evaluation.customerId ||
      schedule.customerId ||
      schedule.customerUid ||
      schedule.relationshipId ||
      schedule.conversationId ||
      schedule.projectConversationId ||
      schedule.customerName ||
      schedule.homeownerName ||
      ""
  );
  const findings = toArray(evaluation.findings);
  const recommendations = toArray(
    evaluation.recommendations?.length
      ? evaluation.recommendations
      : evaluation.serviceRecommendations
  ).map((recommendation) =>
    attachRecommendationFindingTrace(recommendation, findings)
  );
  const observations = toArray(evaluation.observations).length
    ? toArray(evaluation.observations)
    : [
        ...new Set(
          [
            evaluation.visitNotes,
            evaluation.customerNeeds,
            evaluation.notes,
          ].filter(hasValue)
        ),
      ];

  return {
    ...evaluation,
    id: evaluationId,
    evaluationId,
    visitId,
    appointmentId: evaluation.appointmentId || visitId,
    scheduleId: evaluation.scheduleId || schedule.scheduleId || schedule.id || visitId,
    customerId: scopedCustomerId,
    observations,
    measurements: collectEvaluationMeasurements(evaluation),
    findings,
    recommendations,
    serviceRecommendations: recommendations,
    photos: collectEvaluationPhotos(evaluation),
  };
}
