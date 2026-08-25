import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUSINESS_STATUSES = Object.freeze([
  "WAITING_ON_CUSTOMER",
  "APPROVED",
  "DECLINED",
]);
const LINEAGE_LABELS = Object.freeze(["Original", "Revised", "Additional"]);
const CUSTOMER_PRIVATE_FIELDS = new Set([
  "authoritySource",
  "issuerParticipantId",
  "relationshipId",
  "materialsSubtotalMinor",
  "laborServiceSubtotalMinor",
  "unitAmountMinor",
  "markup",
  "margin",
  "integrityHash",
  "integrityAlgorithm",
  "idempotencyId",
  "grants",
  "versions",
  "source",
  "internalNotes",
  "retailerReferencePricing",
  "askMeetroEstimatingAssumptions",
]);

export class CustomerQuoteDetailError extends Error {
  constructor({
    status = 500,
    code = "CUSTOMER_QUOTE_DETAIL_FAILED",
    message = "Quote details are temporarily unavailable.",
  } = {}) {
    super(message);
    this.name = "CustomerQuoteDetailError";
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

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}

function nonNegativeInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function positiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function text(value, maximum = 1000) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= maximum ? normalized : null;
}

function optionalText(value, maximum) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length <= maximum ? normalized : null;
}

function normalizeCustomerTermsSnapshot(value) {
  if (
    !exactKeys(value, [
      "schemaVersion",
      "paymentTerms",
      "estimatedDuration",
      "customerNotes",
      "agreement",
    ]) ||
    value.schemaVersion !== 1 ||
    !exactKeys(value.agreement, [
      "exclusions",
      "additionalWorkTerms",
      "hiddenConditionsTerms",
      "diagnosticTerms",
      "customerResponsibilities",
      "warrantyTerms",
      "cancellationTerms",
      "acceptanceTerms",
      "preauthorizedAdditionalWorkLimit",
    ]) ||
    !Array.isArray(value.agreement.exclusions) ||
    value.agreement.exclusions.length > 100
  ) return null;
  const paymentTerms = optionalText(value.paymentTerms, 8000);
  const estimatedDuration = optionalText(value.estimatedDuration, 240);
  const customerNotes = optionalText(value.customerNotes, 8000);
  const agreementLimits = {
    additionalWorkTerms: 8000,
    hiddenConditionsTerms: 8000,
    diagnosticTerms: 8000,
    customerResponsibilities: 8000,
    warrantyTerms: 8000,
    cancellationTerms: 8000,
    acceptanceTerms: 8000,
    preauthorizedAdditionalWorkLimit: 240,
  };
  const agreement = {};
  for (const [key, maximum] of Object.entries(agreementLimits)) {
    agreement[key] = optionalText(value.agreement[key], maximum);
  }
  const exclusions = value.agreement.exclusions.map((item) => text(item, 3000));
  if (
    paymentTerms == null ||
    estimatedDuration == null ||
    customerNotes == null ||
    Object.values(agreement).some((item) => item == null) ||
    exclusions.some((item) => !item)
  ) return null;
  return Object.freeze({
    schemaVersion: 1,
    paymentTerms,
    estimatedDuration,
    customerNotes,
    agreement: Object.freeze({
      exclusions: Object.freeze(exclusions),
      ...agreement,
    }),
  });
}

function timestamp(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function containsPrivateField(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsPrivateField);
  return Object.entries(value).some(
    ([key, child]) =>
      CUSTOMER_PRIVATE_FIELDS.has(key) || containsPrivateField(child)
  );
}

function normalizeScopeItem(value) {
  if (!exactKeys(value, ["description", "quantity", "amountMinor"])) {
    return null;
  }
  const description = text(value.description);
  const quantity = positiveNumber(value.quantity);
  const amountMinor = nonNegativeInteger(value.amountMinor);
  if (!description || !quantity || amountMinor == null) return null;
  return Object.freeze({ description, quantity, amountMinor });
}

function normalizeExclusion(value) {
  if (!exactKeys(value, ["description", "quantity"])) return null;
  const description = text(value.description);
  const quantity = positiveNumber(value.quantity);
  if (!description || !quantity) return null;
  return Object.freeze({ description, quantity });
}

function normalizeActions(value, businessStatus) {
  if (!exactKeys(value, ["canViewQuote", "canApprove", "canDecline"])) {
    return null;
  }
  const pending = businessStatus === "WAITING_ON_CUSTOMER";
  if (
    value.canViewQuote !== true ||
    typeof value.canApprove !== "boolean" ||
    typeof value.canDecline !== "boolean" ||
    (!pending && (value.canApprove || value.canDecline))
  ) {
    return null;
  }
  return Object.freeze({
    canViewQuote: true,
    canApprove: value.canApprove,
    canDecline: value.canDecline,
  });
}

function normalizeQuote(value, { expectedQuoteId, expectedJobId }) {
  const hasCustomerTerms = Object.hasOwn(value || {}, "customerTermsSnapshot");
  if (
    !exactKeys(value, [
      "quoteId",
      "jobId",
      "status",
      "businessStatus",
      "customerDecision",
      "lineageLabel",
      "totalMinor",
      "currency",
      "scopeItems",
      "conditions",
      "exclusions",
      "issuedAt",
      "decidedAt",
      "decisionCommandVersion",
      "actions",
      ...(hasCustomerTerms ? ["customerTermsSnapshot"] : []),
    ])
  ) {
    return null;
  }

  const quoteId = uuid(value.quoteId);
  const jobId = uuid(value.jobId);
  const totalMinor = nonNegativeInteger(value.totalMinor);
  const currency = text(value.currency, 3);
  const issuedAt = timestamp(value.issuedAt);
  const decidedAt = timestamp(value.decidedAt, { nullable: true });
  const decisionCommandVersion = positiveInteger(value.decisionCommandVersion);
  const statusTruth = {
    WAITING_ON_CUSTOMER:
      value.customerDecision == null && value.decidedAt == null,
    APPROVED:
      value.customerDecision === "APPROVED" && Boolean(decidedAt),
    DECLINED:
      value.customerDecision === "DECLINED" && Boolean(decidedAt),
  };
  const actions = normalizeActions(value.actions, value.businessStatus);
  const customerTermsSnapshot = hasCustomerTerms
    ? normalizeCustomerTermsSnapshot(value.customerTermsSnapshot)
    : null;
  const scopeItems = Array.isArray(value.scopeItems)
    ? value.scopeItems.map(normalizeScopeItem)
    : [];
  const conditions = Array.isArray(value.conditions)
    ? value.conditions.map((item) => text(item))
    : [];
  const exclusions = Array.isArray(value.exclusions)
    ? value.exclusions.map(normalizeExclusion)
    : [];

  if (
    quoteId !== expectedQuoteId ||
    !jobId ||
    (expectedJobId && jobId !== expectedJobId) ||
    value.status !== "ISSUED" ||
    !BUSINESS_STATUSES.includes(value.businessStatus) ||
    statusTruth[value.businessStatus] !== true ||
    !LINEAGE_LABELS.includes(value.lineageLabel) ||
    totalMinor == null ||
    !/^[A-Z]{3}$/.test(currency || "") ||
    !issuedAt ||
    !decisionCommandVersion ||
    !actions ||
    (hasCustomerTerms && !customerTermsSnapshot) ||
    scopeItems.some((item) => !item) ||
    conditions.some((item) => !item) ||
    exclusions.some((item) => !item)
  ) {
    return null;
  }

  return Object.freeze({
    quoteId,
    jobId,
    status: "ISSUED",
    businessStatus: value.businessStatus,
    customerDecision: value.customerDecision,
    lineageLabel: value.lineageLabel,
    totalMinor,
    currency,
    scopeItems: Object.freeze(scopeItems),
    conditions: Object.freeze(conditions),
    exclusions: Object.freeze(exclusions),
    issuedAt,
    decidedAt,
    decisionCommandVersion,
    customerTermsSnapshot,
    actions,
  });
}

export function normalizeCustomerQuoteDetail(
  payload,
  { quoteId, jobId = null } = {}
) {
  const expectedQuoteId = uuid(quoteId);
  const expectedJobId = jobId == null ? null : uuid(jobId);
  if (
    !expectedQuoteId ||
    (jobId != null && !expectedJobId) ||
    containsPrivateField(payload) ||
    !exactKeys(payload, ["success", "code", "quote"]) ||
    payload.success !== true ||
    payload.code !== "CUSTOMER_QUOTE_FOUND"
  ) {
    return null;
  }

  const quote = normalizeQuote(payload.quote, {
    expectedQuoteId,
    expectedJobId,
  });
  if (!quote) return null;
  return Object.freeze({ source: "CUSTOMER_QUOTE_DETAIL", quote });
}

export async function fetchCustomerQuoteDetail({
  quoteId,
  jobId = null,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedQuoteId = uuid(quoteId);
  const normalizedJobId = jobId == null ? null : uuid(jobId);
  if (!normalizedQuoteId || (jobId != null && !normalizedJobId)) {
    throw new CustomerQuoteDetailError({
      status: 400,
      code: "INVALID_CUSTOMER_QUOTE_DETAIL_READ",
      message: "The Quote request is invalid.",
    });
  }

  const result = await authFetchImpl(
    `/quotes/${encodeURIComponent(normalizedQuoteId)}/customer`,
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw new CustomerQuoteDetailError({
      status: result?.response?.status || 500,
      code: result?.data?.code,
      message: result?.data?.message,
    });
  }

  const normalized = normalizeCustomerQuoteDetail(result.data, {
    quoteId: normalizedQuoteId,
    jobId: normalizedJobId,
  });
  if (!normalized) {
    throw new CustomerQuoteDetailError({
      status: 502,
      code: containsPrivateField(result.data)
        ? "UNSAFE_CUSTOMER_QUOTE_RESPONSE"
        : "INVALID_CUSTOMER_QUOTE_RESPONSE",
      message: "Quote details could not be verified.",
    });
  }
  return normalized;
}
