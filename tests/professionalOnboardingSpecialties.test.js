import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProfessionalSpecialtyProfile,
  getDomainForProfessionalSpecialty,
  getProfessionalOnboardingSpecialtyValues,
  getProfessionalSpecialtyLabel,
  inferProfessionalSpecialtiesFromLegacyCategories,
  normalizeSelectedSpecialties,
} from "../src/utils/professionalOnboardingSpecialties.js";

test("exports the onboarding specialty values used by professional setup", () => {
  const values = getProfessionalOnboardingSpecialtyValues();

  assert.ok(values.includes("handyman"));
  assert.ok(values.includes("garage_door_opener_installation"));
  assert.ok(values.includes("door_replacement"));
  assert.ok(values.includes("painting"));
  assert.ok(values.includes("drywall"));
  assert.ok(values.includes("plumbing_repairs"));
  assert.ok(values.includes("plumbing"));
  assert.ok(values.includes("ceiling_fan_installation"));
  assert.ok(values.includes("electrical"));
  assert.ok(values.includes("tile"));
  assert.ok(values.includes("cabinetry"));
  assert.ok(values.includes("flooring"));
  assert.ok(values.includes("pressure_washing"));
  assert.ok(values.includes("appliance_installation"));
  assert.ok(values.includes("general_maintenance"));
  assert.ok(values.includes("home_health"));
  assert.ok(values.includes("senior_care"));
  assert.ok(values.includes("nursing"));
  assert.ok(values.includes("caregiver"));
  assert.ok(values.includes("medical_transport"));
  assert.ok(values.includes("tenant_ticket"));
  assert.ok(values.includes("rental_maintenance"));
  assert.ok(values.includes("inspection"));
  assert.ok(values.includes("unit_turnover"));
  assert.ok(values.includes("vendor_dispatch"));
  assert.ok(values.includes("private_transportation"));
});

test("maps onboarding specialties to their matching domains", () => {
  assert.equal(getDomainForProfessionalSpecialty("door_replacement"), "home_services");
  assert.equal(getDomainForProfessionalSpecialty("nursing"), "healthcare");
  assert.equal(getDomainForProfessionalSpecialty("tenant_ticket"), "property_management");
  assert.equal(getDomainForProfessionalSpecialty("private_transportation"), "transportation");
  assert.equal(getDomainForProfessionalSpecialty("unknown_specialty"), "");
});

test("returns homeowner-safe labels for specialty display", () => {
  const labels = {
    professionalOnboardingSpecialtyDoorReplacement: "Door Replacement",
    professionalOnboardingSpecialtyMedicalTransport: "Medical Transport",
  };
  const translate = (key) => labels[key] || key;

  assert.equal(
    getProfessionalSpecialtyLabel("door_replacement", translate),
    "Door Replacement"
  );
  assert.equal(
    getProfessionalSpecialtyLabel("medical_transport", translate),
    "Medical Transport"
  );
  assert.equal(getProfessionalSpecialtyLabel("unknown_specialty", translate), "");
});


test("normalizes selected specialties and fails safely for unknown values", () => {
  assert.deepEqual(
    normalizeSelectedSpecialties([
      "painting",
      "painting",
      "unknown_specialty",
      "nursing",
    ]),
    ["painting", "nursing"]
  );
});

test("builds local professional profile fields for selected specialties", () => {
  const profile = buildProfessionalSpecialtyProfile({
    serviceSpecialties: ["door_replacement", "painting"],
  });

  assert.equal(profile.serviceDomain, "home_services");
  assert.deepEqual(profile.serviceDomains, ["home_services"]);
  assert.deepEqual(profile.serviceSpecialties, ["door_replacement", "painting"]);
  assert.deepEqual(profile.serviceCategories, ["Door Replacement", "Painting"]);
});

test("preserves legacy compatibility by deriving specialties from old categories", () => {
  assert.deepEqual(
    inferProfessionalSpecialtiesFromLegacyCategories([
      "Handyman",
      "Painting",
      "Property Maintenance",
    ]),
    ["handyman", "painting", "rental_maintenance"]
  );
});

test("keeps other-only onboarding fail-closed for matching while preserving a category fallback", () => {
  const profile = buildProfessionalSpecialtyProfile({
    serviceSpecialties: [],
    otherService: "Custom future service",
  });

  assert.equal(profile.serviceDomain, "");
  assert.deepEqual(profile.serviceDomains, []);
  assert.deepEqual(profile.serviceSpecialties, []);
  assert.deepEqual(profile.serviceCategories, ["Other"]);
});
