import {
  PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS,
  getProfessionalSpecialtyLabel,
} from "./professionalOnboardingSpecialties.js";
import {
  inferServiceDomain,
  normalizeServiceCategory,
} from "./professionalRequestMatching.js";

const SERVICE_ALIASES = Object.freeze({
  appliance_installation: ["appliance install", "install appliance"],
  cabinetry: ["cabinet", "cabinet replacement", "cabinet repair"],
  ceiling_fan_installation: ["ceiling fan", "fan install", "install fan"],
  door_replacement: ["door replacement", "replace door"],
  drywall: ["drywall", "wall patch", "wall repair"],
  electrical: ["outlet", "breaker", "switch", "light fixture", "electrical"],
  flooring: ["flooring", "floor repair"],
  garage_door_opener_installation: [
    "garage opener",
    "garage door opener",
    "garage remote",
    "garage spring",
    "garage door",
  ],
  general_maintenance: ["general maintenance", "home maintenance"],
  handyman: ["handyman", "mount", "assemble", "tv mounting", "home repair"],
  mechanic: [
    "car won't start",
    "car wont start",
    "vehicle won't start",
    "vehicle wont start",
    "battery dead",
    "dead battery",
    "vehicle won't crank",
    "vehicle wont crank",
    "mobile mechanic",
    "mechanic",
  ],
  painting: ["paint", "painting"],
  plumbing: ["plumbing", "plumber", "pipe", "drain"],
  plumbing_repairs: ["leaking faucet", "faucet leak", "kitchen faucet", "sink leak"],
  pressure_washing: ["pressure washing", "pressure wash"],
  private_transportation: ["private ride", "airport ride", "transportation"],
  rental_maintenance: ["rental maintenance"],
  tenant_ticket: ["tenant maintenance", "tenant ticket"],
});

const REQUEST_CATEGORY_BY_SERVICE = Object.freeze({
  appliance_installation: "applianceRepair",
  cabinetry: "carpentry",
  ceiling_fan_installation: "electrical",
  door_replacement: "doorsWindows",
  drywall: "drywall",
  electrical: "electrical",
  flooring: "flooring",
  garage_door_opener_installation: "doorsWindows",
  general_maintenance: "handyman",
  handyman: "handyman",
  mechanic: "mechanic",
  mobile_services: "mobileServices",
  painting: "painting",
  plumbing: "plumbing",
  plumbing_repairs: "plumbing",
  pressure_washing: "pressureWashing",
  private_transportation: "privateTransportation",
  rental_maintenance: "propertyManagement",
  tenant_ticket: "propertyManagement",
});

const CATEGORY_LABEL_BY_SERVICE = Object.freeze({
  garage_door_opener_installation: "Garage Door Service",
  mechanic: "Mechanic / Mobile Mechanic",
  plumbing_repairs: "Plumbing",
});

function humanizeServiceId(serviceId = "") {
  return String(serviceId || "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeText(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ");
}

function collectRegistryServices() {
  return PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS.flatMap((group) =>
    group.options.map((option) => ({
      id: option.value,
      serviceId: option.value,
      capabilityId: `capability:${option.value}`,
      labelKey: option.labelKey,
      domain: group.domain,
      canonicalRequestCategory: option.value,
      requestCategory:
        REQUEST_CATEGORY_BY_SERVICE[option.value] || normalizeServiceCategory(option.value),
      aliases: SERVICE_ALIASES[option.value] || [],
    }))
  );
}

export function getRequestIntelligenceServices(translate = (key) => key) {
  return collectRegistryServices().map((service) => ({
    ...service,
    label: (() => {
      const translated = getProfessionalSpecialtyLabel(service.serviceId, translate);
      return translated && translated !== service.labelKey
        ? translated
        : humanizeServiceId(service.serviceId);
    })(),
    categoryLabel: (() => {
      const translated = getProfessionalSpecialtyLabel(service.serviceId, translate);
      return (
        CATEGORY_LABEL_BY_SERVICE[service.serviceId] ||
        (translated && translated !== service.labelKey
          ? translated
          : humanizeServiceId(service.requestCategory))
      );
    })(),
  }));
}

function getCustomerFacingSuggestion(service, text) {
  if (
    service.serviceId === "mechanic" &&
    /\b(won't start|wont start|will not start|dead battery|battery dead|won't crank|wont crank|will not crank)\b/.test(
      text
    )
  ) {
    return "Vehicle won't start";
  }

  if (service.serviceId === "handyman" && /\b(home repair|home repairs)\b/.test(text)) {
    return "General Service";
  }

  return service.label;
}

function scoreService(service, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const label = normalizeText(service.label);
  const serviceId = normalizeText(service.serviceId.replace(/_/g, " "));
  const aliases = service.aliases.map(normalizeText);
  const haystack = [label, serviceId, service.requestCategory, ...aliases]
    .map(normalizeText)
    .join(" ");

  if (aliases.some((alias) => alias && normalizedQuery.includes(alias))) return 100;
  if (label === normalizedQuery || serviceId === normalizedQuery) return 95;
  if (label.includes(normalizedQuery) || serviceId.includes(normalizedQuery)) return 80;

  const words = normalizedQuery.split(" ").filter(Boolean);
  const matchedWords = words.filter((word) => haystack.includes(word));
  return matchedWords.length > 0 ? matchedWords.length * 12 : 0;
}

export function searchRequestServices(query = "", { translate = (key) => key, limit = 5 } = {}) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  return getRequestIntelligenceServices(translate)
    .map((service) => ({ ...service, score: scoreService(service, normalizedQuery) }))
    .filter((service) => service.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function classifyRequestIntent(input = {}, options = {}) {
  const text = normalizeText(
    typeof input === "string"
      ? input
      : [
          input.userText,
          input.title,
          input.description,
          input.businessType,
          input.service,
          input.category,
        ].filter(Boolean).join(" ")
  );
  const translate = options.translate || ((key) => key);
  const unknownIntent = {
    serviceDomain: "",
    serviceDomainLabel: "Unknown",
    category: "",
    categoryLabel: "More details needed",
    suggestedServiceLabel: "More details needed",
    serviceId: "",
    serviceSpecialty: "",
    confidence: "low",
    supported: false,
    reason: "not_enough_information",
  };

  if (!text) return unknownIntent;

  const [service] = searchRequestServices(text, { translate, limit: 1 });
  if (!service) return unknownIntent;

  const serviceDomain = service.domain || inferServiceDomain(service.requestCategory);
  const isBroadHomeService =
    service.serviceId === "handyman" && /\b(home repair|home repairs)\b/.test(text);
  return {
    serviceDomain,
    serviceDomainLabel:
      serviceDomain === "transportation"
        ? "Automotive"
        : serviceDomain === "home_services"
          ? "Home Services"
          : serviceDomain,
    category: service.requestCategory,
    categoryLabel: isBroadHomeService ? "General Service" : service.categoryLabel,
    suggestedServiceLabel: getCustomerFacingSuggestion(service, text),
    serviceId: service.serviceId,
    serviceSpecialty: service.serviceId,
    confidence: service.score >= 80 ? "high" : "medium",
    supported: true,
    reason: isBroadHomeService ? "broad_home_service" : service.serviceId,
  };
}
