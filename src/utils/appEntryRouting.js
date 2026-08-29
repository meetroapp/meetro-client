const PUBLIC_WEBSITE_PATHS = new Set(["/", "/privacy", "/terms", "/contact"]);

export const PUBLIC_WEBSITE_FRAGMENTS = new Set([
  "",
  "why",
  "journey",
  "resources",
]);

// These are existing App.jsx destinations that may be used as browser hash
// entries. Matching is exact so arbitrary or lookalike fragments stay public.
const APPLICATION_HASH_ROUTES = new Set([
  "assetCenter",
  "assistant",
  "aiDisclaimer",
  "businessAnalytics",
  "businessAvailability",
  "businessCommandCenter",
  "businessDashboard",
  "businessIntelligence",
  "businessLeads",
  "changeOrderRequest",
  "chat",
  "completedJobDetails",
  "completionSheet",
  "complianceCenter",
  "contractTemplates",
  "contractorDashboard",
  "contractorDetails",
  "contractorJobAccepted",
  "contractorProfile",
  "contractors",
  "conversation",
  "conversationThread",
  "customerInvoiceReview",
  "customerQuoteReview",
  "customerRelationshipsCenter",
  "discover",
  "emergency",
  "emergencyBusinessSelection",
  "emergencyBusinessSettings",
  "emergencyChat",
  "emergencyComplete",
  "emergencyCompletionActions",
  "emergencyDispatch",
  "emergencyDisclaimer",
  "emergencyOperationsCenter",
  "emergencyRequest",
  "emergencyStatus",
  "favorites",
  "guidelines",
  "hiringCenter",
  "home",
  "homeownerRequestDetails",
  "invoiceBuilder",
  "jobUpdate",
  "jobsHiring",
  "learn-meetro",
  "legal",
  "login",
  "materialsLibrary",
  "meetroJourney",
  "meetroMomentDetails",
  "meetroMoments",
  "meetroStory",
  "moments",
  "messagesInbox",
  "myRequests",
  "notifications",
  "permitCenter",
  "privacy",
  "pricingLibrary",
  "professionalOnboarding",
  "profile",
  "projectDetails",
  "projectGallery",
  "quoteBuilder",
  "quoteRequests",
  "reportsCenter",
  "resetPassword",
  "schedule",
  "serviceTypesEvaluations",
  "teamMembers",
  "terms",
  "tips",
  "tour",
  "upload",
  "welcome",
  "welcomeIntro",
  "workCenter",
]);

function normalizePathname(pathname = "/") {
  return String(pathname || "/").replace(/\/+$/, "") || "/";
}

function getHashRoute(hash = "") {
  const rawHash = String(hash || "");
  if (!rawHash.startsWith("#")) return "";

  const route = rawHash.slice(1).split("?", 1)[0];
  if (!route || route.includes("#")) return "";

  return route;
}

export function isPublicWebsitePath(pathname = "/") {
  return PUBLIC_WEBSITE_PATHS.has(normalizePathname(pathname));
}

export function isRecognizedApplicationHash(hash = "") {
  const route = getHashRoute(hash);
  if (APPLICATION_HASH_ROUTES.has(route)) return true;

  return /^\/?moments\/[^/?#]+$/.test(route);
}

export function shouldRenderPublicSite({
  pathname = "/",
  hash = "",
  native = false,
} = {}) {
  if (native) return false;

  const normalizedPathname = normalizePathname(pathname);
  if (!isPublicWebsitePath(normalizedPathname)) return false;

  if (
    normalizedPathname === "/" &&
    isRecognizedApplicationHash(hash)
  ) {
    return false;
  }

  return true;
}
