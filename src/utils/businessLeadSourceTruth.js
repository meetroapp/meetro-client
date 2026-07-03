import { isRequestAvailableAsNewLead } from "./homeownerLifecycle.js";
import { canProfessionalSeeLocalLead } from "./localLeadVisibility.js";

export const PROFESSIONAL_LEAD_CACHE_KEYS = Object.freeze([
  "businessLeads",
  "contractorLeads",
  "meetroBusinessLeads",
  "meetroContractorLeads",
  "meetroPostsCache",
  "postsCache",
  "posts",
  "demoLeads",
  "seedLeads",
  "leadCache",
  "cachedBusinessLeads",
  "cachedContractorLeads",
]);

function normalizedText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function recordId(record = {}) {
  return String(record.requestId || record.id || record.postId || "");
}

function safeStorage(name) {
  try {
    return globalThis?.[name] || null;
  } catch {
    return null;
  }
}

function hasDemoMarker(value = "") {
  const text = normalizedText(value);
  return (
    text.startsWith("qa-") ||
    text.startsWith("demo-") ||
    text.startsWith("seed-") ||
    text.includes(" qa ") ||
    text.includes(" demo ") ||
    text.includes(" seed ")
  );
}

export function isDemoOrSeedLead(record = {}) {
  if (!record || typeof record !== "object") return false;

  if (
    record.isDemo === true ||
    record.isSeed === true ||
    record.demoSafe === true ||
    record.qaSafe === true ||
    record.source === "qa_backend_workflow" ||
    record.source === "demo" ||
    record.source === "seed"
  ) {
    return true;
  }

  return [
    record.id,
    record.requestId,
    record.postId,
    record.source,
    record.fixture,
    record.title,
    record.projectTitle,
  ].some(hasDemoMarker);
}

export function findSharedRequestForLead(lead = {}, homeownerRequests = []) {
  const requests = Array.isArray(homeownerRequests) ? homeownerRequests : [];
  const leadId = recordId(lead);
  const leadTitle = normalizedText(lead.title || lead.projectTitle);

  return requests.find((request) => {
    const requestId = recordId(request);
    const sameId = leadId && requestId && leadId === requestId;

    if (sameId) return true;
    if (leadId || requestId) return false;

    return Boolean(
      leadTitle &&
        leadTitle === normalizedText(request.title || request.projectTitle)
    );
  });
}

export function isProfessionalLeadQaModeEnabled({
  dev = false,
  storage,
} = {}) {
  const safeStore = storage ?? safeStorage("localStorage");
  if (!dev || !safeStore) return false;

  try {
    return (
      safeStore.getItem("meetroQaLeadMode") === "true" ||
      safeStore.getItem("meetroShowDemoLeads") === "true"
    );
  } catch {
    return false;
  }
}

export function purgeProfessionalLeadCaches({
  storage,
  sessionStorage,
} = {}) {
  const safeLocalStorage = storage ?? safeStorage("localStorage");
  const safeSessionStorage = sessionStorage ?? safeStorage("sessionStorage");
  const purge = (store) => {
    if (!store) return [];

    return PROFESSIONAL_LEAD_CACHE_KEYS.filter((key) => {
      try {
        if (store.getItem(key) === null) return false;
        store.removeItem(key);
        return true;
      } catch {
        return false;
      }
    });
  };

  return {
    localStorage: purge(safeLocalStorage),
    sessionStorage: purge(safeSessionStorage),
  };
}

export function getEligibleSharedProfessionalLeads(
  homeownerRequests = [],
  professional = {},
  options = {}
) {
  const requests = Array.isArray(homeownerRequests) ? homeownerRequests : [];

  return requests
    .filter((request) => isRequestAvailableAsNewLead(request))
    .filter((request) => canProfessionalSeeLocalLead(professional, request, options));
}

export function shouldUseBackendPostForProfessionalLead(
  post = {},
  homeownerRequests = [],
  options = {}
) {
  const matchingRequest = findSharedRequestForLead(post, homeownerRequests);

  if (matchingRequest) {
    return isRequestAvailableAsNewLead(matchingRequest);
  }

  return Boolean(options.qaMode && isDemoOrSeedLead(post));
}
