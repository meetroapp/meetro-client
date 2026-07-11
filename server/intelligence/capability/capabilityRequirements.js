function workflowStages(collected = {}) { return new Set(collected.workflow?.completedStages || []); }

export function evaluateCapabilityPrerequisites(capability, authorization, collected = {}) {
  const workflow = collected.workflow || {};
  const stages = workflowStages(collected);
  const checks = {
    authenticated: authorization.authenticated,
    business_authorized: authorization.businessScopeAllowed,
    relationship_exists: authorization.relationshipScopeAllowed,
    workflow_exists: authorization.workflowScopeAllowed,
    conversation_authorized: authorization.conversationScopeAllowed,
    community_scope_authorized: authorization.communityScopeAllowed,
    evaluation_saved: stages.has("evaluation") || ["proposal", "customer_approval", "payment_deposit", "schedule_work", "perform_work", "completion", "invoice_receipt", "closure", "job_history"].includes(workflow.currentStage) || workflow.nextAction?.action === "create_proposal",
    proposal_exists: stages.has("proposal") || ["customer_approval", "payment_deposit", "schedule_work", "perform_work", "completion", "invoice_receipt", "closure", "job_history"].includes(workflow.currentStage),
    proposal_approved: ["payment_deposit", "schedule_work", "perform_work", "completion", "invoice_receipt", "closure", "job_history"].includes(workflow.currentStage),
    deposit_satisfied: !["pending", "missing", "blocked"].includes(workflow.obligations?.deposit),
    work_completed: workflow.completion?.workCompleted === true,
    completion_recorded: workflow.completion?.completionRecorded === true,
    closure_ready: workflow.completion?.completionRecorded === true && workflow.blocked !== true,
    history_eligible: workflow.completion?.historyEligible === true,
    knowledge_supported: collected.knowledge?.knowledgeStatus === "supported",
  };
  const satisfied = capability.prerequisites.filter((item) => checks[item] === true);
  const missing = capability.prerequisites.filter((item) => checks[item] !== true);
  const blockedBy = [...new Set([...(workflow.blockers || []).map((item) => item.code), ...missing])];
  return { satisfied, missing, blockedBy };
}

export function evaluateCapabilityInputs(capability, request = {}, collected = {}) {
  const backendInputs = request.backendContext?.capabilityInputs || {};
  const trusted = {
    workflowId: collected.workflow?.workflowId,
    customerId: request.backendContext?.customerId || collected.relationship?.customerId,
    conversationId: collected.relationship?.conversationId || collected.context?.workflow?.conversationId,
    evaluationId: request.backendContext?.evaluationId,
    ...backendInputs,
  };
  const present = capability.requiredInputs.filter((key) => trusted[key] !== undefined && trusted[key] !== null && trusted[key] !== "");
  const missing = capability.requiredInputs.filter((key) => !present.includes(key));
  const invalid = capability.requiredInputs.filter((key) => present.includes(key) && ((Array.isArray(trusted[key]) && trusted[key].length === 0) || trusted[key] === false));
  return { present: present.filter((key) => !invalid.includes(key)), missing: [...new Set([...missing, ...invalid])], invalid, unauthorized: [], optional: [...capability.optionalInputs] };
}

