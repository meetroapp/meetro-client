import {
  resolveTranslation,
  t,
} from "./language.js";
import {
  formatLocaleCurrency,
  formatLocaleDate,
  formatLocaleTime,
} from "./localeFormat.js";
import { normalizeCanonicalAlertDestination } from "./canonicalAlert.js";
import {
  getCanonicalConversationActionTarget,
} from "./conversationActionRouting.js";
import {
  buildProfessionalWorkCenterRoute,
} from "./professionalWorkCenterRoute.js";

export const DEFAULT_ALERT_CENTER_VIEW = "attention";
export const ALERT_CENTER_PAGE_SIZE = 25;

export const ALERT_CENTER_VIEWS = Object.freeze([
  Object.freeze({
    id: "attention",
    labelKey: "alertCenterViewAttention",
    emptyKey: "alertCenterEmptyAttention",
    query: Object.freeze({ lifecycle: "active", unread: true }),
  }),
  Object.freeze({
    id: "read",
    labelKey: "alertCenterViewRead",
    emptyKey: "alertCenterEmptyRead",
    query: Object.freeze({ lifecycle: "active", unread: false }),
  }),
  Object.freeze({
    id: "resolved",
    labelKey: "alertCenterViewResolved",
    emptyKey: "alertCenterEmptyResolved",
    query: Object.freeze({ lifecycle: "resolved" }),
  }),
  Object.freeze({
    id: "dismissed",
    labelKey: "alertCenterViewDismissed",
    emptyKey: "alertCenterEmptyDismissed",
    query: Object.freeze({ lifecycle: "dismissed" }),
  }),
]);

const VIEW_BY_ID = new Map(ALERT_CENTER_VIEWS.map((view) => [view.id, view]));

const CATEGORY_KEYS = Object.freeze({
  communication: "alertCenterCategoryCommunication",
  emergency: "alertCenterCategoryEmergency",
  request: "alertCenterCategoryRequest",
  evaluation: "alertCenterCategoryEvaluation",
  proposal: "alertCenterCategoryProposal",
  invoice: "alertCenterCategoryInvoice",
  payment: "alertCenterCategoryPayment",
  schedule: "alertCenterCategorySchedule",
  work: "alertCenterCategoryWork",
  completion: "alertCenterCategoryCompletion",
  review: "alertCenterCategoryReview",
  business_verification: "alertCenterCategoryBusinessVerification",
  system: "alertCenterCategorySystem",
});

const PRIORITY_KEYS = Object.freeze({
  critical: "alertCenterPriorityCritical",
  high: "alertCenterPriorityHigh",
  normal: "alertCenterPriorityNormal",
  informational: "alertCenterPriorityInformational",
});

const LIFECYCLE_KEYS = Object.freeze({
  active: "alertCenterLifecycleActive",
  dismissed: "alertCenterLifecycleDismissed",
  resolved: "alertCenterLifecycleResolved",
  expired: "alertCenterLifecycleExpired",
  archived: "alertCenterLifecycleArchived",
});

const MARK_READ_LIFECYCLES = new Set([
  "active",
  "dismissed",
  "resolved",
  "expired",
]);

const SUPPORTED_DESTINATIONS = new Set([
  "conversation",
  "emergency_request",
  "request",
  "project",
  "evaluation",
  "business_profile",
  "review",
  "notifications",
]);

export function getAlertCenterView(viewId) {
  return VIEW_BY_ID.get(viewId) || VIEW_BY_ID.get(DEFAULT_ALERT_CENTER_VIEW);
}

export function buildAlertCenterQuery(viewId, cursor) {
  const view = getAlertCenterView(viewId);
  return {
    limit: ALERT_CENTER_PAGE_SIZE,
    ...view.query,
    ...(cursor ? { cursor } : {}),
  };
}

export function resolveAlertCopy(key, fallbackKey, language) {
  const resolved = resolveTranslation(key, language);
  return resolved.source === "missing"
    ? t(fallbackKey, language)
    : resolved.value;
}

function hasUnsafeControlCharacter(value) {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint <= 8 ||
      codePoint === 11 ||
      codePoint === 12 ||
      (codePoint >= 14 && codePoint <= 31) ||
      (codePoint >= 127 && codePoint <= 159)
    ) {
      return true;
    }
  }
  return false;
}

export function getAlertPreview(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  if (typeof payload.shortPreview !== "string") return null;
  const preview = payload.shortPreview.trim();
  return preview &&
    preview.length <= 160 &&
    !hasUnsafeControlCharacter(preview)
    ? preview
    : null;
}

export function getAlertUnreadCount(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  return Number.isSafeInteger(payload.unreadCount) && payload.unreadCount >= 0
    ? payload.unreadCount
    : null;
}

export function canMarkCanonicalAlertRead(alert) {
  return Boolean(
    alert &&
    alert.state?.isRead === false &&
    MARK_READ_LIFECYCLES.has(alert.state?.lifecycle)
  );
}

export function canAttemptCanonicalAlertDismiss(alert) {
  return Boolean(
    alert &&
    alert.priority !== "critical" &&
    alert.state?.lifecycle === "active"
  );
}

export function isSupportedAlertDestination(destination) {
  const normalized = normalizeCanonicalAlertDestination(destination);
  return Boolean(normalized && SUPPORTED_DESTINATIONS.has(normalized.type));
}

export function getAlertConversationActionTarget(destination) {
  const normalized = normalizeCanonicalAlertDestination(destination);
  const conversationDestination =
    normalized?.type === "conversation" ? normalized : {};

  return getCanonicalConversationActionTarget(conversationDestination, {
    returnPage: "notifications",
    preferCommunicationCenterShell: true,
  });
}

export function getAlertWorkCenterActionTarget(destination) {
  const normalized = normalizeCanonicalAlertDestination(destination);
  if (
    normalized?.type !== "conversation" ||
    !normalized.jobId ||
    !normalized.quoteId
  ) return { ok: false, route: null };
  const route = buildProfessionalWorkCenterRoute({
    jobId: normalized.jobId,
    quoteId: normalized.quoteId,
  });
  return route ? { ok: true, route } : { ok: false, route: null };
}

function quoteDecisionFacts(alert, language) {
  if (
    ![
      "alerts.commercial.quoteApproved.title",
      "alerts.commercial.quoteDeclined.title",
    ].includes(alert?.titleKey)
  ) return null;
  const payload = alert?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const currency = typeof payload.currency === "string" && /^[A-Z]{3}$/.test(payload.currency)
    ? payload.currency
    : null;
  const total = currency && Number.isSafeInteger(payload.quoteTotalMinor) && payload.quoteTotalMinor >= 0
    ? formatLocaleCurrency(payload.quoteTotalMinor / 100, currency, {}, language)
    : "";
  const deposit = currency && payload.depositState === "DEPOSIT_DUE" &&
    Number.isSafeInteger(payload.depositDueMinor) && payload.depositDueMinor >= 0
    ? formatLocaleCurrency(payload.depositDueMinor / 100, currency, {}, language)
    : "";
  return {
    customerLabel: typeof payload.customerLabel === "string" ? payload.customerLabel : "",
    projectTitle: typeof payload.projectTitle === "string" ? payload.projectTitle : "",
    quoteNumber: typeof payload.quoteNumber === "string" ? payload.quoteNumber : "",
    total,
    deposit,
  };
}

export function getAlertErrorKey(error, operation = "load") {
  if (operation === "dismiss" && error?.status === 409) {
    return "alertCenterDismissConflict";
  }
  if (error?.kind === "network") return "alertCenterNetworkError";
  if (operation === "load_more") return "alertCenterLoadMoreError";
  if (operation === "refresh") return "alertCenterRefreshError";
  if (operation === "mutation" || operation === "dismiss") {
    return "alertCenterMutationError";
  }
  return "alertCenterInitialErrorText";
}

export function getAlertPresentation(alert, language) {
  const unreadCount = getAlertUnreadCount(alert?.payload);
  const decisionFacts = quoteDecisionFacts(alert, language);
  const date = formatLocaleDate(
    alert?.availableAt,
    { month: "short", day: "numeric", year: "numeric" },
    language
  );
  const time = formatLocaleTime(
    alert?.availableAt,
    { hour: "numeric", minute: "2-digit" },
    language
  );

  return {
    title: resolveAlertCopy(
      alert?.titleKey,
      "alertCenterFallbackTitle",
      language
    ),
    message: resolveAlertCopy(
      alert?.messageKey,
      "alertCenterFallbackMessage",
      language
    ),
    category: t(
      CATEGORY_KEYS[alert?.category] || "alertCenterCategoryGeneral",
      language
    ),
    priority: t(
      PRIORITY_KEYS[alert?.priority] || "alertCenterPriorityNormal",
      language
    ),
    lifecycle: t(
      LIFECYCLE_KEYS[alert?.state?.lifecycle] || "alertCenterLifecycleUnavailable",
      language
    ),
    readState: t(
      alert?.state?.isRead === true ? "alertCenterRead" : "alertCenterUnread",
      language
    ),
    preview: getAlertPreview(alert?.payload),
    decisionFacts,
    unreadCount,
    unreadCountText: unreadCount === null
      ? ""
      : t(
        unreadCount === 1
          ? "alertCenterUnreadCountSingular"
          : "alertCenterUnreadCountPlural",
        language,
        { count: unreadCount }
      ),
    timestamp: [date, time].filter(Boolean).join(" · "),
    destinationKey: isSupportedAlertDestination(alert?.destination)
      ? "alertCenterDestinationLater"
      : "alertCenterDestinationUnavailable",
  };
}
