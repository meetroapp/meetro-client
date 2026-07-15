import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LEGACY_PROFESSIONAL_ONBOARDING_KEYS,
  getOwnedProfessionalProfile,
  getProfessionalOnboardingAccount,
  getProfessionalOnboardingKeys,
  purgeLegacyProfessionalOnboardingStorage,
  readProfessionalOnboardingState,
  writeProfessionalOnboardingState,
} from "../src/utils/professionalOnboardingStorage.js";

function createStorage(entries = {}) {
  const store = new Map(
    Object.entries(entries).map(([key, value]) => [key, String(value)])
  );
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
    snapshot: () => Object.fromEntries(store),
  };
}

function installUser(storage, user) {
  storage.setItem("user", JSON.stringify(user));
  storage.setItem("userId", user.id);
  storage.setItem("meetroLastAccountIdentity", `id:${user.id}`);
}

test("a new professional ignores another account's unscoped onboarding identity", () => {
  const storage = createStorage({
    meetroProfessionalProfileDraft: JSON.stringify({
      businessName: "Bgone Home Renovation & Handyman Services",
      contactName: "William Molina",
      phone: "23973848554",
      email: "ewmx04@gmail.com",
    }),
    businessName: "Bgone Home Renovation & Handyman Services",
    businessContactName: "William Molina",
    businessPhone: "23973848554",
    businessEmail: "ewmx04@gmail.com",
  });
  installUser(storage, {
    id: "user-b",
    email: "flexdistributionllc@gmail.com",
    username: "Flex Owner",
    business_name: "Flex Distribution LLC",
    account_type: "professional",
  });

  const state = readProfessionalOnboardingState({ storage });

  assert.equal(state.ready, true);
  assert.equal(state.draft.businessName, "Flex Distribution LLC");
  assert.equal(state.draft.contactName, "Flex Owner");
  assert.equal(state.draft.phone, "");
  assert.equal(state.draft.email, "flexdistributionllc@gmail.com");
  assert.doesNotMatch(JSON.stringify(state.draft), /Bgone|William Molina|23973848554|ewmx04/);
});

test("onboarding drafts are scoped by canonical backend user id", () => {
  const storage = createStorage();
  installUser(storage, {
    id: "user-a",
    email: "owner-a@example.test",
    business_name: "Business A",
  });
  const accountAKeys = getProfessionalOnboardingKeys("user-a");
  const accountBKeys = getProfessionalOnboardingKeys("user-b");

  assert.equal(
    writeProfessionalOnboardingState(
      { draft: { businessName: "Account A Draft" }, step: 2 },
      storage
    ),
    true
  );
  installUser(storage, {
    id: "user-b",
    email: "owner-b@example.test",
    business_name: "Business B",
  });

  const accountBState = readProfessionalOnboardingState({ storage });
  assert.equal(accountBState.draft.businessName, "Business B");
  assert.equal(storage.getItem(accountBKeys.draft), null);
  assert.match(storage.getItem(accountAKeys.draft), /Account A Draft/);

  writeProfessionalOnboardingState(
    { draft: { businessName: "Account B Draft" }, step: 3 },
    storage
  );
  assert.match(storage.getItem(accountBKeys.draft), /Account B Draft/);
  assert.doesNotMatch(storage.getItem(accountAKeys.draft), /Account B Draft/);
});

test("only a contractor profile owned by the authenticated user can initialize setup", () => {
  const storage = createStorage();
  installUser(storage, {
    id: "user-b",
    email: "owner-b@example.test",
    business_name: "Business B",
  });
  const account = getProfessionalOnboardingAccount(storage);
  const profileA = {
    id: "profile-a",
    user_id: "user-a",
    business_name: "Business A",
    phone: "1111111111",
  };
  const profileB = {
    id: "profile-b",
    user_id: "user-b",
    business_name: "Business B Profile",
    phone: "2222222222",
  };

  assert.equal(getOwnedProfessionalProfile(profileA, account), null);
  assert.equal(getOwnedProfessionalProfile(profileB, account), profileB);
  assert.equal(
    readProfessionalOnboardingState({ storage, ownedProfile: profileA }).draft.phone,
    ""
  );
  assert.equal(
    readProfessionalOnboardingState({ storage, ownedProfile: profileB }).draft.phone,
    "2222222222"
  );
});

test("identity mismatch fails closed before setup fields initialize", () => {
  const storage = createStorage({
    user: JSON.stringify({ id: "user-b", email: "owner-b@example.test" }),
    userId: "user-a",
    meetroLastAccountIdentity: "id:user-a",
    businessName: "Business A",
  });

  const state = readProfessionalOnboardingState({ storage });
  assert.equal(state.ready, false);
  assert.equal(state.draft.businessName, "");
  assert.equal(writeProfessionalOnboardingState({ draft: {}, step: 1 }, storage), false);
});

test("account cleanup removes unscoped onboarding identity but preserves scoped drafts", () => {
  const accountAKeys = getProfessionalOnboardingKeys("user-a");
  const storage = createStorage({
    language: "es",
    meetroDiscoveryInterests: "marketing",
    meetroProfessionalProfileDraft: JSON.stringify({ businessName: "Legacy" }),
    businessContactName: "Legacy Owner",
    businessPhone: "1111111111",
    [accountAKeys.draft]: JSON.stringify({ businessName: "Account A Draft" }),
  });

  const removed = purgeLegacyProfessionalOnboardingStorage(storage);

  assert.deepEqual(removed, [...LEGACY_PROFESSIONAL_ONBOARDING_KEYS]);
  assert.equal(storage.getItem("meetroProfessionalProfileDraft"), null);
  assert.equal(storage.getItem("businessContactName"), null);
  assert.equal(storage.getItem("businessPhone"), null);
  assert.match(storage.getItem(accountAKeys.draft), /Account A Draft/);
  assert.equal(storage.getItem("language"), "es");
  assert.equal(storage.getItem("meetroDiscoveryInterests"), "marketing");
});

test("Professional Onboarding reconciles only the authenticated owned profile", () => {
  const source = readFileSync("src/pages/ProfessionalOnboarding.jsx", "utf8");

  assert.match(source, /readProfessionalOnboardingState/);
  assert.match(source, /\/my-contractor-profile/);
  assert.match(source, /nextState\.account\.identity === accountIdentity/);
  assert.match(source, /skipAuthExpirationHandling: true/);
  assert.doesNotMatch(source, /readStorageValue\("businessContactName"\)/);
  assert.doesNotMatch(source, /readStorageValue\("businessPhone"\)/);
  assert.doesNotMatch(source, /readStorageValue\("businessEmail"\)/);
  assert.doesNotMatch(source, /readJson\(PROFILE_DRAFT_KEY/);
});
