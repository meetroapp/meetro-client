import { authFetch } from "./authFetch.js";
import { normalizeCustomerTermsSnapshot } from "./customerQuoteDetailApi.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUSINESS_STATUSES = new Set([
  "WAITING_ON_CUSTOMER",
  "APPROVED",
  "DECLINED",
]);
const LINEAGE_LABELS = new Set(["Original", "Revised", "Additional"]);
const PRIVATE_FIELDS = new Set([
  "authoritySource",
  "issuerParticipantId",
  "relationshipId",
  "materialsSubtotalMinor",
  "laborServiceSubtotalMinor",
  "unitAmountMinor",
  "materialCostMinor",
  "laborCostMinor",
  "markupMinor",
  "marginMinor",
  "integrityHash",
  "integrityAlgorithm",
  "idempotencyKey",
  "deliveryIdempotencyKey",
  "deliveryRequestFingerprint",
  "grants",
  "versions",
  "source",
  "internalNotes",
  "professionalNotes",
  "retailerReference",
  "retailerReferencePricing",
  "askMeetroAssumption",
  "askMeetroEstimatingAssumptions",
]);

export class QuoteDeliveryError extends Error {
  constructor({
    status = 500,
    code = "QUOTE_DELIVERY_FAILED",
    message = "Quote delivery is temporarily unavailable.",
  } = {}) {
    super(message);
    this.name = "QuoteDeliveryError";
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
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function nonNegativeInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function positiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function text(value, maximum = 1000, { nullable = false } = {}) {
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

function containsPrivateField(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsPrivateField);
  return Object.entries(value).some(
    ([key, child]) => PRIVATE_FIELDS.has(key) || containsPrivateField(child)
  );
}

function normalizeScopeItem(value) {
  if (!exactKeys(value, ["description", "quantity", "amountMinor"])) {
    return null;
  }
  const description = text(value.description);
  const quantity = positiveNumber(value.quantity);
  const amountMinor = nonNegativeInteger(value.amountMinor);
  return description && quantity && amountMinor != null
    ? Object.freeze({ description, quantity, amountMinor })
    : null;
}

function normalizeExclusion(value) {
  if (!exactKeys(value, ["description", "quantity"])) return null;
  const description = text(value.description);
  const quantity = positiveNumber(value.quantity);
  return description && quantity
    ? Object.freeze({ description, quantity })
    : null;
}

export function normalizeQuoteDeliverySnapshot(
  value,
  { quoteId, jobId } = {}
) {
  const hasCustomerTerms = Object.hasOwn(value || {}, "customerTermsSnapshot");
  const hasQuoteNumber = Object.hasOwn(value || {}, "quoteNumber");
  if (
    containsPrivateField(value) ||
    !exactKeys(value, [
      "schemaVersion",
      "quoteId",
      "jobId",
      ...(hasQuoteNumber ? ["quoteNumber"] : []),
      "lineageLabel",
      "businessStatus",
      "totalMinor",
      "currency",
      "scopeItems",
      "conditions",
      "exclusions",
      "issuedAt",
      "decidedAt",
      "business",
      "job",
      ...(hasCustomerTerms ? ["customerTermsSnapshot"] : []),
    ]) ||
    value.schemaVersion !== 1
  ) return null;

  const normalizedQuoteId = uuid(value.quoteId);
  const normalizedJobId = uuid(value.jobId);
  const expectedQuoteId = quoteId == null ? normalizedQuoteId : uuid(quoteId);
  const expectedJobId = jobId == null ? normalizedJobId : uuid(jobId);
  const totalMinor = nonNegativeInteger(value.totalMinor);
  const quoteNumber = hasQuoteNumber ? text(value.quoteNumber, 80) : "Quote";
  const currency = text(value.currency, 3);
  const issuedAt = timestamp(value.issuedAt);
  const decidedAt = timestamp(value.decidedAt, { nullable: true });
  const scopeItems = Array.isArray(value.scopeItems)
    ? value.scopeItems.map(normalizeScopeItem)
    : [];
  const conditions = Array.isArray(value.conditions)
    ? value.conditions.map((item) => text(item))
    : [];
  const exclusions = Array.isArray(value.exclusions)
    ? value.exclusions.map(normalizeExclusion)
    : [];
  const businessName = exactKeys(value.business, ["displayName"])
    ? text(value.business.displayName, 200)
    : null;
  const jobTitle = exactKeys(value.job, ["title", "service"])
    ? text(value.job.title, 200)
    : null;
  const jobService = exactKeys(value.job, ["title", "service"])
    ? text(value.job.service, 120, { nullable: true })
    : null;
  const customerTermsSnapshot = hasCustomerTerms
    ? normalizeCustomerTermsSnapshot(value.customerTermsSnapshot)
    : null;
  const decisionTruth = {
    WAITING_ON_CUSTOMER: decidedAt == null,
    APPROVED: Boolean(decidedAt),
    DECLINED: Boolean(decidedAt),
  };

  if (
    !normalizedQuoteId ||
    !normalizedJobId ||
    normalizedQuoteId !== expectedQuoteId ||
    normalizedJobId !== expectedJobId ||
    !LINEAGE_LABELS.has(value.lineageLabel) ||
    !quoteNumber ||
    !BUSINESS_STATUSES.has(value.businessStatus) ||
    decisionTruth[value.businessStatus] !== true ||
    totalMinor == null ||
    !/^[A-Z]{3}$/.test(currency || "") ||
    !issuedAt ||
    scopeItems.some((item) => !item) ||
    conditions.some((item) => !item) ||
    exclusions.some((item) => !item) ||
    !businessName ||
    !jobTitle ||
    (hasCustomerTerms && !customerTermsSnapshot) ||
    (value.job.service != null && !jobService)
  ) return null;

  return Object.freeze({
    schemaVersion: 1,
    quoteId: normalizedQuoteId,
    jobId: normalizedJobId,
    quoteNumber,
    lineageLabel: value.lineageLabel,
    businessStatus: value.businessStatus,
    totalMinor,
    currency,
    scopeItems: Object.freeze(scopeItems),
    conditions: Object.freeze(conditions),
    exclusions: Object.freeze(exclusions),
    issuedAt,
    decidedAt,
    business: Object.freeze({ displayName: businessName }),
    job: Object.freeze({ title: jobTitle, service: jobService }),
    customerTermsSnapshot,
  });
}

export function normalizeProfessionalQuoteDelivery(
  payload,
  { quoteId, jobId } = {}
) {
  const expectedQuoteId = uuid(quoteId);
  const expectedJobId = uuid(jobId);
  if (
    !expectedQuoteId ||
    !expectedJobId ||
    containsPrivateField(payload) ||
    !exactKeys(payload, ["success", "code", "delivery"]) ||
    payload.success !== true ||
    payload.code !== "PROFESSIONAL_QUOTE_DELIVERY_LOADED" ||
    !exactKeys(payload.delivery, [
      "quoteId",
      "jobId",
      "expectedIssuedVersion",
      "messageType",
      "snapshot",
      "actions",
      "conversation",
      "existingDelivery",
    ])
  ) return null;

  const delivery = payload.delivery;
  const normalizedQuoteId = uuid(delivery.quoteId);
  const normalizedJobId = uuid(delivery.jobId);
  const expectedIssuedVersion = positiveInteger(delivery.expectedIssuedVersion);
  const snapshot = normalizeQuoteDeliverySnapshot(delivery.snapshot, {
    quoteId: expectedQuoteId,
    jobId: expectedJobId,
  });
  const actions = exactKeys(delivery.actions, ["canSendInMeetro"])
    ? delivery.actions
    : null;
  const conversationId = delivery.conversation == null
    ? null
    : exactKeys(delivery.conversation, ["id"])
      ? positiveInteger(delivery.conversation.id)
      : null;
  const existingDelivery = delivery.existingDelivery == null
    ? null
    : normalizeQuoteDeliveryEvidence(
        {
          success: true,
          code: "QUOTE_SENT_IN_MEETRO",
          delivery: delivery.existingDelivery,
        },
        {
          quoteId: expectedQuoteId,
          jobId: expectedJobId,
          conversationId,
        }
      );

  if (
    normalizedQuoteId !== expectedQuoteId ||
    normalizedJobId !== expectedJobId ||
    !expectedIssuedVersion ||
    delivery.messageType !== "QUOTE_SHARED" ||
    !snapshot ||
    !actions ||
    typeof actions.canSendInMeetro !== "boolean" ||
    (actions.canSendInMeetro && !conversationId) ||
    (!actions.canSendInMeetro && delivery.conversation != null) ||
    (delivery.existingDelivery != null && !existingDelivery)
  ) return null;

  return Object.freeze({
    source: "PROFESSIONAL_QUOTE_DELIVERY",
    quoteId: normalizedQuoteId,
    jobId: normalizedJobId,
    expectedIssuedVersion,
    snapshot,
    canSendInMeetro: actions.canSendInMeetro,
    conversationId,
    existingDelivery,
  });
}

export function normalizeQuoteDeliveryEvidence(
  payload,
  { quoteId, jobId, conversationId } = {}
) {
  if (
    !exactKeys(payload, ["success", "code", "delivery"]) ||
    payload.success !== true ||
    payload.code !== "QUOTE_SENT_IN_MEETRO" ||
    !exactKeys(payload.delivery, [
      "messageId",
      "conversationId",
      "quoteId",
      "jobId",
      "messageType",
      "state",
      "sentAt",
      "replayed",
    ])
  ) return null;
  const delivery = payload.delivery;
  const messageId = positiveInteger(delivery.messageId);
  const normalizedConversationId = positiveInteger(delivery.conversationId);
  const normalizedQuoteId = uuid(delivery.quoteId);
  const normalizedJobId = uuid(delivery.jobId);
  const sentAt = timestamp(delivery.sentAt);
  if (
    !messageId ||
    normalizedConversationId !== positiveInteger(conversationId) ||
    normalizedQuoteId !== uuid(quoteId) ||
    normalizedJobId !== uuid(jobId) ||
    delivery.messageType !== "QUOTE_SHARED" ||
    delivery.state !== "SENT_IN_MEETRO" ||
    !sentAt ||
    typeof delivery.replayed !== "boolean"
  ) return null;
  return Object.freeze({
    messageId,
    conversationId: normalizedConversationId,
    quoteId: normalizedQuoteId,
    jobId: normalizedJobId,
    sentAt,
    replayed: delivery.replayed,
  });
}

function responseError(result, fallbackCode) {
  return new QuoteDeliveryError({
    status: result?.response?.status || 500,
    code: result?.data?.code || fallbackCode,
    message: result?.data?.message,
  });
}

export async function fetchProfessionalQuoteDelivery({
  quoteId,
  jobId,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedQuoteId = uuid(quoteId);
  const normalizedJobId = uuid(jobId);
  if (!normalizedQuoteId || !normalizedJobId) {
    throw new QuoteDeliveryError({ status: 400, code: "INVALID_QUOTE_DELIVERY" });
  }
  const result = await authFetchImpl(
    `/professional/quotes/${normalizedQuoteId}/delivery`,
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw responseError(result, "QUOTE_DELIVERY_FAILED");
  }
  const delivery = normalizeProfessionalQuoteDelivery(result.data, {
    quoteId: normalizedQuoteId,
    jobId: normalizedJobId,
  });
  if (!delivery) {
    throw new QuoteDeliveryError({
      status: 502,
      code: "UNSAFE_PROFESSIONAL_QUOTE_DELIVERY_RESPONSE",
      message: "Quote delivery information could not be verified.",
    });
  }
  return delivery;
}

export function createQuoteDeliveryIdempotencyKey(
  randomUuid = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
) {
  if (typeof randomUuid !== "function") {
    throw new QuoteDeliveryError({
      status: 500,
      code: "QUOTE_DELIVERY_IDEMPOTENCY_UNAVAILABLE",
    });
  }
  return `quote-delivery-${randomUuid()}`;
}

export async function sendProfessionalQuoteInMeetro({
  delivery,
  idempotencyKey,
  deliveryIntent = "INITIAL",
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedIntent = ["INITIAL", "COPY"].includes(deliveryIntent)
    ? deliveryIntent
    : null;
  if (
    delivery?.source !== "PROFESSIONAL_QUOTE_DELIVERY" ||
    delivery.canSendInMeetro !== true ||
    !positiveInteger(delivery.conversationId) ||
    !normalizedIntent ||
    (normalizedIntent === "COPY" && !delivery.existingDelivery) ||
    typeof idempotencyKey !== "string" ||
    !idempotencyKey.trim() ||
    idempotencyKey.length > 200
  ) {
    throw new QuoteDeliveryError({ status: 400, code: "INVALID_QUOTE_DELIVERY" });
  }
  if (normalizedIntent === "INITIAL" && delivery.existingDelivery) {
    return delivery.existingDelivery;
  }
  const result = await authFetchImpl(
    `/professional/quotes/${delivery.quoteId}/send-in-meetro`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey.trim() },
      body: JSON.stringify({
        expectedIssuedVersion: delivery.expectedIssuedVersion,
        deliveryIntent: normalizedIntent,
      }),
    },
    setPage
  );
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw responseError(result, "QUOTE_DELIVERY_FAILED");
  }
  const evidence = normalizeQuoteDeliveryEvidence(result.data, delivery);
  if (!evidence) {
    throw new QuoteDeliveryError({
      status: 502,
      code: "UNSAFE_QUOTE_DELIVERY_RESPONSE",
      message: "Quote delivery could not be verified.",
    });
  }
  return evidence;
}
