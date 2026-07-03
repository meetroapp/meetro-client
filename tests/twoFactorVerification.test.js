import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  TWO_FACTOR_FAILURE,
  VERIFY_TWO_FACTOR_ENDPOINT,
  buildTwoFactorPayload,
  normalizeTwoFactorFailure,
  verifyTwoFactorCode,
} from "../src/utils/twoFactorVerification.js";

test("two-factor payload carries the entered code and pending login identity", () => {
  const payload = buildTwoFactorPayload({
    code: "654321",
    email: "typed@example.com",
    pendingData: {
      user: {
        email: "account@example.com",
      },
      verificationSessionId: "session-123",
      challengeId: "challenge-456",
      verificationToken: "token-789",
    },
  });

  assert.equal(payload.code, "654321");
  assert.equal(payload.email, "account@example.com");
  assert.equal(payload.verificationSessionId, "session-123");
  assert.equal(payload.verification_session_id, "session-123");
  assert.equal(payload.challengeId, "challenge-456");
  assert.equal(payload.verificationToken, "token-789");
});

test("two-factor verification posts the entered code to the backend endpoint", async () => {
  let request;

  const result = await verifyTwoFactorCode({
    apiUrl: "https://api.example.test",
    code: "246810",
    email: "homeowner@example.com",
    pendingData: {
      user: {
        email: "homeowner@example.com",
      },
      verificationSessionId: "session-abc",
    },
    fetchImpl: async (url, options) => {
      request = {
        url,
        options,
        body: JSON.parse(options.body),
      };

      return {
        ok: true,
        status: 200,
        async json() {
          return { verified: true };
        },
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(request.url, `https://api.example.test${VERIFY_TWO_FACTOR_ENDPOINT}`);
  assert.equal(request.options.method, "POST");
  assert.equal(request.body.code, "246810");
  assert.equal(request.body.email, "homeowner@example.com");
  assert.equal(request.body.verificationSessionId, "session-abc");
});

test("two-factor failure mapping reserves Invalid code for explicit incorrect-code responses", () => {
  assert.equal(
    normalizeTwoFactorFailure({
      status: 400,
      data: { code: "invalid_code", message: "Invalid code" },
    }),
    TWO_FACTOR_FAILURE.INVALID_CODE
  );
  assert.equal(
    normalizeTwoFactorFailure({
      status: 400,
      data: { code: "incorrect_code" },
    }),
    TWO_FACTOR_FAILURE.INVALID_CODE
  );
  assert.equal(
    normalizeTwoFactorFailure({
      status: 400,
      data: { message: "Bad request" },
    }),
    TWO_FACTOR_FAILURE.SERVICE_UNAVAILABLE
  );
});

test("two-factor failure mapping distinguishes expired, timeout, attempts, session, and network states", () => {
  assert.equal(
    normalizeTwoFactorFailure({
      status: 410,
      data: { code: "code_expired" },
    }),
    TWO_FACTOR_FAILURE.CODE_EXPIRED
  );
  assert.equal(
    normalizeTwoFactorFailure({
      status: 408,
      data: { code: "verification_timed_out" },
    }),
    TWO_FACTOR_FAILURE.VERIFICATION_TIMED_OUT
  );
  assert.equal(
    normalizeTwoFactorFailure({
      status: 429,
      data: { code: "too_many_attempts" },
    }),
    TWO_FACTOR_FAILURE.TOO_MANY_ATTEMPTS
  );
  assert.equal(
    normalizeTwoFactorFailure({
      status: 419,
      data: { code: "session_expired" },
    }),
    TWO_FACTOR_FAILURE.SESSION_EXPIRED
  );
  assert.equal(
    normalizeTwoFactorFailure({
      status: 401,
      data: { code: "verification_session_invalid" },
    }),
    TWO_FACTOR_FAILURE.SESSION_EXPIRED
  );
  assert.equal(
    normalizeTwoFactorFailure({
      status: 429,
      data: { code: "attempts_exceeded" },
    }),
    TWO_FACTOR_FAILURE.TOO_MANY_ATTEMPTS
  );
  assert.equal(
    normalizeTwoFactorFailure({ networkError: true }),
    TWO_FACTOR_FAILURE.NETWORK_PROBLEM
  );
});

test("login verification no longer uses the placeholder code or click event as the code", () => {
  const source = readFileSync(
    new URL("../src/pages/Login.jsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /123456/);
  assert.doesNotMatch(source, /onClick=\{handleVerifyCode\}/);
  assert.match(source, /verifyTwoFactorCode\(\{/);
  assert.match(source, /onClick=\{\(\) => handleVerifyCode\(\)\}/);
  assert.match(source, /setVerificationError\(getVerificationFailureMessage\(result\.failure\)\)/);
});
