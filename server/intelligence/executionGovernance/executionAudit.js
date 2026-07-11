export function buildExecutionAuditContract({ request = {}, authorization, approvals, failureClassification, rollbackPolicy, evaluatedAt = null } = {}) {
  return {
    executionRequestId: request.requestId || "companion-request",
    approvalReferenceRequired: approvals?.status !== "not_required",
    authorizationVerification: authorization?.status || "pending",
    timestampRequired: true,
    evaluationTimestamp: evaluatedAt || null,
    executionResult: "not_executed",
    rollbackReferenceRequired: rollbackPolicy !== "not_supported",
    failureClassification,
    executionPerformed: false,
  };
}
