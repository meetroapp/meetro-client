import test from "node:test";
import assert from "node:assert/strict";

import {
  canProfessionalReceiveLead,
  getLeadEligibilitySummary,
} from "../utils/leadEligibility.js";

function professional({
  domain = "home_services",
  category = "handyman",
  specialties = [category],
  zip,
  city,
  latitude,
  longitude,
  serviceRadiusMiles,
} = {}) {
  return {
    serviceDomain: domain,
    businessCategory: category,
    serviceCategories: specialties,
    serviceSpecialties: specialties,
    serviceZipCodes: zip,
    serviceCities: city,
    latitude,
    longitude,
    serviceRadiusMiles,
  };
}

function request({
  domain = "home_services",
  category,
  zip,
  city,
  latitude,
  longitude,
  localDemoSafe,
} = {}) {
  return {
    serviceDomain: domain,
    category,
    zip,
    city,
    latitude,
    longitude,
    localDemoSafe,
  };
}

test("matching specialty and same zip is eligible", () => {
  assert.equal(
    canProfessionalReceiveLead(
      professional({ category: "painting", specialties: ["painting"], zip: "33904" }),
      request({ category: "painting", zip: "33904" })
    ),
    true
  );
});

test("matching specialty with different zip is blocked", () => {
  const summary = getLeadEligibilitySummary(
    professional({ category: "painting", specialties: ["painting"], zip: "33904" }),
    request({ category: "painting", zip: "33101" })
  );

  assert.equal(summary.eligible, false);
  assert.equal(summary.serviceMatched, false);
  assert.equal(summary.serviceArea, null);
});

test("wrong specialty with same zip is blocked", () => {
  const summary = getLeadEligibilitySummary(
    professional({ category: "painting", specialties: ["painting"], zip: "33904" }),
    request({ category: "electrical", zip: "33904" })
  );

  assert.equal(summary.eligible, false);
  assert.equal(summary.serviceMatched, false);
  assert.equal(summary.serviceArea, null);
});

test("healthcare request and handyman in same zip is blocked", () => {
  const summary = getLeadEligibilitySummary(
    professional({ category: "handyman", specialties: ["handyman"], zip: "33904" }),
    request({
      domain: "healthcare",
      category: "homeHealthCare",
      zip: "33904",
    })
  );

  assert.equal(summary.eligible, false);
  assert.equal(summary.serviceMatched, false);
});

test("unknown request with same zip is blocked", () => {
  const summary = getLeadEligibilitySummary(
    professional({ category: "handyman", specialties: ["handyman"], zip: "33904" }),
    request({
      domain: "unknown_service",
      category: "mystery_help",
      zip: "33904",
    })
  );

  assert.equal(summary.eligible, false);
  assert.equal(summary.serviceMatched, false);
});

test("coordinate inside radius and correct specialty is eligible", () => {
  assert.equal(
    canProfessionalReceiveLead(
      professional({
        category: "plumbing",
        specialties: ["plumbing"],
        latitude: 26.5629,
        longitude: -81.9495,
        serviceRadiusMiles: 15,
      }),
      request({
        category: "plumbing",
        latitude: 26.6406,
        longitude: -81.8723,
      })
    ),
    true
  );
});

test("coordinate outside radius and correct specialty is blocked", () => {
  const summary = getLeadEligibilitySummary(
    professional({
      category: "plumbing",
      specialties: ["plumbing"],
      latitude: 26.5629,
      longitude: -81.9495,
      serviceRadiusMiles: 5,
    }),
    request({
      category: "plumbing",
      latitude: 25.7617,
      longitude: -80.1918,
    })
  );

  assert.equal(summary.eligible, false);
  assert.equal(summary.serviceMatched, true);
  assert.equal(summary.serviceArea.reason, "coordinate_radius_miss");
});

test("missing location with demo safe and correct specialty is eligible", () => {
  assert.equal(
    canProfessionalReceiveLead(
      professional({ category: "doorReplacement", specialties: ["doorReplacement"] }),
      request({
        category: "doorReplacement",
        localDemoSafe: true,
      })
    ),
    true
  );
});

test("missing location with demo safe and wrong domain is blocked", () => {
  const summary = getLeadEligibilitySummary(
    professional({ category: "handyman", specialties: ["handyman"] }),
    request({
      domain: "healthcare",
      category: "nursing",
      localDemoSafe: true,
    })
  );

  assert.equal(summary.eligible, false);
  assert.equal(summary.serviceMatched, false);
  assert.equal(summary.serviceArea, null);
});
