export const PERSONAL_ACCOUNT_MODE = "personal";
export const BUSINESS_ACCOUNT_MODE = "business";
export const LEGACY_ACCOUNT_MODE_PREFERENCE_KEY = "meetroPreferredAccountMode";
export const ACCOUNT_MODE_PREFERENCE_KEY_PREFIX =
  "meetroAccountModePreference:";

const supportedAccountModes = new Set([
  PERSONAL_ACCOUNT_MODE,
  BUSINESS_ACCOUNT_MODE,
]);

function normalizeIdentity(identity = "") {
  return String(identity || "").trim();
}

export function isSupportedAccountMode(mode = "") {
  return supportedAccountModes.has(String(mode || "").trim());
}

export function resolveSessionAccountMode({
  authenticatedIdentity = "",
  hasProfessionalCapability = false,
  hasBusinessProfileCapability = false,
  storedPreference = null,
} = {}) {
  const identity = normalizeIdentity(authenticatedIdentity);
  const hasBusinessCapability = Boolean(
    hasProfessionalCapability || hasBusinessProfileCapability
  );
  const preferenceAccepted = Boolean(
    identity &&
      storedPreference &&
      typeof storedPreference === "object" &&
      normalizeIdentity(storedPreference.identity) === identity &&
      isSupportedAccountMode(storedPreference.mode)
  );

  if (!hasBusinessCapability) {
    return {
      finalMode: PERSONAL_ACCOUNT_MODE,
      preferenceAccepted: false,
      reason: "homeowner_only",
    };
  }

  if (preferenceAccepted) {
    return {
      finalMode: storedPreference.mode,
      preferenceAccepted: true,
      reason: "same_identity_preference",
    };
  }

  return {
    finalMode: BUSINESS_ACCOUNT_MODE,
    preferenceAccepted: false,
    reason: "professional_default",
  };
}

export function getAccountModePreferenceStorageKey(identity = "") {
  const normalizedIdentity = normalizeIdentity(identity);
  return normalizedIdentity
    ? `${ACCOUNT_MODE_PREFERENCE_KEY_PREFIX}${normalizedIdentity}`
    : "";
}

export function readIdentityScopedAccountModePreference(
  storage,
  identity = ""
) {
  const key = getAccountModePreferenceStorageKey(identity);
  if (!key || typeof storage?.getItem !== "function") return null;

  try {
    const preference = JSON.parse(storage.getItem(key) || "null");
    if (
      !preference ||
      typeof preference !== "object" ||
      normalizeIdentity(preference.identity) !== normalizeIdentity(identity) ||
      !isSupportedAccountMode(preference.mode)
    ) {
      return null;
    }

    return {
      identity: normalizeIdentity(preference.identity),
      mode: preference.mode,
    };
  } catch {
    return null;
  }
}

export function readSameIdentityLegacyAccountModePreference(
  storage,
  identity = "",
  legacyIdentity = ""
) {
  const normalizedIdentity = normalizeIdentity(identity);
  if (
    !normalizedIdentity ||
    normalizedIdentity !== normalizeIdentity(legacyIdentity) ||
    typeof storage?.getItem !== "function"
  ) {
    return null;
  }

  const mode = storage.getItem(LEGACY_ACCOUNT_MODE_PREFERENCE_KEY);
  return isSupportedAccountMode(mode)
    ? { identity: normalizedIdentity, mode }
    : null;
}

export function writeIdentityScopedAccountModePreference(
  storage,
  identity = "",
  mode = ""
) {
  const normalizedIdentity = normalizeIdentity(identity);
  const key = getAccountModePreferenceStorageKey(normalizedIdentity);
  if (
    !key ||
    !isSupportedAccountMode(mode) ||
    typeof storage?.setItem !== "function"
  ) {
    return false;
  }

  storage.setItem(
    key,
    JSON.stringify({
      identity: normalizedIdentity,
      mode,
    })
  );
  return true;
}
