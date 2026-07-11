export function validationLog(logger, level, event, fields = {}) {
  const keys = ["requestId", "status", "overallConfidence", "responseMode", "assessedEngineCount", "agreementCount", "contradictionCount", "criticalContradictionCount", "missingEvidenceCount", "staleEvidenceCount", "clarificationRequired", "escalationRequired", "elapsedMs"];
  logger?.[level]?.(event, Object.fromEntries(keys.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]])));
}

