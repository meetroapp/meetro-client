import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCanonicalJobRequestPayload,
  classifyJobRequestCreateFailure,
  createSubmissionIntentKey,
  getCanonicalJobRequestPost,
  isCanonicalJobRequestCreateResponse,
} from "../src/utils/jobRequestSubmissionIntent.js";

test("submission intent keys are stable UUID-shaped secure values", () => {
  assert.equal(
    createSubmissionIntentKey({
      cryptoImpl: { randomUUID: () => "11111111-1111-4111-8111-111111111111" },
    }),
    "11111111-1111-4111-8111-111111111111"
  );

  const fallback = createSubmissionIntentKey({
    cryptoImpl: {
      getRandomValues(bytes) {
        bytes.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
        return bytes;
      },
    },
  });

  assert.match(fallback, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("canonical create success requires success code and backend post id", () => {
  const post = { id: 42, title: "Repair" };
  const created = {
    response: { ok: true, status: 201 },
    data: { success: true, code: "JOB_REQUEST_CREATED", post },
  };
  const replayed = {
    response: { ok: true, status: 200 },
    data: { success: true, code: "JOB_REQUEST_REPLAYED", post },
  };

  assert.equal(isCanonicalJobRequestCreateResponse(created), true);
  assert.equal(getCanonicalJobRequestPost(created), post);
  assert.equal(isCanonicalJobRequestCreateResponse(replayed), true);
  assert.equal(getCanonicalJobRequestPost(replayed), post);
  assert.equal(
    isCanonicalJobRequestCreateResponse({
      response: { ok: true },
      data: { success: true, code: "JOB_REQUEST_CREATED", post: { title: "No id" } },
    }),
    false
  );
  assert.equal(
    isCanonicalJobRequestCreateResponse({
      response: { ok: true },
      data: { success: true, code: "POST_CREATED", post },
    }),
    false
  );
});

test("failure classification separates conflict and ambiguous responses", () => {
  assert.equal(classifyJobRequestCreateFailure(new Error("lost response")), "ambiguous");
  assert.equal(
    classifyJobRequestCreateFailure({
      response: { ok: false, status: 409 },
      data: { code: "JOB_REQUEST_IDEMPOTENCY_CONFLICT" },
    }),
    "conflict"
  );
  assert.equal(
    classifyJobRequestCreateFailure({
      response: { ok: false, status: 400 },
      data: { code: "JOB_REQUEST_IDEMPOTENCY_KEY_REQUIRED" },
    }),
    "key"
  );
  assert.equal(
    classifyJobRequestCreateFailure({
      response: { ok: false, status: 403 },
      data: { code: "HOMEOWNER_AUTHORITY_REQUIRED" },
    }),
    "definitive"
  );
  assert.equal(
    classifyJobRequestCreateFailure({
      response: { ok: true, status: 200 },
      data: { success: true, code: "JOB_REQUEST_CREATED", post: {} },
    }),
    "ambiguous"
  );
});

test("canonical payload builder suppresses direct professional authority fields", () => {
  const payload = buildCanonicalJobRequestPayload({
    title: "  Paint room ",
    description: "  Paint the living room. ",
    category: "painting",
    requestMatchingFields: {
      requestCategory: "painting",
      service_domain: "home_services",
      service_specialty: "painting",
    },
    serviceLocation: {
      intakeMode: "exact_on_file",
      addressLine1: " 123 Palm Ave ",
      city: " Cape Coral ",
      region: " FL ",
      postalCode: " 33904 ",
      countryCode: " us ",
      unitNumber: " 2B ",
      accessNotes: " Call first ",
    },
    requestPhotoPayload: [{ purpose: "request-photo" }],
  });

  assert.deepEqual(payload, {
    title: "Paint room",
    description: "Paint the living room.",
    category: "painting",
    request_category: "painting",
    service_domain: "home_services",
    service_specialty: "painting",
    location_intake_mode: "exact_on_file",
    service_address_line1: "123 Palm Ave",
    service_city: "Cape Coral",
    service_region: "FL",
    service_postal_code: "33904",
    service_country_code: "US",
    unit_number: "2B",
    access_notes: "Call first",
    request_photos: [{ purpose: "request-photo" }],
  });
  assert.equal(Object.hasOwn(payload, "direct_request"), false);
  assert.equal(Object.hasOwn(payload, "post_type"), false);
  assert.equal(Object.hasOwn(payload, "direct_conversation_id"), false);
  assert.equal(Object.hasOwn(payload, "location_normalization_status"), false);
  assert.equal(Object.hasOwn(payload, "discovery_area_label"), false);
});

test("canonical payload builder omits street and unit for address-after-selection", () => {
  const payload = buildCanonicalJobRequestPayload({
    title: "Paint room",
    description: "Paint the living room.",
    category: "painting",
    requestMatchingFields: {
      requestCategory: "painting",
      service_domain: "home_services",
      service_specialty: "painting",
    },
    serviceLocation: {
      intakeMode: "address_after_selection",
      addressLine1: "123 Palm Ave",
      city: "Cape Coral",
      region: "FL",
      postalCode: "33904",
      countryCode: "us",
      unitNumber: "2B",
      accessNotes: "Call first",
    },
  });

  assert.equal(payload.location_intake_mode, "address_after_selection");
  assert.equal(payload.service_city, "Cape Coral");
  assert.equal(payload.service_country_code, "US");
  assert.equal(payload.access_notes, "Call first");
  assert.equal(Object.hasOwn(payload, "service_address_line1"), false);
  assert.equal(Object.hasOwn(payload, "unit_number"), false);
});
