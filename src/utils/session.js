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
  "roofing",
  "tile",
  "treeService",
  "other",
];

export function isProfessionalUser(user = {}) {
  const role = String(user.role || "").toLowerCase();
  const accountType = String(
    user.account_type || user.accountType || ""
  ).toLowerCase();
  const businessCategory = String(
    user.business_category || user.businessCategory || ""
  );

  return (
    accountType === "professional" ||
    accountType === "business" ||
    professionalRoles.includes(role) ||
    professionalRoles.includes(businessCategory)
  );
}

export function saveMeetroSession(data = {}, fallbackEmail = "") {
  const user = data.user || {};
  const isProfessional = isProfessionalUser(user);

  const finalAccountType = isProfessional ? "professional" : "homeowner";
  const preferredMode =
    localStorage.getItem("meetroPreferredAccountMode") ||
    localStorage.getItem("activeAccountMode") ||
    "personal";

  const finalMode =
    isProfessional && preferredMode === "business" ? "business" : "personal";
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
  localStorage.setItem("userRole", finalRole);
  localStorage.setItem("accountType", finalAccountType);
  localStorage.setItem("activeAccountMode", finalMode);
  localStorage.setItem("isProfessional", isProfessional ? "true" : "false");
  localStorage.setItem("hasBusinessProfile", isProfessional ? "true" : "false");
  localStorage.setItem("businessName", user.business_name || user.businessName || "");
  localStorage.setItem(
    "businessCategory",
    user.business_category || user.businessCategory || ""
  );
  localStorage.setItem(
    "contractorProfileComplete",
    isProfessional ? "true" : "false"
  );

  localStorage.removeItem("pendingLoginData");

  return {
    user,
    isProfessional,
    finalAccountType,
    finalMode,
    finalRole,
  };
}

export function getPostLoginPage(user = {}) {
  const preferredMode =
    localStorage.getItem("meetroPreferredAccountMode") ||
    localStorage.getItem("activeAccountMode") ||
    "personal";

  if (preferredMode === "business" && isProfessionalUser(user)) {
    return "businessDashboard";
  }

  return "home";
}


export function isProfessionalSession() {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

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
    activeAccountMode === "business" ||
    accountType === "business" ||
    accountType === "professional" ||
    isProfessionalUser({
      ...user,
      role: userRole,
      account_type: accountType,
    })
  );
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
    localStorage.setItem(
      "accountType",
      "professional"
    );

    localStorage.setItem(
      "userRole",
      localStorage.getItem("businessCategory") ||
        localStorage.getItem("userRole") ||
        "professional"
    );
  } else {
    localStorage.setItem(
      "accountType",
      isProfessional
        ? "professional"
        : "homeowner"
    );
  }

  window.dispatchEvent(
    new Event("accountModeChanged")
  );

  window.dispatchEvent(
    new Event("storage")
  );

  return true;
}
