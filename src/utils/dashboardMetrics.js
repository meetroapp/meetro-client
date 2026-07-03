import { getBusinessServicesProjection } from "./businessServiceProfile.js";
import { getBusinessPortfolioProofProjection } from "./businessPortfolioProof.js";
import { getEligibleSharedProfessionalLeads } from "./businessLeadSourceTruth.js";
import {
  getActiveWorkItems,
  getCompletedWorkItems,
  getQuoteItems,
  getScheduleItems,
  getTimelineEvents,
  getWorkCenterSummary,
} from "./workCenterSelectors.js";
import { getStoredHomeownerRequests } from "./workflowTimeline.js";
import {
  getUnreadConversationCount,
  getConversationRegistry,
} from "./conversationUnread.js";
import { getUnreadNotificationCount } from "./notifications.js";
import {
  getHomeownerServiceHistory,
} from "./homeownerServiceHistory.js";
import {
  isRequestActiveForHomeowner,
} from "./homeownerLifecycle.js";

function safeStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readValue(key, fallback = "") {
  try {
    return safeStorage()?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function readNumber(key, fallback = 0) {
  const value = Number(readValue(key, ""));
  return Number.isFinite(value) ? value : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeStatus(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function getBusinessProofMetrics(source = {}, options = {}) {
  const portfolio = getBusinessPortfolioProofProjection(source, options);
  const services = getBusinessServicesProjection(source, options);

  return {
    completedProjectCount: portfolio.projectCount,
    featuredProjectCount: portfolio.featuredProjectCount,
    reviewCount: portfolio.reviewCount,
    rating: portfolio.averageRating,
    serviceCount: services.displayLabels.length,
    portfolioMediaCount: portfolio.photoCount,
    portfolio,
    services,
  };
}

export function getProfessionalWorkMetrics({
  homeownerRequests,
  professional,
} = {}) {
  const requests =
    Array.isArray(homeownerRequests)
      ? homeownerRequests
      : getStoredHomeownerRequests();
  const workCenter = getWorkCenterSummary();
  const scheduleItems = getScheduleItems();
  const quoteItems = getQuoteItems();
  const activeWorkItems = getActiveWorkItems();
  const completedWorkItems = getCompletedWorkItems();
  const timelineEvents = getTimelineEvents();
  const newLeads = getEligibleSharedProfessionalLeads(requests, professional || {});

  return {
    newLeadCount: newLeads.length,
    newLeads,
    scheduledJobsCount: scheduleItems.length,
    scheduleItems,
    pendingQuoteCount: workCenter.pendingQuoteCount,
    quoteResponseAlertCount: workCenter.quoteResponseAlertCount,
    pendingQuotes: quoteItems.filter((quote) =>
      ["", "sent", "quoted"].includes(normalizeStatus(quote.status || quote.quoteStatus))
    ),
    activeWorkCount: workCenter.activeWorkCount,
    activeWorkItems,
    completedJobsCount: workCenter.completedJobsCount,
    completedWorkItems,
    totalJobRevenue: workCenter.totalJobRevenue,
    averageJobValue: workCenter.averageJobValue,
    activityCount: workCenter.timelineEventCount,
    timelineEvents,
    warningCount: workCenter.warningCount,
    workCenter,
  };
}

export function getHomeownerRequestMetrics({
  requests,
  history,
} = {}) {
  const homeownerRequests = asArray(requests || getStoredHomeownerRequests());
  const serviceHistory = asArray(history || getHomeownerServiceHistory());

  return {
    activeRequestsCount: homeownerRequests.filter(isRequestActiveForHomeowner).length,
    completedRequestsCount: serviceHistory.length,
    activeRequests: homeownerRequests.filter(isRequestActiveForHomeowner),
    completedRequests: serviceHistory,
  };
}

export function getConversationMetrics({ registry, role } = {}) {
  const conversations = asArray(registry || getConversationRegistry());

  return {
    unreadConversationCount: getUnreadConversationCount(conversations, role),
    conversationCount: conversations.length,
  };
}

export function getActivityMetrics({ notifications } = {}) {
  const notificationCount = asArray(notifications).length;

  return {
    notificationCount,
    unreadHomeownerNotificationCount: getUnreadNotificationCount("homeowner"),
    unreadProfessionalNotificationCount: getUnreadNotificationCount("professional"),
  };
}

export function getLegacyProfessionalMetricFallbacks() {
  return {
    completedJobsCount: readNumber("completedJobsCount", 0),
    activeJobsCount: readNumber("activeJobsCount", 0),
    unreadMessagesCount: readNumber("mockUnreadMessages", 0),
  };
}
