import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FINDING_STATES = new Set(["NEEDS_ATTENTION", "RESOLVED"]);
const RECOMMENDATION_STATES = new Set([
  "RECOMMENDED",
  "DEFERRED",
  "NOT_PROCEEDING",
]);

function exactObject(value, keys) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key))
  );
}

function uuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function timestamp(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const parsed = new Date(value);
  return typeof value === "string" && !Number.isNaN(parsed.getTime())
    ? parsed.toISOString()
    : null;
}

function statement(value) {
  return typeof value === "string" && value.trim() && value.length <= 5000
    ? value
    : null;
}

function evaluation(value) {
  if (value == null) return null;
  const keys = ["status", "completedAt", "startedAt", "updatedAt"];
  if (!exactObject(value, keys)) return null;
  const completedAt = timestamp(value.completedAt, { nullable: true });
  const startedAt = timestamp(value.startedAt);
  const updatedAt = timestamp(value.updatedAt);
  if (
    !["COMPLETE", "IN_PROGRESS"].includes(value.status) ||
    (value.completedAt != null && !completedAt) ||
    !startedAt ||
    !updatedAt
  ) {
    return null;
  }
  return { status: value.status, completedAt, startedAt, updatedAt };
}

function finding(value) {
  const keys = ["id", "statement", "state", "createdAt", "updatedAt"];
  if (!exactObject(value, keys)) return null;
  const id = uuid(value.id);
  const text = statement(value.statement);
  const createdAt = timestamp(value.createdAt);
  const updatedAt = timestamp(value.updatedAt);
  if (!id || !text || !FINDING_STATES.has(value.state) || !createdAt || !updatedAt) {
    return null;
  }
  return { id, statement: text, state: value.state, createdAt, updatedAt };
}

function recommendation(value) {
  const keys = ["id", "findingId", "statement", "state", "createdAt", "updatedAt"];
  if (!exactObject(value, keys)) return null;
  const id = uuid(value.id);
  const findingId = uuid(value.findingId);
  const text = statement(value.statement);
  const createdAt = timestamp(value.createdAt);
  const updatedAt = timestamp(value.updatedAt);
  if (
    !id ||
    !findingId ||
    !text ||
    !RECOMMENDATION_STATES.has(value.state) ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }
  return { id, findingId, statement: text, state: value.state, createdAt, updatedAt };
}

export function validateCustomerEfrProjection(value, { jobId } = {}) {
  const keys = [
    "jobId",
    "requestId",
    "relationshipId",
    "evaluation",
    "findings",
    "recommendations",
  ];
  if (!exactObject(value, keys)) return null;
  const canonicalJobId = uuid(value.jobId);
  const expectedJobId = uuid(jobId);
  const requestId = positiveInteger(value.requestId);
  const relationshipId = positiveInteger(value.relationshipId);
  const canonicalEvaluation = evaluation(value.evaluation);
  const findings = Array.isArray(value.findings) ? value.findings.map(finding) : null;
  const recommendations = Array.isArray(value.recommendations)
    ? value.recommendations.map(recommendation)
    : null;
  const findingIds = new Set((findings || []).map((item) => item?.id));
  if (
    !canonicalJobId ||
    canonicalJobId !== expectedJobId ||
    !requestId ||
    !relationshipId ||
    (value.evaluation != null && !canonicalEvaluation) ||
    !findings ||
    findings.length > 100 ||
    findings.some((item) => !item) ||
    !recommendations ||
    recommendations.length > 100 ||
    recommendations.some((item) => !item || !findingIds.has(item.findingId))
  ) {
    return null;
  }
  return {
    jobId: canonicalJobId,
    requestId,
    relationshipId,
    evaluation: canonicalEvaluation,
    findings,
    recommendations,
  };
}

export class CustomerEfrError extends Error {
  constructor({ status = 500, code = "CUSTOMER_EFR_FAILED", message } = {}) {
    super(message || "Project assessment details could not be loaded.");
    this.name = "CustomerEfrError";
    this.status = status;
    this.code = code;
  }
}

export async function fetchCustomerEfr({ jobId, setPage }) {
  const canonicalJobId = uuid(jobId);
  if (!canonicalJobId) {
    throw new CustomerEfrError({
      status: 400,
      code: "INVALID_CUSTOMER_EFR_JOB_ID",
    });
  }
  const { response, data } = await authFetch(
    `/customer/jobs/${encodeURIComponent(canonicalJobId)}/project-assessment`,
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (!response.ok || data?.success !== true) {
    throw new CustomerEfrError({
      status: response.status,
      code: data?.code,
      message: data?.message,
    });
  }
  const projection = validateCustomerEfrProjection(data.projectAssessment, {
    jobId: canonicalJobId,
  });
  if (!projection) {
    throw new CustomerEfrError({
      status: 502,
      code: "UNSAFE_CUSTOMER_EFR_RESPONSE",
      message: "The project assessment response was not safe to display.",
    });
  }
  return projection;
}
