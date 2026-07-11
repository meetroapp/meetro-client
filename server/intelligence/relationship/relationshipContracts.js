export const RELATIONSHIP_TYPES = Object.freeze([
  "professional_customer",
  "homeowner_professional",
  "business_customer",
  "emergency_service",
  "standard_service",
  "hiring",
  "community_connection",
  "referral",
  "conversation_only",
]);

export const CONTINUITY_CLASSIFICATIONS = Object.freeze([
  "first_time_customer",
  "new_relationship",
  "returning_customer",
  "active_customer",
  "past_customer",
  "inactive_relationship",
  "conversation_only",
  "unknown",
]);

export function emptyRelationshipContext() {
  return {};
}
