export const CAPABILITY_ENGINE_ID = "capability";
export const CAPABILITY_ENGINE_PRIORITY = 100;

export const CAPABILITY_CATEGORIES = Object.freeze([
  "informational", "diagnostic", "navigational", "preparatory", "review", "communication",
  "workflow_action", "business_action", "community_action", "document_action", "administrative",
  "restricted", "unsupported",
]);
export const CAPABILITY_MODES = Object.freeze(["read_only", "draft_only", "preparatory", "user_approved", "restricted", "unavailable"]);
export const CAPABILITY_RISKS = Object.freeze(["informational", "standard", "sensitive", "high_impact", "prohibited"]);
export const CAPABILITY_STATUSES = Object.freeze(["available", "available_with_missing_inputs", "blocked", "restricted", "unsupported", "ambiguous", "unavailable"]);

export function emptyCapabilityContext(reasonCode = "unsupported_intent") {
  return {
    intent: { intentId: "unknown", category: "unsupported", confidence: "low", source: "unknown" },
    requestedOutcome: { code: "unknown", label: "", mode: "read_only" },
    selectedCapability: null,
    alternatives: [],
    authorization: { authenticated: false, roleAllowed: false, businessScopeAllowed: false, relationshipScopeAllowed: false, workflowScopeAllowed: false, permissionStatus: "unknown" },
    prerequisites: { satisfied: [], missing: [], blockedBy: [] },
    requiredInputs: { present: [], missing: [], invalid: [], unauthorized: [], optional: [] },
    supportingEngines: [],
    nextStep: { code: "unsupported_request", type: "unsupported_request", actor: "user", approvalRequired: false, label: "Ask for a supported Meetro Community task." },
    execution: { performed: false, executableNow: false, requiresExplicitApproval: false, executionCapabilityId: null },
    status: "unsupported", reasonCode, confidence: "low", evidence: [], warnings: [],
  };
}

