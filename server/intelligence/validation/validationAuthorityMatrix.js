export const VALIDATION_AUTHORITY_MATRIX = Object.freeze({
  workflow_stage: "workflow", next_action: "workflow", relationship_continuity: "relationship",
  current_engagement: "relationship", durable_preferences: "persistentMemory", business_operations: "business",
  community_activity: "community", verified_knowledge: "knowledge", capability_selection: "capabilities", contract_context: "contracts",
});

export function getValidationAuthority(topic = "") { return VALIDATION_AUTHORITY_MATRIX[topic] || null; }

