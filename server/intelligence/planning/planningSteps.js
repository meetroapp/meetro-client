import { PLANNING_LIMITS } from "./planningContracts.js";

function stepId(planId, order, code) {
  return `${planId}:step:${String(order).padStart(2, "0")}:${code}`;
}

function step(planId, order, code, values = {}) {
  return {
    stepId: stepId(planId, order, code),
    order,
    title: values.title,
    description: values.description,
    capabilityId: values.capabilityId,
    dependsOn: [...(values.dependsOn || [])],
    prerequisites: [...(values.prerequisites || [])],
    approvalRequired: Boolean(values.approvalRequired),
    completionCondition: values.completionCondition,
    reversible: values.reversible,
    executionAllowed: false,
    executionPerformed: false,
  };
}

export function buildPlanningSteps({ planId, recommendation, prerequisites, missingInformation, requiredApprovals } = {}) {
  const steps = [];
  const capabilityId = recommendation.capabilityId;

  for (const prerequisite of prerequisites) {
    const order = steps.length + 1;
    steps.push(step(planId, order, `prerequisite:${prerequisite.code}`, {
      title: "Resolve required prerequisite",
      description: prerequisite.code,
      capabilityId,
      completionCondition: `verified_prerequisite:${prerequisite.code}`,
      reversible: true,
    }));
  }

  for (const missing of missingInformation) {
    const order = steps.length + 1;
    steps.push(step(planId, order, `information:${missing.code}`, {
      title: "Provide required information",
      description: missing.code,
      capabilityId,
      dependsOn: steps.length ? [steps.at(-1).stepId] : [],
      completionCondition: `verified_information:${missing.code}`,
      reversible: true,
    }));
  }

  const reviewOrder = steps.length + 1;
  steps.push(step(planId, reviewOrder, "review", {
    title: `Review ${recommendation.title || capabilityId}`,
    description: "Review the validated recommendation, constraints, and current product state.",
    capabilityId,
    dependsOn: steps.length ? [steps.at(-1).stepId] : [],
    prerequisites: prerequisites.map((item) => item.code),
    completionCondition: `review_confirmed:${capabilityId}`,
    reversible: true,
  }));

  if (requiredApprovals.length) {
    const order = steps.length + 1;
    steps.push(step(planId, order, "approval", {
      title: "Request explicit approval",
      description: "Obtain action-specific approval before any separate future product action.",
      capabilityId,
      dependsOn: [steps.at(-1).stepId],
      approvalRequired: true,
      completionCondition: `explicit_approval_recorded:${capabilityId}`,
      reversible: true,
    }));
  }

  return steps.slice(0, PLANNING_LIMITS.steps);
}
