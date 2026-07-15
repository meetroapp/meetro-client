import {
  normalizeProfessionalOnboardingDraft,
  normalizeProfessionalOnboardingStep,
} from "./professionalOnboardingDraft.js";

const ONBOARDING_PREFIX = "meetroProfessionalOnboarding:";
const PROFILE_DRAFT_PREFIX = "meetroProfessionalProfileDraft:";

export const LEGACY_PROFESSIONAL_ONBOARDING_KEYS = Object.freeze([
  "meetroProfessionalOnboarding",
  "meetroProfessionalOnboardingCompleted",
  "meetroProfessionalProfileDraft",
  "meetroProfessionalOnboardingSkipped",
  "businessContactName",
  "businessPhone",
  "businessEmail",
  "businessPrimaryCity",
  "businessZipCodes",
  "businessServiceRadius",
  "businessAvailability",
  "businessServiceCategories",
  "businessServiceCapabilities",
  "businessServiceSpecialties",
  "businessServiceDomains",
  "businessServiceDomain",
]);

function parseObject(value) {
  try {
    const parsed = JSON.parse(value || "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function text(value) {
  return typeof value === "string" ? value : "";
}

function getUserId(user = {}) {
  return user.id ?? user.user_id ?? user.userId ?? "";
}

export function getProfessionalOnboardingAccount(storage = globalThis.localStorage) {
  if (!storage?.getItem) return { ready: false, identity: "", userId: "", user: {} };

  const user = parseObject(storage.getItem("user"));
  const userId = String(getUserId(user)).trim();
  const storedUserId = String(storage.getItem("userId") || "").trim();
  const expectedIdentity = userId ? `id:${userId}` : "";
  const storedIdentity = String(
    storage.getItem("meetroLastAccountIdentity") || ""
  ).trim();
  const identityMismatch =
    !userId ||
    (storedUserId && storedUserId !== userId) ||
    (storedIdentity && storedIdentity !== expectedIdentity);

  if (identityMismatch) {
    return { ready: false, identity: "", userId: "", user: {} };
  }

  return {
    ready: true,
    identity: expectedIdentity,
    userId,
    user,
  };
}

export function getProfessionalOnboardingKeys(userId) {
  const stableUserId = String(userId || "").trim();
  if (!stableUserId) return null;

  return Object.freeze({
    progress: `${ONBOARDING_PREFIX}${stableUserId}`,
    draft: `${PROFILE_DRAFT_PREFIX}${stableUserId}`,
  });
}

export function getOwnedProfessionalProfile(profile, account) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;
  const ownerId = String(
    profile.user_id ?? profile.userId ?? profile.owner_id ?? profile.ownerId ?? ""
  ).trim();
  if (!account?.ready || !ownerId || ownerId !== account.userId) return null;
  return profile;
}

export function readProfessionalOnboardingState({
  storage = globalThis.localStorage,
  ownedProfile = null,
} = {}) {
  const account = getProfessionalOnboardingAccount(storage);
  if (!account.ready) {
    return {
      ready: false,
      account,
      keys: null,
      step: 1,
      draft: normalizeProfessionalOnboardingDraft(),
    };
  }

  const keys = getProfessionalOnboardingKeys(account.userId);
  const savedDraft = parseObject(storage.getItem(keys.draft));
  const savedProgress = parseObject(storage.getItem(keys.progress));
  const profile = getOwnedProfessionalProfile(ownedProfile, account);
  const user = account.user;
  const profileSpecialties = Array.isArray(profile?.service_specialties)
    ? profile.service_specialties
    : [];
  const draftSource = {
    ...(profileSpecialties.length ? { serviceSpecialties: profileSpecialties } : {}),
    primaryCity: text(profile?.city),
    zipCodes: text(profile?.postal_code),
    ...savedDraft,
  };

  return {
    ready: true,
    account,
    keys,
    step: normalizeProfessionalOnboardingStep(savedProgress.step),
    draft: normalizeProfessionalOnboardingDraft(draftSource, {
      businessName:
        text(profile?.business_name) ||
        text(user.business_name) ||
        text(user.businessName),
      contactName: text(user.username) || text(user.name),
      phone: text(profile?.phone),
      email: text(user.email),
      primaryCity: text(profile?.city),
      zipCodes: text(profile?.postal_code),
    }),
  };
}

export function writeProfessionalOnboardingState(
  { draft, step, skipped = false, completed = false } = {},
  storage = globalThis.localStorage
) {
  const account = getProfessionalOnboardingAccount(storage);
  const keys = getProfessionalOnboardingKeys(account.userId);
  if (!account.ready || !keys || !storage?.setItem) return false;

  storage.setItem(
    keys.draft,
    JSON.stringify(normalizeProfessionalOnboardingDraft(draft))
  );
  storage.setItem(
    keys.progress,
    JSON.stringify({
      step: normalizeProfessionalOnboardingStep(step),
      skipped: skipped === true,
      completed: completed === true,
      updatedAt: new Date().toISOString(),
    })
  );
  return true;
}

export function purgeLegacyProfessionalOnboardingStorage(
  storage = globalThis.localStorage
) {
  if (!storage?.removeItem) return [];
  LEGACY_PROFESSIONAL_ONBOARDING_KEYS.forEach((key) => storage.removeItem(key));
  return [...LEGACY_PROFESSIONAL_ONBOARDING_KEYS];
}
