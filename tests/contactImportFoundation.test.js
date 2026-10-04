import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTACT_IMPORT_TYPE_OPTIONS,
  buildImportedContactRelationship,
  normalizeImportedContact,
  parseImportedContactsFromText,
} from "../src/utils/contactImport.js";
import { createRelationshipLayerModel } from "../src/utils/relationshipLayer.js";

test("contact import parses CSV contacts for review", () => {
  const contacts = parseImportedContactsFromText(
    "Name,Email,Phone,Address\nEd Thompson,ed@example.com,555-111-2222,123 Main St\nLori Palm,lori@example.com,555-222-3333,Unit 204",
    "customer"
  );

  assert.equal(contacts.length, 2);
  assert.equal(contacts[0].name, "Ed Thompson");
  assert.equal(contacts[0].email, "ed@example.com");
  assert.equal(contacts[1].address, "Unit 204");
  assert.equal(contacts[0].type, "customer");
});

test("contact import parses vCard contacts without requiring Meetro accounts", () => {
  const [contact] = parseImportedContactsFromText(
    "BEGIN:VCARD\nVERSION:3.0\nFN:Dolfi AC Supply\nEMAIL:dolfi@example.com\nTEL:555-333-4444\nEND:VCARD",
    "professional"
  );

  assert.equal(contact.name, "Dolfi AC Supply");
  assert.equal(contact.email, "dolfi@example.com");
  assert.equal(contact.phone, "555-333-4444");
  assert.equal(contact.type, "professional");
});

test("imported contact relationship is a placeholder before invite", () => {
  const record = buildImportedContactRelationship(
    normalizeImportedContact(
      {
        name: "Ada Tenant",
        email: "ada@example.com",
        phone: "555-444-5555",
        address: "Unit 204",
        type: "tenant",
      },
      0,
      "tenant"
    ),
    { activeMode: "business", createdAt: "2026-07-01T10:00:00.000Z" }
  );

  assert.equal(record.relationshipType, "tenant");
  assert.equal(record.relationshipScope, "business");
  assert.equal(record.tenantName, "Ada Tenant");
  assert.equal(record.contactImported, true);
  assert.equal(record.meetroAccountLinked, false);
  assert.equal(record.inviteStatus, "not_invited");
  assert.equal(record.status, "Imported contact");
});

test("imported contacts appear as relationship rows in Messages", () => {
  const records = [
    buildImportedContactRelationship(
      { name: "Existing Customer", email: "customer@example.com", type: "customer" },
      { activeMode: "business", createdAt: "2026-07-01T10:00:00.000Z" }
    ),
    buildImportedContactRelationship(
      { name: "Vendor Pro", email: "vendor@example.com", type: "vendor" },
      { activeMode: "business", createdAt: "2026-07-01T10:01:00.000Z" }
    ),
  ];
  const model = createRelationshipLayerModel(records, {
    viewerRole: "business",
    activeMode: "business",
  });

  assert.deepEqual(
    model.relationships.map((relationship) => relationship.name),
    ["Existing Customer", "Vendor Pro"]
  );
  assert.ok(
    model.relationships.every(
      (relationship) =>
        relationship.primaryConversation === null &&
        relationship.primaryContactRecord.contactImported === true &&
        relationship.isInactiveImportedContact === true &&
        relationship.counts.currentWork === 0
    )
  );
});

test("contact import exposes every required assignment type", () => {
  assert.deepEqual(
    CONTACT_IMPORT_TYPE_OPTIONS.map((option) => option.label),
    [
      "Customer",
      "Professional / Vendor",
      "Employee",
      "Tenant",
      "Property Manager",
    ]
  );
});

test("contact import accepts human type labels from files", () => {
  const contacts = parseImportedContactsFromText(
    "Name,Type\nDolfi AC Supply,Vendor / Pro\nPalm Vista PM,Property contact",
    "customer"
  );

  assert.equal(contacts[0].type, "professional");
  assert.equal(contacts[1].type, "propertyManager");
});

test("contact import preserves private notes and organization intent for governed save", () => {
  const [contact] = parseImportedContactsFromText(
    "Name,Email,Type,Note\nDolfi AC Supply,dolfi@example.com,Business,Net 30 vendor",
    "customer"
  );

  assert.equal(contact.type, "professional");
  assert.equal(contact.note, "Net 30 vendor");
  const organization = normalizeImportedContact({
    organization: "Dolfi AC Supply",
    email: "dolfi@example.com",
  });
  assert.equal(organization.partyType, "ORGANIZATION");
});
