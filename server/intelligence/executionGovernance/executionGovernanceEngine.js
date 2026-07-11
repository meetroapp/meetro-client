import { buildExecutionAuditContract } from "./executionAudit.js";
import { emptyExecutionGovernanceContext, EXECUTION_GOVERNANCE_ENGINE_ID, EXECUTION_GOVERNANCE_ENGINE_PRIORITY } from "./executionContracts.js";
import { executionGovernanceLog } from "./executionLogging.js";
import { evaluateExecutionPolicy } from "./executionPolicies.js";
import { buildExecutionReceiptContract } from "./executionReceipts.js";

export async function collectExecutionGovernance({ request = {}, collected = {}, logger = null } = {}) {
  const startedAt = Date.now();
  const snapshot = structuredClone(collected);
  if (!snapshot.planning || !snapshot.recommendation || !snapshot.validation || !snapshot.capabilities) return emptyExecutionGovernanceContext();

  const policy = evaluateExecutionPolicy({ request, collected: snapshot });
  const evaluatedAt = request.backendContext?.executionGovernance?.evaluatedAt || null;
  const auditContract = buildExecutionAuditContract({ request, authorization: policy.authorization, approvals: policy.approvals, failureClassification: policy.failureClassification, rollbackPolicy: policy.rollbackPolicy, evaluatedAt });
  const receiptContract = buildExecutionReceiptContract({ request, authorization: policy.authorization, approvals: policy.approvals, failureClassification: policy.failureClassification, rollbackPolicy: policy.rollbackPolicy, evaluatedAt });
  const result = {
    executionEligible: false,
    denialReasons: policy.denialReasons,
    requiredApprovals: policy.approvals.requiredApprovals,
    approvalStatus: policy.approvals.status,
    authorizationStatus: policy.authorization.status,
    authorizationChecks: policy.authorization.checks,
    permissionStatus: policy.authorization.permissionStatus,
    prerequisiteStatus: policy.prerequisites,
    idempotencyRequired: true,
    idempotencyStatus: policy.idempotency.status,
    duplicateRequest: policy.idempotency.duplicate,
    auditRequired: true,
    auditContract,
    receiptRequired: true,
    receiptContract,
    rollbackPolicy: policy.rollbackPolicy,
    retryPolicy: "governed",
    failureClassification: policy.failureClassification,
    executionPerformed: false,
    warnings: ["execution_unavailable"],
  };
  executionGovernanceLog(logger, "info", "intelligence.execution_governance.completed", {
    requestId: request.requestId,
    authorizationStatus: result.authorizationStatus,
    permissionStatus: result.permissionStatus,
    approvalStatus: result.approvalStatus,
    prerequisiteStatus: result.prerequisiteStatus,
    idempotencyStatus: result.idempotencyStatus,
    rollbackPolicy: result.rollbackPolicy,
    failureClassification: result.failureClassification,
    denialCount: result.denialReasons.length,
    executionEligible: false,
    executionPerformed: false,
    elapsedMs: Date.now() - startedAt,
  });
  return result;
}

export const executionGovernanceEngine = Object.freeze({
  id: EXECUTION_GOVERNANCE_ENGINE_ID,
  priority: EXECUTION_GOVERNANCE_ENGINE_PRIORITY,
  supports: () => true,
  async collectContext(request, collected = {}) {
    return { section: "executionGovernance", priority: EXECUTION_GOVERNANCE_ENGINE_PRIORITY, data: await collectExecutionGovernance({ request, collected }) };
  },
});
