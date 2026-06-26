import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPasswordResetRequest,
  isValidPasswordResetEmail,
  normalizePasswordResetEmail,
} from "../src/utils/passwordReset.js";
import { t, translations } from "../src/utils/language.js";

const languages = ["en", "es", "fr", "pt-BR"];
const resetKeys = [
  "forgotPassword",
  "resetPasswordTitle",
  "resetPasswordDescription",
  "resetEmailPlaceholder",
  "sendResetLink",
  "backToLogin",
  "resetEmailRequired",
  "resetEmailInvalid",
  "resetPasswordConfirmation",
  "resetPasswordSimulatedNote",
];

test("password reset email normalization and validation is deterministic", () => {
  assert.equal(normalizePasswordResetEmail("  USER@Example.COM "), "user@example.com");
  assert.equal(isValidPasswordResetEmail("user@example.com"), true);
  assert.equal(isValidPasswordResetEmail("not-an-email"), false);
  assert.equal(isValidPasswordResetEmail(""), false);
});

test("password reset request validates empty and invalid emails without lookup", () => {
  assert.deepEqual(buildPasswordResetRequest(""), {
    ok: false,
    email: "",
    errorCode: "email_required",
  });

  assert.deepEqual(buildPasswordResetRequest("bad-email"), {
    ok: false,
    email: "bad-email",
    errorCode: "email_invalid",
  });
});

test("password reset request simulates delivery without revealing account existence", () => {
  assert.deepEqual(buildPasswordResetRequest("KNOWN@example.com"), {
    ok: true,
    email: "known@example.com",
    simulated: true,
  });

  assert.deepEqual(buildPasswordResetRequest("unknown@example.com"), {
    ok: true,
    email: "unknown@example.com",
    simulated: true,
  });
});

test("password reset labels exist in supported TestFlight languages", () => {
  for (const key of resetKeys) {
    for (const language of languages) {
      assert.equal(
        typeof translations[language][key],
        "string",
        `Missing ${language} password reset label ${key}`
      );
      assert.ok(translations[language][key].trim());
      assert.notEqual(t(key, language), key);
    }
  }
});
