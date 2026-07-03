import test from "node:test";
import assert from "node:assert/strict";

import {
  createRelationshipLayerModel,
  getRelationshipViewRelationships,
  isInactiveImportedContact,
  isSavedRelationshipContact,
  RELATIONSHIP_TYPE_LABELS,
} from "../src/utils/relationshipLayer.js";

test("relationship layer groups conversations into durable relationship cards", () => {
  const model = createRelationshipLayerModel(
    [
      {
        id: "conv-ed-active",
        customerName: "Ed",
        relationshipType: "customer",
        phone: "555-111-2222",
        email: "ed@example.com",
        location: "123 Main St",
        project_title: "Garage opener install",
        status: "Active work",
        createdAt: "2026-06-20T10:00:00.000Z",
        invoiceId: "invoice-ed-1",
        documents: [{ id: "doc-1", name: "Proposal" }],
        photos: [{ id: "photo-1", name: "Before photo" }],
      },
      {
        id: "conv-ed-history",
        customerName: "Ed",
        relationshipType: "customer",
        project_title: "Door repair",
        status: "Saved to history",
        saved_to_history: true,
        createdAt: "2026-06-18T10:00:00.000Z",
      },
    ],
    { viewerRole: "business" }
  );

  assert.equal(model.relationshipCount, 1);

  const [ed] = model.relationships;
  assert.equal(ed.name, "Ed");
  assert.equal(ed.type, "customer");
  assert.equal(ed.typeLabel, "Customer");
  assert.equal(ed.contact.phone, "555-111-2222");
  assert.equal(ed.contact.email, "ed@example.com");
  assert.equal(ed.counts.currentWork, 1);
  assert.equal(ed.counts.jobHistory, 1);
  assert.equal(ed.counts.invoices, 1);
  assert.equal(ed.counts.documents, 1);
  assert.equal(ed.counts.photos, 1);
  assert.equal(ed.primaryConversation.id, "conv-ed-active");
});

test("imported inactive contacts are relationship seeds, not conversations or work", () => {
  const model = createRelationshipLayerModel(
    [
      {
        id: "imported-ada-thread",
        relationshipId: "imported-relationship-business-tenant-ada",
        relationshipType: "tenant",
        relationshipScope: "business",
        tenantName: "Ada Tenant",
        participantName: "Ada Tenant",
        phone: "555-222-3333",
        email: "ada@example.com",
        address: "Unit 204",
        status: "Imported contact",
        contactImported: true,
        meetroAccountLinked: false,
        inviteStatus: "not_invited",
      },
    ],
    { viewerRole: "business", activeMode: "business" }
  );

  const [ada] = model.relationships;

  assert.equal(isInactiveImportedContact(ada.primaryContactRecord), true);
  assert.equal(ada.primaryConversation, null);
  assert.equal(ada.isInactiveImportedContact, true);
  assert.equal(ada.counts.conversations, 0);
  assert.equal(ada.counts.currentWork, 0);
  assert.equal(ada.contact.phone, "555-222-3333");
});

test("imported inactive contacts can coexist with active Meetro threads safely", () => {
  assert.equal(isInactiveImportedContact(null), false);
  assert.equal(isInactiveImportedContact(undefined), false);
  assert.equal(isInactiveImportedContact({}), false);

  const model = createRelationshipLayerModel(
    [
      {
        id: "imported-alex-thread",
        relationshipId: "imported-relationship-business-customer-alex",
        relationshipType: "customer",
        relationshipScope: "business",
        accountMode: "business",
        customerName: "Alex Example",
        participantName: "Alex Example",
        phone: "555-0100",
        email: "alex@example.com",
        address: "123 Main Street",
        status: "Imported contact",
        contactImported: true,
        meetroAccountLinked: false,
        inviteStatus: "not_invited",
        workHistory: [],
        invoiceHistory: [],
        documents: [],
      },
      {
        id: "active-sarah-thread",
        relationshipId: "relationship-active-sarah",
        relationshipType: "customer",
        relationshipScope: "business",
        accountMode: "business",
        customerName: "Sarah Active",
        participantName: "Sarah Active",
        project_title: "Kitchen repair",
        project_description: "Customer replied about the work.",
        status: "Active Communication",
        meetroAccountLinked: true,
      },
    ],
    { viewerRole: "business", activeMode: "business" }
  );

  const alex = model.relationships.find((relationship) => relationship.name === "Alex Example");
  const sarah = model.relationships.find((relationship) => relationship.name === "Sarah Active");

  assert.equal(alex.isInactiveImportedContact, true);
  assert.equal(alex.primaryConversation, null);
  assert.equal(alex.counts.currentWork, 0);
  assert.equal(alex.counts.invoices, 0);
  assert.equal(alex.counts.documents, 0);
  assert.equal(sarah.isInactiveImportedContact, false);
  assert.equal(isInactiveImportedContact(sarah.primaryContactRecord), false);
  assert.equal(sarah.primaryConversation.id, "active-sarah-thread");
  assert.equal(sarah.counts.currentWork, 1);
});

test("saved linked contacts appear as contact records without creating conversations", () => {
  const model = createRelationshipLayerModel(
    [
      {
        id: "saved-contact-bgone",
        relationshipId: "business-bgone",
        relationshipType: "professional",
        relationshipScope: "personal",
        accountMode: "personal",
        professionalName: "Bgone Home Renovation",
        phone: "555-0101",
        email: "hello@bgone.example",
        status: "Saved contact",
        contactImported: true,
        savedToContacts: true,
        meetroAccountLinked: true,
        linkedMeetroAccountId: "business-bgone",
      },
    ],
    { viewerRole: "homeowner", activeMode: "personal" }
  );

  const [bgone] = model.relationships;

  assert.equal(isSavedRelationshipContact(bgone.primaryContactRecord), true);
  assert.equal(isInactiveImportedContact(bgone.primaryContactRecord), false);
  assert.equal(bgone.savedToContacts, true);
  assert.equal(bgone.meetroAccountLinked, true);
  assert.equal(bgone.primaryConversation, null);
  assert.equal(bgone.isInactiveImportedContact, false);
  assert.equal(bgone.counts.conversations, 0);
  assert.equal(bgone.counts.currentWork, 0);
  assert.equal(bgone.contact.email, "hello@bgone.example");
});

test("saved linked contacts stay separated between personal and business scopes", () => {
  const records = [
    {
      id: "saved-contact-personal-professional-bgone",
      relationshipId: "business-bgone",
      relationshipType: "professional",
      relationshipScope: "personal",
      accountMode: "personal",
      professionalName: "Bgone Home Renovation",
      status: "Saved contact",
      contactImported: true,
      savedToContacts: true,
      meetroAccountLinked: true,
      linkedMeetroAccountId: "business-bgone",
    },
    {
      id: "saved-contact-business-professional-bgone",
      relationshipId: "business-bgone",
      relationshipType: "professional",
      relationshipScope: "business",
      accountMode: "business",
      professionalName: "Bgone Home Renovation",
      status: "Saved contact",
      contactImported: true,
      savedToContacts: true,
      meetroAccountLinked: true,
      linkedMeetroAccountId: "business-bgone",
    },
  ];

  const personalModel = createRelationshipLayerModel(records, {
    viewerRole: "homeowner",
    activeMode: "personal",
  });
  const businessModel = createRelationshipLayerModel(records, {
    viewerRole: "business",
    activeMode: "business",
  });

  assert.equal(personalModel.relationships.length, 1);
  assert.equal(personalModel.relationships[0].primaryContactRecord.id, records[0].id);
  assert.equal(personalModel.relationships[0].savedToContacts, true);
  assert.equal(businessModel.relationships.length, 1);
  assert.equal(businessModel.relationships[0].primaryContactRecord.id, records[1].id);
  assert.equal(businessModel.relationships[0].savedToContacts, true);
});

test("relationship identity keeps profile photos consistent as contacts become linked", () => {
  const model = createRelationshipLayerModel(
    [
      {
        id: "imported-maggie-thread",
        relationshipId: "relationship-maggie",
        relationshipType: "customer",
        relationshipScope: "business",
        accountMode: "business",
        customerName: "Maggie Customer",
        participantName: "Maggie Customer",
        contactPhoto: "stale-contact-placeholder.jpg",
        status: "Imported contact",
        contactImported: true,
        meetroAccountLinked: false,
      },
      {
        id: "active-maggie-thread",
        relationshipId: "relationship-maggie",
        relationshipType: "customer",
        relationshipScope: "business",
        accountMode: "business",
        customerName: "Maggie Customer",
        profilePhoto: "maggie-profile.jpg",
        project_title: "Kitchen repair",
        status: "Active Communication",
        meetroAccountLinked: true,
      },
    ],
    { viewerRole: "business", activeMode: "business" }
  );

  const maggie = model.relationships.find(
    (relationship) => relationship.name === "Maggie Customer"
  );

  assert.equal(maggie.avatar, "maggie-profile.jpg");
  assert.equal(maggie.primaryConversation.id, "active-maggie-thread");
});

test("tenant relationship includes maintenance ticket foundation without recreating work", () => {
  const model = createRelationshipLayerModel(
    [
      {
        id: "tenant-ticket-1",
        tenantName: "Lori",
        participantName: "Lori",
        relationshipType: "tenant",
        serviceDomain: "property_management",
        category: "tenantTicket",
        project_title: "Kitchen leak",
        status: "Maintenance ticket",
        propertyManagerName: "Green Acre Management",
      },
    ],
    { viewerRole: "business" }
  );

  const [lori] = model.relationships;

  assert.equal(lori.type, "tenant");
  assert.equal(lori.typeLabel, RELATIONSHIP_TYPE_LABELS.tenant);
  assert.equal(lori.maintenanceTicket.title, "Maintenance ticket");
  assert.equal(lori.maintenanceTicket.routeTo, "Property manager relationship");
  assert.match(lori.maintenanceTicket.assignment, /without recreating the ticket/);
  assert.equal(lori.maintenanceTicket.invoiceOwner, "Property manager");
  assert.equal(lori.counts.currentWork, 1);
});

test("relationship layer exposes every supported relationship type group", () => {
  const model = createRelationshipLayerModel(
    [
      { id: "c", customerName: "Customer", relationshipType: "customer" },
      { id: "t", participantName: "Tenant", relationshipType: "tenant" },
      { id: "pm", participantName: "PM", relationshipType: "propertyManager" },
      { id: "p", businessName: "Professional Co", relationshipType: "professional" },
      { id: "b", businessName: "Business Co", relationshipType: "business" },
      { id: "e", participantName: "Employee", relationshipType: "employee" },
      { id: "v", participantName: "Vendor", relationshipType: "vendor" },
    ],
    { viewerRole: "business" }
  );

  assert.deepEqual(
    model.typeGroups.map((group) => group.label),
    [
      "Customer",
      "Tenant",
      "Property",
      "Pro",
      "Business",
      "Employee",
      "Vendor",
    ]
  );
});

test("relationship views expose real filtered relationship data", () => {
  const model = createRelationshipLayerModel(
    [
      {
        id: "customer-active",
        relationshipId: "rel-customer",
        customerName: "Ed",
        relationshipType: "customer",
        relationshipScope: "business",
        status: "Active work",
        unread: true,
      },
      {
        id: "tenant-ticket",
        relationshipId: "rel-tenant",
        participantName: "Lori",
        relationshipType: "tenant",
        relationshipScope: "business",
        serviceDomain: "property_management",
        category: "maintenance_ticket",
        status: "Open ticket",
      },
      {
        id: "vendor-draft",
        relationshipId: "rel-vendor",
        participantName: "Vendor",
        relationshipType: "vendor",
        relationshipScope: "business",
        status: "Draft",
        isDraft: true,
      },
      {
        id: "customer-history",
        relationshipId: "rel-history",
        customerName: "History Customer",
        relationshipType: "customer",
        relationshipScope: "business",
        saved_to_history: true,
      },
    ],
    { viewerRole: "business", activeMode: "business" }
  );

  assert.deepEqual(
    getRelationshipViewRelationships(model, "customer").map((relationship) => relationship.name),
    ["Ed"]
  );
  assert.deepEqual(
    getRelationshipViewRelationships(model, "professional").map((relationship) => relationship.name),
    ["Vendor"]
  );
  assert.equal(getRelationshipViewRelationships(model, "activeWork").length, 3);
  assert.equal(getRelationshipViewRelationships(model, "openTickets")[0].name, "Lori");
  assert.equal(getRelationshipViewRelationships(model, "unread")[0].name, "Ed");
  assert.equal(getRelationshipViewRelationships(model, "drafts")[0].name, "Vendor");
  assert.equal(getRelationshipViewRelationships(model, "archived")[0].name, "History Customer");
  assert.ok(
    !getRelationshipViewRelationships(model, "all").some(
      (relationship) => relationship.name === "History Customer"
    )
  );
});

test("relationship layer respects active account mode boundaries", () => {
  const conversations = [
    {
      id: "business-customer",
      customerName: "Sarah",
      relationshipType: "customer",
      relationshipScope: "business",
    },
    {
      id: "personal-professional",
      businessName: "Trusted Pro",
      relationshipType: "professional",
      relationshipScope: "personal",
    },
    {
      id: "business-ticket",
      participantName: "Tenant",
      relationshipType: "tenant",
      relationshipScope: "business",
      category: "maintenance_ticket",
    },
  ];

  const businessModel = createRelationshipLayerModel(conversations, {
    viewerRole: "business",
    activeMode: "business",
  });
  const personalModel = createRelationshipLayerModel(conversations, {
    viewerRole: "homeowner",
    activeMode: "personal",
  });

  assert.deepEqual(
    businessModel.relationships.map((relationship) => relationship.name),
    ["Sarah", "Tenant"]
  );
  assert.deepEqual(
    personalModel.relationships.map((relationship) => relationship.name),
    ["Trusted Pro"]
  );
});

test("property management group relationship forwards the same ticket to every participant", () => {
  const model = createRelationshipLayerModel(
    [
      {
        id: "ticket-mt-1025",
        relationshipId: "palm-vista-unit-204",
        relationshipType: "propertyManager",
        relationshipScope: "business",
        accountMode: "business",
        isGroupRelationship: true,
        participantName: "Unit 204 AC issue",
        project_title: "Unit 204 AC issue",
        project_description: "Ticket #MT-1025 forwarded into the shared relationship space.",
        status: "Ticket forwarded",
        currentWorkStatus: "Ticket forwarded",
        category: "maintenance_ticket",
        serviceDomain: "property_management",
        forwardedTicketId: "MT-1025",
        tenantName: "Ada Tenant",
        propertyManagerName: "Palm Vista PM",
        assignedProfessionalName: "Dolfi AC Supply",
        invoiceOwner: "property_manager",
        participants: [
          { name: "Palm Vista PM", role: "Property manager" },
          { name: "Ada Tenant", role: "Tenant" },
          { name: "Dolfi AC Supply", role: "Professional/vendor" },
        ],
      },
    ],
    { viewerRole: "business", activeMode: "business" }
  );

  const [relationship] = model.relationships;

  assert.equal(relationship.name, "Unit 204 AC issue");
  assert.equal(relationship.counts.currentWork, 1);
  assert.equal(relationship.counts.openTickets, 1);
  assert.equal(relationship.counts.forwardedTickets, 1);
  assert.equal(relationship.forwardedTickets[0].id, "MT-1025");
  assert.equal(relationship.forwardedTickets[0].invoiceOwner, "property_manager");
  assert.deepEqual(
    relationship.participants.map((participant) => participant.name),
    ["Palm Vista PM", "Ada Tenant", "Dolfi AC Supply"]
  );
});
