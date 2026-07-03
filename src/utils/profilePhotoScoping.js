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

function firstPhotoValue(...values) {
  return (
    values
      .map((value) => String(value || "").trim())
      .find(Boolean) || ""
  );
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getRecordIdentityIds(record = {}) {
  return [
    record.id,
    record.userId,
    record.user_id,
    record.accountId,
    record.account_id,
    record.memberId,
    record.member_id,
    record.meetroUserId,
    record.meetro_user_id,
    record.profileId,
    record.profile_id,
    record.customerId,
    record.customer_id,
    record.homeownerId,
    record.homeowner_id,
    record.homeownerUserId,
    record.homeowner_user_id,
    record.participantId,
    record.participant_id,
    record.participantUserId,
    record.participant_user_id,
    record.professionalId,
    record.professional_id,
    record.professionalUserId,
    record.professional_user_id,
    record.providerId,
    record.provider_id,
    record.providerUserId,
    record.provider_user_id,
    record.contractorId,
    record.contractor_id,
    record.contractorUserId,
    record.contractor_user_id,
    record.ownerId,
    record.owner_id,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function getRecordIdentityEmails(record = {}) {
  return [
    record.email,
    record.userEmail,
    record.user_email,
    record.accountEmail,
    record.account_email,
    record.memberEmail,
    record.member_email,
    record.meetroEmail,
    record.meetro_email,
    record.customerEmail,
    record.customer_email,
    record.homeownerEmail,
    record.homeowner_email,
    record.participantEmail,
    record.participant_email,
    record.professionalEmail,
    record.professional_email,
    record.providerEmail,
    record.provider_email,
    record.contractorEmail,
    record.contractor_email,
    record.ownerEmail,
    record.owner_email,
  ]
    .map(normalizeEmail)
    .filter(Boolean);
}

export function getBusinessPhotoIdentity(
  profile = {},
  storage = globalThis.localStorage
) {
  const storedProfile = getStoredContractorProfile(storage);
  const explicitBusinessId =
    profile?.id ||
    profile?.businessId ||
    profile?.business_id ||
    "";
  const explicitBusinessName =
    profile?.business_name ||
    profile?.businessName ||
    profile?.companyName ||
    profile?.company_name ||
    profile?.providerName ||
    profile?.provider_name ||
    profile?.professionalName ||
    profile?.professional_name ||
    profile?.contractorName ||
    profile?.contractor_name ||
    profile?.displayName ||
    profile?.name ||
    "";
  const businessId =
    explicitBusinessId ||
    (!explicitBusinessName ? storedProfile?.id || storedProfile?.businessId || "" : "");
  const businessName =
    explicitBusinessName ||
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
      profile?.companyName ||
      profile?.company_name ||
      profile?.providerName ||
      profile?.provider_name ||
      profile?.professionalName ||
      profile?.professional_name ||
      profile?.contractorName ||
      profile?.contractor_name ||
      profile?.displayName ||
      profile?.name ||
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

  if (mode !== "business") {
    const storedUser = safeParseStorageJson(storage, "user", {});

    return firstPhotoValue(
      profile?.profile_photo_url,
      profile?.profilePhotoUrl,
      profile?.profilePhoto,
      profile?.profile_photo,
      profile?.avatar,
      profile?.avatarUrl,
      profile?.image_url,
      profile?.imageUrl,
      storedUser?.profile_photo_url,
      storedUser?.profilePhotoUrl,
      storedUser?.profilePhoto,
      storedUser?.profile_photo,
      storedUser?.avatar,
      storedUser?.avatarUrl,
      storedUser?.image_url,
      storedUser?.imageUrl
    );
  }

  if (mode === "business") {
    const profilePhoto = profile?.image_url || profile?.imageUrl || "";
    if (profilePhoto) return profilePhoto;

    const storedProfile = getStoredContractorProfile(storage);
    if (isSameBusinessProfile(storedProfile, profile, storage)) {
      return (
        storage.getItem(getScopedProfilePhotoKey("business", storedProfile, storage)) ||
        storedProfile?.image_url ||
        storedProfile?.imageUrl ||
        storedProfile?.logo ||
        ""
      );
    }
  }

  return "";
}

export function isSameStoredUserProfile(record = {}, storage = globalThis.localStorage) {
  const storedUser = safeParseStorageJson(storage, "user", {});
  const storedIds = [
    storage.getItem("userId"),
    storedUser.id,
    storedUser.userId,
    storedUser.user_id,
    storedUser.accountId,
    storedUser.account_id,
    storedUser.memberId,
    storedUser.member_id,
    storedUser.meetroUserId,
    storedUser.meetro_user_id,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const recordIds = getRecordIdentityIds(record);

  if (storedIds.length > 0 && recordIds.some((id) => storedIds.includes(id))) {
    return true;
  }

  const storedEmails = [
    storage.getItem("userEmail"),
    storedUser.email,
    storedUser.userEmail,
    storedUser.user_email,
    storedUser.accountEmail,
    storedUser.account_email,
    storedUser.memberEmail,
    storedUser.member_email,
    storedUser.meetroEmail,
    storedUser.meetro_email,
  ]
    .map(normalizeEmail)
    .filter(Boolean);
  const recordEmails = getRecordIdentityEmails(record);

  return storedEmails.length > 0 && recordEmails.some((email) => storedEmails.includes(email));
}

export function getPersonalProfilePhotoForRecord(
  record = {},
  storage = globalThis.localStorage
) {
  if (!isSameStoredUserProfile(record, storage)) return "";
  return getScopedProfilePhoto("personal", record, storage);
}
