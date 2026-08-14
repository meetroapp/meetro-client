import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUSINESS_STATUSES = Object.freeze([
  "WAITING_ON_CUSTOMER",
  "APPROVED",
  "DECLINED",
]);
const LINEAGE_LABELS = Object.freeze(["Original", "Revised", "Additional"]);

export class CustomerJobQuotesError extends Error {
  constructor({
    status = 500,
    code = "CUSTOMER_JOB_QUOTES_FAILED",
    message = "Quote information is temporarily unavailable.",
  } = {}) {
    super(message);
    this.name = "CustomerJobQuotesError";
    this.status = status;
    this.code = code;
  }
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function exactKeys(value, keys) {
  const source = record(value);
  return Boolean(
    source &&
      JSON.stringify(Object.keys(source).sort()) ===
        JSON.stringify([...keys].sort())
  );
}

function uuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function positiveInteger(value, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum
    ? parsed
    : null;
}

function nonNegativeInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
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

function normalizeJob(value, expectedJobId) {
  if (!exactKeys(value, ["id", "requestId", "title", "service"])) return null;
  const id = uuid(value.id);
  const requestId = positiveInteger(value.requestId);
  const title = text(value.title, 500);
  const service = text(value.service, 200, { nullable: true });
  if (
    id !== expectedJobId ||
    !requestId ||
    !title ||
    (value.service != null && !service)
  ) return null;
  return Object.freeze({ id, requestId, title, service });
}

function normalizeActions(value, businessStatus) {
  if (!exactKeys(value, ["canViewQuote", "canApprove", "canDecline"])) {
    return null;
  }
  if (
    value.canViewQuote !== true ||
    typeof value.canApprove !== "boolean" ||
    typeof value.canDecline !== "boolean" ||
    (businessStatus !== "WAITING_ON_CUSTOMER" &&
      (value.canApprove || value.canDecline))
  ) return null;
  return Object.freeze({
    canViewQuote: true,
    canApprove: value.canApprove,
    canDecline: value.canDecline,
  });
}

function normalizeQuote(value, expectedJobId) {
  if (
    !exactKeys(value, [
      "quoteId",
      "jobId",
      "businessStatus",
      "status",
      "customerDecision",
      "totalMinor",
      "currency",
      "lineageLabel",
      "createdAt",
      "updatedAt",
      "issuedAt",
      "decidedAt",
      "actions",
    ])
  ) return null;
  const quoteId = uuid(value.quoteId);
  const jobId = uuid(value.jobId);
  const totalMinor = nonNegativeInteger(value.totalMinor);
  const currency = text(value.currency, 3);
  const createdAt = timestamp(value.createdAt);
  const updatedAt = timestamp(value.updatedAt);
  const issuedAt = timestamp(value.issuedAt);
  const decidedAt = timestamp(value.decidedAt, { nullable: true });
  const statusTruth = {
    WAITING_ON_CUSTOMER:
      value.customerDecision == null && value.decidedAt == null,
    APPROVED:
      value.customerDecision === "APPROVED" && Boolean(decidedAt),
    DECLINED:
      value.customerDecision === "DECLINED" && Boolean(decidedAt),
  };
  const actions = normalizeActions(value.actions, value.businessStatus);
  if (
    !quoteId ||
    jobId !== expectedJobId ||
    !BUSINESS_STATUSES.includes(value.businessStatus) ||
    value.status !== "ISSUED" ||
    statusTruth[value.businessStatus] !== true ||
    totalMinor == null ||
    !/^[A-Z]{3}$/.test(currency || "") ||
    !LINEAGE_LABELS.includes(value.lineageLabel) ||
    !createdAt ||
    !updatedAt ||
    !issuedAt ||
    !actions
  ) return null;
  return Object.freeze({
    quoteId,
    jobId,
    businessStatus: value.businessStatus,
    status: "ISSUED",
    customerDecision: value.customerDecision,
    totalMinor,
    currency,
    lineageLabel: value.lineageLabel,
    createdAt,
    updatedAt,
    issuedAt,
    decidedAt,
    actions,
  });
}

function normalizePagination(value, requestedLimit) {
  if (!exactKeys(value, ["limit", "hasMore", "nextCursor"])) return null;
  const limit = positiveInteger(value.limit, 50);
  const nextCursor = text(value.nextCursor, 2000, { nullable: true });
  if (
    limit !== requestedLimit ||
    typeof value.hasMore !== "boolean" ||
    (value.nextCursor != null && !nextCursor) ||
    (value.hasMore && !nextCursor) ||
    (!value.hasMore && nextCursor)
  ) return null;
  return Object.freeze({ limit, hasMore: value.hasMore, nextCursor });
}

export function normalizeCustomerJobQuotes(
  payload,
  { jobId, limit = 25 } = {}
) {
  const expectedJobId = uuid(jobId);
  if (
    !expectedJobId ||
    !exactKeys(payload, ["success", "code", "job", "quotes", "pagination"]) ||
    payload.success !== true ||
    payload.code !== "CUSTOMER_JOB_QUOTES_LOADED" ||
    !Array.isArray(payload.quotes)
  ) return null;
  const job = normalizeJob(payload.job, expectedJobId);
  const quotes = payload.quotes.map((quote) =>
    normalizeQuote(quote, expectedJobId)
  );
  const pagination = normalizePagination(payload.pagination, limit);
  if (
    !job ||
    !pagination ||
    quotes.some((quote) => !quote) ||
    new Set(quotes.map(({ quoteId }) => quoteId)).size !== quotes.length
  ) return null;
  return Object.freeze({
    source: "CUSTOMER_JOB_QUOTES",
    job,
    quotes: Object.freeze(quotes),
    pagination,
  });
}

export async function fetchCustomerJobQuotes({
  jobId,
  limit = 25,
  cursor = null,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedJobId = uuid(jobId);
  const normalizedLimit = positiveInteger(limit, 50);
  const normalizedCursor = text(cursor, 2000, { nullable: true });
  if (
    !normalizedJobId ||
    !normalizedLimit ||
    (cursor != null && !normalizedCursor)
  ) {
    throw new CustomerJobQuotesError({
      status: 400,
      code: "INVALID_CUSTOMER_JOB_QUOTES_READ",
      message: "The Quote request is invalid.",
    });
  }
  const query = new URLSearchParams({ limit: String(normalizedLimit) });
  if (normalizedCursor) query.set("cursor", normalizedCursor);
  const result = await authFetchImpl(
    `/customer/jobs/${encodeURIComponent(normalizedJobId)}/quotes?${query.toString()}`,
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw new CustomerJobQuotesError({
      status: result?.response?.status || 500,
      code: result?.data?.code,
      message: result?.data?.message,
    });
  }
  const normalized = normalizeCustomerJobQuotes(result.data, {
    jobId: normalizedJobId,
    limit: normalizedLimit,
  });
  if (!normalized) {
    throw new CustomerJobQuotesError({
      status: 502,
      code: "INVALID_CUSTOMER_JOB_QUOTES_RESPONSE",
      message: "Quote information could not be verified.",
    });
  }
  return normalized;
}
