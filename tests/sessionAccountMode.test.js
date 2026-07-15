import test from "node:test";
import assert from "node:assert/strict";
import {
  getAccountModeForPage,
  getDashboardPageForAccountMode,
  getExplicitBusinessProfileOwnership,
  hasBusinessProfileOwnership,
  isProfessionalSession,
  restoreAuthenticatedSessionFromStorage,
  saveMeetroSession,
  setActiveAccountMode,
  syncAccountModeForPage,
} from "../src/utils/session.js";

function installStorage() {
  const store = new Map();

  global.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };

  global.window = {
    dispatchEvent: () => true,
  };
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };

  return store;
}

test("professional can switch to User Account mode without losing professional capability", () => {
  installStorage();
  localStorage.setItem("isProfessional", "true");
  localStorage.setItem("accountType", "professional");
  localStorage.setItem("userRole", "handyman");
  localStorage.setItem("businessCategory", "handyman");
  localStorage.setItem("activeAccountMode", "business");
  localStorage.setItem("meetroWorkCenterTab", "active");

  assert.equal(setActiveAccountMode("personal"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "personal");
  assert.equal(localStorage.getItem("accountType"), "homeowner");
  assert.equal(localStorage.getItem("userRole"), "homeowner");
  assert.equal(localStorage.getItem("meetroWorkCenterTab"), null);
  assert.equal(isProfessionalSession(), true);
});

test("professional can switch back to business mode after User Account mode", () => {
  installStorage();
  localStorage.setItem("isProfessional", "true");
  localStorage.setItem("accountType", "homeowner");
  localStorage.setItem("userRole", "homeowner");
  localStorage.setItem("businessCategory", "handyman");
  localStorage.setItem("activeAccountMode", "personal");

  assert.equal(setActiveAccountMode("business"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "business");
  assert.equal(localStorage.getItem("accountType"), "professional");
  assert.equal(localStorage.getItem("userRole"), "handyman");
});

test("dashboard route follows active account mode instead of professional capability", () => {
  installStorage();
  localStorage.setItem("isProfessional", "true");
  localStorage.setItem("accountType", "homeowner");
  localStorage.setItem("activeAccountMode", "personal");

  assert.equal(isProfessionalSession(), true);
  assert.equal(getDashboardPageForAccountMode(), "home");
  assert.equal(getDashboardPageForAccountMode("personal"), "home");
  assert.equal(getDashboardPageForAccountMode("business"), "businessDashboard");
});

test("business profile ownership stays separate from current personal mode", () => {
  installStorage();
  localStorage.setItem("activeAccountMode", "personal");
  localStorage.setItem("accountType", "homeowner");
  localStorage.setItem(
    "contractorProfile",
    JSON.stringify({
      id: "business-1",
      business_name: "Bgone Home Renovation",
      category: "handyman",
    })
  );

  assert.equal(hasBusinessProfileOwnership(), true);
  assert.equal(isProfessionalSession(), true);
  assert.equal(setActiveAccountMode("business"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "business");
});

test("authenticated professional session repairs business route mode after reload", () => {
  installStorage();
  localStorage.setItem("token", "token-123");
  localStorage.setItem(
    "user",
    JSON.stringify({
      id: "user-1",
      email: "william@example.com",
      role: "homeowner",
      account_type: "homeowner",
    })
  );
  localStorage.setItem("activeAccountMode", "personal");
  localStorage.setItem("accountType", "homeowner");
  localStorage.setItem("userRole", "homeowner");
  localStorage.setItem(
    "contractorProfile",
    JSON.stringify({
      id: "business-1",
      business_name: "Bgone Home Renovation",
      category: "handyman",
    })
  );

  const restored = restoreAuthenticatedSessionFromStorage("businessDashboard");

  assert.equal(restored.authenticated, true);
  assert.equal(restored.repaired, true);
  assert.equal(restored.isProfessional, true);
  assert.equal(localStorage.getItem("activeAccountMode"), "business");
  assert.equal(localStorage.getItem("accountType"), "professional");
  assert.equal(localStorage.getItem("isProfessional"), "true");
  assert.equal(localStorage.getItem("hasBusinessProfile"), "true");
  assert.equal(localStorage.getItem("contractorProfileComplete"), "true");
  assert.equal(isProfessionalSession(), true);
});

test("session repair preserves personal mode on personal routes", () => {
  installStorage();
  localStorage.setItem("token", "token-123");
  localStorage.setItem("activeAccountMode", "personal");
  localStorage.setItem("accountType", "homeowner");
  localStorage.setItem(
    "contractorProfile",
    JSON.stringify({
      id: "business-1",
      business_name: "Bgone Home Renovation",
      category: "handyman",
    })
  );

  const restored = restoreAuthenticatedSessionFromStorage("home");

  assert.equal(restored.authenticated, true);
  assert.equal(restored.isProfessional, true);
  assert.equal(localStorage.getItem("activeAccountMode"), "personal");
  assert.equal(localStorage.getItem("accountType"), "homeowner");
  assert.equal(localStorage.getItem("isProfessional"), "true");
});

test("Discover preserves business account mode for professional users", () => {
  installStorage();
  localStorage.setItem("isProfessional", "true");
  localStorage.setItem("accountType", "professional");
  localStorage.setItem("userRole", "handyman");
  localStorage.setItem("businessCategory", "handyman");
  localStorage.setItem("activeAccountMode", "business");

  assert.equal(getAccountModeForPage("discover", "business"), "business");
  assert.equal(syncAccountModeForPage("discover"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "business");
  assert.equal(localStorage.getItem("accountType"), "professional");
  assert.equal(localStorage.getItem("userRole"), "handyman");
});

test("Discover preserves personal account mode for standard users", () => {
  installStorage();
  localStorage.setItem("accountType", "homeowner");
  localStorage.setItem("userRole", "homeowner");
  localStorage.setItem("activeAccountMode", "personal");

  assert.equal(getAccountModeForPage("discover", "personal"), "personal");
  assert.equal(syncAccountModeForPage("discover"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "personal");
  assert.equal(localStorage.getItem("accountType"), "homeowner");
  assert.equal(localStorage.getItem("userRole"), "homeowner");
});

test("a personal backend session does not inherit browser-only business profile authority", () => {
  installStorage();
  localStorage.setItem("activeAccountMode", "personal");
  localStorage.setItem(
    "contractorProfile",
    JSON.stringify({
      id: "business-1",
      business_name: "Bgone Home Renovation",
      category: "handyman",
    })
  );

  const session = saveMeetroSession({
    token: "token-123",
    user: {
      id: "user-1",
      email: "william@example.com",
      role: "homeowner",
      account_type: "homeowner",
    },
  });

  assert.equal(session.isProfessional, false);
  assert.equal(localStorage.getItem("hasBusinessProfile"), "false");
  assert.equal(localStorage.getItem("contractorProfileComplete"), "false");
  assert.equal(localStorage.getItem("businessName"), "");
  assert.equal(localStorage.getItem("businessCategory"), "");
  assert.equal(localStorage.getItem("contractorProfile"), null);
  assert.equal(setActiveAccountMode("business"), false);
});

test("explicit backend business ownership restores the canonical professional session", () => {
  installStorage();
  localStorage.setItem("businessName", "Stale Browser Business");
  localStorage.setItem("businessCategory", "stale-category");
  localStorage.setItem("hasBusinessProfile", "false");

  const user = {
    id: "user-1",
    email: "william@example.com",
    role: "professional",
    account_type: "professional",
    contractor_profile_id: "profile-42",
    has_business_profile: true,
    business_name: "Bgone Home Renovation & Handyman Services",
    business_category: "handyman",
  };
  const session = saveMeetroSession({ token: "token-123", user });

  assert.equal(getExplicitBusinessProfileOwnership(user), true);
  assert.equal(session.isProfessional, true);
  assert.equal(localStorage.getItem("hasBusinessProfile"), "true");
  assert.equal(localStorage.getItem("contractorProfileComplete"), "true");
  assert.equal(
    localStorage.getItem("businessName"),
    "Bgone Home Renovation & Handyman Services"
  );
  assert.equal(localStorage.getItem("businessCategory"), "handyman");
});

test("explicit missing backend profile cannot be overridden by stale browser identity", () => {
  installStorage();
  localStorage.setItem("businessName", "Stale Browser Business");
  localStorage.setItem("businessCategory", "handyman");
  localStorage.setItem(
    "contractorProfile",
    JSON.stringify({ id: "stale-profile", business_name: "Stale Browser Business" })
  );

  const user = {
    id: "user-2",
    email: "new@example.com",
    role: "professional",
    account_type: "professional",
    contractor_profile_id: null,
    has_business_profile: false,
    business_name: null,
    business_category: null,
  };
  saveMeetroSession({ token: "token-456", user });

  assert.equal(getExplicitBusinessProfileOwnership(user), false);
  assert.equal(hasBusinessProfileOwnership(user), false);
  assert.equal(localStorage.getItem("hasBusinessProfile"), "false");
  assert.equal(localStorage.getItem("contractorProfileComplete"), "false");
  assert.equal(localStorage.getItem("businessName"), "");
  assert.equal(localStorage.getItem("businessCategory"), "");
  assert.equal(localStorage.getItem("contractorProfile"), null);
});

test("switching authenticated accounts purges unscoped workflow records and preserves safe preferences", () => {
  installStorage();
  localStorage.setItem("meetroLastAccountIdentity", "id:account-a");
  localStorage.setItem("userId", "account-a");
  localStorage.setItem("homeownerRequests", '[{"id":"account-a-request"}]');
  localStorage.setItem("meetro_business_schedule", '[{"id":"account-a-visit"}]');
  localStorage.setItem("meetro_conversation_account-a", '[{"text":"private"}]');
  localStorage.setItem("meetroTimelineMoments", '[{"id":"account-a-moment"}]');
  localStorage.setItem(
    "meetroProfessionalProfileDraft",
    '{"businessName":"Account A Business","contactName":"Account A Owner"}'
  );
  localStorage.setItem("businessContactName", "Account A Owner");
  localStorage.setItem("businessPhone", "1111111111");
  localStorage.setItem("businessEmail", "account-a@example.com");
  localStorage.setItem("language", "fr");
  localStorage.setItem("meetroCommunityDiscoveryInterests", '["creative"]');

  saveMeetroSession({
    token: "account-b-token",
    user: {
      id: "account-b",
      email: "account-b@example.com",
      role: "homeowner",
      account_type: "homeowner",
      has_business_profile: false,
      contractor_profile_id: null,
    },
  });

  assert.equal(localStorage.getItem("homeownerRequests"), null);
  assert.equal(localStorage.getItem("meetro_business_schedule"), null);
  assert.equal(localStorage.getItem("meetro_conversation_account-a"), null);
  assert.equal(localStorage.getItem("meetroTimelineMoments"), null);
  assert.equal(localStorage.getItem("meetroProfessionalProfileDraft"), null);
  assert.equal(localStorage.getItem("businessContactName"), null);
  assert.equal(localStorage.getItem("businessPhone"), null);
  assert.equal(localStorage.getItem("businessEmail"), null);
  assert.equal(localStorage.getItem("userId"), "account-b");
  assert.equal(localStorage.getItem("token"), "account-b-token");
  assert.equal(localStorage.getItem("meetroLastAccountIdentity"), "id:account-b");
  assert.equal(localStorage.getItem("language"), "fr");
  assert.equal(localStorage.getItem("meetroCommunityDiscoveryInterests"), '["creative"]');
});

test("startup replaces stale business identity with the authenticated backend user", () => {
  installStorage();
  localStorage.setItem("token", "account-b-token");
  localStorage.setItem(
    "user",
    JSON.stringify({
      id: "account-b",
      email: "account-b@example.com",
      account_type: "professional",
      business_name: "Account B Business",
      has_business_profile: false,
    })
  );
  localStorage.setItem("userId", "account-b");
  localStorage.setItem("businessName", "Account A Business");
  localStorage.setItem("businessCategory", "account-a-category");
  localStorage.setItem("hasBusinessProfile", "true");
  localStorage.setItem("contractorProfileComplete", "true");
  localStorage.setItem(
    "contractorProfile",
    JSON.stringify({ id: "profile-a", business_name: "Account A Business" })
  );

  const restored = restoreAuthenticatedSessionFromStorage("professionalOnboarding");

  assert.equal(restored.authenticated, true);
  assert.equal(restored.repaired, true);
  assert.equal(localStorage.getItem("businessName"), "Account B Business");
  assert.equal(localStorage.getItem("businessCategory"), "");
  assert.equal(localStorage.getItem("hasBusinessProfile"), "false");
  assert.equal(localStorage.getItem("contractorProfileComplete"), "false");
  assert.equal(localStorage.getItem("contractorProfile"), null);
});
