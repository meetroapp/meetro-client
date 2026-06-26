import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  canProfessionalReceiveLead,
  getLeadEligibilitySummary,
} from "../src/utils/leadEligibility.js";
import {
  canProfessionalReceiveLead as canBackendProfessionalReceiveLead,
} from "../server/utils/leadEligibility.js";

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
    businessServiceDomain: domain,
    businessCategory: category,
    category,
    serviceCategories: specialties,
    businessServiceSpecialties: specialties,
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

const parityCases = [
  {
    name: "matching specialty and same zip is eligible",
    professional: professional({
      category: "painting",
      specialties: ["painting"],
      zip: "33904",
    }),
    request: request({ category: "painting", zip: "33904" }),
    expected: true,
  },
  {
    name: "matching specialty with different zip is blocked",
    professional: professional({
      category: "painting",
      specialties: ["painting"],
      zip: "33904",
    }),
    request: request({ category: "painting", zip: "33101" }),
    expected: false,
  },
  {
    name: "wrong specialty with same zip is blocked",
    professional: professional({
      category: "painting",
      specialties: ["painting"],
      zip: "33904",
    }),
    request: request({ category: "electrical", zip: "33904" }),
    expected: false,
  },
  {
    name: "healthcare request and handyman in same zip is blocked",
    professional: professional({
      category: "handyman",
      specialties: ["handyman"],
      zip: "33904",
    }),
    request: request({
      domain: "healthcare",
      category: "homeHealthCare",
      zip: "33904",
    }),
    expected: false,
  },
  {
    name: "unknown request with same zip is blocked",
    professional: professional({
      category: "handyman",
      specialties: ["handyman"],
      zip: "33904",
    }),
    request: request({
      domain: "unknown_service",
      category: "mystery_help",
      zip: "33904",
    }),
    expected: false,
  },
  {
    name: "coordinate inside radius and correct specialty is eligible",
    professional: professional({
      category: "plumbing",
      specialties: ["plumbing"],
      latitude: 26.5629,
      longitude: -81.9495,
      serviceRadiusMiles: 15,
    }),
    request: request({
      category: "plumbing",
      latitude: 26.6406,
      longitude: -81.8723,
    }),
    expected: true,
  },
  {
    name: "coordinate outside radius and correct specialty is blocked",
    professional: professional({
      category: "plumbing",
      specialties: ["plumbing"],
      latitude: 26.5629,
      longitude: -81.9495,
      serviceRadiusMiles: 5,
    }),
    request: request({
      category: "plumbing",
      latitude: 25.7617,
      longitude: -80.1918,
    }),
    expected: false,
  },
  {
    name: "missing location with demo safe and correct specialty is eligible",
    professional: professional({
      category: "doorReplacement",
      specialties: ["doorReplacement"],
    }),
    request: request({
      category: "doorReplacement",
      localDemoSafe: true,
    }),
    expected: true,
  },
  {
    name: "missing location with demo safe and wrong domain is blocked",
    professional: professional({
      category: "handyman",
      specialties: ["handyman"],
    }),
    request: request({
      domain: "healthcare",
      category: "nursing",
      localDemoSafe: true,
    }),
    expected: false,
  },
];

for (const parityCase of parityCases) {
  test(`frontend lead eligibility: ${parityCase.name}`, () => {
    assert.equal(
      canProfessionalReceiveLead(parityCase.professional, parityCase.request),
      parityCase.expected
    );
  });

  test(`frontend/backend lead eligibility parity: ${parityCase.name}`, () => {
    assert.equal(
      canProfessionalReceiveLead(parityCase.professional, parityCase.request),
      canBackendProfessionalReceiveLead(parityCase.professional, parityCase.request)
    );
  });
}

test("demo safe does not bypass wrong domain or wrong specialty", () => {
  const wrongDomainSummary = getLeadEligibilitySummary(
    professional({ category: "handyman", specialties: ["handyman"] }),
    request({
      domain: "healthcare",
      category: "nursing",
      localDemoSafe: true,
    })
  );

  assert.equal(wrongDomainSummary.eligible, false);
  assert.equal(wrongDomainSummary.serviceMatched, false);
  assert.equal(wrongDomainSummary.serviceArea, null);

  const wrongSpecialtySummary = getLeadEligibilitySummary(
    professional({ category: "painting", specialties: ["painting"] }),
    request({
      category: "electrical",
      localDemoSafe: true,
    })
  );

  assert.equal(wrongSpecialtySummary.eligible, false);
  assert.equal(wrongSpecialtySummary.serviceMatched, false);
  assert.equal(wrongSpecialtySummary.serviceArea, null);
});

test("lead eligibility contract document references the active helper gates", () => {
  const contract = readFileSync(
    "docs/KnowledgeBase/LEAD_ELIGIBILITY_MATCHING_CONTRACT.md",
    "utf8"
  );

  assert.match(contract, /canProfessionalReceiveRequest/);
  assert.match(contract, /canProfessionalServeArea/);
  assert.match(contract, /canProfessionalReceiveLead/);
  assert.match(contract, /Wrong domain must always block/);
  assert.match(contract, /Demo\/local-safe exists only/);
  assert.match(contract, /future backend lead distribution/i);
});
