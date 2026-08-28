import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FILTERS = Object.freeze([
  "all",
  "draft",
  "delivery_pending",
  "waiting_on_customer",
  "approved",
  "declined",
]);
const CLASSIFICATIONS = Object.freeze([
  "DRAFT",
  "DELIVERY_PENDING",
  "WAITING_ON_CUSTOMER",
  "APPROVED",
  "DECLINED",
]);
const LINEAGE_TYPES = Object.freeze(["REVISED_QUOTE", "SUPPLEMENTAL_QUOTE"]);

export class ProfessionalQuotesError extends Error {
  constructor({
    status = 500,
    code = "PROFESSIONAL_QUOTES_FAILED",
    message = "Quotes are temporarily unavailable.",
  } = {}) {
    super(message);
    this.name = "ProfessionalQuotesError";
    this.status = status;
    this.code = code;
  }
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function exactKeys(value, keys) {
  const source = record(value);
  return source &&
    JSON.stringify(Object.keys(source).sort()) === JSON.stringify([...keys].sort());
}

function uuid(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
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

function integer(value, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function normalizeSummary(value) {
  if (!exactKeys(value, ["drafts", "deliveryPending", "waitingOnCustomer", "approved", "declined"])) {
    return null;
  }
  const summary = {
    drafts: integer(value.drafts),
    deliveryPending: integer(value.deliveryPending),
    waitingOnCustomer: integer(value.waitingOnCustomer),
    approved: integer(value.approved),
    declined: integer(value.declined),
  };
  return Object.values(summary).some((count) => count == null)
    ? null
    : Object.freeze(summary);
}

function normalizeCustomer(value) {
  if (!exactKeys(value, ["displayName"])) return null;
  const displayName = text(value.displayName, 200);
  return displayName ? Object.freeze({ displayName }) : null;
}

function normalizeJob(value) {
  if (!exactKeys(value, ["title", "service"])) return null;
  const title = text(value.title, 500);
  const service = text(value.service, 200, { nullable: true });
  if (!title || (value.service != null && !service)) return null;
  return Object.freeze({ title, service });
}

function normalizeActions(value, classification) {
  if (!exactKeys(value, ["canViewQuote", "canContinueDraft", "canViewJob"])) {
    return null;
  }
  if (
    typeof value.canViewQuote !== "boolean" ||
    typeof value.canContinueDraft !== "boolean" ||
    typeof value.canViewJob !== "boolean" ||
    value.canViewQuote !== true ||
    (value.canContinueDraft && classification !== "DRAFT")
  ) return null;
  return Object.freeze({
    canViewQuote: true,
    canContinueDraft: value.canContinueDraft,
    canViewJob: value.canViewJob,
  });
}

function normalizeLineage(source) {
  const parentQuoteId = uuid(source.parentQuoteId, { nullable: true });
  const lineageType = source.lineageType == null ? null : source.lineageType;
  if (source.parentQuoteId != null && !parentQuoteId) return null;
  if (lineageType == null) {
    return parentQuoteId == null && source.lineageLabel === "Original"
      ? { parentQuoteId: null, lineageType: null, lineageLabel: "Original" }
      : null;
  }
  const expectedLabel = lineageType === "REVISED_QUOTE"
    ? "Revised"
    : lineageType === "SUPPLEMENTAL_QUOTE"
      ? "Additional"
      : null;
  return LINEAGE_TYPES.includes(lineageType) && parentQuoteId && source.lineageLabel === expectedLabel
    ? { parentQuoteId, lineageType, lineageLabel: expectedLabel }
    : null;
}

function normalizeQuote(value) {
  const keys = [
    "id", "jobId", "classification", "status", "customerDecision",
    "totalMinor", "currency", "lineageType", "lineageLabel", "parentQuoteId",
    "customer", "job", "createdAt", "updatedAt", "issuedAt", "decidedAt",
    "lastActivityAt", "actions",
  ];
  if (!exactKeys(value, keys)) return null;
  const id = uuid(value.id);
  const jobId = uuid(value.jobId);
  const totalMinor = integer(value.totalMinor);
  const currency = text(value.currency, 3);
  const createdAt = timestamp(value.createdAt);
  const updatedAt = timestamp(value.updatedAt);
  const issuedAt = timestamp(value.issuedAt, { nullable: true });
  const decidedAt = timestamp(value.decidedAt, { nullable: true });
  const lastActivityAt = timestamp(value.lastActivityAt);
  const customer = normalizeCustomer(value.customer);
  const job = normalizeJob(value.job);
  const lineage = normalizeLineage(value);
  const actions = normalizeActions(value.actions, value.classification);
  const classificationTruth = {
    DRAFT: value.status === "DRAFT" && value.customerDecision == null && issuedAt == null && decidedAt == null,
    DELIVERY_PENDING:
      value.status === "ISSUED" && value.customerDecision == null && Boolean(issuedAt) && decidedAt == null,
    WAITING_ON_CUSTOMER:
      value.status === "ISSUED" && value.customerDecision == null && Boolean(issuedAt) && decidedAt == null,
    APPROVED:
      value.status === "ISSUED" && value.customerDecision === "APPROVED" && Boolean(issuedAt && decidedAt),
    DECLINED:
      value.status === "ISSUED" && value.customerDecision === "DECLINED" && Boolean(issuedAt && decidedAt),
  };
  if (
    !id ||
    !jobId ||
    !CLASSIFICATIONS.includes(value.classification) ||
    classificationTruth[value.classification] !== true ||
    totalMinor == null ||
    !/^[A-Z]{3}$/.test(currency || "") ||
    !createdAt ||
    !updatedAt ||
    !lastActivityAt ||
    !customer ||
    !job ||
    !lineage ||
    !actions
  ) return null;
  return Object.freeze({
    id,
    jobId,
    classification: value.classification,
    status: value.status,
    customerDecision: value.customerDecision,
    totalMinor,
    currency,
    lineageType: lineage.lineageType,
    lineageLabel: lineage.lineageLabel,
    parentQuoteId: lineage.parentQuoteId,
    customer,
    job,
    createdAt,
    updatedAt,
    issuedAt,
    decidedAt,
    lastActivityAt,
    actions,
  });
}

function normalizePagination(value, requestedLimit) {
  if (!exactKeys(value, ["limit", "hasMore", "nextCursor"])) return null;
  const limit = integer(value.limit, { minimum: 1, maximum: 100 });
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

export function normalizeProfessionalQuotes(
  payload,
  { classification = "all", limit = 50 } = {}
) {
  if (
    !exactKeys(payload, [
      "success", "code", "classification", "summary", "quotes", "pagination",
    ]) ||
    payload.success !== true ||
    payload.code !== "PROFESSIONAL_QUOTES_LOADED" ||
    payload.classification !== classification ||
    !Array.isArray(payload.quotes)
  ) return null;
  const summary = normalizeSummary(payload.summary);
  const quotes = payload.quotes.map(normalizeQuote);
  const pagination = normalizePagination(payload.pagination, limit);
  if (!summary || !pagination || quotes.some((quote) => !quote)) return null;
  const expectedClassification = {
    draft: "DRAFT",
    delivery_pending: "DELIVERY_PENDING",
    waiting_on_customer: "WAITING_ON_CUSTOMER",
    approved: "APPROVED",
    declined: "DECLINED",
  }[classification];
  if (expectedClassification && quotes.some((quote) => quote.classification !== expectedClassification)) {
    return null;
  }
  return Object.freeze({
    source: "PROFESSIONAL_QUOTES",
    classification,
    summary,
    quotes: Object.freeze(quotes),
    pagination,
  });
}

export async function fetchProfessionalQuotes({
  classification = "all",
  limit = 50,
  cursor = null,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  if (!FILTERS.includes(classification) || integer(limit, { minimum: 1, maximum: 100 }) == null) {
    throw new ProfessionalQuotesError({
      status: 400,
      code: "INVALID_PROFESSIONAL_QUOTES_READ",
      message: "The Quotes request is invalid.",
    });
  }
  const normalizedCursor = text(cursor, 2000, { nullable: true });
  if (cursor != null && !normalizedCursor) {
    throw new ProfessionalQuotesError({
      status: 400,
      code: "INVALID_PROFESSIONAL_QUOTES_CURSOR",
      message: "The Quotes page is invalid.",
    });
  }
  const query = new URLSearchParams({ classification, limit: String(limit) });
  if (normalizedCursor) query.set("cursor", normalizedCursor);
  const result = await authFetchImpl(
    `/professional/quotes?${query.toString()}`,
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw new ProfessionalQuotesError({
      status: result?.response?.status || 500,
      code: result?.data?.code,
      message: result?.data?.message,
    });
  }
  const quotes = normalizeProfessionalQuotes(result.data, { classification, limit });
  if (!quotes) {
    throw new ProfessionalQuotesError({
      status: 502,
      code: "INVALID_PROFESSIONAL_QUOTES_RESPONSE",
      message: "Quote information could not be verified.",
    });
  }
  return quotes;
}

export function createProfessionalQuotesSourceState() {
  return Object.freeze({
    status: "idle",
    confirmed: null,
    error: "",
    refreshing: false,
    loadingMore: false,
  });
}

export function reduceProfessionalQuotesSourceState(state, action) {
  const current = state || createProfessionalQuotesSourceState();
  if (action?.type === "load") {
    return Object.freeze({
      ...current,
      status: current.confirmed ? "confirmed" : "loading",
      error: "",
      refreshing: Boolean(current.confirmed),
      loadingMore: false,
    });
  }
  if (action?.type === "load-more" && current.confirmed?.pagination?.hasMore) {
    return Object.freeze({
      ...current,
      status: "confirmed",
      error: "",
      refreshing: false,
      loadingMore: true,
    });
  }
  if (action?.type === "success" && action.quotes?.source === "PROFESSIONAL_QUOTES") {
    return Object.freeze({
      status: "confirmed",
      confirmed: action.quotes,
      error: "",
      refreshing: false,
      loadingMore: false,
    });
  }
  if (
    action?.type === "append" &&
    current.confirmed?.source === "PROFESSIONAL_QUOTES" &&
    action.quotes?.source === "PROFESSIONAL_QUOTES" &&
    action.quotes.classification === current.confirmed.classification
  ) {
    const seen = new Set(current.confirmed.quotes.map(({ id }) => id));
    const appended = action.quotes.quotes.filter(({ id }) => !seen.has(id));
    const confirmed = Object.freeze({
      ...current.confirmed,
      summary: action.quotes.summary,
      quotes: Object.freeze([...current.confirmed.quotes, ...appended]),
      pagination: action.quotes.pagination,
    });
    return Object.freeze({
      status: "confirmed",
      confirmed,
      error: "",
      refreshing: false,
      loadingMore: false,
    });
  }
  if (action?.type === "failure") {
    return Object.freeze({
      ...current,
      status: current.confirmed ? "confirmed" : "error",
      error: typeof action.message === "string" ? action.message : "",
      refreshing: false,
      loadingMore: false,
    });
  }
  return current;
}
