import { PLANNING_LIMITS } from "./planningContracts.js";

function cleanCode(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_:.]+/g, "_");
}

export function buildPlanPrerequisites(recommendation = {}) {
  return [...new Set(recommendation.prerequisites || [])]
    .filter(Boolean)
    .sort()
    .slice(0, PLANNING_LIMITS.items)
    .map((code) => ({ code: cleanCode(code), status: "missing", source: "recommendation" }));
}

export function buildPlanDependencies(prerequisites = []) {
  return prerequisites.map((item) => ({
    dependencyId: `dependency:${item.code}`,
    prerequisite: item.code,
    status: item.status,
  }));
}

export function buildMissingInformation(recommendation = {}, capability = {}) {
  const capabilityMissing = recommendation.capabilityId === capability.selectedCapability?.capabilityId
    ? capability.requiredInputs?.missing || []
    : [];
  return [...new Set([...(recommendation.constraints || []), ...capabilityMissing.map((item) => `missing_input:${item}`)])]
    .filter((item) => /^(missing_input:|missing_evidence:)/.test(item))
    .sort()
    .slice(0, PLANNING_LIMITS.items)
    .map((item) => ({ code: cleanCode(item), status: "missing", source: "validated_recommendation" }));
}

export function buildRequiredApprovals(recommendation = {}) {
  if (!recommendation.approvalRequired && !recommendation.requiresExplicitApproval) return [];
  return [{
    approvalId: `approval:${recommendation.capabilityId}`,
    capabilityId: recommendation.capabilityId,
    status: "required",
    explicit: true,
  }];
}
