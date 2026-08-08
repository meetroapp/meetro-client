import assert from "node:assert/strict";
import test from "node:test";

import {
  REQUEST_HELP_ERROR,
  getCanonicalCreatedRequest,
  getSupportedRequestHelpServices,
  validateRequestHelpSubmission,
} from "../src/utils/requestHelpSubmission.js";

const validSubmission = {
  title: "Repair a leaking kitchen faucet",
  category: "plumbing",
  serviceLocation: {
    intakeMode: "exact_on_file",
    addressLine1: "123 Main Street",
    city: "Fort Myers",
    region: "FL",
    postalCode: "33901",
    countryCode: "US",
  },
  matchingFields: {
    service_domain: "home_services",
    service_specialty: "plumbing_repairs",
  },
};

test("Request Help validates the exact server-required create fields", () => {
  assert.deepEqual(validateRequestHelpSubmission(validSubmission), {
    ok: true,
    errors: {},
  });

  assert.deepEqual(validateRequestHelpSubmission(), {
    ok: false,
    errors: {
      title: REQUEST_HELP_ERROR.TITLE_REQUIRED,
      category: REQUEST_HELP_ERROR.MATCH_REQUIRED,
      location: REQUEST_HELP_ERROR.LOCATION_REQUIRED,
    },
  });
});

test("Request Help validates address-after-selection locality without street or unit", () => {
  assert.deepEqual(
    validateRequestHelpSubmission({
      ...validSubmission,
      serviceLocation: {
        intakeMode: "address_after_selection",
        city: "Fort Myers",
        region: "FL",
        postalCode: "33901",
        countryCode: "US",
        accessNotes: "Call first",
      },
    }),
    { ok: true, errors: {} }
  );

  assert.equal(
    validateRequestHelpSubmission({
      ...validSubmission,
      serviceLocation: {
        intakeMode: "address_after_selection",
        addressLine1: "123 Main Street",
        city: "Fort Myers",
        region: "FL",
        postalCode: "33901",
        countryCode: "US",
      },
    }).errors.location,
    REQUEST_HELP_ERROR.LOCATION_REQUIRED
  );

  assert.equal(
    validateRequestHelpSubmission({
      ...validSubmission,
      serviceLocation: {
        intakeMode: "address_after_selection",
        city: "Fort Myers",
        region: "FL",
        postalCode: "33901",
        countryCode: "US",
        unitNumber: "4B",
      },
    }).errors.location,
    REQUEST_HELP_ERROR.LOCATION_REQUIRED
  );
});

test("Request Help rejects a display category without authoritative matching metadata", () => {
  const result = validateRequestHelpSubmission({
    ...validSubmission,
    matchingFields: { service_domain: "home_services", service_specialty: "" },
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.category, REQUEST_HELP_ERROR.MATCH_REQUIRED);
});

test("Request Help excludes unsupported domains and duplicate service options", () => {
  const services = getSupportedRequestHelpServices([
    { serviceId: "plumbing", domain: "home_services" },
    { serviceId: "plumbing", domain: "home_services" },
    { serviceId: "marketing", domain: "marketing" },
    { serviceId: "nursing", domain: "healthcare" },
  ]);

  assert.deepEqual(services.map((service) => service.serviceId), ["plumbing", "nursing"]);
  assert.equal(
    validateRequestHelpSubmission({
      ...validSubmission,
      matchingFields: { service_domain: "marketing", service_specialty: "marketing" },
    }).errors.category,
    REQUEST_HELP_ERROR.MATCH_REQUIRED
  );
});

test("Request Help accepts success only with an OK response and a canonical server ID", () => {
  const post = { id: "request-123", title: validSubmission.title };

  assert.equal(
    getCanonicalCreatedRequest({ response: { ok: true }, data: { post } }),
    post
  );
  assert.equal(
    getCanonicalCreatedRequest({ response: { ok: false }, data: { post } }),
    null
  );
  assert.equal(
    getCanonicalCreatedRequest({ response: { ok: true }, data: { post: { title: "No ID" } } }),
    null
  );
  assert.equal(getCanonicalCreatedRequest({ response: { ok: true }, data: {} }), null);
});
