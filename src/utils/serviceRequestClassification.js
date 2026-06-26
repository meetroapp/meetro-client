export const SERVICE_REQUEST_CLASSIFICATIONS = Object.freeze({
  PROJECT: "Project",
  WORK_ORDER: "WorkOrder",
  RECURRING_SERVICE: "RecurringService",
  EMERGENCY: "Emergency",
  CONSULTATION: "Consultation",
  TRANSPORTATION_SERVICE: "TransportationService",
  MAINTENANCE_REQUEST: "MaintenanceRequest",
  UNKNOWN: "Unknown",
});

export const SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
});

const CLASSIFICATION_ORDER = Object.freeze([
  SERVICE_REQUEST_CLASSIFICATIONS.EMERGENCY,
  SERVICE_REQUEST_CLASSIFICATIONS.MAINTENANCE_REQUEST,
  SERVICE_REQUEST_CLASSIFICATIONS.TRANSPORTATION_SERVICE,
  SERVICE_REQUEST_CLASSIFICATIONS.RECURRING_SERVICE,
  SERVICE_REQUEST_CLASSIFICATIONS.PROJECT,
  SERVICE_REQUEST_CLASSIFICATIONS.WORK_ORDER,
  SERVICE_REQUEST_CLASSIFICATIONS.CONSULTATION,
  SERVICE_REQUEST_CLASSIFICATIONS.UNKNOWN,
]);

const CONFIDENCE_WEIGHT = Object.freeze({
  [SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.HIGH]: 3,
  [SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.MEDIUM]: 2,
  [SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.LOW]: 1,
});

const EMERGENCY_LEVELS = new Set(["emergency", "critical", "life_safety"]);
const URGENT_LEVELS = new Set(["urgent", "high"]);
const LOW_COMPLEXITY = new Set(["low", "simple", "routine"]);
const HIGH_COMPLEXITY = new Set(["high", "complex", "multi_phase"]);
const TENANT_ROLES = new Set(["tenant", "resident", "occupant"]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
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

function createWarning(code, message, field = "") {
  return { code, message, field };
}

function addMissing(missingInformation, field) {
  if (!missingInformation.includes(field)) missingInformation.push(field);
}

function addCandidate(candidates, classification, confidence, reasons) {
  const existing = candidates.find(
    (candidate) => candidate.classification === classification
  );
  const normalizedReasons = [...new Set(reasons.filter(Boolean))].sort();

  if (!existing) {
    candidates.push({
      classification,
      confidence,
      reasons: normalizedReasons,
    });
    return;
  }

  existing.reasons = [...new Set([...existing.reasons, ...normalizedReasons])].sort();
  if (CONFIDENCE_WEIGHT[confidence] > CONFIDENCE_WEIGHT[existing.confidence]) {
    existing.confidence = confidence;
  }
}

function getOverallConfidence(candidates) {
  if (
    candidates.length === 0 ||
    candidates[0]?.classification === SERVICE_REQUEST_CLASSIFICATIONS.UNKNOWN
  ) {
    return SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.LOW;
  }

  return candidates.reduce(
    (highest, candidate) =>
      CONFIDENCE_WEIGHT[candidate.confidence] > CONFIDENCE_WEIGHT[highest]
        ? candidate.confidence
        : highest,
    SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.LOW
  );
}

function sortCandidates(candidates) {
  return candidates.sort((first, second) => {
    const confidenceDifference =
      CONFIDENCE_WEIGHT[second.confidence] -
      CONFIDENCE_WEIGHT[first.confidence];

    if (confidenceDifference !== 0) return confidenceDifference;

    return (
      CLASSIFICATION_ORDER.indexOf(first.classification) -
      CLASSIFICATION_ORDER.indexOf(second.classification)
    );
  });
}

// Advisory read model only. It evaluates explicit Service Request evidence and
// never creates, schedules, persists, or authorizes an operational workflow.
export function classifyServiceRequest(serviceRequest = {}) {
  const request = isRecord(serviceRequest)
    ? cloneValue(serviceRequest)
    : {};
  const intent = isRecord(request.intent) ? request.intent : {};
  const information = isRecord(request.information) ? request.information : {};
  const urgency = isRecord(information.urgency) ? information.urgency : {};
  const scope = isRecord(information.scope) ? information.scope : {};
  const recurrence = isRecord(information.recurrence)
    ? information.recurrence
    : {};
  const transportation = isRecord(information.transportation)
    ? information.transportation
    : {};
  const property = isRecord(information.property) ? information.property : {};
  const consultation = isRecord(information.consultation)
    ? information.consultation
    : {};
  const condition = isRecord(information.condition) ? information.condition : {};

  const candidates = [];
  const missingInformation = [];
  const informationWarnings = [];
  const urgencyLevel = normalizeToken(urgency.level);
  const complexity = normalizeToken(scope.complexity);
  const reportedByRole = normalizeToken(property.reportedByRole);
  const hasIntent = hasValue(intent.outcome);
  const hasCategory = hasValue(request.category || request.serviceCategory);
  const hasEmergencyEvidence =
    EMERGENCY_LEVELS.has(urgencyLevel) ||
    urgency.immediateSafetyRisk === true ||
    urgency.lifeSafetyRisk === true ||
    condition.immediateHazard === true;
  const hasUrgentDamageEvidence =
    URGENT_LEVELS.has(urgencyLevel) && urgency.activeDamage === true;
  const hasHazardEvidence =
    condition.hazardousMaterials === true ||
    condition.biohazard === true ||
    condition.habitabilityRisk === true;
  const hasTransportationEvidence = [
    transportation.pickupLocation,
    transportation.destination,
    transportation.scheduledAt,
  ].filter(hasValue).length;
  const hasRecurringEvidence =
    recurrence.isRecurring === true || hasValue(recurrence.frequency);
  const hasPropertyEvidence =
    property.isManagedProperty === true ||
    TENANT_ROLES.has(reportedByRole) ||
    hasValue(property.maintenanceResponsibility);
  const hasProjectEvidence =
    HIGH_COMPLEXITY.has(complexity) ||
    scope.multiPhase === true ||
    scope.structuralChange === true ||
    scope.requiresPermits === true;
  const hasWorkOrderEvidence =
    scope.defined === true &&
    (LOW_COMPLEXITY.has(complexity) || scope.singleTask === true) &&
    recurrence.isRecurring !== true &&
    !hasEmergencyEvidence;
  const hasConsultationEvidence =
    consultation.requested === true || consultation.assessmentRequired === true;

  if (!hasIntent) addMissing(missingInformation, "intent.outcome");

  if (hasCategory) {
    informationWarnings.push(
      createWarning(
        "category-not-classification-evidence",
        "Category is retained as context but is not used to select an operational classification.",
        hasValue(request.category) ? "category" : "serviceCategory"
      )
    );
  }

  if (hasEmergencyEvidence || hasUrgentDamageEvidence) {
    addCandidate(
      candidates,
      SERVICE_REQUEST_CLASSIFICATIONS.EMERGENCY,
      hasEmergencyEvidence
        ? SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.HIGH
        : SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.MEDIUM,
      [
        hasEmergencyEvidence ? "explicit emergency or safety evidence" : "",
        hasUrgentDamageEvidence ? "urgent active damage" : "",
      ]
    );

    if (!hasValue(information.location || request.location)) {
      addMissing(missingInformation, "information.location");
    }
    if (!hasValue(urgency.reportedAt)) {
      addMissing(missingInformation, "information.urgency.reportedAt");
    }
    informationWarnings.push(
      createWarning(
        "high-risk-request-requires-review",
        "Emergency and safety-sensitive evidence requires human classification review.",
        "information.urgency"
      )
    );
  }

  if (hasTransportationEvidence > 0) {
    const transportationComplete =
      hasValue(transportation.pickupLocation) &&
      hasValue(transportation.destination) &&
      hasValue(transportation.scheduledAt);

    addCandidate(
      candidates,
      SERVICE_REQUEST_CLASSIFICATIONS.TRANSPORTATION_SERVICE,
      transportationComplete
        ? SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.HIGH
        : SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.MEDIUM,
      ["explicit transportation itinerary evidence"]
    );

    if (!hasValue(transportation.pickupLocation)) {
      addMissing(
        missingInformation,
        "information.transportation.pickupLocation"
      );
    }
    if (!hasValue(transportation.destination)) {
      addMissing(missingInformation, "information.transportation.destination");
    }
    if (!hasValue(transportation.scheduledAt)) {
      addMissing(missingInformation, "information.transportation.scheduledAt");
    }
  }

  if (hasRecurringEvidence) {
    addCandidate(
      candidates,
      SERVICE_REQUEST_CLASSIFICATIONS.RECURRING_SERVICE,
      recurrence.isRecurring === true && hasValue(recurrence.frequency)
        ? SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.HIGH
        : SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.MEDIUM,
      ["explicit recurrence evidence"]
    );

    if (!hasValue(recurrence.frequency)) {
      addMissing(missingInformation, "information.recurrence.frequency");
    }
  }

  if (hasPropertyEvidence) {
    addCandidate(
      candidates,
      SERVICE_REQUEST_CLASSIFICATIONS.MAINTENANCE_REQUEST,
      property.isManagedProperty === true &&
        hasValue(property.assetOrUnit) &&
        hasValue(property.maintenanceResponsibility)
        ? SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.HIGH
        : SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.MEDIUM,
      [
        property.isManagedProperty === true
          ? "managed property context"
          : "",
        TENANT_ROLES.has(reportedByRole) ? "tenant or resident report" : "",
        hasValue(property.maintenanceResponsibility)
          ? "maintenance responsibility evidence"
          : "",
      ]
    );

    if (!hasValue(property.assetOrUnit)) {
      addMissing(missingInformation, "information.property.assetOrUnit");
    }
    if (!hasValue(property.maintenanceResponsibility)) {
      addMissing(
        missingInformation,
        "information.property.maintenanceResponsibility"
      );
    }
  }

  if (hasProjectEvidence) {
    addCandidate(
      candidates,
      SERVICE_REQUEST_CLASSIFICATIONS.PROJECT,
      scope.defined === true
        ? SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.HIGH
        : SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.MEDIUM,
      [
        HIGH_COMPLEXITY.has(complexity) ? "high or multi-phase complexity" : "",
        scope.multiPhase === true ? "multiple work phases" : "",
        scope.structuralChange === true ? "structural change" : "",
        scope.requiresPermits === true ? "permit dependency" : "",
      ]
    );

    if (scope.defined !== true) {
      addMissing(missingInformation, "information.scope.defined");
    }
  }

  if (hasWorkOrderEvidence) {
    addCandidate(
      candidates,
      SERVICE_REQUEST_CLASSIFICATIONS.WORK_ORDER,
      SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.HIGH,
      ["defined one-time low-complexity task"]
    );
  }

  if (hasConsultationEvidence) {
    addCandidate(
      candidates,
      SERVICE_REQUEST_CLASSIFICATIONS.CONSULTATION,
      consultation.requested === true
        ? SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.HIGH
        : SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.MEDIUM,
      [
        consultation.requested === true
          ? "consultation explicitly requested"
          : "",
        consultation.assessmentRequired === true
          ? "assessment required before operational decision"
          : "",
      ]
    );

    if (!hasValue(consultation.reason)) {
      addMissing(missingInformation, "information.consultation.reason");
    }
  }

  if (hasHazardEvidence) {
    informationWarnings.push(
      createWarning(
        "hazard-evidence-requires-review",
        "Hazard, biohazard, or habitability evidence requires human review even when Emergency evidence is incomplete.",
        "information.condition"
      )
    );
  }

  if (
    urgencyLevel === "routine" &&
    (urgency.immediateSafetyRisk === true || urgency.lifeSafetyRisk === true)
  ) {
    informationWarnings.push(
      createWarning(
        "conflicting-urgency-evidence",
        "The stated urgency level conflicts with explicit safety-risk evidence.",
        "information.urgency"
      )
    );
  }

  if (candidates.length === 0) {
    addCandidate(
      candidates,
      SERVICE_REQUEST_CLASSIFICATIONS.UNKNOWN,
      SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.LOW,
      ["insufficient structured information for an operational classification"]
    );

    addMissing(missingInformation, "information.scope.defined");
    addMissing(missingInformation, "information.urgency.level");
    addMissing(missingInformation, "information.recurrence.isRecurring");
    informationWarnings.push(
      createWarning(
        "insufficient-classification-information",
        "Unknown is preserved because the request lacks sufficient structured classification evidence.",
        "information"
      )
    );
  }

  sortCandidates(candidates);

  const actionableCandidates = candidates.filter(
    (candidate) =>
      candidate.classification !== SERVICE_REQUEST_CLASSIFICATIONS.UNKNOWN
  );
  const conflictingEvidence = informationWarnings.some(
    (warning) => warning.code === "conflicting-urgency-evidence"
  );
  const highRiskEvidence =
    hasEmergencyEvidence || hasUrgentDamageEvidence || hasHazardEvidence;
  const ambiguousCandidates =
    actionableCandidates.length > 1 &&
    actionableCandidates[0].confidence === actionableCandidates[1].confidence;

  if (ambiguousCandidates) {
    informationWarnings.push(
      createWarning(
        "multiple-plausible-classifications",
        "Multiple equally supported operational paths require classification review.",
        "classificationCandidates"
      )
    );
  }

  informationWarnings.sort((first, second) =>
    `${first.field}:${first.code}`.localeCompare(`${second.field}:${second.code}`)
  );
  missingInformation.sort();

  return {
    classificationCandidates: candidates.map((candidate) => ({
      classification: candidate.classification,
      confidence: candidate.confidence,
      reasons: [...candidate.reasons],
    })),
    confidence: getOverallConfidence(candidates),
    missingInformation,
    informationWarnings,
    requiresClassificationReview:
      highRiskEvidence ||
      conflictingEvidence ||
      ambiguousCandidates ||
      candidates[0].classification === SERVICE_REQUEST_CLASSIFICATIONS.UNKNOWN ||
      (missingInformation.length > 0 &&
        getOverallConfidence(candidates) !==
          SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE.HIGH),
  };
}

