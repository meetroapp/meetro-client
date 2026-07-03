import {
  inferRequestCategory,
  inferServiceDomain,
  normalizeServiceCategory,
  normalizeServiceDomain,
} from "./professionalRequestMatching.js";

const REQUEST_SPECIALTY_DOMAINS = Object.freeze({
  appliance_installation: "home_services",
  cabinetry: "home_services",
  door_installation: "home_services",
  door_repair: "home_services",
  door_replacement: "home_services",
  drywall: "home_services",
  ceiling_fan_installation: "home_services",
  electrical: "home_services",
  flooring: "home_services",
  garage_door_opener_installation: "home_services",
  general_maintenance: "home_services",
  handyman: "home_services",
  painting: "home_services",
  plumbing: "home_services",
  plumbing_repairs: "home_services",
  pressure_washing: "home_services",
  tile: "home_services",

  caregiver: "healthcare",
  home_health: "healthcare",
  medical_transport: "healthcare",
  nursing: "healthcare",
  senior_care: "healthcare",

  rental_maintenance: "property_management",
  tenant_ticket: "property_management",

  private_transportation: "transportation",
  automotive_services: "transportation",
  car_detailing: "transportation",
  mechanic: "transportation",
  mobile_services: "transportation",
});

const KNOWN_DOMAINS = new Set([
  "healthcare",
  "home_services",
  "property_management",
  "transportation",
]);

function getRequestSearchText(request = {}) {
  return [
    request.service,
    request.title,
    request.requestTitle,
    request.description,
    request.issue,
    request.notes,
    request.category,
    request.serviceCategory,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inferSpecialtyFromText(request = {}) {
  const text = getRequestSearchText(request);

  if (!text) return "";

  if (text.includes("nursing") || text.includes("nurse")) return "nursing";
  if (text.includes("senior care")) return "senior_care";
  if (text.includes("caregiver")) return "caregiver";
  if (text.includes("home health")) return "home_health";
  if (text.includes("medical transport")) return "medical_transport";

  if (text.includes("private transportation") || text.includes("private ride")) {
    return "private_transportation";
  }
  if (
    text.includes("mobile mechanic") ||
    text.includes("mechanic") ||
    text.includes("car won't start") ||
    text.includes("car wont start") ||
    text.includes("vehicle won't start") ||
    text.includes("vehicle wont start") ||
    text.includes("engine won't start") ||
    text.includes("engine wont start") ||
    text.includes("dead battery") ||
    text.includes("jump start")
  ) {
    return "mechanic";
  }
  if (text.includes("car detail") || text.includes("detailing")) return "car_detailing";
  if (text.includes("automotive")) return "automotive_services";

  if (text.includes("tenant ticket")) return "tenant_ticket";
  if (text.includes("tenant") && text.includes("maintenance")) return "tenant_ticket";
  if (text.includes("rental maintenance")) return "rental_maintenance";

  if (text.includes("pressure washing") || text.includes("pressure wash")) {
    return "pressure_washing";
  }

  if (text.includes("appliance installation") || text.includes("install appliance")) {
    return "appliance_installation";
  }

  if (text.includes("door replacement") || text.includes("replace door")) {
    return "door_replacement";
  }

  if (text.includes("garage") && text.includes("opener")) {
    return "garage_door_opener_installation";
  }

  if (text.includes("door repair") || text.includes("fix door") || text.includes("door")) {
    return "door_repair";
  }

  if (text.includes("drywall")) return "drywall";
  if (text.includes("paint")) return "painting";
  if (text.includes("faucet") || text.includes("plumbing repair")) {
    return "plumbing_repairs";
  }
  if (text.includes("plumbing") || text.includes("plumber") || text.includes("leak")) {
    return "plumbing";
  }
  if (text.includes("ceiling fan")) return "ceiling_fan_installation";
  if (text.includes("electrical") || text.includes("outlet") || text.includes("breaker")) {
    return "electrical";
  }
  if (text.includes("tile")) return "tile";
  if (text.includes("cabinet")) return "cabinetry";
  if (text.includes("flooring") || text.includes("floor")) return "flooring";
  if (text.includes("general maintenance")) return "general_maintenance";
  if (text.includes("handyman")) return "handyman";

  return "";
}

export function inferRequestSpecialty(request = {}) {
  const explicitSpecialty = normalizeServiceCategory(
    request.serviceSpecialty ||
      request.service_specialty ||
      request.specialty ||
      request.requestSpecialty ||
      ""
  );

  if (REQUEST_SPECIALTY_DOMAINS[explicitSpecialty]) return explicitSpecialty;

  const textSpecialty = inferSpecialtyFromText(request);
  if (REQUEST_SPECIALTY_DOMAINS[textSpecialty]) return textSpecialty;

  const category = inferRequestCategory(request);
  if (REQUEST_SPECIALTY_DOMAINS[category]) return category;

  return "";
}

export function buildRequestMatchingFields(request = {}) {
  const rawDomain =
    request.serviceDomain ||
    request.service_domain ||
    request.requestDomain ||
    request.domain ||
    "";
  const explicitDomain = normalizeServiceDomain(rawDomain);
  const hasExplicitDomain = String(rawDomain || "").trim() !== "";
  const requestCategory = inferRequestCategory(request);
  const serviceSpecialty = inferRequestSpecialty(request);
  const specialtyDomain = REQUEST_SPECIALTY_DOMAINS[serviceSpecialty] || "";
  const categoryDomain = inferServiceDomain(requestCategory);
  const serviceDomain = hasExplicitDomain
    ? KNOWN_DOMAINS.has(explicitDomain)
      ? explicitDomain
      : ""
    : specialtyDomain || categoryDomain || "";

  return {
    serviceDomain,
    service_domain: serviceDomain,
    requestCategory: requestCategory || serviceSpecialty || "",
    request_category: requestCategory || serviceSpecialty || "",
    category: request.category || requestCategory || serviceSpecialty || "",
    serviceSpecialty,
    service_specialty: serviceSpecialty,
  };
}

export function enrichRequestWithMatchingFields(request = {}) {
  return {
    ...request,
    ...buildRequestMatchingFields(request),
  };
}
