import { t } from "./language.js";

const WAKE_SUGGESTION_KEYS = {
  conversation: [
    ["relationshipMemory", "assistantWakeSuggestionRelationshipMemory"],
    ["summarizeConversation", "assistantWakeSuggestionSummarizeConversation"],
    ["askAnything", "assistantWakeSuggestionAskAnything"],
  ],
  schedule: [
    ["reviewCommitments", "assistantWakeSuggestionReviewCommitments"],
    ["showSchedule", "assistantWakeSuggestionShowSchedule"],
    ["askAnything", "assistantWakeSuggestionAskAnything"],
  ],
  reviewProject: [
    ["nextWorkflowStep", "assistantWakeSuggestionNextWorkflowStep"],
    ["reviewProject", "assistantWakeSuggestionReviewProject"],
    ["askAnything", "assistantWakeSuggestionAskAnything"],
  ],
  quoteBuilder: [
    ["reviewProposal", "assistantWakeSuggestionReviewProposal"],
    ["missingDocumentation", "assistantWakeSuggestionMissingDocumentation"],
    ["askAnything", "assistantWakeSuggestionAskAnything"],
  ],
  invoiceBuilder: [
    ["reviewInvoice", "assistantWakeSuggestionReviewInvoice"],
    ["paymentSummary", "assistantWakeSuggestionPaymentSummary"],
    ["askAnything", "assistantWakeSuggestionAskAnything"],
  ],
  home: [
    ["attention", "assistantWakeSuggestionAttention"],
    ["todaysCommitments", "assistantWakeSuggestionTodaysCommitments"],
    ["askAnything", "assistantWakeSuggestionAskAnything"],
  ],
};

export const ASSISTANT_WAKE_DISMISS_MS = 8000;
export const ASSISTANT_ORB_MARK = "M";
export const COMPANION_STATES = Object.freeze({
  presence: "presence",
  guidance: "guidance",
  conversation: "conversation",
  idle: "presence",
  briefing: "guidance",
  insights: "guidance",
});

function normalizeWakePage(currentPage = "") {
  const page = String(currentPage || "").trim().toLowerCase();
  if (/conversation|thread|messages/.test(page)) return "conversation";
  if (/schedule|visit|appointment/.test(page)) return "schedule";
  if (/completedjobdetails|completed-job|reviewproject|review-project|projectdetails|closure/.test(page)) {
    return "reviewProject";
  }
  if (/quotebuilder|quote-builder|proposal|quote/.test(page)) return "quoteBuilder";
  if (/invoicebuilder|invoice-builder|invoice|receipt/.test(page)) return "invoiceBuilder";
  if (/home|dashboard/.test(page)) return "home";
  return "home";
}

function getGreetingKey(hour) {
  if (hour < 12) return "assistantWakeGoodMorning";
  if (hour < 18) return "assistantWakeGoodAfternoon";
  return "assistantWakeGoodEvening";
}

export function getAssistantWakeGreeting({
  name = "",
  now = new Date(),
  language = "en",
} = {}) {
  const parsedDate = now instanceof Date ? now : new Date(now);
  const hour = Number.isNaN(parsedDate.getTime()) ? 12 : parsedDate.getHours();
  const greeting = t(getGreetingKey(hour), language);
  const firstName = String(name || "").trim().split(/\s+/)[0] || "";

  return {
    greeting: firstName ? `${greeting}, ${firstName}.` : `${greeting}.`,
    prompt: t("assistantWakePrompt", language),
  };
}

export function getAssistantWakeSuggestions({
  currentPage = "",
  language = "en",
} = {}) {
  const page = normalizeWakePage(currentPage);
  const entries = WAKE_SUGGESTION_KEYS[page] || WAKE_SUGGESTION_KEYS.home;

  return entries.slice(0, 3).map(([id, labelKey]) => {
    const label = t(labelKey, language);
    return {
      id,
      label,
      prompt: label,
    };
  });
}

export function isHighPriorityWakeInsight(insight = {}) {
  return ["critical", "high"].includes(String(insight?.priority || "").toLowerCase());
}

export function getAssistantWakeInsightMessage(insight = {}, language = "en") {
  if (insight.messageKey) return t(insight.messageKey, language);
  return String(insight.message || "").trim();
}

export function getAssistantWakeContent({
  currentPage = "",
  language = "en",
  name = "",
  now = new Date(),
  topInsight = null,
} = {}) {
  if (isHighPriorityWakeInsight(topInsight)) {
    const message = getAssistantWakeInsightMessage(topInsight, language);
    return {
      mode: "insight",
      icon: ASSISTANT_ORB_MARK,
      greeting: t("assistantWakeInsightIntro", language),
      prompt: message,
      suggestions: [
        {
          id: "continue",
          label: t("assistantWakeContinue", language),
          prompt: message || t("assistantWakeSuggestionAskAnything", language),
        },
      ],
    };
  }

  const greeting = getAssistantWakeGreeting({ name, now, language });
  return {
    mode: "greeting",
    icon: ASSISTANT_ORB_MARK,
    greeting: greeting.greeting,
    prompt: greeting.prompt,
    suggestions: getAssistantWakeSuggestions({ currentPage, language }),
  };
}

export function getAssistantWakeAnimation(reducedMotion = false) {
  return reducedMotion ? "none" : "meetroAssistantWakeIn 180ms ease-out";
}

export function getAssistantLauncherWakeAction({
  open = false,
  wakeOpen = false,
  dragSuppressed = false,
} = {}) {
  if (dragSuppressed) return "suppress";
  if (open) return "none";
  if (wakeOpen) return "open";
  return "wake";
}

function readJsonFromStorage(storage, key, fallback = {}) {
  try {
    const value = JSON.parse(storage?.getItem?.(key) || "");
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

function normalizeCompanionRole(role = "") {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "business" || normalized === "professional"
    ? "business"
    : "personal";
}

function getStoredAccountValue(storage, key = "") {
  return String(storage?.getItem?.(key) || "").trim();
}

export function getCompanionObservationScope({
  storage = typeof localStorage !== "undefined" ? localStorage : null,
  currentPage = "",
  role = "",
} = {}) {
  const storedUser = readJsonFromStorage(storage, "user", {});
  const currentUser = readJsonFromStorage(storage, "currentUser", {});
  const userId =
    getStoredAccountValue(storage, "userId") ||
    String(storedUser.id || storedUser.user_id || storedUser.userId || "").trim() ||
    String(currentUser.id || currentUser.user_id || currentUser.userId || "").trim();
  const email =
    getStoredAccountValue(storage, "userEmail") ||
    String(storedUser.email || currentUser.email || "").trim();
  const accountId = (userId || email || "local").toLowerCase();
  const storedRole = getStoredAccountValue(storage, "activeAccountMode") || role;

  return {
    accountId,
    role: normalizeCompanionRole(role || storedRole),
    route: String(currentPage || "unknown").trim() || "unknown",
    conversationId: getStoredAccountValue(storage, "activeConversationId"),
    requestId:
      getStoredAccountValue(storage, "activeEmergencyRequestId") ||
      getStoredAccountValue(storage, "emergencyRequestId") ||
      getStoredAccountValue(storage, "selectedHomeownerRequestId"),
    projectId:
      getStoredAccountValue(storage, "activeJobId") ||
      getStoredAccountValue(storage, "activeWorkRequestId") ||
      getStoredAccountValue(storage, "selectedHomeownerRequestId"),
  };
}

export function getCompanionObservationScopeKey(scope = {}) {
  return [
    scope.accountId || "local",
    normalizeCompanionRole(scope.role),
    scope.route || "unknown",
    scope.conversationId || "",
    scope.requestId || scope.projectId || "",
  ].join(":");
}

export function getCompanionObservationDismissalKey(scope = {}, observationId = "") {
  const accountId = String(scope.accountId || "local").trim().toLowerCase() || "local";
  const role = normalizeCompanionRole(scope.role);
  const id = String(observationId || "unknown").trim() || "unknown";
  return `meetro.companion.dismissed:${accountId}:${role}:${id}`;
}

export function isCompanionObservationVisible(observation = {}, scope = {}) {
  if (!observation || observation.active === false) return false;

  const activeRole = normalizeCompanionRole(scope.role);
  const observationRole = observation.role ? normalizeCompanionRole(observation.role) : "";
  if (observationRole && observationRole !== activeRole) return false;

  const activeAccount = String(scope.accountId || "").trim().toLowerCase();
  const observationAccount = String(observation.accountId || "").trim().toLowerCase();
  if (observationAccount && activeAccount && observationAccount !== activeAccount) {
    return false;
  }

  if (observation.type === "emergency") {
    if (activeRole === "business") return true;
    return Boolean(observation.homeownerSafe && observationAccount && observationAccount === activeAccount);
  }

  return true;
}

export function getMeetroCompanionSheetContent({
  language = "en",
  name = "",
  now = new Date(),
  topInsight = null,
} = {}) {
  const greeting = getAssistantWakeGreeting({ name, now, language });
  const insightMessage = isHighPriorityWakeInsight(topInsight)
    ? getAssistantWakeInsightMessage(topInsight, language)
    : "";

  return {
    title: t("meetroName", language),
    greeting: greeting.greeting,
    noticedLabel: t("assistantCompanionINoticed", language),
    noticedItems: insightMessage
      ? [insightMessage]
      : [
          t("assistantCompanionNoUrgent", language),
          t("assistantCompanionReviewOpportunitiesFocus", language),
        ],
    prompt: t("assistantCompanionHowCanWeHelp", language),
  };
}

export function getMeetroCompanionIntentActions(language = "en") {
  return [
    {
      id: "continue",
      label: t("assistantCompanionContinueWorking", language),
    },
    {
      id: "insights",
      label: t("assistantCompanionReviewInsights", language),
    },
    {
      id: "ask",
      label: t("assistantCompanionAskMeetro", language),
    },
  ];
}

export function getAssistantIntentDisplayLabel(intent = "", language = "en") {
  const normalized = String(intent || "").trim();
  if (!normalized) return "";
  const key = `assistantIntent_${normalized}`;
  const translated = t(key, language);
  if (translated !== key) return translated;
  return normalized.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
