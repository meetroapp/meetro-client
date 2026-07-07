const CATEGORY_ALIASES = {
  applianceRepair: "appliance_repair",
  applianceinstallation: "appliance_installation",
  applianceInstallation: "appliance_installation",
  automotiveServices: "automotive_services",
  biohazardCleaning: "biohazard_cleaning",
  cabinetRepair: "cabinetry",
  cabinetRepairReplacement: "cabinet_repair_replacement",
  cabinetReplacement: "cabinetry",
  cabinetry: "cabinetry",
  carpetCleaning: "carpet_cleaning",
  carDetailing: "car_detailing",
  cleaningServices: "cleaning",
  cleaning_services: "cleaning",
  door: "door_repair",
  doorsWindows: "door_installation",
  doorswindows: "door_installation",
  doorInstallation: "door_installation",
  doorRepair: "door_repair",
  doorRepairReplacement: "door_repair_replacement",
  doorReplacement: "door_replacement",
  doorreplacement: "door_replacement",
  drywallRepair: "drywall",
  drywallrepair: "drywall_repair",
  ceilingFanInstallation: "ceiling_fan_installation",
  ceilingfaninstallation: "ceiling_fan_installation",
  fenceRepair: "fence_repair",
  garageDoorOpenerInstallation: "garage_door_opener_installation",
  garagedooropenerinstallation: "garage_door_opener_installation",
  generalContractor: "contractor",
  generalMaintenance: "general_maintenance",
  generalmaintenance: "general_maintenance",
  greenCleaningServices: "green_cleaning_services",
  homeHealth: "home_health",
  homeHealthCare: "home_health",
  home_healthcare: "home_health",
  homehealthcare: "home_health",
  housekeeping: "housekeeping",
  hotelHospitalityCleaning: "hotel_hospitality_cleaning",
  industrialCleaning: "industrial_cleaning",
  medicalTransport: "medical_transport",
  medical_transport: "medical_transport",
  medicaltransport: "medical_transport",
  minorElectrical: "minor_electrical",
  minorPlumbing: "minor_plumbing",
  mountingHanging: "mounting_hanging",
  newPoolConstruction: "new_pool_construction",
  officeCleaningServices: "office_cleaning_services",
  lawnCare: "lawn_care",
  medicalCare: "medical_care",
  medicalFacilityCleaning: "medical_facility_cleaning",
  mobileServices: "mobile_services",
  paverSealing: "paver_sealing",
  petCleaningServices: "pet_cleaning_services",
  poolBuilders: "pool_builders",
  poolCleaning: "pool_cleaning",
  poolEquipmentInstallation: "pool_equipment_installation",
  poolMaintenance: "pool_maintenance",
  poolRepair: "pool_repair",
  poolResurfacing: "pool_resurfacing",
  poolService: "pool_service",
  pressureWashing: "pressure_washing",
  plumbingRepairs: "plumbing_repairs",
  plumbingrepairs: "plumbing_repairs",
  privateTransportation: "private_transportation",
  propertyManagement: "property_management",
  propertymanagement: "property_management",
  propertyMaintenance: "property_maintenance",
  rentalMaintenance: "rental_maintenance",
  restaurantKitchenCleaning: "restaurant_kitchen_cleaning",
  retailCleaning: "retail_cleaning",
  schoolCleaning: "school_cleaning",
  seniorCare: "senior_care",
  tenantTicket: "tenant_ticket",
  tileRepairInstallation: "tile_repair_installation",
  trimBaseboards: "trim_baseboards",
  unitTurnover: "unit_turnover",
  turnover: "unit_turnover",
  treeService: "tree_service",
  vendorDispatch: "vendor_dispatch",
  vendordispatch: "vendor_dispatch",
  windowCleaning: "window_cleaning",
};

export const SERVICE_DOMAIN_CATEGORIES = Object.freeze({
  home_services: Object.freeze([
    "appliance_repair",
    "appliance_installation",
    "biohazard_cleaning",
    "cabinet_repair_replacement",
    "carpentry",
    "carpet_cleaning",
    "cabinetry",
    "ceiling_fan_installation",
    "cleaning",
    "concrete",
    "contractor",
    "demolition",
    "door_installation",
    "door_repair",
    "door_repair_replacement",
    "door_replacement",
    "drywall",
    "drywall_repair",
    "electrical",
    "event_venue_cleaning",
    "fence_repair",
    "fencing",
    "flooring",
    "garage_door_opener_installation",
    "general",
    "general_maintenance",
    "graffiti_removal_services",
    "green_cleaning_services",
    "handyman",
    "hotel_hospitality_cleaning",
    "housekeeping",
    "hvac",
    "industrial_cleaning",
    "junk_removal",
    "landscaping",
    "lawn_care",
    "locksmith",
    "medical_facility_cleaning",
    "minor_electrical",
    "minor_plumbing",
    "mounting_hanging",
    "new_pool_construction",
    "office_cleaning_services",
    "painting",
    "paver_sealing",
    "pest_control",
    "pet_cleaning_services",
    "plumbing",
    "plumbing_repairs",
    "pool_builders",
    "pool_cleaning",
    "pool_equipment_installation",
    "pool_maintenance",
    "pool_repair",
    "pool_resurfacing",
    "pool_service",
    "pressure_washing",
    "property_maintenance",
    "repair",
    "restaurant_kitchen_cleaning",
    "roofing",
    "retail_cleaning",
    "school_cleaning",
    "storm",
    "tile",
    "tile_repair_installation",
    "trim_baseboards",
    "tree_service",
    "window_cleaning",
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
  healthcare: "healthcare",
  home_health: "healthcare",
  medical_care: "healthcare",
  medical_transport: "healthcare",
  nursing: "healthcare",
  senior_care: "healthcare",
  therapy: "healthcare",
  caregiver: "healthcare",
  property_management: "property_management",
  property_maintenance: "property_management",
  rental_maintenance: "property_management",
  tenant_ticket: "property_management",
  unit_turnover: "property_management",
  vendor_dispatch: "property_management",
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
    "cabinet_repair_replacement",
    "flooring",
    "garage_door_opener_installation",
    "mounting_hanging",
    "painting",
    "repair",
    "trim_baseboards",
    "tile",
    "tile_repair_installation",
  ]),
  cleaning: Object.freeze([
    "biohazard_cleaning",
    "carpet_cleaning",
    "cleaning",
    "event_venue_cleaning",
    "graffiti_removal_services",
    "green_cleaning_services",
    "hotel_hospitality_cleaning",
    "housekeeping",
    "industrial_cleaning",
    "medical_facility_cleaning",
    "office_cleaning_services",
    "pet_cleaning_services",
    "restaurant_kitchen_cleaning",
    "retail_cleaning",
    "school_cleaning",
    "window_cleaning",
  ]),
  door_installation: Object.freeze([
    "door_installation",
    "door_repair",
    "door_repair_replacement",
    "door_replacement",
    "garage_door_opener_installation",
  ]),
  door_repair: Object.freeze([
    "door_installation",
    "door_repair",
    "door_repair_replacement",
    "garage_door_opener_installation",
  ]),
  door_repair_replacement: Object.freeze([
    "door_installation",
    "door_repair",
    "door_repair_replacement",
    "door_replacement",
  ]),
  door_replacement: Object.freeze(["door_replacement", "door_installation", "door_repair_replacement"]),
  electrical: Object.freeze(["electrical", "ceiling_fan_installation", "minor_electrical"]),
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
    "cabinet_repair_replacement",
    "door_installation",
    "door_repair",
    "door_repair_replacement",
    "door_replacement",
    "drywall",
    "drywall_repair",
    "electrical",
    "fence_repair",
    "flooring",
    "general",
    "general_maintenance",
    "locksmith",
    "minor_electrical",
    "minor_plumbing",
    "mounting_hanging",
    "painting",
    "plumbing",
    "plumbing_repairs",
    "pressure_washing",
    "repair",
    "tile",
    "tile_repair_installation",
    "trim_baseboards",
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
  plumbing: Object.freeze(["plumbing", "plumbing_repairs", "minor_plumbing"]),
  plumbing_repairs: Object.freeze(["plumbing", "plumbing_repairs", "minor_plumbing"]),
  pool_service: Object.freeze([
    "pool_cleaning",
    "pool_equipment_installation",
    "pool_maintenance",
    "pool_repair",
    "pool_resurfacing",
    "pool_service",
  ]),
  pool_builders: Object.freeze(["new_pool_construction", "pool_builders"]),
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
  drywall: Object.freeze(["drywall"]),
  drywall_repair: Object.freeze(["drywall", "drywall_repair"]),
  tile: Object.freeze(["tile", "tile_repair_installation"]),
  tile_repair_installation: Object.freeze(["tile", "tile_repair_installation"]),
});

export function normalizeServiceCategory(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const directAlias = CATEGORY_ALIASES[raw];
  if (directAlias) return directAlias;

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
  if (normalized.includes("nursing") || normalized.includes("nurse")) return "nursing";
  if (normalized.includes("painting") || normalized.includes("paint")) return "painting";
  if (normalized.includes("drywall")) return "drywall";
  if (normalized.includes("biohazard_cleaning")) return "biohazard_cleaning";
  if (normalized.includes("carpet_cleaning")) return "carpet_cleaning";
  if (normalized.includes("office_cleaning")) return "office_cleaning_services";
  if (normalized.includes("window_cleaning")) return "window_cleaning";
  if (normalized.includes("pool_builder")) return "pool_builders";
  if (normalized.includes("new_pool")) return "new_pool_construction";
  if (normalized.includes("pool_maintenance")) return "pool_maintenance";
  if (normalized.includes("pool_cleaning")) return "pool_cleaning";
  if (normalized.includes("pool_repair")) return "pool_repair";
  if (normalized.includes("pool_equipment")) return "pool_equipment_installation";
  if (normalized.includes("pool_resurfacing")) return "pool_resurfacing";
  if (normalized.includes("pool")) return "pool_service";
  if (normalized.includes("garage") && normalized.includes("opener")) {
    return "garage_door_opener_installation";
  }
  if (normalized.includes("ceiling_fan")) return "ceiling_fan_installation";
  if (normalized.includes("door_replacement")) return "door_replacement";
  if (normalized.includes("door_repair_replacement")) return "door_repair_replacement";
  if (normalized.includes("door_installation")) return "door_installation";
  if (normalized.includes("door")) return "door_repair";
  if (normalized.includes("general_maintenance")) return "general_maintenance";
  if (normalized.includes("appliance_installation")) return "appliance_installation";
  if (normalized.includes("cabinet_repair_replacement")) return "cabinet_repair_replacement";
  if (normalized.includes("cabinet")) return "cabinetry";
  if (normalized.includes("minor_electrical")) return "minor_electrical";
  if (normalized.includes("minor_plumbing")) return "minor_plumbing";
  if (normalized.includes("fence_repair")) return "fence_repair";
  if (normalized.includes("trim") || normalized.includes("baseboard")) return "trim_baseboards";
  if (normalized.includes("mounting") || normalized.includes("hanging")) return "mounting_hanging";
  if (normalized.includes("faucet") || normalized.includes("plumbing_repair")) {
    return "plumbing_repairs";
  }
  if (normalized.includes("rental_maintenance")) return "rental_maintenance";
  if (normalized.includes("property_maintenance")) return "property_maintenance";
  if (normalized.includes("property_management")) return "property_management";
  if (normalized.includes("unit_turnover") || normalized === "turnover") return "unit_turnover";
  if (normalized.includes("vendor_dispatch")) return "vendor_dispatch";

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

  return normalized;
}

export function inferServiceDomain(value = "") {
  const category = normalizeServiceCategory(value);
  if (!category) return "";

  if (CATEGORY_DOMAIN_HINTS[category]) {
    return CATEGORY_DOMAIN_HINTS[category];
  }

  const matchingDomains = Object.entries(SERVICE_DOMAIN_CATEGORIES)
    .filter(([, categories]) => categories.includes(category))
    .map(([domain]) => domain);

  return matchingDomains[0] || "";
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
  if (text.includes("rental maintenance")) return "rental_maintenance";
  if (text.includes("tenant")) return "tenant_ticket";
  if (text.includes("unit turnover")) return "unit_turnover";
  if (text.includes("turnover")) return "unit_turnover";
  if (text.includes("vendor dispatch")) return "vendor_dispatch";
  if (text.includes("property")) return "property_management";
  if (text.includes("plumbing") || text.includes("plumber")) return "plumbing";
  if (text.includes("electrical") || text.includes("outlet") || text.includes("breaker")) return "electrical";
  if (text.includes("roof")) return "roofing";
  if (text.includes("drywall")) return "drywall";
  if (text.includes("paint")) return "painting";
  if (text.includes("door replacement")) return "door_replacement";
  if (text.includes("pool builder")) return "pool_builders";
  if (text.includes("new pool")) return "new_pool_construction";
  if (text.includes("pool maintenance")) return "pool_maintenance";
  if (text.includes("pool cleaning")) return "pool_cleaning";
  if (text.includes("pool repair")) return "pool_repair";
  if (text.includes("pool equipment")) return "pool_equipment_installation";
  if (text.includes("pool resurfacing")) return "pool_resurfacing";
  if (text.includes("pool")) return "pool_service";
  if (text.includes("biohazard")) return "biohazard_cleaning";
  if (text.includes("carpet cleaning")) return "carpet_cleaning";
  if (text.includes("office cleaning")) return "office_cleaning_services";
  if (text.includes("window cleaning")) return "window_cleaning";
  if (text.includes("door")) return "door_repair";
  if (text.includes("clean")) return "cleaning";
  if (text.includes("landscap") || text.includes("lawn")) return "landscaping";

  return "";
}

export function inferRequestCategory(request = {}) {
  const directCategory =
    request.category ||
    request.requestCategory ||
    request.request_category ||
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
      ""
  );
}

export function getStoredProfessionalMatchProfile(storage = globalThis.localStorage) {
  if (!storage) return {};

  const readJsonArray = (key) => {
    try {
      const parsed = JSON.parse(storage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return {
    id:
      storage.getItem("businessId") ||
      storage.getItem("professionalId") ||
      storage.getItem("contractorId") ||
      storage.getItem("selectedProfessionalId") ||
      "",
    businessId: storage.getItem("businessId") || "",
    professionalId: storage.getItem("professionalId") || "",
    contractorId: storage.getItem("contractorId") || "",
    businessName:
      storage.getItem("businessName") ||
      storage.getItem("companyName") ||
      storage.getItem("selectedProfessionalName") ||
      "",
    serviceDomain:
      storage.getItem("businessServiceDomain") ||
      storage.getItem("businessDomain") ||
      "",
    category:
      storage.getItem("businessCategory") ||
      storage.getItem("userRole") ||
      "",
    businessCategory:
      storage.getItem("businessCategory") ||
      storage.getItem("userRole") ||
      "",
    serviceCategories: readJsonArray("businessServiceCategories"),
    serviceCapabilities: readJsonArray("businessServiceCapabilities"),
    businessServiceCapabilities: readJsonArray("businessServiceCapabilities"),
    serviceSpecialties: readJsonArray("businessServiceSpecialties"),
    availability: readJsonArray("businessAvailability"),
    primaryCity: storage.getItem("businessPrimaryCity") || "",
    city: storage.getItem("businessPrimaryCity") || "",
    zipCodes: storage.getItem("businessZipCodes") || "",
    serviceRadius: storage.getItem("businessServiceRadius") || "",
    emergencyAvailable:
      storage.getItem("businessEmergencyAvailable") ||
      storage.getItem("meetroDispatchReady") ||
      storage.getItem("emergencyAvailable") ||
      "",
  };
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(normalizeServiceCategory).filter(Boolean);
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
  ].map(normalizeServiceCategory).filter(Boolean);

  if (capabilityCategories.length > 0) {
    return [...new Set(capabilityCategories)];
  }

  const categories = [
    professional.category,
    professional.businessCategory,
    professional.business_category,
    professional.serviceCategory,
    professional.service_category,
    professional.userRole,
  ].map(normalizeServiceCategory).filter(Boolean);

  return [...new Set(categories)];
}

function getRequestDomain(request = {}, category = "") {
  return normalizeServiceDomain(
    request.serviceDomain ||
      request.service_domain ||
      request.requestDomain ||
      request.request_domain ||
      request.domain ||
      request.industryType ||
      request.industry_type ||
      request.industry
  ) || inferServiceDomain(category);
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
      ""
  )
    .split(/[,\s]+/)
    .map((zip) => zip.trim())
    .filter(Boolean);

  if (requestZip && professionalZips.length > 0) {
    return professionalZips.includes(requestZip);
  }

  const requestCity = String(request.city || request.primaryCity || "").trim().toLowerCase();
  const professionalCity = String(professional.primaryCity || professional.city || "").trim().toLowerCase();

  if (requestCity && professionalCity) {
    return requestCity === professionalCity;
  }

  return true;
}

function matchesAvailability(professional = {}, request = {}) {
  const requestTiming = normalizeServiceCategory(
    request.timing ||
      request.availabilityNeeded ||
      request.availability ||
      ""
  );

  if (!requestTiming) return true;

  const availability = normalizeList(professional.availability);
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
  const type = normalizeServiceCategory(request.type || request.requestType || request.workflowType);
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
  const emergencyAvailabilityMatched = matchesEmergencyAvailability(professional, request);

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
