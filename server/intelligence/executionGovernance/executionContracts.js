export const EXECUTION_GOVERNANCE_ENGINE_ID = "execution_governance";
export const EXECUTION_GOVERNANCE_ENGINE_PRIORITY = 150;

export const AUTHORIZATION_STATUSES = Object.freeze(["verified", "denied", "pending"]);
export const PERMISSION_STATUSES = Object.freeze(["verified", "denied", "unverified"]);
export const PREREQUISITE_STATUSES = Object.freeze(["satisfied", "missing", "pending"]);
export const APPROVAL_STATUSES = Object.freeze(["not_required", "verified", "missing", "expired", "invalidated"]);
export const IDEMPOTENCY_STATUSES = Object.freeze(["verified", "missing", "duplicate"]);
export const ROLLBACK_POLICIES = Object.freeze(["not_supported", "compensating_action", "manual_review", "reversible", "irreversible"]);
export const EXECUTION_FAILURES = Object.freeze([
  "authorization_failed",
  "approval_missing",
  "prerequisite_missing",
  "validation_failed",
  "capability_unavailable",
  "duplicate_request",
  "policy_denied",
  "workflow_conflict",
  "execution_not_implemented",
  "unknown",
]);

export function emptyExecutionGovernanceContext() {
  return {
    executionEligible: false,
    denialReasons: ["execution_not_implemented"],
    requiredApprovals: [],
    approvalStatus: "not_required",
    authorizationStatus: "pending",
    permissionStatus: "unverified",
    prerequisiteStatus: "pending",
    idempotencyRequired: true,
    idempotencyStatus: "missing",
    auditRequired: true,
    auditContract: null,
    receiptRequired: true,
    receiptContract: null,
    rollbackPolicy: "not_supported",
    retryPolicy: "governed",
    failureClassification: "execution_not_implemented",
    executionPerformed: false,
    warnings: ["execution_unavailable"],
  };
}
