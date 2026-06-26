const SUPPORTED_AGGREGATE_TYPES = Object.freeze([
  "Project",
  "WorkOrder",
  "Emergency",
  "RecurringService",
]);

const SUPPORTED_CLASSIFICATIONS = Object.freeze([
  ...SUPPORTED_AGGREGATE_TYPES,
  "Consultation",
  "Unknown",
]);

const RECURRING_SCOPE_TYPES = Object.freeze([
  "parent",
  "cycle",
  "occurrence",
]);

const NON_AUTHORITATIVE_MATCH_BASES = new Set([
  "text",
  "title",
  "displayTime",
  "customer",
  "customerName",
]);

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasValue = (value) =>
  (typeof value === "string" && value.trim().length > 0) ||
  (typeof value !== "string" && value !== null && value !== undefined);

const asArray = (value) => (Array.isArray(value) ? value : []);

const clone = (value) => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

const normalizeId = (value) =>
  typeof value === "string" ? value.trim() : value;

const finding = (code, field, message, domain) => ({
  code,
  field,
  message,
  domain,
});

const readId = (record, fields) => {
  if (!isRecord(record)) return null;
  for (const field of fields) {
    if (hasValue(record[field])) return normalizeId(record[field]);
  }
  return null;
};

const addAuthorityFinding = (
  authorityFindings,
  domain,
  authority,
  status,
  message,
) => {
  authorityFindings.push({ domain, authority, status, message });
};

const collectIdentity = (identityMap, kind, value, source) => {
  if (!hasValue(value)) return;
  identityMap.push({
    kind,
    value: normalizeId(value),
    source,
  });
};

const validateRecurringScope = (
  aggregateRef,
  errors,
  reviewRequired,
) => {
  if (aggregateRef.aggregateType !== "RecurringService") return;

  const scope = aggregateRef.scope;
  if (!isRecord(scope)) {
    errors.push(
      finding(
        "recurring-scope-required",
        "operationalAggregateRef.scope",
        "RecurringService aggregates require an explicit parent, cycle, or occurrence scope.",
        "OperationalAggregate",
      ),
    );
    return;
  }

  if (!RECURRING_SCOPE_TYPES.includes(scope.scopeType)) {
    errors.push(
      finding(
        "unsupported-recurring-scope",
        "operationalAggregateRef.scope.scopeType",
        "RecurringService scope must be parent, cycle, or occurrence.",
        "OperationalAggregate",
      ),
    );
    return;
  }

  if (!hasValue(scope.scopeId)) {
    errors.push(
      finding(
        "recurring-scope-id-required",
        "operationalAggregateRef.scope.scopeId",
        "RecurringService scope requires its own stable scope identity.",
        "OperationalAggregate",
      ),
    );
  }

  if (
    scope.scopeType === "parent" &&
    (hasValue(scope.cycleId) || hasValue(scope.occurrenceId))
  ) {
    errors.push(
      finding(
        "recurring-parent-scope-conflict",
        "operationalAggregateRef.scope",
        "A RecurringService parent scope cannot also identify a cycle or occurrence.",
        "OperationalAggregate",
      ),
    );
  }

  if (
    scope.scopeType === "cycle" &&
    (!hasValue(scope.parentAggregateId) ||
      !hasValue(scope.cycleId) ||
      hasValue(scope.occurrenceId))
  ) {
    errors.push(
      finding(
        "recurring-cycle-scope-conflict",
        "operationalAggregateRef.scope",
        "A RecurringService cycle requires parent and cycle identities and cannot identify an occurrence.",
        "OperationalAggregate",
      ),
    );
  }

  if (
    scope.scopeType === "occurrence" &&
    (!hasValue(scope.parentAggregateId) ||
      !hasValue(scope.occurrenceId) ||
      hasValue(scope.cycleId))
  ) {
    errors.push(
      finding(
        "recurring-occurrence-scope-conflict",
        "operationalAggregateRef.scope",
        "A RecurringService occurrence requires parent and occurrence identities and cannot also claim cycle scope.",
        "OperationalAggregate",
      ),
    );
  }

  if (scope.scopeType !== "parent" && !hasValue(scope.parentAggregateId)) {
    reviewRequired.push(
      finding(
        "recurring-parent-provenance-missing",
        "operationalAggregateRef.scope.parentAggregateId",
        "RecurringService child scope cannot be reviewed without explicit parent identity.",
        "OperationalAggregate",
      ),
    );
  }
};

export function validateOperationalAggregateAuthority(input = {}) {
  const context = clone(input) || {};
  const errors = [];
  const warnings = [];
  const reviewRequired = [];
  const authorityFindings = [];

  const serviceRequestRef = isRecord(context.serviceRequestRef)
    ? context.serviceRequestRef
    : null;
  const classificationRef = isRecord(context.classificationRef)
    ? context.classificationRef
    : null;
  const aggregateRef = isRecord(context.operationalAggregateRef)
    ? context.operationalAggregateRef
    : null;
  const conversationRefs = asArray(context.conversationRefs);
  const scheduleRefs = asArray(context.scheduleRefs);
  const quoteRefs = asArray(context.quoteRefs);
  const completionRefs = asArray(context.completionRefs);
  const closureRef = isRecord(context.closureRef) ? context.closureRef : null;
  const historyRefs = asArray(context.historyRefs);
  const relationshipRefs = asArray(context.relationshipRefs);
  const compatibilityRefs = asArray(context.compatibilityRefs);

  if (serviceRequestRef) {
    const serviceRequestId = readId(serviceRequestRef, [
      "serviceRequestId",
      "requestId",
    ]);
    if (!hasValue(serviceRequestId)) {
      errors.push(
        finding(
          "service-request-id-required",
          "serviceRequestRef.serviceRequestId",
          "A Service Request must preserve its own intake identity.",
          "ServiceRequest",
        ),
      );
    }
    if (
      hasValue(serviceRequestRef.aggregateId) ||
      serviceRequestRef.isOperationalAggregate === true
    ) {
      errors.push(
        finding(
          "service-request-cannot-own-aggregate-identity",
          "serviceRequestRef",
          "Service Request identity cannot be used as Operational Aggregate authority.",
          "ServiceRequest",
        ),
      );
    }
    addAuthorityFinding(
      authorityFindings,
      "ServiceRequest",
      "intake",
      "PRESERVED",
      "Service Request remains intake authority and may exist without an Operational Aggregate.",
    );
  }

  let classification = null;
  let recommendedAggregateType = null;
  if (classificationRef) {
    classification =
      classificationRef.classification || classificationRef.classificationType;
    recommendedAggregateType =
      classificationRef.recommendedAggregateType || classification;

    if (!SUPPORTED_CLASSIFICATIONS.includes(classification)) {
      errors.push(
        finding(
          "unsupported-classification",
          "classificationRef.classification",
          "Classification must be a supported advisory classification.",
          "Classification",
        ),
      );
    }
    if (!Object.hasOwn(classificationRef, "evidence")) {
      warnings.push(
        finding(
          "classification-evidence-not-preserved",
          "classificationRef.evidence",
          "Classification evidence should remain explicit for later review.",
          "Classification",
        ),
      );
    }
    if (!hasValue(classificationRef.confidence)) {
      warnings.push(
        finding(
          "classification-confidence-missing",
          "classificationRef.confidence",
          "Classification confidence is not available.",
          "Classification",
        ),
      );
    }
    if (!hasValue(classificationRef.reviewStatus)) {
      warnings.push(
        finding(
          "classification-review-status-missing",
          "classificationRef.reviewStatus",
          "Classification review state is not available.",
          "Classification",
        ),
      );
    }
    if (!isRecord(classificationRef.provenance)) {
      warnings.push(
        finding(
          "classification-provenance-missing",
          "classificationRef.provenance",
          "Classification provenance is not available.",
          "Classification",
        ),
      );
    }
    if (hasValue(classificationRef.aggregateId)) {
      errors.push(
        finding(
          "classification-cannot-create-aggregate-id",
          "classificationRef.aggregateId",
          "Classification may recommend an aggregate type but cannot create aggregate identity.",
          "Classification",
        ),
      );
    }
    if (
      classification === "Unknown" ||
      classificationRef.requiresClassificationReview === true
    ) {
      reviewRequired.push(
        finding(
          "classification-review-required",
          "classificationRef",
          "Unknown or review-required classification remains valid but cannot silently select work authority.",
          "Classification",
        ),
      );
    }
    addAuthorityFinding(
      authorityFindings,
      "Classification",
      "decision_support",
      "PRESERVED",
      "Classification can recommend operational path but cannot own aggregate identity.",
    );
  }

  const aggregateId = aggregateRef
    ? readId(aggregateRef, ["aggregateId"])
    : null;
  const aggregateType = aggregateRef?.aggregateType || null;

  if (aggregateRef) {
    if (!hasValue(aggregateId)) {
      errors.push(
        finding(
          "aggregate-id-required",
          "operationalAggregateRef.aggregateId",
          "Operational Aggregate work authority requires stable aggregate identity.",
          "OperationalAggregate",
        ),
      );
    }
    if (!SUPPORTED_AGGREGATE_TYPES.includes(aggregateType)) {
      errors.push(
        finding(
          "unsupported-aggregate-type",
          "operationalAggregateRef.aggregateType",
          "Operational Aggregate type must be Project, WorkOrder, Emergency, or RecurringService.",
          "OperationalAggregate",
        ),
      );
    }
    validateRecurringScope(aggregateRef, errors, reviewRequired);
    addAuthorityFinding(
      authorityFindings,
      "OperationalAggregate",
      "work",
      "PRESERVED",
      "Operational Aggregate owns work identity, type, lifecycle, and scope.",
    );
  }

  if (
    aggregateRef &&
    SUPPORTED_AGGREGATE_TYPES.includes(recommendedAggregateType) &&
    recommendedAggregateType !== aggregateType
  ) {
    const conflict = finding(
      "classification-aggregate-type-conflict",
      "classificationRef.recommendedAggregateType",
      "Classification recommendation conflicts with the explicit Operational Aggregate type and requires review.",
      "Classification",
    );
    warnings.push(conflict);
    reviewRequired.push(conflict);
  }

  const collisionIdentities = [];
  collectIdentity(
    collisionIdentities,
    "service-request",
    readId(serviceRequestRef, ["serviceRequestId", "requestId"]),
    "serviceRequestRef",
  );

  conversationRefs.forEach((record, index) => {
    const id = readId(record, ["conversationId"]);
    if (!hasValue(id)) {
      errors.push(
        finding(
          "conversation-id-required",
          `conversationRefs[${index}].conversationId`,
          "Conversation references must preserve explicit conversation identity.",
          "Conversation",
        ),
      );
    }
    collectIdentity(
      collisionIdentities,
      "conversation",
      id,
      `conversationRefs[${index}]`,
    );
    if (
      hasValue(record?.classification) ||
      record?.createsAggregate === true ||
      record?.authorizesLifecycle === true ||
      record?.authorizesCompletion === true ||
      record?.authorizesClosure === true
    ) {
      errors.push(
        finding(
          "conversation-authority-overreach",
          `conversationRefs[${index}]`,
          "Conversation may communicate workflow state but cannot classify, create, complete, or close work authority.",
          "Conversation",
        ),
      );
    }
  });

  scheduleRefs.forEach((record, index) => {
    const id = readId(record, ["scheduleId", "appointmentId"]);
    if (!hasValue(id)) {
      errors.push(
        finding(
          "schedule-id-required",
          `scheduleRefs[${index}].scheduleId`,
          "Schedule references must preserve explicit appointment identity.",
          "Schedule",
        ),
      );
    }
    collectIdentity(
      collisionIdentities,
      "schedule",
      id,
      `scheduleRefs[${index}]`,
    );
    if (record?.createsAggregate === true) {
      errors.push(
        finding(
          "schedule-cannot-create-aggregate",
          `scheduleRefs[${index}].createsAggregate`,
          "Scheduling cannot create Operational Aggregate identity.",
          "Schedule",
        ),
      );
    }
    if (
      record?.authorizesWorkCompletion === true ||
      record?.scheduleCompletionIsWorkCompletion === true
    ) {
      errors.push(
        finding(
          "schedule-completion-is-not-work-completion",
          `scheduleRefs[${index}]`,
          "Schedule completion cannot authorize operational work Completion.",
          "Schedule",
        ),
      );
    }
  });

  quoteRefs.forEach((record, index) => {
    const quoteId = readId(record, ["quoteId"]);
    const quoteRequestId = readId(record, ["quoteRequestId"]);
    if (!hasValue(quoteId) && !hasValue(quoteRequestId)) {
      errors.push(
        finding(
          "quote-identity-required",
          `quoteRefs[${index}]`,
          "Quote references must preserve quote or quote-request identity.",
          "Quote",
        ),
      );
    }
    collectIdentity(
      collisionIdentities,
      "quote",
      quoteId,
      `quoteRefs[${index}].quoteId`,
    );
    collectIdentity(
      collisionIdentities,
      "quote-request",
      quoteRequestId,
      `quoteRefs[${index}].quoteRequestId`,
    );
    if (
      record?.createsAggregate === true ||
      hasValue(record?.createdAggregateId)
    ) {
      errors.push(
        finding(
          "quote-cannot-create-aggregate",
          `quoteRefs[${index}]`,
          "Quote acceptance or creation cannot itself create Operational Aggregate identity.",
          "Quote",
        ),
      );
    }
    if (record?.replacesAggregateScope === true) {
      errors.push(
        finding(
          "quote-cannot-replace-aggregate-scope",
          `quoteRefs[${index}].replacesAggregateScope`,
          "Quote scope may inform work scope but cannot replace aggregate scope authority.",
          "Quote",
        ),
      );
    }
  });

  completionRefs.forEach((record, index) => {
    const completionId = readId(record, ["completionId"]);
    if (!hasValue(completionId)) {
      errors.push(
        finding(
          "completion-id-required",
          `completionRefs[${index}].completionId`,
          "Completion references must preserve explicit Completion identity.",
          "Completion",
        ),
      );
    }
    collectIdentity(
      collisionIdentities,
      "completion",
      completionId,
      `completionRefs[${index}]`,
    );

    const completionAggregateId = readId(record, ["aggregateId"]);
    if (!hasValue(completionAggregateId)) {
      errors.push(
        finding(
          "completion-aggregate-reference-required",
          `completionRefs[${index}].aggregateId`,
          "Completion requires an explicit Operational Aggregate reference when used in aggregate context.",
          "Completion",
        ),
      );
    } else if (!aggregateRef) {
      reviewRequired.push(
        finding(
          "completion-aggregate-context-unavailable",
          `completionRefs[${index}].aggregateId`,
          "Completion names an aggregate that is not present in this authority context.",
          "Completion",
        ),
      );
    } else if (completionAggregateId !== aggregateId) {
      errors.push(
        finding(
          "completion-aggregate-id-conflict",
          `completionRefs[${index}].aggregateId`,
          "Completion aggregate identity conflicts with work authority.",
          "Completion",
        ),
      );
    }

    if (
      hasValue(record?.aggregateType) &&
      aggregateRef &&
      record.aggregateType !== aggregateType
    ) {
      errors.push(
        finding(
          "completion-cannot-change-aggregate-type",
          `completionRefs[${index}].aggregateType`,
          "Completion cannot change Operational Aggregate type.",
          "Completion",
        ),
      );
    }
    if (
      record?.authorizesClosure === true ||
      record?.resolvesObligations === true ||
      record?.completionImpliesClosure === true
    ) {
      errors.push(
        finding(
          "completion-cannot-authorize-closure",
          `completionRefs[${index}]`,
          "Completion is performance evidence and cannot authorize Closure or resolve obligations.",
          "Completion",
        ),
      );
    }
    if (
      aggregateType === "RecurringService" &&
      aggregateRef?.scope?.scopeType === "occurrence" &&
      record?.closesParentService === true
    ) {
      errors.push(
        finding(
          "recurring-occurrence-cannot-close-parent",
          `completionRefs[${index}].closesParentService`,
          "RecurringService occurrence Completion cannot close the parent service.",
          "Completion",
        ),
      );
    }
  });

  if (closureRef) {
    const closureAggregateId = readId(closureRef, ["aggregateId"]);
    if (!hasValue(closureAggregateId)) {
      errors.push(
        finding(
          "closure-aggregate-reference-required",
          "closureRef.aggregateId",
          "Closure requires explicit Operational Aggregate identity.",
          "Closure",
        ),
      );
    } else if (aggregateRef && closureAggregateId !== aggregateId) {
      errors.push(
        finding(
          "closure-aggregate-id-conflict",
          "closureRef.aggregateId",
          "Closure aggregate identity conflicts with work authority.",
          "Closure",
        ),
      );
    }
    if (
      hasValue(closureRef.aggregateType) &&
      aggregateRef &&
      closureRef.aggregateType !== aggregateType
    ) {
      errors.push(
        finding(
          "closure-aggregate-type-conflict",
          "closureRef.aggregateType",
          "Closure cannot change Operational Aggregate type.",
          "Closure",
        ),
      );
    }
    if (
      closureRef.ownsEvidence === true ||
      closureRef.evidenceOwnership === "Closure"
    ) {
      errors.push(
        finding(
          "closure-cannot-own-source-evidence",
          "closureRef.evidenceOwnership",
          "Closure may reference source-owned evidence but cannot take ownership of it.",
          "Closure",
        ),
      );
    }
    if (
      closureRef.reliesOnCompletionOnly === true ||
      (Array.isArray(closureRef.authorityBasis) &&
        closureRef.authorityBasis.length === 1 &&
        closureRef.authorityBasis[0] === "Completion")
    ) {
      const completionOnly = finding(
        "closure-based-only-on-completion",
        "closureRef.authorityBasis",
        "Completion alone cannot authorize Closure; obligation and authorization review remains required.",
        "Closure",
      );
      warnings.push(completionOnly);
      reviewRequired.push(completionOnly);
    }
    if (
      closureRef.reliesOnHistory === true ||
      closureRef.reliesOnArchive === true ||
      closureRef.reliesOnDisplayLabel === true
    ) {
      errors.push(
        finding(
          "closure-authority-from-non-authoritative-state",
          "closureRef",
          "History, archive state, and display labels cannot authorize Closure.",
          "Closure",
        ),
      );
    }
    if (
      !hasValue(closureRef.authorizationStatus) ||
      ["unresolved", "review_required", "unknown"].includes(
        closureRef.authorizationStatus,
      )
    ) {
      reviewRequired.push(
        finding(
          "closure-authorization-unresolved",
          "closureRef.authorizationStatus",
          "Closure authorization remains a future policy decision and requires review.",
          "Closure",
        ),
      );
    }
    if (
      aggregateType === "RecurringService" &&
      aggregateRef?.scope?.scopeType === "occurrence" &&
      closureRef.closesParentService === true
    ) {
      errors.push(
        finding(
          "recurring-occurrence-closure-cannot-close-parent",
          "closureRef.closesParentService",
          "RecurringService occurrence Closure cannot close the parent service.",
          "Closure",
        ),
      );
    }
  }

  historyRefs.forEach((record, index) => {
    if (!hasValue(readId(record, ["historyId", "id"]))) {
      warnings.push(
        finding(
          "history-id-missing",
          `historyRefs[${index}]`,
          "History identity is unavailable, but the record remains visible for reconciliation.",
          "History",
        ),
      );
    }
    if (
      record?.createsAggregate === true ||
      record?.authorizesLifecycle === true ||
      record?.authorizesClosure === true
    ) {
      errors.push(
        finding(
          "history-authority-overreach",
          `historyRefs[${index}]`,
          "History preserves durable memory but cannot create work identity, drive lifecycle, or authorize Closure.",
          "History",
        ),
      );
    }
    if (record?.overwritesClassification === true) {
      errors.push(
        finding(
          "history-cannot-overwrite-classification",
          `historyRefs[${index}].overwritesClassification`,
          "History must preserve classification continuity rather than silently replace it.",
          "History",
        ),
      );
    }
  });

  relationshipRefs.forEach((record, index) => {
    const relationshipId = readId(record, [
      "relationshipId",
      "relationshipContactId",
    ]);
    if (!hasValue(relationshipId)) {
      errors.push(
        finding(
          "relationship-id-required",
          `relationshipRefs[${index}]`,
          "Relationship references must preserve distinct relationship identity.",
          "Relationship",
        ),
      );
    }
    collectIdentity(
      collisionIdentities,
      "relationship",
      relationshipId,
      `relationshipRefs[${index}]`,
    );
    if (
      record?.terminatedByAggregateClosure === true ||
      record?.terminationReason === "aggregate_closure"
    ) {
      errors.push(
        finding(
          "aggregate-closure-cannot-terminate-relationship",
          `relationshipRefs[${index}]`,
          "Closure ends operational obligations, not the persistent Relationship.",
          "Relationship",
        ),
      );
    }
  });

  compatibilityRefs.forEach((record, index) => {
    const compatibilityId = readId(record, [
      "compatibilityId",
      "value",
      "id",
    ]);
    if (!hasValue(compatibilityId)) {
      errors.push(
        finding(
          "compatibility-id-required",
          `compatibilityRefs[${index}]`,
          "Compatibility references require an explicit legacy identity.",
          "Compatibility",
        ),
      );
    }
    collectIdentity(
      collisionIdentities,
      "compatibility",
      compatibilityId,
      `compatibilityRefs[${index}]`,
    );
    if (!isRecord(record?.provenance)) {
      warnings.push(
        finding(
          "compatibility-provenance-required",
          `compatibilityRefs[${index}].provenance`,
          "Compatibility identity requires explicit provenance.",
          "Compatibility",
        ),
      );
    }
    if (!Array.isArray(record?.warnings) || record.warnings.length === 0) {
      warnings.push(
        finding(
          "compatibility-warning-required",
          `compatibilityRefs[${index}].warnings`,
          "Compatibility identity must carry non-authoritative warning metadata.",
          "Compatibility",
        ),
      );
    }
    if (
      record?.authoritative === true ||
      record?.satisfiesAggregateIdentity === true
    ) {
      errors.push(
        finding(
          "compatibility-id-cannot-be-authority",
          `compatibilityRefs[${index}]`,
          "Compatibility identity may support read reconciliation only and cannot satisfy aggregate identity.",
          "Compatibility",
        ),
      );
    }
    if (
      NON_AUTHORITATIVE_MATCH_BASES.has(record?.matchBasis) &&
      record?.usedForAuthority === true
    ) {
      errors.push(
        finding(
          "display-match-cannot-be-authority",
          `compatibilityRefs[${index}].matchBasis`,
          "Text, title, customer, and display-time matching cannot establish authority.",
          "Compatibility",
        ),
      );
    }
  });

  collectIdentity(
    collisionIdentities,
    "emergency",
    readId(serviceRequestRef, ["emergencyId"]),
    "serviceRequestRef.emergencyId",
  );
  collectIdentity(
    collisionIdentities,
    "emergency",
    readId(aggregateRef, ["emergencyId", "sourceEmergencyId"]),
    "operationalAggregateRef.emergencyId",
  );

  if (hasValue(aggregateId)) {
    collisionIdentities.forEach(({ kind, value, source }) => {
      if (value !== aggregateId) return;
      errors.push(
        finding(
          `aggregate-id-collides-${kind}`,
          "operationalAggregateRef.aggregateId",
          `Operational Aggregate identity collides with non-authoritative ${kind} identity from ${source}.`,
          "OperationalAggregate",
        ),
      );
    });
  }

  if (context.provenance && !isRecord(context.provenance)) {
    warnings.push(
      finding(
        "context-provenance-invalid",
        "provenance",
        "Authority context provenance should be a structured record.",
        "AuthorityContext",
      ),
    );
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    reviewRequired,
    authorityFindings,
  };
}

export {
  RECURRING_SCOPE_TYPES,
  SUPPORTED_AGGREGATE_TYPES,
  SUPPORTED_CLASSIFICATIONS,
};
