import assert from "node:assert/strict";
import test from "node:test";
import {
  getCommunityDiscoveryInterestsFromTaxonomy,
  getCommunityTaxonomyEcosystem,
  getCommunityTaxonomyEcosystemForCapabilityGroup,
  getCommunityTaxonomyEcosystems,
  getProfessionalSignupCategoriesFromTaxonomy,
  searchCommunityTaxonomyAliases,
  validateCommunityTaxonomyReferences,
} from "../src/utils/communityTaxonomy.js";
import { PROFESSIONAL_CAPABILITY_LIBRARY } from "../src/utils/professionalCapabilityLibrary.js";

test("Master Community Taxonomy exports the shared ecosystems", () => {
  const ecosystems = getCommunityTaxonomyEcosystems();
  assert.deepEqual(
    ecosystems.map((ecosystem) => ecosystem.id),
    [
      "home_services",
      "property_management",
      "real_estate",
      "business_services",
      "marketing",
      "creative",
      "financial",
      "legal",
      "healthcare",
      "transportation",
      "education",
      "other",
    ]
  );
  ecosystems.forEach((ecosystem) => {
    assert.equal(typeof ecosystem.label, "string");
    assert.equal(typeof ecosystem.description, "string");
    assert.ok(Array.isArray(ecosystem.aliases));
    assert.ok(Array.isArray(ecosystem.children));
    assert.equal(typeof ecosystem.icon, "string");
  });
});

test("taxonomy references existing capability groups without renaming IDs", () => {
  assert.deepEqual(validateCommunityTaxonomyReferences(), []);

  const capabilityIds = new Set(
    PROFESSIONAL_CAPABILITY_LIBRARY.map((group) => group.id)
  );
  [
    "handyman",
    "cleaning_services",
    "pool_services",
    "property_management",
    "professional_services",
    "healthcare",
    "transportation",
  ].forEach((capabilityId) => {
    assert.equal(capabilityIds.has(capabilityId), true);
    assert.ok(getCommunityTaxonomyEcosystemForCapabilityGroup(capabilityId));
  });
});

test("Community Discovery Interests project from taxonomy", () => {
  const interests = getCommunityDiscoveryInterestsFromTaxonomy({
    translate: (key, fallback) => `${key}:${fallback}`,
  });

  assert.equal(interests.some((interest) => interest.id === "other"), false);
  assert.ok(interests.find((interest) => interest.id === "home_services"));
  assert.ok(interests.find((interest) => interest.id === "financial"));
  assert.equal(
    interests.find((interest) => interest.id === "marketing")?.label,
    "communityInterestMarketing:Marketing"
  );
  assert.ok(
    interests
      .find((interest) => interest.id === "home_services")
      ?.keywords.includes("pool_services")
  );
});

test("Professional Signup categories project from taxonomy while preserving legacy values", () => {
  const categories = getProfessionalSignupCategoriesFromTaxonomy({
    translate: (_key, fallback) => fallback,
  });
  const values = categories.map((category) => category.value);

  [
    "professional",
    "contractor",
    "handyman",
    "applianceRepair",
    "automotiveServices",
    "carDetailing",
    "carpentry",
    "cleaning",
    "concrete",
    "demolition",
    "doorsWindows",
    "drywall",
    "electrical",
    "fencing",
    "flooring",
    "homeHealthCare",
    "hvac",
    "junkRemoval",
    "landscaping",
    "lawnCare",
    "mechanic",
    "mobileServices",
    "moving",
    "painting",
    "paverSealing",
    "pestControl",
    "plumbing",
    "poolService",
    "pressureWashing",
    "privateTransportation",
    "realEstate",
    "propertyManagement",
    "roofing",
    "tile",
    "treeService",
    "other",
  ].forEach((legacyValue) => {
    assert.equal(values.includes(legacyValue), true, legacyValue);
  });

  assert.equal(new Set(values).size, values.length);
});

test("taxonomy aliases translate problem language into ecosystems", () => {
  assert.equal(searchCommunityTaxonomyAliases("I need more customers")[0]?.id, "marketing");
  assert.equal(searchCommunityTaxonomyAliases("I need help with taxes")[0]?.id, "financial");
  assert.equal(searchCommunityTaxonomyAliases("I need a logo")[0]?.id, "creative");
  assert.equal(getCommunityTaxonomyEcosystem("missing"), null);
  assert.deepEqual(searchCommunityTaxonomyAliases("not-a-real-community-need"), []);
});
