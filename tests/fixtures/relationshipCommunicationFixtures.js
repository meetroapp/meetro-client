const AUTHORITATIVE_CONTACT_PROVENANCE = Object.freeze({
  identity: { trust: "AUTHORITATIVE", authority: "identity-authority" },
  relationship: {
    trust: "AUTHORITATIVE",
    authority: "relationship-authority",
  },
  projects: { trust: "AUTHORITATIVE", authority: "project-membership" },
  conversations: {
    trust: "AUTHORITATIVE",
    authority: "conversation-authority",
  },
  capabilities: {
    trust: "AUTHORITATIVE",
    authority: "communication-policy",
  },
  lastInteraction: {
    trust: "AUTHORITATIVE",
    authority: "relationship-history",
  },
});

const AUTHORITATIVE_ACCESS_PROVENANCE = Object.freeze({
  conversation: {
    trust: "AUTHORITATIVE",
    authority: "conversation-authority",
  },
  relationship: {
    trust: "AUTHORITATIVE",
    authority: "relationship-authority",
  },
  participants: {
    trust: "AUTHORITATIVE",
    authority: "conversation-membership",
  },
  audience: {
    trust: "AUTHORITATIVE",
    authority: "conversation-authority",
  },
  actions: {
    trust: "AUTHORITATIVE",
    authority: "conversation-authorization",
  },
  visibility: {
    trust: "AUTHORITATIVE",
    authority: "visibility-policy",
  },
});

function clone(value) {
  return structuredClone(value);
}

export function authoritativeContactProvenance() {
  return clone(AUTHORITATIVE_CONTACT_PROVENANCE);
}

export function authoritativeAccessProvenance() {
  return clone(AUTHORITATIVE_ACCESS_PROVENANCE);
}

export function projectRef(overrides = {}) {
  return {
    projectId: "project-1",
    participantRole: "customer",
    membershipStatus: "active",
    visibilityScope: "customerVisible",
    projectStatus: "active",
    ...overrides,
  };
}

export function conversationRef(overrides = {}) {
  return {
    conversationId: "conversation-1",
    accessStatus: "active",
    audienceScope: "professionalAndCustomer",
    projectId: "project-1",
    ...overrides,
  };
}

export function participantRef(overrides = {}) {
  return {
    identityRef: {
      identityType: "registeredUser",
      id: "user-customer-1",
      authority: "authentication",
      linkedIdentityRefs: [],
    },
    participantRole: "customer",
    membershipStatus: "active",
    joinedAt: "2026-06-14T12:00:00.000Z",
    revokedAt: "",
    ...overrides,
  };
}

export function visibilityRules(overrides = {}) {
  return {
    messageVisibility: "customerVisible",
    workflowEventVisibility: "projectParticipants",
    documentVisibility: "projectParticipants",
    historyVisibility: "projectParticipants",
    internalNoteVisibility: "professionalOnly",
    ...overrides,
  };
}

export function registeredCustomerFixture(overrides = {}) {
  return {
    relationshipContactId: "relationship-contact-registered-1",
    identityRef: {
      identityType: "registeredUser",
      id: "user-customer-1",
      authority: "authentication",
      linkedIdentityRefs: [],
    },
    contactType: "registeredCustomer",
    displayName: "Registered Customer",
    relationshipReasons: ["project"],
    relationshipStatus: "active",
    sharedProjectRefs: [projectRef()],
    conversationRefs: [conversationRef()],
    communicationCapabilities: ["authenticatedChat"],
    lastInteractionAt: "2026-06-14T14:00:00.000Z",
    provenance: authoritativeContactProvenance(),
    warnings: [],
    ...overrides,
  };
}

export function manualCustomerFixture(overrides = {}) {
  return {
    relationshipContactId: "relationship-contact-manual-1",
    identityRef: {
      identityType: "manualCustomer",
      id: "manual-customer-1",
      authority: "customer-onboarding",
      linkedIdentityRefs: [],
    },
    contactType: "manualCustomer",
    displayName: "Manual Customer",
    relationshipReasons: ["manualCustomer", "project"],
    relationshipStatus: "active",
    sharedProjectRefs: [projectRef()],
    conversationRefs: [],
    communicationCapabilities: ["externalEmail"],
    lastInteractionAt: "2026-06-14T13:00:00.000Z",
    provenance: authoritativeContactProvenance(),
    warnings: [],
    ...overrides,
  };
}

export function businessProfessionalFixture(overrides = {}) {
  return registeredCustomerFixture({
    relationshipContactId: "relationship-contact-business-1",
    identityRef: {
      identityType: "business",
      id: "business-1",
      authority: "business-identity",
      linkedIdentityRefs: [
        {
          identityType: "registeredUser",
          id: "user-business-1",
          authority: "authentication",
          linkStatus: "linked",
        },
      ],
    },
    contactType: "businessProfessional",
    displayName: "Business Professional",
    relationshipReasons: ["businessRelationship"],
    sharedProjectRefs: [],
    conversationRefs: [
      conversationRef({
        projectId: "",
        audienceScope: "oneToOne",
      }),
    ],
    ...overrides,
  });
}

export function tenantFixture(overrides = {}) {
  return registeredCustomerFixture({
    relationshipContactId: "relationship-contact-tenant-1",
    contactType: "tenant",
    displayName: "Tenant Participant",
    relationshipReasons: ["tenant", "project"],
    sharedProjectRefs: [
      projectRef({
        participantRole: "tenant",
        visibilityScope: "tenantVisible",
      }),
    ],
    conversationRefs: [
      conversationRef({ audienceScope: "professionalAndTenant" }),
    ],
    ...overrides,
  });
}

export function propertyManagerFixture(overrides = {}) {
  return registeredCustomerFixture({
    relationshipContactId: "relationship-contact-manager-1",
    contactType: "propertyManager",
    displayName: "Property Manager",
    relationshipReasons: ["propertyManager", "project"],
    sharedProjectRefs: [
      projectRef({
        participantRole: "propertyManager",
        visibilityScope: "propertyManagerVisible",
      }),
    ],
    conversationRefs: [
      conversationRef({
        audienceScope: "professionalAndPropertyManager",
      }),
    ],
    ...overrides,
  });
}

export function projectParticipantFixture(overrides = {}) {
  return registeredCustomerFixture({
    relationshipContactId: "relationship-contact-participant-1",
    contactType: "projectParticipant",
    displayName: "Project Participant",
    relationshipReasons: ["project"],
    communicationCapabilities: ["projectOnly"],
    conversationRefs: [],
    ...overrides,
  });
}

export function repeatCustomerFixture(overrides = {}) {
  return registeredCustomerFixture({
    relationshipContactId: "relationship-contact-repeat-1",
    contactType: "repeatCustomer",
    displayName: "Repeat Customer",
    relationshipReasons: ["repeatCustomer", "project"],
    relationshipStatus: "completedProject",
    sharedProjectRefs: [
      projectRef({
        projectId: "project-completed-1",
        membershipStatus: "completed",
        projectStatus: "completed",
      }),
      projectRef({ projectId: "project-active-2" }),
    ],
    conversationRefs: [
      conversationRef({
        conversationId: "conversation-completed-1",
        projectId: "project-completed-1",
        accessStatus: "closed",
      }),
    ],
    communicationCapabilities: ["projectOnly"],
    ...overrides,
  });
}

export function externalContactFixture(overrides = {}) {
  return manualCustomerFixture({
    relationshipContactId: "relationship-contact-external-1",
    identityRef: {
      identityType: "externalOrganization",
      id: "external-organization-1",
      authority: "customer-onboarding",
      linkedIdentityRefs: [],
    },
    contactType: "externalContact",
    displayName: "External Contact",
    relationshipReasons: ["businessRelationship"],
    sharedProjectRefs: [],
    communicationCapabilities: ["externalPhone"],
    ...overrides,
  });
}

export function teamMemberFixture(overrides = {}) {
  return registeredCustomerFixture({
    relationshipContactId: "relationship-contact-team-1",
    contactType: "teamMember",
    displayName: "Team Member",
    relationshipReasons: ["teamMember"],
    sharedProjectRefs: [],
    conversationRefs: [
      conversationRef({
        projectId: "",
        audienceScope: "professionalTeam",
      }),
    ],
    communicationCapabilities: ["internalNote"],
    ...overrides,
  });
}

export function vendorFixture(overrides = {}) {
  return registeredCustomerFixture({
    relationshipContactId: "relationship-contact-vendor-1",
    identityRef: {
      identityType: "business",
      id: "vendor-business-1",
      authority: "vendor-identity",
      linkedIdentityRefs: [],
    },
    contactType: "vendor",
    displayName: "Project Vendor",
    relationshipReasons: ["vendor", "project"],
    sharedProjectRefs: [
      projectRef({
        participantRole: "vendor",
        visibilityScope: "vendorVisible",
      }),
    ],
    conversationRefs: [
      conversationRef({ audienceScope: "vendorCoordination" }),
    ],
    communicationCapabilities: ["projectOnly"],
    ...overrides,
  });
}

export function legacyInboxFixture(overrides = {}) {
  return {
    relationshipContactId: "legacy-projection-only-1",
    identityRef: {
      identityType: "unknownLegacyIdentity",
      id: "",
      authority: "legacy-inbox",
      linkedIdentityRefs: [],
    },
    contactType: "externalContact",
    displayName: "Unresolved legacy contact",
    relationshipReasons: ["lead"],
    relationshipStatus: "known",
    sharedProjectRefs: [],
    conversationRefs: [],
    communicationCapabilities: ["none"],
    lastInteractionAt: "",
    provenance: {
      identity: { trust: "MISSING", authority: "legacy-inbox" },
      relationship: { trust: "INFERRED", authority: "legacy-inbox" },
      projects: { trust: "MISSING", authority: "legacy-inbox" },
      conversations: { trust: "FALLBACK", authority: "legacy-inbox" },
      capabilities: { trust: "AUTHORITATIVE", authority: "deny-by-default" },
      lastInteraction: { trust: "MISSING", authority: "legacy-inbox" },
    },
    warnings: [
      {
        code: "legacy-inbox-row-not-contact",
        field: "identityRef",
        message: "Legacy inbox row remains unresolved.",
      },
    ],
    ...overrides,
  };
}

export function registeredConversationAccess(overrides = {}) {
  return {
    conversationId: "conversation-1",
    relationshipId: "relationship-1",
    projectId: "project-1",
    accessStatus: "active",
    audienceScope: "professionalAndCustomer",
    participantRefs: [
      participantRef(),
      participantRef({
        identityRef: {
          identityType: "business",
          id: "business-1",
          authority: "business-identity",
          linkedIdentityRefs: [],
        },
        participantRole: "business",
      }),
    ],
    allowedActions: [
      "readMessages",
      "sendMessage",
      "readSharedWorkflowEvents",
      "readSharedDocuments",
    ],
    visibilityRules: visibilityRules(),
    provenance: authoritativeAccessProvenance(),
    warnings: [],
    ...overrides,
  };
}

export function tenantConversationAccess(overrides = {}) {
  return registeredConversationAccess({
    conversationId: "conversation-tenant-1",
    relationshipId: "relationship-tenant-1",
    audienceScope: "professionalAndTenant",
    participantRefs: [
      participantRef({ participantRole: "tenant" }),
      participantRef({
        identityRef: {
          identityType: "business",
          id: "business-1",
          authority: "business-identity",
          linkedIdentityRefs: [],
        },
        participantRole: "business",
      }),
    ],
    visibilityRules: visibilityRules({
      messageVisibility: "tenantVisible",
      workflowEventVisibility: "tenantVisible",
      documentVisibility: "tenantVisible",
      historyVisibility: "tenantVisible",
    }),
    ...overrides,
  });
}

export function propertyManagerConversationAccess(overrides = {}) {
  return registeredConversationAccess({
    conversationId: "conversation-manager-1",
    relationshipId: "relationship-manager-1",
    audienceScope: "professionalAndPropertyManager",
    participantRefs: [
      participantRef({ participantRole: "propertyManager" }),
      participantRef({
        identityRef: {
          identityType: "business",
          id: "business-1",
          authority: "business-identity",
          linkedIdentityRefs: [],
        },
        participantRole: "business",
      }),
    ],
    visibilityRules: visibilityRules({
      messageVisibility: "propertyManagerVisible",
      workflowEventVisibility: "propertyManagerVisible",
      documentVisibility: "propertyManagerVisible",
      historyVisibility: "propertyManagerVisible",
    }),
    ...overrides,
  });
}

