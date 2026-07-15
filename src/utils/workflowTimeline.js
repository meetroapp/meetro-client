import { recoverRequestRelationships } from "./requestRelationshipRecovery.js";
import { canReadLegacyWorkflowStorage } from "./clientWorkflowStoragePolicy.js";

export function getStoredHomeownerRequests() {
  if (!canReadLegacyWorkflowStorage()) return [];
  const readArray = (key) => {
    try {
      const value = localStorage.getItem(key);
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const requestKey = (request = {}) =>
    String(
      request.requestId ||
        request.id ||
        [request.title, request.createdAt].filter(Boolean).join("::")
    );

  try {
    const primary = readArray("homeownerRequests");
    const backup = readArray("meetroHomeownerRequestsBackup");

    if (backup.length === 0) {
      const recovered = recoverRequestRelationships(primary, { storage: localStorage });
      if (recovered.changed) {
        localStorage.setItem("homeownerRequests", JSON.stringify(recovered.requests));
      }
      return recovered.requests;
    }

    const merged = [...primary];
    const seen = new Set(primary.map(requestKey).filter(Boolean));

    backup.forEach((request) => {
      const key = requestKey(request);
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(request);
    });

    const recovered = recoverRequestRelationships(merged, { storage: localStorage });

    if (merged.length !== primary.length || recovered.changed) {
      localStorage.setItem("homeownerRequests", JSON.stringify(recovered.requests));
    }

    return recovered.requests;
  } catch {
    return [];
  }
}

export function saveStoredHomeownerRequests(requests) {
  if (!canReadLegacyWorkflowStorage()) return [];
  localStorage.setItem("homeownerRequests", JSON.stringify(requests));
  return requests;
}

export function requestMatchesWorkflowMessage(request, msg) {
  const requestId = request.requestId || request.id || "";
  const msgRequestId = msg.requestId || "";

  const titleMatch =
    msg.projectTitle &&
    (request.title === msg.projectTitle ||
      request.project_title === msg.projectTitle);

  return String(requestId) === String(msgRequestId) || Boolean(titleMatch);
}

export function prependProjectTimeline(request, timelineItem) {
  return {
    ...request,
    projectTimeline: [
      {
        ...timelineItem,
        createdAt: timelineItem.createdAt || new Date().toISOString(),
      },
      ...(Array.isArray(request.projectTimeline)
        ? request.projectTimeline
        : []),
    ],
  };
}

export function updateMatchingHomeownerRequests(msg, updater) {
  const homeownerRequests = getStoredHomeownerRequests();

  const updatedHomeownerRequests = homeownerRequests.map((request) => {
    if (!requestMatchesWorkflowMessage(request, msg)) {
      return request;
    }

    return updater(request);
  });

  saveStoredHomeownerRequests(updatedHomeownerRequests);

  return updatedHomeownerRequests;
}


export function updateRequestById(
  requestId,
  updater,
  fallbackTitle = ""
) {
  const homeownerRequests =
    getStoredHomeownerRequests();

  const updatedRequests =
    homeownerRequests.map((request) => {
      const currentId =
        request.requestId || request.id || "";

      const titleMatch =
        fallbackTitle &&
        (
          request.title === fallbackTitle ||
          request.project_title === fallbackTitle
        );

      if (
        String(currentId) !== String(requestId) &&
        !titleMatch
      ) {
        return request;
      }

      return updater(request);
    });

  saveStoredHomeownerRequests(
    updatedRequests
  );

  return updatedRequests;
}

export function appendTimelineEvent(
  request,
  timelineItem
) {
  return prependProjectTimeline(
    request,
    timelineItem
  );
}


// =====================================================
// SECTION 6 FINAL: WORKFLOW QUERY ENGINE
// =====================================================

export function findRequestById(requestId) {
  const requests = getStoredHomeownerRequests();

  return requests.find(r =>
    String(r.id || r.requestId) === String(requestId)
  );
}

export function findMatchingRequestByTitle(title = "") {
  const requests = getStoredHomeownerRequests();

  return requests.find(r =>
    String(r.title || "").trim().toLowerCase() ===
    String(title || "").trim().toLowerCase()
  );
}

export function findRequestByIdOrTitle(id, title = "") {
  const requests = getStoredHomeownerRequests();

  return requests.find(r => {
    const rid = String(r.id || r.requestId);
    const matchId = rid && String(id) && rid === String(id);

    const matchTitle =
      title &&
      (r.title || "").trim().toLowerCase() ===
      String(title).trim().toLowerCase();

    return matchId || matchTitle;
  });
}

export function isRequestClosed(request) {
  if (!request) return false;

  const closedStatuses = [
    "accepted",
    "selected",
    "scheduled",
    "active",
    "completed",
    "cancelled",
    "closed",
  ];

  const hasAcceptedQuote =
    request.acceptedQuote ||
    request.selectedProfessional ||
    (request.quotesReceived || []).some(
      q => q.status === "accepted"
    );

  return (
    closedStatuses.includes(request.status) ||
    hasAcceptedQuote
  );
}

export function getActiveRequests() {
  return getStoredHomeownerRequests().filter(
    r => !isRequestClosed(r)
  );
}
