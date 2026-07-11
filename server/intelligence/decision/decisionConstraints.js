export function buildDecisionConstraints(collected = {}, options = []) {
  const validation = collected.validation || {}; const capability = collected.capabilities || {};
  return [...new Set([
    ...options.flatMap((item) => item.constraints),
    ...(validation.missingEvidence || []).map((item) => `missing_evidence:${item}`),
    ...(validation.scopeConflicts || []).map((item) => item.code),
    ...(validation.responseConstraints?.blockedTopics || []).map((item) => `blocked_topic:${item}`),
    ...(capability.requiredInputs?.missing || []).map((item) => `missing_input:${item}`),
    capability.authorization?.permissionStatus && capability.authorization.permissionStatus !== "allowed" ? `permission:${capability.authorization.permissionStatus}` : null,
  ].filter(Boolean))].sort();
}

