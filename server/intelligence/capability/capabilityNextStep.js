export function buildCapabilityNextStep({ capability, authorization, prerequisites, inputs, status } = {}) {
  if (status === "restricted") return { code: "resolve_capability_access", type: authorization.missingScopes.length ? "resolve_scope" : "resolve_permission", actor: "user", approvalRequired: false, label: "Use an authorized account and workspace before continuing." };
  if (status === "blocked") return { code: `complete_${prerequisites.missing[0] || "prerequisite"}_first`, type: "complete_prerequisite", actor: authorization.role === "professional" ? "professional" : "user", approvalRequired: false, label: "Complete the required workflow prerequisite before continuing." };
  if (status === "available_with_missing_inputs") return { code: `collect_${inputs.missing[0] || "required_input"}`, type: "collect_input", actor: "user", approvalRequired: false, label: "Provide the missing required information before preparing this capability." };
  if (["draft_only", "preparatory"].includes(capability.executionMode)) return { code: "review_prepared_work", type: "review_draft", actor: "user", approvalRequired: false, label: "Review the prepared information before any separate product action." };
  return { code: "explain_capability", type: "explain", actor: "user", approvalRequired: false, label: "Review the available guidance and decide what to do next." };
}

