import { t } from "./language.js";

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanText(value) {
  return hasText(value) ? value.trim() : "";
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstText(...values) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function compactRecord(record) {
  const cleanRecord = Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== "";
    })
  );

  return Object.keys(cleanRecord).length > 0 ? cleanRecord : null;
}

function readStorageValue(storage, key) {
  try {
    if (!storage || typeof storage.getItem !== "function") return "";
    return storage.getItem(key) || "";
  } catch {
    return "";
  }
}

function readStorageRecord(storage, key) {
  const rawValue = readStorageValue(storage, key);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeEntity(value, fallback = {}) {
  const source = isRecord(value) ? value : hasText(value) ? { name: value } : {};
  const merged = { ...fallback, ...source };

  return compactRecord({
    id: firstText(
      merged.id,
      merged.relationshipId,
      merged.contactId,
      merged.customerId,
      merged.userId,
      merged.businessId,
      merged.requestId,
      merged.projectId,
      merged.jobId,
      merged.conversationId,
      merged.threadId
    ),
    name: firstText(
      merged.name,
      merged.displayName,
      merged.title,
      merged.customerName,
      merged.businessName,
      merged.projectTitle,
      merged.service,
      merged.serviceTitle
    ),
    type: firstText(merged.type, merged.role, merged.relationshipType, merged.kind, merged.category),
    status: firstText(merged.status, merged.currentStatus, merged.stage, merged.state),
    owner: firstText(merged.owner, merged.currentOwner, merged.owningSurface),
    nextAction: firstText(merged.nextAction, merged.nextResponsibility, merged.recommendation),
    intent: firstText(merged.intent, merged.purpose, merged.issue),
  });
}

function mergeEntity(base, override) {
  return normalizeEntity({
    ...(base || {}),
    ...(isRecord(override) ? override : hasText(override) ? { name: override } : {}),
  });
}

function normalizeNextAction(value) {
  if (hasText(value)) return { label: value.trim() };
  if (!isRecord(value)) return null;

  return compactRecord({
    id: firstText(value.id, value.actionId),
    label: firstText(value.label, value.title, value.nextAction, value.name),
    owner: firstText(value.owner, value.currentOwner, value.owningSurface),
    status: firstText(value.status, value.state),
  });
}

function normalizeRelatedReferences(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return values
    .map((reference) =>
      normalizeEntity(reference, {
        type: isRecord(reference) ? reference.referenceType : "",
      })
    )
    .filter(Boolean);
}

function normalizePage(currentPage = "") {
  const page = String(currentPage || "").trim().toLowerCase();

  if (/businessprofile|contractorprofile|businessreadiness|businessverification/.test(page)) {
    return "businessProfile";
  }
  if (/businessdashboard|businesshome/.test(page)) return "businessDashboard";
  if (/businesstools|businesscommandcenter|membership|pricing|pricebook/.test(page)) {
    return "businessTools";
  }
  if (/portfolio|projectgallery/.test(page)) return "portfolio";
  if (/emergency/.test(page)) return "emergency";
  if (/conversation|thread|messages|chat/.test(page)) return "conversation";
  if (/projectdetails|myrequests|reviewproject/.test(page)) return "project";
  if (/upload|request|create/.test(page)) return "request";
  if (/discover|search|contractordetails|contractors/.test(page)) return "discover";
  if (/schedule|visit|appointment/.test(page)) return "schedule";
  if (/businessleads|lead|opportunit/.test(page)) return "lead";
  if (/evaluation|servicetypesevaluations/.test(page)) return "evaluation";
  if (/quotebuilder|quote|proposal/.test(page)) return "quote";
  if (/invoicebuilder|invoice|receipt|payment/.test(page)) return "invoice";
  if (/completion|closeout|completedjobdetails|closure/.test(page)) return "completion";
  if (/contractordashboard|workcenter/.test(page)) return "workCenter";
  if (/profile|account|settings/.test(page)) return "profile";
  if (/home|dashboard/.test(page)) return "home";

  return "fallback";
}

const SURFACE_PROFILES = Object.freeze({
  home: {
    homeBase: "Home",
    parentSurface: "Homeowner Home",
    surfaceType: "Dashboard",
    owner: "Homeowner Home",
    title: "companionContextHomeTitle",
    message: "companionContextHomeMessage",
  },
  businessDashboard: {
    homeBase: "Business Dashboard",
    parentSurface: "Professional Business Dashboard",
    surfaceType: "Dashboard",
    owner: "Professional Business Dashboard",
    title: "companionContextBusinessDashboardTitle",
    message: "companionContextBusinessDashboardMessage",
  },
  request: {
    homeBase: "Request",
    parentSurface: "Request Creation",
    surfaceType: "Focus Page",
    owner: "Request Creation",
    title: "companionContextRequestTitle",
    message: "companionContextRequestMessage",
  },
  discover: {
    homeBase: "Discover",
    parentSurface: "Discover",
    surfaceType: "Workspace",
    owner: "Discover",
    title: "companionContextDiscoverTitle",
    message: "companionContextDiscoverMessage",
  },
  conversation: {
    homeBase: "Messages",
    parentSurface: "Communication Center",
    surfaceType: "Workspace",
    owner: "Communication Center",
    title: "companionContextConversationTitle",
    message: "companionContextConversationMessage",
  },
  emergency: {
    homeBase: "Messages",
    parentSurface: "Communication Center",
    surfaceType: "Workspace",
    owner: "Emergency / Request Flow",
    title: "companionContextEmergencyTitle",
    message: "companionContextEmergencyMessage",
  },
  schedule: {
    homeBase: "Work",
    parentSurface: "Schedule",
    surfaceType: "Focus Page",
    owner: "Schedule",
    title: "companionContextScheduleTitle",
    message: "companionContextScheduleMessage",
  },
  workCenter: {
    homeBase: "Work",
    parentSurface: "Work Center",
    surfaceType: "Workspace",
    owner: "Work Center",
    title: "companionContextWorkCenterTitle",
    message: "companionContextWorkCenterMessage",
  },
  lead: {
    homeBase: "Leads",
    parentSurface: "Opportunities",
    surfaceType: "Workspace",
    owner: "Leads",
    title: "companionContextLeadTitle",
    message: "companionContextLeadMessage",
  },
  evaluation: {
    homeBase: "Work",
    parentSurface: "Work Center",
    surfaceType: "Focus Page",
    owner: "Evaluation",
    title: "companionContextEvaluationTitle",
    message: "companionContextEvaluationMessage",
  },
  quote: {
    homeBase: "Work",
    parentSurface: "Quote Builder",
    surfaceType: "Focus Page",
    owner: "Quote Builder",
    title: "companionContextQuoteTitle",
    message: "companionContextQuoteMessage",
  },
  invoice: {
    homeBase: "Work",
    parentSurface: "Invoice Builder",
    surfaceType: "Focus Page",
    owner: "Invoice Builder",
    title: "companionContextInvoiceTitle",
    message: "companionContextInvoiceMessage",
  },
  completion: {
    homeBase: "Work",
    parentSurface: "Closure",
    surfaceType: "Focus Page",
    owner: "Completion / Closure",
    title: "companionContextCompletionTitle",
    message: "companionContextCompletionMessage",
  },
  project: {
    homeBase: "Requests",
    parentSurface: "Project Details",
    surfaceType: "Focus Page",
    owner: "Project Details",
    title: "companionContextProjectTitle",
    message: "companionContextProjectMessage",
  },
  businessProfile: {
    homeBase: "Business",
    parentSurface: "Business Profile",
    surfaceType: "Business Management Page",
    owner: "Business Profile",
    title: "companionContextBusinessProfileTitle",
    message: "companionContextBusinessProfileMessage",
  },
  businessTools: {
    homeBase: "Business",
    parentSurface: "Business Tools",
    surfaceType: "Business Management Page",
    owner: "Business Tools",
    title: "companionContextBusinessToolsTitle",
    message: "companionContextBusinessToolsMessage",
  },
  portfolio: {
    homeBase: "Business",
    parentSurface: "Portfolio",
    surfaceType: "Business Management Page",
    owner: "Portfolio",
    title: "companionContextPortfolioTitle",
    message: "companionContextPortfolioMessage",
  },
  profile: {
    homeBase: "Profile",
    parentSurface: "Personal Profile",
    surfaceType: "Focus Page",
    owner: "Profile",
    title: "companionContextProfileTitle",
    message: "companionContextProfileMessage",
  },
  fallback: {
    homeBase: "Meetro",
    parentSurface: "Current Surface",
    surfaceType: "Workspace Guidance",
    owner: "Active Surface",
    title: "companionContextFallbackTitle",
    message: "companionContextFallbackMessage",
  },
});

function buildStorageContext(storage) {
  const contractorProfile =
    readStorageRecord(storage, "contractorProfile") ||
    readStorageRecord(storage, "businessProfile") ||
    readStorageRecord(storage, "meetroBusinessProfile");
  const activeConversationId = firstText(
    readStorageValue(storage, "activeConversationId"),
    readStorageValue(storage, "meetroActiveConversationId"),
    readStorageValue(storage, "selectedConversationId"),
    readStorageValue(storage, "activeThreadId")
  );
  const activeRequestId = firstText(
    readStorageValue(storage, "selectedHomeownerRequestId"),
    readStorageValue(storage, "activeEmergencyRequestId"),
    readStorageValue(storage, "activeRequestId")
  );
  const activeWorkId = firstText(
    readStorageValue(storage, "activeJobId"),
    readStorageValue(storage, "activeWorkRequestId"),
    readStorageValue(storage, "activeVisitId")
  );
  const businessAvailability = firstText(readStorageValue(storage, "meetroAvailableNow"));
  const workSection = firstText(
    readStorageValue(storage, "meetroWorkCenterTab"),
    readStorageValue(storage, "activeWorkCenterTab")
  );

  return {
    business: normalizeEntity(contractorProfile, {
      status: businessAvailability ? `Availability: ${businessAvailability}` : "",
    }),
    conversation: normalizeEntity({
      id: activeConversationId,
      type: firstText(readStorageValue(storage, "activeConversationType")),
      status: firstText(readStorageValue(storage, "activeConversationStatus")),
      name: firstText(readStorageValue(storage, "activeConversationName")),
    }),
    request: normalizeEntity({
      id: activeRequestId,
      status: firstText(readStorageValue(storage, "activeRequestStatus")),
    }),
    work: normalizeEntity({
      id: activeWorkId,
      type: workSection,
      status: firstText(readStorageValue(storage, "activeWorkStatus")),
    }),
    relationship: normalizeEntity({
      id: firstText(readStorageValue(storage, "activeRelationshipId")),
      name: firstText(readStorageValue(storage, "activeRelationshipName")),
      type: firstText(readStorageValue(storage, "activeRelationshipType")),
    }),
  };
}

function getContextAwareMessage(contextType, fallbackMessage, context) {
  const relationshipName = firstText(
    context.relationship?.name,
    context.conversation?.name
  );
  const workName = firstText(context.work?.name, context.project?.name, context.request?.name);
  const businessName = firstText(context.business?.name);
  const status = firstText(
    context.currentStatus,
    context.conversation?.status,
    context.work?.status,
    context.project?.status,
    context.request?.status,
    context.business?.status
  );

  if (contextType === "conversation" && relationshipName && status) {
    return `${relationshipName}: ${status}.`;
  }

  if (contextType === "conversation" && relationshipName) {
    return `${relationshipName}'s conversation is open. I can help find schedule or proposal details.`;
  }

  if (contextType === "workCenter" && workName && status) {
    return `${workName}: ${status}. Work Center owns the next step.`;
  }

  if (contextType === "businessProfile" && businessName && status) {
    return `${businessName}: ${status}. Business Profile owns readiness and trust.`;
  }

  if ((contextType === "request" || contextType === "discover") && context.request?.intent) {
    return `I can help clarify this request: ${context.request.intent}.`;
  }

  return fallbackMessage;
}

export function getCompanionContext({
  currentPage = "",
  language = "en",
  hasObservation = false,
  storage = null,
  roleMode = "",
  relationship = null,
  project = null,
  request = null,
  conversation = null,
  work = null,
  business = null,
  currentStatus = "",
  nextAction = null,
  currentOwner = "",
  relatedWorkReferences = [],
} = {}) {
  const contextType = normalizePage(currentPage);
  const profile = SURFACE_PROFILES[contextType] || SURFACE_PROFILES.fallback;
  const storageContext = buildStorageContext(storage);
  const relationshipContext = mergeEntity(storageContext.relationship, relationship);
  const conversationContext = mergeEntity(storageContext.conversation, conversation);
  const requestContext = mergeEntity(storageContext.request, request);
  const projectContext = normalizeEntity(project);
  const workContext = mergeEntity(storageContext.work, work);
  const businessContext = mergeEntity(storageContext.business, business);
  const nextActionContext =
    normalizeNextAction(nextAction) ||
    normalizeNextAction(conversationContext?.nextAction) ||
    normalizeNextAction(workContext?.nextAction) ||
    normalizeNextAction(requestContext?.nextAction) ||
    normalizeNextAction(projectContext?.nextAction) ||
    normalizeNextAction(businessContext?.nextAction);
  const statusText = firstText(
    currentStatus,
    conversationContext?.status,
    workContext?.status,
    projectContext?.status,
    requestContext?.status,
    businessContext?.status
  );
  const ownerText = firstText(
    currentOwner,
    conversationContext?.owner,
    workContext?.owner,
    requestContext?.owner,
    projectContext?.owner,
    businessContext?.owner,
    profile.owner
  );
  const references = normalizeRelatedReferences(relatedWorkReferences);
  const translatedMessage = t(profile.message, language);
  const contextAwareMessage = getContextAwareMessage(contextType, translatedMessage, {
    relationship: relationshipContext,
    conversation: conversationContext,
    request: requestContext,
    project: projectContext,
    work: workContext,
    business: businessContext,
    currentStatus: statusText,
    nextAction: nextActionContext,
  });

  return {
    contextType,
    activeRoute: cleanText(currentPage) || "unknown",
    activeHomeBase: profile.homeBase,
    activeParentSurface: profile.parentSurface,
    activeSurfaceType: profile.surfaceType,
    activeRoleMode: cleanText(roleMode),
    currentOwner: ownerText,
    relationship: relationshipContext,
    project: projectContext,
    request: requestContext,
    conversation: conversationContext,
    work: workContext,
    business: businessContext,
    currentStatus: statusText,
    nextAction: nextActionContext,
    relatedWorkReferences: references,
    isReadOnly: true,
    ownsWorkflow: false,
    ownershipBoundary: `Companion guides. ${ownerText} owns this surface.`,
    guidance: {
      observation: contextAwareMessage,
      recommendation:
        nextActionContext?.label || t("assistantCompanionRecommendationDefault", language),
    },
    title: t(profile.title, language),
    status: hasObservation
      ? t("meetroName", language)
      : t("assistantCompanionTodaysFocus", language),
    message: contextAwareMessage,
    primaryActionLabel: t("companionContextReviewNextStep", language),
    secondaryActionLabel: t("assistantCompanionAskMeetro", language),
  };
}

export { normalizePage as normalizeCompanionContextPage };
