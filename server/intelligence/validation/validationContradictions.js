function item(code, severity, topic, engineIds, authoritativeEngineId, resolution, userImpact = "qualification_required") {
  return { contradictionId: `validation:${code}`, code, severity, topic, engineIds, authoritativeEngineId, resolution, userImpact };
}

export function detectValidationContradictions(collected = {}) {
  const workflow = collected.workflow || {}; const capability = collected.capabilities || {};
  const relationship = collected.relationship || {}; const business = collected.business || {};
  const community = collected.community || {}; const knowledge = collected.knowledge || {};
  const contradictions = [];
  if (capability.selectedCapability && ["available", "available_with_missing_inputs"].includes(capability.status) && (workflow.blocked || capability.prerequisites?.missing?.length)) contradictions.push(item("capability_prerequisite_conflict", "high", "capability", ["workflow", "capability"], "workflow", "capability_blocked"));
  if (capability.authorization?.permissionStatus && capability.authorization.permissionStatus !== "allowed" && capability.status === "available") contradictions.push(item("capability_authorization_conflict", "critical", "permission", ["capability"], "gateway", "capability_blocked", "blocked"));
  if (capability.execution?.performed === true || capability.execution?.executableNow === true) contradictions.push(item("unexpected_capability_execution", "critical", "execution", ["capability"], "capability", "execution_blocked", "blocked"));
  if (workflow.workflowId && relationship.workflowId && workflow.workflowId !== relationship.workflowId) contradictions.push(item("relationship_workflow_identity_conflict", "high", "workflow_scope", ["workflow", "relationship"], "workflow", "scope_not_merged"));
  if (workflow.blocked && business.workflowHealth?.blocked === 0) contradictions.push(item("business_workflow_aggregate_conflict", "medium", "blocked_work", ["workflow", "business"], "workflow", "aggregate_qualified"));
  if (knowledge.knowledgeStatus === "conflicted") contradictions.push(item("knowledge_source_conflict", capability.selectedCapability?.riskLevel === "high_impact" ? "critical" : "high", "verified_knowledge", ["knowledge", "capability"], "knowledge", "guidance_qualified"));
  if (workflow.completion?.workCompleted && !workflow.completion?.closureRecorded && knowledge.guidance?.some((g) => g.code === "completion_not_closure") && workflow.currentStage === "job_history") contradictions.push(item("workflow_knowledge_rule_conflict", "high", "closure_state", ["workflow", "knowledge"], "workflow", "closure_not_assumed"));
  const prohibitedCommunity = ["privateBusinessMetrics", "privateEngagementIdentities", "trustScore", "popularityScore", "socialScore"].filter((key) => community[key] !== undefined);
  if (prohibitedCommunity.length) contradictions.push(item("community_privacy_conflict", "critical", "community_privacy", ["community"], "community", "community_context_blocked", "blocked"));
  return [...new Map(contradictions.map((entry) => [entry.contradictionId, entry])).values()].sort((a, b) => a.contradictionId.localeCompare(b.contradictionId));
}

export function detectScopeConflicts(collected = {}) {
  const pairs = [["businessId", collected.workflow?.businessId, collected.business?.businessId], ["relationshipId", collected.workflow?.relationshipId, collected.relationship?.relationshipId], ["communityId", collected.capabilities?.communityId, collected.community?.communityId]];
  return pairs.filter(([, a, b]) => a && b && a !== b).map(([scope, left, right]) => ({ code: `cross_${scope}_conflict`, scope, engineIds: ["workflow", scope === "communityId" ? "community" : scope === "businessId" ? "business" : "relationship"], values: [left, right].sort() }));
}

