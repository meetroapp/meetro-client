import { MEMORY_SCOPE_TYPES } from "./memoryContracts.js";

function text(value) { return value === undefined || value === null ? "" : String(value).trim(); }

export function authenticatedMemoryIdentity(request = {}) {
  const user = request.user || {};
  return {
    userId: text(user.id || user.userId || user.sub || user.email),
    businessIds: [...new Set([
      ...(Array.isArray(request.backendContext?.authorizedBusinessIds) ? request.backendContext.authorizedBusinessIds : []),
      ...(Array.isArray(user.authorizedBusinessIds) ? user.authorizedBusinessIds : []),
      user.businessId,
      request.backendContext?.businessProfile?.businessId,
    ].map(text).filter(Boolean))],
    internal: request.backendContext?.approvedInternalProcess === true,
  };
}

export function requestedMemoryScope(request = {}, collected = {}) {
  const identity = authenticatedMemoryIdentity(request);
  const workflow = collected.workflow || {};
  const relationship = collected.relationship || {};
  const context = collected.context || {};
  return {
    userId: identity.userId,
    businessId: text(context.professional?.businessId || request.backendContext?.businessProfile?.businessId),
    relationshipId: text(relationship.relationshipId || request.backendContext?.relationship?.relationshipId),
    workflowId: text(workflow.workflowId || workflow.jobId || workflow.projectId || workflow.requestId || workflow.emergencyRequestId),
    conversationId: text(context.workflow?.conversationId || request.backendContext?.conversation?.conversationId),
    communityId: text(request.backendContext?.community?.communityId || request.backendContext?.communityId),
    feature: text(request.feature),
    capability: text(request.capability),
  };
}

export function normalizeMemoryScope(scope = {}) {
  const type = text(scope.type);
  if (!MEMORY_SCOPE_TYPES.includes(type)) return null;
  return {
    type,
    userId: text(scope.userId),
    businessId: text(scope.businessId),
    relationshipId: text(scope.relationshipId),
    workflowId: text(scope.workflowId),
    conversationId: text(scope.conversationId),
    communityId: text(scope.communityId),
  };
}

export function memoryScopeMatches(scope = {}, requested = {}) {
  const idByType = {
    user: "userId", business: "businessId", relationship: "relationshipId",
    workflow: "workflowId", conversation: "conversationId", community: "communityId",
  };
  if (scope.type === "system") return true;
  const field = idByType[scope.type];
  return Boolean(field && scope[field] && requested[field] && scope[field] === requested[field]);
}
