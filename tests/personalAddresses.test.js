import test from "node:test";
import assert from "node:assert/strict";
import {
  createPersonalAddress,
  deletePersonalAddress,
  formatPersonalAddress,
  getPersonalAddressStorageKey,
  projectPersonalAddressPrefill,
  readPersonalAddresses,
  resolveWorkflowAddress,
  setDefaultPersonalAddress,
  updatePersonalAddress,
} from "../src/utils/personalAddresses.js";

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

const home = { label: "home", street1: "1 Main St", city: "Cape Coral", state: "FL", postalCode: "33904", country: "US" };
const work = { label: "work", street1: "2 Work Ave", city: "Fort Myers", state: "FL", postalCode: "33901", country: "US" };

test("personal addresses enforce deterministic default and stable identity invariants", () => {
  const store = storage({ userId: "user-1" });
  let records = createPersonalAddress(home, { storage: store, idFactory: () => "home-1", now: "2026-01-01" });
  assert.equal(records[0].isDefault, true);
  records = createPersonalAddress(work, { storage: store, idFactory: () => "work-1", now: "2026-01-02" });
  assert.equal(records.filter((item) => item.isDefault).length, 1);
  records = setDefaultPersonalAddress("work-1", { storage: store });
  assert.equal(records.find((item) => item.id === "work-1").isDefault, true);
  records = updatePersonalAddress("work-1", { city: "Naples" }, { storage: store, now: "2026-01-03" });
  assert.equal(records.find((item) => item.id === "work-1").id, "work-1");
  assert.equal(records.find((item) => item.id === "work-1").isDefault, true);
  assert.equal(records.length, 2);
});

test("deletion preserves or deterministically promotes the default", () => {
  const store = storage({ userId: "user-1" });
  createPersonalAddress(home, { storage: store, idFactory: () => "home-1", now: "2026-01-01" });
  createPersonalAddress(work, { storage: store, idFactory: () => "work-1", now: "2026-01-02" });
  let records = deletePersonalAddress("work-1", { storage: store });
  assert.equal(records[0].id, "home-1");
  assert.equal(records[0].isDefault, true);
  createPersonalAddress(work, { storage: store, idFactory: () => "work-1", now: "2026-01-02" });
  records = deletePersonalAddress("home-1", { storage: store });
  assert.equal(records[0].id, "work-1");
  assert.equal(records[0].isDefault, true);
  assert.deepEqual(deletePersonalAddress("work-1", { storage: store }), []);
});

test("addresses are scoped by authenticated identity and isolated from business address keys", () => {
  const store = storage({ userId: "user-a", userName: "Same Name", businessAddress: "Business-only" });
  createPersonalAddress(home, { storage: store, idFactory: () => "a-1" });
  store.setItem("userId", "user-b");
  store.setItem("userName", "Same Name");
  assert.deepEqual(readPersonalAddresses({ storage: store }), []);
  createPersonalAddress(work, { storage: store, idFactory: () => "b-1" });
  store.setItem("activeAccountMode", "business");
  assert.equal(readPersonalAddresses({ storage: store })[0].id, "b-1");
  assert.equal(store.getItem("businessAddress"), "Business-only");
  store.setItem("userId", "user-a");
  assert.equal(readPersonalAddresses({ storage: store })[0].id, "a-1");
  assert.notEqual(getPersonalAddressStorageKey({ storage: store }), "businessAddress");
});

test("legacy personal address projection is readable, idempotent, and owner scoped", () => {
  const store = storage({ userId: "legacy-user", primaryPropertyAddress: "9 Legacy Rd", userCity: "Miami", userState: "FL", userPostalCode: "33101" });
  const first = readPersonalAddresses({ storage: store, now: "2026-01-01T00:00:00.000Z" });
  const second = readPersonalAddresses({ storage: store, now: "2099-12-31T23:59:59.999Z" });
  assert.equal(first.length, 1);
  assert.deepEqual(second, first);
  assert.deepEqual(
    JSON.parse(store.getItem(getPersonalAddressStorageKey({ storage: store }))),
    first
  );
  store.setItem("userId", "another-user");
  assert.deepEqual(readPersonalAddresses({ storage: store }), []);
  assert.equal(store.getItem("primaryPropertyAddress"), "9 Legacy Rd");
});

test("legacy arrays receive stable compatibility IDs without duplicate promotion", () => {
  const legacy = { address: "11 Old St", city: "Orlando", state: "FL", zip: "32801", country: "US" };
  const store = storage({ userId: "legacy-user", meetroSavedAddresses: JSON.stringify([legacy]), savedAddresses: JSON.stringify([legacy]) });
  const first = readPersonalAddresses({ storage: store });
  const second = readPersonalAddresses({ storage: store });
  assert.equal(first.length, 1);
  assert.equal(first[0].id, second[0].id);
});

test("workflow prefill never overrides stronger workflow-owned addresses", () => {
  assert.equal(resolveWorkflowAddress({ explicitAddress: "Typed", selectedPropertyAddress: "Property", personalAddress: home }), "Typed");
  assert.equal(resolveWorkflowAddress({ selectedPropertyAddress: "Property", personalAddress: home }), "Property");
  assert.equal(resolveWorkflowAddress({ projectAddress: "Project", personalAddress: home }), "Project");
  assert.equal(resolveWorkflowAddress({ requestAddress: "Request", personalAddress: home }), "Request");
  assert.equal(resolveWorkflowAddress({ visitAddress: "Visit", personalAddress: home }), "Visit");
  assert.equal(resolveWorkflowAddress({ personalAddress: home }), formatPersonalAddress(home));
  assert.equal(projectPersonalAddressPrefill(home).addressId, undefined);
});

test("helpers reject incomplete data, tolerate malformed storage, and do not mutate input", () => {
  const store = storage({ userId: "user-1" });
  store.setItem(getPersonalAddressStorageKey({ storage: store }), "not-json");
  assert.deepEqual(readPersonalAddresses({ storage: store }), []);
  const original = { ...home };
  createPersonalAddress(original, { storage: store, idFactory: () => "home-1" });
  assert.deepEqual(original, home);
  assert.equal(createPersonalAddress({ city: "Miami" }, { storage: store }).length, 1);
});
