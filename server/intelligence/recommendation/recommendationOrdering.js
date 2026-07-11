import { RECOMMENDATION_LIMITS } from "./recommendationContracts.js";
import { recommendationIsBlocked } from "./recommendationConstraints.js";
import { recommendationCategory, recommendationPriority, sortRecommendations } from "./recommendationPriorities.js";

function build(option, collected, selected) {
  const category = recommendationCategory(option, collected); const priority = recommendationPriority(option, collected, selected);
  return {
    recommendationId: `recommendation:${option.optionId}`, title: option.title, priority, category,
    decisionId: option.optionId, capabilityId: option.capabilityId,
    supportingEngines: [...(option.supportingEngines || [])], supportingEvidence: [...(option.supportingEvidence || [])].slice(0, RECOMMENDATION_LIMITS.evidence),
    rationale: selected ? ["selected_by_validated_decision", ...(collected.workflow?.blocked ? ["workflow_attention_required"] : [])] : ["validated_alternative"],
    prerequisites: [...(option.prerequisites || [])], constraints: [...(option.constraints || [])],
    approvalRequired: Boolean(option.approvalRequired), requiresExplicitApproval: Boolean(option.approvalRequired),
    confidence: option.confidence || "withheld", blocked: recommendationIsBlocked(option, collected),
  };
}

export function orderRecommendations(collected = {}) {
  const selectedId = collected.decision?.recommendedOption;
  return (collected.decision?.options || []).map((option) => build(option, collected, option.optionId === selectedId)).sort(sortRecommendations).slice(0, RECOMMENDATION_LIMITS.recommendations);
}

