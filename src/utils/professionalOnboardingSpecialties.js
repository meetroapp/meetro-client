export const PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS = Object.freeze([
  {
    domain: "home_services",
    labelKey: "professionalOnboardingDomainHomeServices",
    options: Object.freeze([
      { value: "handyman", labelKey: "professionalOnboardingSpecialtyHandyman" },
      { value: "garage_door_opener_installation", labelKey: "professionalOnboardingSpecialtyGarageDoorOpenerInstallation" },
      { value: "door_replacement", labelKey: "professionalOnboardingSpecialtyDoorReplacement" },
      { value: "painting", labelKey: "professionalOnboardingSpecialtyPainting" },
      { value: "drywall", labelKey: "professionalOnboardingSpecialtyDrywall" },
      { value: "plumbing_repairs", labelKey: "professionalOnboardingSpecialtyPlumbingRepairs" },
      { value: "plumbing", labelKey: "professionalOnboardingSpecialtyPlumbing" },
      { value: "ceiling_fan_installation", labelKey: "professionalOnboardingSpecialtyCeilingFanInstallation" },
      { value: "electrical", labelKey: "professionalOnboardingSpecialtyElectrical" },
      { value: "tile", labelKey: "professionalOnboardingSpecialtyTile" },
      { value: "cabinetry", labelKey: "professionalOnboardingSpecialtyCabinetry" },
      { value: "flooring", labelKey: "professionalOnboardingSpecialtyFlooring" },
      { value: "pressure_washing", labelKey: "professionalOnboardingSpecialtyPressureWashing" },
      { value: "appliance_installation", labelKey: "professionalOnboardingSpecialtyApplianceInstallation" },
      { value: "general_maintenance", labelKey: "professionalOnboardingSpecialtyGeneralMaintenance" },
    ]),
  },
  {
    domain: "healthcare",
    labelKey: "professionalOnboardingDomainHealthcare",
    options: Object.freeze([
      { value: "home_health", labelKey: "professionalOnboardingSpecialtyHomeHealth" },
      { value: "senior_care", labelKey: "professionalOnboardingSpecialtySeniorCare" },
      { value: "nursing", labelKey: "professionalOnboardingSpecialtyNursing" },
      { value: "caregiver", labelKey: "professionalOnboardingSpecialtyCaregiver" },
      { value: "medical_transport", labelKey: "professionalOnboardingSpecialtyMedicalTransport" },
    ]),
  },
  {
    domain: "property_management",
    labelKey: "professionalOnboardingDomainPropertyManagement",
    options: Object.freeze([
      { value: "tenant_ticket", labelKey: "professionalOnboardingSpecialtyTenantTicket" },
      { value: "rental_maintenance", labelKey: "professionalOnboardingSpecialtyRentalMaintenance" },
      { value: "inspection", labelKey: "professionalOnboardingSpecialtyInspection" },
      { value: "unit_turnover", labelKey: "professionalOnboardingSpecialtyTurnover" },
      { value: "vendor_dispatch", labelKey: "professionalOnboardingSpecialtyVendorDispatch" },
    ]),
  },
  {
    domain: "transportation",
    labelKey: "professionalOnboardingDomainTransportation",
    options: Object.freeze([
      { value: "mechanic", labelKey: "professionalOnboardingSpecialtyMechanic" },
      { value: "mobile_services", labelKey: "professionalOnboardingSpecialtyMobileServices" },
      { value: "private_transportation", labelKey: "professionalOnboardingSpecialtyPrivateTransportation" },
    ]),
  },
]);

const LEGACY_CATEGORY_BY_DOMAIN = Object.freeze({
  healthcare: "Home Health Care",
  home_services: "Handyman",
  property_management: "Property Maintenance",
  transportation: "Private Transportation",
});

const LEGACY_CATEGORY_BY_SPECIALTY = Object.freeze({
  appliance_installation: "Appliance Installation",
  cabinetry: "Cabinetry",
  caregiver: "Home Health Care",
  ceiling_fan_installation: "Ceiling Fan Installation",
  door_replacement: "Door Replacement",
  drywall: "Drywall",
  electrical: "Electrical",
  flooring: "Flooring",
  garage_door_opener_installation: "Garage Door Opener Installation",
  general_maintenance: "General Maintenance",
  handyman: "Handyman",
  home_health: "Home Health Care",
  inspection: "Property Maintenance",
  medical_transport: "Home Health Care",
  nursing: "Home Health Care",
  painting: "Painting",
  plumbing: "Plumbing",
  plumbing_repairs: "Plumbing Repairs",
  pressure_washing: "Pressure Washing",
  private_transportation: "Private Transportation",
  mechanic: "Mechanic",
  mobile_services: "Mobile Services",
  rental_maintenance: "Property Maintenance",
  senior_care: "Home Health Care",
  tenant_ticket: "Property Maintenance",
  tile: "Tile",
  unit_turnover: "Property Maintenance",
  vendor_dispatch: "Property Maintenance",
});

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
  cabinetry: "cabinetry",
  carpentry: "cabinetry",
  "ceiling fan installation": "ceiling_fan_installation",
  "door replacement": "door_replacement",
  drywall: "drywall",
  electrical: "electrical",
  flooring: "flooring",
  "garage door opener installation": "garage_door_opener_installation",
  "general maintenance": "general_maintenance",
  handyman: "handyman",
  "home health care": "home_health",
  painting: "painting",
  plumbing: "plumbing",
  "plumbing repairs": "plumbing_repairs",
  "pressure washing": "pressure_washing",
  "private transportation": "private_transportation",
  mechanic: "mechanic",
  "mobile services": "mobile_services",
  "property maintenance": "rental_maintenance",
  tile: "tile",
});

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

  if (option) return translate(option.labelKey);

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
        LEGACY_SPECIALTY_BY_CATEGORY[String(category || "").trim().toLowerCase()]
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
