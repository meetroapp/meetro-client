import { DECISION_ENGINE_ID, DECISION_ENGINE_PRIORITY, DECISION_LIMITS, emptyDecisionContext } from "./decisionContracts.js";
import { buildDecisionConstraints } from "./decisionConstraints.js";
import { decisionLog } from "./decisionLogging.js";
import { buildDecisionOptions } from "./decisionOptions.js";
import { resolveDecisionRecommendation } from "./decisionRecommendation.js";
import { buildDecisionTradeoffs } from "./decisionTradeoffs.js";

export async function collectDecisionIntelligence({ request = {}, collected = {}, logger = null } = {}) {
  const startedAt = Date.now(); const snapshot = structuredClone(collected);
  if (!snapshot.validation || !snapshot.capabilities) return emptyDecisionContext("unsupported");
  const options = buildDecisionOptions(snapshot); const constraints = buildDecisionConstraints(snapshot, options);
  const recommendation = resolveDecisionRecommendation(snapshot, options);
  const rejectedOptions = options.filter((item) => item.blocked).map((item) => ({ optionId: item.optionId, reason: item.validationStatus === "blocked" ? "validation_blocked" : "option_blocked" })).slice(0, DECISION_LIMITS.rejected);
  const result = {
    options, recommendedOption: recommendation.selected ? recommendation.selected.optionId : null, rejectedOptions,
    constraints: constraints.slice(0, DECISION_LIMITS.constraints), tradeoffs: buildDecisionTradeoffs(options),
    supportingEvidence: [...new Set(options.flatMap((item) => item.supportingEvidence))].sort().slice(0, DECISION_LIMITS.evidence),
    recommendationMode: recommendation.mode, approvalRequired: Boolean(recommendation.selected?.approvalRequired),
    confidence: recommendation.selected ? snapshot.validation.overallConfidence : "withheld",
    warnings: [...new Set([...(snapshot.validation.warnings || []), ...(recommendation.mode === "no_safe_option" ? ["no_safe_supported_option"] : [])])].sort(),
    execution: { performed: false, executableNow: false }, metadata: { truncated: options.length >= DECISION_LIMITS.options || constraints.length > DECISION_LIMITS.constraints },
  };
  decisionLog(logger, "info", "intelligence.decision.completed", { requestId: request.requestId, optionCount: options.length, selectedOptionId: result.recommendedOption, recommendationMode: result.recommendationMode, confidence: result.confidence, elapsedMs: Date.now() - startedAt });
  return result;
}

export const decisionEngine = Object.freeze({ id: DECISION_ENGINE_ID, priority: DECISION_ENGINE_PRIORITY, supports: () => true, async collectContext(request, collected = {}) { return { section: "decision", priority: DECISION_ENGINE_PRIORITY, data: await collectDecisionIntelligence({ request, collected }) }; } });

