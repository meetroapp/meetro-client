import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProfessionalSpecialtyProfile,
} from "../src/utils/professionalOnboardingSpecialties.js";
import {
  buildRequestMatchingFields,
} from "../src/utils/requestMatchingFields.js";
import {
  SERVICE_DOMAIN_CATEGORIES as FRONTEND_DOMAIN_CATEGORIES,
  canProfessionalReceiveRequest as frontendCanReceive,
  getRequestMatchSummary as getFrontendSummary,
  inferServiceDomain as frontendInferDomain,
  normalizeServiceCategory as frontendNormalizeCategory,
} from "../src/utils/professionalRequestMatching.js";
import {
  SERVICE_DOMAIN_CATEGORIES as BACKEND_DOMAIN_CATEGORIES,
  canProfessionalReceiveRequest as backendCanReceive,
  getRequestMatchSummary as getBackendSummary,
  inferServiceDomain as backendInferDomain,
  normalizeServiceCategory as backendNormalizeCategory,
} from "../server/utils/professionalRequestMatching.js";

const MATCHING_PARITY_CONTRACT = Object.freeze({
  supportedDomains: Object.freeze([
    "healthcare",
    "home_services",
    "property_management",
    "transportation",
  ]),
  normalizedCategories: Object.freeze([
    ["homeHealthCare", "home_health", "healthcare"],
    ["home_healthcare", "home_health", "healthcare"],
    ["seniorCare", "senior_care", "healthcare"],
    ["doorInstallation", "door_installation", "home_services"],
    ["doorReplacement", "door_replacement", "home_services"],
    ["painting", "painting", "home_services"],
    ["drywall", "drywall", "home_services"],
    ["generalMaintenance", "general_maintenance", "home_services"],
    ["medicalTransport", "medical_transport", "healthcare"],
    ["tenantTicket", "tenant_ticket", "property_management"],
    ["vendorDispatch", "vendor_dispatch", "property_management"],
    ["privateTransportation", "private_transportation", "transportation"],
  ]),
  allowedExamples: Object.freeze([
    {
      name: "saved door replacement request to door specialty",
      professional: {
        ...buildProfessionalSpecialtyProfile({
          selectedSpecialties: ["door_replacement"],
        }),
        businessCategory: "doorReplacement",
        businessServiceDomain: "home_services",
        businessServiceSpecialties: ["door_replacement"],
      },
      request: buildRequestMatchingFields({ title: "Front door replacement" }),
    },
    {
      name: "saved door replacement request to safe general handyman",
      professional: {
        ...buildProfessionalSpecialtyProfile({
          selectedSpecialties: ["handyman"],
        }),
        businessCategory: "handyman",
        businessServiceDomain: "home_services",
        businessServiceSpecialties: ["handyman"],
      },
      request: buildRequestMatchingFields({ title: "Front door replacement" }),
    },
    {
      name: "door repair to handyman",
      professional: {
        businessCategory: "handyman",
        serviceCategories: ["handyman"],
      },
      request: { category: "doorRepair" },
    },
    {
      name: "saved painting request to painter",
      professional: {
        ...buildProfessionalSpecialtyProfile({
          selectedSpecialties: ["painting"],
        }),
        businessCategory: "painting",
        businessServiceDomain: "home_services",
        businessServiceSpecialties: ["painting"],
      },
      request: buildRequestMatchingFields({ title: "Interior painting" }),
    },
    {
      name: "drywall repair to handyman",
      professional: {
        businessCategory: "handyman",
        serviceCategories: ["handyman"],
      },
      request: { category: "drywallRepair" },
    },
    {
      name: "rental maintenance to property maintenance",
      professional: {
        businessCategory: "propertyMaintenance",
        serviceCategories: ["propertyMaintenance"],
      },
      request: { category: "rentalMaintenance" },
    },
    {
      name: "saved tenant ticket request to explicitly eligible property professional",
      professional: {
        ...buildProfessionalSpecialtyProfile({
          selectedSpecialties: ["tenant_ticket"],
        }),
        businessCategory: "propertyMaintenance",
        businessServiceDomain: "property_management",
        businessServiceSpecialties: ["tenant_ticket"],
      },
      request: buildRequestMatchingFields({
        title: "Tenant maintenance ticket for Unit 204",
      }),
    },
    {
      name: "private transportation to transportation professional",
      professional: {
        businessCategory: "transportation",
        serviceCategories: ["privateTransportation"],
      },
      request: { category: "privateTransportation" },
    },
  ]),
  blockedExamples: Object.freeze([
    {
      name: "unknown request domain to handyman",
      professional: {
        businessCategory: "handyman",
        serviceCategories: ["handyman"],
      },
      request: { category: "mystery_future_service" },
    },
    {
      name: "unknown professional domain to home-service request",
      professional: {
        serviceDomain: "future_industry",
        businessCategory: "future_service",
        serviceCategories: ["future_service"],
      },
      request: { category: "doorRepair" },
    },
    {
      name: "home healthcare to handyman",
      professional: {
        businessCategory: "handyman",
        serviceCategories: ["handyman"],
      },
      request: { category: "homeHealthCare" },
    },
    {
      name: "nursing to handyman",
      professional: {
        businessCategory: "handyman",
        serviceCategories: ["handyman"],
      },
      request: { category: "nursing" },
    },
    {
      name: "medical care to painter",
      professional: {
        businessCategory: "painting",
        serviceCategories: ["painting"],
      },
      request: { category: "medicalCare" },
    },
    {
      name: "electrical does not match painter",
      professional: {
        businessCategory: "painting",
        serviceCategories: ["painting"],
      },
      request: { category: "electrical" },
    },
    {
      name: "tenant ticket does not match handyman without explicit eligibility",
      professional: {
        businessCategory: "handyman",
        serviceCategories: ["handyman"],
      },
      request: { category: "tenantTicket" },
    },
    {
      name: "healthcare emergency to emergency-ready handyman",
      professional: {
        businessCategory: "handyman",
        serviceCategories: ["handyman"],
        emergencyAvailable: true,
      },
      request: {
        category: "homeHealthCare",
        type: "emergency",
        urgency: "critical",
      },
    },
  ]),
});

function sorted(value) {
  return [...value].sort();
}

function sortedDomainCategories(registry) {
  return Object.fromEntries(
    Object.entries(registry).map(([domain, categories]) => [
      domain,
      sorted(categories),
    ])
  );
}

test("frontend and backend expose the same supported matching domains", () => {
  assert.deepEqual(
    sorted(Object.keys(FRONTEND_DOMAIN_CATEGORIES)),
    MATCHING_PARITY_CONTRACT.supportedDomains
  );
  assert.deepEqual(
    sorted(Object.keys(BACKEND_DOMAIN_CATEGORIES)),
    MATCHING_PARITY_CONTRACT.supportedDomains
  );
});

test("frontend and backend expose matching domain category registries", () => {
  assert.deepEqual(
    sortedDomainCategories(BACKEND_DOMAIN_CATEGORIES),
    sortedDomainCategories(FRONTEND_DOMAIN_CATEGORIES)
  );
});

test("frontend and backend normalize documented categories the same way", () => {
  MATCHING_PARITY_CONTRACT.normalizedCategories.forEach(
    ([input, expectedCategory, expectedDomain]) => {
      assert.equal(frontendNormalizeCategory(input), expectedCategory);
      assert.equal(backendNormalizeCategory(input), expectedCategory);
      assert.equal(frontendInferDomain(input), expectedDomain);
      assert.equal(backendInferDomain(input), expectedDomain);
    }
  );
});

test("frontend and backend return matching results for allowed examples", () => {
  MATCHING_PARITY_CONTRACT.allowedExamples.forEach(
    ({ name, professional, request }) => {
      const frontendSummary = getFrontendSummary(professional, request);
      const backendSummary = getBackendSummary(professional, request);

      assert.equal(frontendCanReceive(professional, request), true, name);
      assert.equal(backendCanReceive(professional, request), true, name);
      assert.equal(frontendSummary.matched, backendSummary.matched, name);
      assert.equal(frontendSummary.requestDomain, backendSummary.requestDomain, name);
      assert.equal(
        frontendSummary.professionalDomain,
        backendSummary.professionalDomain,
        name
      );
    }
  );
});

test("frontend and backend fail closed for blocked examples", () => {
  MATCHING_PARITY_CONTRACT.blockedExamples.forEach(
    ({ name, professional, request }) => {
      const frontendSummary = getFrontendSummary(professional, request);
      const backendSummary = getBackendSummary(professional, request);

      assert.equal(frontendCanReceive(professional, request), false, name);
      assert.equal(backendCanReceive(professional, request), false, name);
      assert.equal(frontendSummary.matched, backendSummary.matched, name);
    }
  );
});

test("saved homeowner request fields match frontend and backend matcher contracts", () => {
  const request = buildRequestMatchingFields({ title: "Outlet not working" });
  const painter = {
    ...buildProfessionalSpecialtyProfile({
      selectedSpecialties: ["painting"],
    }),
    businessServiceDomain: "home_services",
    businessServiceDomains: ["home_services"],
    businessServiceSpecialties: ["painting"],
  };
  const electrician = {
    ...buildProfessionalSpecialtyProfile({
      selectedSpecialties: ["electrical"],
    }),
    businessServiceDomain: "home_services",
    businessServiceDomains: ["home_services"],
    businessServiceSpecialties: ["electrical"],
  };

  assert.equal(request.serviceDomain, "home_services");
  assert.equal(request.service_domain, "home_services");
  assert.equal(request.requestCategory, "electrical");
  assert.equal(request.request_category, "electrical");
  assert.equal(request.category, "electrical");
  assert.equal(request.serviceSpecialty, "electrical");
  assert.equal(request.service_specialty, "electrical");

  assert.equal(frontendCanReceive(electrician, request), true);
  assert.equal(backendCanReceive(electrician, request), true);
  assert.equal(frontendCanReceive(painter, request), false);
  assert.equal(backendCanReceive(painter, request), false);
});

test("unknown saved request fields fail closed with no safe default", () => {
  const request = buildRequestMatchingFields({
    title: "Mystery future service",
    category: "mystery_future_service",
  });
  const handyman = {
    ...buildProfessionalSpecialtyProfile({
      selectedSpecialties: ["handyman"],
    }),
    businessServiceDomain: "home_services",
    businessServiceSpecialties: ["handyman"],
  };

  assert.equal(request.serviceDomain, "");
  assert.equal(request.service_domain, "");
  assert.equal(request.serviceSpecialty, "");
  assert.equal(request.service_specialty, "");
  assert.equal(frontendCanReceive(handyman, request), false);
  assert.equal(backendCanReceive(handyman, request), false);
});
