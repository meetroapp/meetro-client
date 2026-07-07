import { buildProfessionalCapabilityGroups } from "./professionalCapabilityLibrary.js";

export const PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS = Object.freeze(
  buildProfessionalCapabilityGroups().map((group) => ({
    ...group,
    options: Object.freeze(group.options),
  }))
);

const LEGACY_CATEGORY_BY_DOMAIN = Object.freeze({
  healthcare: "Home Health Care",
  home_services: "Handyman",
  property_management: "Property Maintenance",
  transportation: "Private Transportation",
});

const LEGACY_CATEGORY_BY_SPECIALTY = Object.freeze(
  Object.assign(
    PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS.reduce((accumulator, group) => {
      group.options.forEach((option) => {
        if (!accumulator[option.value]) {
          accumulator[option.value] = option.categoryLabel || group.label || LEGACY_CATEGORY_BY_DOMAIN[group.domain] || "";
        }
      });
      return accumulator;
    }, {}),
    {
      appliance_installation: "Appliance Installation",
      cabinetry: "Cabinetry",
      ceiling_fan_installation: "Ceiling Fan Installation",
      door_replacement: "Door Replacement",
      drywall: "Drywall",
      electrical: "Electrical",
      flooring: "Flooring",
      garage_door_opener_installation: "Garage Door Opener Installation",
      painting: "Painting",
      plumbing: "Plumbing",
      plumbing_repairs: "Plumbing Repairs",
      pressure_washing: "Pressure Washing",
      tile: "Tile",
    }
  )
);

const SPECIALTY_TO_DOMAIN = Object.freeze(
  PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS.reduce((accumulator, group) => {
    group.options.forEach((option) => {
      accumulator[option.value] = group.domain;
    });
    return accumulator;
  }, {})
);

const LEGACY_SPECIALTY_BY_CATEGORY = Object.freeze({
  "appliance installation": "appliance_installation",
  "biohazard cleaning": "biohazard_cleaning",
  cabinetry: "cabinetry",
  "cabinet repair replacement": "cabinet_repair_replacement",
  "cabinet repair/replacement": "cabinet_repair_replacement",
  "carpet cleaning": "carpet_cleaning",
  carpentry: "cabinetry",
  "ceiling fan installation": "ceiling_fan_installation",
  cleaning: "cleaning",
  "cleaning services": "cleaning",
  "door replacement": "door_replacement",
  "door repair replacement": "door_repair_replacement",
  "door repair/replacement": "door_repair_replacement",
  drywall: "drywall",
  "drywall repair": "drywall_repair",
  electrical: "electrical",
  "event venue cleaning": "event_venue_cleaning",
  "fence repair": "fence_repair",
  flooring: "flooring",
  "garage door opener installation": "garage_door_opener_installation",
  "general maintenance": "general_maintenance",
  "graffiti removal services": "graffiti_removal_services",
  "green cleaning services": "green_cleaning_services",
  handyman: "handyman",
  "hotel and hospitality cleaning": "hotel_hospitality_cleaning",
  housekeeping: "housekeeping",
  "home health care": "home_health",
  "industrial cleaning": "industrial_cleaning",
  landscaping: "landscaping",
  "lawn care": "lawn_care",
  "medical facility cleaning": "medical_facility_cleaning",
  "minor electrical": "minor_electrical",
  "minor plumbing": "minor_plumbing",
  painting: "painting",
  "pet cleaning services": "pet_cleaning_services",
  plumbing: "plumbing",
  "plumbing repairs": "plumbing_repairs",
  "pool builders": "pool_builders",
  "pool cleaning": "pool_cleaning",
  "pool equipment installation": "pool_equipment_installation",
  "pool maintenance": "pool_maintenance",
  "pool repair": "pool_repair",
  "pool resurfacing": "pool_resurfacing",
  "pool service": "pool_service",
  "pool services": "pool_service",
  "pressure washing": "pressure_washing",
  "private transportation": "private_transportation",
  "restaurant and kitchen cleaning": "restaurant_kitchen_cleaning",
  "retail cleaning": "retail_cleaning",
  "school cleaning": "school_cleaning",
  mechanic: "mechanic",
  "mobile services": "mobile_services",
  "property maintenance": "rental_maintenance",
  tile: "tile",
  "tile repair installation": "tile_repair_installation",
  "tile repair/installation": "tile_repair_installation",
  "trim baseboards": "trim_baseboards",
  "trim/baseboards": "trim_baseboards",
  "window cleaning": "window_cleaning",
});

const LIBRARY_SPECIALTY_BY_LABEL = Object.freeze(
  PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS.reduce((accumulator, group) => {
    group.options.forEach((option) => {
      [option.label, option.value, ...(option.aliases || [])].forEach((label) => {
        const key = String(label || "").trim().toLowerCase();
        if (key && !accumulator[key]) accumulator[key] = option.value;
      });
    });
    if (group.label) {
      const key = String(group.label).trim().toLowerCase();
      const firstOption = group.options[0]?.value || "";
      if (key && firstOption && !accumulator[key]) accumulator[key] = firstOption;
    }
    return accumulator;
  }, {})
);

export function getProfessionalOnboardingSpecialtyValues() {
  return PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS.flatMap((group) =>
    group.options.map((option) => option.value)
  );
}

export function getDomainForProfessionalSpecialty(specialty = "") {
  return SPECIALTY_TO_DOMAIN[specialty] || "";
}

export function getProfessionalSpecialtyLabel(specialty = "", translate = (key) => key) {
  const option = PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS.flatMap(
    (group) => group.options
  ).find((item) => item.value === specialty);

  if (option) {
    const translated = option.labelKey ? translate(option.labelKey) : "";
    if (translated && translated !== option.labelKey) return translated;
    return option.label || "";
  }

  return "";
}

export function getProfessionalSpecialtyOption(specialty = "") {
  return PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS.flatMap(
    (group) => group.options.map((option) => ({ ...option, domain: group.domain }))
  ).find((item) => item.value === specialty) || null;
}

export function normalizeSelectedSpecialties(values = []) {
  const allowed = new Set(getProfessionalOnboardingSpecialtyValues());
  const selected = Array.isArray(values) ? values : [];

  return [...new Set(selected.filter((value) => allowed.has(value)))];
}

export function inferProfessionalSpecialtiesFromLegacyCategories(values = []) {
  const categories = Array.isArray(values) ? values : [];

  return normalizeSelectedSpecialties(
    categories
      .map((category) =>
        LEGACY_SPECIALTY_BY_CATEGORY[String(category || "").trim().toLowerCase()] ||
        LIBRARY_SPECIALTY_BY_LABEL[String(category || "").trim().toLowerCase()]
      )
      .filter(Boolean)
  );
}

export function buildProfessionalSpecialtyProfile({
  selectedSpecialties = [],
  serviceSpecialties = [],
  otherService = "",
} = {}) {
  const specialties = normalizeSelectedSpecialties(
    selectedSpecialties.length > 0 ? selectedSpecialties : serviceSpecialties
  );
  const domains = [
    ...new Set(specialties.map(getDomainForProfessionalSpecialty).filter(Boolean)),
  ];
  const primaryDomain = domains[0] || "";
  const legacyCategories = [
    ...new Set(
      specialties
        .map((specialty) => LEGACY_CATEGORY_BY_SPECIALTY[specialty])
        .filter(Boolean)
    ),
  ];

  if (legacyCategories.length === 0 && primaryDomain) {
    legacyCategories.push(LEGACY_CATEGORY_BY_DOMAIN[primaryDomain]);
  }

  if (otherService && !legacyCategories.includes("Other")) {
    legacyCategories.push("Other");
  }

  return {
    serviceDomain: primaryDomain,
    serviceDomains: domains,
    serviceSpecialties: specialties,
    serviceCategories: legacyCategories,
  };
}
