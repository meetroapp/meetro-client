function check(code, verified, denied = false) {
  return { code, status: denied ? "denied" : verified ? "verified" : "pending" };
}

export function evaluateExecutionAuthorization({ request = {}, collected = {} } = {}) {
  const gateway = request.gatewayGovernance || {};
  const capability = collected.capabilities || {};
  const authorization = capability.authorization || {};
  const capabilityId = capability.selectedCapability?.capabilityId || "";
  const domain = capabilityId.split(".")[0];
  const requiresWorkflow = ["workflow", "emergency", "document"].includes(domain);
  const requiresResource = !["product", "knowledge", "onboarding"].includes(domain);
  const permissionDenied = authorization.permissionStatus === "denied" || gateway.permissionsValid === false;
  const checks = [
    check("authenticated_user", gateway.authenticated === true, gateway.authenticated === false),
    check("active_session", gateway.sessionActive === true, gateway.sessionActive === false),
    check("membership", gateway.membershipValid === true, gateway.membershipValid === false),
    check("credits", gateway.creditsValid === true, gateway.creditsValid === false),
    check("rate_limit", gateway.rateLimitValid === true, gateway.rateLimitValid === false),
    check("permissions", gateway.permissionsValid === true && !permissionDenied, permissionDenied),
    check("capability_available", capability.status === "available", ["blocked", "restricted", "unsupported", "unavailable"].includes(capability.status)),
    check("workflow_ownership", authorization.workflowScopeAllowed === true, requiresWorkflow && authorization.workflowScopeAllowed === false),
    check("resource_ownership", authorization.workflowScopeAllowed === true || authorization.businessScopeAllowed === true || authorization.relationshipScopeAllowed === true || authorization.communityScopeAllowed === true, false),
  ];
  const requiredCodes = new Set(checks.slice(0, 7).map((item) => item.code));
  if (requiresWorkflow) requiredCodes.add("workflow_ownership");
  if (requiresResource) requiredCodes.add("resource_ownership");
  const requiredChecks = checks.filter((item) => requiredCodes.has(item.code));
  const status = checks.some((item) => item.status === "denied")
    ? "denied"
    : requiredChecks.every((item) => item.status === "verified") ? "verified" : "pending";
  return {
    status,
    permissionStatus: permissionDenied ? "denied" : gateway.permissionsValid === true ? "verified" : "unverified",
    checks,
  };
}
