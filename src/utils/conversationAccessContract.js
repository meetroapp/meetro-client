export const CONVERSATION_ACCESS_STATUSES = Object.freeze([
  "active",
  "closed",
  "archived",
  "blocked",
  "revoked",
  "pendingInvite",
]);

export const CONVERSATION_AUDIENCE_SCOPES = Object.freeze([
  "oneToOne",
  "projectParticipants",
  "professionalTeam",
  "professionalAndCustomer",
  "professionalAndTenant",
  "professionalAndPropertyManager",
  "vendorCoordination",
  "emergencyParticipants",
  "internalOnly",
]);

export const CONVERSATION_ALLOWED_ACTIONS = Object.freeze([
  "readMessages",
  "sendMessage",
  "readSharedWorkflowEvents",
  "readSharedDocuments",
  "recordExternalContact",
  "addInternalNote",
  "requestNewProject",
  "viewCompletedProjectSummary",
  "none",
]);

export const CONVERSATION_VISIBILITY_VALUES = Object.freeze([
  "participants",
  "projectParticipants",
  "roleScoped",
  "professionalOnly",
  "customerVisible",
  "tenantVisible",
  "propertyManagerVisible",
  "vendorVisible",
  "none",
]);

export const CONVERSATION_VISIBILITY_FIELDS = Object.freeze([
  "messageVisibility",
  "workflowEventVisibility",
  "documentVisibility",
  "historyVisibility",
  "internalNoteVisibility",
]);

export const CONVERSATION_ACCESS_REQUIRED_FIELDS = Object.freeze([
  "conversationId",
  "relationshipId",
  "accessStatus",
  "audienceScope",
  "participantRefs",
  "allowedActions",
  "visibilityRules",
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

export function createConversationParticipantRef(input = {}) {
  const source = isRecord(input) ? input : {};
  return {
    identityRef: isRecord(source.identityRef)
      ? cloneValue(source.identityRef)
      : {},
    participantRole: stringValue(source.participantRole),
    membershipStatus: stringValue(source.membershipStatus),
    joinedAt: stringValue(source.joinedAt),
    revokedAt: stringValue(source.revokedAt),
  };
}

// Read-only access shaping only. It does not create a Conversation,
// participant, project link, action, audience, or access decision.
export function createConversationAccess(input = {}) {
  const source = isRecord(input) ? input : {};
  return {
    conversationId: stringValue(source.conversationId),
    relationshipId: stringValue(source.relationshipId),
    projectId: stringValue(source.projectId),
    accessStatus: stringValue(source.accessStatus),
    audienceScope: stringValue(source.audienceScope),
    participantRefs: Array.isArray(source.participantRefs)
      ? source.participantRefs.map(createConversationParticipantRef)
      : [],
    allowedActions: arrayValue(source.allowedActions),
    visibilityRules: isRecord(source.visibilityRules)
      ? cloneValue(source.visibilityRules)
      : {},
    provenance: isRecord(source.provenance)
      ? cloneValue(source.provenance)
      : {},
    warnings: arrayValue(source.warnings),
  };
}

