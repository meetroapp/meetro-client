import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS,
  buildProfessionalSpecialtyProfile,
  getDomainForProfessionalSpecialty,
  getProfessionalOnboardingSpecialtyValues,
  getProfessionalSpecialtyLabel,
  inferProfessionalSpecialtiesFromLegacyCategories,
  normalizeSelectedSpecialties,
} from "../src/utils/professionalOnboardingSpecialties.js";
import {
  buildBusinessServiceCapabilities,
  getBusinessServicesProjection,
  writeBusinessServiceProfile,
} from "../src/utils/businessServiceProfile.js";
import {
  getProfessionalCapabilityCategories,
  getProfessionalCapabilityCategoryLabelKey,
  getProfessionalCapabilitySectionLabelKey,
  getProfessionalCapabilitySpecialtyLabelKey,
  searchProfessionalCapabilityCategories,
  searchProfessionalCapabilitySpecialties,
} from "../src/utils/professionalCapabilityLibrary.js";
import {
  canProfessionalReceiveRequest,
  normalizeServiceCategory,
} from "../src/utils/professionalRequestMatching.js";
import { t } from "../src/utils/language.js";

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
  assert.ok(values.includes("housekeeping"));
  assert.ok(values.includes("office_cleaning_services"));
  assert.ok(values.includes("carpet_cleaning"));
  assert.ok(values.includes("industrial_cleaning"));
  assert.ok(values.includes("window_cleaning"));
  assert.ok(values.includes("medical_facility_cleaning"));
  assert.ok(values.includes("restaurant_kitchen_cleaning"));
  assert.ok(values.includes("event_venue_cleaning"));
  assert.ok(values.includes("school_cleaning"));
  assert.ok(values.includes("retail_cleaning"));
  assert.ok(values.includes("hotel_hospitality_cleaning"));
  assert.ok(values.includes("green_cleaning_services"));
  assert.ok(values.includes("pet_cleaning_services"));
  assert.ok(values.includes("graffiti_removal_services"));
  assert.ok(values.includes("biohazard_cleaning"));
  assert.ok(values.includes("pool_maintenance"));
  assert.ok(values.includes("pool_cleaning"));
  assert.ok(values.includes("pool_repair"));
  assert.ok(values.includes("pool_equipment_installation"));
  assert.ok(values.includes("pool_resurfacing"));
  assert.ok(values.includes("pool_builders"));
  assert.ok(values.includes("new_pool_construction"));
  assert.ok(values.includes("door_repair_replacement"));
  assert.ok(values.includes("drywall_repair"));
  assert.ok(values.includes("tile_repair_installation"));
  assert.ok(values.includes("cabinet_repair_replacement"));
  assert.ok(values.includes("trim_baseboards"));
  assert.ok(values.includes("mounting_hanging"));
  assert.ok(values.includes("minor_plumbing"));
  assert.ok(values.includes("minor_electrical"));
  assert.ok(values.includes("fence_repair"));
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
  assert.equal(getDomainForProfessionalSpecialty("housekeeping"), "home_services");
  assert.equal(getDomainForProfessionalSpecialty("pool_builders"), "home_services");
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

test("professional onboarding renders nested specialties by primary service category", () => {
  const cleaningGroup = PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS.find(
    (group) => group.label === "Cleaning Services"
  );
  const poolServicesGroup = PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS.find(
    (group) => group.label === "Pool Services"
  );
  const handymanGroup = PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS.find(
    (group) => group.label === "Handyman"
  );
  const labelMap = {
    professionalOnboardingSpecialtyPainting: "Painting",
    professionalOnboardingSpecialtyPressureWashing: "Pressure Washing",
    professionalOnboardingSpecialtyGeneralMaintenance: "General Maintenance",
  };
  const readLabel = (option) =>
    option.label || labelMap[option.labelKey] || option.value;

  assert.ok(cleaningGroup);
  assert.ok(poolServicesGroup);
  assert.ok(handymanGroup);
  [
      "Housekeeping",
      "Office Cleaning Services",
      "Carpet Cleaning",
      "Industrial Cleaning",
      "Window Cleaning",
      "Medical Facility Cleaning",
      "Restaurant and Kitchen Cleaning",
      "Event Venue Cleaning",
      "School Cleaning",
      "Retail Cleaning",
      "Hotel and Hospitality Cleaning",
      "Green Cleaning Services",
      "Pet Cleaning Services",
      "Graffiti Removal Services",
      "Biohazard Cleaning",
      "Move-In / Move-Out Cleaning",
      "Post-Construction Cleaning",
      "Deep Cleaning",
      "Janitorial Services",
    ].forEach((label) => {
      assert.ok(cleaningGroup.options.some((option) => option.label === label), label);
    });
  [
      "Pool Maintenance",
      "Pool Cleaning",
      "Pool Repair",
      "Pool Equipment Installation",
      "Pool Pump Repair",
      "Pool Filter Cleaning",
      "Pool Leak Detection",
      "Pool Resurfacing",
      "Pool Builders",
      "New Pool Construction",
      "Spa / Hot Tub Service",
      "Pool Automation",
    ].forEach((label) => {
      assert.ok(poolServicesGroup.options.some((option) => option.label === label), label);
    });
  assert.ok(
    [
      "Door Repair / Replacement",
      "Drywall Repair",
      "Painting",
      "Tile Repair / Installation",
      "Cabinet Repair / Replacement",
      "Trim / Baseboards",
      "Mounting / Hanging",
      "Minor Plumbing",
      "Minor Electrical",
      "Fence Repair",
      "Pressure Washing",
      "General Maintenance",
      "Furniture Assembly",
      "Shelving Installation",
      "Weatherstripping",
      "Caulking",
      "Small Repairs",
    ].every((label) => handymanGroup.options.map(readLabel).includes(label))
  );
});

test("professional capability library exposes required searchable primary categories", () => {
  const categoryLabels = getProfessionalCapabilityCategories().map((category) => category.label);

  [
    "Handyman",
    "Cleaning Services",
    "Pool Services",
    "General Contractor",
    "Roofing",
    "Plumbing",
    "Electrical",
    "HVAC",
    "Pest Control",
    "Landscaping",
    "Tree Services",
    "Flooring",
    "Painting",
    "Drywall",
    "Doors & Windows",
    "Garage Doors",
    "Appliance Repair",
    "Junk Removal",
    "Professional Services",
    "Marketing Services",
  ].forEach((label) => assert.ok(categoryLabels.includes(label), label));

  assert.deepEqual(
    searchProfessionalCapabilityCategories("bug").map((category) => category.label),
    ["Pest Control"]
  );
  assert.ok(
    searchProfessionalCapabilityCategories("office cleaning")
      .map((category) => category.label)
      .includes("Cleaning Services")
  );
});

test("service selector category labels are distinct while preserving door capability IDs", () => {
  const categories = getProfessionalCapabilityCategories();
  const categoryLabels = categories.map((category) => category.label);
  const labelCounts = categoryLabels.reduce((counts, label) => {
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});
  const windowDoorSpecialties = searchProfessionalCapabilitySpecialties("windows_doors", "");
  const garageDoorSpecialties = searchProfessionalCapabilitySpecialties("garage_doors", "");

  assert.equal(labelCounts["Doors & Windows"], 1);
  assert.equal(labelCounts["Garage Doors"], 1);
  assert.equal(labelCounts["Windows & Doors"] || 0, 0);
  assert.equal(new Set(categoryLabels).size, categoryLabels.length);
  assert.deepEqual(
    windowDoorSpecialties.map((specialty) => specialty.id),
    ["window_repair", "window_replacement", "door_installation", "door_repair"]
  );
  assert.deepEqual(
    windowDoorSpecialties.map((specialty) => specialty.label),
    ["Window Repair", "Window Replacement", "Door Installation", "Door Repair"]
  );
  assert.deepEqual(
    garageDoorSpecialties.map((specialty) => specialty.id),
    [
      "garage_door_repair",
      "garage_door_installation",
      "garage_door_opener_installation",
    ]
  );
  assert.deepEqual(
    garageDoorSpecialties.map((specialty) => specialty.label),
    [
      "Garage Door Repair",
      "Garage Door Installation",
      "Garage Door Opener Installation",
    ]
  );
});

test("marketing capability completeness reaches Professional Signup without identity labels", () => {
  const values = getProfessionalOnboardingSpecialtyValues();
  const marketingCategory = getProfessionalCapabilityCategories().find(
    (category) => category.id === "marketing_services"
  );
  const marketingSpecialties = searchProfessionalCapabilitySpecialties(
    "marketing_services",
    ""
  );
  const marketingLabels = marketingSpecialties.map((specialty) => specialty.label);

  assert.ok(marketingCategory);
  assert.equal(marketingCategory.industry, "marketing");
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
  ].forEach((specialtyId) => assert.ok(values.includes(specialtyId), specialtyId));
  [
    "Marketing Strategy",
    "Digital Marketing",
    "SEO",
    "Local SEO",
    "PPC Advertising",
    "Social Media Marketing",
    "Content Marketing",
    "Email Marketing",
    "Brand Strategy",
    "Brand Identity",
    "Graphic Design",
    "Website Design",
    "Website Development",
    "Copywriting",
    "Photography",
    "Videography",
    "Analytics",
    "Public Relations",
    "Marketing Consulting",
  ].forEach((label) => assert.ok(marketingLabels.includes(label), label));
  ["Marketing Agency", "Marketing Firm", "Studio", "LLC", "Corporation"].forEach(
    (identityLabel) => assert.equal(marketingLabels.includes(identityLabel), false)
  );
  assert.deepEqual(
    searchProfessionalCapabilitySpecialties("marketing_services", "local seo").map(
      (specialty) => specialty.id
    ),
    ["local_seo"]
  );
  assert.ok(
    searchProfessionalCapabilitySpecialties("marketing_services", "website")
      .map((specialty) => specialty.id)
      .includes("website_development")
  );
});

test("professional capability labels resolve through language.js without changing stable IDs", () => {
  const cleaningCategory = getProfessionalCapabilityCategories().find(
    (category) => category.id === "cleaning_services"
  );

  assert.equal(cleaningCategory.id, "cleaning_services");
  assert.equal(
    cleaningCategory.labelKey,
    getProfessionalCapabilityCategoryLabelKey("cleaning_services")
  );
  assert.equal(t(cleaningCategory.labelKey, "en"), "Cleaning Services");
  assert.equal(t(cleaningCategory.labelKey, "es"), "Servicios de limpieza");
  assert.equal(
    t(getProfessionalCapabilitySpecialtyLabelKey("housekeeping"), "en"),
    "Housekeeping"
  );
  assert.equal(
    t(getProfessionalCapabilitySpecialtyLabelKey("housekeeping"), "es"),
    "Limpieza del hogar"
  );
  assert.equal(
    t(getProfessionalCapabilitySpecialtyLabelKey("office_cleaning_services"), "en"),
    "Office Cleaning Services"
  );
  assert.equal(
    t(getProfessionalCapabilitySpecialtyLabelKey("pool_builders"), "es"),
    "Constructores de piscinas"
  );
  assert.equal(
    t(getProfessionalCapabilityCategoryLabelKey("marketing_services"), "en"),
    "Marketing Services"
  );
  assert.equal(
    t(getProfessionalCapabilitySpecialtyLabelKey("local_seo"), "es"),
    "SEO local"
  );
  assert.equal(
    t(getProfessionalCapabilitySpecialtyLabelKey("website_development"), "fr"),
    "Développement de sites web"
  );
  assert.equal(
    t(getProfessionalCapabilitySpecialtyLabelKey("marketing_consulting"), "pt-BR"),
    "Consultoria de marketing"
  );
  assert.equal(
    t(getProfessionalCapabilitySectionLabelKey("Planning & Design"), "en"),
    "Planning & Design"
  );
  assert.equal(
    t(getProfessionalCapabilitySectionLabelKey("Planning & Design"), "es"),
    "Planificación y diseño"
  );
  assert.equal(t("professionalCapabilitySearchCategories", "es"), "Buscar categorías");
  assert.equal(t("professionalCapabilitySelectedCount", "es"), "seleccionadas");
  assert.match(t("professionalCapabilityCantFind", "en"), /Choose the closest service for now/);
  assert.match(t("professionalCapabilityCantFind", "en"), /Business Profile later/);
  assert.match(t("professionalCapabilityCantFind", "es"), /Elige el servicio más cercano/);
});

test("professional capability library searches aliases and specialty sections", () => {
  assert.ok(
    searchProfessionalCapabilitySpecialties("cleaning_services", "maid")
      .some((specialty) => specialty.label === "Housekeeping")
  );
  assert.ok(
    searchProfessionalCapabilitySpecialties("cleaning_services", "medical")
      .some((specialty) => specialty.label === "Medical Facility Cleaning")
  );
  assert.ok(
    searchProfessionalCapabilitySpecialties("cleaning_services", "office cleaning")
      .some((specialty) => specialty.label === "Office Cleaning Services")
  );
  assert.ok(
    searchProfessionalCapabilitySpecialties("general_contractor", "blueprint")
      .some((specialty) => specialty.label === "Draftsperson / Drafting Services")
  );
  assert.ok(
    searchProfessionalCapabilitySpecialties("pool_services", "pool builder")
      .some((specialty) => specialty.label === "New Pool Construction")
  );
  assert.ok(
    searchProfessionalCapabilitySpecialties("roofing", "roof leak")
      .some((specialty) => specialty.label === "Roof Leak Repair")
  );
});

test("category-first selector is wired to onboarding and Business Profile only", () => {
  const selectorSource = readFileSync("src/components/ServiceSelectorSheet.jsx", "utf8");
  const onboardingSource = readFileSync("src/pages/ProfessionalOnboarding.jsx", "utf8");
  const profileSource = readFileSync("src/pages/ContractorProfile.jsx", "utf8");
  const appSource = readFileSync("src/App.jsx", "utf8");

  assert.match(selectorSource, /categories = \[\]/);
  assert.match(selectorSource, /selectedCategoryId = ""/);
  assert.match(selectorSource, /categorySearchPlaceholder/);
  assert.match(selectorSource, /professionalCapabilitySearchCategories/);
  assert.match(selectorSource, /professionalCapabilityChooseCategoryEmpty/);
  assert.match(selectorSource, /professionalCapabilityCantFind/);
  assert.match(selectorSource, /role="note"/);
  assert.match(selectorSource, /filteredCategories/);
  assert.match(selectorSource, /activeCategoryId/);
  assert.match(onboardingSource, /getBusinessProfileCapabilityOptionsFromTaxonomy/);
  assert.match(onboardingSource, /return translated \|\| fallback/);
  assert.match(onboardingSource, /professionalCapabilityPrimaryCategory/);
  assert.match(onboardingSource, /primaryServiceCategory/);
  assert.match(onboardingSource, /categories=\{primaryCategoryOptions\}/);
  assert.match(onboardingSource, /selectedCategoryId=\{selectedPrimaryCategory\}/);
  assert.match(profileSource, /getBusinessProfileCapabilityOptionsFromTaxonomy/);
  assert.match(profileSource, /getBusinessProfileCategoryOptionsFromTaxonomy/);
  assert.match(profileSource, /professionalCapabilitySelectedCount/);
  assert.match(profileSource, /categories=\{primaryCategoryOptions\}/);
  assert.match(profileSource, /selectedCategoryId=\{selectedPrimaryCategory\}/);
  assert.match(appSource, /hasRequiredProfessionalSetupData/);
  assert.match(appSource, /safeSetStorageItem\("meetroProfessionalOnboardingCompleted", "true"\)/);
  assert.doesNotMatch(appSource, /Login[\s\S]*professionalOnboardingCompleted/);
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

test("business service profile persists selected specialties for Business Profile display", () => {
  const storage = new Map();
  const browserStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
  };

  const savedProfile = writeBusinessServiceProfile(
    {
      serviceSpecialties: [
        "housekeeping",
        "office_cleaning_services",
        "pool_repair",
      ],
    },
    browserStorage
  );
  const projection = getBusinessServicesProjection(savedProfile);

  assert.deepEqual(savedProfile.serviceSpecialties, [
    "housekeeping",
    "office_cleaning_services",
    "pool_repair",
  ]);
  assert.deepEqual(savedProfile.serviceCategories, [
    "Cleaning Services",
    "Pool Services",
  ]);
  assert.deepEqual(projection.serviceIds, [
    "housekeeping",
    "office_cleaning_services",
    "pool_repair",
  ]);
  assert.deepEqual(projection.displayLabels, [
    "Housekeeping",
    "Office Cleaning Services",
    "Pool Repair",
  ]);
});

test("marketing capabilities persist for profiles without broadening home-service matching", () => {
  const profile = buildProfessionalSpecialtyProfile({
    serviceSpecialties: ["local_seo", "website_development"],
  });

  assert.equal(profile.serviceDomain, "marketing");
  assert.deepEqual(profile.serviceDomains, ["marketing"]);
  assert.deepEqual(profile.serviceSpecialties, [
    "local_seo",
    "website_development",
  ]);
  assert.deepEqual(profile.serviceCategories, ["Marketing Services"]);
  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: profile.serviceDomain,
        serviceCategories: profile.serviceCategories,
        businessServiceSpecialties: profile.serviceSpecialties,
        serviceCapabilities: buildBusinessServiceCapabilities(
          profile.serviceSpecialties
        ),
        zipCodes: "33904",
      },
      {
        service_specialty: "painting",
        category: "Painting",
        zipCode: "33904",
      }
    ),
    false
  );
});

test("handyman allows multiple detailed capabilities", () => {
  const capabilities = buildBusinessServiceCapabilities([
    "door_repair_replacement",
    "drywall_repair",
    "minor_plumbing",
    "minor_electrical",
    "fence_repair",
  ]);

  assert.deepEqual(
    capabilities.map((capability) => capability.serviceId),
    [
      "door_repair_replacement",
      "drywall_repair",
      "minor_plumbing",
      "minor_electrical",
      "fence_repair",
    ]
  );
  assert.ok(capabilities.every((capability) => capability.category === "Handyman"));
});

test("discovery matching can use specialties instead of broad category only", () => {
  assert.equal(normalizeServiceCategory("Office Cleaning Services"), "office_cleaning_services");
  assert.equal(normalizeServiceCategory("Pool Builders"), "pool_builders");
  assert.equal(normalizeServiceCategory("New Pool Construction"), "new_pool_construction");
  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceCategories: ["Cleaning Services"],
        businessServiceSpecialties: ["office_cleaning_services"],
        serviceCapabilities: buildBusinessServiceCapabilities([
          "office_cleaning_services",
        ]),
        zipCodes: "33904",
      },
      {
        service_specialty: "office_cleaning_services",
        category: "Cleaning Services",
        zipCode: "33904",
      }
    ),
    true
  );
  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceCategories: ["Pool Services"],
        businessServiceSpecialties: ["pool_repair"],
        serviceCapabilities: buildBusinessServiceCapabilities(["pool_repair"]),
        zipCodes: "33904",
      },
      {
        service_specialty: "new_pool_construction",
        category: "Pool Builders",
        zipCode: "33904",
      }
    ),
    false
  );
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
