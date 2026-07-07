import { RELATIONSHIP_RULES } from "./relationshipRules.js";

function normalize(value = "") {
  return String(value || "").toLowerCase();
}

function includesAny(text = "", terms = []) {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(term));
}

function getRelationshipText({ user = {}, intent = "", context = {}, workflow = {}, memory = [] } = {}) {
  const relationship = context.relationship || {};
  return [
    intent,
    user.accountType,
    user.role,
    context.user?.accountType,
    context.user?.role,
    context.source?.page,
    context.source?.surface,
    relationship.knownRelationshipType,
    relationship.recentRelevantStatus,
    context.workflow?.serviceType,
    context.workflow?.status,
    workflow.currentStage,
    workflow.guidanceCategory,
    ...(Array.isArray(memory) ? memory.map((item) => `${item.userMessage || ""} ${item.assistantAnswer || ""}`) : []),
  ]
    .filter(Boolean)
    .join(" ");
}

function pickRelationshipType(searchText = "", user = {}, context = {}) {
  const accountType = normalize(context.user?.accountType || user.accountType);
  const relationshipType = normalize(context.relationship?.knownRelationshipType);
  const sourcePage = normalize(context.source?.page);

  if (includesAny(searchText, ["property manager", "property management", "tenant", "vendor", "owner approval"])) {
    return "property_manager_vendor";
  }

  if (includesAny(searchText, ["employee", "team member", "handoff", "assigned tech", "staff"])) {
    return "business_employee";
  }

  if (includesAny(searchText, ["neighbor", "nearby", "informal help"])) {
    return "neighbor_neighbor";
  }

  if (sourcePage.includes("community") || includesAny(searchText, ["community", "discover", "professional help"])) {
    return "community_professional";
  }

  if (accountType === "professional" || includesAny(relationshipType, ["customer", "client"])) {
    return "professional_customer";
  }

  return "homeowner_professional";
}

export function buildCompanionRelationship({
  user = {},
  intent = "reasoning",
  context = {},
  workflow = {},
  knowledge = {},
  memory = [],
} = {}) {
  const searchText = getRelationshipText({ user, intent, context, workflow, knowledge, memory });
  const relationshipType = pickRelationshipType(searchText, user, context);
  const rule = RELATIONSHIP_RULES[relationshipType] || RELATIONSHIP_RULES.homeowner_professional;
  const hasBackendRelationship = Boolean(context.relationship?.knownRelationshipType);
  const confidence = hasBackendRelationship ? 0.84 : relationshipType === "homeowner_professional" ? 0.66 : 0.74;

  return {
    relationshipType: rule.relationshipType,
    communicationPosture: rule.communicationPosture,
    trustBoundary: rule.trustBoundary,
    roleExpectation: rule.roleExpectation,
    relationshipSafeGuidance: rule.relationshipSafeGuidance,
    confidence,
    relationshipSummary: rule.summary,
  };
}

export { RELATIONSHIP_RULES };

