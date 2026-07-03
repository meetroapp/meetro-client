const CATEGORY_ALIASES = Object.freeze({
  cabinetRepair: "cabinetry",
  cabinetrepair: "cabinetry",
  cabinetReplacement: "cabinetry",
  cabinetreplacement: "cabinetry",
  cabinetry: "cabinetry",
  doorInstallation: "door_installation",
  doorinstallation: "door_installation",
  doorRepair: "door_repair",
  doorrepair: "door_repair",
  doorReplacement: "door_replacement",
  doorreplacement: "door_replacement",
  drywallRepair: "drywall",
  drywallrepair: "drywall",
  ceilingFanInstallation: "ceiling_fan_installation",
  ceilingfaninstallation: "ceiling_fan_installation",
  garageDoorOpenerInstallation: "garage_door_opener_installation",
  garagedooropenerinstallation: "garage_door_opener_installation",
  generalMaintenance: "general_maintenance",
  generalmaintenance: "general_maintenance",
  homeHealth: "home_health",
  homeHealthCare: "home_health",
  home_healthcare: "home_health",
  homehealthcare: "home_health",
  medicalCare: "medical_care",
  medicalcare: "medical_care",
  medicalTransport: "medical_transport",
  medical_transport: "medical_transport",
  medicaltransport: "medical_transport",
  propertyManagement: "property_management",
  propertymanagement: "property_management",
  propertyMaintenance: "property_maintenance",
  propertymaintenance: "property_maintenance",
  plumbingRepairs: "plumbing_repairs",
  plumbingrepairs: "plumbing_repairs",
  rentalMaintenance: "rental_maintenance",
  rentalmaintenance: "rental_maintenance",
  seniorCare: "senior_care",
  seniorcare: "senior_care",
  tenantTicket: "tenant_ticket",
  tenantticket: "tenant_ticket",
  turnover: "unit_turnover",
  unitTurnover: "unit_turnover",
  unitturnover: "unit_turnover",
  vendorDispatch: "vendor_dispatch",
  vendordispatch: "vendor_dispatch",
  privateTransportation: "private_transportation",
  privatetransportation: "private_transportation",
});

export const SERVICE_DOMAIN_CATEGORIES = Object.freeze({
  home_services: Object.freeze([
    "appliance_repair",
    "appliance_installation",
    "cabinetry",
    "carpentry",
    "ceiling_fan_installation",
    "cleaning",
    "concrete",
    "contractor",
    "demolition",
    "door_installation",
    "door_repair",
    "door_replacement",
    "drywall",
    "electrical",
    "fencing",
    "flooring",
    "garage_door_opener_installation",
    "general",
    "general_maintenance",
    "handyman",
    "hvac",
    "junk_removal",
    "landscaping",
    "lawn_care",
    "locksmith",
    "painting",
    "paver_sealing",
    "pest_control",
    "plumbing",
    "plumbing_repairs",
    "pool_service",
    "pressure_washing",
    "property_maintenance",
    "repair",
    "roofing",
    "storm",
    "tile",
    "tree_service",
  ]),
  healthcare: Object.freeze([
    "caregiver",
    "healthcare",
    "home_health",
    "medical_care",
    "medical_transport",
    "nursing",
    "senior_care",
    "therapy",
  ]),
  property_management: Object.freeze([
    "inspection",
    "maintenance",
    "property_management",
    "property_maintenance",
    "rental_maintenance",
    "tenant_ticket",
    "unit_turnover",
    "vendor_dispatch",
  ]),
  transportation: Object.freeze([
    "automotive_services",
    "car_detailing",
    "mechanic",
    "mobile_services",
    "moving",
    "private_transportation",
  ]),
});

const CATEGORY_DOMAIN_HINTS = Object.freeze({
  caregiver: "healthcare",
  healthcare: "healthcare",
  home_health: "healthcare",
  medical_care: "healthcare",
  medical_transport: "healthcare",
  nursing: "healthcare",
  senior_care: "healthcare",
  therapy: "healthcare",
  property_management: "property_management",
  property_maintenance: "property_management",
  rental_maintenance: "property_management",
  tenant_ticket: "property_management",
  unit_turnover: "property_management",
  vendor_dispatch: "property_management",
  automotive_services: "transportation",
  car_detailing: "transportation",
  moving: "transportation",
  private_transportation: "transportation",
});

const CATEGORY_ELIGIBILITY = Object.freeze({
  ceiling_fan_installation: Object.freeze([
    "ceiling_fan_installation",
    "electrical",
  ]),
  contractor: Object.freeze([
    "carpentry",
    "concrete",
    "demolition",
    "door_installation",
    "door_repair",
    "door_replacement",
    "drywall",
    "ceiling_fan_installation",
    "flooring",
    "garage_door_opener_installation",
    "painting",
    "repair",
    "tile",
  ]),
  cleaning: Object.freeze(["cleaning"]),
  door_installation: Object.freeze([
    "door_installation",
    "door_repair",
    "door_replacement",
    "garage_door_opener_installation",
  ]),
  door_repair: Object.freeze([
    "door_installation",
    "door_repair",
    "garage_door_opener_installation",
  ]),
  door_replacement: Object.freeze(["door_replacement", "door_installation"]),
  drywall: Object.freeze(["drywall"]),
  electrical: Object.freeze(["electrical", "ceiling_fan_installation"]),
  garage_door_opener_installation: Object.freeze([
    "garage_door_opener_installation",
    "door_installation",
    "door_repair",
  ]),
  handyman: Object.freeze([
    "appliance_repair",
    "appliance_installation",
    "cabinetry",
    "carpentry",
    "ceiling_fan_installation",
    "door_installation",
    "door_repair",
    "door_replacement",
    "drywall",
    "electrical",
    "flooring",
    "general",
    "general_maintenance",
    "locksmith",
    "painting",
    "plumbing",
    "plumbing_repairs",
    "repair",
    "tile",
  ]),
  healthcare: Object.freeze([
    "caregiver",
    "home_health",
    "medical_care",
    "medical_transport",
    "nursing",
    "senior_care",
    "therapy",
  ]),
  home_health: Object.freeze([
    "caregiver",
    "home_health",
    "medical_care",
    "nursing",
    "senior_care",
    "therapy",
  ]),
  landscaping: Object.freeze(["landscaping", "lawn_care", "tree_service"]),
  painting: Object.freeze(["painting"]),
  plumbing: Object.freeze(["plumbing", "plumbing_repairs"]),
  plumbing_repairs: Object.freeze(["plumbing", "plumbing_repairs"]),
  property_management: Object.freeze([
    "inspection",
    "maintenance",
    "property_management",
    "property_maintenance",
    "rental_maintenance",
    "tenant_ticket",
    "unit_turnover",
    "vendor_dispatch",
  ]),
  property_maintenance: Object.freeze([
    "maintenance",
    "inspection",
    "property_maintenance",
    "rental_maintenance",
    "tenant_ticket",
    "unit_turnover",
    "vendor_dispatch",
  ]),
  roofing: Object.freeze(["roofing", "storm"]),
});

export function normalizeServiceCategory(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (CATEGORY_ALIASES[raw]) return CATEGORY_ALIASES[raw];

  const normalized = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (CATEGORY_ALIASES[normalized]) return CATEGORY_ALIASES[normalized];
  if (normalized.includes("home_health")) return "home_health";
  if (normalized.includes("senior_care")) return "senior_care";
  if (normalized.includes("medical_transport")) return "medical_transport";
  if (normalized.includes("medical")) return "medical_care";
  if (normalized.includes("nursing") || normalized.includes("nurse")) {
    return "nursing";
  }
  if (normalized.includes("garage") && normalized.includes("opener")) {
    return "garage_door_opener_installation";
  }
  if (normalized.includes("ceiling_fan")) return "ceiling_fan_installation";
  if (normalized.includes("door_replacement")) return "door_replacement";
  if (normalized.includes("door_installation")) return "door_installation";
  if (normalized.includes("door")) return "door_repair";
  if (normalized.includes("general_maintenance")) return "general_maintenance";
  if (normalized.includes("appliance_installation")) return "appliance_installation";
  if (normalized.includes("cabinet")) return "cabinetry";
  if (normalized.includes("painting") || normalized.includes("paint")) {
    return "painting";
  }
  if (normalized.includes("drywall")) return "drywall";
  if (normalized.includes("faucet") || normalized.includes("plumbing_repair")) {
    return "plumbing_repairs";
  }
  if (normalized.includes("rental_maintenance")) return "rental_maintenance";
  if (normalized.includes("tenant")) return "tenant_ticket";
  if (normalized.includes("property_management")) return "property_management";
  if (normalized.includes("property_maintenance")) return "property_maintenance";
  if (normalized.includes("unit_turnover") || normalized === "turnover") {
    return "unit_turnover";
  }
  if (normalized.includes("vendor_dispatch")) return "vendor_dispatch";
  if (normalized.includes("private_transportation")) return "private_transportation";
  if (normalized.includes("transport")) return "transportation";

  return normalized;
}

export function normalizeServiceDomain(value = "") {
  const normalized = normalizeServiceCategory(value);

  if (["home_service", "home_services"].includes(normalized)) {
    return "home_services";
  }

  if (["health", "healthcare", "home_health"].includes(normalized)) {
    return "healthcare";
  }

  if (["property_management", "propertymanagement"].includes(normalized)) {
    return "property_management";
  }

  if (["transportation", "transport"].includes(normalized)) {
    return "transportation";
  }

  return normalized;
}

export function inferServiceDomain(value = "") {
  const category = normalizeServiceCategory(value);
  if (!category) return "";

  if (CATEGORY_DOMAIN_HINTS[category]) return CATEGORY_DOMAIN_HINTS[category];

  const match = Object.entries(SERVICE_DOMAIN_CATEGORIES).find(([, categories]) =>
    categories.includes(category)
  );

  return match?.[0] || "";
}

function inferCategoryFromText(value = "") {
  const text = String(value || "").toLowerCase();

  if (!text) return "";
  if (text.includes("nursing") || text.includes("nurse")) return "nursing";
  if (text.includes("senior care")) return "senior_care";
  if (text.includes("caregiver")) return "caregiver";
  if (text.includes("medical transport")) return "medical_transport";
  if (text.includes("medical")) return "medical_care";
  if (text.includes("therapy")) return "therapy";
  if (text.includes("health")) return "home_health";
  if (text.includes("tenant")) return "tenant_ticket";
  if (text.includes("rental")) return "rental_maintenance";
  if (text.includes("unit turnover") || text.includes("turnover")) {
    return "unit_turnover";
  }
  if (text.includes("vendor dispatch")) return "vendor_dispatch";
  if (text.includes("property")) return "property_management";
  if (text.includes("plumbing") || text.includes("plumber")) return "plumbing";
  if (text.includes("electrical") || text.includes("outlet")) return "electrical";
  if (text.includes("paint")) return "painting";
  if (text.includes("drywall")) return "drywall";
  if (text.includes("door replacement")) return "door_replacement";
  if (text.includes("door")) return "door_repair";
  if (text.includes("clean")) return "cleaning";
  if (text.includes("transport") || text.includes("ride")) return "transportation";

  return "";
}

export function inferRequestCategory(request = {}) {
  const directCategory =
    request.category ||
    request.businessCategory ||
    request.business_category ||
    request.serviceCategory ||
    request.service_category ||
    request.serviceType ||
    request.service_type;

  if (directCategory) return normalizeServiceCategory(directCategory);

  return inferCategoryFromText(
    request.service ||
      request.title ||
      request.description ||
      request.issue ||
      request.emergencyType ||
      ""
  );
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeServiceCategory).filter(Boolean);
  }

  if (!value) return [];

  return String(value)
    .split(",")
    .map(normalizeServiceCategory)
    .filter(Boolean);
}

function normalizeCapabilityList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((capability) => {
      if (typeof capability === "string") return capability;
      return capability?.serviceId || capability?.specialty || capability?.id || "";
    })
    .map((id) => String(id).replace(/^capability:/, ""))
    .map(normalizeServiceCategory)
    .filter(Boolean);
}

function getProfessionalCategories(professional = {}) {
  const capabilityCategories = [
    ...normalizeCapabilityList(professional.serviceCapabilities),
    ...normalizeCapabilityList(professional.service_capabilities),
    ...normalizeCapabilityList(professional.businessServiceCapabilities),
    ...normalizeCapabilityList(professional.business_service_capabilities),
    ...normalizeList(professional.serviceCategories),
    ...normalizeList(professional.service_categories),
    ...normalizeList(professional.businessServiceSpecialties),
    ...normalizeList(professional.business_service_specialties),
    ...normalizeList(professional.specialties),
    ...normalizeList(professional.serviceSpecialties),
    ...normalizeList(professional.service_specialties),
  ]
    .map(normalizeServiceCategory)
    .filter(Boolean);

  if (capabilityCategories.length > 0) {
    return [...new Set(capabilityCategories)];
  }

  const categories = [
    professional.category,
    professional.businessCategory,
    professional.business_category,
    professional.serviceCategory,
    professional.service_category,
  ]
    .map(normalizeServiceCategory)
    .filter(Boolean);

  return [...new Set(categories)];
}

function getRequestDomain(request = {}, category = "") {
  const explicitDomain = normalizeServiceDomain(
    request.serviceDomain ||
      request.service_domain ||
      request.requestDomain ||
      request.request_domain ||
      request.domain ||
      request.industryType ||
      request.industry_type ||
      request.industry
  );

  return explicitDomain || inferServiceDomain(category);
}

function getProfessionalDomain(professional = {}, categories = []) {
  const explicitDomain = normalizeServiceDomain(
    professional.serviceDomain ||
      professional.service_domain ||
      professional.businessServiceDomain ||
      professional.business_service_domain ||
      professional.domain ||
      professional.industryType ||
      professional.industry_type ||
      professional.industry
  );

  if (explicitDomain) return explicitDomain;

  const explicitDomains = normalizeList(
    professional.serviceDomains ||
      professional.service_domains ||
      professional.businessServiceDomains ||
      professional.business_service_domains
  )
    .map(normalizeServiceDomain)
    .filter(Boolean);

  if (explicitDomains.length > 0) return explicitDomains[0];

  const inferredDomains = categories.map(inferServiceDomain).filter(Boolean);
  return inferredDomains[0] || "";
}

function canCategoryServe(professionalCategory, requestCategory) {
  if (!professionalCategory || !requestCategory) return false;
  if (professionalCategory === requestCategory) return true;

  return CATEGORY_ELIGIBILITY[professionalCategory]?.includes(requestCategory) || false;
}

function matchesSpecialty(professional = {}, request = {}) {
  const requestSpecialty = normalizeServiceCategory(
    request.specialty ||
      request.serviceSpecialty ||
      request.service_specialty ||
      request.speciality ||
      ""
  );

  if (!requestSpecialty) return true;

  const specialties = [
    ...normalizeCapabilityList(professional.serviceCapabilities),
    ...normalizeCapabilityList(professional.service_capabilities),
    ...normalizeCapabilityList(professional.businessServiceCapabilities),
    ...normalizeCapabilityList(professional.business_service_capabilities),
    ...normalizeList(professional.businessServiceSpecialties),
    ...normalizeList(professional.business_service_specialties),
    ...normalizeList(professional.specialties),
    ...normalizeList(professional.serviceSpecialties),
    ...normalizeList(professional.service_specialties),
  ];

  if (specialties.length === 0) return true;

  return specialties.some((specialty) => canCategoryServe(specialty, requestSpecialty));
}

function matchesServiceArea(professional = {}, request = {}) {
  const requestZip = String(
    request.zipCode ||
      request.zip ||
      request.postalCode ||
      request.postal_code ||
      ""
  ).trim();

  const professionalZips = String(
    professional.zipCodes ||
      professional.zip_codes ||
      professional.serviceZipCodes ||
      professional.service_zip_codes ||
      ""
  )
    .split(/[,\s]+/)
    .map((zip) => zip.trim())
    .filter(Boolean);

  if (requestZip && professionalZips.length > 0) {
    return professionalZips.includes(requestZip);
  }

  const requestCity = String(request.city || request.primaryCity || "")
    .trim()
    .toLowerCase();
  const professionalCity = String(professional.primaryCity || professional.city || "")
    .trim()
    .toLowerCase();

  if (requestCity && professionalCity) return requestCity === professionalCity;

  return true;
}

function matchesAvailability(professional = {}, request = {}) {
  const requestTiming = normalizeServiceCategory(
    request.timing ||
      request.availabilityNeeded ||
      request.availability_needed ||
      request.availability ||
      ""
  );

  if (!requestTiming) return true;

  const availability = [
    ...normalizeList(professional.availability),
    ...normalizeList(professional.businessAvailability),
    ...normalizeList(professional.business_availability),
  ];

  if (availability.length === 0) return true;

  if (["same_day", "sameday", "today"].includes(requestTiming)) {
    return availability.includes("same_day_jobs") || availability.includes("same_day");
  }

  if (requestTiming === "weekend") return availability.includes("weekends");
  if (requestTiming === "evening") return availability.includes("evenings");
  if (requestTiming === "weekday") return availability.includes("weekdays");

  return true;
}

function isEmergencyRequest(request = {}) {
  const type = normalizeServiceCategory(
    request.type || request.requestType || request.request_type || request.workflowType
  );
  const urgency = normalizeServiceCategory(request.urgency || request.priority);
  const status = normalizeServiceCategory(request.status);

  return (
    request.isEmergency === true ||
    type === "emergency" ||
    urgency === "emergency" ||
    urgency === "critical" ||
    status.includes("emergency")
  );
}

function matchesEmergencyAvailability(professional = {}, request = {}) {
  if (!isEmergencyRequest(request)) return true;

  const explicit =
    professional.emergencyAvailable ??
    professional.emergency_available ??
    professional.dispatchReady ??
    professional.dispatch_ready;

  if (explicit === undefined || explicit === null || explicit === "") return true;

  return explicit === true || String(explicit).toLowerCase() === "true";
}

export function getRequestMatchSummary(professional = {}, request = {}) {
  const requestCategory = inferRequestCategory(request);
  const requestDomain = getRequestDomain(request, requestCategory);
  const professionalCategories = getProfessionalCategories(professional);
  const professionalDomain = getProfessionalDomain(professional, professionalCategories);

  const domainMatched =
    Boolean(requestDomain) &&
    Boolean(professionalDomain) &&
    requestDomain === professionalDomain;
  const categoryMatched = professionalCategories.some((category) =>
    canCategoryServe(category, requestCategory)
  );
  const specialtyMatched = matchesSpecialty(professional, request);
  const serviceAreaMatched = matchesServiceArea(professional, request);
  const availabilityMatched = matchesAvailability(professional, request);
  const emergencyAvailabilityMatched = matchesEmergencyAvailability(
    professional,
    request
  );

  return {
    matched:
      domainMatched &&
      categoryMatched &&
      specialtyMatched &&
      serviceAreaMatched &&
      availabilityMatched &&
      emergencyAvailabilityMatched,
    requestCategory,
    requestDomain,
    professionalCategories,
    professionalDomain,
    checks: {
      domainMatched,
      categoryMatched,
      specialtyMatched,
      serviceAreaMatched,
      availabilityMatched,
      emergencyAvailabilityMatched,
    },
  };
}

export function canProfessionalReceiveRequest(professional = {}, request = {}) {
  return getRequestMatchSummary(professional, request).matched;
}
