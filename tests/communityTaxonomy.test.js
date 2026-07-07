import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getBusinessProfileCapabilityOptionsFromTaxonomy,
  getBusinessProfileCategoryOptionsFromTaxonomy,
  getCommunityDiscoveryInterestsFromTaxonomy,
  getCommunityTaxonomyEcosystem,
  getCommunityTaxonomyEcosystemForCapabilityGroup,
  getCommunityTaxonomyEcosystems,
  getProfessionalSignupOptions,
  getProfessionalSignupCategoriesFromTaxonomy,
  resolveCommunityDiscoveryInterestForSearch,
  searchCommunityTaxonomyAliases,
  validateCommunityTaxonomyReferences,
} from "../src/utils/communityTaxonomy.js";
import { PROFESSIONAL_CAPABILITY_LIBRARY } from "../src/utils/professionalCapabilityLibrary.js";

const professionalOnboardingSource = readFileSync(
  new URL("../src/pages/ProfessionalOnboarding.jsx", import.meta.url),
  "utf8"
);
const contractorProfileSource = readFileSync(
  new URL("../src/pages/ContractorProfile.jsx", import.meta.url),
  "utf8"
);

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
    "marketing_services",
    "healthcare",
    "transportation",
  ].forEach((capabilityId) => {
    assert.equal(capabilityIds.has(capabilityId), true);
    assert.ok(getCommunityTaxonomyEcosystemForCapabilityGroup(capabilityId));
  });
});

test("Marketing ecosystem represents capabilities without identity labels", () => {
  const marketing = getCommunityTaxonomyEcosystem("marketing");
  const marketingCapabilityIds = marketing.children.map((child) => child.id);
  const forbiddenIdentityLabels = [
    "marketing_agency",
    "marketing_firm",
    "consulting_company",
    "llc",
    "corporation",
    "studio",
    "agency",
    "business_owner",
  ];

  [
    "marketing_strategy",
    "digital_marketing",
    "seo",
    "local_seo",
    "ppc_advertising",
    "social_media_marketing",
    "content_marketing",
    "email_marketing",
    "brand_strategy",
    "brand_identity",
    "graphic_design",
    "website_design",
    "website_development",
    "copywriting",
    "photography",
    "videography",
    "marketing_analytics",
    "public_relations",
    "marketing_consulting",
  ].forEach((capabilityId) => {
    assert.ok(marketingCapabilityIds.includes(capabilityId), capabilityId);
  });

  forbiddenIdentityLabels.forEach((identityLabel) => {
    assert.equal(marketingCapabilityIds.includes(identityLabel), false);
  });
  assert.ok(
    marketing.children.every(
      (child) => child.capabilityGroupId === "marketing_services"
    )
  );
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

test("Business Profile category and capability options share the taxonomy vocabulary", () => {
  const translate = (_key, fallback) => fallback;
  const signupCategories = getProfessionalSignupOptions({ translate });
  const profileCategories = getBusinessProfileCategoryOptionsFromTaxonomy({
    translate,
  });
  const profileCapabilities = getBusinessProfileCapabilityOptionsFromTaxonomy({
    translate,
  });

  assert.deepEqual(
    profileCategories.map((category) => category.value),
    signupCategories.map((category) => category.value)
  );
  assert.ok(
    profileCategories.find(
      (category) =>
        category.value === "propertyManagement" &&
        category.taxonomyEcosystemId === "property_management"
    )
  );
  assert.ok(
    profileCapabilities.find(
      (category) =>
        category.id === "cleaning_services" &&
        category.legacySignupValue === "cleaning" &&
        category.taxonomyEcosystemId === "home_services"
    )
  );
  assert.ok(profileCapabilities.find((category) => category.id === "pool_services"));
  assert.ok(
    profileCapabilities.find(
      (category) =>
        category.id === "marketing_services" &&
        category.legacySignupValue === "marketingServices" &&
        category.taxonomyEcosystemId === "marketing"
    )
  );
  assert.equal(
    new Set(profileCapabilities.map((category) => category.id)).size,
    profileCapabilities.length
  );
});

test("professional setup surfaces consume taxonomy projections instead of duplicate category lists", () => {
  assert.match(
    professionalOnboardingSource,
    /getBusinessProfileCapabilityOptionsFromTaxonomy/
  );
  assert.match(
    contractorProfileSource,
    /getBusinessProfileCategoryOptionsFromTaxonomy/
  );
  assert.match(
    contractorProfileSource,
    /getBusinessProfileCapabilityOptionsFromTaxonomy/
  );
  assert.doesNotMatch(
    contractorProfileSource,
    /\["contractor", t\("generalContractor"\)\]/
  );
  assert.doesNotMatch(
    contractorProfileSource,
    /\["propertyManagement", t\("propertyManagement"\)\]/
  );
  assert.doesNotMatch(
    professionalOnboardingSource,
    /getProfessionalCapabilityCategories\(\)/
  );
  assert.doesNotMatch(
    contractorProfileSource,
    /getProfessionalCapabilityCategories\(\)/
  );
});

test("taxonomy aliases translate problem language into ecosystems", () => {
  assert.equal(searchCommunityTaxonomyAliases("I need more customers")[0]?.id, "marketing");
  assert.equal(searchCommunityTaxonomyAliases("I need help with taxes")[0]?.id, "financial");
  assert.equal(searchCommunityTaxonomyAliases("I need local SEO")[0]?.id, "marketing");
  assert.equal(searchCommunityTaxonomyAliases("I need PPC ads")[0]?.id, "marketing");
  assert.equal(searchCommunityTaxonomyAliases("I need website development")[0]?.id, "marketing");
  assert.ok(
    searchCommunityTaxonomyAliases("I need a logo").some(
      (ecosystem) => ecosystem.id === "creative" || ecosystem.id === "marketing"
    )
  );
  assert.equal(getCommunityTaxonomyEcosystem("missing"), null);
  assert.deepEqual(searchCommunityTaxonomyAliases("not-a-real-community-need"), []);
});

test("taxonomy-aware Community Search resolves strong discovery interests", () => {
  assert.equal(resolveCommunityDiscoveryInterestForSearch("SEO")?.ecosystemId, "marketing");
  assert.equal(resolveCommunityDiscoveryInterestForSearch("taxes")?.ecosystemId, "financial");
  assert.equal(resolveCommunityDiscoveryInterestForSearch("bookkeeping")?.ecosystemId, "financial");
  assert.equal(resolveCommunityDiscoveryInterestForSearch("kitchen remodel")?.ecosystemId, "home_services");
  assert.equal(resolveCommunityDiscoveryInterestForSearch("cabinets")?.ecosystemId, "home_services");
  assert.equal(resolveCommunityDiscoveryInterestForSearch("logo")?.ecosystemId, "marketing");
  assert.equal(resolveCommunityDiscoveryInterestForSearch("photography")?.ecosystemId, "marketing");
  assert.equal(resolveCommunityDiscoveryInterestForSearch("not-a-real-community-need"), null);
  assert.ok(resolveCommunityDiscoveryInterestForSearch("SEO")?.confidence >= 72);
});
