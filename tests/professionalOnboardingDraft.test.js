import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeProfessionalOnboardingDraft,
  normalizeProfessionalOnboardingStep,
} from "../src/utils/professionalOnboardingDraft.js";

test("malformed cached onboarding values normalize before render", () => {
  const draft = normalizeProfessionalOnboardingDraft(
    {
      businessName: { stale: true },
      contactName: null,
      phone: 123,
      email: [],
      serviceCategories: "handyman",
      serviceSpecialties: { id: "painting" },
      primaryServiceCategory: false,
      otherService: { label: "legacy" },
      primaryCity: 42,
      zipCodes: null,
      serviceRadius: [],
      customRadius: {},
      availability: "Weekdays",
    },
    {
      businessName: "Canonical Business",
      contactName: "William Molina",
      email: "william@example.com",
    }
  );

  assert.deepEqual(draft, {
    businessName: "Canonical Business",
    contactName: "William Molina",
    phone: "",
    email: "william@example.com",
    serviceCategories: [],
    serviceSpecialties: [],
    primaryServiceCategory: "",
    otherService: "",
    primaryCity: "",
    zipCodes: "",
    serviceRadius: "15 miles",
    customRadius: "",
    availability: [],
  });

  assert.doesNotThrow(() => draft.otherService.trim());
  assert.doesNotThrow(() => draft.serviceSpecialties.includes("painting"));
  assert.doesNotThrow(() => draft.availability.map(String));
});

test("onboarding restoration clamps stale progress to a valid step", () => {
  assert.equal(normalizeProfessionalOnboardingStep("4"), 4);
  assert.equal(normalizeProfessionalOnboardingStep(7), 1);
  assert.equal(normalizeProfessionalOnboardingStep(null), 1);
  assert.equal(normalizeProfessionalOnboardingStep({}), 1);
});
