import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProfessionalSpecialtyProfile,
} from "../src/utils/professionalOnboardingSpecialties.js";
import { enrichRequestWithMatchingFields } from "../src/utils/requestMatchingFields.js";
import {
  canProfessionalSeeLocalLead,
  getLocalLeadVisibilitySummary,
} from "../src/utils/localLeadVisibility.js";

function professional({
  category,
  domain = "home_services",
  specialties = [category],
  zip,
  city,
  latitude,
  longitude,
  serviceRadiusMiles,
} = {}) {
  return {
    ...buildProfessionalSpecialtyProfile({
      selectedSpecialties: specialties.filter(Boolean),
    }),
    businessCategory: category,
    businessServiceDomain: domain,
    businessServiceSpecialties: specialties,
    serviceZipCodes: zip,
    serviceCities: city,
    latitude,
    longitude,
    serviceRadiusMiles,
  };
}

function request(fields = {}) {
  return enrichRequestWithMatchingFields({
    title: fields.title,
    category: fields.category,
    zip: fields.zip,
    city: fields.city,
    latitude: fields.latitude,
    longitude: fields.longitude,
    localDemoSafe: fields.localDemoSafe,
  });
}

test("same domain and same zip is visible", () => {
  assert.equal(
    canProfessionalSeeLocalLead(
      professional({ category: "painting", specialties: ["painting"], zip: "33904" }),
      request({ title: "Interior painting", zip: "33904" })
    ),
    true
  );
});

test("same domain and different zip is hidden", () => {
  assert.equal(
    canProfessionalSeeLocalLead(
      professional({ category: "painting", specialties: ["painting"], zip: "33904" }),
      request({ title: "Interior painting", zip: "33101" })
    ),
    false
  );
});

test("different domain and same zip is hidden", () => {
  assert.equal(
    canProfessionalSeeLocalLead(
      professional({
        category: "handyman",
        domain: "home_services",
        specialties: ["handyman"],
        zip: "33904",
      }),
      request({ title: "Home health nurse visit", zip: "33904" })
    ),
    false
  );
});

test("coordinate request inside professional radius is visible", () => {
  assert.equal(
    canProfessionalSeeLocalLead(
      professional({
        category: "plumbing",
        specialties: ["plumbing"],
        latitude: 26.5629,
        longitude: -81.9495,
        serviceRadiusMiles: 15,
      }),
      request({
        title: "Kitchen plumbing leak",
        latitude: 26.6406,
        longitude: -81.8723,
      })
    ),
    true
  );
});

test("coordinate request outside professional radius is hidden", () => {
  const summary = getLocalLeadVisibilitySummary(
    professional({
      category: "plumbing",
      specialties: ["plumbing"],
      latitude: 26.5629,
      longitude: -81.9495,
      serviceRadiusMiles: 5,
    }),
    request({
      title: "Kitchen plumbing leak",
      latitude: 25.7617,
      longitude: -80.1918,
    })
  );

  assert.equal(summary.visible, false);
  assert.equal(summary.serviceMatched, true);
  assert.equal(summary.serviceArea.reason, "coordinate_radius_miss");
});

test("missing location fails closed unless the request is demo safe", () => {
  const painter = professional({
    category: "painting",
    specialties: ["painting"],
    zip: "33904",
  });

  assert.equal(
    canProfessionalSeeLocalLead(painter, request({ title: "Interior painting" })),
    false
  );
  assert.equal(
    canProfessionalSeeLocalLead(
      painter,
      request({ title: "Interior painting", localDemoSafe: true })
    ),
    true
  );
});

test("local TestFlight homeowner requests can bypass missing location after safe service match", () => {
  const handyman = professional({
    category: "handyman",
    specialties: ["handyman"],
    zip: "33904",
  });

  const localKitchenRequest = request({
    title: "Kitchen remodel request",
    category: "handyman",
  });
  localKitchenRequest.description = "Cabinet replacement";
  localKitchenRequest.serviceSpecialty = "cabinetry";
  localKitchenRequest.service_specialty = "cabinetry";
  localKitchenRequest.ownerUserId = "testflight-user";
  localKitchenRequest.requestId = "local-kitchen-remodel";
  localKitchenRequest.status = "open";

  const summary = getLocalLeadVisibilitySummary(handyman, localKitchenRequest);

  assert.equal(summary.serviceMatched, true);
  assert.equal(summary.serviceAreaMatched, true);
  assert.equal(summary.serviceArea.reason, "local_demo_safe");
  assert.equal(summary.visible, true);
});
