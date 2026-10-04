import test from "node:test";
import assert from "node:assert/strict";

import {
  BUSINESS_CONTACT_ROLES,
  BusinessContactApiError,
  archiveBusinessContact,
  createBusinessContactWithRole,
  createDeterministicBusinessContactKey,
  getBusinessContactRoleForType,
  importBusinessContacts,
  listBusinessContacts,
  projectBusinessContactRecord,
  reconcileBusinessContactRoles,
  updateBusinessContact,
} from "../src/utils/businessContactsApi.js";
import {
  createRelationshipLayerModel,
  getRelationshipViewRelationships,
} from "../src/utils/relationshipLayer.js";

const CONTACT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ROLE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const COMMAND_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function response(data, status = 200) {
  return { response: { ok: status >= 200 && status < 300, status }, data };
}

function contact(overrides = {}) {
  return {
    id: CONTACT_ID,
    contractorProfileId: 12,
    partyType: "PERSON",
    displayName: "Jack Smith",
    email: "jack@example.com",
    phone: "555-111-2222",
    address: "1 Main St",
    serviceArea: null,
    privateNote: "Prefers text messages.",
    status: "ACTIVE",
    version: 2,
    roles: [
      { id: ROLE_ID, role: "CUSTOMER", active: true, endedAt: null },
    ],
    ...overrides,
  };
}

test("current Add and Import choices map to the five governed Contact roles", () => {
  assert.deepEqual(
    ["customer", "professional", "employee", "tenant", "propertyManager"].map(
      getBusinessContactRoleForType
    ),
    [
      "CUSTOMER",
      "PROFESSIONAL_VENDOR",
      "EMPLOYEE",
      "TENANT",
      "PROPERTY_MANAGER",
    ]
  );
});

test("durable Contact list uses the governed business-owned search contract", async () => {
  const calls = [];
  const contacts = await listBusinessContacts({
    contractorProfileId: 12,
    search: "Jack Smith",
    status: "ALL",
    role: "CUSTOMER",
    fetcher: async (...args) => {
      calls.push(args);
      return response({ success: true, contacts: [contact()] });
    },
  });

  assert.equal(contacts.length, 1);
  assert.match(calls[0][0], /^\/business-contacts\?/);
  assert.match(calls[0][0], /contractorProfileId=12/);
  assert.match(calls[0][0], /search=Jack\+Smith/);
  assert.match(calls[0][0], /role=CUSTOMER/);
  assert.equal(calls[0][1].method, "GET");
});

test("durable Contact list defaults to ACTIVE and excludes archived records", async () => {
  const calls = [];
  const contacts = await listBusinessContacts({
    contractorProfileId: 12,
    fetcher: async (...args) => {
      calls.push(args);
      return response({
        success: true,
        contacts: [contact(), contact({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", status: "ARCHIVED" })],
      });
    },
  });

  assert.equal(contacts.length, 1);
  assert.equal(contacts[0].status, "ACTIVE");
  assert.match(calls[0][0], /status=ACTIVE/);
});

test("durable Contact list requests and returns ARCHIVED records explicitly", async () => {
  const calls = [];
  const contacts = await listBusinessContacts({
    contractorProfileId: 12,
    status: "ARCHIVED",
    fetcher: async (...args) => {
      calls.push(args);
      return response({
        success: true,
        contacts: [contact(), contact({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", status: "ARCHIVED" })],
      });
    },
  });

  assert.equal(contacts.length, 1);
  assert.equal(contacts[0].status, "ARCHIVED");
  assert.match(calls[0][0], /status=ARCHIVED/);
});

test("Add Customer creates a durable Contact and explicitly assigns CUSTOMER", async () => {
  const calls = [];
  const fetcher = async (endpoint, options) => {
    calls.push({ endpoint, options, body: JSON.parse(options.body) });
    if (endpoint === "/business-contacts") {
      return response({
        success: true,
        contact: contact({ version: 1, roles: [] }),
        duplicateCandidates: [],
      }, 201);
    }
    return response({ success: true, contact: contact() }, 201);
  };

  const result = await createBusinessContactWithRole({
    contact: {
      contractorProfileId: 12,
      partyType: "PERSON",
      displayName: "Jack Smith",
      privateNote: "Prefers text messages.",
    },
    role: "CUSTOMER",
    idempotencyKey: COMMAND_ID,
    fetcher,
  });

  assert.equal(result.contact.id, CONTACT_ID);
  assert.deepEqual(calls.map((call) => call.endpoint), [
    "/business-contacts",
    `/business-contacts/${CONTACT_ID}/roles`,
  ]);
  assert.equal(calls[0].body.privateNote, "Prefers text messages.");
  assert.equal(calls[1].body.role, "CUSTOMER");
  assert.equal(calls.some((call) => /user|job|quote|conversation/i.test(call.endpoint)), false);
});

test("Contact projection preserves private note, UUID, roles, and unlinked identity", () => {
  const projected = projectBusinessContactRecord(contact({
    roles: [
      { id: ROLE_ID, role: "CUSTOMER", active: true },
      { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", role: "PROPERTY_MANAGER", active: true },
    ],
  }));

  assert.equal(projected.businessContactId, CONTACT_ID);
  assert.deepEqual(projected.businessContactRoles, ["CUSTOMER", "PROPERTY_MANAGER"]);
  assert.equal(projected.privateNote, "Prefers text messages.");
  assert.equal(projected.meetroAccountLinked, false);
  assert.equal(projected.conversationId, undefined);
});

test("editing PATCHes the same Contact UUID with optimistic version protection", async () => {
  const calls = [];
  await updateBusinessContact({
    contactId: CONTACT_ID,
    expectedVersion: 2,
    patch: { displayName: "Jack A. Smith", privateNote: "Call after 4." },
    idempotencyKey: COMMAND_ID,
    fetcher: async (endpoint, options) => {
      calls.push({ endpoint, options, body: JSON.parse(options.body) });
      return response({ success: true, contact: contact({ displayName: "Jack A. Smith", version: 3 }) });
    },
  });

  assert.equal(calls[0].endpoint, `/business-contacts/${CONTACT_ID}`);
  assert.equal(calls[0].options.method, "PATCH");
  assert.equal(calls[0].body.expectedVersion, 2);
  assert.equal(calls[0].body.privateNote, "Call after 4.");
  assert.equal(calls[0].body.id, undefined);
});

test("stale Contact versions fail closed with the governed current version", async () => {
  await assert.rejects(
    updateBusinessContact({
      contactId: CONTACT_ID,
      expectedVersion: 2,
      patch: { displayName: "Stale edit" },
      idempotencyKey: COMMAND_ID,
      fetcher: async () => response({
        success: false,
        code: "BUSINESS_CONTACT_VERSION_CONFLICT",
        message: "A newer Contact version exists.",
        currentVersion: 4,
      }, 409),
    }),
    (error) =>
      error instanceof BusinessContactApiError &&
      error.code === "BUSINESS_CONTACT_VERSION_CONFLICT" &&
      error.currentVersion === 4
  );
});

test("one Contact can gain multiple roles and ending one role keeps the Contact", async () => {
  const calls = [];
  const customer = contact({ version: 2 });
  const withEmployee = contact({
    version: 3,
    roles: [
      ...customer.roles,
      { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", role: "EMPLOYEE", active: true },
    ],
  });
  const fetcher = async (endpoint, options) => {
    calls.push({ endpoint, body: JSON.parse(options.body) });
    return response({ success: true, contact: withEmployee }, 201);
  };

  const reconciled = await reconcileBusinessContactRoles({
    contact: customer,
    desiredRoles: ["CUSTOMER", "EMPLOYEE"],
    commandSeed: COMMAND_ID,
    fetcher,
  });
  assert.equal(reconciled.id, CONTACT_ID);
  assert.deepEqual(reconciled.roles.filter((role) => role.active).map((role) => role.role), [
    "CUSTOMER",
    "EMPLOYEE",
  ]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.role, "EMPLOYEE");
  assert.deepEqual(BUSINESS_CONTACT_ROLES, [
    "CUSTOMER",
    "PROFESSIONAL_VENDOR",
    "EMPLOYEE",
    "TENANT",
    "PROPERTY_MANAGER",
  ]);
});

test("multiple durable roles remain visible through every matching role filter", () => {
  const projected = projectBusinessContactRecord(contact({
    roles: [
      { id: ROLE_ID, role: "CUSTOMER", active: true },
      { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", role: "EMPLOYEE", active: true },
    ],
  }));
  const model = createRelationshipLayerModel([projected], {
    viewerRole: "business",
    activeMode: "business",
  });

  assert.equal(getRelationshipViewRelationships(model, "customer").length, 1);
  assert.equal(getRelationshipViewRelationships(model, "employee").length, 1);
});

test("role reconciliation ends an assignment without deleting Contact identity", async () => {
  const calls = [];
  const multiRole = contact({
    version: 3,
    roles: [
      { id: ROLE_ID, role: "CUSTOMER", active: true },
      { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", role: "EMPLOYEE", active: true },
    ],
  });
  const fetcher = async (endpoint, options) => {
    calls.push({ endpoint, options });
    return response({
      success: true,
      contact: contact({
        version: 4,
        roles: [
          { id: ROLE_ID, role: "CUSTOMER", active: true },
          { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", role: "EMPLOYEE", active: false },
        ],
      }),
    });
  };

  const reconciled = await reconcileBusinessContactRoles({
    contact: multiRole,
    desiredRoles: ["CUSTOMER"],
    commandSeed: COMMAND_ID,
    fetcher,
  });
  assert.equal(reconciled.id, CONTACT_ID);
  assert.match(calls[0].endpoint, /\/roles\/.+\/end$/);
  assert.equal(calls.some((call) => call.options.method === "DELETE"), false);
});

test("archive uses governed archive authority and never destructive delete", async () => {
  const calls = [];
  await archiveBusinessContact({
    contactId: CONTACT_ID,
    expectedVersion: 2,
    idempotencyKey: COMMAND_ID,
    fetcher: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return response({ success: true, contact: contact({ status: "ARCHIVED", version: 3 }) });
    },
  });
  assert.equal(calls[0].endpoint, `/business-contacts/${CONTACT_ID}/archive`);
  assert.equal(calls[0].options.method, "POST");
});

test("archived durable Contact remains a server-owned archived relationship record", () => {
  const projected = projectBusinessContactRecord(contact({
    status: "ARCHIVED",
    version: 3,
  }));
  const model = createRelationshipLayerModel([projected], {
    viewerRole: "business",
    activeMode: "business",
  });

  assert.equal(model.relationships.length, 1);
  assert.equal(model.relationships[0].isArchivedOnly, true);
  assert.equal(model.relationships[0].primaryContactRecord.businessContactId, CONTACT_ID);
});

test("imports use deterministic retry identities and surface partial failures", async () => {
  const firstKeys = [];
  const run = async () => importBusinessContacts({
    contractorProfileId: 12,
    contacts: [
      { id: "one", name: "Saved Contact", email: "saved@example.com", type: "customer" },
      { id: "two", name: "Failed Contact", email: "failed@example.com", type: "employee" },
    ],
    fetcher: async (endpoint, options) => {
      firstKeys.push(options.headers["Idempotency-Key"]);
      const body = JSON.parse(options.body);
      if (body.displayName === "Failed Contact") {
        return response({ success: false, code: "BUSINESS_CONTACT_FAILED", message: "Could not save." }, 503);
      }
      if (endpoint === "/business-contacts") {
        return response({
          success: true,
          contact: contact({ version: 1, roles: [] }),
          duplicateCandidates: [{ id: "ffffffff-ffff-4fff-8fff-ffffffffffff" }],
        }, 201);
      }
      return response({ success: true, contact: contact() }, 201);
    },
  });

  const first = await run();
  const firstRunKeys = [...firstKeys];
  firstKeys.length = 0;
  const second = await run();

  assert.equal(first.successes.length, 1);
  assert.equal(first.failures.length, 1);
  assert.equal(first.successes[0].duplicateCandidates.length, 1);
  assert.deepEqual(firstKeys, firstRunKeys);
  assert.equal(second.failures[0].source.name, "Failed Contact");
  assert.match(firstRunKeys[0], /^[0-9a-f-]{36}$/);
});

test("duplicate candidates remain advisory and are never merged or linked", async () => {
  const endpoints = [];
  const result = await createBusinessContactWithRole({
    contact: { contractorProfileId: 12, partyType: "PERSON", displayName: "Jack Smith", email: "jack@example.com" },
    role: "CUSTOMER",
    idempotencyKey: createDeterministicBusinessContactKey("duplicate-test"),
    fetcher: async (endpoint) => {
      endpoints.push(endpoint);
      if (endpoint === "/business-contacts") {
        return response({
          success: true,
          contact: contact({ version: 1, roles: [] }),
          duplicateCandidates: [{ id: "ffffffff-ffff-4fff-8fff-ffffffffffff" }],
        }, 201);
      }
      return response({ success: true, contact: contact() }, 201);
    },
  });

  assert.equal(result.duplicateCandidates.length, 1);
  assert.equal(endpoints.some((endpoint) => /merge|link|users|conversations/.test(endpoint)), false);
});
