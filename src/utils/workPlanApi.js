import { authFetch } from "./authFetch.js";
import {
  validateCanonicalActivityProjection,
  validateCanonicalWorkstreamProjection,
} from "./canonicalOperationalRead.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WORK_STATUSES = new Set([
  "READY_TO_START",
  "IN_PROGRESS",
  "NEEDS_ATTENTION",
  "COMPLETED",
]);
const ACTIVITY_STATUSES = new Set(["PLANNED", "IN_PROGRESS", "DONE", "CANCELLED"]);
const WORKSTREAM_STATES = new Set([
  "OPEN",
  "ACTIVE",
  "BLOCKED",
  "COMPLETED",
  "DEFERRED",
  "EXCLUDED",
]);

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

function text(value, maximum) {
  return typeof value === "string" && value.trim() && value.length <= maximum
    ? value
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

function unique(items) {
  return new Set(items).size === items.length;
}

function validateProfessionalSummary(value) {
  const keys = [
    "workItemCount",
    "completedCount",
    "remainingCount",
    "needsAttentionCount",
    "readyForCompletionReview",
  ];
  if (!exact(value, keys)) return null;
  const normalized = {
    workItemCount: integer(value.workItemCount, { zero: true }),
    completedCount: integer(value.completedCount, { zero: true }),
    remainingCount: integer(value.remainingCount, { zero: true }),
    needsAttentionCount: integer(value.needsAttentionCount, { zero: true }),
    readyForCompletionReview: boolean(value.readyForCompletionReview),
  };
  if (Object.values(normalized).some((item) => item == null)) return null;
  if (normalized.completedCount + normalized.remainingCount > normalized.workItemCount) {
    return null;
  }
  return normalized;
}

function validateUpdate(value, { customer = false } = {}) {
  const keys = customer
    ? ["activityId", "statement", "status", "recordedAt"]
    : ["version", "statement", "status", "customerVisible", "recordedAt"];
  if (!exact(value, keys)) return null;
  const normalized = {
    ...(customer
      ? { activityId: uuid(value.activityId) }
      : {
          version: integer(value.version),
          customerVisible: boolean(value.customerVisible),
        }),
    statement: text(value.statement, 5000),
    status: ACTIVITY_STATUSES.has(value.status) ? value.status : "",
    recordedAt: timestamp(value.recordedAt),
  };
  return Object.values(normalized).some((item) => item == null || item === "")
    ? null
    : normalized;
}

function validateProfessionalActivity(value) {
  const keys = [
    "id",
    "activityType",
    "statement",
    "status",
    "currentVersion",
    "performedAt",
    "updatedAt",
    "canStart",
    "canUpdate",
    "canComplete",
    "updates",
  ];
  if (!exact(value, keys) || !Array.isArray(value.updates) || value.updates.length > 200) {
    return null;
  }
  const updates = value.updates.map((item) => validateUpdate(item));
  const normalized = {
    id: uuid(value.id),
    activityType: text(value.activityType, 80),
    statement: text(value.statement, 5000),
    status: ACTIVITY_STATUSES.has(value.status) ? value.status : "",
    currentVersion: integer(value.currentVersion),
    performedAt: timestamp(value.performedAt, { nullable: true }),
    updatedAt: timestamp(value.updatedAt),
    canStart: boolean(value.canStart),
    canUpdate: boolean(value.canUpdate),
    canComplete: boolean(value.canComplete),
    updates,
  };
  if (
    !normalized.id ||
    !normalized.activityType ||
    !normalized.statement ||
    !normalized.status ||
    !normalized.currentVersion ||
    (value.performedAt != null && !normalized.performedAt) ||
    !normalized.updatedAt ||
    normalized.canStart == null ||
    normalized.canUpdate == null ||
    normalized.canComplete == null ||
    updates.some((item) => !item) ||
    !unique(updates.map((item) => item.version))
  ) return null;
  return normalized;
}

function validateProfessionalWorkstream(value) {
  const keys = [
    "id",
    "sequence",
    "title",
    "state",
    "status",
    "currentVersion",
    "approvedQuoteIds",
    "updatedAt",
    "canAddWorkItem",
    "canMarkComplete",
    "activities",
    "blockers",
  ];
  if (
    !exact(value, keys) ||
    !Array.isArray(value.approvedQuoteIds) ||
    !Array.isArray(value.activities) ||
    !Array.isArray(value.blockers) ||
    value.activities.length > 200 ||
    value.blockers.length > 100
  ) return null;
  const activities = value.activities.map(validateProfessionalActivity);
  const blockers = value.blockers.map((item) => {
    if (!exact(item, ["id", "statement", "status"])) return null;
    const normalized = {
      id: uuid(item.id),
      statement: text(item.statement, 5000),
      status: item.status === "NEEDS_ATTENTION" ? item.status : "",
    };
    return Object.values(normalized).every(Boolean) ? normalized : null;
  });
  const approvedQuoteIds = value.approvedQuoteIds.map(uuid);
  const normalized = {
    id: uuid(value.id),
    sequence: integer(value.sequence),
    title: text(value.title, 200),
    state: WORKSTREAM_STATES.has(value.state) ? value.state : "",
    status: WORK_STATUSES.has(value.status) ? value.status : "",
    currentVersion: integer(value.currentVersion),
    approvedQuoteIds,
    updatedAt: timestamp(value.updatedAt),
    canAddWorkItem: boolean(value.canAddWorkItem),
    canMarkComplete: boolean(value.canMarkComplete),
    activities,
    blockers,
  };
  if (
    Object.values(normalized).some((item) => item == null || item === "") ||
    approvedQuoteIds.some((item) => !item) ||
    !unique(approvedQuoteIds) ||
    activities.some((item) => !item) ||
    blockers.some((item) => !item) ||
    !unique(activities.map((item) => item.id)) ||
    !unique(blockers.map((item) => item.id))
  ) return null;
  return normalized;
}

export function validateProfessionalWorkPlan(value, { jobId } = {}) {
  const keys = [
    "contractVersion",
    "jobId",
    "requestId",
    "relationshipId",
    "approvedQuotes",
    "summary",
    "workstreams",
  ];
  if (
    !exact(value, keys) ||
    !Array.isArray(value.approvedQuotes) ||
    !Array.isArray(value.workstreams) ||
    value.approvedQuotes.length > 100 ||
    value.workstreams.length > 100
  ) return null;
  const expectedJobId = uuid(jobId);
  const approvedQuotes = value.approvedQuotes.map((item) => {
    if (!exact(item, ["id", "lineageType"])) return null;
    const normalized = { id: uuid(item.id), lineageType: text(item.lineageType, 80) };
    return normalized.id && normalized.lineageType ? normalized : null;
  });
  const workstreams = value.workstreams.map(validateProfessionalWorkstream);
  const normalized = {
    contractVersion: integer(value.contractVersion),
    jobId: uuid(value.jobId),
    requestId: integer(value.requestId),
    relationshipId: integer(value.relationshipId),
    approvedQuotes,
    summary: validateProfessionalSummary(value.summary),
    workstreams,
  };
  if (
    normalized.contractVersion !== 1 ||
    !expectedJobId ||
    normalized.jobId !== expectedJobId ||
    !normalized.requestId ||
    !normalized.relationshipId ||
    !normalized.summary ||
    approvedQuotes.some((item) => !item) ||
    workstreams.some((item) => !item) ||
    !unique(approvedQuotes.map((item) => item.id)) ||
    !unique(workstreams.map((item) => item.id))
  ) return null;
  return normalized;
}

function validateCustomerActivity(value) {
  const keys = ["id", "statement", "status", "performedAt", "updatedAt"];
  if (!exact(value, keys)) return null;
  const normalized = {
    id: uuid(value.id),
    statement: text(value.statement, 5000),
    status: ACTIVITY_STATUSES.has(value.status) ? value.status : "",
    performedAt: timestamp(value.performedAt, { nullable: true }),
    updatedAt: timestamp(value.updatedAt),
  };
  if (
    !normalized.id ||
    !normalized.statement ||
    !normalized.status ||
    (value.performedAt != null && !normalized.performedAt) ||
    !normalized.updatedAt
  ) return null;
  return normalized;
}

function validateCustomerWorkstream(value) {
  const keys = ["id", "title", "status", "activities", "updates"];
  if (
    !exact(value, keys) ||
    !Array.isArray(value.activities) ||
    !Array.isArray(value.updates) ||
    value.activities.length > 200 ||
    value.updates.length > 200
  ) return null;
  const activities = value.activities.map(validateCustomerActivity);
  const updates = value.updates.map((item) => validateUpdate(item, { customer: true }));
  const normalized = {
    id: uuid(value.id),
    title: text(value.title, 200),
    status: WORK_STATUSES.has(value.status) ? value.status : "",
    activities,
    updates,
  };
  if (
    !normalized.id ||
    !normalized.title ||
    !normalized.status ||
    activities.some((item) => !item) ||
    updates.some((item) => !item) ||
    !unique(activities.map((item) => item.id))
  ) return null;
  return normalized;
}

export function validateCustomerWorkPlan(value, { jobId } = {}) {
  const keys = [
    "contractVersion",
    "jobId",
    "requestId",
    "relationshipId",
    "summary",
    "workstreams",
  ];
  const summaryKeys = [
    "workAreaCount",
    "completedCount",
    "remainingCount",
    "readyForCompletionReview",
  ];
  if (
    !exact(value, keys) ||
    !exact(value.summary, summaryKeys) ||
    !Array.isArray(value.workstreams) ||
    value.workstreams.length > 100
  ) return null;
  const workstreams = value.workstreams.map(validateCustomerWorkstream);
  const normalized = {
    contractVersion: integer(value.contractVersion),
    jobId: uuid(value.jobId),
    requestId: integer(value.requestId),
    relationshipId: integer(value.relationshipId),
    summary: {
      workAreaCount: integer(value.summary.workAreaCount, { zero: true }),
      completedCount: integer(value.summary.completedCount, { zero: true }),
      remainingCount: integer(value.summary.remainingCount, { zero: true }),
      readyForCompletionReview: boolean(value.summary.readyForCompletionReview),
    },
    workstreams,
  };
  if (
    normalized.contractVersion !== 1 ||
    normalized.jobId !== uuid(jobId) ||
    !normalized.requestId ||
    !normalized.relationshipId ||
    Object.values(normalized.summary).some((item) => item == null) ||
    workstreams.some((item) => !item) ||
    !unique(workstreams.map((item) => item.id))
  ) return null;
  return normalized;
}

export function validateProfessionalWorkPlanSummary(value) {
  const keys = [
    "contractVersion",
    "jobCount",
    "workItemCount",
    "completedCount",
    "remainingCount",
    "needsAttentionCount",
    "jobs",
  ];
  const jobKeys = [
    "jobId",
    "requestId",
    "relationshipId",
    "title",
    "customerName",
    "workstreamCount",
    "workItemCount",
    "completedCount",
    "remainingCount",
    "needsAttentionCount",
    "readyForCompletionReview",
  ];
  if (!exact(value, keys) || !Array.isArray(value.jobs) || value.jobs.length > 200) {
    return null;
  }
  const jobs = value.jobs.map((item) => {
    if (!exact(item, jobKeys)) return null;
    const normalized = {
      jobId: uuid(item.jobId),
      requestId: integer(item.requestId),
      relationshipId: integer(item.relationshipId),
      title: text(item.title, 500),
      customerName: text(item.customerName, 500),
      workstreamCount: integer(item.workstreamCount, { zero: true }),
      workItemCount: integer(item.workItemCount, { zero: true }),
      completedCount: integer(item.completedCount, { zero: true }),
      remainingCount: integer(item.remainingCount, { zero: true }),
      needsAttentionCount: integer(item.needsAttentionCount, { zero: true }),
      readyForCompletionReview: boolean(item.readyForCompletionReview),
    };
    return Object.values(normalized).some((entry) => entry == null || entry === "")
      ? null
      : normalized;
  });
  const normalized = {
    contractVersion: integer(value.contractVersion),
    jobCount: integer(value.jobCount, { zero: true }),
    workItemCount: integer(value.workItemCount, { zero: true }),
    completedCount: integer(value.completedCount, { zero: true }),
    remainingCount: integer(value.remainingCount, { zero: true }),
    needsAttentionCount: integer(value.needsAttentionCount, { zero: true }),
    jobs,
  };
  if (
    normalized.contractVersion !== 1 ||
    Object.values(normalized).some((item) => item == null) ||
    jobs.some((item) => !item) ||
    normalized.jobCount !== jobs.length ||
    !unique(jobs.map((item) => item.jobId))
  ) return null;
  return normalized;
}

export class WorkPlanApiError extends Error {
  constructor({ status = 500, code = "WORK_PLAN_FAILED", message } = {}) {
    super(message || "The Work Plan is temporarily unavailable.");
    this.name = "WorkPlanApiError";
    this.status = status;
    this.code = code;
  }
}

function rejectInvalidCommand(code) {
  return Promise.reject(new WorkPlanApiError({ status: 400, code }));
}

function validateCommandActivity(value, { jobId, workstreamId, activityId = "" }) {
  const activity = validateCanonicalActivityProjection(value);
  if (
    !activity ||
    activity.jobId !== jobId ||
    activity.workstreamId !== workstreamId ||
    (activityId && activity.id !== activityId)
  ) return null;
  return activity;
}

function validateCommandWorkstream(value, { jobId, workstreamId }) {
  const workstream = validateCanonicalWorkstreamProjection(value);
  if (
    !workstream ||
    workstream.jobId !== jobId ||
    workstream.id !== workstreamId
  ) return null;
  return workstream;
}

async function read(endpoint, field, validate, setPage) {
  const { response, data } = await authFetch(
    endpoint,
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (!response.ok || data?.success !== true || !(field in data)) {
    throw new WorkPlanApiError({
      status: response.status,
      code: data?.code,
      message: data?.message,
    });
  }
  const normalized = validate(data[field]);
  if (!normalized) {
    throw new WorkPlanApiError({
      status: 502,
      code: "UNSAFE_WORK_PLAN_RESPONSE",
      message: "The Work Plan response was not safe to display.",
    });
  }
  return normalized;
}

export function fetchProfessionalWorkPlanSummary({ setPage } = {}) {
  return read(
    "/professional/work-plan",
    "workPlanSummary",
    validateProfessionalWorkPlanSummary,
    setPage
  );
}

export function fetchProfessionalJobWorkPlan({ jobId, setPage } = {}) {
  const canonicalJobId = uuid(jobId);
  if (!canonicalJobId) {
    return Promise.reject(new WorkPlanApiError({ status: 400, code: "INVALID_WORK_PLAN_JOB_ID" }));
  }
  return read(
    `/professional/jobs/${encodeURIComponent(canonicalJobId)}/work-plan`,
    "workPlan",
    (value) => validateProfessionalWorkPlan(value, { jobId: canonicalJobId }),
    setPage
  );
}

export function fetchCustomerJobWorkPlan({ jobId, setPage } = {}) {
  const canonicalJobId = uuid(jobId);
  if (!canonicalJobId) {
    return Promise.reject(new WorkPlanApiError({ status: 400, code: "INVALID_WORK_PLAN_JOB_ID" }));
  }
  return read(
    `/customer/jobs/${encodeURIComponent(canonicalJobId)}/work-plan`,
    "workPlan",
    (value) => validateCustomerWorkPlan(value, { jobId: canonicalJobId }),
    setPage
  );
}

export function createWorkPlanIdempotencyKey(action, cryptoProvider = globalThis.crypto) {
  const suffix = cryptoProvider?.randomUUID?.();
  if (!suffix || !text(action, 80)) {
    throw new WorkPlanApiError({ status: 500, code: "WORK_PLAN_IDEMPOTENCY_UNAVAILABLE" });
  }
  return `work-plan-${action}-${suffix}`;
}

async function command({ endpoint, body, idempotencyKey, field, validate, setPage }) {
  if (!text(idempotencyKey, 255)) {
    throw new WorkPlanApiError({ status: 400, code: "WORK_PLAN_IDEMPOTENCY_REQUIRED" });
  }
  const { response, data } = await authFetch(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    },
    setPage
  );
  if (!response.ok || data?.success !== true || !(field in data)) {
    throw new WorkPlanApiError({
      status: response.status,
      code: data?.code,
      message: data?.message,
    });
  }
  const normalized = validate(data[field]);
  if (!normalized) {
    throw new WorkPlanApiError({ status: 502, code: "UNSAFE_WORK_PLAN_COMMAND_RESPONSE" });
  }
  return normalized;
}

export function createWorkItem({
  jobId,
  workstreamId,
  statement,
  customerVisible = false,
  idempotencyKey,
  setPage,
} = {}) {
  const canonicalJobId = uuid(jobId);
  const canonicalWorkstreamId = uuid(workstreamId);
  const canonicalStatement = text(statement, 5000);
  if (
    !canonicalJobId ||
    !canonicalWorkstreamId ||
    !canonicalStatement ||
    typeof customerVisible !== "boolean"
  ) return rejectInvalidCommand("INVALID_WORK_ITEM_CREATE");
  return command({
    endpoint: `/jobs/${canonicalJobId}/workstreams/${canonicalWorkstreamId}/activities`,
    body: {
      activityType: "WORK_ITEM",
      statement: canonicalStatement,
      customerVisible,
    },
    idempotencyKey,
    field: "activity",
    validate: (value) => validateCommandActivity(value, {
      jobId: canonicalJobId,
      workstreamId: canonicalWorkstreamId,
    }),
    setPage,
  });
}

export function updateWorkItem({
  jobId,
  workstreamId,
  activityId,
  expectedVersion,
  statement,
  customerVisible,
  idempotencyKey,
  setPage,
} = {}) {
  const canonicalJobId = uuid(jobId);
  const canonicalWorkstreamId = uuid(workstreamId);
  const canonicalActivityId = uuid(activityId);
  const canonicalVersion = integer(expectedVersion);
  const canonicalStatement = text(statement, 5000);
  if (
    !canonicalJobId ||
    !canonicalWorkstreamId ||
    !canonicalActivityId ||
    !canonicalVersion ||
    !canonicalStatement ||
    typeof customerVisible !== "boolean"
  ) return rejectInvalidCommand("INVALID_WORK_ITEM_UPDATE");
  return command({
    endpoint: `/jobs/${canonicalJobId}/workstreams/${canonicalWorkstreamId}/activities/${canonicalActivityId}/update`,
    body: { expectedVersion: canonicalVersion, statement: canonicalStatement, customerVisible },
    idempotencyKey,
    field: "activity",
    validate: (value) => validateCommandActivity(value, {
      jobId: canonicalJobId,
      workstreamId: canonicalWorkstreamId,
      activityId: canonicalActivityId,
    }),
    setPage,
  });
}

export function progressWorkItem({
  jobId,
  workstreamId,
  activityId,
  expectedVersion,
  targetStatus,
  idempotencyKey,
  setPage,
} = {}) {
  const canonicalJobId = uuid(jobId);
  const canonicalWorkstreamId = uuid(workstreamId);
  const canonicalActivityId = uuid(activityId);
  const canonicalVersion = integer(expectedVersion);
  if (
    !canonicalJobId ||
    !canonicalWorkstreamId ||
    !canonicalActivityId ||
    !canonicalVersion ||
    !new Set(["IN_PROGRESS", "DONE"]).has(targetStatus)
  ) return rejectInvalidCommand("INVALID_WORK_ITEM_PROGRESS");
  return command({
    endpoint: `/jobs/${canonicalJobId}/workstreams/${canonicalWorkstreamId}/activities/${canonicalActivityId}/progress`,
    body: { expectedVersion: canonicalVersion, targetStatus },
    idempotencyKey,
    field: "activity",
    validate: (value) => validateCommandActivity(value, {
      jobId: canonicalJobId,
      workstreamId: canonicalWorkstreamId,
      activityId: canonicalActivityId,
    }),
    setPage,
  });
}

export function completeWorkArea({
  jobId,
  workstreamId,
  expectedVersion,
  idempotencyKey,
  setPage,
} = {}) {
  const canonicalJobId = uuid(jobId);
  const canonicalWorkstreamId = uuid(workstreamId);
  const canonicalVersion = integer(expectedVersion);
  if (!canonicalJobId || !canonicalWorkstreamId || !canonicalVersion) {
    return rejectInvalidCommand("INVALID_WORK_AREA_COMPLETION");
  }
  return command({
    endpoint: `/jobs/${canonicalJobId}/workstreams/${canonicalWorkstreamId}/completion`,
    body: { expectedVersion: canonicalVersion },
    idempotencyKey,
    field: "workstream",
    validate: (value) => validateCommandWorkstream(value, {
      jobId: canonicalJobId,
      workstreamId: canonicalWorkstreamId,
    }),
    setPage,
  });
}
