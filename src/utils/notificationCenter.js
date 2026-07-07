const PROJECT_UPDATE_TYPES = new Set([
  "project_update",
  "work_update",
  "active_work_update",
  "materials_update",
  "completion_pending",
  "completion_confirmed",
  "closure_pending",
  "completed",
]);

const MESSAGE_TYPES = new Set(["message", "unread_message", "new_message"]);
const QUOTE_TYPES = new Set([
  "quote",
  "quote_sent",
  "quote_ready",
  "quote_accepted",
  "quote_revision_requested",
  "proposal_sent",
]);
const SCHEDULE_TYPES = new Set([
  "schedule",
  "schedule_response",
  "appointment_confirmed",
  "appointment_change_requested",
  "visit_scheduled",
  "work_scheduled",
]);
const EMERGENCY_TYPES = new Set(["emergency", "emergency_update", "emergency_request"]);
const HIRING_TYPES = new Set([
  "hiring",
  "hiring_application",
  "job_inquiry",
  "applicant_message",
]);
const REVIEW_TYPES = new Set(["review", "review_reminder", "rating_request"]);

export function getNotificationCategory(notification = {}) {
  const type = String(notification.type || notification.category || "system").toLowerCase();

  if (MESSAGE_TYPES.has(type)) return "messages";
  if (QUOTE_TYPES.has(type)) return "quotes";
  if (SCHEDULE_TYPES.has(type)) return "schedule";
  if (EMERGENCY_TYPES.has(type) || type.includes("emergency")) return "emergency";
  if (HIRING_TYPES.has(type) || type.includes("hiring") || type.includes("applicant")) {
    return "hiring";
  }
  if (REVIEW_TYPES.has(type) || type.includes("review")) return "reviews";
  if (PROJECT_UPDATE_TYPES.has(type)) return "projectUpdates";
  return "system";
}

export function getNotificationRoute(notification = {}, activeAccountMode = "personal") {
  const category = getNotificationCategory(notification);
  const metadata = notification.metadata || {};
  const conversationId = notification.conversationId || metadata.conversationId || "";
  const requestId = notification.requestId || metadata.requestId || metadata.projectId || "";
  const quoteId = notification.quoteId || metadata.quoteId || "";
  const emergencyId = notification.emergencyId || metadata.emergencyId || "";

  if (conversationId) {
    return {
      page: "conversationThread",
      context: {
        activeConversationId: conversationId,
        meetroConversationType:
          category === "emergency"
            ? "emergency"
            : category === "hiring"
            ? "hiring_application"
            : "project",
      },
    };
  }

  if (category === "quotes") {
    return {
      page: requestId ? "conversationThread" : "home",
      context: {
        activeConversationId: conversationId || requestId,
        meetroConversationType: "standard",
        selectedHomeownerRequestId: requestId,
        selectedQuoteId: quoteId,
        conversationReturnPage: activeAccountMode === "business" ? "businessDashboard" : "home",
      },
    };
  }

  if (category === "schedule") {
    return {
      page: requestId ? "conversationThread" : "home",
      context: {
        activeConversationId: conversationId || requestId,
        meetroConversationType: "standard",
        selectedHomeownerRequestId: requestId,
        conversationReturnPage: activeAccountMode === "business" ? "businessDashboard" : "home",
      },
    };
  }

  if (category === "emergency") {
    return {
      page: emergencyId ? "emergencyStatus" : "emergency",
      context: {
        selectedEmergencyId: emergencyId,
      },
    };
  }

  if (category === "hiring") {
    return {
      page: activeAccountMode === "business" ? "messagesInbox" : "jobsHiring",
      context: {
        meetroMessageSection: activeAccountMode === "business" ? "hiring" : "",
        selectedHiringPositionId: notification.positionId || metadata.positionId || "",
        selectedHiringApplicantId: notification.applicantId || metadata.applicantId || "",
      },
    };
  }

  if (category === "reviews") {
    return {
      page: "completedJobDetails",
      context: {
        selectedHomeownerRequestId: requestId,
        projectJourneyFocus: "review",
      },
    };
  }

  if (category === "projectUpdates") {
    return {
      page: String(notification.type || "").includes("completion")
        ? "completedJobDetails"
        : requestId
        ? "conversationThread"
        : activeAccountMode === "business"
        ? "businessDashboard"
        : "home",
      context: {
        activeConversationId: conversationId || requestId,
        meetroConversationType: "standard",
        selectedHomeownerRequestId: requestId,
        conversationReturnPage: activeAccountMode === "business" ? "businessDashboard" : "home",
      },
    };
  }

  return {
    page: activeAccountMode === "business" ? "businessDashboard" : "home",
    context: {},
  };
}

export function getRelativeNotificationTime(timestamp, now = new Date()) {
  const createdAt = new Date(timestamp || Date.now());
  if (Number.isNaN(createdAt.getTime())) return "";

  const diffMs = Math.max(0, now.getTime() - createdAt.getTime());
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function groupNotificationsByAge(notifications = [], now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  return notifications.reduce(
    (groups, notification) => {
      const createdAt = new Date(notification.timestamp || notification.createdAt || 0);
      const target =
        createdAt >= startOfToday
          ? "today"
          : createdAt >= startOfYesterday
          ? "earlier"
          : "older";

      groups[target].push(notification);
      return groups;
    },
    { today: [], earlier: [], older: [] }
  );
}

export function sortNotificationsByAttention(notifications = []) {
  return [...notifications].sort((a, b) => {
    const unreadDiff = Number(Boolean(b.unread || !b.read)) - Number(Boolean(a.unread || !a.read));
    if (unreadDiff) return unreadDiff;

    return (
      new Date(b.timestamp || b.createdAt || 0).getTime() -
      new Date(a.timestamp || a.createdAt || 0).getTime()
    );
  });
}
