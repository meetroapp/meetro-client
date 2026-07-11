export function decisionLog(logger, level, event, fields = {}) {
  const keys = ["requestId", "optionCount", "selectedOptionId", "recommendationMode", "confidence", "elapsedMs"];
  logger?.[level]?.(event, Object.fromEntries(keys.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]])));
}

