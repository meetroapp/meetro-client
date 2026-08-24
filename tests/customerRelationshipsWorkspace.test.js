import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getBusinessCustomerRelationship,
  listBusinessCustomerRelationships,
} from "../src/utils/businessCustomerRelationshipsApi.js";
import {
  CUSTOMER_RELATIONSHIP_CONTACT_RETURN_KEY,
  CUSTOMER_RELATIONSHIP_NAVIGATION_KEY,
  clearCustomerRelationshipContactReturn,
  loadCustomerRelationshipDetail,
  loadCustomerRelationshipDirectory,
  loadCustomerRelationshipForContact,
  readCustomerRelationshipContactReturn,
  readCustomerRelationshipNavigationContext,
  writeCustomerRelationshipContactReturn,
} from "../src/utils/customerRelationshipsWorkspace.js";
import {
  CUSTOMER_RELATIONSHIPS_LANGUAGES,
  getCustomerRelationshipsCopy,
} from "../src/utils/customerRelationshipsLanguage.js";

const CONTACT_ID = "11111111-1111-4111-8111-111111111111";
const RELATIONSHIP_ID = "22222222-2222-4222-8222-222222222222";
const pageSource = readFileSync(
  new URL("../src/pages/CustomerRelationshipsCenter.jsx", import.meta.url),
  "utf8"
);
const messagesSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);

function relationship(overrides = {}) {
  return {
    id: RELATIONSHIP_ID,
    contractorProfileId: 10,
    businessContactId: CONTACT_ID,
    version: 1,
    createdAt: "2026-08-24T12:00:00.000Z",
    contact: {
      id: CONTACT_ID,
      partyType: "PERSON",
      displayName: "Earlier Contact Projection",
      status: "ACTIVE",
    },
    ...overrides,
  };
}

function contact(overrides = {}) {
  return {
    id: CONTACT_ID,
    partyType: "PERSON",
    displayName: "Current External Customer",
    companyName: null,
    email: "external@example.test",
    phone: "239-555-0174",
    address: "Cape Coral, FL",
    serviceArea: "Cape Coral",
    status: "ACTIVE",
    version: 4,
    ...overrides,
  };
}

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    values,
  };
}

test("canonical relationship list and detail use owner-scoped GET routes", async () => {
  const calls = [];
  const fetcher = async (endpoint, options) => {
    calls.push({ endpoint, options });
    if (endpoint.startsWith("/business-customer-relationships?")) {
      return { response: { ok: true, status: 200 }, data: { success: true, relationships: [relationship()] } };
    }
    return { response: { ok: true, status: 200 }, data: { success: true, relationship: relationship() } };
  };
  const listed = await listBusinessCustomerRelationships({ contractorProfileId: 10, fetcher });
  const loaded = await getBusinessCustomerRelationship({ relationshipId: RELATIONSHIP_ID, fetcher });
  assert.equal(listed[0].id, RELATIONSHIP_ID);
  assert.equal(loaded.id, RELATIONSHIP_ID);
  assert.equal(calls[0].endpoint, "/business-customer-relationships?contractorProfileId=10&limit=100");
  assert.equal(calls[1].endpoint, `/business-customer-relationships/${RELATIONSHIP_ID}`);
  assert.deepEqual(calls.map((call) => call.options.method), ["GET", "GET"]);
});

test("directory loads the business profile and canonical relationship projection without mutation", async () => {
  const calls = [];
  const result = await loadCustomerRelationshipDirectory({
    fetcher: async (endpoint, options) => {
      calls.push({ endpoint, options });
      if (endpoint === "/my-contractor-profile") {
        return { response: { ok: true, status: 200 }, data: { profile: { id: 10 } } };
      }
      return { response: { ok: true, status: 200 }, data: { success: true, relationships: [relationship()] } };
    },
  });
  assert.equal(result.length, 1);
  assert.deepEqual(calls.map((call) => call.endpoint), [
    "/my-contractor-profile",
    "/business-customer-relationships?contractorProfileId=10&limit=100",
  ]);
  assert.equal(calls.every((call) => !call.options.method || call.options.method === "GET"), true);
});

test("relationship detail reads current Contact authority instead of copying mutable relationship fields", async () => {
  const calls = [];
  const detail = await loadCustomerRelationshipDetail({
    relationshipId: RELATIONSHIP_ID,
    fetcher: async (endpoint, options) => {
      calls.push({ endpoint, options });
      if (endpoint.startsWith("/business-contacts/")) {
        return { response: { ok: true, status: 200 }, data: { success: true, contact: contact() } };
      }
      return { response: { ok: true, status: 200 }, data: { success: true, relationship: relationship() } };
    },
  });
  assert.equal(detail.relationship.contact.displayName, "Earlier Contact Projection");
  assert.equal(detail.contact.displayName, "Current External Customer");
  assert.equal(detail.contact.email, "external@example.test");
  assert.deepEqual(calls.map((call) => call.options.method), ["GET", "GET"]);
});

test("Contact lookup reuses an existing relationship and returns truthful absence without establishing one", async () => {
  const existingCalls = [];
  const existing = await loadCustomerRelationshipForContact({
    businessContactId: CONTACT_ID,
    fetcher: async (endpoint, options) => {
      existingCalls.push({ endpoint, options });
      if (endpoint.startsWith("/business-contacts/")) {
        return { response: { ok: true, status: 200 }, data: { success: true, contact: contact() } };
      }
      return { response: { ok: true, status: 200 }, data: { success: true, relationship: relationship() } };
    },
  });
  assert.equal(existing.relationship.id, RELATIONSHIP_ID);

  const missingCalls = [];
  const missing = await loadCustomerRelationshipForContact({
    businessContactId: CONTACT_ID,
    fetcher: async (endpoint, options) => {
      missingCalls.push({ endpoint, options });
      if (endpoint.startsWith("/business-contacts/")) {
        return { response: { ok: true, status: 200 }, data: { success: true, contact: contact() } };
      }
      return {
        response: { ok: false, status: 404 },
        data: { success: false, code: "BUSINESS_CUSTOMER_RELATIONSHIP_NOT_FOUND" },
      };
    },
  });
  assert.equal(missing.relationship, null);
  assert.equal([...existingCalls, ...missingCalls].every((call) => call.options.method === "GET"), true);
  assert.equal([...existingCalls, ...missingCalls].some((call) => call.endpoint === "/business-customer-relationships"), false);
});

test("relationship read failures fail visibly without browser relationship fallback", async () => {
  await assert.rejects(
    loadCustomerRelationshipDirectory({
      fetcher: async (endpoint) => endpoint === "/my-contractor-profile"
        ? { response: { ok: true, status: 200 }, data: { profile: { id: 10 } } }
        : {
            response: { ok: false, status: 503 },
            data: {
              success: false,
              code: "BUSINESS_CUSTOMER_RELATIONSHIP_FAILED",
              message: "Customer Relationships are temporarily unavailable.",
            },
          },
    }),
    (error) => error.status === 503 &&
      error.message === "Customer Relationships are temporarily unavailable."
  );
  assert.doesNotMatch(pageSource, /customerRelationshipsRegistry|localRelationship|request_relationship/);
});

test("Contact roles alone are not read as relationship identity or establishment authority", () => {
  const workspaceSource = readFileSync(
    new URL("../src/utils/customerRelationshipsWorkspace.js", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(workspaceSource, /businessContactRoles|activeRoles|assignBusinessContactRole/);
  assert.doesNotMatch(workspaceSource, /establishBusinessCustomerRelationship/);
});

test("archived and external Contacts remain readable without Meetro account authority", async () => {
  const archived = await loadCustomerRelationshipDetail({
    relationshipId: RELATIONSHIP_ID,
    fetcher: async (endpoint) => endpoint.startsWith("/business-contacts/")
      ? { response: { ok: true, status: 200 }, data: { success: true, contact: contact({ status: "ARCHIVED" }) } }
      : { response: { ok: true, status: 200 }, data: { success: true, relationship: relationship() } },
  });
  assert.equal(archived.contact.status, "ARCHIVED");
  assert.equal("userId" in archived.contact, false);
  assert.match(pageSource, /contact\.status === "ARCHIVED"/);
  assert.match(pageSource, /copy\.externalContact/);
});

test("Contact navigation carries only stable Contact identity and resolves through by-contact GET", () => {
  const sourceStorage = storage({
    [CUSTOMER_RELATIONSHIP_NAVIGATION_KEY]: JSON.stringify({
      businessContactId: CONTACT_ID,
      relationshipId: "browser-row-id",
      returnPage: "messagesInbox",
      displayName: "Ignored browser name",
    }),
  });
  assert.deepEqual(readCustomerRelationshipNavigationContext(sourceStorage), {
    businessContactId: CONTACT_ID,
    returnPage: "messagesInbox",
  });
  assert.match(messagesSource, /businessContactId: record\.businessContactId \|\| ""/);
  assert.match(pageSource, /loadCustomerRelationshipForContact/);
});

test("return to Communication Center preserves archived Contact visibility without browser Contact authority", () => {
  const targetStorage = storage();
  assert.equal(writeCustomerRelationshipContactReturn(targetStorage, contact({ status: "ARCHIVED" })), true);
  assert.deepEqual(readCustomerRelationshipContactReturn(targetStorage), {
    businessContactId: CONTACT_ID,
    status: "ARCHIVED",
  });
  assert.equal(targetStorage.getItem("meetroMessageSection"), "contacts");
  clearCustomerRelationshipContactReturn(targetStorage);
  assert.equal(targetStorage.getItem(CUSTOMER_RELATIONSHIP_CONTACT_RETURN_KEY), null);
  assert.match(messagesSource, /projectBusinessContactRecord\(savedContact\)/);
  assert.match(messagesSource, /clearCustomerRelationshipContactReturn/);
});

test("Customer Relationship workspace copy is complete in all governed languages", () => {
  assert.deepEqual(CUSTOMER_RELATIONSHIPS_LANGUAGES, ["en", "es", "fr", "pt-BR"]);
  for (const language of CUSTOMER_RELATIONSHIPS_LANGUAGES) {
    const localized = getCustomerRelationshipsCopy(language);
    for (const key of ["title", "loading", "loadErrorTitle", "emptyTitle", "relationshipList", "currentContact", "noRelationshipText", "externalContact", "readOnly"]) {
      assert.equal(typeof localized[key], "string");
      assert.notEqual(localized[key].trim(), "");
    }
  }
});

test("workspace contains no history fabrication, request authority, or CRM pipeline projection", () => {
  assert.doesNotMatch(pageSource, /request_relationship/);
  assert.doesNotMatch(pageSource, /jobHistory|invoiceHistory|documentHistory|photoHistory|relationshipMemory/);
  assert.doesNotMatch(pageSource, /score|lifetimeValue|leadStage|salesStage|conversionProbability|followUp/);
});
