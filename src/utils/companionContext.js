import { t } from "./language.js";

function normalizePage(currentPage = "") {
  const page = String(currentPage || "").trim().toLowerCase();

  if (/conversation|thread|messages|chat/.test(page)) return "conversation";
  if (/upload|request|create/.test(page)) return "request";
  if (/discover|search|contractordetails|contractors/.test(page)) return "discover";
  if (/schedule|visit|appointment/.test(page)) return "schedule";
  if (/businessleads|lead|opportunit/.test(page)) return "lead";
  if (/evaluation|serviceTypesEvaluations/.test(page)) return "evaluation";
  if (/quotebuilder|quote|proposal/.test(page)) return "quote";
  if (/invoicebuilder|invoice|receipt|payment/.test(page)) return "invoice";
  if (/completion|closeout|completedjobdetails|projectdetails|reviewproject/.test(page)) {
    return "completion";
  }
  if (/contractordashboard|workcenter|businessdashboard/.test(page)) return "workCenter";
  if (/profile|account|settings/.test(page)) return "profile";
  if (/home|dashboard/.test(page)) return "home";

  return "fallback";
}

const CONTEXT_KEYS = Object.freeze({
  home: {
    title: "companionContextHomeTitle",
    message: "companionContextHomeMessage",
  },
  request: {
    title: "companionContextRequestTitle",
    message: "companionContextRequestMessage",
  },
  discover: {
    title: "companionContextDiscoverTitle",
    message: "companionContextDiscoverMessage",
  },
  conversation: {
    title: "companionContextConversationTitle",
    message: "companionContextConversationMessage",
  },
  schedule: {
    title: "companionContextScheduleTitle",
    message: "companionContextScheduleMessage",
  },
  workCenter: {
    title: "companionContextWorkCenterTitle",
    message: "companionContextWorkCenterMessage",
  },
  lead: {
    title: "companionContextLeadTitle",
    message: "companionContextLeadMessage",
  },
  evaluation: {
    title: "companionContextEvaluationTitle",
    message: "companionContextEvaluationMessage",
  },
  quote: {
    title: "companionContextQuoteTitle",
    message: "companionContextQuoteMessage",
  },
  invoice: {
    title: "companionContextInvoiceTitle",
    message: "companionContextInvoiceMessage",
  },
  completion: {
    title: "companionContextCompletionTitle",
    message: "companionContextCompletionMessage",
  },
  profile: {
    title: "companionContextProfileTitle",
    message: "companionContextProfileMessage",
  },
  fallback: {
    title: "companionContextFallbackTitle",
    message: "companionContextFallbackMessage",
  },
});

export function getCompanionContext({
  currentPage = "",
  language = "en",
  hasObservation = false,
} = {}) {
  const contextType = normalizePage(currentPage);
  const keys = CONTEXT_KEYS[contextType] || CONTEXT_KEYS.fallback;

  return {
    contextType,
    title: t(keys.title, language),
    status: hasObservation
      ? t("meetroName", language)
      : t("assistantCompanionTodaysFocus", language),
    message: t(keys.message, language),
    primaryActionLabel: t("companionContextReviewNextStep", language),
    secondaryActionLabel: t("assistantCompanionAskMeetro", language),
  };
}

export { normalizePage as normalizeCompanionContextPage };
