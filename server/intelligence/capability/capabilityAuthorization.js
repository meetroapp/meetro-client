function values(input) { return Array.isArray(input) ? input.map(String) : []; }
function roleOf(user = {}) {
  const role = String(user.accountType || user.account_type || user.role || user.userRole || "").toLowerCase();
  if (["professional", "business", "contractor", "business_owner", "business_member"].includes(role) || user.isProfessional === true) return "professional";
  if (["standard", "personal", "homeowner", "member", "standard_user"].includes(role)) return "standard";
  return "unknown";
}

export function evaluateCapabilityAuthorization({ capability, request = {}, collected = {} } = {}) {
  const backend = request.backendContext || {};
  const user = request.user || {};
  const role = roleOf(user);
  const authenticated = Boolean(request.userId);
  const scopes = {
    user: authenticated,
    business: Boolean(collected.business?.businessId || collected.context?.professional?.businessName || values(backend.authorizedBusinessIds).length),
    relationship: Boolean(collected.relationship?.relationshipId || values(backend.authorizedRelationshipIds).length),
    workflow: Boolean(collected.workflow?.workflowId),
    conversation: Boolean(collected.relationship?.conversationId || collected.context?.workflow?.conversationId || values(backend.authorizedConversationIds).length),
    community: Boolean(collected.community?.communityId || backend.publicCommunityId || values(backend.authorizedCommunityIds).length),
    document: Boolean(backend.authorizedDocumentIds?.length),
    system: user.systemAuthorized === true,
  };
  const missingScopes = capability.requiredScopes.filter((scope) => !scopes[scope]);
  const permissions = new Set(values(backend.permissions || user.permissions));
  const missingPermissions = capability.requiredPermissions.filter((permission) => !permissions.has(permission));
  const roleAllowed = capability.supportedRoles.includes(role);
  const permissionStatus = !authenticated ? "denied" : !roleAllowed ? "denied" : missingScopes.length ? "insufficient_scope" : missingPermissions.length ? "missing_permission" : "allowed";
  return {
    authenticated, role, roleAllowed,
    businessScopeAllowed: scopes.business, relationshipScopeAllowed: scopes.relationship,
    workflowScopeAllowed: scopes.workflow, conversationScopeAllowed: scopes.conversation,
    communityScopeAllowed: scopes.community, permissionStatus, missingScopes, missingPermissions,
  };
}

