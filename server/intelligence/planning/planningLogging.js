export function planningLog(logger, level, event, fields = {}) {
  const keys = ["requestId", "planCount", "primaryPlanId", "blockedPlanCount", "deferredPlanCount", "readiness", "confidence", "executionPerformed", "elapsedMs"];
  logger?.[level]?.(event, Object.fromEntries(keys.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]])));
}
