import { getRelationshipParties } from "./relationshipIdentity.js";

function text(value) { return value === undefined || value === null ? "" : String(value).trim(); }

function relationshipType(record = {}, user = {}, kind = "") {
  const combined = `${record.relationshipType || ""} ${record.type || ""} ${record.category || ""} ${record.source || ""} ${kind}`.toLowerCase();
  if (/hiring|applicant|position/.test(combined)) return "hiring";
  if (/community|neighbor|referral/.test(combined)) return /referral/.test(combined) ? "referral" : "community_connection";
  if (/emergency/.test(combined) || record.emergencyRequestId) return "emergency_service";
  if (/conversation/.test(kind) && !record.jobId && !record.projectId && !record.requestId) return "conversation_only";
  if (/business_customer/.test(combined)) return "business_customer";
  if (String(user.accountType || user.role || "").toLowerCase() === "professional") return "professional_customer";
  if (record.customerId || record.homeownerId) return "standard_service";
  return "homeowner_professional";
}

export function normalizeRelationshipResolution(resolution, user = {}) {
  if (!resolution?.primary?.record) return null;
  const primary = resolution.primary.record;
  const parties = getRelationshipParties(primary, user);
  const relationshipId = text(primary.relationshipId || primary.relationship_id || (parties.customerId && (parties.businessId || parties.professionalId) ? `relationship:${parties.businessId || parties.professionalId}:${parties.customerId}` : ""));
  if (!relationshipId && !resolution.query?.conversationId) return null;
  return {
    relationshipId: relationshipId || `conversation:${resolution.query.conversationId}`,
    relationshipType: relationshipType(primary, user, resolution.primary.kind),
    source: resolution.primary.source,
    parties,
    records: resolution.related,
    conflicts: resolution.conflicts,
    matchedBy: resolution.matchedBy,
  };
}
