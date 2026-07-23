import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { clearMeetroSession } from "../src/utils/authFetch.js";
import {
  getAccountModeForPage,
  getDashboardPageForAccountMode,
  restoreAuthenticatedSessionFromStorage,
  saveMeetroSession,
  setActiveAccountMode,
  syncAccountModeForPage,
} from "../src/utils/session.js";
import {
  BUSINESS_ACCOUNT_MODE,
  LEGACY_ACCOUNT_MODE_PREFERENCE_KEY,
  PERSONAL_ACCOUNT_MODE,
  getAccountModePreferenceStorageKey,
  readIdentityScopedAccountModePreference,
  readSameIdentityLegacyAccountModePreference,
  resolveSessionAccountMode,
  writeIdentityScopedAccountModePreference,
} from "../src/utils/sessionAccountMode.js";

function installStorage(initial = {}) {
  const store = new Map(
    Object.entries(initial).map(([key, value]) => [key, String(value)])
  );

  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  globalThis.window = {
    dispatchEvent: () => true,
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };

  return store;
}

function homeownerUser(id = "homeowner-1") {
  return {
    id,
    email: `${id}@example.com`,
    role: "homeowner",
    account_type: "homeowner",
    has_business_profile: false,
    contractor_profile_id: null,
  };
}

function professionalUser(id = "professional-1") {
  return {
    id,
    email: `${id}@example.com`,
    role: "handyman",
    account_type: "professional",
    business_category: "handyman",
    has_business_profile: true,
    contractor_profile_id: `profile-${id}`,
  };
}

function scopedPreference(identity, mode) {
  return { identity, mode };
}

test("pure homeowner without a preference resolves personal", () => {
  assert.equal(
    resolveSessionAccountMode({
      authenticatedIdentity: "id:homeowner-1",
    }).finalMode,
    PERSONAL_ACCOUNT_MODE
  );
});

test("pure homeowner personal preference remains personal", () => {
  const result = resolveSessionAccountMode({
    authenticatedIdentity: "id:homeowner-1",
    storedPreference: scopedPreference("id:homeowner-1", "personal"),
  });

  assert.equal(result.finalMode, PERSONAL_ACCOUNT_MODE);
  assert.equal(result.preferenceAccepted, false);
});

test("pure homeowner stale business preference remains personal", () => {
  assert.equal(
    resolveSessionAccountMode({
      authenticatedIdentity: "id:homeowner-1",
      storedPreference: scopedPreference("id:homeowner-1", "business"),
    }).finalMode,
    PERSONAL_ACCOUNT_MODE
  );
});

test("pure homeowner malformed preference remains personal", () => {
  assert.equal(
    resolveSessionAccountMode({
      authenticatedIdentity: "id:homeowner-1",
      storedPreference: "business",
    }).finalMode,
    PERSONAL_ACCOUNT_MODE
  );
});

test("professional without a preference defaults business", () => {
  assert.equal(
    resolveSessionAccountMode({
      authenticatedIdentity: "id:professional-1",
      hasProfessionalCapability: true,
    }).finalMode,
    BUSINESS_ACCOUNT_MODE
  );
});

test("professional accepts same-identity personal preference", () => {
  const result = resolveSessionAccountMode({
    authenticatedIdentity: "id:professional-1",
    hasProfessionalCapability: true,
    storedPreference: scopedPreference("id:professional-1", "personal"),
  });

  assert.equal(result.finalMode, PERSONAL_ACCOUNT_MODE);
  assert.equal(result.preferenceAccepted, true);
});

test("professional accepts same-identity business preference", () => {
  const result = resolveSessionAccountMode({
    authenticatedIdentity: "id:professional-1",
    hasProfessionalCapability: true,
    storedPreference: scopedPreference("id:professional-1", "business"),
  });

  assert.equal(result.finalMode, BUSINESS_ACCOUNT_MODE);
  assert.equal(result.preferenceAccepted, true);
});

test("professional ignores malformed and unsupported preferences", () => {
  for (const storedPreference of [
    null,
    {},
    { identity: "id:professional-1" },
    { identity: "id:professional-1", mode: "contractor" },
    { identity: "", mode: "personal" },
  ]) {
    assert.equal(
      resolveSessionAccountMode({
        authenticatedIdentity: "id:professional-1",
        hasProfessionalCapability: true,
        storedPreference,
      }).finalMode,
      BUSINESS_ACCOUNT_MODE
    );
  }
});

test("owned business profile capability defaults business consistently", () => {
  assert.equal(
    resolveSessionAccountMode({
      authenticatedIdentity: "id:dual-1",
      hasBusinessProfileCapability: true,
    }).finalMode,
    BUSINESS_ACCOUNT_MODE
  );
});

test("other-user preference is ignored", () => {
  const result = resolveSessionAccountMode({
    authenticatedIdentity: "id:user-b",
    hasProfessionalCapability: true,
    storedPreference: scopedPreference("id:user-a", "personal"),
  });

  assert.equal(result.finalMode, BUSINESS_ACCOUNT_MODE);
  assert.equal(result.preferenceAccepted, false);
});

test("missing authenticated identity cannot accept a preference", () => {
  const result = resolveSessionAccountMode({
    hasProfessionalCapability: true,
    storedPreference: scopedPreference("id:professional-1", "personal"),
  });

  assert.equal(result.finalMode, BUSINESS_ACCOUNT_MODE);
  assert.equal(result.preferenceAccepted, false);
});

test("resolver returns only supported modes across capability combinations", () => {
  const outputs = [];
  for (const hasProfessionalCapability of [false, true]) {
    for (const hasBusinessProfileCapability of [false, true]) {
      for (const mode of [undefined, "personal", "business", "invalid"]) {
        outputs.push(
          resolveSessionAccountMode({
            authenticatedIdentity: "id:user-1",
            hasProfessionalCapability,
            hasBusinessProfileCapability,
            storedPreference: mode
              ? scopedPreference("id:user-1", mode)
              : null,
          }).finalMode
        );
      }
    }
  }

  assert.equal(
    outputs.every((mode) => ["personal", "business"].includes(mode)),
    true
  );
});

test("pure resolver does not mutate its preference input", () => {
  const preference = Object.freeze(
    scopedPreference("id:professional-1", "personal")
  );
  const before = JSON.stringify(preference);

  resolveSessionAccountMode({
    authenticatedIdentity: "id:professional-1",
    hasProfessionalCapability: true,
    storedPreference: preference,
  });

  assert.equal(JSON.stringify(preference), before);
});

test("identity-scoped preference storage rejects malformed records", () => {
  installStorage({
    [getAccountModePreferenceStorageKey("id:user-1")]: "{bad-json",
  });

  assert.equal(
    readIdentityScopedAccountModePreference(localStorage, "id:user-1"),
    null
  );
});

test("identity-scoped preference storage reads only the matching identity", () => {
  installStorage();
  assert.equal(
    writeIdentityScopedAccountModePreference(
      localStorage,
      "id:user-1",
      "personal"
    ),
    true
  );
  assert.deepEqual(
    readIdentityScopedAccountModePreference(localStorage, "id:user-1"),
    scopedPreference("id:user-1", "personal")
  );
  assert.equal(
    readIdentityScopedAccountModePreference(localStorage, "id:user-2"),
    null
  );
});

test("preference storage rejects missing identity and invalid mode", () => {
  installStorage();

  assert.equal(
    writeIdentityScopedAccountModePreference(localStorage, "", "personal"),
    false
  );
  assert.equal(
    writeIdentityScopedAccountModePreference(
      localStorage,
      "id:user-1",
      "invalid"
    ),
    false
  );
});

test("legacy preference is accepted only with same authenticated identity", () => {
  installStorage({ [LEGACY_ACCOUNT_MODE_PREFERENCE_KEY]: "personal" });

  assert.deepEqual(
    readSameIdentityLegacyAccountModePreference(
      localStorage,
      "id:user-1",
      "id:user-1"
    ),
    scopedPreference("id:user-1", "personal")
  );
  assert.equal(
    readSameIdentityLegacyAccountModePreference(
      localStorage,
      "id:user-2",
      "id:user-1"
    ),
    null
  );
});

test("saveMeetroSession returns and persists professional personal mode", () => {
  installStorage({
    meetroLastAccountIdentity: "id:professional-1",
    [getAccountModePreferenceStorageKey("id:professional-1")]: JSON.stringify(
      scopedPreference("id:professional-1", "personal")
    ),
  });

  const result = saveMeetroSession({
    token: "token-1",
    user: professionalUser(),
  });

  assert.equal(result.finalMode, PERSONAL_ACCOUNT_MODE);
  assert.equal(result.preferenceAccepted, true);
  assert.equal(localStorage.getItem("activeAccountMode"), "personal");
});

test("saveMeetroSession returns and persists professional business mode", () => {
  installStorage({
    meetroLastAccountIdentity: "id:professional-1",
    [getAccountModePreferenceStorageKey("id:professional-1")]: JSON.stringify(
      scopedPreference("id:professional-1", "business")
    ),
  });

  const result = saveMeetroSession({
    token: "token-1",
    user: professionalUser(),
  });

  assert.equal(result.finalMode, BUSINESS_ACCOUNT_MODE);
  assert.equal(localStorage.getItem("activeAccountMode"), "business");
});

test("saveMeetroSession defaults a new professional to business", () => {
  installStorage();
  const result = saveMeetroSession({
    token: "token-1",
    user: professionalUser(),
  });

  assert.equal(result.finalMode, BUSINESS_ACCOUNT_MODE);
  assert.equal(localStorage.getItem("activeAccountMode"), "business");
});

test("saveMeetroSession keeps a homeowner personal despite stale business data", () => {
  installStorage({
    meetroLastAccountIdentity: "id:homeowner-1",
    [getAccountModePreferenceStorageKey("id:homeowner-1")]: JSON.stringify(
      scopedPreference("id:homeowner-1", "business")
    ),
    activeAccountMode: "business",
  });

  const result = saveMeetroSession({
    token: "token-1",
    user: homeownerUser(),
  });

  assert.equal(result.finalMode, PERSONAL_ACCOUNT_MODE);
  assert.equal(localStorage.getItem("activeAccountMode"), "personal");
});

test("different-account login cannot inherit another account preference", () => {
  installStorage({
    meetroLastAccountIdentity: "id:user-a",
    [getAccountModePreferenceStorageKey("id:user-a")]: JSON.stringify(
      scopedPreference("id:user-a", "personal")
    ),
    activeAccountMode: "personal",
  });

  const result = saveMeetroSession({
    token: "token-b",
    user: professionalUser("user-b"),
  });

  assert.equal(result.finalMode, BUSINESS_ACCOUNT_MODE);
  assert.equal(result.preferenceAccepted, false);
});

test("different-account login cannot inherit browser-only business capability", () => {
  installStorage({
    meetroLastAccountIdentity: "id:user-a",
    userId: "user-a",
    isProfessional: "true",
    hasBusinessProfile: "true",
    contractorProfileComplete: "true",
    businessName: "User A Business",
    businessCategory: "handyman",
    contractorProfile: JSON.stringify({
      id: "profile-user-a",
      business_name: "User A Business",
    }),
  });

  const result = saveMeetroSession({
    token: "token-b",
    user: {
      id: "user-b",
      email: "user-b@example.com",
      role: "homeowner",
      account_type: "homeowner",
    },
  });

  assert.equal(result.isProfessional, false);
  assert.equal(result.finalMode, PERSONAL_ACCOUNT_MODE);
  assert.equal(localStorage.getItem("hasBusinessProfile"), "false");
  assert.equal(localStorage.getItem("businessName"), "");
});

test("same-account relogin restores its valid preference", () => {
  installStorage({
    meetroLastAccountIdentity: "id:professional-1",
  });
  localStorage.setItem(
    getAccountModePreferenceStorageKey("id:professional-1"),
    JSON.stringify(scopedPreference("id:professional-1", "personal"))
  );

  const first = saveMeetroSession({
    token: "token-1",
    user: professionalUser(),
  });
  const second = saveMeetroSession({
    token: "token-2",
    user: professionalUser(),
  });

  assert.equal(first.finalMode, PERSONAL_ACCOUNT_MODE);
  assert.equal(second.finalMode, PERSONAL_ACCOUNT_MODE);
});

test("mode switch persists preference without changing capability fields", () => {
  installStorage({
    token: "token-1",
    user: JSON.stringify(professionalUser()),
    userId: "professional-1",
    userEmail: "professional-1@example.com",
    isProfessional: "true",
    accountType: "professional",
    userRole: "handyman",
    activeAccountMode: "business",
  });

  assert.equal(setActiveAccountMode("personal"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "personal");
  assert.equal(localStorage.getItem("accountType"), "professional");
  assert.equal(localStorage.getItem("userRole"), "handyman");
  assert.deepEqual(
    readIdentityScopedAccountModePreference(
      localStorage,
      "id:professional-1"
    ),
    scopedPreference("id:professional-1", "personal")
  );
});

test("pure homeowner cannot persist business mode", () => {
  installStorage({
    token: "token-1",
    user: JSON.stringify(homeownerUser()),
    userId: "homeowner-1",
    userEmail: "homeowner-1@example.com",
    isProfessional: "false",
    accountType: "homeowner",
    userRole: "homeowner",
    activeAccountMode: "personal",
  });

  assert.equal(setActiveAccountMode("business"), false);
  assert.equal(localStorage.getItem("activeAccountMode"), "personal");
  assert.equal(
    readIdentityScopedAccountModePreference(localStorage, "id:homeowner-1"),
    null
  );
});

test("route synchronization does not overwrite the durable preference", () => {
  installStorage({
    token: "token-1",
    user: JSON.stringify(professionalUser()),
    userId: "professional-1",
    userEmail: "professional-1@example.com",
    isProfessional: "true",
    accountType: "professional",
    userRole: "handyman",
    activeAccountMode: "personal",
  });
  writeIdentityScopedAccountModePreference(
    localStorage,
    "id:professional-1",
    "personal"
  );

  assert.equal(syncAccountModeForPage("businessDashboard"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "business");
  assert.deepEqual(
    readIdentityScopedAccountModePreference(
      localStorage,
      "id:professional-1"
    ),
    scopedPreference("id:professional-1", "personal")
  );
});

test("refresh restoration preserves professional personal preference", () => {
  installStorage({
    token: "token-1",
    user: JSON.stringify(professionalUser()),
    userId: "professional-1",
    userEmail: "professional-1@example.com",
    isProfessional: "true",
    accountType: "professional",
    userRole: "handyman",
    activeAccountMode: "business",
    [getAccountModePreferenceStorageKey("id:professional-1")]: JSON.stringify(
      scopedPreference("id:professional-1", "personal")
    ),
  });

  const restored = restoreAuthenticatedSessionFromStorage(
    "businessDashboard"
  );

  assert.equal(restored.finalMode, PERSONAL_ACCOUNT_MODE);
  assert.equal(localStorage.getItem("activeAccountMode"), "personal");
});

test("refresh restoration preserves professional business preference", () => {
  installStorage({
    token: "token-1",
    user: JSON.stringify(professionalUser()),
    userId: "professional-1",
    userEmail: "professional-1@example.com",
    isProfessional: "true",
    accountType: "professional",
    userRole: "handyman",
    activeAccountMode: "personal",
    [getAccountModePreferenceStorageKey("id:professional-1")]: JSON.stringify(
      scopedPreference("id:professional-1", "business")
    ),
  });

  const restored = restoreAuthenticatedSessionFromStorage("home");

  assert.equal(restored.finalMode, BUSINESS_ACCOUNT_MODE);
  assert.equal(localStorage.getItem("activeAccountMode"), "business");
});

test("refresh restoration defaults professional without preference to business", () => {
  installStorage({
    token: "token-1",
    user: JSON.stringify(professionalUser()),
    userId: "professional-1",
    userEmail: "professional-1@example.com",
    isProfessional: "true",
    accountType: "professional",
    userRole: "handyman",
    activeAccountMode: "personal",
  });

  assert.equal(
    restoreAuthenticatedSessionFromStorage("home").finalMode,
    BUSINESS_ACCOUNT_MODE
  );
});

test("refresh restoration keeps pure homeowner personal", () => {
  installStorage({
    token: "token-1",
    user: JSON.stringify(homeownerUser()),
    userId: "homeowner-1",
    userEmail: "homeowner-1@example.com",
    isProfessional: "false",
    accountType: "homeowner",
    userRole: "homeowner",
    activeAccountMode: "business",
  });

  assert.equal(
    restoreAuthenticatedSessionFromStorage("businessDashboard").finalMode,
    PERSONAL_ACCOUNT_MODE
  );
});

test("missing stored identity ignores preference and follows capability default", () => {
  installStorage({
    token: "token-1",
    user: JSON.stringify({
      role: "professional",
      account_type: "professional",
    }),
    activeAccountMode: "personal",
  });

  const restored = restoreAuthenticatedSessionFromStorage("home");
  assert.equal(restored.authenticated, true);
  assert.equal(restored.authenticatedIdentity, "");
  assert.equal(restored.finalMode, BUSINESS_ACCOUNT_MODE);
});

test("logout clears active session mode but preserves scoped preference", () => {
  installStorage({
    token: "token-1",
    user: JSON.stringify(professionalUser()),
    userId: "professional-1",
    activeAccountMode: "personal",
    [LEGACY_ACCOUNT_MODE_PREFERENCE_KEY]: "personal",
    [getAccountModePreferenceStorageKey("id:professional-1")]: JSON.stringify(
      scopedPreference("id:professional-1", "personal")
    ),
  });

  clearMeetroSession();

  assert.equal(localStorage.getItem("token"), null);
  assert.equal(localStorage.getItem("activeAccountMode"), null);
  assert.equal(localStorage.getItem(LEGACY_ACCOUNT_MODE_PREFERENCE_KEY), null);
  assert.deepEqual(
    readIdentityScopedAccountModePreference(
      localStorage,
      "id:professional-1"
    ),
    scopedPreference("id:professional-1", "personal")
  );
});

test("login source routes only from sessionResult.finalMode", () => {
  const source = fs.readFileSync("src/pages/Login.jsx", "utf8");
  const routeStart = source.indexOf("function routeUser");
  const routeEnd = source.indexOf("async function handleSubmit", routeStart);
  const routeBlock = source.slice(routeStart, routeEnd);

  assert.match(routeBlock, /sessionResult\.finalMode/);
  assert.match(routeBlock, /getDashboardPageForAccountMode/);
  assert.doesNotMatch(
    routeBlock,
    /isProfessional|hasBusinessProfile|account_type|role/
  );
});

test("App restoration routes from the resolved session mode", () => {
  const source = fs.readFileSync("src/App.jsx", "utf8");

  assert.match(source, /const resolvedMode = restoredSession\.finalMode/);
  assert.match(source, /if \(targetMode !== resolvedMode\)/);
  assert.match(source, /restoredSession\.finalMode === "business"/);
});

test("dashboard routing helper maps only resolved presentation mode", () => {
  installStorage();
  assert.equal(getDashboardPageForAccountMode("personal"), "home");
  assert.equal(
    getDashboardPageForAccountMode("business"),
    "businessDashboard"
  );
});

test("shared Communication Center routes preserve either resolved mode", () => {
  for (const page of ["messagesInbox", "conversationThread"]) {
    assert.equal(getAccountModeForPage(page, "personal"), "personal");
    assert.equal(getAccountModeForPage(page, "business"), "business");
  }
});

test("personal and business routes keep their presentation classification", () => {
  assert.equal(getAccountModeForPage("home", "business"), "personal");
  assert.equal(
    getAccountModeForPage("businessDashboard", "personal"),
    "business"
  );
});

test("existing mode-switch writers no longer persist the unscoped legacy key", () => {
  const profileSource = fs.readFileSync("src/pages/Profile.jsx", "utf8");
  const toolsSource = fs.readFileSync(
    "src/pages/BusinessCommandCenter.jsx",
    "utf8"
  );

  assert.doesNotMatch(profileSource, /setItem\("meetroPreferredAccountMode"/);
  assert.doesNotMatch(toolsSource, /setItem\("meetroPreferredAccountMode"/);
});

test("canonical messaging components remain independent of session resolver", () => {
  const inboxSource = fs.readFileSync("src/pages/MessagesInbox.jsx", "utf8");
  const threadSource = fs.readFileSync(
    "src/pages/ConversationThread.jsx",
    "utf8"
  );

  assert.doesNotMatch(inboxSource, /resolveSessionAccountMode/);
  assert.doesNotMatch(threadSource, /resolveSessionAccountMode/);
});
