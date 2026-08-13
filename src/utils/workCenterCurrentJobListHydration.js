import { isCanonicalWorkCenterEntry } from "./workCenterCanonicalHydration.js";
import { fetchWorkCenterLifecycleProjection } from "./workCenterLifecycleProjection.js";

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getCanonicalCurrentJobIdentityKey(entry = {}) {
  if (!isCanonicalWorkCenterEntry(entry)) return "";
  const requestId = positiveInteger(entry.requestId ?? entry.postId);
  const relationshipId = positiveInteger(entry.relationshipId);
  if (!requestId || !relationshipId) return "";
  return `request:${requestId}:relationship:${relationshipId}`;
}

export function prepareCurrentJobListHydration(entries = []) {
  return (Array.isArray(entries) ? entries : []).map((entry) =>
    isCanonicalWorkCenterEntry(entry)
      ? {
          ...entry,
          liveJob: null,
          liveJobStatus: "loading",
          liveJobUnavailableReason: "",
        }
      : entry
  );
}

export function replaceCurrentJobListEntry(entries = [], replacement = null) {
  const identityKey = getCanonicalCurrentJobIdentityKey(replacement);
  if (!identityKey) return Array.isArray(entries) ? entries : [];

  let replacementCount = 0;
  const nextEntries = (Array.isArray(entries) ? entries : []).map((entry) => {
    if (getCanonicalCurrentJobIdentityKey(entry) !== identityKey) return entry;
    replacementCount += 1;
    return replacement;
  });

  return replacementCount === 1 ? nextEntries : entries;
}

export function getCurrentJobListPresentation(entry = {}) {
  if (!isCanonicalWorkCenterEntry(entry)) {
    return {
      statusLabel: "Legacy reference",
      nextStepLabel: "Read-only compatibility record",
      responsibilityLabel: "",
      blockerLabel: "",
      state: "legacy",
    };
  }

  if (entry.liveJobStatus === "loading") {
    return {
      statusLabel: "Loading current status…",
      nextStepLabel: "Loading the next step…",
      responsibilityLabel: "",
      blockerLabel: "",
      state: "loading",
    };
  }

  if (entry.liveJobStatus === "ready" && entry.liveJob) {
    return {
      statusLabel: entry.liveJob.stage.label,
      nextStepLabel: entry.liveJob.nextAction.label,
      responsibilityLabel: entry.liveJob.responsibility.label,
      blockerLabel: entry.liveJob.blocker?.label || "",
      state: "ready",
    };
  }

  return {
    statusLabel: "Current status unavailable",
    nextStepLabel: "Open the Job to refresh its next step",
    responsibilityLabel: "Unavailable",
    blockerLabel: "",
    state: "unavailable",
  };
}

export async function hydrateCurrentJobListEntry({
  entry,
  setPage,
  authFetchImpl,
} = {}) {
  const identityKey = getCanonicalCurrentJobIdentityKey(entry);
  if (!identityKey) return entry;

  let result;
  try {
    result = await fetchWorkCenterLifecycleProjection({
      record: entry,
      setPage,
      authFetchImpl,
    });
  } catch {
    result = {
      status: "error",
      reason: "LIVE_JOB_NETWORK_ERROR",
      projection: null,
    };
  }

  const liveJob = result?.projection?.liveJob || null;
  const requestId = positiveInteger(entry.requestId ?? entry.postId);
  const relationshipId = positiveInteger(entry.relationshipId);
  const identityMatches = Boolean(
    result?.status === "ready" &&
      liveJob &&
      positiveInteger(liveJob.requestId) === requestId &&
      positiveInteger(liveJob.relationshipId) === relationshipId &&
      positiveInteger(result.projection?.requestId) === requestId &&
      positiveInteger(result.projection?.job?.requestRelationshipId) === relationshipId &&
      String(result.projection?.job?.id || "").toLowerCase() ===
        String(liveJob.jobId || "").toLowerCase()
  );

  if (!identityMatches) {
    return {
      ...entry,
      liveJob: null,
      liveJobStatus:
        result?.status === "ready" ? "unavailable" : result?.status || "error",
      liveJobUnavailableReason:
        result?.status === "ready"
          ? "LIVE_JOB_IDENTITY_MISMATCH"
          : result?.reason || "LIVE_JOB_UNAVAILABLE",
    };
  }

  return {
    ...entry,
    lifecycleVerified: true,
    lifecycleContractVersion: 2,
    jobId: liveJob.jobId,
    liveJob,
    liveJobStatus: "ready",
    liveJobUnavailableReason: "",
  };
}

export async function hydrateCurrentJobListEntries({
  entries = [],
  setPage,
  authFetchImpl,
  onEntryHydrated,
} = {}) {
  const preparedEntries = prepareCurrentJobListHydration(entries);

  return Promise.all(
    preparedEntries.map(async (entry) => {
      if (!isCanonicalWorkCenterEntry(entry)) return entry;
      const hydratedEntry = await hydrateCurrentJobListEntry({
        entry,
        setPage,
        authFetchImpl,
      });
      onEntryHydrated?.(hydratedEntry);
      return hydratedEntry;
    })
  );
}
