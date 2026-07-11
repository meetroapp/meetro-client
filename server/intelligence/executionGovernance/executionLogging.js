export function executionGovernanceLog(logger, level, event, fields = {}) {
  const keys = ["requestId", "authorizationStatus", "permissionStatus", "approvalStatus", "prerequisiteStatus", "idempotencyStatus", "rollbackPolicy", "failureClassification", "denialCount", "executionEligible", "executionPerformed", "elapsedMs"];
  logger?.[level]?.(event, Object.fromEntries(keys.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]])));
}
