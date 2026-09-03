import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const METHOD_PATTERN = /^[A-Z0-9][A-Z0-9_:-]{0,79}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const DEPOSIT_STATES = new Set([
  "NOT_REQUIRED",
  "DUE",
  "PARTIALLY_SATISFIED",
  "SATISFIED",
  "TERMS_UNVERIFIED",
  "SUPERSEDED",
  "VOIDED",
  "UNAVAILABLE",
]);
const READ_CODES = new Set([
  "PRE_WORK_DEPOSIT_FOUND",
  "PRE_WORK_DEPOSIT_RECONCILIATION_REQUIRED",
  "PRE_WORK_DEPOSIT_STATUS_FOUND",
]);

export class PreWorkDepositApiError extends Error {
  constructor({
    status = 500,
    code = "PRE_WORK_DEPOSIT_FAILED",
    message = "Deposit details are temporarily unavailable.",
  } = {}) {
    super(message);
    this.name = "PreWorkDepositApiError";
    this.status = status;
    this.code = code;
  }
}

function uuid(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function integer(value, { positive = false, nullable = false } = {}) {
  if (nullable && value == null) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < (positive ? 1 : 0)) return null;
  return parsed;
}

function text(value, maximum, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= maximum ? normalized : null;
}

function timestamp(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function currency(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  return typeof value === "string" && CURRENCY_PATTERN.test(value) ? value : null;
}

function normalizeDepositRule(value) {
  if (value == null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const percentBasisPoints = integer(value.percentBasisPoints, { positive: true, nullable: true });
  const fixedMinor = integer(value.fixedMinor, { positive: true, nullable: true });
  if (
    (value.type === "PERCENT" &&
      percentBasisPoints && percentBasisPoints <= 10000 && value.fixedMinor == null) ||
    (value.type === "FIXED" && fixedMinor && value.percentBasisPoints == null)
  ) {
    return Object.freeze({ type: value.type, percentBasisPoints, fixedMinor });
  }
  return null;
}

function depositAmountsAreCoherent({ state, requiredMinor, appliedMinor, remainingMinor }) {
  if (state === "NOT_REQUIRED") {
    return requiredMinor === 0 && appliedMinor === 0 && remainingMinor === 0;
  }
  if (state === "TERMS_UNVERIFIED" || state === "UNAVAILABLE") {
    return requiredMinor == null && appliedMinor === 0 && remainingMinor == null;
  }
  if (
    requiredMinor == null || requiredMinor <= 0 || appliedMinor == null ||
    remainingMinor == null || requiredMinor !== appliedMinor + remainingMinor
  ) {
    return false;
  }
  if (state === "DUE") return appliedMinor === 0 && remainingMinor === requiredMinor;
  if (state === "PARTIALLY_SATISFIED") {
    return appliedMinor > 0 && appliedMinor < requiredMinor && remainingMinor > 0;
  }
  if (state === "SATISFIED") return appliedMinor === requiredMinor && remainingMinor === 0;
  return ["SUPERSEDED", "VOIDED"].includes(state);
}

export function normalizePreWorkDepositGate(value, { includeMaterialized = false } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = DEPOSIT_STATES.has(value.state) ? value.state : null;
  const obligationId = uuid(value.obligationId, { nullable: true });
  const requiredMinor = integer(value.requiredMinor, { nullable: true });
  const appliedMinor = integer(value.appliedMinor, { nullable: true });
  const remainingMinor = integer(value.remainingMinor, { nullable: true });
  const latestVersion = integer(value.latestVersion, { positive: true, nullable: true });
  const normalizedCurrency = currency(value.currency, { nullable: true });
  const materialized = includeMaterialized ? value.materialized : obligationId != null;
  if (
    !state ||
    (value.obligationId != null && !obligationId) ||
    (value.currency != null && !normalizedCurrency) ||
    typeof value.schedulingLocked !== "boolean" ||
    (includeMaterialized && typeof materialized !== "boolean") ||
    (includeMaterialized && materialized !== Boolean(obligationId)) ||
    (materialized && !obligationId) ||
    (obligationId && !latestVersion) ||
    (["PARTIALLY_SATISFIED", "SATISFIED", "SUPERSEDED", "VOIDED"].includes(state) &&
      !obligationId) ||
    (!depositAmountsAreCoherent({ state, requiredMinor, appliedMinor, remainingMinor })) ||
    (["NOT_REQUIRED", "SATISFIED"].includes(state) === value.schedulingLocked) ||
    (["SUPERSEDED", "VOIDED"].includes(state) && !value.schedulingLocked)
  ) {
    return null;
  }
  return Object.freeze({
    state,
    obligationId,
    ...(includeMaterialized ? { materialized } : {}),
    requiredMinor,
    appliedMinor,
    remainingMinor,
    currency: normalizedCurrency,
    latestVersion,
    schedulingLocked: value.schedulingLocked === true,
  });
}

function normalizePaymentHistoryItem(value, expectedCurrency) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const receiptId = uuid(value.receiptId);
  const grossAmountMinor = integer(value.grossAmountMinor, { positive: true });
  const allocatedMinor = integer(value.allocatedMinor);
  const reversedMinor = integer(value.reversedMinor);
  const netAppliedMinor = integer(value.netAppliedMinor);
  const unappliedMinor = integer(value.unappliedMinor);
  const normalizedCurrency = currency(value.currency);
  const normalizedMethod = text(value.normalizedMethod, 80);
  const displayMethod = text(value.displayMethod, 160, { nullable: true });
  const externalReference = text(value.externalReference, 300, { nullable: true });
  const receivedAt = timestamp(value.receivedAt);
  if (
    !receiptId || !grossAmountMinor || normalizedCurrency !== expectedCurrency ||
    !normalizedMethod || !METHOD_PATTERN.test(normalizedMethod) || !receivedAt ||
    value.evidenceSource !== "MANUAL_EXTERNAL" ||
    allocatedMinor == null || reversedMinor == null || netAppliedMinor == null ||
    unappliedMinor == null || allocatedMinor > grossAmountMinor ||
    reversedMinor > allocatedMinor || netAppliedMinor !== allocatedMinor - reversedMinor ||
    unappliedMinor !== grossAmountMinor - allocatedMinor ||
    (value.displayMethod != null && !displayMethod) ||
    (value.externalReference != null && !externalReference)
  ) {
    return null;
  }
  return Object.freeze({
    receiptId,
    grossAmountMinor,
    currency: normalizedCurrency,
    evidenceSource: value.evidenceSource === "MANUAL_EXTERNAL" ? value.evidenceSource : null,
    normalizedMethod,
    displayMethod,
    externalReference,
    receivedAt,
    allocatedMinor,
    reversedMinor,
    netAppliedMinor,
    unappliedMinor,
  });
}

export function normalizePreWorkDeposit(value, { jobId = "", quoteId = "" } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const normalizedJobId = uuid(value.jobId);
  const normalizedQuoteId = uuid(value.quoteId);
  const expectedJobId = jobId ? uuid(jobId) : normalizedJobId;
  const expectedQuoteId = quoteId ? uuid(quoteId) : normalizedQuoteId;
  const gate = normalizePreWorkDepositGate(value, { includeMaterialized: true });
  const issuedQuoteVersion = integer(value.issuedQuoteVersion, { positive: true });
  const hasQuoteApprovalId = Object.hasOwn(value, "quoteApprovalId");
  const hasApprovalSource = Object.hasOwn(value, "approvalSource");
  const customerDecisionId =
    value.customerDecisionId == null ? null : uuid(value.customerDecisionId);
  const quoteApprovalId = hasQuoteApprovalId
    ? value.quoteApprovalId == null
      ? null
      : uuid(value.quoteApprovalId)
    : null;
  const approvalSource = hasApprovalSource
    ? value.approvalSource == null
      ? null
      : ["MEETRO_CUSTOMER", "EXTERNAL_EVIDENCE"].includes(value.approvalSource)
        ? value.approvalSource
        : undefined
    : null;
  const quoteTotalMinor = integer(value.quoteTotalMinor, { positive: true });
  const depositRule = normalizeDepositRule(value.depositRule);

  const externalApproval = approvalSource === "EXTERNAL_EVIDENCE";
  const meetroApproval = approvalSource === "MEETRO_CUSTOMER";
  const legacyDecisionAuthority =
    !hasQuoteApprovalId && !hasApprovalSource;

  if (
    Number(value.contractVersion) !== 1 || !gate ||
    normalizedJobId !== expectedJobId || normalizedQuoteId !== expectedQuoteId ||
    !issuedQuoteVersion || !quoteTotalMinor ||
    !gate.currency || !Array.isArray(value.paymentHistory) ||
    hasQuoteApprovalId !== hasApprovalSource ||
    approvalSource === undefined ||
    (value.customerDecisionId != null && !customerDecisionId) ||
    (hasQuoteApprovalId && value.quoteApprovalId != null && !quoteApprovalId) ||
    (externalApproval && (!quoteApprovalId || customerDecisionId)) ||
    (meetroApproval && (!quoteApprovalId || !customerDecisionId)) ||
    (legacyDecisionAuthority && !customerDecisionId) ||
    (gate.state === "NOT_REQUIRED" && value.depositRule != null) ||
    (["DUE", "PARTIALLY_SATISFIED", "SATISFIED", "SUPERSEDED", "VOIDED"].includes(gate.state) &&
      !depositRule) ||
    (gate.requiredMinor != null && gate.requiredMinor > quoteTotalMinor) ||
    (depositRule?.type === "FIXED" && depositRule.fixedMinor !== gate.requiredMinor) ||
    (value.depositRule != null && !depositRule)
  ) {
    return null;
  }
  const paymentHistory = value.paymentHistory.map((item) =>
    normalizePaymentHistoryItem(item, gate.currency)
  );
  if (paymentHistory.some((item) => !item)) return null;
  return Object.freeze({
    contractVersion: 1,
    jobId: normalizedJobId,
    quoteId: normalizedQuoteId,
    issuedQuoteVersion,
    customerDecisionId,
    ...(hasQuoteApprovalId ? { quoteApprovalId } : {}),
    ...(hasApprovalSource ? { approvalSource } : {}),
    quoteTotalMinor,
    depositRule,
    paymentHistory: Object.freeze(paymentHistory),
    ...gate,
  });
}

function normalizePaymentResult(value, expectedCurrency) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const receiptId = uuid(value.receiptId);
  const allocationId = uuid(value.allocationId);
  const grossAmountMinor = integer(value.grossAmountMinor, { positive: true });
  const allocatedMinor = integer(value.allocatedMinor);
  const unappliedMinor = integer(value.unappliedMinor);
  const normalizedCurrency = currency(value.currency);
  const receivedAt = timestamp(value.receivedAt);
  if (
    !receiptId || !allocationId || !grossAmountMinor ||
    allocatedMinor == null || unappliedMinor == null ||
    grossAmountMinor !== allocatedMinor + unappliedMinor ||
    normalizedCurrency !== expectedCurrency || !receivedAt ||
    value.evidenceSource !== "MANUAL_EXTERNAL"
  ) {
    return null;
  }
  return Object.freeze({
    receiptId,
    allocationId,
    evidenceSource: value.evidenceSource,
    grossAmountMinor,
    allocatedMinor,
    unappliedMinor,
    currency: normalizedCurrency,
    receivedAt,
  });
}

function validIdempotencyKey(value) {
  return typeof value === "string" && IDEMPOTENCY_PATTERN.test(value.trim());
}

export function createPreWorkDepositPaymentKey(cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider || typeof cryptoProvider.randomUUID !== "function") {
    throw new PreWorkDepositApiError({
      code: "PRE_WORK_DEPOSIT_IDEMPOTENCY_UNAVAILABLE",
      message: "Payment confirmation is unavailable on this device.",
    });
  }
  return `pre-work-deposit:payment:${cryptoProvider.randomUUID()}`;
}

export function majorAmountToMinor(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [major, fraction = ""] = normalized.split(".");
  const minor = Number(major) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export function normalizeExternalPaymentMethod({ method, customMethod = "" } = {}) {
  const selected = typeof method === "string" ? method.trim() : "";
  if (selected !== "OTHER") {
    const normalizedMethod = selected.toUpperCase();
    return METHOD_PATTERN.test(normalizedMethod)
      ? { normalizedMethod, displayMethod: null }
      : null;
  }
  const displayMethod = text(customMethod, 160);
  const normalizedMethod = displayMethod
    ?.normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .slice(0, 80);
  return displayMethod && normalizedMethod && METHOD_PATTERN.test(normalizedMethod)
    ? { normalizedMethod, displayMethod }
    : null;
}

async function request(endpoint, options, setPage, authFetchImpl) {
  const result = await authFetchImpl(endpoint, options, setPage);
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw new PreWorkDepositApiError({
      status: result?.response?.status || 500,
      code: result?.data?.code,
      message: result?.data?.message,
    });
  }
  return result.data;
}

export async function fetchProfessionalPreWorkDeposit({
  jobId,
  quoteId = "",
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedJobId = uuid(jobId);
  if (!normalizedJobId || (quoteId && !uuid(quoteId))) {
    throw new PreWorkDepositApiError({ status: 400, code: "INVALID_PRE_WORK_DEPOSIT_JOB" });
  }
  const data = await request(
    `/jobs/${encodeURIComponent(normalizedJobId)}/pre-work-deposit`,
    { method: "GET", cache: "no-store" },
    setPage,
    authFetchImpl
  );
  if (!READ_CODES.has(data.code)) {
    throw new PreWorkDepositApiError({ status: 502, code: "UNSAFE_PRE_WORK_DEPOSIT_RESPONSE" });
  }
  const deposit = normalizePreWorkDeposit(data.deposit, { jobId: normalizedJobId, quoteId });
  if (!deposit) {
    throw new PreWorkDepositApiError({ status: 502, code: "UNSAFE_PRE_WORK_DEPOSIT_RESPONSE" });
  }
  return Object.freeze({
    code: data.code,
    reconciliationRequired: data.code === "PRE_WORK_DEPOSIT_RECONCILIATION_REQUIRED",
    deposit,
  });
}

export async function confirmProfessionalPreWorkDepositReceived({
  jobId,
  amountMinor,
  currency: paymentCurrency,
  normalizedMethod,
  displayMethod = null,
  externalReference = null,
  receivedAt,
  expectedVersion = null,
  idempotencyKey,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedJobId = uuid(jobId);
  const normalizedAmount = integer(amountMinor, { positive: true });
  const normalizedCurrency = currency(paymentCurrency);
  const method = text(normalizedMethod, 80);
  const display = text(displayMethod, 160, { nullable: true });
  const reference = text(externalReference, 300, { nullable: true });
  const instant = timestamp(receivedAt);
  const version = integer(expectedVersion, { positive: true, nullable: true });
  if (
    !normalizedJobId || !normalizedAmount || !normalizedCurrency ||
    !method || !METHOD_PATTERN.test(method) || !instant ||
    !validIdempotencyKey(idempotencyKey) ||
    (displayMethod != null && !display) ||
    (externalReference != null && !reference) ||
    (expectedVersion != null && !version)
  ) {
    throw new PreWorkDepositApiError({
      status: 400,
      code: "INVALID_PRE_WORK_DEPOSIT_PAYMENT",
      message: "Enter valid payment details before confirming receipt.",
    });
  }
  const body = {
    amountMinor: normalizedAmount,
    currency: normalizedCurrency,
    normalizedMethod: method,
    displayMethod: display,
    externalReference: reference,
    receivedAt: instant,
    expectedVersion: version,
  };
  const data = await request(
    `/jobs/${encodeURIComponent(normalizedJobId)}/pre-work-deposit/payments`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Idempotency-Key": idempotencyKey.trim() },
      body: JSON.stringify(body),
    },
    setPage,
    authFetchImpl
  );
  const deposit = normalizePreWorkDeposit(data.deposit, { jobId: normalizedJobId });
  const payment = normalizePaymentResult(data.payment, normalizedCurrency);
  if (data.code !== "PRE_WORK_DEPOSIT_PAYMENT_CONFIRMED" || !deposit || !payment) {
    throw new PreWorkDepositApiError({ status: 502, code: "UNSAFE_PRE_WORK_DEPOSIT_RESPONSE" });
  }
  return Object.freeze({ deposit, payment, replayed: data.replayed === true });
}

export function formatDepositMoney(minor, currencyCode) {
  if (!Number.isSafeInteger(minor) || minor < 0 || !currency(currencyCode)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currencyCode}`;
  }
}
