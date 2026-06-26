import {
  SUPPORTED_AGGREGATE_TYPES,
  validateOperationalAggregateAuthority,
} from "./operationalAggregateAuthority.js";

const SOURCE_TYPES = Object.freeze({
  SERVICE_REQUEST: "serviceRequest",
  LEAD: "lead",
  REQUEST: "request",
  AGGREGATE: "aggregate",
  PROJECT: "project",
  WORK_ORDER: "workOrder",
  RECURRING_SERVICE: "recurringService",
  CONVERSATION: "conversation",
  SCHEDULE: "schedule",
  QUOTE: "quote",
  EMERGENCY: "emergency",
  COMPLETION: "completion",
  CLOSURE: "closure",
  HISTORY: "history",
  TIMELINE: "timeline",
  RELATIONSHIP: "relationship",
  CONTACT: "contact",
  COMPATIBILITY: "compatibility",
});

const PROVENANCE_FIELDS = Object.freeze([
  "sourceDomain",
  "sourceId",
  "createdBy",
  "createdAt",
  "updatedBy",
  "updatedAt",
  "decisionProvenance",
  "backendAcknowledgementStatus",
]);

const COLLISION_PREFIX = "aggregate-id-collides-";
const CLASSIFICATION_CODES = new Set([
  "unsupported-classification",
  "classification-evidence-not-preserved",
  "classification-confidence-missing",
  "classification-review-status-missing",
  "classification-provenance-missing",
  "classification-cannot-create-aggregate-id",
  "classification-aggregate-type-conflict",
]);
const COMPLETION_CODES = new Set([
  "completion-id-required",
  "completion-aggregate-reference-required",
  "completion-aggregate-context-unavailable",
  "completion-aggregate-id-conflict",
  "completion-cannot-change-aggregate-type",
  "completion-cannot-authorize-closure",
]);
const CLOSURE_CODES = new Set([
  "closure-aggregate-reference-required",
  "closure-aggregate-id-conflict",
  "closure-aggregate-type-conflict",
  "closure-cannot-own-source-evidence",
  "closure-based-only-on-completion",
  "closure-authority-from-non-authoritative-state",
  "closure-authorization-unresolved",
  "history-authority-overreach",
]);
const RECURRING_CODES = new Set([
  "recurring-scope-required",
  "unsupported-recurring-scope",
  "recurring-scope-id-required",
  "recurring-parent-scope-conflict",
  "recurring-cycle-scope-conflict",
  "recurring-occurrence-scope-conflict",
  "recurring-parent-provenance-missing",
  "recurring-occurrence-cannot-close-parent",
  "recurring-occurrence-closure-cannot-close-parent",
]);
const COMPATIBILITY_CODES = new Set([
  "compatibility-id-required",
  "compatibility-provenance-required",
  "compatibility-warning-required",
  "compatibility-id-cannot-be-authority",
  "display-match-cannot-be-authority",
]);
const OPERATIONAL_SOURCE_TYPES = new Set([
  SOURCE_TYPES.AGGREGATE,
  SOURCE_TYPES.PROJECT,
  SOURCE_TYPES.WORK_ORDER,
  SOURCE_TYPES.RECURRING_SERVICE,
  SOURCE_TYPES.EMERGENCY,
  SOURCE_TYPES.COMPLETION,
  SOURCE_TYPES.CLOSURE,
]);

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasValue = (value) =>
  (typeof value === "string" && value.trim().length > 0) ||
  (typeof value !== "string" && value !== null && value !== undefined);

const clone = (value) => {
  if (Array.isArray(value)) return value.map(clone);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, clone(nested)]),
  );
};

const readValue = (record, fields) => {
  if (!isRecord(record)) return null;
  for (const field of fields) {
    if (hasValue(record[field])) return record[field];
  }
  return null;
};

const toSourceType = (fixture) =>
  String(
    readValue(fixture, ["sourceType", "family", "source"]) || "unknown",
  );

const finding = (fixtureId, sourceType, code, field, message, severity) => ({
  fixtureId,
  sourceType,
  code,
  field,
  message,
  severity,
});

const pushUnique = (target, entry) => {
  const exists = target.some(
    (item) =>
      item.fixtureId === entry.fixtureId &&
      item.code === entry.code &&
      item.field === entry.field,
  );
  if (!exists) target.push(entry);
};

const classificationFromRecord = (record) => {
  if (isRecord(record.classificationRef)) return clone(record.classificationRef);
  const classification = readValue(record, [
    "classification",
    "classificationType",
  ]);
  if (!hasValue(classification)) return null;
  return {
    classification,
    recommendedAggregateType:
      record.recommendedAggregateType || classification,
    ...(Object.hasOwn(record, "classificationEvidence")
      ? { evidence: clone(record.classificationEvidence) }
      : {}),
    ...(hasValue(record.classificationConfidence)
      ? { confidence: record.classificationConfidence }
      : {}),
    ...(hasValue(record.classificationReviewStatus)
      ? { reviewStatus: record.classificationReviewStatus }
      : {}),
    ...(isRecord(record.classificationProvenance)
      ? { provenance: clone(record.classificationProvenance) }
      : {}),
    ...(Object.hasOwn(record, "priorClassificationHistory")
      ? { priorClassificationHistory: clone(record.priorClassificationHistory) }
      : {}),
  };
};

const aggregateFromRecord = (record, sourceType) => {
  if (isRecord(record.operationalAggregateRef)) {
    return clone(record.operationalAggregateRef);
  }
  const aggregateId = readValue(record, ["aggregateId"]);
  const aggregateType =
    readValue(record, ["aggregateType"]) ||
    (sourceType === SOURCE_TYPES.PROJECT
      ? "Project"
      : sourceType === SOURCE_TYPES.WORK_ORDER
        ? "WorkOrder"
        : sourceType === SOURCE_TYPES.RECURRING_SERVICE
          ? "RecurringService"
          : null);
  if (!hasValue(aggregateId) && !hasValue(aggregateType)) return null;
  return {
    ...(hasValue(aggregateId) ? { aggregateId } : {}),
    ...(hasValue(aggregateType) ? { aggregateType } : {}),
    ...(isRecord(record.scope) ? { scope: clone(record.scope) } : {}),
    ...(hasValue(record.emergencyId)
      ? { emergencyId: record.emergencyId }
      : {}),
    ...(hasValue(record.sourceEmergencyId)
      ? { sourceEmergencyId: record.sourceEmergencyId }
      : {}),
  };
};

const serviceRequestFromRecord = (record) => {
  const serviceRequestId = readValue(record, ["serviceRequestId", "requestId"]);
  if (!hasValue(serviceRequestId) && !hasValue(record.emergencyId)) return null;
  return {
    ...(hasValue(serviceRequestId) ? { serviceRequestId } : {}),
    ...(hasValue(record.emergencyId)
      ? { emergencyId: record.emergencyId }
      : {}),
  };
};

const buildAuthorityContext = (fixture, sourceType, record) => {
  if (isRecord(fixture.authorityContext)) {
    return clone(fixture.authorityContext);
  }

  const context = {};
  const classificationRef = classificationFromRecord(record);
  const operationalAggregateRef = aggregateFromRecord(record, sourceType);
  const serviceRequestRef = serviceRequestFromRecord(record);

  if (classificationRef) context.classificationRef = classificationRef;
  if (operationalAggregateRef) {
    context.operationalAggregateRef = operationalAggregateRef;
  }
  if (serviceRequestRef) context.serviceRequestRef = serviceRequestRef;

  if (
    [SOURCE_TYPES.SERVICE_REQUEST, SOURCE_TYPES.LEAD, SOURCE_TYPES.REQUEST].includes(
      sourceType,
    ) &&
    !context.serviceRequestRef
  ) {
    context.serviceRequestRef = clone(record);
  }
  if (sourceType === SOURCE_TYPES.CONVERSATION) {
    context.conversationRefs = [clone(record)];
  }
  if (sourceType === SOURCE_TYPES.SCHEDULE) {
    context.scheduleRefs = [clone(record)];
  }
  if (sourceType === SOURCE_TYPES.QUOTE) {
    context.quoteRefs = [clone(record)];
  }
  if (sourceType === SOURCE_TYPES.EMERGENCY && !context.serviceRequestRef) {
    context.serviceRequestRef = clone(record);
  }
  if (sourceType === SOURCE_TYPES.COMPLETION) {
    context.completionRefs = [clone(record)];
  }
  if (sourceType === SOURCE_TYPES.CLOSURE) {
    context.closureRef = clone(record);
  }
  if ([SOURCE_TYPES.HISTORY, SOURCE_TYPES.TIMELINE].includes(sourceType)) {
    context.historyRefs = [clone(record)];
  }
  if ([SOURCE_TYPES.RELATIONSHIP, SOURCE_TYPES.CONTACT].includes(sourceType)) {
    context.relationshipRefs = [clone(record)];
  }
  if (sourceType === SOURCE_TYPES.COMPATIBILITY) {
    context.compatibilityRefs = [clone(record)];
  }

  return context;
};

const isOperationallyImplied = (fixture, sourceType, record, context) => {
  if (fixture.operationalBehaviorImplied === true) return true;
  if (fixture.operationalBehaviorImplied === false) return false;
  if (OPERATIONAL_SOURCE_TYPES.has(sourceType)) return true;
  if (
    hasValue(record.workStatus) ||
    hasValue(record.jobStatus) ||
    record.workStarted === true ||
    record.completed === true ||
    record.isCompleted === true
  ) {
    return true;
  }
  return Boolean(
    context.completionRefs?.length ||
      context.closureRef ||
      context.operationalAggregateRef,
  );
};

const allAuthorityFindings = (result) => [
  ...result.errors,
  ...result.warnings,
  ...result.reviewRequired,
];

const addValidatorFindings = (
  result,
  fixtureId,
  sourceType,
  sections,
) => {
  allAuthorityFindings(result).forEach((item) => {
    const entry = finding(
      fixtureId,
      sourceType,
      item.code,
      item.field,
      item.message,
      result.errors.includes(item) ? "BLOCKER" : "REVIEW",
    );

    if (item.code.startsWith(COLLISION_PREFIX)) {
      pushUnique(sections.collisions, entry);
    }
    if (CLASSIFICATION_CODES.has(item.code)) {
      pushUnique(sections.classificationContinuity, entry);
    }
    if (COMPLETION_CODES.has(item.code)) {
      pushUnique(sections.completionCoverage, entry);
    }
    if (CLOSURE_CODES.has(item.code)) {
      pushUnique(sections.closureReadiness, entry);
    }
    if (RECURRING_CODES.has(item.code)) {
      pushUnique(sections.recurringScopeReadiness, entry);
    }
    if (COMPATIBILITY_CODES.has(item.code)) {
      pushUnique(sections.compatibilityRisks, entry);
    }
  });
};

const characterizeClassification = (
  fixtureId,
  sourceType,
  classificationRef,
  section,
) => {
  if (!classificationRef) return;
  const requirements = [
    ["classification", ["classification", "classificationType"]],
    ["evidence", ["evidence"]],
    ["confidence", ["confidence"]],
    ["reviewStatus", ["reviewStatus"]],
    ["provenance", ["provenance"]],
    ["priorClassificationHistory", ["priorClassificationHistory"]],
  ];

  requirements.forEach(([label, fields]) => {
    const isEvidence = label === "evidence";
    const isHistory = label === "priorClassificationHistory";
    const present = fields.some((field) =>
      isEvidence || isHistory
        ? Object.hasOwn(classificationRef, field)
        : hasValue(classificationRef[field]),
    );
    if (present) return;
    pushUnique(
      section,
      finding(
        fixtureId,
        sourceType,
        `classification-${label}-missing`,
        `classificationRef.${label}`,
        `Classification continuity does not preserve ${label}.`,
        "REVIEW",
      ),
    );
  });
};

const characterizeCompletion = (
  fixtureId,
  sourceType,
  completionRefs,
  aggregateRef,
  section,
) => {
  completionRefs.forEach((completion, index) => {
    const checks = [
      ["completionId", ["completionId"]],
      ["aggregateId", ["aggregateId"]],
      ["aggregateType", ["aggregateType"]],
      ["workPerformedStatus", ["workPerformedStatus", "completionStatus"]],
      ["completionTimestamp", ["completionAt", "completedAt", "recordedAt"]],
      ["performerIdentity", ["performerId", "actorId", "completedBy"]],
    ];

    checks.forEach(([label, fields]) => {
      if (fields.some((field) => hasValue(completion[field]))) return;
      pushUnique(
        section,
        finding(
          fixtureId,
          sourceType,
          `completion-${label}-missing`,
          `completionRefs[${index}].${label}`,
          `Completion coverage does not preserve ${label}.`,
          ["completionId", "aggregateId", "aggregateType"].includes(label)
            ? "BLOCKER"
            : "REVIEW",
        ),
      );
    });

    if (
      aggregateRef &&
      hasValue(completion.aggregateType) &&
      completion.aggregateType !== aggregateRef.aggregateType
    ) {
      pushUnique(
        section,
        finding(
          fixtureId,
          sourceType,
          "completion-aggregate-type-mismatch",
          `completionRefs[${index}].aggregateType`,
          "Completion type does not match the referenced Operational Aggregate type.",
          "BLOCKER",
        ),
      );
    }
  });
};

const characterizeClosure = (
  fixtureId,
  sourceType,
  closureRef,
  section,
) => {
  if (!closureRef) return;
  const requirements = [
    ["aggregate-reference", ["aggregateId"]],
    ["obligation-registry-reference", ["obligationRegistryRef"]],
    ["source-evidence-references", ["sourceEvidenceRefs", "evidenceRefs"]],
    ["obligation-status", ["unresolvedObligationStatus", "obligationStatus"]],
    ["review-status", ["reviewStatus", "authorizationStatus"]],
  ];

  requirements.forEach(([label, fields]) => {
    if (fields.some((field) => hasValue(closureRef[field]))) return;
    pushUnique(
      section,
      finding(
        fixtureId,
        sourceType,
        `closure-${label}-missing`,
        `closureRef.${label}`,
        `Closure readiness does not preserve ${label}.`,
        "REVIEW",
      ),
    );
  });
};

const characterizeRecurring = (
  fixtureId,
  sourceType,
  aggregateRef,
  completionRefs,
  section,
) => {
  if (aggregateRef?.aggregateType !== "RecurringService") return;
  const scope = aggregateRef.scope;
  if (!isRecord(scope)) return;

  if (
    scope.scopeType === "occurrence" &&
    !hasValue(scope.occurrenceId)
  ) {
    pushUnique(
      section,
      finding(
        fixtureId,
        sourceType,
        "recurring-occurrence-identity-missing",
        "operationalAggregateRef.scope.occurrenceId",
        "RecurringService occurrence scope lacks occurrence identity.",
        "BLOCKER",
      ),
    );
  }

  completionRefs.forEach((completion, index) => {
    if (
      scope.scopeType === "occurrence" &&
      completion.closesParentService === true
    ) {
      pushUnique(
        section,
        finding(
          fixtureId,
          sourceType,
          "recurring-occurrence-completion-closes-parent",
          `completionRefs[${index}].closesParentService`,
          "Occurrence Completion appears to close the parent RecurringService.",
          "BLOCKER",
        ),
      );
    }
  });
};

const characterizeCompatibility = (
  fixtureId,
  sourceType,
  fixture,
  record,
  context,
  section,
) => {
  const riskFields = [
    ["requestDerivedProjectId", "request-derived-project-id"],
    ["conversationDerivedProjectKey", "conversation-derived-project-key"],
    ["quoteDerivedJobId", "quote-derived-job-id"],
    ["scheduleDerivedRequestId", "schedule-derived-request-id"],
    ["emergencyProjectedProjectId", "emergency-projected-project-id"],
    ["emergencyProjectedRequestId", "emergency-projected-request-id"],
    ["genericLocalId", "generic-local-id"],
  ];

  riskFields.forEach(([field, code]) => {
    const value = fixture[field] ?? record[field];
    if (!hasValue(value)) return;
    pushUnique(
      section,
      finding(
        fixtureId,
        sourceType,
        code,
        field,
        "Legacy projected identity is non-authoritative and may support read reconciliation only.",
        "REVIEW",
      ),
    );
  });

  const aggregateId = context.operationalAggregateRef?.aggregateId;
  context.compatibilityRefs?.forEach((compatibility, index) => {
    const compatibilityId = readValue(compatibility, [
      "compatibilityId",
      "value",
      "id",
      "projectId",
    ]);
    if (hasValue(aggregateId) && compatibilityId === aggregateId) {
      pushUnique(
        section,
        finding(
          fixtureId,
          sourceType,
          "compatibility-id-used-as-aggregate-id",
          `compatibilityRefs[${index}]`,
          "Compatibility identity is reused as Operational Aggregate identity.",
          "BLOCKER",
        ),
      );
    }
  });
};

const characterizeProvenance = (
  fixtureId,
  sourceType,
  fixture,
  record,
  section,
) => {
  const provenance = isRecord(fixture.provenance)
    ? fixture.provenance
    : isRecord(record.provenance)
      ? record.provenance
      : {};

  PROVENANCE_FIELDS.forEach((field) => {
    if (hasValue(provenance[field])) return;
    pushUnique(
      section,
      finding(
        fixtureId,
        sourceType,
        `provenance-${field}-missing`,
        `provenance.${field}`,
        `Source provenance does not preserve ${field}.`,
        "REVIEW",
      ),
    );
  });
};

const emptySections = () => ({
  collisions: [],
  missingAggregateIdentity: [],
  classificationContinuity: [],
  completionCoverage: [],
  closureReadiness: [],
  recurringScopeReadiness: [],
  provenanceQuality: [],
  compatibilityRisks: [],
});

// Fixture-only characterization. No source is changed, promoted to authority,
// or supplied with inferred Operational Aggregate identity.
export function characterizeOperationalAggregateSources(fixtures = []) {
  const safeFixtures = Array.isArray(fixtures) ? fixtures : [];
  const sections = emptySections();
  const authorityResults = [];
  let sourcesWithAggregateIdentity = 0;

  safeFixtures.forEach((fixtureInput, index) => {
    const fixture = isRecord(fixtureInput) ? clone(fixtureInput) : {};
    const fixtureId = String(
      readValue(fixture, ["fixtureId", "id"]) || `fixture-${index + 1}`,
    );
    const sourceType = toSourceType(fixture);
    const record = isRecord(fixture.record) ? fixture.record : fixture;
    const authorityContext = buildAuthorityContext(
      fixture,
      sourceType,
      record,
    );
    const authorityResult =
      validateOperationalAggregateAuthority(authorityContext);
    const aggregateRef = authorityContext.operationalAggregateRef;
    const hasAggregateIdentity =
      hasValue(aggregateRef?.aggregateId) &&
      SUPPORTED_AGGREGATE_TYPES.includes(aggregateRef?.aggregateType);
    const operationalBehaviorImplied = isOperationallyImplied(
      fixture,
      sourceType,
      record,
      authorityContext,
    );

    if (hasAggregateIdentity) {
      sourcesWithAggregateIdentity += 1;
    } else if (operationalBehaviorImplied) {
      pushUnique(
        sections.missingAggregateIdentity,
        finding(
          fixtureId,
          sourceType,
          "operational-aggregate-identity-incomplete",
          "operationalAggregateRef",
          "Source implies operational behavior but lacks complete aggregateId and aggregateType authority.",
          "BLOCKER",
        ),
      );
    }

    addValidatorFindings(
      authorityResult,
      fixtureId,
      sourceType,
      sections,
    );
    characterizeClassification(
      fixtureId,
      sourceType,
      authorityContext.classificationRef,
      sections.classificationContinuity,
    );
    characterizeCompletion(
      fixtureId,
      sourceType,
      authorityContext.completionRefs || [],
      aggregateRef,
      sections.completionCoverage,
    );
    characterizeClosure(
      fixtureId,
      sourceType,
      authorityContext.closureRef,
      sections.closureReadiness,
    );
    characterizeRecurring(
      fixtureId,
      sourceType,
      aggregateRef,
      authorityContext.completionRefs || [],
      sections.recurringScopeReadiness,
    );
    characterizeCompatibility(
      fixtureId,
      sourceType,
      fixture,
      record,
      authorityContext,
      sections.compatibilityRisks,
    );
    characterizeProvenance(
      fixtureId,
      sourceType,
      fixture,
      record,
      sections.provenanceQuality,
    );

    authorityResults.push({
      fixtureId,
      sourceType,
      operationalBehaviorImplied,
      hasAggregateIdentity,
      authorityContext: clone(authorityContext),
      result: clone(authorityResult),
    });
  });

  const hasBlockingCharacterization =
    sections.collisions.length > 0 ||
    sections.missingAggregateIdentity.length > 0 ||
    sections.completionCoverage.some(({ severity }) => severity === "BLOCKER") ||
    sections.recurringScopeReadiness.some(
      ({ severity }) => severity === "BLOCKER",
    );

  return {
    valid:
      authorityResults.every(({ result }) => result.valid) &&
      !hasBlockingCharacterization,
    summary: {
      totalSources: authorityResults.length,
      sourcesWithAggregateIdentity,
      sourcesMissingAggregateIdentity:
        sections.missingAggregateIdentity.length,
      collisionCount: sections.collisions.length,
      classificationContinuityIssues:
        sections.classificationContinuity.length,
      completionCoverageIssues: sections.completionCoverage.length,
      closureReadinessIssues: sections.closureReadiness.length,
      recurringScopeIssues: sections.recurringScopeReadiness.length,
      provenanceIssues: sections.provenanceQuality.length,
      compatibilityWarnings: sections.compatibilityRisks.length,
    },
    ...sections,
    authorityResults,
  };
}

export { PROVENANCE_FIELDS, SOURCE_TYPES };
