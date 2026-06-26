import { getAccountStorageIdentity } from "./accountStorage.js";

export function safeParseStorageJson(storage, key, fallback = {}) {
  try {
    return JSON.parse(storage.getItem(key) || "") || fallback;
  } catch {
    return fallback;
  }
}

export function normalizeStorageKeyPart(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getStoredUserPhotoIdentity(storage = globalThis.localStorage) {
  const user = safeParseStorageJson(storage, "user", {});
  return (
    getAccountStorageIdentity(
      {
        ...user,
        id: storage.getItem("userId") || user.id || "",
        email: storage.getItem("userEmail") || user.email || "",
      },
      storage.getItem("userEmail") || ""
    ) || "guest"
  );
}

export function getStoredContractorProfile(storage = globalThis.localStorage) {
  return safeParseStorageJson(storage, "contractorProfile", {});
}

export function getBusinessPhotoIdentity(
  profile = {},
  storage = globalThis.localStorage
) {
  const storedProfile = getStoredContractorProfile(storage);
  const businessId =
    profile?.id ||
    profile?.businessId ||
    profile?.business_id ||
    storedProfile?.id ||
    storedProfile?.businessId ||
    "";
  const businessName =
    profile?.business_name ||
    profile?.businessName ||
    profile?.name ||
    storage.getItem("businessName") ||
    storedProfile?.businessName ||
    storedProfile?.business_name ||
    "";
  const businessCategory =
    profile?.category ||
    profile?.businessCategory ||
    storage.getItem("businessCategory") ||
    storedProfile?.category ||
    "";

  return (
    normalizeStorageKeyPart(businessId) ||
    normalizeStorageKeyPart(`${businessName}-${businessCategory}`) ||
    normalizeStorageKeyPart(getStoredUserPhotoIdentity(storage)) ||
    "business"
  );
}

export function getScopedProfilePhotoKey(
  mode = "personal",
  profile = {},
  storage = globalThis.localStorage
) {
  if (mode === "business") {
    return `meetroBusinessProfilePhoto:${getBusinessPhotoIdentity(profile, storage)}`;
  }

  return `meetroPersonalProfilePhoto:${normalizeStorageKeyPart(
    getStoredUserPhotoIdentity(storage)
  )}`;
}

export function isSameBusinessProfile(storedProfile = {}, profile = {}, storage = globalThis.localStorage) {
  const storedId = storedProfile?.id || storedProfile?.businessId || "";
  const profileId = profile?.id || profile?.businessId || profile?.business_id || "";

  if (storedId && profileId) return String(storedId) === String(profileId);

  const storedName = normalizeStorageKeyPart(
    storedProfile?.businessName || storedProfile?.business_name || ""
  );
  const profileName = normalizeStorageKeyPart(
    profile?.business_name ||
      profile?.businessName ||
      storage.getItem("businessName") ||
      ""
  );

  return Boolean(storedName && profileName && storedName === profileName);
}

export function getScopedProfilePhoto(
  mode = "personal",
  profile = {},
  storage = globalThis.localStorage
) {
  const scopedPhoto = storage.getItem(
    getScopedProfilePhotoKey(mode, profile, storage)
  );

  if (scopedPhoto) return scopedPhoto;

  if (mode === "business") {
    const profilePhoto = profile?.image_url || profile?.imageUrl || "";
    if (profilePhoto) return profilePhoto;

    const storedProfile = getStoredContractorProfile(storage);
    if (isSameBusinessProfile(storedProfile, profile, storage)) {
      return (
        storedProfile?.image_url ||
        storedProfile?.imageUrl ||
        storedProfile?.logo ||
        ""
      );
    }
  }

  return "";
}
