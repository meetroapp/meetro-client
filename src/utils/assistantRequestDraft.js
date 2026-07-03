import { buildRequestMatchingFields } from "./requestMatchingFields.js";
import { classifyRequestIntent } from "./requestIntelligence.js";

export const ASSISTANT_REQUEST_DRAFT_KEY = "meetroAssistantRequestDraft";

const LEGACY_DRAFT_KEYS = [
  "aiProjectDraft",
  "aiBusinessRecommendation",
  "aiProjectScope",
];

function cleanText(value = "") {
  return String(value || "").trim();
}

function sentenceCase(value = "") {
  const text = cleanText(value);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function compactTitleFromPrompt(prompt = "", fallback = "Service request") {
  const cleaned = cleanText(prompt)
    .replace(/^(i|we)\s+(need|want|would like)\s+(an?|the)?\s*/i, "")
    .replace(/^need\s+(an?|the)?\s*/i, "")
    .replace(/[.!?]+$/g, "")
    .trim();

  return sentenceCase(cleaned || fallback);
}

export function classifyAssistantRequestIntent(input = {}) {
  return classifyRequestIntent(input);
}

function getIntentFromInput(input = {}) {
  if (input.intent && typeof input.intent === "object") return input.intent;
  return classifyAssistantRequestIntent(input);
}

function getHelpfulDetailItems({ originalPrompt = "", category = "" } = {}) {
  const lower = originalPrompt.toLowerCase();

  if (category === "mechanic") {
    return [
      "Vehicle year, make, and model",
      "Whether the engine cranks or is completely silent",
      "Dashboard warning lights",
      "Battery condition if known",
      "Current vehicle location",
      "Whether roadside help is needed",
    ];
  }

  if (category === "plumbing") {
    return [
      "Where the leak is located",
      "Whether water is actively leaking",
      "Shutoff valve status if known",
      "Urgency level",
    ];
  }

  if (category === "doorsWindows" || /garage|opener/.test(lower)) {
    return [
      "Opener brand or model if available",
      "Existing opener or new install",
      "Garage door size or type",
      "Power outlet location",
      "Safety sensor condition",
    ];
  }

  if (category === "electrical") {
    return [
      "Affected fixture, outlet, or breaker",
      "Whether power is working in the area",
      "Any safety concerns or access details",
    ];
  }

  if (category === "painting" || category === "drywall") {
    return [
      "Area that needs repair or painting",
      "Approximate size of the area",
      "Color, finish, or material preferences if known",
    ];
  }

  if (category === "propertyManagement") {
    return [
      "Property type or unit",
      "Access instructions",
      "Urgency and coordination details",
    ];
  }

  return [
    "Where the work is needed",
    "Any measurements, brand names, or model numbers if known",
    "Whether materials are already purchased",
  ];
}

function createCustomerFacingDetails({ originalPrompt = "", category = "", intent = {} } = {}) {
  const label = cleanText(intent.suggestedServiceLabel).toLowerCase();

  if (category === "mechanic") {
    return label.includes("won't start")
      ? "My vehicle will not start and I need help diagnosing the issue."
      : "I need help with my vehicle and would like a mechanic to review the issue.";
  }

  if (category === "plumbing") {
    return label.includes("faucet")
      ? "I have a leaking kitchen faucet and need help repairing it."
      : "I have a plumbing issue and need help finding the source and fixing it.";
  }

  if (category === "doorsWindows") {
    return label.includes("opener")
      ? "I need a garage door opener installed and would like a professional to review the setup, mounting location, power source, and safety sensors."
      : "I need help with a garage door or door-related service.";
  }

  if (category === "electrical") {
    return "I need help with an electrical item and would like a professional to review it safely.";
  }

  if (category === "painting" || category === "drywall") {
    return "I need help with a wall, paint, or drywall project and would like the area reviewed.";
  }

  if (category === "propertyManagement") {
    return "I need help coordinating a property-related service request.";
  }

  return originalPrompt
    ? `I need help with this request: ${originalPrompt}`
    : "I need help with a service request.";
}

function formatRequestSection(title, lines = []) {
  const content = Array.isArray(lines)
    ? lines.map(cleanText).filter(Boolean)
    : [cleanText(lines)].filter(Boolean);

  if (content.length === 0) return "";

  return `${title}:\n${content.join("\n")}`;
}

export function inferAssistantRequestCategory({ userText = "", businessType = "" } = {}) {
  return classifyAssistantRequestIntent({ userText, businessType }).category;
}

export function buildAssistantRequestDraft({
  userText = "",
  recommendations = {},
  mode = "scope",
  createdAt = new Date().toISOString(),
} = {}) {
  const originalPrompt = cleanText(userText);
  const suggestedProjectType = cleanText(recommendations.businessType);
  const scopeItems = Array.isArray(recommendations.scope)
    ? recommendations.scope.map(cleanText).filter(Boolean)
    : [];
  const photoItems = Array.isArray(recommendations.photos)
    ? recommendations.photos.map(cleanText).filter(Boolean)
    : [];
  const heading = cleanText(recommendations.heading);
  const intent = getIntentFromInput({
    userText: originalPrompt,
    businessType: suggestedProjectType,
    intent: recommendations.intent,
  });
  const category = intent.category;

  const customerDetails = createCustomerFacingDetails({ originalPrompt, category, intent });
  const helpfulDetails = getHelpfulDetailItems({ originalPrompt, category });
  const recommendedDetails = scopeItems.filter(
    (item) =>
      !/^describe the problem clearly\.?$/i.test(item) &&
      !helpfulDetails.some((detail) => detail.toLowerCase() === item.toLowerCase())
  );
  const descriptionParts = [
    formatRequestSection("Project Summary", originalPrompt),
    formatRequestSection("Details", customerDetails),
    formatRequestSection(
      "Helpful Details",
      [...helpfulDetails, ...recommendedDetails].map((item) => `• ${item}`)
    ),
    formatRequestSection(
      "Photos to Include",
      photoItems.map((item) => `• ${item}`)
    ),
  ].filter(Boolean);
  const title = compactTitleFromPrompt(
    originalPrompt,
    suggestedProjectType || "Service request"
  );
  const description = descriptionParts.join("\n");
  const requestMatchingFields = buildRequestMatchingFields({
    title,
    description,
    category,
  });

  return {
    source: "askMeetro",
    title,
    description,
    category,
    requestMatchingFields,
    requestCategory: requestMatchingFields.requestCategory,
    service_domain: requestMatchingFields.service_domain,
    service_specialty: requestMatchingFields.service_specialty,
    serviceDomain: requestMatchingFields.serviceDomain || intent.serviceDomain,
    serviceSpecialty: requestMatchingFields.serviceSpecialty,
    suggestedProjectType,
    serviceDomainLabel: intent.serviceDomainLabel,
    confidence: intent.confidence,
    intentReason: intent.reason,
    suggestedServiceLabel: intent.suggestedServiceLabel,
    recommendationText: [heading, ...scopeItems].filter(Boolean).join("\n"),
    originalPrompt,
    mode,
    createdAt,
  };
}

export function normalizeAssistantRequestDraft(draft = {}) {
  if (!draft || typeof draft !== "object") return null;

  const title = cleanText(draft.title || draft.requestTitle || draft.projectTitle);
  const description = cleanText(
    draft.description || draft.details || draft.requestDetails || draft.projectDescription
  );
  const originalPrompt = cleanText(draft.originalPrompt || draft.prompt || draft.userText);
  const suggestedProjectType = cleanText(
    draft.suggestedProjectType || draft.businessType || draft.projectType
  );
  const category = cleanText(draft.category || draft.serviceCategory);
  const inferredIntent = getIntentFromInput({
    userText: `${title} ${description} ${originalPrompt}`,
    businessType: suggestedProjectType,
    intent: draft.intent,
  });
  const normalizedCategory = category || inferredIntent.category;

  if (!title && !description && !originalPrompt) return null;

  return {
    source: cleanText(draft.source) || "askMeetro",
    title: title || compactTitleFromPrompt(originalPrompt, suggestedProjectType || "Service request"),
    description,
    category: normalizedCategory,
    suggestedProjectType,
    serviceDomain: cleanText(draft.serviceDomain) || inferredIntent.serviceDomain,
    serviceDomainLabel: cleanText(draft.serviceDomainLabel) || inferredIntent.serviceDomainLabel,
    confidence: cleanText(draft.confidence) || inferredIntent.confidence,
    intentReason: cleanText(draft.intentReason) || inferredIntent.reason,
    suggestedServiceLabel:
      cleanText(draft.suggestedServiceLabel) || inferredIntent.suggestedServiceLabel,
    recommendationText: cleanText(draft.recommendationText),
    originalPrompt,
    mode: cleanText(draft.mode) || "scope",
    createdAt: cleanText(draft.createdAt),
  };
}

export function saveAssistantRequestDraft(storage, draft = {}) {
  const normalized = normalizeAssistantRequestDraft(draft);
  if (!storage || !normalized) return null;

  storage.setItem(ASSISTANT_REQUEST_DRAFT_KEY, JSON.stringify(normalized));
  storage.setItem("aiProjectDraft", normalized.originalPrompt || normalized.title);
  storage.setItem("aiBusinessRecommendation", normalized.suggestedProjectType);
  storage.setItem("aiProjectScope", normalized.recommendationText || normalized.description);

  return normalized;
}

export function readAssistantRequestDraft(storage) {
  if (!storage) return null;

  try {
    const saved = JSON.parse(storage.getItem(ASSISTANT_REQUEST_DRAFT_KEY) || "null");
    const normalized = normalizeAssistantRequestDraft(saved);
    if (normalized) return normalized;
  } catch {
    // Fall through to legacy keys.
  }

  const legacyPrompt = cleanText(storage.getItem("aiProjectDraft"));
  const legacyBusinessType = cleanText(storage.getItem("aiBusinessRecommendation"));
  const legacyScope = cleanText(storage.getItem("aiProjectScope"));

  if (!legacyPrompt && !legacyBusinessType && !legacyScope) return null;

  return normalizeAssistantRequestDraft(buildAssistantRequestDraft({
    userText: legacyPrompt,
    recommendations: {
      businessType: legacyBusinessType,
      heading: "Helpful Details",
      scope: legacyScope.split("\n").map(cleanText).filter(Boolean),
      photos: [],
    },
    mode: "scope",
  }));
}

export function clearAssistantRequestDraft(storage) {
  if (!storage) return;

  storage.removeItem(ASSISTANT_REQUEST_DRAFT_KEY);
  LEGACY_DRAFT_KEYS.forEach((key) => storage.removeItem(key));
}
