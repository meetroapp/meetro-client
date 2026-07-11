import { evaluateExecutionApprovals } from "./executionApprovals.js";
import { evaluateExecutionAuthorization } from "./executionAuthorization.js";
import { classifyExecutionFailure } from "./executionFailures.js";
import { evaluateExecutionIdempotency } from "./executionIdempotency.js";
import { classifyRollbackPolicy } from "./executionRollback.js";

function prerequisiteStatus(plan = null) {
  if (!plan) return "pending";
  return (plan.prerequisites || []).some((item) => item.status !== "satisfied") || (plan.missingInformation || []).length
    ? "missing"
    : "satisfied";
}

export function evaluateExecutionPolicy({ request = {}, collected = {} } = {}) {
  const planning = collected.planning || {};
  const plan = planning.primaryPlan || null;
  const governance = request.backendContext?.executionGovernance || {};
  const authorization = evaluateExecutionAuthorization({ request, collected });
  const approvals = evaluateExecutionApprovals({ plan, governance });
  const idempotency = evaluateExecutionIdempotency(governance);
  const prerequisites = prerequisiteStatus(plan);
  const rollbackPolicy = classifyRollbackPolicy(plan);
  const failureClassification = classifyExecutionFailure({
    authorization,
    approvals,
    prerequisites,
    idempotency,
    planning,
    validation: collected.validation,
  });
  const denialReasons = [...new Set([
    ...(authorization.status !== "verified" ? ["authorization_not_verified"] : []),
    ...(["missing", "expired", "invalidated"].includes(approvals.status) ? [`approval_${approvals.status}`] : []),
    ...(prerequisites !== "satisfied" ? ["prerequisites_not_satisfied"] : []),
    ...(idempotency.status !== "verified" ? [`idempotency_${idempotency.status}`] : []),
    ...(!plan ? ["eligible_plan_unavailable"] : []),
    "execution_not_implemented",
  ])].sort();
  return { authorization, approvals, idempotency, prerequisites, rollbackPolicy, failureClassification, denialReasons };
}
