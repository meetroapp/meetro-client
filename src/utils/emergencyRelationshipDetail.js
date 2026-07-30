import {
  getEmergencyRelationshipNextStep,
  getEmergencySpecialtyDisplayLabel,
  getEmergencyWorkCenterStatusLabel,
  isSupportedEmergencySummaryStatus,
} from "./emergencySummary.js";

const SELECTED_PROFESSIONAL_STATUSES = Object.freeze([
  "assigned",
  "professional_en_route",
  "professional_arrived",
  "in_service",
  "work_in_progress",
  "completed",
  "resolved",
]);

const TIMESTAMP_FIELDS = Object.freeze([
  "requestedAt",
  "assignedAt",
  "enRouteAt",
  "arrivedAt",
  "workStartedAt",
  "completedAt",
  "cancelledAt",
  "expiredAt",
]);

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePositiveInteger(value) {
  const normalized = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizeTimestamp(value) {
  if (typeof value !== "string") return null;

  const timestamp = value.trim();
  return timestamp && Number.isFinite(Date.parse(timestamp))
    ? timestamp
    : null;
}

function titleize(value) {
  return cleanText(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeResponseCard(response, emergencyRequestId) {
  if (
    !response ||
    typeof response !== "object" ||
    !["pending", "active"].includes(response.status) ||
    normalizePositiveInteger(response.emergencyRequestId) !==
      emergencyRequestId
  ) {
    return null;
  }

  const responseId = normalizePositiveInteger(response.id);
  const professional =
    response.professional &&
    typeof response.professional === "object" &&
    !Array.isArray(response.professional)
      ? response.professional
      : {};

  if (!responseId) return null;

  return {
    id: responseId,
    status: response.status,
    businessName:
      cleanText(professional.businessName) ||
      (response.status === "active"
        ? "Selected Professional"
        : "Professional Response"),
    category:
      cleanText(professional.category) ||
      cleanText(professional.serviceSpecialties?.[0]),
    logoUrl:
      cleanText(professional.businessLogoUrl) ||
      cleanText(professional.profileImageUrl) ||
      "",
    conversationAvailable:
      response.status === "active" &&
      response.conversationAvailable === true,
  };
}

export function normalizeEmergencyRelationshipDetail({
  emergencyRequest,
  responses = [],
  conversationId,
  language = "en",
} = {}) {
  if (
    !emergencyRequest ||
    typeof emergencyRequest !== "object" ||
    Array.isArray(emergencyRequest)
  ) {
    return null;
  }

  const emergencyRequestId = normalizePositiveInteger(
    emergencyRequest.id
  );
  const title = cleanText(emergencyRequest.title);
  const serviceSpecialty = cleanText(
    emergencyRequest.serviceSpecialty
  );
  const description = cleanText(emergencyRequest.description);
  const status = cleanText(emergencyRequest.status);

  if (
    !emergencyRequestId ||
    !title ||
    !serviceSpecialty ||
    !isSupportedEmergencySummaryStatus(status)
  ) {
    return null;
  }

  const normalizedResponseCards = (
    Array.isArray(responses) ? responses : []
  )
    .map((response) =>
      normalizeResponseCard(response, emergencyRequestId)
    )
    .filter(Boolean);
  const hasSelectedProfessional =
    SELECTED_PROFESSIONAL_STATUSES.includes(status);
  const responseCards = normalizedResponseCards.filter(
    (response) =>
      hasSelectedProfessional
        ? response.status === "active"
        : response.status === "pending"
  );
  const activeResponse = responseCards.find(
    (response) => response.status === "active"
  );
  const normalizedConversationId = normalizePositiveInteger(
    conversationId
  );
  const conversationAvailable = Boolean(
    hasSelectedProfessional &&
      activeResponse?.conversationAvailable === true &&
      normalizedConversationId
  );
  const normalizedTimestamps = Object.fromEntries(
    TIMESTAMP_FIELDS.map((field) => [
      field,
      normalizeTimestamp(emergencyRequest[field]),
    ])
  );
  const serviceDomain = cleanText(emergencyRequest.serviceDomain);
  const category = cleanText(emergencyRequest.category);
  const locationText = cleanText(emergencyRequest.locationText);
  const unitNumber = cleanText(emergencyRequest.unitNumber);
  const accessNotes = cleanText(emergencyRequest.accessNotes);

  return {
    emergencyRequestId,
    title,
    description,
    serviceSpecialty,
    serviceSpecialtyLabel: getEmergencySpecialtyDisplayLabel(
      serviceSpecialty,
      language
    ),
    serviceDomain,
    serviceDomainLabel: titleize(serviceDomain),
    category,
    categoryLabel: titleize(category),
    status,
    statusLabel: getEmergencyWorkCenterStatusLabel(
      status,
      language
    ),
    nextStep: getEmergencyRelationshipNextStep(
      status,
      language
    ),
    timelineRequest: {
      status,
      ...normalizedTimestamps,
    },
    selectedProfessional: hasSelectedProfessional
      ? {
          displayName:
            activeResponse?.businessName ||
            (language === "es"
              ? "Profesional Seleccionado"
              : "Selected Professional"),
          category: activeResponse?.category || "",
          logoUrl: activeResponse?.logoUrl || "",
          verifiedFromActiveRelationship: Boolean(activeResponse),
        }
      : null,
    conversation: {
      available: conversationAvailable,
      id: conversationAvailable
        ? normalizedConversationId
        : null,
    },
    location:
      locationText || unitNumber || accessNotes
        ? {
            locationText,
            unitNumber,
            accessNotes,
          }
        : null,
    responseCards,
    completed:
      ["completed", "resolved"].includes(status),
    completedAt: normalizedTimestamps.completedAt,
  };
}
