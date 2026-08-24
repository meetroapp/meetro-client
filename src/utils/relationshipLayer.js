import { getConversationParticipantIdentity } from "./conversationIdentity.js";
import {
  getRecordProfileScopeKey,
  normalizeProfileScopeKey,
} from "./accountProfileScope.js";

export const RELATIONSHIP_TYPE_LABELS = Object.freeze({
  customer: "Customer",
  tenant: "Tenant",
  propertyManager: "Property",
  professional: "Pro",
  business: "Business",
  employee: "Employee",
  vendor: "Vendor",
});

export const RELATIONSHIP_VIEW_LABELS = Object.freeze({
  all: "All",
  customer: "Customers",
  tenant: "Tenants",
  propertyManager: "Properties",
  professional: "Vendors / Pros",
  business: "Businesses",
  employee: "Employees",
  vendor: "Vendors / Pros",
  activeWork: "Active Work",
  openTickets: "Open Tickets",
  unread: "Unread",
  drafts: "Drafts",
  archived: "Archived",
});

export const RELATIONSHIP_VIEW_ORDER = Object.freeze([
  "all",
  "customer",
  "tenant",
  "propertyManager",
  "professional",
  "employee",
  "activeWork",
  "openTickets",
  "unread",
  "archived",
]);

const RELATIONSHIP_TYPE_ORDER = Object.freeze([
  "customer",
  "tenant",
  "propertyManager",
  "professional",
  "business",
  "employee",
  "vendor",
]);

function firstValue(...values) {
  return (
    values
      .map((value) => String(value || "").trim())
      .find(Boolean) || ""
  );
}

function normalizeKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasExplicitPersonalScope(conversation = {}) {
  const scope = normalizeKey(
    [
      conversation.accountMode,
      conversation.account_mode,
      conversation.relationshipScope,
      conversation.relationship_scope,
      conversation.ownerMode,
      conversation.owner_mode,
      conversation.visibilityScope,
      conversation.visibility_scope,
      conversation.messageScope,
      conversation.message_scope,
      conversation.audienceScope,
      conversation.audience_scope,
    ].join(" ")
  );

  return /personal|homeowner|user|tenant_personal/.test(scope);
}

function hasExplicitBusinessScope(conversation = {}) {
  const scope = normalizeKey(
    [
      conversation.accountMode,
      conversation.account_mode,
      conversation.relationshipScope,
      conversation.relationship_scope,
      conversation.ownerMode,
      conversation.owner_mode,
      conversation.visibilityScope,
      conversation.visibility_scope,
      conversation.messageScope,
      conversation.message_scope,
      conversation.audienceScope,
      conversation.audience_scope,
      conversation.source,
    ].join(" ")
  );

  return /business|professional|contractor|work_center|workcenter|property_management/.test(scope);
}

function isVisibleForActiveMode(conversation = {}, type = "", activeMode = "") {
  const mode = normalizeKey(activeMode || "personal");

  if (mode === "business" || mode === "professional") {
    if (hasExplicitPersonalScope(conversation) && !hasExplicitBusinessScope(conversation)) {
      return false;
    }

    return true;
  }

  if (hasExplicitBusinessScope(conversation) && !hasExplicitPersonalScope(conversation)) {
    return false;
  }

  return ["professional", "business", "tenant"].includes(type) || hasExplicitPersonalScope(conversation);
}

function getConversationTimestamp(record = {}) {
  const value =
    record.createdAt ||
    record.created_at ||
    record.savedAt ||
    record.lastMessageAt ||
    record.updatedAt ||
    "";
  const time = value ? new Date(value).getTime() : 0;

  return Number.isFinite(time) ? time : 0;
}

function inferRelationshipType(conversation = {}, identity = {}, viewerRole = "") {
  const explicit = normalizeKey(
    conversation.relationshipType ||
      conversation.relationship_type ||
      conversation.contactType ||
      conversation.contact_type ||
      conversation.role ||
      conversation.participantRole ||
      conversation.participant_role
  );
  const combined = normalizeKey(
    [
      explicit,
      conversation.conversation_type,
      conversation.type,
      conversation.serviceDomain,
      conversation.service_domain,
      conversation.category,
      conversation.source,
      conversation.project_title,
      conversation.project_description,
    ].join(" ")
  );

  if (/tenant/.test(combined)) return "tenant";
  if (/property_manager|propertymanager|propertymanagement|property_management|landlord/.test(combined)) {
    return "propertyManager";
  }
  if (/professional|contractor|provider/.test(combined)) return "professional";
  if (/business|company|organization/.test(combined)) return "business";
  if (/employee|applicant|hiring/.test(combined)) return "employee";
  if (/vendor|supplier|subcontractor/.test(combined)) return "vendor";
  if (identity.type === "business") return "business";
  if (viewerRole === "homeowner" || viewerRole === "personal") return "professional";
  return "customer";
}

function getRelationshipId(conversation = {}, type = "", identity = {}) {
  return firstValue(
    conversation.relationshipId,
    conversation.relationship_id,
    conversation.customerId,
    conversation.customer_id,
    conversation.homeowner_id,
    conversation.businessId,
    conversation.business_id,
    conversation.professionalId,
    conversation.professional_id,
    conversation.providerId,
    conversation.provider_id,
    `${type}:${identity.displayName}`
  );
}

function getStatus(conversation = {}) {
  if (conversation.saved_to_history) return "Saved to history";
  if (conversation.archived) return "Archived";
  if (conversation.isDraft || conversation.draft) return "Draft";

  return firstValue(
    conversation.currentWorkStatus,
    conversation.current_work_status,
    conversation.status,
    conversation.workflow_status,
    conversation.project_status,
    conversation.lastMessage,
    conversation.project_description,
    "Active relationship"
  );
}

function getContact(conversation = {}) {
  return {
    phone: firstValue(
      conversation.phone,
      conversation.phoneNumber,
      conversation.phone_number,
      conversation.customerPhone,
      conversation.customer_phone,
      conversation.businessPhone,
      conversation.business_phone
    ),
    email: firstValue(
      conversation.email,
      conversation.homeowner_email,
      conversation.customerEmail,
      conversation.customer_email,
      conversation.businessEmail,
      conversation.business_email
    ),
    address: firstValue(
      conversation.address,
      conversation.fullAddress,
      conversation.full_address,
      conversation.location,
      conversation.customerLocation,
      conversation.customer_location
    ),
  };
}

function getProjectTitle(conversation = {}) {
  return firstValue(
    conversation.project_title,
    conversation.projectTitle,
    conversation.title,
    conversation.service,
    conversation.category,
    "Conversation"
  );
}

function getInvoiceRecord(conversation = {}) {
  const invoiceId = firstValue(
    conversation.invoiceId,
    conversation.invoice_id,
    conversation.receiptId,
    conversation.receipt_id
  );

  if (!invoiceId) return null;

  return {
    id: invoiceId,
    title: firstValue(conversation.invoiceTitle, conversation.invoice_title, "Invoice"),
    total: conversation.invoiceTotal || conversation.total || conversation.amount || "",
    status: firstValue(conversation.invoiceStatus, conversation.invoice_status, "Saved"),
  };
}

function getDocumentRecords(conversation = {}) {
  const documents = [
    ...toArray(conversation.documents),
    ...toArray(conversation.attachments),
  ];
  const photos = [
    ...toArray(conversation.photos),
    ...toArray(conversation.images),
  ];

  return {
    documents,
    photos,
  };
}

function getParticipantRecords(conversation = {}) {
  const explicitParticipants = toArray(conversation.participants).map((participant) => ({
    name: firstValue(participant.name, participant.displayName, participant.label),
    role: firstValue(participant.role, participant.type, "Participant"),
  }));
  const fallbackParticipants = [
    { name: firstValue(conversation.tenantName, conversation.tenant_name), role: "Tenant" },
    {
      name: firstValue(
        conversation.propertyManagerName,
        conversation.property_manager_name,
        conversation.propertyManager
      ),
      role: "Property manager",
    },
    {
      name: firstValue(
        conversation.assignedProfessionalName,
        conversation.assigned_professional_name,
        conversation.vendorName,
        conversation.vendor_name
      ),
      role: "Professional/vendor",
    },
  ].filter((participant) => participant.name);
  const seen = new Set();

  return [...explicitParticipants, ...fallbackParticipants].filter((participant) => {
    const key = normalizeKey(`${participant.role}:${participant.name}`);
    if (!participant.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasPropertyManagementContext(relationship = {}) {
  return ["tenant", "propertyManager"].includes(relationship.type);
}

function createMaintenanceTicketFoundation(relationship = {}) {
  if (!hasPropertyManagementContext(relationship)) return null;

  return {
    title: "Maintenance ticket",
    status: "Relationship-scoped",
    routeTo: "Property manager relationship",
    assignment: "Professional or vendor can be linked without recreating the ticket.",
    invoiceOwner: "Property manager",
  };
}

function isDraftConversation(conversation = {}) {
  const status = normalizeKey(
    [
      conversation.status,
      conversation.workflow_status,
      conversation.project_status,
      conversation.category,
    ].join(" ")
  );

  return Boolean(conversation.isDraft || conversation.draft || /draft/.test(status));
}

function isArchivedConversation(conversation = {}) {
  const status = normalizeKey(
    [
      conversation.status,
      conversation.workflow_status,
      conversation.project_status,
      conversation.category,
    ].join(" ")
  );

  return Boolean(
    conversation.archived ||
      conversation.isArchived ||
      conversation.saved_to_history ||
      /archived|closed|history/.test(status)
  );
}

export function isInactiveImportedContact(conversation = {}) {
  const record =
    conversation && typeof conversation === "object" ? conversation : {};

  return Boolean(
    record.contactImported === true &&
      record.meetroAccountLinked !== true
  );
}

export function isSavedRelationshipContact(conversation = {}) {
  const record =
    conversation && typeof conversation === "object" ? conversation : {};

  return Boolean(
    record.savedToContacts === true ||
      record.saved_to_contacts === true ||
      record.contactSaved === true ||
      record.contact_saved === true
  );
}

function isOpenTicketConversation(conversation = {}, type = "") {
  const status = normalizeKey(
    [
      conversation.status,
      conversation.workflow_status,
      conversation.project_status,
      conversation.category,
      conversation.serviceDomain,
      conversation.service_domain,
      conversation.project_title,
    ].join(" ")
  );

  return (
    ["tenant", "propertyManager"].includes(type) &&
    /ticket|maintenance|repair|issue/.test(status) &&
    !isArchivedConversation(conversation)
  );
}

function matchesRelationshipView(relationship = {}, view = "all") {
  const counts =
    relationship?.counts && typeof relationship.counts === "object"
      ? relationship.counts
      : {};
  const durableRoles = relationship?.primaryContactRecord?.businessContactRoles || [];
  const durableRoleMatches = {
    customer: "CUSTOMER",
    professional: "PROFESSIONAL_VENDOR",
    employee: "EMPLOYEE",
    tenant: "TENANT",
    propertyManager: "PROPERTY_MANAGER",
  };

  if (view === "all") return !relationship.isArchivedOnly;
  if (durableRoleMatches[view] && durableRoles.includes(durableRoleMatches[view])) {
    return !relationship.isArchivedOnly;
  }
  if (view === "professional") {
    return ["professional", "vendor"].includes(relationship.type) && !relationship.isArchivedOnly;
  }
  if (RELATIONSHIP_TYPE_LABELS[view]) return relationship.type === view && !relationship.isArchivedOnly;
  if (view === "activeWork") return (counts.currentWork || 0) > 0;
  if (view === "openTickets") return (counts.openTickets || 0) > 0;
  if (view === "unread") return (counts.unread || 0) > 0;
  if (view === "drafts") return (counts.drafts || 0) > 0;
  if (view === "archived") return (counts.archived || 0) > 0;

  return !relationship.isArchivedOnly;
}

function hasSavedProfilePhotoSource(conversation = {}) {
  return Boolean(
    firstValue(
      conversation.participantAvatar,
      conversation.participant_avatar,
      conversation.profilePhoto,
      conversation.profile_photo,
      conversation.profilePhotoUrl,
      conversation.profile_photo_url,
      conversation.businessProfilePhoto,
      conversation.business_profile_photo,
      conversation.businessProfilePhotoUrl,
      conversation.business_profile_photo_url
    )
  );
}

export function createRelationshipLayerModel(conversations = [], options = {}) {
  const viewerRole = String(options.viewerRole || "").toLowerCase();
  const activeMode = String(options.activeMode || viewerRole || "personal").toLowerCase();
  const activeProfileScopeKey = normalizeProfileScopeKey(
    options.activeProfileScopeKey || options.profileScopeKey || ""
  );
  const relationshipMap = new Map();

  toArray(conversations).forEach((conversation) => {
    if (!conversation || !conversation.id) return;

    const identity = getConversationParticipantIdentity(conversation, {
      viewerRole,
      fallbackName: "Relationship",
    });
    const type = inferRelationshipType(conversation, identity, viewerRole);
    if (!isVisibleForActiveMode(conversation, type, activeMode)) return;
    const recordProfileScopeKey = getRecordProfileScopeKey(conversation);
    if (
      activeProfileScopeKey &&
      recordProfileScopeKey &&
      recordProfileScopeKey !== activeProfileScopeKey
    ) {
      return;
    }

    const relationshipId = normalizeKey(getRelationshipId(conversation, type, identity));
    const existing =
      relationshipMap.get(relationshipId) || {
        id: relationshipId,
        name: identity.displayName,
        initials: identity.initials,
        avatar: identity.avatar,
        type,
        typeLabel: RELATIONSHIP_TYPE_LABELS[type] || "Relationship",
        contact: getContact(conversation),
        currentWork: [],
        jobHistory: [],
        invoiceHistory: [],
        documents: [],
        photos: [],
        participants: [],
        forwardedTickets: [],
        conversations: [],
        relationshipSince: "",
        latestActivityAt: 0,
        currentWorkStatus: "",
        memoryPlaceholder: "Relationship memory will appear as Meetro learns from completed work.",
      };

    const timestamp = getConversationTimestamp(conversation);
    const projectTitle = getProjectTitle(conversation);
    const status = getStatus(conversation);
    const savedContact = isSavedRelationshipContact(conversation);
    const contactPlaceholder = isInactiveImportedContact(conversation) || savedContact;

    existing.name = existing.name || identity.displayName;
    existing.initials = existing.initials || identity.initials;
    if (identity.avatar && (!existing.avatar || hasSavedProfilePhotoSource(conversation))) {
      existing.avatar = identity.avatar;
    }

    const conversationSummary = {
      id: String(conversation.id),
      title: projectTitle,
      status,
      savedToHistory: Boolean(conversation.saved_to_history),
      unread: Boolean(conversation.unread),
      draft: isDraftConversation(conversation),
      archived: isArchivedConversation(conversation),
      openTicket: isOpenTicketConversation(conversation, type),
      contactPlaceholder,
      conversation,
    };
    const invoice = getInvoiceRecord(conversation);
    const records = getDocumentRecords(conversation);
    const participants = getParticipantRecords(conversation);

    if (contactPlaceholder) {
      existing.contactRecord = existing.contactRecord || conversation;
      existing.contactPlaceholder = true;
      existing.savedToContacts = existing.savedToContacts || savedContact;
      existing.inviteStatus = firstValue(
        existing.inviteStatus,
        conversation.inviteStatus,
        conversation.invite_status,
        "not_invited"
      );
      existing.meetroAccountLinked =
        existing.meetroAccountLinked || conversation.meetroAccountLinked === true;
    } else {
      existing.conversations.push(conversationSummary);
    }

    existing.latestActivityAt = Math.max(existing.latestActivityAt, timestamp);
    existing.relationshipSince =
      existing.relationshipSince ||
      firstValue(conversation.relationshipSince, conversation.relationship_since, conversation.createdAt, conversation.created_at, "Existing relationship");
    existing.currentWorkStatus =
      contactPlaceholder
        ? existing.currentWorkStatus || "Saved contact"
        : !conversation.saved_to_history && !existing.currentWorkStatus
        ? status
        : existing.currentWorkStatus || status;

    existing.contact = {
      phone: existing.contact.phone || getContact(conversation).phone,
      email: existing.contact.email || getContact(conversation).email,
      address: existing.contact.address || getContact(conversation).address,
    };

    if (contactPlaceholder) {
      // Saved contacts are relationship seeds, not active work or conversations.
    } else if (conversation.saved_to_history) {
      existing.jobHistory.push(conversationSummary);
    } else {
      existing.currentWork.push(conversationSummary);
    }

    if (conversationSummary.openTicket) {
      existing.openTickets = [...(existing.openTickets || []), conversationSummary];
    }

    if (conversation.forwardedTicketId || conversation.ticketId || conversation.ticket_id) {
      existing.forwardedTickets = [
        ...(existing.forwardedTickets || []),
        {
          id: firstValue(conversation.forwardedTicketId, conversation.ticketId, conversation.ticket_id),
          title: projectTitle,
          status,
          invoiceOwner: firstValue(conversation.invoiceOwner, conversation.invoice_owner, "Property manager"),
        },
      ];
    }

    if (invoice) existing.invoiceHistory.push(invoice);
    existing.documents.push(...records.documents);
    existing.photos.push(...records.photos);
    existing.participants = [...existing.participants, ...participants].filter(
      (participant, index, list) =>
        list.findIndex(
          (item) =>
            normalizeKey(item.name) === normalizeKey(participant.name) &&
            normalizeKey(item.role) === normalizeKey(participant.role)
        ) === index
    );
    existing.maintenanceTicket = createMaintenanceTicketFoundation(existing);

    relationshipMap.set(relationshipId, existing);
  });

  const relationships = Array.from(relationshipMap.values())
    .map((relationship) => ({
      ...relationship,
      primaryConversation:
        relationship.currentWork[0]?.conversation ||
        relationship.conversations[0]?.conversation ||
        null,
      primaryContactRecord: relationship.contactRecord || null,
      isInactiveImportedContact:
        Boolean(relationship.contactRecord) &&
        isInactiveImportedContact(relationship.contactRecord),
      savedToContacts: Boolean(
        relationship.savedToContacts ||
          isSavedRelationshipContact(relationship.contactRecord)
      ),
      counts: {
        currentWork: relationship.currentWork.length,
        jobHistory: relationship.jobHistory.length,
        invoices: relationship.invoiceHistory.length,
        documents: relationship.documents.length,
        photos: relationship.photos.length,
        conversations: relationship.conversations.length,
        openTickets: (relationship.openTickets || []).length,
        forwardedTickets: (relationship.forwardedTickets || []).length,
        participants: (relationship.participants || []).length,
        unread: relationship.conversations.filter((item) => item.unread).length,
        drafts: relationship.conversations.filter((item) => item.draft).length,
        archived:
          relationship.conversations.filter((item) => item.archived).length +
          (relationship.contactRecord?.archived ? 1 : 0),
      },
      openTickets: relationship.openTickets || [],
      forwardedTickets: relationship.forwardedTickets || [],
      participants: relationship.participants || [],
      isArchivedOnly:
        (relationship.conversations.length > 0 &&
          relationship.conversations.every((item) => item.archived)) ||
        Boolean(relationship.contactRecord?.archived),
    }))
    .sort((left, right) => {
      const typeDelta =
        RELATIONSHIP_TYPE_ORDER.indexOf(left.type) -
        RELATIONSHIP_TYPE_ORDER.indexOf(right.type);

      if (typeDelta !== 0) return typeDelta;
      return right.latestActivityAt - left.latestActivityAt;
    });

  return {
    relationships,
    relationshipCount: relationships.length,
    views: RELATIONSHIP_VIEW_ORDER.map((view) => ({
      key: view,
      label: RELATIONSHIP_VIEW_LABELS[view],
      relationships: relationships.filter((relationship) =>
        matchesRelationshipView(relationship, view)
      ),
    })),
    typeGroups: RELATIONSHIP_TYPE_ORDER.map((type) => ({
      type,
      label: RELATIONSHIP_TYPE_LABELS[type],
      relationships: relationships.filter((relationship) => relationship.type === type),
    })).filter((group) => group.relationships.length > 0),
  };
}

export function getRelationshipViewRelationships(model = {}, view = "all") {
  const relationships = toArray(model.relationships);

  return relationships.filter((relationship) => matchesRelationshipView(relationship, view));
}
