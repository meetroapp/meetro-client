import { authFetch } from "./authFetch.js";
import {
  getParticipantRoleLabelKey,
  normalizeRequestLifecycleFoundation,
} from "./requestLifecycleFoundation.js";
import { isCanonicalWorkCenterEntry } from "./workCenterCanonicalHydration.js";

const UNAVAILABLE_REASONS = Object.freeze({
  LEGACY: "unsupported_legacy_record",
  MISSING_POST_ID: "missing_post_id",
  INVALID_RESPONSE: "invalid_lifecycle_response",
});

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function stableIdentifier(value) {
  const integer = positiveInteger(value);
  if (integer) return integer;
  const normalized = String(value || "").trim();
  return normalized || null;
}

function firstPositiveInteger(...values) {
  for (const value of values) {
    const normalized = positiveInteger(value);
    if (normalized) return normalized;
  }
  return null;
}

function collectLifecycleSources(record = {}) {
  const sources = [
    record,
    record.request,
    record.schedule,
    record.quote,
    record.active,
    record.history,
    record.lifecycle,
  ];
  if (Array.isArray(record.sourceRecords)) {
    record.sourceRecords.forEach((entry) => {
      if (entry?.record) sources.push(entry.record);
    });
  }
  return sources.filter((item) => item && typeof item === "object");
}

export function getWorkCenterLifecycleContractVersion(record = {}) {
  for (const source of collectLifecycleSources(record)) {
    const version = positiveInteger(
      source.lifecycleContractVersion ??
        source.contractVersion ??
        source.lifecycle_contract_version ??
        source.lifecycle?.contractVersion
    );
    if (version) return version;
  }
  return 1;
}

export function resolveWorkCenterLifecyclePostId(record = {}) {
  const sources = collectLifecycleSources(record);
  for (const source of sources) {
    const postId = firstPositiveInteger(
      source.postId,
      source.post_id,
      source.jobRequestId,
      source.job_request_id,
      source.requestId,
      source.request_id
    );
    if (postId) return postId;
  }
  return null;
}

export function getWorkCenterLifecycleProjectionTarget(record = {}) {
  const contractVersion = getWorkCenterLifecycleContractVersion(record);
  const isUnverifiedCanonicalCandidate =
    isCanonicalWorkCenterEntry(record) &&
    record.lifecycleContractVersion == null;

  if (contractVersion !== 2 && !isUnverifiedCanonicalCandidate) {
    return {
      available: false,
      reason: UNAVAILABLE_REASONS.LEGACY,
      postId: null,
    };
  }

  const postId = resolveWorkCenterLifecyclePostId(record);
  if (!postId) {
    return {
      available: false,
      reason: UNAVAILABLE_REASONS.MISSING_POST_ID,
      postId: null,
    };
  }

  return {
    available: true,
    reason: "",
    postId,
  };
}

export function normalizeWorkCenterLifecycleProjection(payload = {}) {
  const lifecycle = normalizeRequestLifecycleFoundation(payload);
  if (!lifecycle || lifecycle.contractVersion !== 2 || lifecycle.legacy) {
    return null;
  }

  const primaryConcern = lifecycle.reportedConcerns[0] || null;
  return {
    authoritySource: "CANONICAL_BACKEND_READ",
    requestId: positiveInteger(lifecycle.requestId),
    job: lifecycle.job
      ? {
          present: Boolean(lifecycle.job.id),
          id: stableIdentifier(lifecycle.job.id),
          requestRelationshipId: positiveInteger(lifecycle.job.requestRelationshipId),
        }
      : null,
    customerConcern: primaryConcern
      ? {
          originalText: primaryConcern.originalText,
          reportedAt: primaryConcern.reportedAt || "",
          clarifications: primaryConcern.clarifications,
        }
      : null,
    participants: lifecycle.participants.map((participant) => ({
      displayName: participant.displayName,
      roles: participant.roles.map((role) => ({
        role,
        labelKey: getParticipantRoleLabelKey(role),
      })),
    })),
  };
}

export async function fetchWorkCenterLifecycleProjection({
  record,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const target = getWorkCenterLifecycleProjectionTarget(record);
  if (!target.available) {
    return {
      status: "unavailable",
      reason: target.reason,
      postId: null,
      projection: null,
    };
  }

  const result = await authFetchImpl(
    `/posts/${encodeURIComponent(target.postId)}/lifecycle`,
    { cache: "no-store" },
    setPage
  );

  if (!result?.response?.ok) {
    return {
      status: "error",
      reason: result?.data?.code || "LIFECYCLE_FETCH_FAILED",
      httpStatus: result?.response?.status || 0,
      postId: target.postId,
      projection: null,
    };
  }

  const projection = normalizeWorkCenterLifecycleProjection(result.data);
  if (!projection) {
    return {
      status: "unavailable",
      reason: UNAVAILABLE_REASONS.INVALID_RESPONSE,
      postId: target.postId,
      projection: null,
    };
  }

  return {
    status: "ready",
    reason: "",
    postId: target.postId,
    projection,
  };
}

export { UNAVAILABLE_REASONS as WORK_CENTER_LIFECYCLE_UNAVAILABLE_REASONS };
