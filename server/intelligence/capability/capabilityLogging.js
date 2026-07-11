export function capabilityLog(logger, level, event, fields = {}) {
  const allowed = ["requestId", "intentId", "capabilityId", "status", "category", "riskLevel", "missingInputCount", "blockedPrerequisiteCount", "alternativeCount", "confidence", "elapsedMs"];
  logger?.[level]?.(event, Object.fromEntries(allowed.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]])));
}

