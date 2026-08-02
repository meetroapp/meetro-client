import {
  clearAccountWorkflowData,
  getAccountStorageIdentity,
} from "./accountStorage.js";
import {
  getStorageSafeAuthenticatedUser,
  purgeLegacyPersonalProfilePhotoStorage,
} from "./personalProfile.js";
import {
  LEGACY_ACCOUNT_MODE_PREFERENCE_KEY,
  readIdentityScopedAccountModePreference,
  readSameIdentityLegacyAccountModePreference,
  resolveSessionAccountMode,
  writeIdentityScopedAccountModePreference,
} from "./sessionAccountMode.js";

export const professionalRoles = [
  "professional",
  "contractor",
  "handyman",
  "applianceRepair",
  "automotiveServices",
  "carDetailing",
  "carpentry",
  "cleaning",
  "concrete",
  "demolition",
  "doorsWindows",
  "drywall",
  "electrical",
  "fencing",
  "flooring",
  "homeHealthCare",
  "hvac",
  "junkRemoval",
  "landscaping",
  "lawnCare",
  "mechanic",
  "mobileServices",
  "moving",
  "painting",
  "paverSealing",
  "pestControl",
  "plumbing",
  "poolService",
  "pressureWashing",
  "privateTransportation",
  "realEstate",
  "propertyManagement",
  "roofing",
  "tile",
  "treeService",
  "other",
];

const normalizedProfessionalRoles = new Set(
  professionalRoles.map((role) => String(role).toLowerCase())
);

function safeReadStoredUser() {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("user") || "{}") || {};
  } catch {
    return {};
  }
}

function safeReadStoredBusinessProfile() {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("contractorProfile") || "{}") || {};
  } catch {
    return {};
  }
}

function truthyProfileFlag(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "yes", "1", "active", "complete", "completed"].includes(
    normalized
  );
}

function explicitBoolean(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["true", "yes", "1"].includes(normalized)) return true;
  if (["false", "no", "0"].includes(normalized)) return false;
  return undefined;
}

export function getExplicitBusinessProfileOwnership(user = {}) {
  const explicit = [
    user.has_business_profile,
    user.hasBusinessProfile,
    user.contractor_profile_complete,
    user.contractorProfileComplete,
  ]
    .map(explicitBoolean)
    .find((value) => value !== undefined);

  if (explicit !== undefined) return explicit;
  if (user.contractor_profile_id || user.contractorProfileId) return true;
  return undefined;
}

function hasProfileIdentity(profile = {}) {
  return Boolean(
    profile.id ||
      profile.contractor_id ||
      profile.contractorId ||
      profile.businessId ||
      profile.business_id ||
      profile.business_name ||
      profile.businessName ||
      profile.name ||
      profile.category ||
      profile.business_category ||
      profile.businessCategory
  );
}

export function hasBusinessProfileOwnership(user = {}) {
  const explicitOwnership = getExplicitBusinessProfileOwnership(user);
  if (explicitOwnership !== undefined) return explicitOwnership;

  if (typeof localStorage === "undefined") {
    return Boolean(
      truthyProfileFlag(user.hasBusinessProfile) ||
        truthyProfileFlag(user.has_business_profile) ||
        truthyProfileFlag(user.contractorProfileComplete) ||
        truthyProfileFlag(user.contractor_profile_complete) ||
        hasProfileIdentity(user.businessProfile) ||
        hasProfileIdentity(user.business_profile) ||
        hasProfileIdentity(user.contractorProfile) ||
        hasProfileIdentity(user.contractor_profile) ||
        Boolean(user.business_name || user.businessName)
    );
  }

  const storedProfile = safeReadStoredBusinessProfile();

  return Boolean(
    truthyProfileFlag(user.hasBusinessProfile) ||
      truthyProfileFlag(user.has_business_profile) ||
      truthyProfileFlag(user.contractorProfileComplete) ||
      truthyProfileFlag(user.contractor_profile_complete) ||
      hasProfileIdentity(user.businessProfile) ||
      hasProfileIdentity(user.business_profile) ||
      hasProfileIdentity(user.contractorProfile) ||
      hasProfileIdentity(user.contractor_profile) ||
      Boolean(user.business_name || user.businessName) ||
      localStorage.getItem("hasBusinessProfile") === "true" ||
      localStorage.getItem("contractorProfileComplete") === "true" ||
      Boolean(localStorage.getItem("businessName")) ||
      Boolean(localStorage.getItem("businessCategory")) ||
      hasProfileIdentity(storedProfile)
  );
}

export function isProfessionalUser(user = {}) {
  const role = String(user.role || "").toLowerCase();
  const accountType = String(
    user.account_type || user.accountType || ""
  ).toLowerCase();
  const businessCategory = String(
    user.business_category || user.businessCategory || ""
  ).toLowerCase();

  return (
    accountType === "professional" ||
    accountType === "business" ||
    normalizedProfessionalRoles.has(role) ||
    normalizedProfessionalRoles.has(businessCategory)
  );
}

export function saveMeetroSession(data = {}, fallbackEmail = "") {
  const user = data.user || {};
  const previousIdentity =
    localStorage.getItem("meetroLastAccountIdentity") ||
    getAccountStorageIdentity(
      {
        id: localStorage.getItem("userId") || "",
        email: localStorage.getItem("userEmail") || "",
      }
    );
  const nextIdentity = getAccountStorageIdentity(user, fallbackEmail);
  const accountChanged = Boolean(
    nextIdentity &&
      nextIdentity !== previousIdentity
  );

  if (accountChanged) {
    clearAccountWorkflowData();
    [
      "isProfessional",
      "hasBusinessProfile",
      "contractorProfileComplete",
      "businessName",
      "businessCategory",
      "contractorProfile",
    ].forEach((key) => localStorage.removeItem(key));
  }

  const ownsBusinessProfile = hasBusinessProfileOwnership(user);
  const explicitBusinessOwnership = getExplicitBusinessProfileOwnership(user);
  const isProfessional = isProfessionalUser(user) || ownsBusinessProfile;

  const finalAccountType = isProfessional ? "professional" : "homeowner";
  const scopedPreference = readIdentityScopedAccountModePreference(
    localStorage,
    nextIdentity
  );
  const legacyPreference = scopedPreference
    ? null
    : readSameIdentityLegacyAccountModePreference(
        localStorage,
        nextIdentity,
        previousIdentity
      );
  const modeResolution = resolveSessionAccountMode({
    authenticatedIdentity: nextIdentity,
    hasProfessionalCapability: isProfessionalUser(user),
    hasBusinessProfileCapability: ownsBusinessProfile,
    storedPreference: scopedPreference || legacyPreference,
  });
  const finalMode = modeResolution.finalMode;
  const finalRole = isProfessional
    ? user.business_category ||
      user.businessCategory ||
      user.role ||
      "professional"
    : "homeowner";

  localStorage.setItem("token", data.token || "");
  purgeLegacyPersonalProfilePhotoStorage(localStorage);
  localStorage.setItem(
    "user",
    JSON.stringify(getStorageSafeAuthenticatedUser(user))
  );
  localStorage.setItem("userId", user.id || "");
  localStorage.setItem("userName", user.username || user.name || "");
  localStorage.setItem("userEmail", user.email || fallbackEmail || "");
  localStorage.setItem(
    "accountStatus",
    user.accountStatus || user.account_status || user.status || "active"
  );
  localStorage.setItem(
    "accountActive",
    String(
      user.accountActive ??
        user.account_active ??
        user.isActive ??
        user.is_active ??
        user.active ??
        true
    )
  );
  localStorage.setItem(
    "accountConnected",
    String(
      user.accountConnected ??
        user.account_connected ??
        user.isConnected ??
        user.is_connected ??
        user.connected ??
        true
    )
  );
  localStorage.setItem("userRole", finalRole);
  localStorage.setItem("accountType", finalAccountType);
  localStorage.setItem("activeAccountMode", finalMode);
  localStorage.setItem("isProfessional", isProfessional ? "true" : "false");
  localStorage.setItem(
    "hasBusinessProfile",
    ownsBusinessProfile ? "true" : "false"
  );
  const canonicalBusinessName = user.business_name || user.businessName || "";
  const canonicalBusinessCategory =
    user.business_category || user.businessCategory || "";
  localStorage.setItem(
    "businessName",
    explicitBusinessOwnership !== undefined
      ? canonicalBusinessName
      : canonicalBusinessName ||
          localStorage.getItem("businessName") ||
          safeReadStoredBusinessProfile().business_name ||
          safeReadStoredBusinessProfile().businessName ||
          safeReadStoredBusinessProfile().name ||
          ""
  );
  localStorage.setItem(
    "businessCategory",
    explicitBusinessOwnership !== undefined
      ? canonicalBusinessCategory
      : canonicalBusinessCategory ||
          localStorage.getItem("businessCategory") ||
          safeReadStoredBusinessProfile().category ||
          safeReadStoredBusinessProfile().business_category ||
          safeReadStoredBusinessProfile().businessCategory ||
          ""
  );
  localStorage.setItem(
    "contractorProfileComplete",
    ownsBusinessProfile ? "true" : "false"
  );
  if (explicitBusinessOwnership === false) {
    localStorage.removeItem("contractorProfile");
  }
  if (nextIdentity) {
    localStorage.setItem("meetroLastAccountIdentity", nextIdentity);
  }
  if (legacyPreference && modeResolution.preferenceAccepted) {
    writeIdentityScopedAccountModePreference(
      localStorage,
      nextIdentity,
      legacyPreference.mode
    );
  }
  localStorage.removeItem(LEGACY_ACCOUNT_MODE_PREFERENCE_KEY);

  localStorage.removeItem("pendingLoginData");

  return {
    user,
    authenticatedIdentity: nextIdentity,
    isProfessional,
    finalAccountType,
    finalMode,
    finalRole,
    preferenceAccepted: modeResolution.preferenceAccepted,
  };
}

export function replaceMeetroSessionToken(token, storage = localStorage) {
  if (!storage || typeof storage.setItem !== "function") return false;
  if (typeof token !== "string" || !token.trim() || token !== token.trim()) return false;

  storage.setItem("token", token);
  return storage.getItem("token") === token;
}

export function getPostLoginPage(user = {}) {
  if (isProfessionalUser(user)) {
    return "businessDashboard";
  }

  return "home";
}


export function isProfessionalSession() {
  const user = safeReadStoredUser();

  const userRole = localStorage.getItem("userRole") || user.role || "standard";
  const accountType =
    localStorage.getItem("accountType") ||
    user.account_type ||
    user.accountType ||
    "homeowner";

  const storedIsProfessional =
    localStorage.getItem("isProfessional") === "true";

  return (
    storedIsProfessional ||
    hasBusinessProfileOwnership(user) ||
    accountType === "business" ||
    accountType === "professional" ||
    isProfessionalUser({
      ...user,
      role: userRole,
      account_type: accountType,
    })
  );
}

const businessModePages = new Set([
  "businessDashboard",
  "professionalOnboarding",
  "businessLeads",
  "contractorProfile",
  "businessCommandCenter",
  "businessAvailability",
  "customerRelationshipsCenter",
  "assetCenter",
  "serviceTypesEvaluations",
  "materialsLibrary",
  "pricingLibrary",
  "contractTemplates",
  "reportsCenter",
  "permitCenter",
  "complianceCenter",
  "businessIntelligence",
  "businessAnalytics",
  "quoteRequests",
  "quoteBuilder",
  "invoiceBuilder",
  "contractorDashboard",
  "workCenter",
  "completionSheet",
]);

const personalModePages = new Set([
  "home",
  "upload",
  "myRequests",
  "assistant",
  "emergency",
]);

export function getAccountModeForPage(page = "", fallbackMode = "personal") {
  if (businessModePages.has(page)) return "business";
  if (personalModePages.has(page)) return "personal";
  return fallbackMode === "business" ? "business" : "personal";
}

export function restoreAuthenticatedSessionFromStorage() {
  if (typeof localStorage === "undefined") {
    return { authenticated: false, repaired: false, isProfessional: false };
  }

  const token = localStorage.getItem("token") || "";
  if (!token) {
    return { authenticated: false, repaired: false, isProfessional: false };
  }

  const user = safeReadStoredUser();
  const authenticatedIdentity = getAccountStorageIdentity(
    user,
    localStorage.getItem("userEmail") || ""
  );
  const explicitBusinessOwnership = getExplicitBusinessProfileOwnership(user);
  const ownsBusinessProfile = hasBusinessProfileOwnership(user);
  const isProfessional = isProfessionalSession() || ownsBusinessProfile;
  const scopedPreference = readIdentityScopedAccountModePreference(
    localStorage,
    authenticatedIdentity
  );
  const legacyPreference = scopedPreference
    ? null
    : readSameIdentityLegacyAccountModePreference(
        localStorage,
        authenticatedIdentity,
        localStorage.getItem("meetroLastAccountIdentity") || ""
      );
  const modeResolution = resolveSessionAccountMode({
    authenticatedIdentity,
    hasProfessionalCapability: isProfessional,
    hasBusinessProfileCapability: ownsBusinessProfile,
    storedPreference: scopedPreference || legacyPreference,
  });
  const finalMode = modeResolution.finalMode;
  let repaired = false;

  const canonicalBusinessName = user.business_name || user.businessName || "";
  const canonicalBusinessCategory =
    user.business_category || user.businessCategory || "";

  if (localStorage.getItem("businessName") !== canonicalBusinessName) {
    localStorage.setItem("businessName", canonicalBusinessName);
    repaired = true;
  }

  if (localStorage.getItem("businessCategory") !== canonicalBusinessCategory) {
    localStorage.setItem("businessCategory", canonicalBusinessCategory);
    repaired = true;
  }

  if (explicitBusinessOwnership === false) {
    if (localStorage.getItem("hasBusinessProfile") !== "false") {
      localStorage.setItem("hasBusinessProfile", "false");
      repaired = true;
    }
    if (localStorage.getItem("contractorProfileComplete") !== "false") {
      localStorage.setItem("contractorProfileComplete", "false");
      repaired = true;
    }
    if (localStorage.getItem("contractorProfile")) {
      localStorage.removeItem("contractorProfile");
      repaired = true;
    }
  }

  if (isProfessional && localStorage.getItem("isProfessional") !== "true") {
    localStorage.setItem("isProfessional", "true");
    repaired = true;
  }

  if (ownsBusinessProfile && localStorage.getItem("hasBusinessProfile") !== "true") {
    localStorage.setItem("hasBusinessProfile", "true");
    repaired = true;
  }

  if (ownsBusinessProfile && localStorage.getItem("contractorProfileComplete") !== "true") {
    localStorage.setItem("contractorProfileComplete", "true");
    repaired = true;
  }

  if (!localStorage.getItem("userEmail") && user.email) {
    localStorage.setItem("userEmail", user.email);
    repaired = true;
  }

  if (!localStorage.getItem("userId") && user.id) {
    localStorage.setItem("userId", user.id);
    repaired = true;
  }

  if (!localStorage.getItem("userName") && (user.username || user.name)) {
    localStorage.setItem("userName", user.username || user.name);
    repaired = true;
  }

  const canonicalAccountType = isProfessional ? "professional" : "homeowner";
  const userProfessionalRole =
    user.business_category ||
    user.businessCategory ||
    safeReadStoredBusinessProfile().category ||
    safeReadStoredBusinessProfile().business_category ||
    safeReadStoredBusinessProfile().businessCategory ||
    (isProfessionalUser(user) ? user.role : "") ||
    "professional";
  const canonicalRole = isProfessional ? userProfessionalRole : "homeowner";

  if (localStorage.getItem("accountType") !== canonicalAccountType) {
    localStorage.setItem("accountType", canonicalAccountType);
    repaired = true;
  }

  if (localStorage.getItem("userRole") !== canonicalRole) {
    localStorage.setItem("userRole", canonicalRole);
    repaired = true;
  }

  if (localStorage.getItem("activeAccountMode") !== finalMode) {
    localStorage.setItem("activeAccountMode", finalMode);
    repaired = true;
  }

  if (legacyPreference && modeResolution.preferenceAccepted) {
    writeIdentityScopedAccountModePreference(
      localStorage,
      authenticatedIdentity,
      legacyPreference.mode
    );
  }
  if (localStorage.getItem(LEGACY_ACCOUNT_MODE_PREFERENCE_KEY)) {
    localStorage.removeItem(LEGACY_ACCOUNT_MODE_PREFERENCE_KEY);
    repaired = true;
  }

  return {
    authenticated: true,
    repaired,
    isProfessional,
    finalMode,
    authenticatedIdentity,
    preferenceAccepted: modeResolution.preferenceAccepted,
  };
}

export function getDashboardPageForAccountMode(mode) {
  const activeMode =
    mode || localStorage.getItem("activeAccountMode") || "personal";

  return activeMode === "business" ? "businessDashboard" : "home";
}

export function syncAccountModeForPage(page = "") {
  const storedMode =
    localStorage.getItem("activeAccountMode") || "personal";
  const nextMode = getAccountModeForPage(page, storedMode);

  if (nextMode === storedMode) return true;

  return setActiveAccountMode(nextMode, { persistPreference: false });
}


export function setActiveAccountMode(
  mode = "personal",
  { persistPreference = true } = {}
) {
  const normalizedMode =
    mode === "business"
      ? "business"
      : "personal";

  const isProfessional =
    isProfessionalSession();

  if (
    normalizedMode === "business" &&
    !isProfessional
  ) {
    return false;
  }

  localStorage.setItem(
    "activeAccountMode",
    normalizedMode
  );

  if (persistPreference) {
    const authenticatedIdentity = getAccountStorageIdentity(
      safeReadStoredUser(),
      localStorage.getItem("userEmail") || ""
    );
    writeIdentityScopedAccountModePreference(
      localStorage,
      authenticatedIdentity,
      normalizedMode
    );
    localStorage.removeItem(LEGACY_ACCOUNT_MODE_PREFERENCE_KEY);
  }

  if (normalizedMode === "personal") {
    localStorage.removeItem("meetroWorkCenterTab");
    localStorage.removeItem("activeWorkCenterTab");
    localStorage.removeItem("workCenterScheduleFilter");
    localStorage.removeItem("conversationReturnSection");
    localStorage.removeItem("quoteStatusFilter");
  }

  window.dispatchEvent(
    new CustomEvent("accountModeChanged", {
      detail: { mode: normalizedMode },
    })
  );

  window.dispatchEvent(
    new Event("storage")
  );

  return true;
}
