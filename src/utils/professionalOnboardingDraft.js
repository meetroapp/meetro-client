import { inferProfessionalSpecialtiesFromLegacyCategories } from "./professionalOnboardingSpecialties.js";

const safeDraftString = (value) =>
  typeof value === "string" ? value : "";

const safeDraftArray = (value) =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim())
    : [];

export function normalizeProfessionalOnboardingDraft(saved = {}, fallbacks = {}) {
  const source =
    saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  const savedServiceCategories = safeDraftArray(source.serviceCategories);
  const explicitSpecialties = safeDraftArray(source.serviceSpecialties);
  const inferredSpecialties = inferProfessionalSpecialtiesFromLegacyCategories(
    savedServiceCategories
  );

  return {
    businessName:
      safeDraftString(source.businessName) || safeDraftString(fallbacks.businessName),
    contactName:
      safeDraftString(source.contactName) || safeDraftString(fallbacks.contactName),
    phone: safeDraftString(source.phone) || safeDraftString(fallbacks.phone),
    email: safeDraftString(source.email) || safeDraftString(fallbacks.email),
    serviceCategories: savedServiceCategories,
    serviceSpecialties:
      explicitSpecialties.length > 0 ? explicitSpecialties : inferredSpecialties,
    primaryServiceCategory:
      safeDraftString(source.primaryServiceCategory) ||
      safeDraftString(source.primary_service_category),
    otherService: safeDraftString(source.otherService),
    primaryCity:
      safeDraftString(source.primaryCity) || safeDraftString(fallbacks.primaryCity),
    zipCodes:
      safeDraftString(source.zipCodes) || safeDraftString(fallbacks.zipCodes),
    serviceRadius: safeDraftString(source.serviceRadius) || "15 miles",
    customRadius: safeDraftString(source.customRadius),
    availability: safeDraftArray(source.availability),
  };
}

export function normalizeProfessionalOnboardingStep(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 6 ? parsed : 1;
}
