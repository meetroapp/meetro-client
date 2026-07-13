import {
  clearAccountWorkflowData,
  getAccountStorageIdentity,
} from "./accountStorage.js";

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

  if (
    nextIdentity &&
    nextIdentity !== previousIdentity
  ) {
    clearAccountWorkflowData();
  }

  const ownsBusinessProfile = hasBusinessProfileOwnership(user);
  const isProfessional = isProfessionalUser(user) || ownsBusinessProfile;

  const finalAccountType = isProfessional ? "professional" : "homeowner";
  const preferredMode =
    localStorage.getItem("meetroPreferredAccountMode") ||
    localStorage.getItem("activeAccountMode") ||
    "personal";

  const finalMode =
    isProfessional ? "business" : "personal";
  const finalRole = isProfessional
    ? user.business_category ||
      user.businessCategory ||
      user.role ||
      "professional"
    : "homeowner";

  localStorage.setItem("token", data.token || "");
  localStorage.setItem("user", JSON.stringify(user));
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
    ownsBusinessProfile || isProfessional ? "true" : "false"
  );
  localStorage.setItem(
    "businessName",
    user.business_name ||
      user.businessName ||
      localStorage.getItem("businessName") ||
      safeReadStoredBusinessProfile().business_name ||
      safeReadStoredBusinessProfile().businessName ||
      safeReadStoredBusinessProfile().name ||
      ""
  );
  localStorage.setItem(
    "businessCategory",
    user.business_category ||
      user.businessCategory ||
      localStorage.getItem("businessCategory") ||
      safeReadStoredBusinessProfile().category ||
      safeReadStoredBusinessProfile().business_category ||
      safeReadStoredBusinessProfile().businessCategory ||
      ""
  );
  localStorage.setItem(
    "contractorProfileComplete",
    ownsBusinessProfile || isProfessional ? "true" : "false"
  );
  if (nextIdentity) {
    localStorage.setItem("meetroLastAccountIdentity", nextIdentity);
  }

  localStorage.removeItem("pendingLoginData");

  return {
    user,
    isProfessional,
    finalAccountType,
    finalMode,
    finalRole,
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

  const activeAccountMode =
    localStorage.getItem("activeAccountMode") || "personal";

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
  "emergencyOperationsCenter",
  "emergencyDispatch",
  "completionSheet",
]);

const personalModePages = new Set([
  "home",
  "upload",
  "myRequests",
  "assistant",
  "emergency",
  "emergencyStatus",
  "emergencyComplete",
]);

export function getAccountModeForPage(page = "", fallbackMode = "personal") {
  if (businessModePages.has(page)) return "business";
  if (personalModePages.has(page)) return "personal";
  return fallbackMode === "business" ? "business" : "personal";
}

export function restoreAuthenticatedSessionFromStorage(targetPage = "") {
  if (typeof localStorage === "undefined") {
    return { authenticated: false, repaired: false, isProfessional: false };
  }

  const token = localStorage.getItem("token") || "";
  if (!token) {
    return { authenticated: false, repaired: false, isProfessional: false };
  }

  const user = safeReadStoredUser();
  const ownsBusinessProfile = hasBusinessProfileOwnership(user);
  const isProfessional = isProfessionalSession() || ownsBusinessProfile;
  let repaired = false;

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

  const shouldUseBusinessMode = isProfessional && businessModePages.has(targetPage);

  if (shouldUseBusinessMode && localStorage.getItem("activeAccountMode") !== "business") {
    localStorage.setItem("activeAccountMode", "business");
    localStorage.setItem("accountType", "professional");
    localStorage.setItem(
      "userRole",
      localStorage.getItem("businessCategory") ||
        user.business_category ||
        user.businessCategory ||
        user.role ||
        "professional"
    );
    repaired = true;
  } else if (!localStorage.getItem("activeAccountMode")) {
    localStorage.setItem("activeAccountMode", isProfessional ? "business" : "personal");
    repaired = true;
  }

  return { authenticated: true, repaired, isProfessional };
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

  return setActiveAccountMode(nextMode);
}


export function setActiveAccountMode(mode = "personal") {
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

  if (normalizedMode === "business") {
    const storedRole = localStorage.getItem("userRole") || "";
    localStorage.setItem(
      "accountType",
      "professional"
    );

    localStorage.setItem(
      "userRole",
      localStorage.getItem("businessCategory") ||
        (storedRole === "homeowner" ? "" : storedRole) ||
        "professional"
    );
  } else {
    localStorage.setItem("accountType", "homeowner");
    localStorage.setItem("userRole", "homeowner");
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
