export const BUSINESS_ENGINE_ID = "business";
export const BUSINESS_ENGINE_PRIORITY = 80;
export const BUSINESS_HEALTH = Object.freeze(["healthy", "busy", "overloaded", "underutilized", "blocked", "unknown"]);
export const BUSINESS_CAPACITY = Object.freeze(["available", "medium", "busy", "full", "unknown"]);
export const BUSINESS_CONFIDENCE = Object.freeze(["high", "medium", "low"]);
export const BUSINESS_CONTEXT_LIMITS = Object.freeze({ bottlenecks: 8, priorities: 8, evidence: 16 });

export function emptyBusinessContext() { return {}; }
