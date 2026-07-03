import test from "node:test";
import assert from "node:assert/strict";

import {
  compactScopedContactRecord,
  getProfileContactStoreKey,
  readProfileScopedContacts,
  upsertProfileScopedContact,
} from "../src/utils/accountProfileScope.js";

function createMemoryStorage(initial = {}) {
  const entries = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return entries.has(key) ? entries.get(key) : null;
    },
    setItem(key, value) {
      entries.set(key, String(value));
    },
    removeItem(key) {
      entries.delete(key);
    },
  };
}

test("profile scoped contacts persist outside the shared login root", () => {
  const storage = createMemoryStorage();

  upsertProfileScopedContact(
    {
      id: "saved-contact-business-bgone-customer-ed",
      relationshipType: "customer",
      relationshipScope: "business",
      accountMode: "business",
      customerName: "Ed Customer",
      contactImported: true,
      savedToContacts: true,
      contactProfileScopeKey: "business:bgone",
    },
    { storage, profileScopeKey: "business:bgone" }
  );
  upsertProfileScopedContact(
    {
      id: "saved-contact-personal-william-professional-bgone",
      relationshipType: "professional",
      relationshipScope: "personal",
      accountMode: "personal",
      professionalName: "Bgone Home Renovation",
      contactImported: true,
      savedToContacts: true,
      contactProfileScopeKey: "personal:william",
    },
    { storage, profileScopeKey: "personal:william" }
  );

  const businessContacts = readProfileScopedContacts({
    storage,
    profileScopeKey: "business:bgone",
  });
  const personalContacts = readProfileScopedContacts({
    storage,
    profileScopeKey: "personal:william",
  });

  assert.equal(businessContacts.length, 1);
  assert.equal(businessContacts[0].customerName, "Ed Customer");
  assert.equal(personalContacts.length, 1);
  assert.equal(personalContacts[0].professionalName, "Bgone Home Renovation");
  assert.equal(storage.getItem(getProfileContactStoreKey("business:bgone")).includes("Ed Customer"), true);
});

test("compact scoped contact record avoids duplicating oversized image data", () => {
  const hugeDataImage = `data:image/png;base64,${"a".repeat(4096)}`;
  const compact = compactScopedContactRecord({
    id: "saved-contact-business-bgone-customer-ed",
    relationshipType: "customer",
    customerName: "Ed Customer",
    participantAvatar: hugeDataImage,
    profilePhoto: hugeDataImage,
    contactPhoto: hugeDataImage,
    savedToContacts: true,
  });

  assert.equal(compact.participantAvatar, "");
  assert.equal(compact.profilePhoto, "");
  assert.equal(compact.contactPhoto, "");
  assert.equal(compact.customerName, "Ed Customer");
  assert.equal(compact.savedToContacts, true);
});
