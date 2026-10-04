const SIDE_CONTEXT_MODES = new Set(["inline", "column"]);

function normalizedId(value) {
  return String(value || "").trim().toLowerCase();
}

export function getConversationQuoteAuthority({
  jobId,
  quoteIds = [],
  quotes = [],
} = {}) {
  const expectedJobId = normalizedId(jobId);
  const expectedQuoteIds = new Set(quoteIds.map(normalizedId).filter(Boolean));
  if (!expectedJobId || expectedQuoteIds.size === 0 || !Array.isArray(quotes)) {
    return null;
  }

  const matchingQuotes = quotes.filter((quote) => {
    const quoteId = normalizedId(quote?.quoteId || quote?.id);
    return (
      normalizedId(quote?.jobId) === expectedJobId &&
      expectedQuoteIds.has(quoteId)
    );
  });
  if (matchingQuotes.length === 0) return null;

  const approved = matchingQuotes.find(
    (quote) =>
      quote?.businessStatus === "APPROVED" ||
      quote?.classification === "APPROVED" ||
      quote?.customerDecision === "APPROVED"
  );
  const selected = approved || matchingQuotes[0];
  const businessStatus = approved
    ? "APPROVED"
    : selected?.businessStatus || selected?.classification || "";

  return Object.freeze({
    quoteId: normalizedId(selected?.quoteId || selected?.id),
    jobId: expectedJobId,
    businessStatus,
    approved: businessStatus === "APPROVED",
  });
}

export function shouldRenderCurrentVisitInline({
  contextMode = "mobile",
  quoteAuthorityPhase = "idle",
  quoteAuthority = null,
} = {}) {
  const hasResponsiveSideContext = SIDE_CONTEXT_MODES.has(contextMode);
  const canonicalApprovalConfirmed =
    quoteAuthorityPhase === "ready" && quoteAuthority?.approved === true;

  return !(hasResponsiveSideContext && canonicalApprovalConfirmed);
}

export function getConversationVisitTimelineIndex({
  visit,
  messages = [],
} = {}) {
  if (!Array.isArray(messages)) return 0;
  const visitTimestamp = [
    visit?.completedAt,
    visit?.startedAt,
    visit?.versionCreatedAt,
    visit?.createdAt,
  ]
    .map((value) => Date.parse(value || ""))
    .find(Number.isFinite);
  if (!Number.isFinite(visitTimestamp)) return 0;

  const nextMessageIndex = messages.findIndex((message) => {
    const messageTimestamp = Date.parse(message?.createdAt || message?.time || "");
    return Number.isFinite(messageTimestamp) && messageTimestamp > visitTimestamp;
  });
  return nextMessageIndex === -1 ? messages.length : nextMessageIndex;
}

export function getConversationVisitContextFacts(visit, language = "en") {
  if (!visit?.id || !visit?.state || !visit?.scheduledStartAt) return [];

  const locale =
    language === "es" ? "es-US" : language === "fr" ? "fr-US" : language === "pt" ? "pt-BR" : "en-US";
  const schedule = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: visit.timeZone,
  }).format(new Date(visit.scheduledStartAt));
  const stateLabel = {
    PROPOSED: "Waiting for confirmation",
    SCHEDULED: "Confirmed",
    STARTED: "In progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  }[visit.state] || visit.state;

  return Object.freeze([
    Object.freeze({ label: "Evaluation Visit", value: stateLabel }),
    Object.freeze({ label: "Schedule", value: schedule }),
    Object.freeze({
      label: "Location",
      value:
        visit.locationMode === "REMOTE"
          ? "Remote"
          : "Project service location",
    }),
  ]);
}
