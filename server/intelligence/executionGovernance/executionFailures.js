export function classifyExecutionFailure({ authorization, approvals, prerequisites, idempotency, planning, validation } = {}) {
  if (["blocked", "conflicted", "unauthorized", "insufficient_evidence", "stale_only"].includes(validation?.status)) return "validation_failed";
  if (authorization?.status === "denied") return "authorization_failed";
  if (["missing", "expired", "invalidated"].includes(approvals?.status)) return "approval_missing";
  if (prerequisites === "missing") return "prerequisite_missing";
  if (idempotency?.status === "duplicate") return "duplicate_request";
  if (!planning?.primaryPlan) return planning?.planningMode === "blocked" ? "workflow_conflict" : "policy_denied";
  return "execution_not_implemented";
}
