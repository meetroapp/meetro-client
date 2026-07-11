import { PLANNING_LIMITS } from "./planningContracts.js";
import { resolvePlanReadiness } from "./planningReadiness.js";
import {
  buildMissingInformation,
  buildPlanDependencies,
  buildPlanPrerequisites,
  buildRequiredApprovals,
} from "./planningDependencies.js";
import { buildPlanningSteps } from "./planningSteps.js";

function unique(values = []) {
  return [...new Set(values.filter(Boolean))].sort();
}

function buildRisks(recommendation, readiness) {
  return unique([
    ...(recommendation.constraints || []),
    ...(readiness === "awaiting_approval" ? ["missing_explicit_approval"] : []),
    ...(recommendation.blocked ? ["recommendation_blocked"] : []),
  ]).slice(0, PLANNING_LIMITS.items).map((code) => ({ code, source: "validated_recommendation" }));
}

export function buildPlan(recommendation = {}, planningMode = "planned", capability = {}) {
  const planId = `plan:${recommendation.recommendationId}`;
  const prerequisites = buildPlanPrerequisites(recommendation);
  const dependencies = buildPlanDependencies(prerequisites);
  const missingInformation = buildMissingInformation(recommendation, capability);
  const requiredApprovals = buildRequiredApprovals(recommendation);
  const readiness = resolvePlanReadiness({ mode: planningMode, missingInformation, requiredApprovals, prerequisites });
  return {
    planId,
    title: `Plan for ${recommendation.title || recommendation.capabilityId}`,
    goal: recommendation.title || recommendation.capabilityId,
    recommendationId: recommendation.recommendationId,
    decisionId: recommendation.decisionId,
    capabilityId: recommendation.capabilityId,
    category: recommendation.category,
    priority: recommendation.priority,
    sourceEngines: unique(recommendation.supportingEngines),
    supportingEvidence: unique(recommendation.supportingEvidence).slice(0, PLANNING_LIMITS.evidence),
    prerequisites,
    dependencies,
    missingInformation,
    steps: buildPlanningSteps({ planId, recommendation, prerequisites, missingInformation, requiredApprovals }),
    requiredApprovals,
    constraints: unique(recommendation.constraints).slice(0, PLANNING_LIMITS.items),
    risks: buildRisks(recommendation, readiness),
    rollbackConsiderations: requiredApprovals.length
      ? [{ code: "manual_review", status: "required_before_future_action" }, { code: "retain_draft_state", status: "recommended" }]
      : [{ code: "manual_review", status: "available" }],
    completionCriteria: [{ code: `verified_product_state:${recommendation.capabilityId}`, status: "not_verified" }],
    estimatedEffort: "unknown",
    readiness,
    planningMode,
    confidence: recommendation.confidence || "withheld",
    executionAllowed: false,
    executionPerformed: false,
  };
}

export function buildOrderedPlans(recommendation = {}, decision = {}, capability = {}) {
  const decisionOptions = new Map((decision.options || []).map((item) => [item.optionId, item.capabilityId]));
  const capabilityIds = new Set([
    capability.selectedCapability?.capabilityId,
    ...(capability.alternatives || []).map((item) => item.capabilityId),
  ].filter(Boolean));
  const supported = (items = []) => items.filter((item) => (
    decisionOptions.get(item.decisionId) === item.capabilityId && capabilityIds.has(item.capabilityId)
  ));
  return {
    plans: supported(recommendation.recommendations).slice(0, PLANNING_LIMITS.plans).map((item) => buildPlan(item, "planned", capability)),
    deferredPlans: supported(recommendation.deferredRecommendations).slice(0, PLANNING_LIMITS.plans).map((item) => buildPlan(item, "deferred", capability)),
    blockedPlans: supported(recommendation.blockedRecommendations).slice(0, PLANNING_LIMITS.plans).map((item) => buildPlan(item, "blocked", capability)),
  };
}
