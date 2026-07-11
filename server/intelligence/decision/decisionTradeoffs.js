import { DECISION_LIMITS } from "./decisionContracts.js";
export function buildDecisionTradeoffs(options = []) {
  const values = [];
  for (let i = 0; i < options.length; i += 1) for (let j = i + 1; j < options.length; j += 1) values.push({ tradeoffId: `tradeoff:${options[i].optionId}:${options[j].optionId}`, optionA: options[i].optionId, optionB: options[j].optionId, advantages: [...options[i].advantages], disadvantages: [...options[j].disadvantages], evidence: [...new Set([...options[i].supportingEvidence, ...options[j].supportingEvidence])].sort().slice(0, 10), confidence: options[i].confidence === options[j].confidence ? options[i].confidence : "medium" });
  return values.sort((a, b) => a.tradeoffId.localeCompare(b.tradeoffId)).slice(0, DECISION_LIMITS.tradeoffs);
}

