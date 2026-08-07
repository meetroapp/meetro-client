import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createProfessionalResponseIdempotencyKey,
  normalizeProfessionalResponseResult,
  prepareProfessionalResponseCommand,
  submitProfessionalResponse,
} from "../src/utils/professionalResponseApi.js";

function canonicalPayload(overrides = {}) {
  return {
    success: true,
    code: "PROFESSIONAL_RESPONSE_CREATED",
    response: {
      id: "901",
      request_id: 41,
      status: "submitted",
      current_version: 1,
      introduction_text: "I can help with this repair.",
      submitted_at: "2026-08-06T12:00:00.000Z",
      updated_at: "2026-08-06T12:00:00.000Z",
    },
    relationship: {
      id: 501,
      request_id: 41,
      status: "pending",
      authority_source: "professional_response",
      current_version: 1,
      created_at: "2026-08-06T12:00:00.000Z",
    },
    resultClassification: "created",
    created: true,
    replayed: false,
    ...overrides,
  };
}

test("command keys are cryptographically generated but never used as canonical IDs", () => {
  const key = createProfessionalResponseIdempotencyKey({
    randomUUID: () => "11111111-2222-4333-8444-555555555555",
  });
  assert.equal(
    key,
    "professional-response:11111111-2222-4333-8444-555555555555"
  );
  assert.equal(createProfessionalResponseIdempotencyKey({}), null);
});

test("same normalized user command retains its key while changed content gets a new key", () => {
  let sequence = 0;
  const keyFactory = () => `professional-response:key-${++sequence}`;
  const first = prepareProfessionalResponseCommand(
    {},
    "  I can help.  ",
    { keyFactory }
  );
  const retry = prepareProfessionalResponseCommand(
    first,
    "I can help.",
    { keyFactory }
  );
  const changed = prepareProfessionalResponseCommand(
    first,
    "I can help tomorrow.",
    { keyFactory }
  );

  assert.equal(retry.idempotencyKey, first.idempotencyKey);
  assert.notEqual(changed.idempotencyKey, first.idempotencyKey);
  assert.equal(sequence, 2);
});

test("canonical result normalization preserves separate submitted and pending truth", () => {
  const result = normalizeProfessionalResponseResult(canonicalPayload());
  assert.equal(result.response.id, 901);
  assert.equal(result.response.status, "submitted");
  assert.equal(result.relationship.id, 501);
  assert.equal(result.relationship.status, "pending");
  assert.equal(result.relationship.authoritySource, "professional_response");
  assert.equal(Object.hasOwn(result, "conversation"), false);
});

test("malformed or authority-expanding results fail closed", () => {
  for (const payload of [
    null,
    {},
    canonicalPayload({ response: { ...canonicalPayload().response, status: "selected" } }),
    canonicalPayload({ relationship: { ...canonicalPayload().relationship, status: "active" } }),
    canonicalPayload({ relationship: { ...canonicalPayload().relationship, request_id: 42 } }),
    canonicalPayload({ resultClassification: "client" }),
  ]) {
    assert.equal(normalizeProfessionalResponseResult(payload), null);
  }
});

test("submission sends only approved content and idempotency transport then waits for backend truth", async () => {
  const calls = [];
  const result = await submitProfessionalResponse(
    {
      requestId: 41,
      introductionText: "  I can help with this repair.  ",
      idempotencyKey: "professional-response:command-1",
    },
    {
      setPage: () => {},
      authFetchImpl: async (...args) => {
        calls.push(args);
        return {
          response: { ok: true, status: 201 },
          data: canonicalPayload(),
        };
      },
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.response.status, "submitted");
  assert.equal(result.relationship.status, "pending");
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0][0],
    "/professional-request-opportunities/41/respond"
  );
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(calls[0][1].headers, {
    "Idempotency-Key": "professional-response:command-1",
  });
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    introduction_text: "I can help with this repair.",
  });
});

test("authorization, conflict, network, and malformed success errors remain deterministic", async () => {
  const command = {
    requestId: 41,
    introductionText: "I can help.",
    idempotencyKey: "professional-response:command-1",
  };
  const conflict = await submitProfessionalResponse(command, {
    authFetchImpl: async () => ({
      response: { ok: false, status: 409 },
      data: {
        code: "PROFESSIONAL_RESPONSE_IDEMPOTENCY_CONFLICT",
        message: "The idempotency key was already used for a different response.",
      },
    }),
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.status, 409);
  assert.equal(
    conflict.code,
    "PROFESSIONAL_RESPONSE_IDEMPOTENCY_CONFLICT"
  );

  const malformed = await submitProfessionalResponse(command, {
    authFetchImpl: async () => ({
      response: { ok: true, status: 201 },
      data: { success: true },
    }),
  });
  assert.equal(malformed.ok, false);

  const network = await submitProfessionalResponse(command, {
    authFetchImpl: async () => {
      throw new Error("private network detail");
    },
  });
  assert.equal(network.code, "PROFESSIONAL_RESPONSE_SUBMISSION_FAILED");
  assert.doesNotMatch(network.message, /private network detail/);
});

test("frontend response transport contains no browser persistence or canonical ID generation", () => {
  const source = readFileSync(
    new URL("../src/utils/professionalResponseApi.js", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /responseId\s*=\s*(?:Date\.now|Math\.random|randomUUID)/);
  assert.doesNotMatch(source, /relationshipId\s*=\s*(?:Date\.now|Math\.random|randomUUID)/);
  assert.match(source, /"Idempotency-Key": idempotencyKey/);
  assert.match(source, /JSON\.stringify\(\{ introduction_text: introduction \}\)/);
});
