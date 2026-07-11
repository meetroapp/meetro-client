export const VALIDATION_ENGINE_ID = "validation";
export const VALIDATION_ENGINE_PRIORITY = 110;
export const VALIDATION_STATUSES = Object.freeze(["supported", "partially_supported", "conflicted", "insufficient_evidence", "unauthorized", "stale_only", "blocked", "unknown"]);
export const VALIDATION_CONFIDENCE = Object.freeze(["high", "medium", "low", "withheld"]);
export const VALIDATION_LIMITS = Object.freeze({ evidence: 24, agreements: 12, contradictions: 12, warnings: 16 });

export function emptyValidationContext() {
  return {
    status: "insufficient_evidence", overallConfidence: "withheld", responseMode: "insufficient_evidence",
    engineAssessment: {}, evidence: { supportingEngineIds: [], supportingSourceIds: [], supportingRecordIds: [], unsupportedClaims: [] },
    agreements: [], contradictions: [], staleEvidence: [], missingEvidence: ["intelligence_context"], scopeConflicts: [], authorityConflicts: [],
    responseConstraints: { mayUseDefinitiveLanguage: false, mustQualify: true, clarificationRequired: false, disclaimerCodes: [], escalationRequired: false, blockedTopics: [] },
    warnings: [], metadata: { truncated: false },
  };
}

