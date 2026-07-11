export const MEMORY_ENGINE_ID = "persistent_memory";
export const MEMORY_CONTEXT_SECTION = "persistentMemory";
export const MEMORY_ENGINE_PRIORITY = 65;

export const MEMORY_CATEGORIES = Object.freeze([
  "preference",
  "business_preference",
  "workflow_reference",
  "relationship_reference",
  "unfinished_work",
  "confirmed_fact",
  "confirmed_recommendation",
  "document_preference",
  "scheduling_preference",
  "communication_preference",
  "service_preference",
  "product_preference",
  "system_preference",
]);

export const MEMORY_SCOPE_TYPES = Object.freeze([
  "user", "business", "relationship", "workflow", "conversation", "community", "system",
]);
export const MEMORY_CONSENT_STATES = Object.freeze([
  "explicit", "user_confirmed", "system_required", "withdrawn", "unknown",
]);
export const MEMORY_LIFECYCLE_STATES = Object.freeze([
  "proposed", "active", "superseded", "expired", "deleted", "rejected",
]);
export const MEMORY_SENSITIVITY = Object.freeze(["standard", "restricted", "prohibited"]);
export const MEMORY_PROPOSAL_STATES = Object.freeze([
  "pending_confirmation", "confirmed", "rejected", "expired", "cancelled",
]);

export const DEFAULT_MEMORY_CONTEXT_LIMIT = 8;

export function emptyPersistentMemoryContext(requestedScopes = []) {
  return {
    memories: [],
    retrieval: {
      requestedScopes: [...requestedScopes],
      matchedCount: 0,
      omittedCount: 0,
      truncated: false,
    },
    warnings: [],
  };
}
