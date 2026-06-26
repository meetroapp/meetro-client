export const CLOSURE_AGGREGATE_TYPES = Object.freeze([
  "Project",
  "WorkOrder",
  "Emergency",
  "RecurringService",
]);

export const CLOSURE_APPLICABILITY_STATUSES = Object.freeze([
  "applicable",
  "not_applicable",
  "unknown",
]);

export const CLOSURE_RESOLUTION_STATUSES = Object.freeze([
  "open",
  "resolved",
  "waived",
  "disputed",
  "unknown",
]);

export const CLOSURE_RECURRING_SCOPES = Object.freeze([
  "parent",
  "cycle",
  "occurrence",
]);

export const CLOSURE_STRUCTURAL_RISK = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
});

const SUPPORTED_AGGREGATE_TYPES = new Set(CLOSURE_AGGREGATE_TYPES);
const SUPPORTED_APPLICABILITY = new Set(CLOSURE_APPLICABILITY_STATUSES);
const SUPPORTED_RESOLUTION = new Set(CLOSURE_RESOLUTION_STATUSES);
const SUPPORTED_RECURRING_SCOPES = new Set(CLOSURE_RECURRING_SCOPES);
const KNOWN_OBLIGATION_TYPES = new Set([
  "CustomerConfirmation",
  "TenantConfirmation",
  "Payment",
  "Permit",
  "Inspection",
  "WarrantyHandoff",
  "DocumentationDelivery",
  "FollowUp",
  "UtilityApproval",
  "DisputeResolution",
]);
const CLOSURE_OWNERSHIP_TOKENS = new Set([
  "closure",
  "closure_aggregate",
  "closure_domain",
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function text(value) {
  return hasValue(value) ? String(value).trim() : "";
}

function token(value) {
  return text(value).toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
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

function finding(code, field, message, obligationId = "") {
  return { code, field, message, obligationId };
}

function normalizeReference(reference) {
  if (!isRecord(reference)) return cloneValue(reference);

  return {
    ...cloneValue(reference),
    evidenceId: text(reference.evidenceId || reference.id),
    sourceDomain: text(reference.sourceDomain),
    sourceEntityId: text(reference.sourceEntityId),
    ownership: token(reference.ownership),
  };
}

function normalizeRegistryEntry(entry) {
  const safeEntry = isRecord(entry) ? cloneValue(entry) : {};

  return {
    ...safeEntry,
    obligationId: text(safeEntry.obligationId),
    obligationType: text(safeEntry.obligationType),
    applicabilityStatus: token(safeEntry.applicabilityStatus),
    resolutionStatus: token(safeEntry.resolutionStatus),
    evidenceReferences: Array.isArray(safeEntry.evidenceReferences)
      ? safeEntry.evidenceReferences.map(normalizeReference)
      : [],
    sourceDomain: text(safeEntry.sourceDomain),
    lastReviewedAt: text(safeEntry.lastReviewedAt),
    reviewWarnings: Array.isArray(safeEntry.reviewWarnings)
      ? cloneValue(safeEntry.reviewWarnings)
      : [],
  };
}

function isStableObligationId(value, index) {
  const normalized = token(value);
  if (!normalized) return false;

  return ![
    String(index),
    String(index + 1),
    `item_${index}`,
    `item_${index + 1}`,
    `row_${index}`,
    `row_${index + 1}`,
    `obligation_${index}`,
    `obligation_${index + 1}`,
    "temp",
    "unknown",
  ].includes(normalized);
}

function validateRecurringScope(aggregateRef, blockers) {
  if (aggregateRef.aggregateType !== "RecurringService") {
    if (isRecord(aggregateRef.scope)) {
      blockers.push(
        finding(
          "recurring-scope-on-non-recurring-aggregate",
          "operationalAggregateRef.scope",
          "Recurring scope is only valid for RecurringService aggregates."
        )
      );
    }
    return;
  }

  const scope = isRecord(aggregateRef.scope) ? aggregateRef.scope : {};
  const scopeType = token(scope.scopeType);
  const scopeId = text(scope.scopeId);
  const parentAggregateId = text(scope.parentAggregateId);
  const cycleId = text(scope.cycleId);
  const occurrenceId = text(scope.occurrenceId);

  if (!SUPPORTED_RECURRING_SCOPES.has(scopeType)) {
    blockers.push(
      finding(
        "recurring-scope-required",
        "operationalAggregateRef.scope.scopeType",
        "RecurringService requires an explicit parent, cycle, or occurrence scope."
      )
    );
    return;
  }

  if (!scopeId) {
    blockers.push(
      finding(
        "recurring-scope-id-required",
        "operationalAggregateRef.scope.scopeId",
        "RecurringService scope requires a stable scopeId."
      )
    );
  }

  if (scopeType === "parent") {
    if (
      (parentAggregateId && parentAggregateId !== aggregateRef.aggregateId) ||
      cycleId ||
      occurrenceId
    ) {
      blockers.push(
        finding(
          "conflicting-recurring-scopes",
          "operationalAggregateRef.scope",
          "Parent scope cannot also declare cycle or occurrence identity."
        )
      );
    }
    return;
  }

  if (!parentAggregateId) {
    blockers.push(
      finding(
        "recurring-parent-id-required",
        "operationalAggregateRef.scope.parentAggregateId",
        "Cycle and occurrence scopes require the parent RecurringService aggregate ID."
      )
    );
  }

  if (scopeType === "cycle") {
    if (!cycleId || occurrenceId) {
      blockers.push(
        finding(
          "conflicting-recurring-scopes",
          "operationalAggregateRef.scope",
          "Cycle scope requires cycleId and cannot also declare occurrenceId."
        )
      );
    }
  }

  if (scopeType === "occurrence" && (!occurrenceId || cycleId)) {
    blockers.push(
      finding(
        "conflicting-recurring-scopes",
        "operationalAggregateRef.scope",
        "Occurrence scope requires occurrenceId and cannot also declare cycleId."
      )
    );
  }
}

function validateEvidenceReference(reference, path, obligationId, blockers) {
  if (!isRecord(reference)) {
    blockers.push(
      finding(
        "invalid-evidence-reference",
        path,
        "Evidence references must be records, not embedded evidence values.",
        obligationId
      )
    );
    return;
  }

  if (!reference.evidenceId) {
    blockers.push(
      finding(
        "evidence-id-required",
        `${path}.evidenceId`,
        "Evidence references require a stable evidenceId.",
        obligationId
      )
    );
  }

  if (!reference.sourceDomain) {
    blockers.push(
      finding(
        "evidence-source-domain-required",
        `${path}.sourceDomain`,
        "Evidence references require an explicit source domain.",
        obligationId
      )
    );
  }

  if (!reference.sourceEntityId) {
    blockers.push(
      finding(
        "evidence-source-entity-required",
        `${path}.sourceEntityId`,
        "Evidence references require a source-domain entity ID.",
        obligationId
      )
    );
  }

  if (
    CLOSURE_OWNERSHIP_TOKENS.has(reference.ownership) ||
    CLOSURE_OWNERSHIP_TOKENS.has(token(reference.owner)) ||
    CLOSURE_OWNERSHIP_TOKENS.has(token(reference.sourceDomain))
  ) {
    blockers.push(
      finding(
        "closure-cannot-own-evidence",
        path,
        "Closure may reference evidence but cannot own it.",
        obligationId
      )
    );
  }

  if (reference.ownership && reference.ownership !== "source_domain") {
    blockers.push(
      finding(
        "unsupported-evidence-ownership",
        `${path}.ownership`,
        "Evidence ownership must remain with the source domain.",
        obligationId
      )
    );
  }

  if (
    Object.hasOwn(reference, "evidence") ||
    Object.hasOwn(reference, "payload") ||
    Object.hasOwn(reference, "content")
  ) {
    blockers.push(
      finding(
        "embedded-evidence-prohibited",
        path,
        "The registry may hold evidence references, not owned evidence bodies.",
        obligationId
      )
    );
  }
}

function validateRegistryEntry(entry, index, blockers, warnings) {
  const path = `obligationRegistry[${index}]`;
  const obligationId = entry.obligationId;

  if (!isStableObligationId(obligationId, index)) {
    blockers.push(
      finding(
        obligationId ? "unstable-obligation-id" : "obligation-id-required",
        `${path}.obligationId`,
        "Registry entries require a stable, non-generic obligationId.",
        obligationId
      )
    );
  }

  if (!entry.obligationType) {
    blockers.push(
      finding(
        "obligation-type-required",
        `${path}.obligationType`,
        "Registry entries require an obligationType.",
        obligationId
      )
    );
  } else if (!KNOWN_OBLIGATION_TYPES.has(entry.obligationType)) {
    warnings.push(
      finding(
        "unknown-obligation-type",
        `${path}.obligationType`,
        "Unknown obligation type is preserved for future review.",
        obligationId
      )
    );
  }

  if (!SUPPORTED_APPLICABILITY.has(entry.applicabilityStatus)) {
    blockers.push(
      finding(
        "unsupported-applicability-status",
        `${path}.applicabilityStatus`,
        "Applicability status is unsupported.",
        obligationId
      )
    );
  }

  if (!SUPPORTED_RESOLUTION.has(entry.resolutionStatus)) {
    blockers.push(
      finding(
        "unsupported-resolution-status",
        `${path}.resolutionStatus`,
        "Resolution status is unsupported.",
        obligationId
      )
    );
  }

  if (!entry.sourceDomain) {
    blockers.push(
      finding(
        "source-domain-required",
        `${path}.sourceDomain`,
        "Registry entries require an explicit source domain.",
        obligationId
      )
    );
  } else if (CLOSURE_OWNERSHIP_TOKENS.has(token(entry.sourceDomain))) {
    blockers.push(
      finding(
        "closure-cannot-own-obligation-evidence",
        `${path}.sourceDomain`,
        "Closure cannot be the obligation evidence source domain.",
        obligationId
      )
    );
  }

  entry.evidenceReferences.forEach((reference, referenceIndex) =>
    validateEvidenceReference(
      reference,
      `${path}.evidenceReferences[${referenceIndex}]`,
      obligationId,
      blockers
    )
  );

  if (
    entry.applicabilityStatus === "applicable" &&
    entry.resolutionStatus === "resolved" &&
    entry.evidenceReferences.length === 0
  ) {
    blockers.push(
      finding(
        "resolved-obligation-evidence-required",
        `${path}.evidenceReferences`,
        "An applicable resolved obligation requires an explicit source-owned evidence reference.",
        obligationId
      )
    );
  }

  if (entry.applicabilityStatus === "unknown") {
    warnings.push(
      finding(
        "unknown-applicability-review-required",
        `${path}.applicabilityStatus`,
        "Unknown applicability remains review-required.",
        obligationId
      )
    );
  }

  if (entry.resolutionStatus === "disputed") {
    warnings.push(
      finding(
        "disputed-resolution-review-required",
        `${path}.resolutionStatus`,
        "Disputed resolution remains unresolved and review-required.",
        obligationId
      )
    );
  }

  if (entry.resolutionStatus === "unknown") {
    warnings.push(
      finding(
        "unknown-resolution-review-required",
        `${path}.resolutionStatus`,
        "Unknown resolution remains review-required.",
        obligationId
      )
    );
  }

  if (entry.resolutionStatus === "waived") {
    warnings.push(
      finding(
        "waiver-authority-policy-unresolved",
        `${path}.resolutionStatus`,
        "Waived status requires future authority policy and human review.",
        obligationId
      )
    );
  }
}

// Structural validation only. This function does not decide applicability,
// evidence sufficiency, waiver authority, Closure readiness, or authorization.
export function validateClosureAggregate(input = {}) {
  const safeInput = isRecord(input) ? cloneValue(input) : {};
  const aggregateRef = isRecord(safeInput.operationalAggregateRef)
    ? cloneValue(safeInput.operationalAggregateRef)
    : {};
  const normalizedRegistry = Array.isArray(safeInput.obligationRegistry)
    ? safeInput.obligationRegistry.map(normalizeRegistryEntry)
    : [];
  const blockers = [];
  const warnings = Array.isArray(safeInput.warnings)
    ? cloneValue(safeInput.warnings)
    : [];

  aggregateRef.aggregateId = text(aggregateRef.aggregateId);
  aggregateRef.aggregateType = text(aggregateRef.aggregateType);

  if (!aggregateRef.aggregateId) {
    blockers.push(
      finding(
        "aggregate-id-required",
        "operationalAggregateRef.aggregateId",
        "A canonical operational aggregateId is required."
      )
    );
  }

  if (!SUPPORTED_AGGREGATE_TYPES.has(aggregateRef.aggregateType)) {
    blockers.push(
      finding(
        "unsupported-aggregate-type",
        "operationalAggregateRef.aggregateType",
        "Operational aggregate type is unsupported."
      )
    );
  }

  if (!Array.isArray(safeInput.obligationRegistry)) {
    blockers.push(
      finding(
        "obligation-registry-required",
        "obligationRegistry",
        "obligationRegistry must be an array."
      )
    );
  }

  validateRecurringScope(aggregateRef, blockers);

  normalizedRegistry.forEach((entry, index) =>
    validateRegistryEntry(entry, index, blockers, warnings)
  );

  const obligationIds = new Set();
  normalizedRegistry.forEach((entry, index) => {
    if (!entry.obligationId) return;
    if (obligationIds.has(entry.obligationId)) {
      blockers.push(
        finding(
          "duplicate-obligation-id",
          `obligationRegistry[${index}].obligationId`,
          "Obligation IDs must be unique within the registry.",
          entry.obligationId
        )
      );
    }
    obligationIds.add(entry.obligationId);
  });

  const reviewRequired =
    blockers.length > 0 ||
    warnings.length > 0 ||
    normalizedRegistry.some(
      (entry) =>
        entry.applicabilityStatus === "unknown" ||
        ["disputed", "unknown", "waived"].includes(entry.resolutionStatus)
    );

  return {
    valid: blockers.length === 0,
    blockers,
    warnings,
    reviewRequired,
    normalizedRegistry,
    structuralRisk:
      blockers.length > 0
        ? CLOSURE_STRUCTURAL_RISK.HIGH
        : reviewRequired
          ? CLOSURE_STRUCTURAL_RISK.MEDIUM
          : CLOSURE_STRUCTURAL_RISK.LOW,
  };
}
