import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";
import test from "node:test";

const scenarioRunner = String.raw`
import assert from "node:assert/strict";

const store = new Map();
let storageReads = 0;
let storageWrites = 0;
let removeObserver = null;
const dispatchedEvents = [];

function replaceStorage(initial = {}) {
  store.clear();
  Object.entries(initial).forEach(([key, value]) => {
    store.set(key, String(value));
  });
  storageReads = 0;
  storageWrites = 0;
}

globalThis.localStorage = {
  getItem(key) {
    storageReads += 1;
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    storageWrites += 1;
    store.set(key, String(value));
  },
  removeItem(key) {
    storageWrites += 1;
    removeObserver?.(key);
    store.delete(key);
  },
  key(index) {
    return Array.from(store.keys())[index] ?? null;
  },
  get length() {
    return store.size;
  },
};

globalThis.window = {
  location: { hash: "" },
  dispatchEvent(event) {
    dispatchedEvents.push(event);
    return true;
  },
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};
globalThis.Event = class Event {
  constructor(type) {
    this.type = type;
  }
};

const session = await import("./src/utils/session.js");
const auth = await import("./src/utils/authFetch.js");
const importStorageReads = storageReads;

function user(id, overrides = {}) {
  return {
    id,
    email: id ? id + "@example.com" : "fallback@example.com",
    role: "homeowner",
    account_type: "homeowner",
    has_business_profile: false,
    contractor_profile_id: null,
    ...overrides,
  };
}

function save(id, overrides = {}) {
  return session.saveMeetroSession({
    token: "fixture-token",
    user: user(id, overrides),
  });
}

function snapshot() {
  return session.getAuthenticatedIdentitySnapshot();
}

function assertMinimalSnapshot(value) {
  assert.deepEqual(
    Object.keys(value).sort(),
    ["sessionGeneration", "status", "userId"]
  );
  assert.equal(Object.isFrozen(value), true);
  [
    "token",
    "refreshToken",
    "email",
    "role",
    "accountType",
    "password",
    "verificationCode",
    "user",
    "session",
  ].forEach((field) => assert.equal(field in value, false));
}

const scenarios = {
  "account-switch"() {
    const seen = [];
    const unsubscribe = session.subscribeAuthenticatedIdentity((value) => {
      seen.push([value.status, value.userId, value.sessionGeneration]);
    });
    save("user-a");
    const first = snapshot();
    save("user-b");
    const second = snapshot();
    unsubscribe();

    assert.equal(first.sessionGeneration, 1);
    assert.equal(second.sessionGeneration, 2);
    assert.notEqual(second.userId, first.userId);
    assert.deepEqual(seen, [
      ["authenticated", "user-a", 1],
      ["authenticated", "user-b", 2],
    ]);
  },

  logout() {
    save("user-a");
    let firstRemovalState = null;
    removeObserver = () => {
      firstRemovalState ??= snapshot();
    };
    auth.clearMeetroSession();
    removeObserver = null;

    assert.equal(firstRemovalState?.status, "unauthenticated");
    assert.equal(snapshot().status, "unauthenticated");
    assert.equal(snapshot().userId, null);
    assert.equal(snapshot().sessionGeneration, 2);
    assert.equal(store.has("token"), false);
  },

  "expiry-event"() {
    save("user-a");
    let snapshotAtEvent = null;
    globalThis.window.dispatchEvent = (event) => {
      dispatchedEvents.push(event);
      if (event.type === "meetroAuthExpired") snapshotAtEvent = snapshot();
      return true;
    };
    auth.handleAuthExpired();

    assert.equal(snapshotAtEvent?.status, "unauthenticated");
    assert.equal(snapshotAtEvent?.sessionGeneration, 2);
    assert.equal(globalThis.window.location.hash, "login");
  },

  "expiry-401": async function expiry401() {
    save("user-a");
    const observedInstance = snapshot();
    let snapshotAtEvent = null;
    globalThis.window.dispatchEvent = (event) => {
      dispatchedEvents.push(event);
      if (event.type === "meetroAuthExpired") snapshotAtEvent = snapshot();
      return true;
    };
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ code: "AUTHENTICATION_REQUIRED" }),
    });

    const result = await auth.authFetch("/auth/me");
    assert.equal(result.response.status, 401);
    assert.equal(observedInstance.status, "authenticated");
    assert.equal(snapshotAtEvent, snapshot());
    assert.equal(snapshot().status, "unauthenticated");
    assert.equal(snapshot().sessionGeneration, 2);
  },

  "restore-success-failure"() {
    replaceStorage({
      token: "restored-token",
      user: JSON.stringify(user("restored-user")),
      userId: "restored-user",
      userEmail: "restored@example.com",
    });
    const restored = session.restoreAuthenticatedSessionFromStorage();
    assert.equal(restored.authenticated, true);
    assert.equal(snapshot().status, "authenticated");
    assert.equal(snapshot().sessionGeneration, 1);

    replaceStorage();
    const missing = session.restoreAuthenticatedSessionFromStorage();
    assert.equal(missing.authenticated, false);
    assert.equal(snapshot().status, "unauthenticated");
    assert.equal(snapshot().userId, null);
    assert.equal(snapshot().sessionGeneration, 2);
  },

  "restore-missing-id"() {
    replaceStorage({
      token: "restored-token",
      user: JSON.stringify({
        email: "email-only@example.com",
        role: "homeowner",
        account_type: "homeowner",
      }),
    });
    const restored = session.restoreAuthenticatedSessionFromStorage();

    assert.equal(restored.authenticated, true);
    assert.equal(snapshot().status, "unauthenticated");
    assert.equal(snapshot().userId, null);
    assert.equal(snapshot().sessionGeneration, 1);
  },

  initial() {
    assert.equal(importStorageReads, 0);
    assert.deepEqual(snapshot(), {
      status: "unresolved",
      userId: null,
      sessionGeneration: 0,
    });
    assertMinimalSnapshot(snapshot());
  },

  "save-and-public-access"() {
    const publications = [];
    const unsubscribe = session.subscribeAuthenticatedIdentity((value) => {
      publications.push(value);
    });
    save("user-a");
    const saved = snapshot();
    assert.equal(saved.status, "authenticated");
    assert.equal(saved.userId, "user-a");
    assert.equal(saved.sessionGeneration, 1);
    assert.equal(publications.at(-1), saved);
    assertMinimalSnapshot(saved);

    const readsBeforePublicAccess = storageReads;
    assert.equal(session.getAuthenticatedIdentitySnapshot(), saved);
    const secondUnsubscribe = session.subscribeAuthenticatedIdentity(() => {});
    secondUnsubscribe();
    assert.equal(storageReads, readsBeforePublicAccess);
    assert.ok(storageWrites > 0);
    unsubscribe();
  },

  "same-user"() {
    save("user-a");
    const first = snapshot();
    save("user-a");
    assert.equal(snapshot(), first);
    assert.equal(snapshot().sessionGeneration, 1);
  },

  "identity-rejection"() {
    session.saveMeetroSession({
      token: "fixture-token",
      user: { role: "professional", account_type: "professional" },
    });
    assert.equal(snapshot().status, "unauthenticated");

    session.saveMeetroSession({
      token: "fixture-token",
      user: { email: "email-only@example.com", role: "homeowner" },
    });
    assert.equal(snapshot().status, "unauthenticated");

    const inherited = Object.create({ id: "inherited-user" });
    inherited.role = "homeowner";
    session.saveMeetroSession({ token: "fixture-token", user: inherited });
    assert.equal(snapshot().status, "unauthenticated");

    const accessor = { role: "homeowner" };
    Object.defineProperty(accessor, "id", {
      enumerable: true,
      get: () => "accessor-user",
    });
    session.saveMeetroSession({ token: "fixture-token", user: accessor });
    assert.equal(snapshot().status, "unauthenticated");

    save(" bad-id ");
    assert.equal(snapshot().status, "unauthenticated");
    save("x".repeat(256));
    assert.equal(snapshot().status, "unauthenticated");
  },

  "canonical-id"() {
    save("canonical-user", { email: "different@example.com" });
    assert.equal(snapshot().status, "authenticated");
    assert.equal(snapshot().userId, "canonical-user");
    assertMinimalSnapshot(snapshot());
  },

  subscribers() {
    const first = [];
    const second = [];
    const unsubscribeFailing = session.subscribeAuthenticatedIdentity(() => {
      throw new Error("expected listener isolation probe");
    });
    const unsubscribeFirst = session.subscribeAuthenticatedIdentity((value) => {
      first.push(value);
    });
    const unsubscribeSecond = session.subscribeAuthenticatedIdentity((value) => {
      second.push(value);
    });

    save("user-a");
    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    assert.equal(first[0], second[0]);
    unsubscribeFirst();
    unsubscribeFirst();
    save("user-b");
    assert.equal(first.length, 1);
    assert.equal(second.length, 2);
    unsubscribeSecond();
    unsubscribeFailing();
    save("user-c");
    assert.equal(first.length, 1);
    assert.equal(second.length, 2);
  },

  immutability() {
    save("user-a");
    const published = snapshot();
    assertMinimalSnapshot(published);
    assert.throws(() => {
      published.userId = "mutated";
    }, TypeError);
    assert.equal(snapshot().userId, "user-a");
  },

  "repeated-clear"() {
    const seen = [];
    const unsubscribe = session.subscribeAuthenticatedIdentity((value) => {
      seen.push(value);
    });
    const first = session.clearAuthenticatedIdentity();
    const second = session.clearAuthenticatedIdentity();
    unsubscribe();

    assert.equal(first, second);
    assert.equal(first.status, "unauthenticated");
    assert.equal(first.sessionGeneration, 1);
    assert.equal(seen.length, 1);
  },
};

const selected = process.env.SESSION_IDENTITY_SCENARIO;
assert.equal(typeof scenarios[selected], "function", "Unknown identity scenario");
await scenarios[selected]();
`;

const shuffledScenarioOrder = [
  "account-switch",
  "expiry-401",
  "restore-success-failure",
  "subscribers",
  "logout",
  "identity-rejection",
  "initial",
  "same-user",
  "canonical-id",
  "expiry-event",
  "immutability",
  "restore-missing-id",
  "save-and-public-access",
  "repeated-clear",
];

function runIsolatedScenario(scenario) {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", scenarioRunner],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        SESSION_IDENTITY_SCENARIO: scenario,
      },
      maxBuffer: 1024 * 1024,
    }
  );

  assert.equal(
    result.status,
    0,
    [result.stderr, result.stdout].filter(Boolean).join("\n")
  );
}

for (const scenario of shuffledScenarioOrder) {
  test(`isolated identity scenario: ${scenario}`, () => {
    runIsolatedScenario(scenario);
  });
}

test("identity scenarios remain independent in reverse internal order", () => {
  [...shuffledScenarioOrder].reverse().forEach(runIsolatedScenario);
});

test("public consumer surface has no storage, credential, or scheduling authority", () => {
  const source = readFileSync("src/utils/session.js", "utf8");
  const publicSurfaceStart = source.indexOf(
    "export function getAuthenticatedIdentitySnapshot"
  );
  const authorityStart = source.indexOf("function safeReadStoredUser", publicSurfaceStart);
  const publicSurface = source.slice(publicSurfaceStart, authorityStart);

  assert.ok(publicSurfaceStart >= 0);
  assert.ok(authorityStart > publicSurfaceStart);
  assert.doesNotMatch(
    publicSurface,
    /localStorage|sessionStorage|indexedDB|IndexedDB|getItem\(|setItem\(|removeItem\(/
  );
  assert.doesNotMatch(
    publicSurface,
    /token|password|verification|jwt|atob|role|email|route|setTimeout|setInterval|addEventListener|dispatchEvent/
  );
});

test("identity publication stays internal and no production test reset is exported", () => {
  const source = readFileSync("src/utils/session.js", "utf8");
  const authSource = readFileSync("src/utils/authFetch.js", "utf8");
  const identityAuthority = source.slice(
    source.indexOf("function normalizeAuthenticatedUserId"),
    source.indexOf("function safeReadStoredUser")
  );

  assert.match(source, /function publishAuthenticatedIdentityFromUser\(/);
  assert.doesNotMatch(source, /export function publishAuthenticatedIdentity/);
  assert.doesNotMatch(source, /resetAuthenticatedIdentity|testOnly|__reset/);
  assert.match(source, /publishAuthenticatedIdentityFromUser\(user\)/);
  assert.doesNotMatch(
    identityAuthority,
    /localStorage|sessionStorage|indexedDB|IndexedDB|getItem\(|setItem\(|removeItem\(/
  );
  assert.match(authSource, /clearAuthenticatedIdentity\(\);\s*clearAccountWorkflowData\(\)/);
  assert.doesNotMatch(source, /Date\.now|Math\.random|crypto\.randomUUID/);
});
