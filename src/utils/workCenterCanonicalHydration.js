import API_URL, { STAGING_API_URL } from "../api.js";
import { authFetch } from "./authFetch.js";
import {
  normalizeCanonicalConversationDetail,
  normalizeCanonicalConversationId,
} from "./canonicalConversationMessaging.js";
import { fetchCanonicalConversations } from "./requestCommunication.js";
import { fetchCanonicalLiveJobProjection } from "./canonicalLiveJobProjection.js";

export const CANONICAL_WORK_CENTER_AUTHORITY = "CANONICAL_BACKEND_READ";

function normalizeApiUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function firstPositiveInteger(...values) {
  for (const value of values) {
    const normalized = normalizeCanonicalConversationId(value);
    if (normalized) return normalized;
  }
  return null;
}

function firstIdentifier(...values) {
  for (const value of values) {
    const positiveInteger = normalizeCanonicalConversationId(value);
    if (positiveInteger) return positiveInteger;
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return null;
}

function firstText(...values) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function getHomeownerDisplayName(participants = {}) {
  const homeowner = participants?.homeowner;
  if (!homeowner || typeof homeowner !== "object") return "";
  return firstText(homeowner.displayName, homeowner.name);
}

function collectRequestIds(record = {}) {
  const sources = [
    record,
    record.request,
    record.schedule,
    record.quote,
    record.active,
    record.history,
  ];
  if (Array.isArray(record.sourceRecords)) {
    record.sourceRecords.forEach((source) => sources.push(source?.record));
  }

  return new Set(
    sources
      .filter((source) => source && typeof source === "object")
      .map((source) =>
        firstPositiveInteger(
          source.postId,
          source.post_id,
          source.requestId,
          source.request_id,
          source.jobRequestId,
          source.job_request_id,
          source.projectId
        )
      )
      .filter(Boolean)
  );
}

function canonicalCompleteness(entry = {}) {
  return [
    entry.lifecycleContractVersion,
    entry.jobId,
    entry.relationshipId,
    entry.conversationId,
    entry.customer,
    entry.title,
  ].filter(Boolean).length;
}

export function isCanonicalWorkCenterHydrationEnabled(apiUrl = API_URL) {
  return normalizeApiUrl(apiUrl) === normalizeApiUrl(STAGING_API_URL);
}

export function isCanonicalWorkCenterEntry(record = {}) {
  return (
    record?.source === CANONICAL_WORK_CENTER_AUTHORITY &&
    record?.readOnly === true &&
    firstPositiveInteger(record.postId, record.requestId) !== null
  );
}

export function normalizeCanonicalWorkCenterEntry({
  summary = {},
  detail = {},
} = {}) {
  const conversationId = firstPositiveInteger(
    detail.conversationId,
    summary.conversationId,
    summary.conversation_id
  );
  const summaryConversationId = firstPositiveInteger(
    summary.conversationId,
    summary.conversation_id
  );
  const requestId = firstPositiveInteger(
    detail.relationship?.requestId,
    detail.relationship?.request_id,
    summary.requestId,
    summary.request_id
  );
  const relationshipId = firstPositiveInteger(
    detail.relationship?.id,
    detail.relationship?.relationshipId,
    summary.relationshipId
  );

  if (
    detail.type !== "request" ||
    detail.permissions?.canRead !== true ||
    !conversationId ||
    !summaryConversationId ||
    conversationId !== summaryConversationId ||
    !requestId ||
    !relationshipId
  ) {
    return null;
  }

  const lifecycleContractVersion = firstPositiveInteger(
    detail.lifecycleContractVersion,
    detail.relationship?.lifecycleContractVersion,
    detail.relationship?.lifecycle_contract_version,
    summary.lifecycleContractVersion,
    summary.lifecycle_contract_version
  );
  const jobId = firstIdentifier(
    detail.jobId,
    detail.job?.id,
    detail.relationship?.jobId,
    detail.relationship?.job_id,
    summary.jobId,
    summary.job_id
  );

  if (lifecycleContractVersion && lifecycleContractVersion !== 2) {
    return null;
  }

  return {
    id: `canonical-request-${requestId}`,
    source: CANONICAL_WORK_CENTER_AUTHORITY,
    authoritySource: CANONICAL_WORK_CENTER_AUTHORITY,
    readOnly: true,
    commandAuthority: [],
    lifecycleVerified: lifecycleContractVersion === 2,
    lifecycleContractVersion,
    postId: requestId,
    requestId,
    jobId,
    relationshipId,
    conversationId,
    customer: firstText(
      getHomeownerDisplayName(detail.participants),
      summary.customerName,
      summary.homeownerName,
      "Customer"
    ),
    title: firstText(
      detail.relationship?.title,
      summary.project_title,
      summary.source?.title,
      "Professional request"
    ),
    address: "",
    canonicalDiscovery: {
      sourceEndpoint: "/conversations?perspective=professional",
      detailEndpoint: `/conversations/${conversationId}`,
      relationshipAuthorized: true,
    },
  };
}

export function mergeCanonicalWorkCenterEntries(
  legacyJobs = [],
  canonicalEntries = []
) {
  const canonicalByRequestId = new Map();

  canonicalEntries
    .filter(isCanonicalWorkCenterEntry)
    .forEach((entry) => {
      const requestId = firstPositiveInteger(entry.postId, entry.requestId);
      const current = canonicalByRequestId.get(requestId);
      if (!current || canonicalCompleteness(entry) > canonicalCompleteness(current)) {
        canonicalByRequestId.set(requestId, entry);
      }
    });

  const merged = [];
  (Array.isArray(legacyJobs) ? legacyJobs : []).forEach((legacyJob) => {
    const matchingRequestId = Array.from(collectRequestIds(legacyJob)).find((requestId) =>
      canonicalByRequestId.has(requestId)
    );

    if (!matchingRequestId) {
      merged.push(legacyJob);
      return;
    }

    const canonical = canonicalByRequestId.get(matchingRequestId);
    canonicalByRequestId.delete(matchingRequestId);
    merged.push({
      ...canonical,
      compatibilityProjection: {
        schedule: legacyJob.schedule || null,
        quote: legacyJob.quote || null,
        active: legacyJob.active || null,
        request: legacyJob.request || null,
        history: legacyJob.history || null,
        sourceRecords: Array.isArray(legacyJob.sourceRecords)
          ? legacyJob.sourceRecords
          : [],
      },
      sourceRecords: [
        ...(Array.isArray(legacyJob.sourceRecords) ? legacyJob.sourceRecords : []),
        { type: "canonical", record: canonical },
      ],
    });
  });

  canonicalByRequestId.forEach((entry) => merged.push(entry));
  return merged;
}

export async function fetchCanonicalWorkCenterEntries({
  apiUrl = API_URL,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  if (!isCanonicalWorkCenterHydrationEnabled(apiUrl)) {
    return {
      status: "disabled",
      reason: "UNSUPPORTED_API_ENVIRONMENT",
      entries: [],
    };
  }

  const conversationsResult = await fetchCanonicalConversations("business", {
    authFetchImpl,
    setPage,
  });
  if (!conversationsResult.ok) {
    return {
      status: "error",
      reason: conversationsResult.code || "CONVERSATIONS_FETCH_FAILED",
      entries: [],
    };
  }

  const requestConversations = conversationsResult.conversations.filter(
    (conversation) =>
      conversation.sourceType === "request" && conversation.archived !== true
  );
  const detailResults = await Promise.all(
    requestConversations.map(async (summary) => {
      const conversationId = firstPositiveInteger(summary.conversationId);
      if (!conversationId) return null;

      try {
        const result = await authFetchImpl(
          `/conversations/${encodeURIComponent(conversationId)}`,
          { cache: "no-store" },
          setPage
        );
        if (!result?.response?.ok) return null;
        const detail = normalizeCanonicalConversationDetail(
          result.data,
          conversationId
        );
        const entry = detail
          ? normalizeCanonicalWorkCenterEntry({ summary, detail })
          : null;
        if (!entry?.jobId) return entry;
        let liveJobResult;
        try {
          liveJobResult = await fetchCanonicalLiveJobProjection({
            jobId: entry.jobId,
            setPage,
            authFetchImpl,
          });
        } catch {
          liveJobResult = {
            status: "error",
            reason: "LIVE_JOB_NETWORK_ERROR",
            projection: null,
          };
        }
        return {
          ...entry,
          liveJob:
            liveJobResult.status === "ready" ? liveJobResult.projection : null,
          liveJobStatus: liveJobResult.status,
          liveJobUnavailableReason: liveJobResult.reason,
        };
      } catch {
        return null;
      }
    })
  );

  return {
    status: "ready",
    reason: "",
    entries: mergeCanonicalWorkCenterEntries([], detailResults.filter(Boolean)),
  };
}
