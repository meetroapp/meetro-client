import assert from "node:assert/strict";
import test from "node:test";

import {
  getRequesterResponseInbox,
  normalizeRequesterResponseInbox,
} from "../src/utils/requestResponseInboxApi.js";

const opaqueResponseId = "900719925474099312345";

function payload(overrides = {}) {
  return {
    success: true,
    relationships: [{
      id: 344,
      request_id: 22,
      response_id: opaqueResponseId,
      response_status: "submitted",
      relationship_status: "pending",
      authority_source: "professional_response",
      request_title: "Repair cracked wall section by front entry",
      business_name: "All Handyman Services",
      business_image_url: "https://example.test/business.jpg",
      professional_category: "Structural Repairs",
      introduction_text: "I can inspect and repair this wall.",
      submitted_at: "2026-08-25T12:00:00.000Z",
      ...overrides,
    }],
  };
}

test("requester response inbox preserves BIGSERIAL response identity as an opaque string", () => {
  const responses = normalizeRequesterResponseInbox(payload());
  assert.equal(responses.length, 1);
  assert.equal(responses[0].responseId, opaqueResponseId);
  assert.equal(typeof responses[0].responseId, "string");
  assert.equal(responses[0].unresolved, true);
  assert.equal(responses[0].selected, false);
});

test("requester response inbox accepts canonical selected state and rejects authority contradictions", () => {
  const selected = normalizeRequesterResponseInbox(payload({
    response_status: "selected",
    relationship_status: "active",
  }));
  assert.equal(selected[0].selected, true);
  assert.equal(selected[0].unresolved, false);

  assert.equal(normalizeRequesterResponseInbox(payload({
    response_status: "selected",
    relationship_status: "pending",
  })), null);
  assert.equal(normalizeRequesterResponseInbox(payload({
    authority_source: "legacy_relationship",
  })), null);
});

test("requester response inbox ignores legacy relationship rows and exposes no private address fields", () => {
  const result = normalizeRequesterResponseInbox({
    success: true,
    relationships: [{ id: 5, request_id: 22, response_id: null }],
  });
  assert.deepEqual(result, []);

  const serialized = JSON.stringify(normalizeRequesterResponseInbox(payload({
    street_address: "123 Private Street",
    unit_number: "4B",
    access_notes: "Gate code",
  })));
  assert.doesNotMatch(serialized, /Private Street|4B|Gate code|street_address|unit_number|access_notes/);
});

test("requester response inbox uses one authenticated read-only projection", async () => {
  const calls = [];
  const result = await getRequesterResponseInbox({
    authFetchImpl: async (...args) => {
      calls.push(args);
      return { response: { ok: true, status: 200 }, data: payload() };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.responses[0].responseId, opaqueResponseId);
  assert.deepEqual(calls[0].slice(0, 2), [
    "/my-request-relationships",
    { cache: "no-store" },
  ]);
});
