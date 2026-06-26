import {
  RELATIONSHIP_CONTACT_IDENTITY_TYPES,
  RELATIONSHIP_PROVENANCE_TRUST,
} from "./relationshipContactContract.js";
import {
  CONVERSATION_ACCESS_REQUIRED_FIELDS,
  CONVERSATION_ACCESS_STATUSES,
  CONVERSATION_ALLOWED_ACTIONS,
  CONVERSATION_AUDIENCE_SCOPES,
  CONVERSATION_VISIBILITY_FIELDS,
  CONVERSATION_VISIBILITY_VALUES,
  createConversationAccess,
} from "./conversationAccessContract.js";

export const CONVERSATION_ACCESS_RISK = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
});

const IDENTITY_TYPES = new Set(RELATIONSHIP_CONTACT_IDENTITY_TYPES);
const TRUST_VALUES = new Set(RELATIONSHIP_PROVENANCE_TRUST);
const ACCESS_STATUSES = new Set(CONVERSATION_ACCESS_STATUSES);
const AUDIENCE_SCOPES = new Set(CONVERSATION_AUDIENCE_SCOPES);
const ACTIONS = new Set(CONVERSATION_ALLOWED_ACTIONS);
const VISIBILITY_VALUES = new Set(CONVERSATION_VISIBILITY_VALUES);
const NON_COMMUNICATING_STATUSES = new Set([
  "blocked",
  "revoked",
  "pendingInvite",
]);
const PROJECT_ACTIONS = new Set([
  "readSharedWorkflowEvents",
  "readSharedDocuments",
  "viewCompletedProjectSummary",
]);
const REQUIRED_PROVENANCE_GROUPS = Object.freeze([
  "conversation",
  "relationship",
  "participants",
  "audience",
  "actions",
  "visibility",
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function createFinding(code, field, message) {
  return { code, field, message };
}

function getTrust(provenance, field) {
  const value = provenance[field];
  if (typeof value === "string") return value;
  return isRecord(value) ? String(value.trust || "") : "";
}

function hasAuthoritative(provenance, field) {
  return getTrust(provenance, field) === "AUTHORITATIVE";
}

function validateProvenance(access, blockers, warnings) {
  REQUIRED_PROVENANCE_GROUPS.forEach((group) => {
    const trust = getTrust(access.provenance, group);
    if (!TRUST_VALUES.has(trust)) {
      blockers.push(
        createFinding(
          "missing-provenance",
          `provenance.${group}`,
          `Provenance trust is required for ${group}.`
        )
      );
    } else if (trust !== "AUTHORITATIVE") {
      warnings.push(
        createFinding(
          "non-authoritative-provenance",
          `provenance.${group}`,
          `${group} provenance is not authoritative.`
        )
      );
    }
  });
}

function validateParticipantRefs(access, blockers) {
  if (access.participantRefs.length === 0) {
    blockers.push(
      createFinding(
        "missing-participant-refs",
        "participantRefs",
        "At least one participant reference is required."
      )
    );
    return;
  }

  access.participantRefs.forEach((participant, index) => {
    const path = `participantRefs[${index}]`;
    const identity = participant.identityRef;
    if (
      !isRecord(identity) ||
      !IDENTITY_TYPES.has(identity.identityType) ||
      !hasValue(identity.id) ||
      !hasValue(identity.authority)
    ) {
      blockers.push(
        createFinding(
          "invalid-participant-identity",
          `${path}.identityRef`,
          "Participants require authoritative typed identity."
        )
      );
    }
    if (!hasValue(participant.participantRole)) {
      blockers.push(
        createFinding(
          "missing-participant-role",
          `${path}.participantRole`,
          "Participant role is required."
        )
      );
    }
    if (!hasValue(participant.membershipStatus)) {
      blockers.push(
        createFinding(
          "missing-membership-status",
          `${path}.membershipStatus`,
          "Participant membership status is required."
        )
      );
    }
  });
}

function validateActions(access, blockers) {
  if (access.allowedActions.length === 0) {
    blockers.push(
      createFinding(
        "missing-allowed-actions",
        "allowedActions",
        "allowedActions must not be empty."
      )
    );
    return;
  }
  access.allowedActions.forEach((action, index) => {
    if (!ACTIONS.has(action)) {
      blockers.push(
        createFinding(
          "unsupported-action",
          `allowedActions[${index}]`,
          "allowedActions contains an unsupported value."
        )
      );
    }
  });

  if (access.allowedActions.includes("none") && access.allowedActions.length > 1) {
    blockers.push(
      createFinding(
        "none-action-conflict",
        "allowedActions",
        "none cannot be combined with another action."
      )
    );
  }

  if (
    NON_COMMUNICATING_STATUSES.has(access.accessStatus) &&
    (access.allowedActions.length !== 1 || access.allowedActions[0] !== "none")
  ) {
    blockers.push(
      createFinding(
        "access-status-action-conflict",
        "allowedActions",
        "Blocked, revoked, and pending access must use none."
      )
    );
  }

  if (
    access.accessStatus === "closed" &&
    access.allowedActions.includes("sendMessage")
  ) {
    blockers.push(
      createFinding(
        "closed-conversation-send-prohibited",
        "allowedActions",
        "Closed Conversations cannot allow sendMessage."
      )
    );
  }

  if (
    access.allowedActions.includes("sendMessage") &&
    (!hasAuthoritative(access.provenance, "conversation") ||
      !hasAuthoritative(access.provenance, "participants") ||
      !hasAuthoritative(access.provenance, "actions"))
  ) {
    blockers.push(
      createFinding(
        "send-message-untrusted",
        "allowedActions",
        "sendMessage requires authoritative Conversation, participant, and action provenance."
      )
    );
  }

  if (
    access.allowedActions.some((action) => PROJECT_ACTIONS.has(action)) &&
    !hasValue(access.projectId)
  ) {
    blockers.push(
      createFinding(
        "project-action-missing-project",
        "projectId",
        "Project-scoped actions require canonical projectId."
      )
    );
  }
}

function validateVisibility(access, blockers) {
  if (!isRecord(access.visibilityRules)) {
    blockers.push(
      createFinding(
        "invalid-visibility-rules",
        "visibilityRules",
        "visibilityRules must be a record."
      )
    );
    return;
  }

  CONVERSATION_VISIBILITY_FIELDS.forEach((field) => {
    const value = access.visibilityRules[field];
    if (!VISIBILITY_VALUES.has(value)) {
      blockers.push(
        createFinding(
          "unsupported-visibility-rule",
          `visibilityRules.${field}`,
          `${field} must use an approved visibility value.`
        )
      );
    }
  });

  if (
    access.audienceScope === "professionalAndTenant" &&
    access.visibilityRules.messageVisibility !== "tenantVisible"
  ) {
    blockers.push(
      createFinding(
        "tenant-audience-visibility-conflict",
        "visibilityRules.messageVisibility",
        "Tenant Conversations require tenant-visible message scope."
      )
    );
  }

  if (
    access.audienceScope === "professionalAndPropertyManager" &&
    access.visibilityRules.messageVisibility !== "propertyManagerVisible"
  ) {
    blockers.push(
      createFinding(
        "property-manager-audience-visibility-conflict",
        "visibilityRules.messageVisibility",
        "Property manager Conversations require manager-visible message scope."
      )
    );
  }

  if (
    access.audienceScope !== "internalOnly" &&
    access.allowedActions.includes("addInternalNote")
  ) {
    blockers.push(
      createFinding(
        "internal-note-audience-conflict",
        "allowedActions",
        "addInternalNote requires internalOnly audience."
      )
    );
  }
}

export function validateConversationAccess(input = {}) {
  const access = createConversationAccess(input);
  const missingFields = [];
  const blockers = [];
  const warnings = [...access.warnings];

  CONVERSATION_ACCESS_REQUIRED_FIELDS.forEach((field) => {
    const value = access[field];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value === "") ||
      (["visibilityRules", "provenance"].includes(field) &&
        !isRecord(value)) ||
      (["participantRefs", "allowedActions"].includes(field) &&
        (!Array.isArray(value) || value.length === 0));
    if (!missing) return;
    missingFields.push(field);
    blockers.push(
      createFinding(`missing-${field}`, field, `${field} is required.`)
    );
  });

  if (!ACCESS_STATUSES.has(access.accessStatus)) {
    blockers.push(
      createFinding(
        "unsupported-access-status",
        "accessStatus",
        "accessStatus is unsupported."
      )
    );
  }
  if (!AUDIENCE_SCOPES.has(access.audienceScope)) {
    blockers.push(
      createFinding(
        "unsupported-audience-scope",
        "audienceScope",
        "audienceScope is unsupported."
      )
    );
  }
  if (
    hasValue(access.projectId) &&
    (access.projectId === access.conversationId ||
      access.projectId === access.relationshipId)
  ) {
    blockers.push(
      createFinding(
        "access-identity-conflict",
        "projectId",
        "Project, Conversation, and relationship identity must remain distinct."
      )
    );
  }

  validateParticipantRefs(access, blockers);
  validateActions(access, blockers);
  validateVisibility(access, blockers);
  validateProvenance(access, blockers, warnings);

  if (
    !hasValue(access.projectId) &&
    !hasAuthoritative(access.provenance, "relationship")
  ) {
    blockers.push(
      createFinding(
        "project-independent-access-untrusted",
        "provenance.relationship",
        "Project-independent access requires authoritative relationship provenance."
      )
    );
  }

  return {
    valid: blockers.length === 0,
    riskLevel:
      blockers.length > 0
        ? CONVERSATION_ACCESS_RISK.HIGH
        : warnings.length > 0
          ? CONVERSATION_ACCESS_RISK.MEDIUM
          : CONVERSATION_ACCESS_RISK.LOW,
    missingFields,
    warnings,
    blockers,
    projection: access,
  };
}

