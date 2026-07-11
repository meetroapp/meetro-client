import { emptyPlanningContext, PLANNING_ENGINE_ID, PLANNING_ENGINE_PRIORITY } from "./planningContracts.js";
import { planningLog } from "./planningLogging.js";
import { resolvePlanningMode } from "./planningModes.js";
import { buildOrderedPlans } from "./planningOrdering.js";
import { resolveContextReadiness } from "./planningReadiness.js";

export async function collectPlanningIntelligence({ request = {}, collected = {}, logger = null } = {}) {
  const startedAt = Date.now();
  const snapshot = structuredClone(collected);
  if (!snapshot.recommendation || !snapshot.decision || !snapshot.validation || !snapshot.capabilities) return emptyPlanningContext();

  let planningMode = resolvePlanningMode(snapshot.recommendation, snapshot.validation, snapshot.decision);
  const ordered = buildOrderedPlans(snapshot.recommendation, snapshot.decision, snapshot.capabilities);
  if (planningMode === "planned" && !ordered.plans.length) planningMode = "no_safe_plan";
  const activePlans = planningMode === "planned" ? ordered.plans : [];
  const result = {
    plans: activePlans,
    primaryPlan: activePlans[0] || null,
    blockedPlans: ordered.blockedPlans,
    deferredPlans: ordered.deferredPlans,
    clarificationRequired: planningMode === "clarification_required" ? ["clarify_validated_recommendation"] : [],
    planningMode,
    readiness: resolveContextReadiness(planningMode, activePlans),
    confidence: activePlans[0]?.confidence || "withheld",
    executionPerformed: false,
    warnings: [...new Set([...(snapshot.recommendation.warnings || []), ...(planningMode === "no_safe_plan" ? ["no_safe_plan"] : [])])].sort(),
    metadata: { truncated: false },
  };

  planningLog(logger, "info", "intelligence.planning.completed", {
    requestId: request.requestId,
    planCount: activePlans.length,
    primaryPlanId: result.primaryPlan?.planId || null,
    blockedPlanCount: result.blockedPlans.length,
    deferredPlanCount: result.deferredPlans.length,
    readiness: result.readiness,
    confidence: result.confidence,
    executionPerformed: false,
    elapsedMs: Date.now() - startedAt,
  });
  return result;
}

export const planningEngine = Object.freeze({
  id: PLANNING_ENGINE_ID,
  priority: PLANNING_ENGINE_PRIORITY,
  supports: () => true,
  async collectContext(request, collected = {}) {
    return { section: "planning", priority: PLANNING_ENGINE_PRIORITY, data: await collectPlanningIntelligence({ request, collected }) };
  },
});
