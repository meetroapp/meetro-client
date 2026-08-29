import { authFetch } from "./authFetch.js";
import { normalizePreWorkDepositGate } from "./preWorkDepositApi.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STAGES = new Set([
  "EVALUATION_NEEDED",
  "EVALUATION_IN_PROGRESS",
  "FINDINGS_REVIEW_NEEDED",
  "FINDINGS_NEEDED",
  "RECOMMENDATIONS_NEEDED",
  "QUOTE_NEEDED",
  "QUOTE_DRAFT",
  "QUOTE_DELIVERY_PENDING",
  "WAITING_FOR_CUSTOMER_DECISION",
  "QUOTE_DECLINED",
  "QUOTE_APPROVED_DEPOSIT_DUE",
  "QUOTE_APPROVED",
  "WORK_READY",
  "WORK_IN_PROGRESS",
  "WORK_BLOCKED",
  "WORK_REVIEW_NEEDED",
  "WORKSTREAMS_COMPLETE_PENDING_JOB_COMPLETION",
  "WORK_COMPLETED",
  "JOB_COMPLETED",
]);

const RESPONSIBILITIES = new Set([
  "PROFESSIONAL",
  "CUSTOMER",
  "SYSTEM_WAITING",
  "NONE",
]);

const BLOCKERS = new Set([
  "EVALUATION_NOT_RECORDED",
  "EVALUATION_INCOMPLETE",
  "FINDINGS_NOT_RECORDED",
  "FINDINGS_AWAITING_CONFIRMATION",
  "QUOTE_NOT_ISSUED",
  "QUOTE_NOT_DELIVERED",
  "CUSTOMER_DECISION_PENDING",
  "CUSTOMER_DECLINED_QUOTE",
  "QUOTE_DEPOSIT_NOT_SATISFIED",
  "WORKSTREAM_BLOCKED",
  "UNRESOLVED_OBLIGATION",
  "NEXT_WORKFLOW_AUTHORITY_NOT_AVAILABLE",
  "JOB_COMPLETION_NOT_AVAILABLE",
]);

const NEXT_ACTIONS = new Set([
  "START_OR_CONTINUE_EVALUATION",
  "REVIEW_FINDINGS",
  "PREPARE_RECOMMENDATIONS",
  "BUILD_QUOTE",
  "REVIEW_DRAFT_QUOTE",
  "REVIEW_QUOTE_DELIVERY",
  "WAIT_FOR_CUSTOMER_DECISION",
  "REVIEW_DECLINED_QUOTE",
  "REVIEW_APPROVED_QUOTE_TERMS",
  "REVIEW_ACTIVE_WORK",
  "REVIEW_BLOCKED_WORK",
  "REVIEW_WORKSTREAM_COMPLETION",
  "NEXT_STEP_NOT_YET_AVAILABLE",
  "READY_TO_INVOICE",
  "REVIEW_DRAFT_INVOICE",
  "WAIT_FOR_PAYMENT",
  "REVIEW_BALANCE_DUE",
  "REVIEW_PAID_INVOICE",
]);

const AVAILABLE_ACTIONS = new Set([
  "VIEW_CONCERN",
  "MESSAGE_CUSTOMER",
  "START_EVALUATION",
  "EDIT_EVALUATION",
  "COMPLETE_EVALUATION",
  "REVIEW_FINDINGS",
  "REVIEW_RECOMMENDATIONS",
  "CREATE_QUOTE",
  "REVIEW_QUOTE",
  "ISSUE_QUOTE",
  "REVIEW_ACTIVE_WORK",
  "CONTINUE_ACTIVE_WORK",
  "REVIEW_WORKSTREAM_COMPLETION",
  "VIEW_JOB_HISTORY",
  "VIEW_INVOICE",
]);

const VERSION_KEYS = Object.freeze([
  "evaluationVersion",
  "findingVersion",
  "recommendationVersion",
  "quoteVersion",
  "workstreamVersion",
  "activityVersion",
  "obligationVersion",
  "approvedWorkExecutionVersion",
  "depositVersion",
  "invoiceVersion",
]);

const COUNT_KEYS = Object.freeze([
  "evaluationCount",
  "findingCount",
  "recommendationCount",
  "quoteCount",
  "workstreamCount",
  "activityCount",
  "obligationCount",
]);

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function nonNegativeInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function canonicalUuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function boundedText(value, maximum = 240) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= maximum ? normalized : null;
}

function isoTimestamp(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeDefinition(value, allowed, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const code = boundedText(value.code, 100);
  const label = boundedText(value.label, 240);
  if (!code || !allowed.has(code) || !label) return null;
  return { code, label };
}

function normalizeNextAction(value) {
  const normalized = normalizeDefinition(value, NEXT_ACTIONS);
  const description = boundedText(value?.description, 500);
  return normalized && description ? { ...normalized, description } : null;
}

function normalizeFreshness(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const derivedAt = isoTimestamp(value.derivedAt);
  const jobCreatedAt = value.jobCreatedAt == null ? null : isoTimestamp(value.jobCreatedAt);
  if (!derivedAt || (value.jobCreatedAt != null && !jobCreatedAt)) return null;
  const versions = {};
  for (const key of VERSION_KEYS) {
    const version = nonNegativeInteger(value[key]);
    if (version == null) return null;
    versions[key] = version;
  }
  const counts = {};
  for (const key of COUNT_KEYS) {
    const count = nonNegativeInteger(value[key]);
    if (count == null) return null;
    counts[key] = count;
  }
  return { derivedAt, jobCreatedAt, ...versions, ...counts };
}

export function normalizeCanonicalLiveJobProjection(payload = {}) {
  const liveJob = payload?.liveJob;
  if (!liveJob || typeof liveJob !== "object" || Array.isArray(liveJob)) return null;
  const jobId = canonicalUuid(liveJob.jobId);
  const requestId = positiveInteger(liveJob.requestId);
  const relationshipId = positiveInteger(liveJob.relationshipId);
  const stage = normalizeDefinition(liveJob.stage, STAGES);
  const responsibility = normalizeDefinition(liveJob.responsibility, RESPONSIBILITIES);
  const blocker = normalizeDefinition(liveJob.blocker, BLOCKERS, { nullable: true });
  const nextAction = normalizeNextAction(liveJob.nextAction);
  const freshness = normalizeFreshness(liveJob.freshness);
  const deposit = liveJob.deposit == null
    ? null
    : normalizePreWorkDepositGate(liveJob.deposit, {
        includeMaterialized: true,
      });
  if (
    Number(liveJob.contractVersion) !== 1 ||
    !jobId ||
    !requestId ||
    !relationshipId ||
    !stage ||
    !responsibility ||
    (liveJob.blocker != null && !blocker) ||
    !nextAction ||
    !freshness ||
    (liveJob.deposit != null && !deposit) ||
    !Array.isArray(liveJob.availableActions) ||
    !Array.isArray(liveJob.reasonCodes)
  ) {
    return null;
  }

  const availableActions = liveJob.availableActions.map((action) =>
    normalizeDefinition(action, AVAILABLE_ACTIONS)
  );
  const reasonCodes = liveJob.reasonCodes.map((reason) => boundedText(reason, 160));
  if (
    availableActions.some((action) => !action) ||
    new Set(availableActions.map((action) => action.code)).size !== availableActions.length ||
    reasonCodes.some((reason) => !reason)
  ) {
    return null;
  }

  return {
    authoritySource: "CANONICAL_LIVE_JOB_READ",
    contractVersion: 1,
    jobId,
    requestId,
    relationshipId,
    stage,
    responsibility,
    blocker,
    nextAction,
    availableActions,
    reasonCodes,
    deposit,
    freshness,
  };
}

export function hasCanonicalLiveJobAction(liveJob, actionCode) {
  return Boolean(
    liveJob &&
      Array.isArray(liveJob.availableActions) &&
      liveJob.availableActions.some((action) => action.code === actionCode)
  );
}

export async function fetchCanonicalLiveJobProjection({
  jobId,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedJobId = canonicalUuid(jobId);
  if (!normalizedJobId) {
    return {
      status: "unavailable",
      reason: "INVALID_JOB_ID",
      httpStatus: 0,
      projection: null,
    };
  }
  const result = await authFetchImpl(
    `/jobs/${encodeURIComponent(normalizedJobId)}/live-state`,
    { cache: "no-store" },
    setPage
  );
  if (!result?.response?.ok) {
    return {
      status: "error",
      reason: result?.data?.code || "LIVE_JOB_FETCH_FAILED",
      httpStatus: result?.response?.status || 0,
      projection: null,
    };
  }
  const projection = normalizeCanonicalLiveJobProjection(result.data);
  if (!projection || projection.jobId !== normalizedJobId) {
    return {
      status: "unavailable",
      reason: "INVALID_LIVE_JOB_RESPONSE",
      httpStatus: result?.response?.status || 0,
      projection: null,
    };
  }
  return {
    status: "ready",
    reason: "",
    httpStatus: result.response.status || 200,
    projection,
  };
}

export {
  AVAILABLE_ACTIONS as CANONICAL_LIVE_JOB_ACTIONS,
  NEXT_ACTIONS as CANONICAL_LIVE_JOB_NEXT_ACTIONS,
  STAGES as CANONICAL_LIVE_JOB_STAGES,
};
