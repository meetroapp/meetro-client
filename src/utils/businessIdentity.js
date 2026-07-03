import { getBusinessServicesProjection } from "./businessServiceProfile.js";
import { getBusinessVerificationProjection } from "./businessVerification.js";
import { getScopedProfilePhoto } from "./profilePhotoScoping.js";

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function safeStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function safeReadJson(storage, key, fallback = {}) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(key) || "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

function normalizeList(...values) {
  return values
    .flatMap((value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string" && value.includes(",")) {
        return value.split(",");
      }
      return value ? [value] : [];
    })
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function initialsFor(value = "") {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "M";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function getStoredBusinessProfile(storage = safeStorage()) {
  return safeReadJson(storage, "contractorProfile", {});
}

export function getBusinessIdentityProjection(source = {}, options = {}) {
  const storage = options.storage ?? safeStorage();
  const hasExplicitSource =
    source && typeof source === "object" && Object.keys(source).length > 0;
  const allowStorageFallback =
    !hasExplicitSource || options.useStorageFallback === true;
  const storedProfile = options.storedProfile || (allowStorageFallback ? getStoredBusinessProfile(storage) : {});
  const profile = {
    ...storedProfile,
    ...(source || {}),
  };

  const businessName = firstValue(
    profile.businessName,
    profile.business_name,
    profile.displayName,
    profile.name,
    allowStorageFallback ? storage?.getItem?.("businessName") : "",
    options.fallbackName,
    "Business"
  );
  const category = firstValue(
    profile.displayCategory,
    profile.categoryLabel,
    profile.category,
    profile.businessCategory,
    profile.business_category,
    profile.serviceCategory,
    allowStorageFallback ? storage?.getItem?.("businessCategory") : ""
  );
  const serviceArea = firstValue(
    profile.serviceArea,
    profile.service_area,
    profile.publicAddress,
    profile.public_address,
    profile.location,
    profile.city,
    profile.primaryCity,
    allowStorageFallback ? storage?.getItem?.("businessServiceArea") : "",
    allowStorageFallback ? storage?.getItem?.("meetroServiceAreaNotes") : ""
  );
  const servicesProjection = getBusinessServicesProjection(profile, {
    storage,
    translate: options.translate,
    useStorageFallback: allowStorageFallback,
  });
  const businessProfilePhoto = firstValue(
    options.businessProfilePhoto,
    storage && allowStorageFallback ? getScopedProfilePhoto("business", profile, storage) : "",
    profile.profilePhoto,
    profile.profile_photo,
    profile.businessProfilePhoto,
    profile.image_url,
    profile.imageUrl
  );
  const businessLogo = firstValue(
    profile.logo,
    profile.logoUrl,
    profile.logo_url,
    profile.businessLogo,
    profile.business_logo
  );
  const ownerAvatar = firstValue(
    profile.ownerAvatar,
    profile.owner_avatar,
    profile.avatar,
    profile.avatarUrl,
    profile.avatar_url,
    profile.profileImage,
    profile.profile_image
  );
  const verificationProjection = getBusinessVerificationProjection(profile, {
    storage: allowStorageFallback ? storage : null,
    translate: options.translate,
  });

  return {
    id: firstValue(profile.id, profile.businessId, profile.business_id, profile.contractorId),
    businessName,
    displayName: businessName,
    category,
    services: servicesProjection.displayLabels,
    servicesSummary: servicesProjection.shortSummary,
    servicesOffered: servicesProjection,
    logo: businessLogo,
    profilePhoto: businessProfilePhoto,
    ownerAvatar,
    imageUrl: firstValue(businessProfilePhoto, businessLogo, ownerAvatar),
    initials: initialsFor(businessName),
    coverImage: firstValue(profile.coverImage, profile.cover_image, profile.heroImage, profile.hero_image),
    tagline: firstValue(profile.tagline, profile.headline),
    description: firstValue(profile.description, profile.businessDescription, profile.business_description, profile.bio),
    phone: firstValue(
      profile.phone,
      profile.businessPhone,
      profile.business_phone,
      allowStorageFallback ? storage?.getItem?.("businessPhone") : ""
    ),
    email: firstValue(
      profile.email,
      profile.businessEmail,
      profile.business_email,
      allowStorageFallback ? storage?.getItem?.("businessEmail") : ""
    ),
    website: firstValue(profile.website, profile.businessWebsite, profile.business_website),
    serviceArea,
    city: firstValue(profile.city, profile.businessCity, profile.primaryCity),
    state: firstValue(profile.state, profile.businessState, profile.stateProvince, profile.state_province),
    languages: normalizeList(profile.languages, profile.serviceLanguages),
    yearsInBusiness: firstValue(profile.yearsInBusiness, profile.years_in_business, profile.yearsServing, profile.years_serving),
    verified: verificationProjection.verified,
    verificationStatus: verificationProjection.status,
    verification: verificationProjection,
    source: profile,
  };
}

export function applyBusinessIdentityFields(record = {}, options = {}) {
  const identity = getBusinessIdentityProjection(record, {
    ...options,
    useStorageFallback: options.useStorageFallback ?? true,
  });
  return {
    ...record,
    name: identity.businessName,
    businessName: identity.businessName,
    business_name: identity.businessName,
    displayName: identity.displayName,
    category: identity.category || record.category,
    displayCategory: identity.servicesSummary || identity.category || record.displayCategory,
    serviceSpecialties: identity.servicesOffered.serviceIds,
    businessServiceSpecialties: identity.servicesOffered.serviceIds,
    serviceCategories: identity.servicesOffered.categories,
    businessServiceCategories: identity.servicesOffered.categories,
    serviceCapabilities: identity.servicesOffered.capabilities,
    businessServiceCapabilities: identity.servicesOffered.capabilities,
    logo: identity.logo || identity.imageUrl,
    image_url: identity.imageUrl,
    imageUrl: identity.imageUrl,
    profilePhoto: identity.profilePhoto || identity.imageUrl,
    serviceArea: identity.serviceArea,
    location: identity.serviceArea || record.location,
    phone: identity.phone,
    email: identity.email,
    website: identity.website,
    verified: identity.verified,
    verificationStatus: identity.verificationStatus,
    verificationLabel: identity.verification.verificationLabel,
    verificationBadgeText: identity.verification.badgeText,
    publicTrustSummary: identity.verification.publicTrustSummary,
    trustLayers: identity.verification.layers,
  };
}
