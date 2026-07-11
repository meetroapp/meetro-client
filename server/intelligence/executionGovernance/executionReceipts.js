export function buildExecutionReceiptContract({ request = {}, authorization, approvals, rollbackPolicy, failureClassification, evaluatedAt = null } = {}) {
  return {
    receiptRequired: true,
    executionRequestId: request.requestId || "companion-request",
    approvalReference: approvals?.status === "verified" ? "verified_approval_required_at_future_execution" : null,
    authorizationVerification: authorization?.status || "pending",
    timestamp: evaluatedAt || null,
    executionResult: "not_executed",
    rollbackReference: rollbackPolicy === "not_supported" ? null : "required_at_future_execution",
    failureClassification,
    executionPerformed: false,
  };
}
