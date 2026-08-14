import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECISIONS = Object.freeze({ approve: "APPROVED", decline: "DECLINED" });
const CONFLICT_CODES = new Set([
  "ISSUED_QUOTE_VERSION_REQUIRED",
  "QUOTE_DECISION_FINAL",
  "STALE_QUOTE_VERSION",
]);

export class CustomerQuoteDecisionError extends Error {
  constructor({
    status = 500,
    code = "CUSTOMER_QUOTE_DECISION_FAILED",
    message = "Your Quote decision could not be saved.",
  } = {}) {
    super(message);
    this.name = "CustomerQuoteDecisionError";
    this.status = status;
    this.code = code;
  }
}

function uuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function validIdempotencyKey(value) {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(value.trim())
  );
}

export function createCustomerQuoteDecisionKey(
  action,
  cryptoProvider = globalThis.crypto
) {
  if (
    !DECISIONS[action] ||
    !cryptoProvider ||
    typeof cryptoProvider.randomUUID !== "function"
  ) {
    throw new CustomerQuoteDecisionError({
      code: "CUSTOMER_QUOTE_DECISION_IDEMPOTENCY_UNAVAILABLE",
      message: "Quote decisions are unavailable on this device.",
    });
  }
  return `customer-quote:${action}:${cryptoProvider.randomUUID()}`;
}

export function isCustomerQuoteDecisionConflict(error) {
  return error?.status === 409 && CONFLICT_CODES.has(error?.code);
}

export async function decideCustomerQuote({
  quoteId,
  action,
  expectedIssuedVersion,
  idempotencyKey,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedQuoteId = uuid(quoteId);
  const version = Number(expectedIssuedVersion);
  if (
    !normalizedQuoteId ||
    !DECISIONS[action] ||
    !Number.isSafeInteger(version) ||
    version < 1 ||
    !validIdempotencyKey(idempotencyKey)
  ) {
    throw new CustomerQuoteDecisionError({
      status: 400,
      code: "INVALID_CUSTOMER_QUOTE_DECISION",
      message: "The Quote decision is invalid.",
    });
  }

  const result = await authFetchImpl(
    `/quotes/${encodeURIComponent(normalizedQuoteId)}/${action}`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Idempotency-Key": idempotencyKey.trim() },
      body: JSON.stringify({ expectedIssuedVersion: version }),
    },
    setPage
  );

  if (
    !result?.response?.ok ||
    result?.data?.success !== true ||
    result?.data?.code !== "QUOTE_CUSTOMER_DECISION_RECORDED"
  ) {
    throw new CustomerQuoteDecisionError({
      status: result?.response?.status || 500,
      code: result?.data?.code,
      message: result?.data?.message,
    });
  }

  return Object.freeze({
    quoteId: normalizedQuoteId,
    decision: DECISIONS[action],
    saved: true,
  });
}
