import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ACCOUNT_SECURITY_FAILURE,
  CHANGE_PASSWORD_ENDPOINT,
  changeAccountPassword,
  evaluatePasswordRequirements,
  getAccountSecurityCapabilities,
  isValidFreshToken,
  normalizePasswordChangeFailure,
  validatePasswordChangeInput,
} from "../src/utils/accountSecurity.js";
import { replaceMeetroSessionToken } from "../src/utils/session.js";
import { authFetch } from "../src/utils/authFetch.js";
import { t } from "../src/utils/language.js";

const componentSource = readFileSync("src/components/AccountSecurityWorkspace.jsx", "utf8");
const profileSource = readFileSync("src/pages/Profile.jsx", "utf8");
const authFetchSource = readFileSync("src/utils/authFetch.js", "utf8");
const loginSource = readFileSync("src/pages/Login.jsx", "utf8");
const stylesSource = readFileSync("src/index.css", "utf8");

function validInput(overrides = {}) {
  return {
    currentPassword: "CurrentPass1",
    newPassword: "UpdatedPass2",
    confirmPassword: "UpdatedPass2",
    ...overrides,
  };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    snapshot: () => Object.fromEntries(values),
  };
}

test("password requirements mirror the backend policy without requiring a symbol", () => {
  assert.deepEqual(evaluatePasswordRequirements("UpdatedPass2"), {
    minimumLength: true,
    uppercase: true,
    lowercase: true,
    number: true,
  });
  assert.equal(validatePasswordChangeInput(validInput()).valid, true);
  assert.equal(validatePasswordChangeInput(validInput({ newPassword: "Updated2", confirmPassword: "Updated2" })).valid, false);
  assert.equal(validatePasswordChangeInput(validInput({ newPassword: "updatedpass2", confirmPassword: "updatedpass2" })).failure, ACCOUNT_SECURITY_FAILURE.PASSWORD_POLICY_FAILED);
  assert.equal(validatePasswordChangeInput(validInput({ newPassword: "UPDATEDPASS2", confirmPassword: "UPDATEDPASS2" })).failure, ACCOUNT_SECURITY_FAILURE.PASSWORD_POLICY_FAILED);
  assert.equal(validatePasswordChangeInput(validInput({ newPassword: "UpdatedPass", confirmPassword: "UpdatedPass" })).failure, ACCOUNT_SECURITY_FAILURE.PASSWORD_POLICY_FAILED);
});

test("password validation blocks blank, missing, mismatched, and reused values deterministically", () => {
  const cases = [
    [{ currentPassword: "   " }, ACCOUNT_SECURITY_FAILURE.CURRENT_PASSWORD_REQUIRED],
    [{ newPassword: "   ", confirmPassword: "   " }, ACCOUNT_SECURITY_FAILURE.NEW_PASSWORD_REQUIRED],
    [{ confirmPassword: "" }, ACCOUNT_SECURITY_FAILURE.CONFIRM_PASSWORD_REQUIRED],
    [{ confirmPassword: "DifferentPass3" }, ACCOUNT_SECURITY_FAILURE.PASSWORDS_DO_NOT_MATCH],
    [{ newPassword: "CurrentPass1", confirmPassword: "CurrentPass1" }, ACCOUNT_SECURITY_FAILURE.PASSWORD_REUSE_NOT_ALLOWED],
  ];

  cases.forEach(([overrides, expected]) => {
    const input = validInput(overrides);
    const before = { ...input };
    assert.equal(validatePasswordChangeInput(input).failure, expected);
    assert.deepEqual(input, before);
    assert.deepEqual(validatePasswordChangeInput(input), validatePasswordChangeInput(input));
  });
});

test("valid password values are sent unchanged and confirmation or identity fields are excluded", async () => {
  const input = validInput({
    currentPassword: " CurrentPass1 ",
    newPassword: " UpdatedPass2 ",
    confirmPassword: " UpdatedPass2 ",
  });
  let request;

  const result = await changeAccountPassword({
    ...input,
    authFetchImpl: async (endpoint, options) => {
      request = { endpoint, options, body: JSON.parse(options.body) };
      return {
        response: { ok: true, status: 200 },
        data: { success: true, code: "PASSWORD_CHANGED", token: "header.payload.signature" },
      };
    },
    replaceTokenImpl: () => true,
  });

  assert.equal(result.ok, true);
  assert.equal(request.endpoint, CHANGE_PASSWORD_ENDPOINT);
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.skipAuthExpirationHandling, true);
  assert.deepEqual(request.body, {
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
  });
  assert.equal("confirmPassword" in request.body, false);
  assert.equal("userId" in request.body, false);
  assert.equal("email" in request.body, false);
  assert.equal("businessId" in request.body, false);
});

test("successful password change requires PASSWORD_CHANGED and a plausible fresh JWT", async () => {
  let replaced = "";
  const success = await changeAccountPassword({
    ...validInput(),
    authFetchImpl: async () => ({
      response: { ok: true, status: 200 },
      data: { success: true, code: "PASSWORD_CHANGED", token: "header.payload.signature" },
    }),
    replaceTokenImpl: (token) => {
      replaced = token;
      return true;
    },
  });
  assert.equal(success.ok, true);
  assert.equal(replaced, "header.payload.signature");
  assert.equal(isValidFreshToken("header.payload.signature"), true);
  assert.equal(isValidFreshToken("not-a-jwt"), false);

  const missingToken = await changeAccountPassword({
    ...validInput(),
    authFetchImpl: async () => ({
      response: { ok: true, status: 200 },
      data: { success: true, code: "PASSWORD_CHANGED" },
    }),
    replaceTokenImpl: () => assert.fail("missing token must not be stored"),
  });
  assert.equal(missingToken.ok, false);
  assert.equal(missingToken.sessionExpired, true);
});

test("token replacement updates only the existing token key", () => {
  const storage = memoryStorage({
    token: "old.token.value",
    user: '{"id":"user-1"}',
    activeAccountMode: "business",
    contractorProfile: '{"id":"business-1"}',
    workflow: "preserved",
    language: "fr",
  });
  const before = storage.snapshot();

  assert.equal(replaceMeetroSessionToken("new.token.value", storage), true);
  const after = storage.snapshot();
  assert.equal(after.token, "new.token.value");
  assert.deepEqual({ ...after, token: before.token }, before);
  assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort());
  assert.equal(replaceMeetroSessionToken("new.token.value", null), false);
});

test("authenticated fetch does not expire the session for a mapped incorrect-current-password response", async () => {
  const storage = memoryStorage({ token: "existing.token.value" });
  const originalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  let dispatchedEvents = 0;
  globalThis.localStorage = storage;
  globalThis.window = {
    location: { hash: "profile" },
    dispatchEvent: () => {
      dispatchedEvents += 1;
      return true;
    },
  };
  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { success: false, code: "CURRENT_PASSWORD_INCORRECT" };
    },
  });

  try {
    const result = await authFetch(CHANGE_PASSWORD_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ currentPassword: "CurrentPass1", newPassword: "UpdatedPass2" }),
      skipAuthExpirationHandling: true,
    });
    assert.equal(result.response.status, 401);
    assert.equal(result.data.code, "CURRENT_PASSWORD_INCORRECT");
    assert.equal(storage.getItem("token"), "existing.token.value");
    assert.equal(globalThis.window.location.hash, "profile");
    assert.equal(dispatchedEvents, 0);
  } finally {
    globalThis.localStorage = originalStorage;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

test("backend and transport failures map to safe account-security states", () => {
  assert.equal(normalizePasswordChangeFailure({ status: 401, code: "CURRENT_PASSWORD_INCORRECT" }), ACCOUNT_SECURITY_FAILURE.CURRENT_PASSWORD_INCORRECT);
  assert.equal(normalizePasswordChangeFailure({ status: 400, code: "PASSWORD_POLICY_FAILED" }), ACCOUNT_SECURITY_FAILURE.PASSWORD_POLICY_FAILED);
  assert.equal(normalizePasswordChangeFailure({ status: 400, code: "PASSWORD_REUSE_NOT_ALLOWED" }), ACCOUNT_SECURITY_FAILURE.PASSWORD_REUSE_NOT_ALLOWED);
  assert.equal(normalizePasswordChangeFailure({ status: 429, code: "TOO_MANY_ATTEMPTS" }), ACCOUNT_SECURITY_FAILURE.TOO_MANY_ATTEMPTS);
  assert.equal(normalizePasswordChangeFailure({ status: 401, code: "SESSION_INVALID" }), ACCOUNT_SECURITY_FAILURE.SESSION_INVALID);
  assert.equal(normalizePasswordChangeFailure({ status: 404 }), ACCOUNT_SECURITY_FAILURE.SERVICE_UNAVAILABLE);
  assert.equal(normalizePasswordChangeFailure({ networkError: true }), ACCOUNT_SECURITY_FAILURE.SERVICE_UNAVAILABLE);
  assert.equal(normalizePasswordChangeFailure({ timedOut: true }), ACCOUNT_SECURITY_FAILURE.SERVICE_UNAVAILABLE);
  assert.equal(normalizePasswordChangeFailure({ status: 500, code: "INTERNAL_SQL_DETAIL" }), ACCOUNT_SECURITY_FAILURE.PASSWORD_CHANGE_FAILED);
});

test("endpoint unavailability and malformed success never simulate a password change", async () => {
  for (const response of [
    { response: { ok: false, status: 404 }, data: { message: "raw backend detail" } },
    { response: { ok: true, status: 200 }, data: { success: true, code: "UNKNOWN", token: "header.payload.signature" } },
  ]) {
    let replacementCalled = false;
    const result = await changeAccountPassword({
      ...validInput(),
      authFetchImpl: async () => response,
      replaceTokenImpl: () => {
        replacementCalled = true;
        return true;
      },
    });
    assert.equal(result.ok, false);
    assert.equal(replacementCalled, false);
    assert.equal("data" in result, false);
  }
});

test("request timeout aborts safely", async () => {
  const result = await changeAccountPassword({
    ...validInput(),
    timeoutMs: 5,
    authFetchImpl: (_endpoint, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(Object.assign(new Error("timed out"), { name: "AbortError" })));
    }),
    replaceTokenImpl: () => true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.failure, ACCOUNT_SECURITY_FAILURE.SERVICE_UNAVAILABLE);
});

test("capabilities expose password change, sign out, and production email recovery", () => {
  assert.deepEqual(getAccountSecurityCapabilities(), {
    passwordChange: true,
    signOut: true,
    emailRecovery: true,
    twoFactorManagement: false,
    recoveryCodes: false,
    activeSessions: false,
    trustedDevices: false,
    revokeOtherSessions: false,
  });
});

test("Profile opens the same user-owned security workspace from personal and business renders", () => {
  assert.doesNotMatch(profileSource, /label=\{t\("passwordSecurity"\)\}\s*value=\{t\("comingSoon"\)\}/);
  assert.equal((profileSource.match(/onClick=\{\(\) => setAccountSecurityOpen\(true\)\}/g) || []).length, 2);
  assert.match(profileSource, /<AccountSecurityWorkspace/);
  assert.match(profileSource, /accountMode=\{activeMode\}/);
  assert.doesNotMatch(profileSource, /AccountSecurityWorkspace[\s\S]{0,300}businessId=/);
});

test("workspace fields, independent visibility, autocomplete, pending guard, and clearing are explicit", () => {
  assert.match(componentSource, /id="account-current-password"/);
  assert.match(componentSource, /id="account-new-password"/);
  assert.match(componentSource, /id="account-confirm-password"/);
  assert.match(componentSource, /type=\{visible \? "text" : "password"\}/);
  assert.match(componentSource, /autoComplete="current-password"/);
  assert.equal((componentSource.match(/autoComplete="new-password"/g) || []).length, 2);
  assert.match(componentSource, /current: !current\.current/);
  assert.match(componentSource, /next: !current\.next/);
  assert.match(componentSource, /confirm: !current\.confirm/);
  assert.match(componentSource, /if \(pending\) return/);
  assert.match(componentSource, /setForm\(EMPTY_FORM\)/);
  assert.match(componentSource, /previousModeRef\.current !== accountMode/);
});

test("workspace reuses production recovery while remaining truthful about two-factor management", () => {
  assert.match(componentSource, /PasswordResetWorkspace requestOnly/);
  assert.doesNotMatch(componentSource, /enable-2fa|disable-2fa|recovery code|qr code|totp|trusted device|other sessions/i);
  assert.match(componentSource, /accountSecurityRecoveryHelp/);
  assert.match(componentSource, /accountSecurityTwoFactorReadOnly/);
  assert.match(loginSource, /verifyTwoFactorCode\(\{/);
});

test("authenticated fetch can preserve an incorrect-password session for safe caller mapping", () => {
  assert.match(authFetchSource, /skipAuthExpirationHandling = false/);
  assert.match(authFetchSource, /if \(authError\)[\s\S]*if \(!skipAuthExpirationHandling\)/);
  assert.doesNotMatch(authFetchSource, /Authorization:.*console|console.*Authorization/);
});

test("security workspace is safe-area contained, keyboard scrollable, and uses 44px controls", () => {
  assert.match(stylesSource, /\.account-security-overlay[\s\S]*safe-area-inset-top/);
  assert.match(stylesSource, /\.account-security-workspace[\s\S]*max-height: calc\(100dvh/);
  assert.match(stylesSource, /\.account-security-content[\s\S]*overflow-y: auto/);
  assert.match(stylesSource, /scroll-padding-bottom: 110px/);
  assert.match(stylesSource, /min-height: 44px/);
  assert.match(stylesSource, /width: min\(100%, 640px\)/);
  assert.match(stylesSource, /@media \(max-width: 600px\)/);
});

test("required account-security labels exist in all four supported languages", () => {
  const keys = [
    "accountSecurityTitle",
    "accountSecurityCurrentPassword",
    "accountSecurityNewPassword",
    "accountSecurityConfirmPassword",
    "accountSecuritySavePassword",
    "accountSecurityPasswordUpdated",
    "accountSecurityRecoveryUnavailable",
    "accountSecurityTwoFactorReadOnly",
    "accountSecuritySession",
    "accountSecuritySignOut",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of keys) {
      assert.notEqual(t(key, language), key);
      assert.ok(t(key, language).trim());
    }
  }
});
