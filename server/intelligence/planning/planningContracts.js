export const PLANNING_ENGINE_ID = "planning";
export const PLANNING_ENGINE_PRIORITY = 140;

export const PLANNING_MODES = Object.freeze([
  "planned",
  "deferred",
  "blocked",
  "clarification_required",
  "no_safe_plan",
  "no_action",
]);

export const PLANNING_READINESS = Object.freeze([
  "ready",
  "partially_ready",
  "blocked",
  "awaiting_information",
  "awaiting_approval",
  "not_applicable",
]);

export const PLANNING_EFFORT = Object.freeze(["minimal", "low", "moderate", "high", "unknown"]);
export const PLANNING_LIMITS = Object.freeze({ plans: 6, steps: 12, evidence: 20, items: 20 });

export function emptyPlanningContext(planningMode = "no_safe_plan") {
  return {
    plans: [],
    primaryPlan: null,
    blockedPlans: [],
    deferredPlans: [],
    clarificationRequired: [],
    planningMode,
    readiness: planningMode === "no_action" ? "not_applicable" : "blocked",
    confidence: "withheld",
    executionPerformed: false,
    warnings: planningMode === "no_safe_plan" ? ["no_safe_plan"] : [],
    metadata: { truncated: false },
  };
}
