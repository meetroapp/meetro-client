export const RELATIONSHIP_CONTACT_IDENTITY_TYPES = Object.freeze([
  "registeredUser",
  "manualCustomer",
  "business",
  "externalOrganization",
  "unknownLegacyIdentity",
]);

export const RELATIONSHIP_CONTACT_TYPES = Object.freeze([
  "registeredCustomer",
  "manualCustomer",
  "businessProfessional",
  "tenant",
  "propertyManager",
  "projectParticipant",
  "repeatCustomer",
  "externalContact",
  "teamMember",
  "vendor",
]);

export const RELATIONSHIP_REASONS = Object.freeze([
  "lead",
  "project",
  "repeatCustomer",
  "manualCustomer",
  "tenant",
  "propertyManager",
  "businessRelationship",
  "teamMember",
  "vendor",
  "emergency",
]);

export const RELATIONSHIP_STATUSES = Object.freeze([
  "known",
  "invited",
  "active",
  "inactive",
  "completedProject",
  "blocked",
  "revoked",
  "archived",
]);

export const RELATIONSHIP_COMMUNICATION_CAPABILITIES = Object.freeze([
  "authenticatedChat",
  "externalPhone",
  "externalSms",
  "externalEmail",
  "internalNote",
  "projectOnly",
  "none",
]);

export const RELATIONSHIP_PROVENANCE_TRUST = Object.freeze([
  "AUTHORITATIVE",
  "INFERRED",
  "FALLBACK",
  "CONFLICTING",
  "MISSING",
]);

export const RELATIONSHIP_CONTACT_REQUIRED_FIELDS = Object.freeze([
  "relationshipContactId",
  "identityRef",
  "contactType",
  "displayName",
  "relationshipReasons",
  "relationshipStatus",
  "sharedProjectRefs",
  "conversationRefs",
  "communicationCapabilities",
  "provenance",
  "warnings",
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      cloneValue(nestedValue),
    ])
  );
}

function stringValue(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function arrayValue(value) {
  return Array.isArray(value) ? cloneValue(value) : [];
}

export function createRelationshipIdentityRef(input = {}) {
  const source = isRecord(input) ? input : {};
  return {
    identityType: stringValue(source.identityType),
    id: stringValue(source.id),
    authority: stringValue(source.authority),
    linkedIdentityRefs: arrayValue(source.linkedIdentityRefs),
  };
}

// Read-only projection shaping only. No identity, relationship, capability,
// timestamp, project, or Conversation value is generated or inferred.
export function createRelationshipContact(input = {}) {
  const source = isRecord(input) ? input : {};
  return {
    relationshipContactId: stringValue(source.relationshipContactId),
    identityRef: createRelationshipIdentityRef(source.identityRef),
    contactType: stringValue(source.contactType),
    displayName: stringValue(source.displayName),
    relationshipReasons: arrayValue(source.relationshipReasons),
    relationshipStatus: stringValue(source.relationshipStatus),
    sharedProjectRefs: arrayValue(source.sharedProjectRefs),
    conversationRefs: arrayValue(source.conversationRefs),
    communicationCapabilities: arrayValue(
      source.communicationCapabilities
    ),
    lastInteractionAt: stringValue(source.lastInteractionAt),
    provenance: isRecord(source.provenance)
      ? cloneValue(source.provenance)
      : {},
    warnings: arrayValue(source.warnings),
  };
}

