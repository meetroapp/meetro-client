import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const EXECUTION_STATES = new Set(["ACTIVE", "SUPERSEDED", "CLOSED"]);
const EXECUTION_ACTIONS = new Set([
  "BIND_WORKSTREAM",
  "CLASSIFY_ACTIVITY",
  "RECONCILE_LEGACY",
  "COMPLETE_WORK",
  "SUPERSEDE",
]);
const WORKSTREAM_STATES = new Set([
  "OPEN",
  "ACTIVE",
  "BLOCKED",
  "COMPLETED",
  "DEFERRED",
  "EXCLUDED",
]);
const ACTIVITY_STATUSES = new Set(["PLANNED", "IN_PROGRESS", "DONE", "CANCELLED"]);
const ACTIVITY_CLASSIFICATIONS = new Set(["EXECUTION", "NON_EXECUTION"]);
const APPROVAL_SOURCES = new Set([
  "MEETRO_CUSTOMER",
  "EXTERNAL_EVIDENCE",
]);

export class ApprovedWorkExecutionApiError extends Error {
  constructor({
    status = 500,
    code = "APPROVED_WORK_EXECUTION_FAILED",
    message = "Complete Work is temporarily unavailable.",
  } = {}) {
    super(message);
    this.name = "ApprovedWorkExecutionApiError";
    this.status = status;
    this.code = code || "APPROVED_WORK_EXECUTION_FAILED";
  }
}

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

function uuid(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function integer(value, { zero = false } = {}) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= (zero ? 0 : 1) ? parsed : null;
}

function text(value, maximum, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= maximum ? normalized : null;
}

function timestamp(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function unique(values) {
  return new Set(values).size === values.length;
}

function normalizeSource(value) {
  if (!plain(value)) return null;

  const hasQuoteApprovalId = Object.hasOwn(value, "quoteApprovalId");
  const hasApprovalSource = Object.hasOwn(value, "approvalSource");

  const keys = [
    "quoteId",
    "issuedQuoteVersion",
    "approvedCustomerDecisionId",
    ...(hasQuoteApprovalId ? ["quoteApprovalId"] : []),
    ...(hasApprovalSource ? ["approvalSource"] : []),
    "customerParticipantId",
    "currency",
  ];

  if (!exact(value, keys)) return null;

  const quoteId = uuid(value.quoteId);
  const issuedQuoteVersion = integer(value.issuedQuoteVersion);
  const approvedCustomerDecisionId = uuid(
    value.approvedCustomerDecisionId,
    { nullable: true }
  );
  const quoteApprovalId = hasQuoteApprovalId
    ? uuid(value.quoteApprovalId, { nullable: true })
    : null;
  const approvalSource = hasApprovalSource
    ? value.approvalSource == null
      ? null
      : APPROVAL_SOURCES.has(value.approvalSource)
        ? value.approvalSource
        : undefined
    : null;
  const customerParticipantId = uuid(
    value.customerParticipantId,
    { nullable: true }
  );
  const normalizedCurrency =
    typeof value.currency === "string" && /^[A-Z]{3}$/.test(value.currency)
      ? value.currency
      : null;

  const external = approvalSource === "EXTERNAL_EVIDENCE";
  const commonMeetro = approvalSource === "MEETRO_CUSTOMER";
  const legacyMeetro = approvalSource == null;

  if (
    !quoteId ||
    !issuedQuoteVersion ||
    approvalSource === undefined ||
    !normalizedCurrency ||
    (
      value.approvedCustomerDecisionId != null &&
      !approvedCustomerDecisionId
    ) ||
    (
      hasQuoteApprovalId &&
      value.quoteApprovalId != null &&
      !quoteApprovalId
    ) ||
    (
      value.customerParticipantId != null &&
      !customerParticipantId
    ) ||
    (
      external &&
      (
        !quoteApprovalId ||
        approvedCustomerDecisionId ||
        customerParticipantId
      )
    ) ||
    (
      commonMeetro &&
      (
        !quoteApprovalId ||
        !approvedCustomerDecisionId ||
        !customerParticipantId
      )
    ) ||
    (
      legacyMeetro &&
      (
        quoteApprovalId ||
        !approvedCustomerDecisionId ||
        !customerParticipantId
      )
    )
  ) {
    return null;
  }

  return Object.freeze({
    quoteId,
    issuedQuoteVersion,
    approvedCustomerDecisionId,
    ...(hasQuoteApprovalId ? { quoteApprovalId } : {}),
    ...(hasApprovalSource ? { approvalSource } : {}),
    customerParticipantId,
    currency: normalizedCurrency,
  });
}

function normalizeExecutionBase(value, { jobId } = {}) {
  if (!exact(value, [
    "contractVersion",
    "id",
    "jobId",
    "relationshipId",
    "source",
    "currentVersion",
    "state",
    "successorExecutionId",
    "createdAt",
    "versionCreatedAt",
    "safeNextActions",
  ]) || !Array.isArray(value.safeNextActions)) return null;
  const safeNextActions = value.safeNextActions.map((action) =>
    EXECUTION_ACTIONS.has(action) ? action : null
  );
  const normalized = {
    contractVersion: integer(value.contractVersion),
    id: uuid(value.id),
    jobId: uuid(value.jobId),
    relationshipId:
      value.relationshipId == null ? null : integer(value.relationshipId),
    source: normalizeSource(value.source),
    currentVersion: integer(value.currentVersion),
    state: EXECUTION_STATES.has(value.state) ? value.state : null,
    successorExecutionId: uuid(value.successorExecutionId, { nullable: true }),
    createdAt: timestamp(value.createdAt),
    versionCreatedAt: timestamp(value.versionCreatedAt),
    safeNextActions,
  };
  if (
    normalized.contractVersion !== 1 ||
    !normalized.id ||
    !normalized.jobId ||
    (jobId && normalized.jobId !== uuid(jobId)) ||
    (value.relationshipId != null && !normalized.relationshipId) ||
    !normalized.source ||
    (
      normalized.source.approvalSource === "EXTERNAL_EVIDENCE"
        ? normalized.relationshipId != null
        : !normalized.relationshipId
    ) ||
    !normalized.currentVersion ||
    !normalized.state ||
    (value.successorExecutionId != null && !normalized.successorExecutionId) ||
    !normalized.createdAt ||
    !normalized.versionCreatedAt ||
    safeNextActions.some((action) => !action) ||
    !unique(safeNextActions)
  ) return null;
  return normalized;
}

function normalizeBinding(value, expected) {
  if (!exact(value, [
    "id",
    "executionId",
    "workstreamId",
    "jobId",
    "workstream",
    "createdAt",
  ]) || !exact(value.workstream, ["sequence", "title", "state", "currentVersion"])) {
    return null;
  }
  const normalized = {
    id: uuid(value.id),
    executionId: uuid(value.executionId),
    workstreamId: uuid(value.workstreamId),
    jobId: uuid(value.jobId),
    workstream: {
      sequence: integer(value.workstream.sequence),
      title: text(value.workstream.title, 200),
      state: WORKSTREAM_STATES.has(value.workstream.state) ? value.workstream.state : null,
      currentVersion: integer(value.workstream.currentVersion),
    },
    createdAt: timestamp(value.createdAt),
  };
  if (
    !normalized.id ||
    normalized.executionId !== expected.executionId ||
    !normalized.workstreamId ||
    normalized.jobId !== expected.jobId ||
    Object.values(normalized.workstream).some((item) => item == null) ||
    !normalized.createdAt
  ) return null;
  return normalized;
}

function normalizeClassification(value, expected) {
  if (!exact(value, [
    "activityId",
    "workstreamId",
    "jobId",
    "classification",
    "executionId",
    "scopeBasis",
    "sourceScopeItemId",
    "classifiedActivityVersion",
    "activity",
    "createdAt",
  ]) || !exact(value.activity, ["type", "statement", "status", "currentVersion"])) {
    return null;
  }
  const normalized = {
    activityId: uuid(value.activityId),
    workstreamId: uuid(value.workstreamId),
    jobId: uuid(value.jobId),
    classification: ACTIVITY_CLASSIFICATIONS.has(value.classification)
      ? value.classification
      : null,
    executionId: uuid(value.executionId, { nullable: true }),
    scopeBasis: text(value.scopeBasis, 80, { nullable: true }),
    sourceScopeItemId: uuid(value.sourceScopeItemId, { nullable: true }),
    classifiedActivityVersion: integer(value.classifiedActivityVersion),
    activity: {
      type: text(value.activity.type, 80),
      statement: text(value.activity.statement, 5000),
      status: ACTIVITY_STATUSES.has(value.activity.status) ? value.activity.status : null,
      currentVersion: integer(value.activity.currentVersion),
    },
    createdAt: timestamp(value.createdAt),
  };
  if (
    !normalized.activityId ||
    !normalized.workstreamId ||
    normalized.jobId !== expected.jobId ||
    !normalized.classification ||
    (value.executionId != null && !normalized.executionId) ||
    (value.scopeBasis != null && !normalized.scopeBasis) ||
    (value.sourceScopeItemId != null && !normalized.sourceScopeItemId) ||
    !normalized.classifiedActivityVersion ||
    Object.values(normalized.activity).some((item) => item == null) ||
    !normalized.createdAt ||
    (normalized.classification === "EXECUTION" && normalized.executionId !== expected.executionId) ||
    (normalized.classification === "NON_EXECUTION" && normalized.executionId != null)
  ) return null;
  return normalized;
}

function normalizeStartEvents(value) {
  if (!exact(value, ["count", "firstStartedAt", "latestStartedAt"])) return null;
  const normalized = {
    count: integer(value.count, { zero: true }),
    firstStartedAt: timestamp(value.firstStartedAt, { nullable: true }),
    latestStartedAt: timestamp(value.latestStartedAt, { nullable: true }),
  };
  if (
    normalized.count == null ||
    (value.firstStartedAt != null && !normalized.firstStartedAt) ||
    (value.latestStartedAt != null && !normalized.latestStartedAt) ||
    (normalized.count === 0 && (normalized.firstStartedAt || normalized.latestStartedAt)) ||
    (normalized.count > 0 && (!normalized.firstStartedAt || !normalized.latestStartedAt))
  ) return null;
  return normalized;
}

export function normalizeApprovedWorkExecution(value, { jobId, detail = false } = {}) {
  const baseKeys = [
    "contractVersion",
    "id",
    "jobId",
    "relationshipId",
    "source",
    "currentVersion",
    "state",
    "successorExecutionId",
    "createdAt",
    "versionCreatedAt",
    "safeNextActions",
  ];
  if (!exact(value, detail
    ? [...baseKeys, "boundWorkstreams", "activityClassifications", "startEvents"]
    : baseKeys)) return null;
  const base = normalizeExecutionBase(Object.fromEntries(
    baseKeys.map((key) => [key, value[key]])
  ), { jobId });
  if (!base || !detail) return base;
  if (!Array.isArray(value.boundWorkstreams) || !Array.isArray(value.activityClassifications)) {
    return null;
  }
  const expected = { jobId: base.jobId, executionId: base.id };
  const boundWorkstreams = value.boundWorkstreams.map((entry) =>
    normalizeBinding(entry, expected)
  );
  const activityClassifications = value.activityClassifications.map((entry) =>
    normalizeClassification(entry, expected)
  );
  const startEvents = normalizeStartEvents(value.startEvents);
  if (
    boundWorkstreams.some((entry) => !entry) ||
    activityClassifications.some((entry) => !entry) ||
    !unique(boundWorkstreams.map((entry) => entry.workstreamId)) ||
    !unique(activityClassifications.map((entry) => entry.activityId)) ||
    !startEvents
  ) return null;
  return Object.freeze({
    ...base,
    boundWorkstreams: Object.freeze(boundWorkstreams),
    activityClassifications: Object.freeze(activityClassifications),
    startEvents: Object.freeze(startEvents),
  });
}

async function request(endpoint, options, setPage, authFetchImpl) {
  const result = await authFetchImpl(endpoint, options, setPage);
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw new ApprovedWorkExecutionApiError({
      status: result?.response?.status || 500,
      code: result?.data?.code,
      message: result?.data?.message,
    });
  }
  return result.data;
}

export function createApprovedWorkCompletionIdempotencyKey(cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider || typeof cryptoProvider.randomUUID !== "function") {
    throw new ApprovedWorkExecutionApiError({
      status: 0,
      code: "COMPLETE_WORK_IDEMPOTENCY_UNAVAILABLE",
      message: "Complete Work is unavailable on this device.",
    });
  }
  return `approved-work:complete:${cryptoProvider.randomUUID()}`;
}

export async function fetchApprovedWorkExecution({
  jobId,
  executionId,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedJobId = uuid(jobId);
  const normalizedExecutionId = uuid(executionId);
  if (!normalizedJobId || !normalizedExecutionId) {
    throw new ApprovedWorkExecutionApiError({
      status: 400,
      code: "INVALID_APPROVED_WORK_EXECUTION",
    });
  }
  const data = await request(
    `/jobs/${encodeURIComponent(normalizedJobId)}/approved-work-executions/${encodeURIComponent(normalizedExecutionId)}`,
    { method: "GET", cache: "no-store" },
    setPage,
    authFetchImpl
  );
  const execution = data.code === "APPROVED_WORK_EXECUTION_FOUND"
    ? normalizeApprovedWorkExecution(data.execution, { jobId: normalizedJobId, detail: true })
    : null;
  if (!execution || execution.id !== normalizedExecutionId) {
    throw new ApprovedWorkExecutionApiError({
      status: 502,
      code: "UNSAFE_APPROVED_WORK_EXECUTION_RESPONSE",
    });
  }
  return execution;
}

export async function fetchCompletableApprovedWorkExecution({
  jobId,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedJobId = uuid(jobId);
  if (!normalizedJobId) {
    throw new ApprovedWorkExecutionApiError({
      status: 400,
      code: "INVALID_APPROVED_WORK_EXECUTION_JOB",
    });
  }
  const data = await request(
    `/jobs/${encodeURIComponent(normalizedJobId)}/approved-work-executions`,
    { method: "GET", cache: "no-store" },
    setPage,
    authFetchImpl
  );
  if (data.code !== "APPROVED_WORK_EXECUTIONS_FOUND" || !Array.isArray(data.executions)) {
    throw new ApprovedWorkExecutionApiError({
      status: 502,
      code: "UNSAFE_APPROVED_WORK_EXECUTION_RESPONSE",
    });
  }
  const executions = data.executions.map((entry) =>
    normalizeApprovedWorkExecution(entry, { jobId: normalizedJobId })
  );
  if (executions.some((entry) => !entry) || !unique(executions.map((entry) => entry.id))) {
    throw new ApprovedWorkExecutionApiError({
      status: 502,
      code: "UNSAFE_APPROVED_WORK_EXECUTION_RESPONSE",
    });
  }
  const eligible = executions.filter((execution) =>
    execution.state === "ACTIVE" && execution.safeNextActions.includes("COMPLETE_WORK")
  );
  if (eligible.length === 0) return null;
  if (eligible.length !== 1) {
    throw new ApprovedWorkExecutionApiError({
      status: 409,
      code: "AMBIGUOUS_APPROVED_WORK_EXECUTION",
      message: "Complete Work is unavailable while the work record is being reconciled.",
    });
  }
  return fetchApprovedWorkExecution({
    jobId: normalizedJobId,
    executionId: eligible[0].id,
    setPage,
    authFetchImpl,
  });
}

export function buildApprovedWorkCompletionSnapshot(execution) {
  const normalized = normalizeApprovedWorkExecution(execution, {
    jobId: execution?.jobId,
    detail: true,
  });
  if (
    !normalized ||
    normalized.state !== "ACTIVE" ||
    !normalized.safeNextActions.includes("COMPLETE_WORK") ||
    normalized.startEvents.count < 1
  ) {
    throw new ApprovedWorkExecutionApiError({
      status: 409,
      code: "APPROVED_WORK_NOT_COMPLETABLE",
      message: "This work is not ready to be completed yet.",
    });
  }
  const expectedWorkstreams = normalized.boundWorkstreams
    .map((binding) => ({
      workstreamId: binding.workstreamId,
      expectedVersion: binding.workstream.currentVersion,
    }))
    .sort((left, right) => left.workstreamId.localeCompare(right.workstreamId));
  const expectedActivities = normalized.activityClassifications
    .filter((classification) =>
      classification.classification === "EXECUTION" &&
      classification.executionId === normalized.id
    )
    .map((classification) => ({
      activityId: classification.activityId,
      expectedVersion: classification.activity.currentVersion,
    }))
    .sort((left, right) => left.activityId.localeCompare(right.activityId));
  if (expectedWorkstreams.length === 0) {
    throw new ApprovedWorkExecutionApiError({
      status: 409,
      code: "APPROVED_WORK_NOT_COMPLETABLE",
      message: "This work is not ready to be completed yet.",
    });
  }
  return Object.freeze({
    expectedExecutionVersion: normalized.currentVersion,
    expectedWorkstreams: Object.freeze(expectedWorkstreams),
    expectedActivities: Object.freeze(expectedActivities),
  });
}

function normalizeCompletion(value, expected) {
  if (!plain(value)) return null;

  const hasQuoteApprovalId = Object.hasOwn(value, "quoteApprovalId");

  const normalized = {
    contractVersion: integer(value.contractVersion),
    state: value.state === "WORK_COMPLETED" ? value.state : null,
    jobId: uuid(value.jobId),
    relationshipId:
      value.relationshipId == null ? null : integer(value.relationshipId),
    executionId: uuid(value.executionId),
    executionVersion: integer(value.executionVersion),
    quoteId: uuid(value.quoteId),
    issuedQuoteVersion: integer(value.issuedQuoteVersion),
    approvedCustomerDecisionId: uuid(
      value.approvedCustomerDecisionId,
      { nullable: true }
    ),
    quoteApprovalId: hasQuoteApprovalId
      ? uuid(value.quoteApprovalId, { nullable: true })
      : null,
    completedAt: timestamp(value.completedAt),
    nextAction:
      plain(value.nextAction) &&
      value.nextAction.code === "READY_TO_INVOICE"
        ? {
            code: value.nextAction.code,
            label: text(value.nextAction.label, 200),
          }
        : null,
  };

  if (
    normalized.contractVersion !== 1 ||
    normalized.state !== "WORK_COMPLETED" ||
    normalized.jobId !== expected.jobId ||
    normalized.executionId !== expected.executionId ||
    (
      value.relationshipId != null &&
      !normalized.relationshipId
    ) ||
    normalized.relationshipId !== expected.relationshipId ||
    !normalized.executionVersion ||
    normalized.quoteId !== expected.source.quoteId ||
    normalized.issuedQuoteVersion !== expected.source.issuedQuoteVersion ||
    (
      value.approvedCustomerDecisionId != null &&
      !normalized.approvedCustomerDecisionId
    ) ||
    normalized.approvedCustomerDecisionId !==
      expected.source.approvedCustomerDecisionId ||
    (
      expected.source.quoteApprovalId
        ? (
            !hasQuoteApprovalId ||
            normalized.quoteApprovalId !== expected.source.quoteApprovalId
          )
        : (
            hasQuoteApprovalId &&
            normalized.quoteApprovalId != null
          )
    ) ||
    !normalized.completedAt ||
    !normalized.nextAction?.label
  ) {
    return null;
  }

  return {
    contractVersion: normalized.contractVersion,
    state: normalized.state,
    jobId: normalized.jobId,
    relationshipId: normalized.relationshipId,
    executionId: normalized.executionId,
    executionVersion: normalized.executionVersion,
    quoteId: normalized.quoteId,
    issuedQuoteVersion: normalized.issuedQuoteVersion,
    approvedCustomerDecisionId: normalized.approvedCustomerDecisionId,
    ...(hasQuoteApprovalId
      ? { quoteApprovalId: normalized.quoteApprovalId }
      : {}),
    completedAt: normalized.completedAt,
    nextAction: normalized.nextAction,
  };
}

export async function completeApprovedWork({
  jobId,
  executionId,
  idempotencyKey,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedJobId = uuid(jobId);
  const normalizedExecutionId = uuid(executionId);
  const normalizedKey = typeof idempotencyKey === "string" ? idempotencyKey.trim() : "";
  if (!normalizedJobId || !normalizedExecutionId || !IDEMPOTENCY_PATTERN.test(normalizedKey)) {
    throw new ApprovedWorkExecutionApiError({
      status: 400,
      code: "INVALID_APPROVED_WORK_COMPLETION",
    });
  }
  const execution = await fetchApprovedWorkExecution({
    jobId: normalizedJobId,
    executionId: normalizedExecutionId,
    setPage,
    authFetchImpl,
  });
  const snapshot = buildApprovedWorkCompletionSnapshot(execution);
  const data = await request(
    `/jobs/${encodeURIComponent(normalizedJobId)}/approved-work-executions/${encodeURIComponent(normalizedExecutionId)}/complete-work`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Idempotency-Key": normalizedKey },
      body: JSON.stringify(snapshot),
    },
    setPage,
    authFetchImpl
  );
  const completion = data.code === "APPROVED_WORK_COMPLETED"
    ? normalizeCompletion(data.completion, {
        jobId: normalizedJobId,
        executionId: normalizedExecutionId,
        relationshipId: execution.relationshipId,
        source: execution.source,
      })
    : null;
  const completedExecution = normalizeApprovedWorkExecution(data.execution, {
    jobId: normalizedJobId,
    detail: true,
  });
  if (!completion || !completedExecution || completedExecution.state !== "CLOSED") {
    throw new ApprovedWorkExecutionApiError({
      status: 502,
      code: "UNSAFE_APPROVED_WORK_COMPLETION_RESPONSE",
    });
  }
  return Object.freeze({
    code: data.code,
    completion: Object.freeze(completion),
    execution: completedExecution,
    replayed: data.replayed === true,
  });
}

export function completeWorkFailureMessage(error) {
  if (error?.status === 409 && String(error?.code || "").includes("STALE")) {
    return "This work changed before completion. Refresh the Work Plan and try again.";
  }
  if (error?.code === "APPROVED_WORK_COMPLETION_BLOCKED" ||
    error?.code === "EXECUTION_ACTIVITY_NOT_COMPLETABLE" ||
    error?.code === "APPROVED_WORK_NOT_STARTED" ||
    error?.code === "APPROVED_WORK_NOT_COMPLETABLE") {
    return "Complete the remaining work requirements, then try again.";
  }
  if ([401, 403, 404].includes(Number(error?.status))) {
    return "Complete Work is not available for this Job.";
  }
  return "We couldn’t complete this work. Review the Work Plan and try again.";
}
