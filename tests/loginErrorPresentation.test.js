import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  LOGIN_FAILURE,
  normalizeLoginFailure,
} from "../src/utils/loginErrorPresentation.js";

const loginSource = readFileSync(
  new URL("../src/pages/Login.jsx", import.meta.url),
  "utf8"
);
const handleSubmitSource =
  loginSource.match(
    /async function handleSubmit\(\) \{([\s\S]*?)\n {2}function getAuthFailureMessage/
  )?.[1] || "";

test("login failures map to safe user-facing categories", () => {
  assert.equal(
    normalizeLoginFailure({ status: 401, mode: "login" }),
    LOGIN_FAILURE.INVALID_CREDENTIALS
  );
  assert.equal(
    normalizeLoginFailure({ status: 429, mode: "login" }),
    LOGIN_FAILURE.TOO_MANY_ATTEMPTS
  );
  assert.equal(
    normalizeLoginFailure({ networkError: true }),
    LOGIN_FAILURE.ACCOUNT_SERVICE_UNAVAILABLE
  );
  assert.equal(
    normalizeLoginFailure({ malformedResponse: true }),
    LOGIN_FAILURE.UNEXPECTED_RESPONSE
  );
  assert.equal(
    normalizeLoginFailure({ status: 409, mode: "signup" }),
    LOGIN_FAILURE.ACCOUNT_ALREADY_EXISTS
  );
});

test("login card renders a calm accessible inline error instead of auth alerts", () => {
  assert.match(loginSource, /const \[authError, setAuthError\] = useState\(""\)/);
  assert.match(loginSource, /role="alert"/);
  assert.match(loginSource, /aria-live="polite"/);
  assert.match(loginSource, /data-auth-error="true"/);
  assert.match(
    loginSource,
    /Meetro could not connect to the account service\. Please try again\./
  );
  assert.doesNotMatch(loginSource, /alert\(data\.error \|\| data\.message/);
  assert.doesNotMatch(loginSource, /alert\(T\.serverError\)/);
  assert.doesNotMatch(handleSubmitSource, /console\.error/);
});

test("failed authentication clears pending state without rendering raw server errors", () => {
  assert.match(loginSource, /finally \{\s*setLoading\(false\);\s*\}/);
  assert.match(loginSource, /normalizeLoginFailure\(\{ status: response\.status, mode \}\)/);
  assert.doesNotMatch(loginSource, /setAuthError\(data\.(error|message)/);
});

test("successful authentication and secure password handling remain unchanged", () => {
  assert.match(loginSource, /localStorage\.setItem\("pendingLoginData", JSON\.stringify\(data\)\)/);
  assert.match(loginSource, /setTwoFactorStep\(true\)/);
  assert.doesNotMatch(loginSource, /localStorage\.setItem\([^\n]*password/);
  assert.doesNotMatch(loginSource, /console\.(log|error)\([^\n]*password/);
  assert.match(loginSource, /type="password"/);
});
