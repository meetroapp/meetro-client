export function resolveValidationPolicy({ assessed, contradictions, staleEvidence, missingEvidence, scopeConflicts, collected }) {
  const critical = contradictions.some((item) => item.severity === "critical");
  const high = contradictions.some((item) => item.severity === "high");
  const unauthorized = collected.knowledge?.knowledgeStatus === "unauthorized" || collected.capabilities?.status === "restricted";
  const ambiguous = collected.capabilities?.status === "ambiguous" || collected.capabilities?.clarification?.required === true;
  const safety = ["emergency", "safety", "permits", "terms", "privacy"].includes(collected.knowledge?.query?.domain);
  const insufficient = collected.knowledge?.knowledgeStatus === "insufficient_evidence" && collected.capabilities?.selectedCapability?.domain === "knowledge";
  let status = "supported"; let overallConfidence = "high"; let responseMode = "definitive";
  if (critical || unauthorized) { status = "blocked"; overallConfidence = "withheld"; responseMode = "blocked"; }
  else if (high || scopeConflicts.length) { status = "conflicted"; overallConfidence = "withheld"; responseMode = "conflict_warning"; }
  else if (ambiguous) { status = "partially_supported"; overallConfidence = "low"; responseMode = "clarification_required"; }
  else if (insufficient || missingEvidence.length) { status = "insufficient_evidence"; overallConfidence = "withheld"; responseMode = "insufficient_evidence"; }
  else if (staleEvidence.length || Object.values(assessed).some((item) => item.relevant && item.confidence !== "high")) { status = staleEvidence.length ? "stale_only" : "partially_supported"; overallConfidence = "medium"; responseMode = "qualified"; }
  if (safety && (overallConfidence !== "high" || collected.knowledge?.knowledgeStatus !== "supported")) responseMode = "escalation_required";
  const disclaimerCodes = [...new Set(collected.knowledge?.disclaimers || [])];
  return { status, overallConfidence, responseMode, responseConstraints: { mayUseDefinitiveLanguage: responseMode === "definitive", mustQualify: responseMode !== "definitive", clarificationRequired: ambiguous, disclaimerCodes, escalationRequired: responseMode === "escalation_required", blockedTopics: contradictions.filter((item) => item.severity === "critical").map((item) => item.topic).sort() } };
}

