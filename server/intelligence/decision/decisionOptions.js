import { DECISION_LIMITS } from "./decisionContracts.js";

function option(capability, source, collected) {
  const validation = collected.validation || {}; const selected = source === "selected";
  const status = selected ? collected.capabilities?.status : "alternative";
  const blocked = ["blocked", "restricted", "unsupported", "unavailable"].includes(status) || ["blocked", "conflicted", "unauthorized", "insufficient_evidence"].includes(validation.status);
  return {
    optionId: `decision:${capability.capabilityId}`, title: capability.name || capability.label || capability.capabilityId,
    capabilityId: capability.capabilityId, supportingEngines: [...new Set([...(collected.capabilities?.supportingEngines || []), ...(validation.evidence?.supportingEngineIds || [])])].sort(),
    supportingEvidence: (validation.evidence?.references || []).map((item) => item.evidenceId).slice(0, DECISION_LIMITS.evidence),
    advantages: blocked ? [] : [selected ? "aligned_with_selected_capability" : "available_alternative"],
    disadvantages: selected ? [...(collected.capabilities?.requiredInputs?.missing || []).map((item) => `missing_input:${item}`)] : ["requires_user_selection"],
    constraints: [...new Set([...(validation.warnings || []), ...(collected.capabilities?.prerequisites?.missing || []).map((item) => `prerequisite:${item}`)])].sort(),
    prerequisites: [...(collected.capabilities?.prerequisites?.missing || [])],
    permissionStatus: selected ? collected.capabilities?.authorization?.permissionStatus || "unknown" : "requires_validation",
    validationStatus: validation.status || "unknown", confidence: validation.overallConfidence || "withheld",
    approvalRequired: selected ? Boolean(collected.capabilities?.execution?.requiresExplicitApproval) : capability.mode === "user_approved",
    blocked,
  };
}

export function buildDecisionOptions(collected = {}) {
  const capability = collected.capabilities || {}; const options = [];
  if (capability.selectedCapability?.capabilityId) options.push(option(capability.selectedCapability, "selected", collected));
  for (const alternative of capability.alternatives || []) if (alternative.capabilityId) options.push(option(alternative, "alternative", collected));
  return [...new Map(options.map((item) => [item.optionId, item])).values()].sort((a, b) => Number(a.blocked) - Number(b.blocked) || a.optionId.localeCompare(b.optionId)).slice(0, DECISION_LIMITS.options);
}

