export const PUBLIC_BUSINESS_PROFILES_STORAGE_KEY =
  "meetroPublicBusinessProfiles";

export function getBusinessProfileShareId(profile = {}) {
  const rawId =
    profile.publicProfileId ||
    profile.id ||
    profile.business_id ||
    profile.contractorId ||
    profile.business_name ||
    profile.name ||
    "business-profile";

  return String(rawId)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildBusinessProfileUrl(profile = {}, options = {}) {
  const profileId = getBusinessProfileShareId(profile);
  const baseUrl =
    options.baseUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "");

  return `${baseUrl}#contractorDetails?profileId=${encodeURIComponent(
    profileId
  )}`;
}

export function buildBusinessProfileShare(profile = {}, options = {}) {
  const title =
    profile.business_name ||
    profile.businessName ||
    profile.name ||
    options.fallbackTitle ||
    "Meetro Business Profile";
  const description =
    profile.shortDescription ||
    profile.description ||
    profile.bio ||
    profile.businessDescription ||
    "";
  const category =
    profile.displayCategory ||
    profile.categoryLabel ||
    profile.category ||
    profile.businessCategory ||
    "";
  const serviceArea =
    profile.serviceArea ||
    profile.service_area ||
    profile.location ||
    profile.businessServiceArea ||
    "";
  const intro =
    options.shareIntro ||
    "View my Meetro business profile to see services, portfolio, reviews, and contact information.";
  const text = [intro, description, category, serviceArea]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join("\n");

  return {
    title,
    text,
    url: buildBusinessProfileUrl(profile, options),
  };
}

export function persistBusinessProfileShareRecord(profile = {}, storage) {
  const profileId = getBusinessProfileShareId(profile);
  const publicRecord = {
    ...profile,
    id: profile.id || profileId,
    publicProfileId: profileId,
  };
  const activeStorage =
    storage || (typeof localStorage !== "undefined" ? localStorage : null);

  if (activeStorage) {
    let savedProfiles = {};

    try {
      savedProfiles = JSON.parse(
        activeStorage.getItem(PUBLIC_BUSINESS_PROFILES_STORAGE_KEY) || "{}"
      );
    } catch {
      savedProfiles = {};
    }

    activeStorage.setItem("selectedContractor", JSON.stringify(publicRecord));
    activeStorage.setItem(
      PUBLIC_BUSINESS_PROFILES_STORAGE_KEY,
      JSON.stringify({ ...savedProfiles, [profileId]: publicRecord })
    );
  }

  return { profileId, publicRecord };
}
