import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getBusinessContact,
} from "../src/utils/businessContactsApi.js";
import {
  establishBusinessCustomerRelationship,
  getBusinessCustomerRelationshipByContact,
} from "../src/utils/businessCustomerRelationshipsApi.js";
import {
  applyBusinessContactToDocumentSnapshot,
  businessContactSearchText,
  completeBusinessDocumentCustomerWorkflow,
  filterBusinessDocumentCustomerContacts,
  findBusinessContactDuplicateCandidates,
  hasBusinessDocumentCustomerSnapshot,
  normalizeBusinessDocumentCustomerParty,
} from "../src/utils/businessDocumentCustomerParty.js";
import {
  buildBusinessDocumentSavePayload,
  restoreBusinessDocumentDraft,
} from "../src/utils/businessDocumentPersistence.js";
import { validateBusinessDocumentDraft } from "../src/utils/businessDocumentDraftApi.js";
import { SUPPORTED_LANGUAGES, t } from "../src/utils/language.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");
const styles = read("src/components/UnifiedBusinessDocumentWorkspace.css");
const CONTACT_ONE = "11111111-1111-4111-8111-111111111111";
const CONTACT_TWO = "22222222-2222-4222-8222-222222222222";
const RELATIONSHIP_ONE = "33333333-3333-4333-8333-333333333333";
const KEY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function contact(overrides = {}) {
  return {
    id: CONTACT_ONE,
    contractorProfileId: 10,
    partyType: "PERSON",
    displayName: "Jack Smith",
    companyName: null,
    email: "jack@example.test",
    phone: "+1 303 555 0101",
    address: "456 Oak St",
    serviceArea: "Denver",
    status: "ACTIVE",
    version: 1,
    roles: [{ id: "role-one", role: "CUSTOMER", active: true }],
    ...overrides,
  };
}

function savedDraft(overrides = {}) {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    documentType: "QUOTE",
    status: "WORKING_DRAFT",
    reference: "WQ-44444444",
    documentNumber: "Q-0000001",
    jobId: null,
    customerParty: {
      contractorProfileId: 10,
      businessContactId: CONTACT_ONE,
      customerRelationshipId: RELATIONSHIP_ONE,
      jobId: "66666666-6666-4666-8666-666666666666",
      linkedAt: "2026-08-24T12:00:30.000Z",
    },
    version: 2,
    createdAt: "2026-08-24T12:00:00.000Z",
    updatedAt: "2026-08-24T12:01:00.000Z",
    content: { customerName: "Historical Jack" },
    workspace: { activeDocument: "QUOTE", instructions: [], manualOverrides: {}, privateReminders: [] },
    photos: [],
    ...overrides,
  };
}

test("Quote and Invoice customer lookup offers ACTIVE Contacts and searches display fields without using them as identity", () => {
  const records = [
    contact(),
    contact({ id: CONTACT_TWO, displayName: "Acme Electric", companyName: "Acme Electric LLC", email: "office@acme.test", phone: "7205550199" }),
    contact({ id: "55555555-5555-4555-8555-555555555555", displayName: "Archived Jack", status: "ARCHIVED" }),
  ];
  assert.equal(filterBusinessDocumentCustomerContacts(records, "acme")[0].id, CONTACT_TWO);
  assert.equal(filterBusinessDocumentCustomerContacts(records, "7205550199")[0].id, CONTACT_TWO);
  assert.equal(filterBusinessDocumentCustomerContacts(records, "jack").length, 1);
  assert.match(businessContactSearchText(records[1]), /office@acme test/);
  assert.doesNotMatch(businessContactSearchText(records[1]), new RegExp(CONTACT_TWO));
  assert.match(workspace, /activeDocument === "quote" \? quote : invoice/);
  assert.match(workspace, /status: "ACTIVE"/);
});

test("saved Contact snapshot is copied once into blank fields and never live-synced", () => {
  const source = contact();
  const copied = applyBusinessContactToDocumentSnapshot({ content: {}, contact: source });
  assert.deepEqual(copied, {
    customerName: "Jack Smith",
    customerEmail: "jack@example.test",
    customerPhone: "+1 303 555 0101",
    customerAddress: "456 Oak St",
    customerLocation: "456 Oak St",
    serviceLocation: "456 Oak St",
  });
  source.displayName = "Jack A. Smith";
  source.email = "new@example.test";
  assert.equal(copied.customerName, "Jack Smith");
  assert.equal(copied.customerEmail, "jack@example.test");
});

test("populated document snapshot is preserved unless replacement is explicit", () => {
  const current = { customerName: "Manual Customer", customerEmail: "manual@example.test", projectTitle: "Repair" };
  assert.equal(hasBusinessDocumentCustomerSnapshot(current), true);
  assert.deepEqual(
    applyBusinessContactToDocumentSnapshot({ content: current, contact: contact() }),
    current
  );
  const replaced = applyBusinessContactToDocumentSnapshot({ content: current, contact: contact(), replace: true });
  assert.equal(replaced.customerName, "Jack Smith");
  assert.equal(replaced.customerEmail, "jack@example.test");
  assert.equal(replaced.projectTitle, "Repair");
  assert.match(workspace, /businessDocumentCustomerReplaceWarning/);
  assert.match(workspace, /Link and keep document details|businessDocumentCustomerKeep/);
});

test("duplicate candidates are warning-only and never auto-selected or merged", () => {
  const candidates = findBusinessContactDuplicateCandidates(
    [contact(), contact({ id: CONTACT_TWO, displayName: "Someone Else", email: "other@example.test", phone: "3035559999" })],
    { customerName: "Jack Smith", customerEmail: "JACK@example.test" }
  );
  assert.deepEqual(candidates.map((item) => item.id), [CONTACT_ONE]);
  assert.match(workspace, /duplicateCandidates: candidates/);
  assert.match(workspace, /businessDocumentCustomerCreateAnyway/);
  assert.doesNotMatch(workspace, /mergeBusinessContact|deleteBusinessContact/);
});

test("relationship read reuses existing truth and treats only governed not-found as absent", async () => {
  const calls = [];
  const relationship = { id: RELATIONSHIP_ONE, contractorProfileId: 10, businessContactId: CONTACT_ONE, version: 1 };
  const loaded = await getBusinessCustomerRelationshipByContact({
    businessContactId: CONTACT_ONE,
    fetcher: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return { response: { ok: true, status: 200 }, data: { success: true, relationship } };
    },
  });
  assert.equal(loaded.id, RELATIONSHIP_ONE);
  assert.equal(calls[0].options.method, "GET");
  assert.match(calls[0].endpoint, new RegExp(CONTACT_ONE));
  const missing = await getBusinessCustomerRelationshipByContact({
    businessContactId: CONTACT_ONE,
    fetcher: async () => ({ response: { ok: false, status: 404 }, data: { success: false, code: "BUSINESS_CUSTOMER_RELATIONSHIP_NOT_FOUND" } }),
  });
  assert.equal(missing, null);
});

test("relationship establishment is an explicit idempotent POST with stable Contact UUID", async () => {
  const calls = [];
  const relationship = await establishBusinessCustomerRelationship({
    contractorProfileId: 10,
    businessContactId: CONTACT_ONE,
    idempotencyKey: KEY,
    fetcher: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return { response: { ok: true, status: 201 }, data: { success: true, relationship: { id: RELATIONSHIP_ONE, contractorProfileId: 10, businessContactId: CONTACT_ONE, version: 1 } } };
    },
  });
  assert.equal(relationship.id, RELATIONSHIP_ONE);
  assert.equal(calls[0].endpoint, "/business-customer-relationships");
  assert.equal(calls[0].options.headers["Idempotency-Key"], KEY);
  assert.deepEqual(JSON.parse(calls[0].options.body), { contractorProfileId: 10, businessContactId: CONTACT_ONE });
  await assert.rejects(
    establishBusinessCustomerRelationship({
      contractorProfileId: 10,
      businessContactId: CONTACT_ONE,
      idempotencyKey: KEY,
      fetcher: async () => ({ response: { ok: true, status: 201 }, data: { success: true, relationship: { id: "not-a-uuid" } } }),
    }),
    (error) => error.code === "BUSINESS_CUSTOMER_RELATIONSHIP_RESPONSE_INVALID"
  );
});

test("opening a picker or document performs reads only; relationship creation is inside explicit customer use", () => {
  const openBlock = workspace.slice(workspace.indexOf("async function openCustomerControl"), workspace.indexOf("async function hydrateLinkedCustomer"));
  assert.match(openBlock, /listBusinessContacts/);
  assert.doesNotMatch(openBlock, /establishBusinessCustomerRelationship\(|assignBusinessContactRole\(|createBusinessContact\(|saveDocument\(/);
  const hydrateBlock = workspace.slice(workspace.indexOf("async function hydrateLinkedCustomer"), workspace.indexOf("function relationshipCommandKey"));
  assert.match(hydrateBlock, /getBusinessContact/);
  assert.doesNotMatch(hydrateBlock, /establish|create|assign|saveDocument/);
  const explicitBlock = workspace.slice(workspace.indexOf("async function applySavedCustomer"), workspace.indexOf("async function saveCurrentCustomerAsContact"));
  assert.match(explicitBlock, /resolveOrEstablishCustomerRelationship/);
  assert.match(explicitBlock, /persistCustomerLink/);
});

test("working-document payload and reopen preserve exact Contact and Relationship IDs", () => {
  const party = { businessContactId: CONTACT_ONE, customerRelationshipId: RELATIONSHIP_ONE };
  const payload = buildBusinessDocumentSavePayload({ documentType: "quote", content: {}, customerParty: party });
  assert.deepEqual(payload.customerParty, party);
  const validated = validateBusinessDocumentDraft(savedDraft());
  assert.equal(validated.customerParty.businessContactId, CONTACT_ONE);
  assert.equal(validated.customerParty.jobId, "66666666-6666-4666-8666-666666666666");
  const restored = restoreBusinessDocumentDraft(validated);
  assert.deepEqual(restored.customerParty, party);
  assert.equal(normalizeBusinessDocumentCustomerParty({ businessContactId: "name", customerRelationshipId: "email" }), null);
  assert.equal(validateBusinessDocumentDraft(savedDraft({ customerParty: { ...savedDraft().customerParty, unsupported: true } })), null);
});

test("linked archived Contact remains readable while archived Contacts stay out of new selection", async () => {
  const archived = contact({ status: "ARCHIVED" });
  const loaded = await getBusinessContact({
    contactId: CONTACT_ONE,
    fetcher: async (endpoint, options) => ({
      response: { ok: true, status: 200 },
      data: { success: true, contact: archived, endpoint, method: options.method },
    }),
  });
  assert.equal(loaded.status, "ARCHIVED");
  assert.equal(filterBusinessDocumentCustomerContacts([loaded], "").length, 0);
  assert.match(workspace, /businessDocumentCustomerArchived/);
  assert.match(workspace, /hydrateLinkedCustomer\(type, restored\.customerParty\)/);
});

test("Save as Customer Contact explicitly creates, assigns CUSTOMER, establishes one relationship, and links through draft save", () => {
  const createBlock = workspace.slice(workspace.indexOf("async function saveCurrentCustomerAsContact"), workspace.indexOf("async function retryCustomerWorkflow"));
  assert.match(createBlock, /createBusinessContact\(/);
  assert.match(createBlock, /assignBusinessContactRole\(/);
  assert.match(createBlock, /role: "CUSTOMER"/);
  assert.match(createBlock, /resolveOrEstablishCustomerRelationship/);
  assert.match(createBlock, /persistCustomerLink/);
  assert.match(createBlock, /pendingContact/);
  assert.match(createBlock, /pendingRelationship/);
  assert.match(workspace, /retryPhase: "LINK"/);
  assert.match(workspace, /replaceSnapshot: replace/);
  assert.match(workspace, /customerControl\.replaceSnapshot/);
  assert.doesNotMatch(createBlock, /localStorage|sessionStorage|invite|Conversation|Payment|approve|schedule/);
});

test("Contact success plus Relationship failure retries without creating a second Contact", async () => {
  let creates = 0;
  let relationships = 0;
  const created = contact();
  const operations = {
    createContact: async () => { creates += 1; return created; },
    assignCustomerRole: async (value) => value,
    resolveRelationship: async () => {
      relationships += 1;
      if (relationships === 1) throw new Error("relationship unavailable");
      return { id: RELATIONSHIP_ONE };
    },
    linkDocument: async () => ({ id: "draft" }),
  };
  let checkpoint;
  await assert.rejects(
    completeBusinessDocumentCustomerWorkflow(operations),
    (error) => {
      checkpoint = error;
      return error.phase === "RELATIONSHIP" && error.contact === created;
    }
  );
  const result = await completeBusinessDocumentCustomerWorkflow({
    ...operations,
    contact: checkpoint.contact,
  });
  assert.equal(result.contact.id, CONTACT_ONE);
  assert.equal(creates, 1);
  assert.equal(relationships, 2);
});

test("Contact and Relationship success plus link failure retries only document linkage", async () => {
  let creates = 0;
  let relationships = 0;
  let links = 0;
  const created = contact();
  const relationship = { id: RELATIONSHIP_ONE };
  const operations = {
    createContact: async () => { creates += 1; return created; },
    assignCustomerRole: async (value) => value,
    resolveRelationship: async () => { relationships += 1; return relationship; },
    linkDocument: async () => {
      links += 1;
      if (links === 1) throw new Error("document unavailable");
      return { id: "draft" };
    },
  };
  let checkpoint;
  await assert.rejects(
    completeBusinessDocumentCustomerWorkflow(operations),
    (error) => {
      checkpoint = error;
      return error.phase === "LINK" && error.contact === created && error.relationship === relationship;
    }
  );
  await completeBusinessDocumentCustomerWorkflow({
    ...operations,
    contact: checkpoint.contact,
    relationship: checkpoint.relationship,
  });
  assert.equal(creates, 1);
  assert.equal(relationships, 1);
  assert.equal(links, 2);
});

test("document linkage uses the existing optimistic save path and does not introduce authority side effects", () => {
  const linkBlock = workspace.slice(workspace.indexOf("async function persistCustomerLink"), workspace.indexOf("async function applySavedCustomer"));
  assert.match(linkBlock, /saveDocument\(documentType/);
  assert.match(linkBlock, /customerPartyOverride: customerParty/);
  assert.match(workspace, /expectedVersion: existing\.version/);
  assert.match(workspace, /idempotencyKey: saveAttemptKeysRef\.current\[documentType\]/);
  assert.doesNotMatch(linkBlock, /issue|approve|decline|paid|Payment|schedule|lifecycle|invite|Conversation/);
  assert.doesNotMatch(workspace, /customerPartyLocalStorage|meetro_customer_party|createCanonicalQuoteCustomerParty/);
});

test("manual entry alone remains Contact- and Relationship-free", () => {
  const manualBlock = workspace.slice(workspace.indexOf("function applyManualDraft"), workspace.indexOf("function focusPreview"));
  assert.doesNotMatch(manualBlock, /createBusinessContact|assignBusinessContactRole|establishBusinessCustomerRelationship|persistCustomerLink/);
});

test("new customer UI is localized in all supported languages", () => {
  for (const { code } of SUPPORTED_LANGUAGES) {
    for (const key of [
      "businessDocumentCustomerChoose",
      "businessDocumentCustomerSave",
      "businessDocumentCustomerLinked",
      "businessDocumentCustomerDuplicateHelp",
      "businessDocumentCustomerArchived",
    ]) {
      assert.ok(t(key, code).trim(), `${code}:${key}`);
    }
  }
});

test("customer picker stays bounded, keyboard-native, and mobile-contained", () => {
  assert.match(workspace, /type="search"/);
  assert.match(workspace, /role="listbox"/);
  assert.match(workspace, /role="option"/);
  assert.match(workspace, /aria-selected/);
  assert.match(styles, /\.business-document-customer-results[\s\S]*max-height:\s*210px[\s\S]*overflow-y:\s*auto/);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.business-document-customer-summary/);
  assert.doesNotMatch(styles, /\.business-document-customer-control[^}]*min-width:\s*[4-9][0-9]{2}px/);
});
