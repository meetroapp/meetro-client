import {
  buildProfessionalSpecialtyProfile,
  getProfessionalSpecialtyLabel,
  getProfessionalSpecialtyOption,
} from "./professionalOnboardingSpecialties.js";

export const BUSINESS_SERVICE_STORAGE_KEYS = Object.freeze({
  categories: "businessServiceCategories",
  capabilities: "businessServiceCapabilities",
  specialties: "businessServiceSpecialties",
  domains: "businessServiceDomains",
  domain: "businessServiceDomain",
  category: "businessCategory",
  radius: "businessServiceRadius",
  contractorProfile: "contractorProfile",
});

function getBrowserStorage() {
  try {
    if (typeof globalThis === "undefined") return null;
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

const EMPTY_STORAGE = Object.freeze({
  getItem() {
    return null;
  },
});

function readJsonArray(storage, key) {
  try {
    const parsed = JSON.parse(storage?.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readJsonObject(storage, key) {
  try {
    const parsed = JSON.parse(storage?.getItem(key) || "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function readBusinessServiceProfile(
  storage,
  profileData = {}
) {
  const safeStorage = storage || getBrowserStorage();
  const contractorProfile = readJsonObject(
    safeStorage,
    BUSINESS_SERVICE_STORAGE_KEYS.contractorProfile
  );
  const source = { ...contractorProfile, ...profileData };
  const rawServiceSpecialties =
    source.serviceSpecialties ||
    source.service_specialties ||
    source.businessServiceSpecialties ||
    source.business_service_specialties ||
    readJsonArray(safeStorage, BUSINESS_SERVICE_STORAGE_KEYS.specialties);
  const savedServiceSpecialties = Array.isArray(rawServiceSpecialties)
    ? rawServiceSpecialties
    : [];
  const rawServiceCapabilities =
    source.serviceCapabilities ||
    source.service_capabilities ||
    source.businessServiceCapabilities ||
    source.business_service_capabilities ||
    readJsonArray(safeStorage, BUSINESS_SERVICE_STORAGE_KEYS.capabilities);
  const serviceCapabilities = Array.isArray(rawServiceCapabilities)
    ? rawServiceCapabilities
    : [];
  const capabilities =
    serviceCapabilities.length > 0
      ? normalizeBusinessServiceCapabilities(serviceCapabilities, savedServiceSpecialties)
      : buildBusinessServiceCapabilities(savedServiceSpecialties);
  const serviceSpecialties =
    savedServiceSpecialties.length > 0
      ? savedServiceSpecialties
      : capabilities.map((capability) => capability.serviceId).filter(Boolean);

  return {
    serviceDomain:
      source.serviceDomain ||
      source.service_domain ||
      source.businessServiceDomain ||
      source.business_service_domain ||
      safeStorage?.getItem(BUSINESS_SERVICE_STORAGE_KEYS.domain) ||
      "",
    serviceDomains:
      source.serviceDomains ||
      source.service_domains ||
      source.businessServiceDomains ||
      source.business_service_domains ||
      readJsonArray(safeStorage, BUSINESS_SERVICE_STORAGE_KEYS.domains),
    serviceCategories:
      source.serviceCategories ||
      source.service_categories ||
      source.businessServiceCategories ||
      source.business_service_categories ||
      readJsonArray(safeStorage, BUSINESS_SERVICE_STORAGE_KEYS.categories),
    serviceSpecialties,
    serviceCapabilities: capabilities,
    businessServiceCapabilities: capabilities,
  };
}

function defaultTranslate(key) {
  return "";
}

function humanizeLabel(value = "") {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function getBusinessServicesProjection(source = {}, options = {}) {
  const hasExplicitSource =
    source && typeof source === "object" && Object.keys(source).length > 0;
  const storage =
    hasExplicitSource && options.useStorageFallback !== true
      ? EMPTY_STORAGE
      : options.storage;
  const serviceProfile = readBusinessServiceProfile(storage, source);
  const translate = options.translate || defaultTranslate;
  const serviceIds = unique(serviceProfile.serviceSpecialties);
  const capabilities = serviceProfile.serviceCapabilities;
  const categories = unique(serviceProfile.serviceCategories);
  const domains = unique(serviceProfile.serviceDomains);
  const labels = serviceIds.map((serviceId) => {
    const translated = getProfessionalSpecialtyLabel(serviceId, translate);
    return translated && translated !== serviceId ? translated : humanizeLabel(serviceId);
  });
  const categoryLabels = categories.map(humanizeLabel);
  const displayLabels = labels.length > 0 ? labels : categoryLabels;
  const matchingKeywords = unique([
    ...serviceIds,
    ...categories,
    ...domains,
    ...displayLabels,
    ...capabilities.flatMap((capability) => [
      capability.id,
      capability.serviceId,
      capability.specialty,
      capability.category,
      capability.domain,
    ]),
  ].map((value) => String(value || "").trim()).filter(Boolean));

  return {
    serviceIds,
    serviceLabels: labels,
    displayLabels,
    categories,
    categoryLabels,
    domains,
    primaryServiceId: serviceIds[0] || "",
    primaryLabel: displayLabels[0] || "",
    shortSummary: displayLabels.slice(0, 3).join(", "),
    publicSummary: displayLabels.length > 3
      ? `${displayLabels.slice(0, 3).join(", ")} +${displayLabels.length - 3}`
      : displayLabels.join(", "),
    capabilities,
    matchingKeywords,
    isEmpty: displayLabels.length === 0,
  };
}

export function buildBusinessServiceCapabilities(serviceSpecialties = []) {
  const specialtyProfile = buildProfessionalSpecialtyProfile({
    serviceSpecialties,
  });

  return specialtyProfile.serviceSpecialties.map((specialty) => {
    const option = getProfessionalSpecialtyOption(specialty);
    const domain = option?.domain || "";
    const category =
      buildProfessionalSpecialtyProfile({ serviceSpecialties: [specialty] })
        .serviceCategories[0] || specialty;

    return {
      id: `capability:${specialty}`,
      serviceId: specialty,
      specialty,
      category,
      domain,
      labelKey: option?.labelKey || "",
      status: "active",
      requirements: {
        licenseRequired: false,
        certificationRequired: false,
        insuranceRequired: false,
      },
      metadata: {
        premiumCapability: false,
        emergencyCapable: false,
      },
    };
  });
}

export function normalizeBusinessServiceCapabilities(
  capabilities = [],
  fallbackSpecialties = []
) {
  const ids = capabilities
    .map((capability) => {
      if (typeof capability === "string") return capability;
      return capability?.serviceId || capability?.specialty || capability?.id || "";
    })
    .map((id) => String(id).replace(/^capability:/, ""))
    .filter(Boolean);

  return buildBusinessServiceCapabilities(ids.length > 0 ? ids : fallbackSpecialties);
}

export function writeBusinessServiceProfile(
  {
    serviceSpecialties = [],
    selectedSpecialties = [],
    otherService = "",
    serviceRadius = "",
  } = {},
  storage
) {
  const safeStorage = storage || getBrowserStorage();
  const specialtyProfile = buildProfessionalSpecialtyProfile({
    selectedSpecialties,
    serviceSpecialties,
    otherService,
  });
  const capabilities = buildBusinessServiceCapabilities(
    specialtyProfile.serviceSpecialties
  );

  if (!safeStorage) {
    return {
      ...specialtyProfile,
      serviceCapabilities: capabilities,
      businessServiceCapabilities: capabilities,
    };
  }

  safeStorage.setItem(
    BUSINESS_SERVICE_STORAGE_KEYS.categories,
    JSON.stringify(specialtyProfile.serviceCategories)
  );
  safeStorage.setItem(
    BUSINESS_SERVICE_STORAGE_KEYS.specialties,
    JSON.stringify(specialtyProfile.serviceSpecialties)
  );
  safeStorage.setItem(
    BUSINESS_SERVICE_STORAGE_KEYS.capabilities,
    JSON.stringify(capabilities)
  );
  safeStorage.setItem(
    BUSINESS_SERVICE_STORAGE_KEYS.domains,
    JSON.stringify(specialtyProfile.serviceDomains)
  );
  safeStorage.setItem(BUSINESS_SERVICE_STORAGE_KEYS.domain, specialtyProfile.serviceDomain);
  safeStorage.setItem(
    BUSINESS_SERVICE_STORAGE_KEYS.category,
    specialtyProfile.serviceCategories[0] || otherService || ""
  );
  if (serviceRadius) {
    safeStorage.setItem(BUSINESS_SERVICE_STORAGE_KEYS.radius, serviceRadius);
  }

  const existingProfile = readJsonObject(
    safeStorage,
    BUSINESS_SERVICE_STORAGE_KEYS.contractorProfile
  );
  safeStorage.setItem(
    BUSINESS_SERVICE_STORAGE_KEYS.contractorProfile,
    JSON.stringify({
      ...existingProfile,
      serviceCategories: specialtyProfile.serviceCategories,
      businessServiceCategories: specialtyProfile.serviceCategories,
      serviceSpecialties: specialtyProfile.serviceSpecialties,
      businessServiceSpecialties: specialtyProfile.serviceSpecialties,
      serviceCapabilities: capabilities,
      businessServiceCapabilities: capabilities,
      serviceDomains: specialtyProfile.serviceDomains,
      businessServiceDomains: specialtyProfile.serviceDomains,
      serviceDomain: specialtyProfile.serviceDomain,
      businessServiceDomain: specialtyProfile.serviceDomain,
    })
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("businessServicesChanged"));
  }

  return {
    ...specialtyProfile,
    serviceCapabilities: capabilities,
    businessServiceCapabilities: capabilities,
  };
}
