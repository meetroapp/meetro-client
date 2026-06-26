import {
  RELATIONSHIP_COMMUNICATION_CAPABILITIES,
  RELATIONSHIP_CONTACT_IDENTITY_TYPES,
  RELATIONSHIP_CONTACT_REQUIRED_FIELDS,
  RELATIONSHIP_CONTACT_TYPES,
  RELATIONSHIP_PROVENANCE_TRUST,
  RELATIONSHIP_REASONS,
  RELATIONSHIP_STATUSES,
  createRelationshipContact,
} from "./relationshipContactContract.js";
import {
  CONVERSATION_ACCESS_STATUSES,
  CONVERSATION_AUDIENCE_SCOPES,
} from "./conversationAccessContract.js";

export const RELATIONSHIP_CONTACT_RISK = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
});

const IDENTITY_TYPES = new Set(RELATIONSHIP_CONTACT_IDENTITY_TYPES);
const CONTACT_TYPES = new Set(RELATIONSHIP_CONTACT_TYPES);
const REASONS = new Set(RELATIONSHIP_REASONS);
const STATUSES = new Set(RELATIONSHIP_STATUSES);
const CAPABILITIES = new Set(RELATIONSHIP_COMMUNICATION_CAPABILITIES);
const TRUST_VALUES = new Set(RELATIONSHIP_PROVENANCE_TRUST);
const ACCESS_STATUSES = new Set(CONVERSATION_ACCESS_STATUSES);
const AUDIENCE_SCOPES = new Set(CONVERSATION_AUDIENCE_SCOPES);
const ACTIONABLE_CAPABILITIES = new Set([
  "authenticatedChat",
  "externalPhone",
  "externalSms",
  "externalEmail",
  "internalNote",
]);
const EXTERNAL_CAPABILITIES = new Set([
  "externalPhone",
  "externalSms",
  "externalEmail",
]);
const REQUIRED_PROVENANCE_GROUPS = Object.freeze([
  "identity",
  "relationship",
  "projects",
  "conversations",
  "capabilities",
  "lastInteraction",
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

function isUtcTimestamp(value) {
  if (typeof value !== "string" || !value.endsWith("Z")) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function validateStringArray({
  values,
  allowed,
  field,
  blockers,
  requireValue = false,
}) {
  if (!Array.isArray(values)) {
    blockers.push(
      createFinding(`invalid-${field}`, field, `${field} must be an array.`)
    );
    return;
  }
  if (requireValue && values.length === 0) {
    blockers.push(
      createFinding(`missing-${field}`, field, `${field} must not be empty.`)
    );
  }
  values.forEach((value, index) => {
    if (!allowed.has(value)) {
      blockers.push(
        createFinding(
          `unsupported-${field}`,
          `${field}[${index}]`,
          `${field} contains an unsupported value.`
        )
      );
    }
  });
}

function validateIdentityRef(contact, blockers) {
  const identity = contact.identityRef;
  if (!isRecord(identity)) {
    blockers.push(
      createFinding(
        "missing-identity-ref",
        "identityRef",
        "identityRef is required."
      )
    );
    return;
  }

  if (!IDENTITY_TYPES.has(identity.identityType)) {
    blockers.push(
      createFinding(
        "unsupported-identity-type",
        "identityRef.identityType",
        "identityRef.identityType is unsupported."
      )
    );
  }

  if (
    identity.identityType !== "unknownLegacyIdentity" &&
    !hasValue(identity.id)
  ) {
    blockers.push(
      createFinding(
        "missing-authoritative-identity",
        "identityRef.id",
        "An authoritative identity reference is required."
      )
    );
  }

  if (
    hasValue(contact.relationshipContactId) &&
    hasValue(identity.id) &&
    contact.relationshipContactId === identity.id
  ) {
    blockers.push(
      createFinding(
        "projection-identity-conflict",
        "relationshipContactId",
        "Projection identity must remain distinct from contact identity."
      )
    );
  }
}

function validateProjectRefs(contact, blockers) {
  contact.sharedProjectRefs.forEach((project, index) => {
    const path = `sharedProjectRefs[${index}]`;
    if (!isRecord(project) || !hasValue(project.projectId)) {
      blockers.push(
        createFinding(
          "invalid-project-ref",
          path,
          "Project references require projectId."
        )
      );
    }
    if (
      isRecord(project) &&
      hasValue(project.projectId) &&
      project.projectId === contact.identityRef.id
    ) {
      blockers.push(
        createFinding(
          "project-identity-conflict",
          `${path}.projectId`,
          "Project identity must remain distinct from contact identity."
        )
      );
    }
  });
}

function validateConversationRefs(contact, blockers) {
  contact.conversationRefs.forEach((conversation, index) => {
    const path = `conversationRefs[${index}]`;
    if (!isRecord(conversation) || !hasValue(conversation.conversationId)) {
      blockers.push(
        createFinding(
          "invalid-conversation-ref",
          path,
          "Conversation references require conversationId."
        )
      );
      return;
    }
    if (!ACCESS_STATUSES.has(conversation.accessStatus)) {
      blockers.push(
        createFinding(
          "unsupported-conversation-access-status",
          `${path}.accessStatus`,
          "Conversation access status is unsupported."
        )
      );
    }
    if (!AUDIENCE_SCOPES.has(conversation.audienceScope)) {
      blockers.push(
        createFinding(
          "unsupported-conversation-audience",
          `${path}.audienceScope`,
          "Conversation audience scope is unsupported."
        )
      );
    }
  });
}

function validateProvenance(contact, blockers, warnings) {
  const provenance = contact.provenance;
  REQUIRED_PROVENANCE_GROUPS.forEach((group) => {
    const trust = getTrust(provenance, group);
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

function validateCapabilities(contact, blockers) {
  const capabilities = contact.communicationCapabilities;
  validateStringArray({
    values: capabilities,
    allowed: CAPABILITIES,
    field: "communicationCapabilities",
    blockers,
    requireValue: true,
  });

  if (capabilities.includes("none") && capabilities.length > 1) {
    blockers.push(
      createFinding(
        "none-capability-conflict",
        "communicationCapabilities",
        "none cannot be combined with another capability."
      )
    );
  }

  if (
    ["blocked", "revoked"].includes(contact.relationshipStatus) &&
    (capabilities.length !== 1 || capabilities[0] !== "none")
  ) {
    blockers.push(
      createFinding(
        "blocked-or-revoked-capability",
        "communicationCapabilities",
        "Blocked or revoked relationships must use none."
      )
    );
  }

  const hasActionable = capabilities.some((value) =>
    ACTIONABLE_CAPABILITIES.has(value)
  );
  if (
    hasActionable &&
    (!hasAuthoritative(contact.provenance, "identity") ||
      !hasAuthoritative(contact.provenance, "relationship") ||
      !hasAuthoritative(contact.provenance, "capabilities"))
  ) {
    blockers.push(
      createFinding(
        "actionable-capability-untrusted",
        "communicationCapabilities",
        "Actionable capabilities require authoritative identity, relationship, and capability provenance."
      )
    );
  }

  if (
    contact.identityRef.identityType === "unknownLegacyIdentity" &&
    (capabilities.length !== 1 || capabilities[0] !== "none")
  ) {
    blockers.push(
      createFinding(
        "legacy-capability-prohibited",
        "communicationCapabilities",
        "Unknown legacy identities must use none."
      )
    );
  }

  if (
    contact.contactType === "manualCustomer" &&
    capabilities.includes("authenticatedChat")
  ) {
    const linkedUser = contact.identityRef.linkedIdentityRefs.some(
      (link) =>
        isRecord(link) &&
        link.identityType === "registeredUser" &&
        hasValue(link.id) &&
        link.linkStatus === "linked"
    );
    const activeConversation = contact.conversationRefs.some(
      (conversation) =>
        isRecord(conversation) &&
        conversation.accessStatus === "active" &&
        hasValue(conversation.conversationId)
    );
    if (!linkedUser || !activeConversation) {
      blockers.push(
        createFinding(
          "manual-customer-chat-unavailable",
          "communicationCapabilities",
          "Manual Customer chat requires a linked registered identity and active Conversation membership."
        )
      );
    }
  }

  if (
    capabilities.some((value) => EXTERNAL_CAPABILITIES.has(value)) &&
    !hasAuthoritative(contact.provenance, "capabilities")
  ) {
    blockers.push(
      createFinding(
        "missing-external-consent",
        "provenance.capabilities",
        "External communication requires authoritative consent and capability evidence."
      )
    );
  }
}

function validateContactTypeRules(contact, blockers) {
  const reasons = new Set(contact.relationshipReasons);
  const rule = {
    manualCustomer: "manualCustomer",
    tenant: "tenant",
    propertyManager: "propertyManager",
    projectParticipant: "project",
    repeatCustomer: "repeatCustomer",
    teamMember: "teamMember",
    vendor: "vendor",
  }[contact.contactType];

  if (rule && !reasons.has(rule)) {
    blockers.push(
      createFinding(
        "contact-type-reason-mismatch",
        "relationshipReasons",
        `${contact.contactType} requires the ${rule} relationship reason.`
      )
    );
  }

  if (
    ["tenant", "propertyManager", "projectParticipant"].includes(
      contact.contactType
    ) &&
    contact.sharedProjectRefs.length === 0
  ) {
    blockers.push(
      createFinding(
        "missing-project-membership",
        "sharedProjectRefs",
        "This contact type requires project membership evidence."
      )
    );
  }

  if (
    contact.contactType === "repeatCustomer" &&
    contact.sharedProjectRefs.length < 2
  ) {
    blockers.push(
      createFinding(
        "repeat-customer-project-history-missing",
        "sharedProjectRefs",
        "Repeat Customer projection requires multiple distinct project references."
      )
    );
  }
}

export function validateRelationshipContact(input = {}) {
  const contact = createRelationshipContact(input);
  const missingFields = [];
  const blockers = [];
  const warnings = [...contact.warnings];

  RELATIONSHIP_CONTACT_REQUIRED_FIELDS.forEach((field) => {
    const value = contact[field];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value === "") ||
      (field === "identityRef" && !isRecord(value)) ||
      (["provenance"].includes(field) && !isRecord(value)) ||
      (["relationshipReasons", "communicationCapabilities"].includes(field) &&
        (!Array.isArray(value) || value.length === 0));
    if (!missing) return;
    missingFields.push(field);
    blockers.push(
      createFinding(`missing-${field}`, field, `${field} is required.`)
    );
  });

  validateIdentityRef(contact, blockers);

  if (!CONTACT_TYPES.has(contact.contactType)) {
    blockers.push(
      createFinding(
        "unsupported-contact-type",
        "contactType",
        "contactType is unsupported."
      )
    );
  }
  if (!STATUSES.has(contact.relationshipStatus)) {
    blockers.push(
      createFinding(
        "unsupported-relationship-status",
        "relationshipStatus",
        "relationshipStatus is unsupported."
      )
    );
  }

  validateStringArray({
    values: contact.relationshipReasons,
    allowed: REASONS,
    field: "relationshipReasons",
    blockers,
    requireValue: true,
  });
  validateProjectRefs(contact, blockers);
  validateConversationRefs(contact, blockers);
  validateCapabilities(contact, blockers);
  validateContactTypeRules(contact, blockers);
  validateProvenance(contact, blockers, warnings);

  if (
    hasValue(contact.lastInteractionAt) &&
    !isUtcTimestamp(contact.lastInteractionAt)
  ) {
    blockers.push(
      createFinding(
        "invalid-last-interaction-at",
        "lastInteractionAt",
        "lastInteractionAt must be a normalized UTC timestamp."
      )
    );
  }

  if (
    contact.sharedProjectRefs.length === 0 &&
    contact.identityRef.identityType !== "unknownLegacyIdentity" &&
    !hasAuthoritative(contact.provenance, "relationship")
  ) {
    blockers.push(
      createFinding(
        "project-independent-relationship-untrusted",
        "provenance.relationship",
        "A project-independent contact requires authoritative relationship evidence."
      )
    );
  }

  return {
    valid: blockers.length === 0,
    riskLevel:
      blockers.length > 0
        ? RELATIONSHIP_CONTACT_RISK.HIGH
        : warnings.length > 0
          ? RELATIONSHIP_CONTACT_RISK.MEDIUM
          : RELATIONSHIP_CONTACT_RISK.LOW,
    missingFields,
    warnings,
    blockers,
    projection: contact,
  };
}
