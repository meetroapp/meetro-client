import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exact(value, keys) {
  return plain(value) &&
    Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key));
}

function uuid(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

function integer(value, { zero = false } = {}) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= (zero ? 0 : 1) ? parsed : null;
}

function text(value, maximum = 500) {
  return typeof value === "string" && value.trim() && value.length <= maximum
    ? value.trim()
    : "";
}

function timestamp(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function boolean(value) {
  return typeof value === "boolean" ? value : null;
}

function validateNextAction(value) {
  if (!exact(value, ["code", "label"])) return null;
  const code = text(value.code, 100);
  const label = text(value.label, 200);
  return code === "READY_TO_INVOICE" && label ? { code, label } : null;
}

function validateCompletionSummary(value) {
  if (!exact(value, ["workstreamCount", "workItemCount", "customerUpdateCount"])) {
    return null;
  }
  const summary = {
    workstreamCount: integer(value.workstreamCount, { zero: true }),
    workItemCount: integer(value.workItemCount, { zero: true }),
    customerUpdateCount: integer(value.customerUpdateCount, { zero: true }),
  };
  return Object.values(summary).some((item) => item == null) ? null : summary;
}

export function validateJobCompletionReview(value, { jobId } = {}) {
  const keys = [
    "contractVersion", "jobId", "requestId", "relationshipId", "currentVersion",
    "state", "eligible", "canComplete", "reasons", "work", "outstanding",
    "customerUpdates", "completedAt",
  ];
  if (!exact(value, keys) || !Array.isArray(value.reasons) || value.reasons.length > 20) {
    return null;
  }
  const countKeys = ["workstreamCount", "completedWorkstreamCount", "workItemCount", "completedWorkItemCount"];
  const outstandingKeys = ["workstreams", "workItems", "obligations", "findings"];
  if (!exact(value.work, countKeys) || !exact(value.outstanding, outstandingKeys) ||
      !exact(value.customerUpdates, ["count", "status"])) return null;
  const normalized = {
    contractVersion: integer(value.contractVersion),
    jobId: uuid(value.jobId),
    requestId: integer(value.requestId),
    relationshipId: integer(value.relationshipId),
    currentVersion: integer(value.currentVersion, { zero: true }),
    state: new Set(["ACTIVE", "COMPLETED"]).has(value.state) ? value.state : "",
    eligible: boolean(value.eligible),
    canComplete: boolean(value.canComplete),
    reasons: value.reasons.map((reason) => text(reason, 120)),
    work: Object.fromEntries(countKeys.map((key) => [key, integer(value.work[key], { zero: true })])),
    outstanding: Object.fromEntries(outstandingKeys.map((key) => [key, integer(value.outstanding[key], { zero: true })])),
    customerUpdates: {
      count: integer(value.customerUpdates.count, { zero: true }),
      status: value.customerUpdates.status === "UP_TO_DATE" ? "UP_TO_DATE" : "",
    },
    completedAt: timestamp(value.completedAt, { nullable: true }),
  };
  if (
    normalized.contractVersion !== 1 ||
    normalized.jobId !== uuid(jobId) ||
    !normalized.requestId ||
    !normalized.relationshipId ||
    normalized.currentVersion == null ||
    !normalized.state ||
    normalized.eligible == null ||
    normalized.canComplete == null ||
    normalized.reasons.some((reason) => !reason) ||
    Object.values(normalized.work).some((item) => item == null) ||
    Object.values(normalized.outstanding).some((item) => item == null) ||
    normalized.customerUpdates.count == null ||
    !normalized.customerUpdates.status ||
    (value.completedAt != null && !normalized.completedAt)
  ) return null;
  if (normalized.state === "COMPLETED" && (!normalized.completedAt || normalized.canComplete)) return null;
  return normalized;
}

export function validateJobCompletion(value, { jobId } = {}) {
  const keys = [
    "contractVersion", "id", "jobId", "requestId", "relationshipId",
    "currentVersion", "status", "completedAt", "summary", "nextAction",
  ];
  if (!exact(value, keys)) return null;
  const normalized = {
    contractVersion: integer(value.contractVersion),
    id: uuid(value.id),
    jobId: uuid(value.jobId),
    requestId: integer(value.requestId),
    relationshipId: integer(value.relationshipId),
    currentVersion: integer(value.currentVersion),
    status: value.status === "COMPLETED" ? "COMPLETED" : "",
    completedAt: timestamp(value.completedAt),
    summary: validateCompletionSummary(value.summary),
    nextAction: validateNextAction(value.nextAction),
  };
  return normalized.contractVersion === 1 && normalized.id &&
    normalized.jobId === uuid(jobId) && normalized.requestId &&
    normalized.relationshipId && normalized.currentVersion === 1 &&
    normalized.status && normalized.completedAt && normalized.summary &&
    normalized.nextAction ? normalized : null;
}

function validateApprovedQuote(value) {
  if (value == null) return null;
  if (!exact(value, ["totalMinor", "currency"])) return false;
  const totalMinor = integer(value.totalMinor, { zero: true });
  const currency = text(value.currency, 3);
  return totalMinor != null && /^[A-Z]{3}$/.test(currency)
    ? { totalMinor, currency }
    : false;
}

export function validateJobHistorySummary(value) {
  const keys = [
    "contractVersion", "jobId", "requestId", "relationshipId", "conversationId",
    "customerName", "professionalName", "serviceTitle", "status", "completedAt",
    "approvedQuote", "completionSummary", "nextAction",
  ];
  if (!exact(value, keys)) return null;
  const approvedQuote = validateApprovedQuote(value.approvedQuote);
  if (approvedQuote === false) return null;
  const normalized = {
    contractVersion: integer(value.contractVersion),
    jobId: uuid(value.jobId),
    requestId: integer(value.requestId),
    relationshipId: integer(value.relationshipId),
    conversationId: value.conversationId == null ? null : integer(value.conversationId),
    customerName: text(value.customerName, 500),
    professionalName: text(value.professionalName, 500),
    serviceTitle: text(value.serviceTitle, 500),
    status: value.status === "COMPLETED" ? "COMPLETED" : "",
    completedAt: timestamp(value.completedAt),
    approvedQuote,
    completionSummary: validateCompletionSummary(value.completionSummary),
    nextAction: validateNextAction(value.nextAction),
  };
  return normalized.contractVersion === 1 && normalized.jobId && normalized.requestId &&
    normalized.relationshipId && normalized.customerName && normalized.professionalName &&
    normalized.serviceTitle && normalized.status && normalized.completedAt &&
    normalized.completionSummary && normalized.nextAction ? normalized : null;
}

export function validateProfessionalJobHistory(value) {
  if (!exact(value, ["contractVersion", "totalCount", "jobs", "pagination"]) ||
      !Array.isArray(value.jobs) || value.jobs.length > 50 ||
      !exact(value.pagination, ["limit", "nextCursor"])) return null;
  const jobs = value.jobs.map(validateJobHistorySummary);
  const normalized = {
    contractVersion: integer(value.contractVersion),
    totalCount: integer(value.totalCount, { zero: true }),
    jobs,
    pagination: {
      limit: integer(value.pagination.limit),
      nextCursor: value.pagination.nextCursor == null
        ? null
        : text(value.pagination.nextCursor, 1000),
    },
  };
  if (normalized.contractVersion !== 1 || normalized.totalCount == null ||
      jobs.some((job) => !job) || normalized.pagination.limit == null ||
      (value.pagination.nextCursor != null && !normalized.pagination.nextCursor) ||
      new Set(jobs.map((job) => job.jobId)).size !== jobs.length) return null;
  return normalized;
}

export function validateJobHistoryDetail(value, { jobId, audience } = {}) {
  const summaryKeys = [
    "contractVersion", "jobId", "requestId", "relationshipId", "conversationId",
    "customerName", "professionalName", "serviceTitle", "status", "completedAt",
    "approvedQuote", "completionSummary", "nextAction",
  ];
  const keys = [...summaryKeys, "audience", "originalRequest", "preservedRecords", "actions"];
  if (!exact(value, keys)) return null;
  const summary = validateJobHistorySummary(Object.fromEntries(summaryKeys.map((key) => [key, value[key]])));
  const originalRequest = value.originalRequest == null ? null : (() => {
    if (!exact(value.originalRequest, ["concern", "reportedAt"])) return false;
    const concern = text(value.originalRequest.concern, 5000);
    const reportedAt = timestamp(value.originalRequest.reportedAt);
    return concern && reportedAt ? { concern, reportedAt } : false;
  })();
  const preservedKeys = ["evaluation", "findings", "recommendations", "approvedQuotes", "visits", "workPlan"];
  const actionKeys = audience === "customer" ? ["canMessageProfessional"] : ["canViewJob"];
  if (!summary || summary.jobId !== uuid(jobId) || value.audience !== audience ||
      originalRequest === false || !exact(value.preservedRecords, preservedKeys) ||
      Object.values(value.preservedRecords).some((item) => typeof item !== "boolean") ||
      !exact(value.actions, actionKeys) || typeof value.actions[actionKeys[0]] !== "boolean") return null;
  return { ...summary, audience, originalRequest, preservedRecords: value.preservedRecords, actions: value.actions };
}

export class JobCompletionApiError extends Error {
  constructor({ status = 500, code = "JOB_COMPLETION_FAILED", message } = {}) {
    super(message || "Completion details are temporarily unavailable.");
    this.name = "JobCompletionApiError";
    this.status = status;
    this.code = code;
  }
}

async function read(endpoint, field, validator, setPage, authFetchImpl = authFetch) {
  const { response, data } = await authFetchImpl(endpoint, { method: "GET", cache: "no-store" }, setPage);
  if (!response.ok || data?.success !== true || !(field in data)) {
    throw new JobCompletionApiError({ status: response.status, code: data?.code, message: data?.message });
  }
  const normalized = validator(data[field]);
  if (!normalized) throw new JobCompletionApiError({ status: 502, code: "UNSAFE_JOB_COMPLETION_RESPONSE" });
  return normalized;
}

export function fetchJobCompletionReview({ jobId, setPage, authFetchImpl = authFetch } = {}) {
  const canonicalJobId = uuid(jobId);
  if (!canonicalJobId) return Promise.reject(new JobCompletionApiError({ status: 400, code: "INVALID_JOB_ID" }));
  return read(
    `/professional/jobs/${canonicalJobId}/completion-review`,
    "completionReview",
    (value) => validateJobCompletionReview(value, { jobId: canonicalJobId }),
    setPage,
    authFetchImpl
  );
}

export function completeCanonicalJob({ jobId, expectedVersion, idempotencyKey, setPage, authFetchImpl = authFetch } = {}) {
  const canonicalJobId = uuid(jobId);
  const version = integer(expectedVersion, { zero: true });
  const key = text(idempotencyKey, 200);
  if (!canonicalJobId || version == null || !key) {
    return Promise.reject(new JobCompletionApiError({ status: 400, code: "INVALID_JOB_COMPLETION_COMMAND" }));
  }
  return authFetchImpl(
    `/professional/jobs/${canonicalJobId}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify({ expectedVersion: version }),
    },
    setPage
  ).then(({ response, data }) => {
    if (!response.ok || data?.success !== true || !("completion" in data)) {
      throw new JobCompletionApiError({ status: response.status, code: data?.code, message: data?.message });
    }
    const completion = validateJobCompletion(data.completion, { jobId: canonicalJobId });
    if (!completion) throw new JobCompletionApiError({ status: 502, code: "UNSAFE_JOB_COMPLETION_RESPONSE" });
    return completion;
  });
}

export function createJobCompletionIdempotencyKey(cryptoProvider = globalThis.crypto) {
  const suffix = cryptoProvider?.randomUUID?.();
  if (!suffix) throw new JobCompletionApiError({ status: 500, code: "JOB_COMPLETION_IDEMPOTENCY_UNAVAILABLE" });
  return `job-complete-${suffix}`;
}

export function fetchProfessionalJobHistory({ limit = 20, cursor = "", setPage, authFetchImpl = authFetch } = {}) {
  const boundedLimit = integer(limit);
  if (!boundedLimit || boundedLimit > 50) return Promise.reject(new JobCompletionApiError({ status: 400, code: "INVALID_JOB_HISTORY_PAGE" }));
  const query = new URLSearchParams({ limit: String(boundedLimit) });
  if (cursor) query.set("cursor", cursor);
  return read(`/professional/jobs/history?${query}`, "jobHistory", validateProfessionalJobHistory, setPage, authFetchImpl);
}

export function fetchProfessionalJobHistoryDetail({ jobId, setPage, authFetchImpl = authFetch } = {}) {
  const canonicalJobId = uuid(jobId);
  if (!canonicalJobId) return Promise.reject(new JobCompletionApiError({ status: 400, code: "INVALID_JOB_ID" }));
  return read(
    `/professional/jobs/${canonicalJobId}/history`,
    "jobHistory",
    (value) => validateJobHistoryDetail(value, { jobId: canonicalJobId, audience: "professional" }),
    setPage,
    authFetchImpl
  );
}

export function fetchCustomerJobHistory({ jobId, setPage, authFetchImpl = authFetch } = {}) {
  const canonicalJobId = uuid(jobId);
  if (!canonicalJobId) return Promise.reject(new JobCompletionApiError({ status: 400, code: "INVALID_JOB_ID" }));
  return read(
    `/customer/jobs/${canonicalJobId}/history`,
    "jobHistory",
    (value) => validateJobHistoryDetail(value, { jobId: canonicalJobId, audience: "customer" }),
    setPage,
    authFetchImpl
  );
}
