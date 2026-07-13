import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  PASSWORD_RESET_FAILURE,
  PASSWORD_RESET_REQUEST_ENDPOINT,
  PASSWORD_RESET_COMPLETE_ENDPOINT,
  buildPasswordResetRequest,
  capturePasswordResetToken,
  completePasswordReset,
  evaluateResetPasswordRequirements,
  isValidPasswordResetEmail,
  normalizePasswordResetEmail,
  requestPasswordReset,
  validatePasswordResetCompletion,
} from "../src/utils/passwordReset.js";
import { t, translations } from "../src/utils/language.js";

const languages = ["en", "es", "fr", "pt-BR"];
const resetKeys = [
  "forgotPassword",
  "resetPasswordTitle",
  "resetPasswordDescription",
  "resetEmailLabel",
  "sendResetLink",
  "backToLogin",
  "resetPasswordConfirmation",
  "resetCreatePasswordTitle",
  "resetNewPassword",
  "resetConfirmPassword",
  "resetMinimumLength",
  "resetUppercase",
  "resetLowercase",
  "resetNumber",
  "resetCompleteTitle",
  "resetLinkInvalid",
  "accountSecurityRecoveryHelp",
];

function jsonResponse(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return data; },
  };
}

test("password reset email normalization and validation is deterministic", () => {
  assert.equal(normalizePasswordResetEmail("  USER@Example.COM "), "user@example.com");
  assert.equal(isValidPasswordResetEmail("user@example.com"), true);
  assert.equal(isValidPasswordResetEmail("not-an-email"), false);
  assert.equal(isValidPasswordResetEmail(""), false);
});

test("password reset request validates empty and invalid emails without lookup", () => {
  assert.deepEqual(buildPasswordResetRequest(""), { ok: false, email: "", errorCode: "email_required" });
  assert.deepEqual(buildPasswordResetRequest("bad-email"), {
    ok: false,
    email: "bad-email",
    errorCode: "email_invalid",
  });
});

test("request flow sends only normalized email and accepts the generic response", async () => {
  const calls = [];
  const result = await requestPasswordReset({
    email: " KNOWN@example.com ",
    apiUrl: "https://api.example.test",
    fetchImpl: async (...args) => {
      calls.push(args);
      return jsonResponse(200, { success: true, code: "PASSWORD_RESET_REQUEST_ACCEPTED" });
    },
  });

  assert.deepEqual(result, { ok: true, code: "PASSWORD_RESET_REQUEST_ACCEPTED" });
  assert.equal(calls[0][0], `https://api.example.test${PASSWORD_RESET_REQUEST_ENDPOINT}`);
  assert.deepEqual(JSON.parse(calls[0][1].body), { email: "known@example.com" });
  assert.doesNotMatch(calls[0][1].body, /userId|accountExists|token/i);
});

test("completion enforces the backend password policy and sends no confirmation field", async () => {
  assert.deepEqual(evaluateResetPasswordRequirements("ValidPass1"), {
    minimumLength: true,
    uppercase: true,
    lowercase: true,
    number: true,
  });
  assert.equal(validatePasswordResetCompletion({
    token: "opaque_token",
    newPassword: "ValidPass1",
    confirmPassword: "different",
  }).failure, PASSWORD_RESET_FAILURE.PASSWORDS_DO_NOT_MATCH);

  const calls = [];
  const result = await completePasswordReset({
    token: "opaque_token",
    newPassword: "ValidPass1",
    confirmPassword: "ValidPass1",
    apiUrl: "https://api.example.test",
    fetchImpl: async (...args) => {
      calls.push(args);
      return jsonResponse(200, { success: true, code: "PASSWORD_RESET_COMPLETE" });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(calls[0][0], `https://api.example.test${PASSWORD_RESET_COMPLETE_ENDPOINT}`);
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    token: "opaque_token",
    newPassword: "ValidPass1",
  });
});

test("reset token is captured once and removed from browser history", () => {
  const replacements = [];
  const token = capturePasswordResetToken({
    locationImpl: {
      search: "?token=opaque_secret&source=email",
      pathname: "/reset-password",
      hash: "",
    },
    historyImpl: {
      state: { existing: true },
      replaceState(...args) { replacements.push(args); },
    },
  });
  assert.equal(token, "opaque_secret");
  assert.deepEqual(replacements, [[{ existing: true }, "", "/reset-password?source=email"]]);
});

test("invalid or expired completion responses map to one safe client state", async () => {
  const result = await completePasswordReset({
    token: "opaque_token",
    newPassword: "ValidPass1",
    confirmPassword: "ValidPass1",
    fetchImpl: async () => jsonResponse(400, { success: false, code: "RESET_TOKEN_EXPIRED" }),
  });
  assert.equal(result.failure, PASSWORD_RESET_FAILURE.RESET_LINK_INVALID);
});

test("network and request throttling failures map without revealing account state", async () => {
  const throttled = await requestPasswordReset({
    email: "user@example.com",
    fetchImpl: async () => jsonResponse(429, { success: false, code: "TOO_MANY_ATTEMPTS" }),
  });
  assert.equal(throttled.failure, PASSWORD_RESET_FAILURE.TOO_MANY_ATTEMPTS);

  const unavailable = await requestPasswordReset({
    email: "user@example.com",
    fetchImpl: async () => { throw new Error("offline"); },
  });
  assert.equal(unavailable.failure, PASSWORD_RESET_FAILURE.SERVICE_UNAVAILABLE);
});

test("password reset labels exist in all supported languages", () => {
  for (const key of resetKeys) {
    for (const language of languages) {
      assert.equal(typeof translations[language][key], "string", `Missing ${language} password reset label ${key}`);
      assert.ok(translations[language][key].trim());
      assert.notEqual(t(key, language), key);
    }
  }
});

test("client recovery source does not persist or log reset tokens", () => {
  const utilitySource = fs.readFileSync(new URL("../src/utils/passwordReset.js", import.meta.url), "utf8");
  const componentSource = fs.readFileSync(new URL("../src/components/PasswordResetWorkspace.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(`${utilitySource}\n${componentSource}`, /localStorage|sessionStorage|console\./);
  assert.doesNotMatch(componentSource, /alert\s*\(/);
  assert.match(componentSource, /capturePasswordResetToken/);
  assert.match(componentSource, /autoComplete="new-password"/);
});

test("App supports the public reset route without authenticated startup", () => {
  const appSource = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(appSource, /pathRoute === "\/reset-password"/);
  assert.match(appSource, /new Set\(\["meetroStory", "resetPassword"\]\)/);
  assert.match(appSource, /page === "resetPassword"/);
  assert.match(appSource, /<PasswordResetWorkspace[\s\S]*allowCompletion[\s\S]*standalone/);
});
