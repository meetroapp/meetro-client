import { WORKFLOW_EVENT_REQUIRED_FIELDS } from "./workflowEventContract.js";

function isMissingActor(event) {
  return (
    !event ||
    event.actor === "unknown" ||
    event.actor === "" ||
    event.legacy?.missingFields?.includes("actor")
  );
}

function isMissingTimestamp(event) {
  return (
    !event ||
    !event.recordedAt ||
    event.legacy?.missingFields?.includes("recordedAt")
  );
}

function isInvalidNormalizedEvent(event) {
  return Boolean(
    !event ||
      typeof event !== "object" ||
      Array.isArray(event) ||
      WORKFLOW_EVENT_REQUIRED_FIELDS.some(
        (field) => !Object.prototype.hasOwnProperty.call(event, field)
      ) ||
      !event.legacy ||
      typeof event.legacy !== "object"
  );
}

function countDuplicateMetadata(events) {
  return events.reduce((count, event) => {
    const duplicateSources = event?.legacy?.duplicateSources;
    return (
      count +
      (Array.isArray(duplicateSources) ? duplicateSources.length : 0)
    );
  }, 0);
}

// Compares the legacy render input with shadow-normalized output. This utility
// is pure and does not read storage, log, mutate, or select a render source.
export function getConversationTimelineAudit(
  legacyTimelineEvents = [],
  shadowReconciledTimeline = [],
  { normalizationErrors = 0 } = {}
) {
  const legacy = Array.isArray(legacyTimelineEvents)
    ? legacyTimelineEvents
    : [];
  const shadow = Array.isArray(shadowReconciledTimeline)
    ? shadowReconciledTimeline
    : [];
  const countDifference = Math.max(legacy.length - shadow.length, 0);
  const duplicateMetadataCount = countDuplicateMetadata(shadow);
  const invalidNormalizedCount = shadow.filter(isInvalidNormalizedEvent).length;
  const suppliedErrorCount = Number.isFinite(Number(normalizationErrors))
    ? Math.max(Number(normalizationErrors), 0)
    : 0;

  return {
    legacyCount: legacy.length,
    shadowCount: shadow.length,
    missingActorCount: shadow.filter(isMissingActor).length,
    missingTimestampCount: shadow.filter(isMissingTimestamp).length,
    duplicateCandidates: Math.max(
      countDifference,
      duplicateMetadataCount
    ),
    normalizationErrors: invalidNormalizedCount + suppliedErrorCount,
  };
}
