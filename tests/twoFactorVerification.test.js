import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  TWO_FACTOR_FAILURE,
  REQUEST_TWO_FACTOR_ENDPOINT,
  VERIFY_TWO_FACTOR_ENDPOINT,
  buildTwoFactorPayload,
  normalizeTwoFactorFailure,
  requestTwoFactorCode,
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

test("resend uses only the current opaque challenge context", async () => {
  let request;
  const result = await requestTwoFactorCode({
    apiUrl: "https://api.example.test",
    email: "person@example.test",
    pendingData: {
      challengeId: "challenge-original",
      password: "must-not-be-sent",
      token: "must-not-be-sent",
      userId: 42,
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
          return {
            code: "VERIFICATION_CODE_SENT",
            challengeId: "challenge-replacement",
            retryAfterSeconds: 60,
          };
        },
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(
    request.url,
    `https://api.example.test${REQUEST_TWO_FACTOR_ENDPOINT}`
  );
  assert.equal(request.options.method, "POST");
  assert.deepEqual(request.body, {
    email: "person@example.test",
    challengeId: "challenge-original",
  });
  assert.equal(result.data.challengeId, "challenge-replacement");
  assert.equal(result.retryAfterSeconds, 60);
});

test("resend fails locally without challenge context", async () => {
  let requests = 0;
  const result = await requestTwoFactorCode({
    apiUrl: "https://api.example.test",
    email: "person@example.test",
    fetchImpl: async () => {
      requests += 1;
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.failure, TWO_FACTOR_FAILURE.SESSION_EXPIRED);
  assert.equal(requests, 0);
});

test("resend preserves backend cooldown and failure authority", async () => {
  const throttled = await requestTwoFactorCode({
    apiUrl: "https://api.example.test",
    email: "person@example.test",
    pendingData: { challengeId: "challenge-original" },
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      async json() {
        return {
          code: "TOO_MANY_ATTEMPTS",
          retryAfterSeconds: 37,
        };
      },
    }),
  });
  const expired = await requestTwoFactorCode({
    apiUrl: "https://api.example.test",
    email: "person@example.test",
    pendingData: { challengeId: "challenge-original" },
    fetchImpl: async () => ({
      ok: false,
      status: 410,
      async json() {
        return { code: "CHALLENGE_EXPIRED" };
      },
    }),
  });
  const invalid = await requestTwoFactorCode({
    apiUrl: "https://api.example.test",
    email: "person@example.test",
    pendingData: { challengeId: "challenge-original" },
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      async json() {
        return { code: "INVALID_CHALLENGE" };
      },
    }),
  });

  assert.equal(throttled.failure, TWO_FACTOR_FAILURE.TOO_MANY_ATTEMPTS);
  assert.equal(throttled.retryAfterSeconds, 37);
  assert.equal(expired.failure, TWO_FACTOR_FAILURE.CODE_EXPIRED);
  assert.equal(invalid.failure, TWO_FACTOR_FAILURE.SESSION_EXPIRED);
});

test("resend normalizes network failures without leaking context", async () => {
  const result = await requestTwoFactorCode({
    apiUrl: "https://api.example.test",
    email: "person@example.test",
    pendingData: { challengeId: "challenge-original" },
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.failure, TWO_FACTOR_FAILURE.NETWORK_PROBLEM);
  assert.deepEqual(result.payload, {
    email: "person@example.test",
    challengeId: "challenge-original",
  });
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

test("login challenge exposes accessible resend feedback and preserves verification actions", () => {
  const source = readFileSync(
    new URL("../src/pages/Login.jsx", import.meta.url),
    "utf8"
  );
  const challengeStart = source.indexOf("if (twoFactorStep)");
  const normalLoginStart = source.indexOf("return (", challengeStart + 1);
  const resendControl = source.indexOf("onClick={handleResendCode}");

  assert.ok(challengeStart >= 0);
  assert.ok(resendControl > normalLoginStart);
  assert.match(source, /didntReceiveCode: "Didn't receive a code\?"/);
  assert.match(source, /requestTwoFactorCode\(\{/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /type="button"[\s\S]*onClick=\{handleResendCode\}/);
  assert.match(source, /onClick=\{\(\) => handleVerifyCode\(\)\}/);
  assert.match(source, /localStorage\.removeItem\("pendingLoginData"\)/);
  assert.match(source, /setTwoFactorStep\(false\)/);
});

test("login resend persists cooldown and suppresses concurrent requests", () => {
  const source = readFileSync(
    new URL("../src/pages/Login.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /resendRequestInFlight\.current \|\|/);
  assert.match(source, /resendLoading \|\|/);
  assert.match(source, /verificationLoading \|\|/);
  assert.match(source, /resendCooldownSeconds > 0/);
  assert.match(source, /resendRequestInFlight\.current = true/);
  assert.match(source, /resendRequestInFlight\.current = false/);
  assert.match(source, /resendAvailableAt:/);
  assert.match(source, /setResendCooldownSeconds\(retryAfterSeconds\)/);
  assert.match(source, /disabled=\{[\s\S]*resendLoading \|\|[\s\S]*verificationLoading \|\|/);
  assert.match(source, /setPassword\(""\)/);
});

test("login resend copy covers every active locale", () => {
  const source = readFileSync(
    new URL("../src/pages/Login.jsx", import.meta.url),
    "utf8"
  );

  assert.equal(source.match(/didntReceiveCode:/g)?.length, 4);
  assert.equal(source.match(/resendCode:/g)?.length, 4);
  assert.equal(source.match(/resendAvailableIn:/g)?.length, 4);
  assert.match(source, /en: \{/);
  assert.match(source, /es: \{/);
  assert.match(source, /fr: \{/);
  assert.match(source, /"pt-BR": \{/);
});
