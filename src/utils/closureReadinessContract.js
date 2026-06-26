export const CLOSURE_OBLIGATION_CATEGORIES = Object.freeze({
  CUSTOMER_CONFIRMATION: "CustomerConfirmation",
  TENANT_CONFIRMATION: "TenantConfirmation",
  PAYMENT: "Payment",
  PERMIT: "Permit",
  INSPECTION: "Inspection",
  WARRANTY_HANDOFF: "WarrantyHandoff",
  REQUIRED_DOCUMENTATION: "RequiredDocumentation",
  FOLLOW_UP: "FollowUp",
  UTILITY_APPROVAL: "UtilityApproval",
  DISPUTE_RESOLUTION: "DisputeResolution",
  FUTURE: "FutureObligation",
});

export const CLOSURE_OBLIGATION_STATUSES = Object.freeze({
  REQUIRED: "required",
  NOT_REQUIRED: "not_required",
  OPEN: "open",
  RESOLVED: "resolved",
  WAIVED: "waived",
  DISPUTED: "disputed",
  UNKNOWN: "unknown",
});

export const CLOSURE_READINESS_RISK = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
});

const COMPLETION_STATUSES = new Set([
  "complete",
  "completed",
  "completion_submitted",
  "completion_confirmed",
  "confirmed",
  "submitted",
  "work_performed",
]);

const SUPPORTED_CATEGORIES = new Set(
  Object.values(CLOSURE_OBLIGATION_CATEGORIES)
);
const SUPPORTED_STATUSES = new Set(
  Object.values(CLOSURE_OBLIGATION_STATUSES)
);
const OPEN_STATUSES = new Set([
  CLOSURE_OBLIGATION_STATUSES.REQUIRED,
  CLOSURE_OBLIGATION_STATUSES.OPEN,
  CLOSURE_OBLIGATION_STATUSES.DISPUTED,
  CLOSURE_OBLIGATION_STATUSES.UNKNOWN,
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function stringValue(value) {
  return hasValue(value) ? String(value).trim() : "";
}

function normalizeToken(value) {
  return stringValue(value).toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
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

function createFinding(code, message, field = "", obligationId = "") {
  return { code, message, field, obligationId };
}

function normalizeCategory(value) {
  const token = normalizeToken(value);
  const match = Object.values(CLOSURE_OBLIGATION_CATEGORIES).find(
    (category) => normalizeToken(category) === token
  );

  return match || stringValue(value) || CLOSURE_OBLIGATION_CATEGORIES.FUTURE;
}

function normalizeStatus(value) {
  const status = normalizeToken(value);
  return SUPPORTED_STATUSES.has(status)
    ? status
    : CLOSURE_OBLIGATION_STATUSES.UNKNOWN;
}

function getReferenceIds(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (isRecord(entry)) {
        return stringValue(entry.id || entry.evidenceId || entry.confirmationId);
      }
      return stringValue(entry);
    })
    .filter(Boolean);
}

function getAvailableReferences(records) {
  if (!Array.isArray(records)) return new Set();

  return new Set(
    records
      .map((record) => {
        if (isRecord(record)) {
          return stringValue(
            record.id || record.evidenceId || record.confirmationId
          );
        }
        return stringValue(record);
      })
      .filter(Boolean)
  );
}

function normalizeObligation(obligation, index) {
  const safeObligation = isRecord(obligation) ? cloneValue(obligation) : {};
  const status = normalizeStatus(safeObligation.status);

  return {
    ...safeObligation,
    id: stringValue(safeObligation.id) || `obligation-${index + 1}`,
    category: normalizeCategory(
      safeObligation.category || safeObligation.type
    ),
    status,
    required:
      safeObligation.required === true ||
      [
        CLOSURE_OBLIGATION_STATUSES.REQUIRED,
        CLOSURE_OBLIGATION_STATUSES.OPEN,
        CLOSURE_OBLIGATION_STATUSES.RESOLVED,
        CLOSURE_OBLIGATION_STATUSES.WAIVED,
        CLOSURE_OBLIGATION_STATUSES.DISPUTED,
      ].includes(status),
    evidenceRequired: safeObligation.evidenceRequired === true,
    confirmationRequired: safeObligation.confirmationRequired === true,
    evidenceRefs: getReferenceIds(safeObligation.evidenceRefs),
    confirmationRefs: getReferenceIds(safeObligation.confirmationRefs),
  };
}

function sortObligations(obligations) {
  return [...obligations].sort((first, second) => {
    const categoryDifference = first.category.localeCompare(second.category);
    if (categoryDifference !== 0) return categoryDifference;
    return first.id.localeCompare(second.id);
  });
}

function getRiskLevel(blockers, warnings, closureReady) {
  if (blockers.length > 0) return CLOSURE_READINESS_RISK.HIGH;
  if (!closureReady || warnings.length > 0) {
    return CLOSURE_READINESS_RISK.MEDIUM;
  }
  return CLOSURE_READINESS_RISK.LOW;
}

// Advisory read model only. The caller owns which obligations apply and who
// may resolve or waive them. This evaluator never closes an aggregate.
export function evaluateClosureReadiness(input = {}) {
  const safeInput = isRecord(input) ? cloneValue(input) : {};
  const aggregateId = stringValue(safeInput.aggregateId);
  const aggregateType = stringValue(safeInput.aggregateType);
  const completionStatus = normalizeToken(safeInput.completionStatus);
  const obligations = Array.isArray(safeInput.obligations)
    ? safeInput.obligations.map(normalizeObligation)
    : [];
  const evidenceIds = getAvailableReferences(safeInput.evidence);
  const confirmationIds = getAvailableReferences(safeInput.confirmations);
  const outstandingItems = Array.isArray(safeInput.outstandingItems)
    ? cloneValue(safeInput.outstandingItems)
    : [];
  const warnings = [];
  const blockers = [];
  const missingEvidence = [];

  if (!aggregateId) {
    blockers.push(
      createFinding(
        "aggregate-id-required",
        "Closure readiness requires an explicit operational aggregate identity.",
        "aggregateId"
      )
    );
  }

  if (!aggregateType) {
    blockers.push(
      createFinding(
        "aggregate-type-required",
        "Closure readiness requires an explicit operational aggregate type.",
        "aggregateType"
      )
    );
  }

  if (!COMPLETION_STATUSES.has(completionStatus)) {
    blockers.push(
      createFinding(
        "completion-not-established",
        "Work must be explicitly recorded as performed or submitted complete before Closure readiness can be evaluated.",
        "completionStatus"
      )
    );
  }

  if (!Array.isArray(safeInput.obligations) || obligations.length === 0) {
    blockers.push(
      createFinding(
        "obligation-review-required",
        "No obligation review was supplied. Closure cannot be inferred from Completion alone.",
        "obligations"
      )
    );
  }

  obligations.forEach((obligation) => {
    if (!SUPPORTED_CATEGORIES.has(obligation.category)) {
      warnings.push(
        createFinding(
          "future-obligation-category",
          "The obligation category is preserved for human review because it is not in the current registry.",
          "obligations.category",
          obligation.id
        )
      );
    }

    if (!SUPPORTED_STATUSES.has(normalizeToken(obligation.status))) {
      blockers.push(
        createFinding(
          "unknown-obligation-status",
          "Unknown obligation status remains unresolved.",
          "obligations.status",
          obligation.id
        )
      );
    }

    if (
      [
        CLOSURE_OBLIGATION_STATUSES.REQUIRED,
        CLOSURE_OBLIGATION_STATUSES.OPEN,
      ].includes(obligation.status)
    ) {
      blockers.push(
        createFinding(
          "open-obligation",
          "An applicable obligation remains open and prevents Closure readiness.",
          "obligations.status",
          obligation.id
        )
      );
    }

    if (obligation.status === CLOSURE_OBLIGATION_STATUSES.DISPUTED) {
      blockers.push(
        createFinding(
          "disputed-obligation",
          "A disputed obligation prevents Closure readiness.",
          "obligations.status",
          obligation.id
        )
      );
    }

    if (obligation.status === CLOSURE_OBLIGATION_STATUSES.UNKNOWN) {
      blockers.push(
        createFinding(
          "unknown-obligation",
          "An unknown obligation remains unresolved and requires review.",
          "obligations.status",
          obligation.id
        )
      );
    }

    const evidenceMissing =
      obligation.evidenceRequired &&
      (obligation.evidenceRefs.length === 0 ||
        obligation.evidenceRefs.some((id) => !evidenceIds.has(id)));
    const confirmationMissing =
      obligation.confirmationRequired &&
      (obligation.confirmationRefs.length === 0 ||
        obligation.confirmationRefs.some((id) => !confirmationIds.has(id)));

    if (evidenceMissing) {
      missingEvidence.push(
        createFinding(
          "required-evidence-missing",
          "Required obligation evidence is missing or unavailable.",
          "evidence",
          obligation.id
        )
      );
    }

    if (confirmationMissing) {
      missingEvidence.push(
        createFinding(
          "required-confirmation-missing",
          "Required obligation confirmation is missing or unavailable.",
          "confirmations",
          obligation.id
        )
      );
    }

    if (
      obligation.status === CLOSURE_OBLIGATION_STATUSES.WAIVED &&
      !hasValue(obligation.waiverAuthority)
    ) {
      warnings.push(
        createFinding(
          "waiver-authority-unverified",
          "The obligation is marked waived, but waiver authority is not identified.",
          "obligations.waiverAuthority",
          obligation.id
        )
      );
    }
  });

  missingEvidence.forEach((finding) => blockers.push({ ...finding }));

  if (outstandingItems.length > 0) {
    blockers.push(
      createFinding(
        "outstanding-items-remain",
        "Outstanding items remain and prevent Closure readiness.",
        "outstandingItems"
      )
    );
  }

  const openObligations = sortObligations(
    obligations.filter((obligation) => OPEN_STATUSES.has(obligation.status))
  );
  const resolvedObligations = sortObligations(
    obligations.filter((obligation) =>
      [
        CLOSURE_OBLIGATION_STATUSES.RESOLVED,
        CLOSURE_OBLIGATION_STATUSES.NOT_REQUIRED,
      ].includes(obligation.status)
    )
  );
  const waivedObligations = sortObligations(
    obligations.filter(
      (obligation) =>
        obligation.status === CLOSURE_OBLIGATION_STATUSES.WAIVED
    )
  );
  const closureReady =
    blockers.length === 0 &&
    openObligations.length === 0 &&
    outstandingItems.length === 0;
  const requiresHumanReview =
    !closureReady ||
    warnings.length > 0 ||
    waivedObligations.length > 0;

  return {
    closureReady,
    openObligations,
    resolvedObligations,
    waivedObligations,
    missingEvidence,
    warnings,
    blockers,
    riskLevel: getRiskLevel(blockers, warnings, closureReady),
    requiresHumanReview,
  };
}
