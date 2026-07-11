export function recommendationLog(logger, level, event, fields = {}) { const keys = ["requestId", "recommendationCount", "highestPriority", "blockedCount", "confidence", "elapsedMs"]; logger?.[level]?.(event, Object.fromEntries(keys.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]]))); }

