export function evaluateBusinessConfidence({ recordCount = 0, warnings = [], missingTimestamps = 0 } = {}) {
  if (!recordCount || warnings.length) return "low";
  if (missingTimestamps > Math.floor(recordCount / 2)) return "medium";
  return "high";
}
