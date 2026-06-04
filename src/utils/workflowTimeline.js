export function getStoredHomeownerRequests() {
  try {
    return JSON.parse(localStorage.getItem("homeownerRequests") || "[]");
  } catch {
    return [];
  }
}

export function saveStoredHomeownerRequests(requests) {
  localStorage.setItem("homeownerRequests", JSON.stringify(requests));
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
