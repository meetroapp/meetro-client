import { getLeadEligibilitySummary } from "./leadEligibility.js";
import { canProfessionalServeArea } from "./serviceAreaMatching.js";

function textIncludesDemoMarker(value = "") {
  const text = String(value || "").toLowerCase();

  return (
    text.startsWith("qa-") ||
    text.startsWith("demo-") ||
    text.startsWith("seed-") ||
    text.includes(" qa ") ||
    text.includes(" demo ") ||
    text.includes(" seed ")
  );
}

function hasKnownDemoCustomer(record = {}) {
  const identityText = [
    record.customerName,
    record.homeownerName,
    record.customer,
    record.name,
    record.title,
    record.project_title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return ["sarah", "william", "jack"].some((name) => identityText.includes(name));
}

function looksLikeLocalHomeownerRequest(record = {}) {
  return Boolean(
    record &&
      typeof record === "object" &&
      (record.ownerUserId ||
        record.createdByUserId ||
        record.ownerEmail ||
        record.createdByEmail) &&
      (record.requestId || record.id) &&
      (record.status || record.createdAt)
  );
}

export function isLocalDemoSafeRecord(record = {}) {
  if (!record || typeof record !== "object") return false;

  if (
    record.localDemoSafe === true ||
    record.demoSafe === true ||
    record.isDemo === true ||
    record.isSeed === true ||
    record.qaSafe === true
  ) {
    return true;
  }

  if (looksLikeLocalHomeownerRequest(record)) return true;

  const identityFields = [
    record.id,
    record.requestId,
    record.projectId,
    record.conversationId,
    record.scheduleId,
    record.source,
    record.sourceType,
    record.fixture,
  ];

  return identityFields.some(textIncludesDemoMarker) || hasKnownDemoCustomer(record);
}

export function getLocalLeadVisibilitySummary(
  professional = {},
  request = {},
  options = {}
) {
  const allowLocalDemoSafe =
    options.allowLocalDemoSafe === true ||
    isLocalDemoSafeRecord(professional) ||
    isLocalDemoSafeRecord(request);
  const eligibility = getLeadEligibilitySummary(professional, request, {
    ...options,
    allowLocalDemoSafe,
  });

  if (!eligibility.serviceMatched) {
    return {
      visible: false,
      serviceMatched: false,
      serviceAreaMatched: false,
      requestMatch: eligibility.requestMatch,
      serviceArea: null,
    };
  }

  return {
    visible: eligibility.eligible,
    serviceMatched: eligibility.serviceMatched,
    serviceAreaMatched: eligibility.serviceAreaMatched,
    requestMatch: eligibility.requestMatch,
    serviceArea: eligibility.serviceArea,
  };
}

export function canProfessionalSeeLocalLead(professional = {}, request = {}, options = {}) {
  return getLocalLeadVisibilitySummary(professional, request, options).visible;
}

export function canProfessionalSeeLocalLeadByArea(
  professional = {},
  request = {},
  options = {}
) {
  return canProfessionalServeArea(professional, request, {
    allowLocalDemoSafe:
      options.allowLocalDemoSafe === true ||
      isLocalDemoSafeRecord(professional) ||
      isLocalDemoSafeRecord(request),
  });
}
