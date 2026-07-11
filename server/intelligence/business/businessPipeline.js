export function buildBusinessPipeline({ workflows = [], typedRecords = [] } = {}) {
  const proposals = typedRecords.filter((item) => item.kind === "proposal");
  const evaluations = typedRecords.filter((item) => item.kind === "evaluation");
  const schedules = typedRecords.filter((item) => item.kind === "schedule");
  const scheduledKeys = new Set(schedules.flatMap((item) => [item.jobId, item.projectId, item.requestId].filter(Boolean)));
  return {
    newRequests: workflows.filter((item) => ["relationship", "communication"].includes(item.stage) && !item.completionRecorded).length,
    pendingEvaluations: evaluations.filter((item) => !item.evaluationComplete && !["complete", "completed", "evaluation_completed"].includes(item.status)).length,
    proposalsDraft: proposals.filter((item) => ["draft", "draft_quote", "proposal_ready", "ready_to_send"].includes(item.proposalStatus)).length,
    proposalsSent: proposals.filter((item) => ["sent", "proposal_sent", "quote_sent", "viewed", "waiting_approval", "pending_customer_approval"].includes(item.proposalStatus)).length,
    awaitingCustomerApproval: proposals.filter((item) => ["sent", "proposal_sent", "quote_sent", "viewed", "waiting_approval", "pending_customer_approval"].includes(item.proposalStatus)).length,
    approvedNotScheduled: proposals.filter((item) => item.approved && ![item.jobId, item.projectId, item.requestId].some((id) => id && scheduledKeys.has(id))).length,
  };
}
