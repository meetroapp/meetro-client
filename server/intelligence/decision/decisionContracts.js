export const DECISION_ENGINE_ID = "decision";
export const DECISION_ENGINE_PRIORITY = 120;
export const DECISION_MODES = Object.freeze(["recommended", "alternative", "clarification_required", "unsupported", "blocked", "no_safe_option"]);
export const DECISION_LIMITS = Object.freeze({ options: 5, rejected: 5, constraints: 12, tradeoffs: 6, evidence: 20 });

export function emptyDecisionContext(mode = "unsupported") {
  return { options: [], recommendedOption: null, rejectedOptions: [], constraints: [], tradeoffs: [], supportingEvidence: [], recommendationMode: mode, approvalRequired: false, confidence: "withheld", warnings: [], execution: { performed: false, executableNow: false }, metadata: { truncated: false } };
}

