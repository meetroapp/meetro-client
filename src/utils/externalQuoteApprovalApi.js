import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const EXTERNAL_QUOTE_APPROVAL_METHODS = Object.freeze([
  "PHONE",
  "EMAIL",
  "TEXT_MESSAGE",
  "IN_PERSON",
  "SIGNED_QUOTE",
  "OTHER",
]);

export class ExternalQuoteApprovalApiError extends Error {
  constructor({
    status = 500,
    code = "EXTERNAL_QUOTE_APPROVAL_FAILED",
    message = "Customer approval evidence could not be recorded.",
  } = {}) {
    super(message);
    this.name = "ExternalQuoteApprovalApiError";
    this.status = status;
    this.code = code;
  }
}

function uuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function timestamp(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed > Date.now() + (5 * 60 * 1000)) return null;
  return new Date(parsed).toISOString();
}

function optionalText(value, maximum) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum
    ? normalized
    : undefined;
}

function exact(value, keys) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...keys].sort())
  );
}

function validCommandKey(value) {
  const normalized = String(value || "").trim();
  const prefix = "quote-external-approval-";
  return normalized.startsWith(prefix) &&
    uuid(normalized.slice(prefix.length)) != null;
}

export function createExternalQuoteApprovalKey(
  cryptoProvider = globalThis.crypto
) {
  const identity = cryptoProvider?.randomUUID?.();
  if (!uuid(identity)) {
    throw new ExternalQuoteApprovalApiError({
      status: 500,
      code: "EXTERNAL_QUOTE_APPROVAL_IDENTITY_UNAVAILABLE",
      message: "A secure approval command identity is unavailable.",
    });
  }
  return `quote-external-approval-${identity}`;
}

function normalizeApproval(value, expected) {
  if (
    !exact(value, [
      "id",
      "source",
      "issuedQuoteVersion",
      "approvedAt",
      "externalEvidence",
    ])
  ) return null;

  if (
    !exact(value.externalEvidence, [
      "id",
      "method",
      "recordedByParticipantId",
      "reference",
      "note",
    ])
  ) return null;

  const id = uuid(value.id);
  const evidenceId = uuid(value.externalEvidence.id);
  const participantId = uuid(
    value.externalEvidence.recordedByParticipantId
  );
  const issuedQuoteVersion = positiveInteger(
    value.issuedQuoteVersion
  );
  const approvedAt = timestamp(value.approvedAt);
  const reference = optionalText(
    value.externalEvidence.reference,
    1000
  );
  const note = optionalText(
    value.externalEvidence.note,
    8000
  );

  if (
    !id ||
    !evidenceId ||
    !participantId ||
    value.source !== "EXTERNAL_EVIDENCE" ||
    issuedQuoteVersion !== expected.issuedQuoteVersion ||
    !approvedAt ||
    value.externalEvidence.method !== expected.method ||
    (value.externalEvidence.reference != null &&
      reference === undefined) ||
    (value.externalEvidence.note != null &&
      note === undefined)
  ) {
    return null;
  }

  return Object.freeze({
    id,
    source: "EXTERNAL_EVIDENCE",
    issuedQuoteVersion,
    approvedAt,
    externalEvidence: Object.freeze({
      id: evidenceId,
      method: value.externalEvidence.method,
      recordedByParticipantId: participantId,
      reference,
      note,
    }),
  });
}

function normalizeExternalApproval(value, expected) {
  if (
    !exact(value, [
      "approvalId",
      "evidenceId",
      "quoteId",
      "issuedQuoteVersion",
      "method",
      "approvedAt",
      "reference",
      "note",
    ])
  ) return null;

  const approvalId = uuid(value.approvalId);
  const evidenceId = uuid(value.evidenceId);
  const quoteId = uuid(value.quoteId);
  const issuedQuoteVersion = positiveInteger(
    value.issuedQuoteVersion
  );
  const approvedAt = timestamp(value.approvedAt);
  const reference = optionalText(value.reference, 1000);
  const note = optionalText(value.note, 8000);

  if (
    !approvalId ||
    !evidenceId ||
    quoteId !== expected.quoteId ||
    issuedQuoteVersion !== expected.issuedQuoteVersion ||
    value.method !== expected.method ||
    !approvedAt ||
    (value.reference != null && reference === undefined) ||
    (value.note != null && note === undefined)
  ) {
    return null;
  }

  return Object.freeze({
    approvalId,
    evidenceId,
    quoteId,
    issuedQuoteVersion,
    method: value.method,
    approvedAt,
    reference,
    note,
  });
}

export async function recordExternalQuoteApproval({
  quote,
  evidenceMethod,
  approvedAt,
  evidenceReference = null,
  evidenceNote = null,
  idempotencyKey,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const quoteId = uuid(quote?.id);
  const issuedQuoteVersion = positiveInteger(
    quote?.currentVersion
  );
  const method = EXTERNAL_QUOTE_APPROVAL_METHODS.includes(
    evidenceMethod
  )
    ? evidenceMethod
    : null;
  const normalizedApprovedAt = timestamp(approvedAt);
  const reference = optionalText(evidenceReference, 1000);
  const note = optionalText(evidenceNote, 8000);

  if (
    !quoteId ||
    quote?.status !== "ISSUED" ||
    quote?.requestId != null ||
    quote?.relationshipId != null ||
    quote?.decisionState != null ||
    quote?.approval != null ||
    !issuedQuoteVersion ||
    !method ||
    !normalizedApprovedAt ||
    reference === undefined ||
    note === undefined ||
    (!reference && !note) ||
    !validCommandKey(idempotencyKey)
  ) {
    throw new ExternalQuoteApprovalApiError({
      status: 400,
      code: "INVALID_QUOTE_EXTERNAL_APPROVAL",
      message:
        "Exact issued external Quote authority and real customer approval evidence are required.",
    });
  }

  const result = await authFetchImpl(
    `/quotes/${encodeURIComponent(quoteId)}/external-approval`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        expectedIssuedVersion: issuedQuoteVersion,
        evidenceMethod: method,
        approvedAt: normalizedApprovedAt,
        evidenceReference: reference,
        evidenceNote: note,
      }),
    },
    setPage
  );

  if (
    !result?.response?.ok ||
    result?.data?.success !== true
  ) {
    throw new ExternalQuoteApprovalApiError({
      status: result?.response?.status || 500,
      code:
        result?.data?.code ||
        "EXTERNAL_QUOTE_APPROVAL_FAILED",
      message:
        result?.data?.message ||
        "Customer approval evidence could not be recorded.",
    });
  }

  if (
    result.data.code !==
      "QUOTE_EXTERNAL_APPROVAL_RECORDED"
  ) {
    throw new ExternalQuoteApprovalApiError({
      status: 502,
      code: "UNSAFE_QUOTE_EXTERNAL_APPROVAL_RESPONSE",
    });
  }

  const expected = {
    quoteId,
    issuedQuoteVersion,
    method,
  };

  const externalApproval = normalizeExternalApproval(
    result.data.externalApproval,
    expected
  );

  const responseQuote = result.data.quote;
  const responseQuoteId = uuid(responseQuote?.id);
  const responseVersion = positiveInteger(
    responseQuote?.currentVersion
  );
  const approval = normalizeApproval(
    responseQuote?.approval,
    expected
  );

  if (
    !externalApproval ||
    responseQuoteId !== quoteId ||
    responseQuote?.status !== "ISSUED" ||
    responseVersion !== issuedQuoteVersion ||
    responseQuote?.requestId != null ||
    responseQuote?.relationshipId != null ||
    responseQuote?.decisionState != null ||
    !approval ||
    approval.id !== externalApproval.approvalId ||
    approval.externalEvidence.id !==
      externalApproval.evidenceId ||
    approval.approvedAt !== externalApproval.approvedAt ||
    approval.externalEvidence.reference !==
      externalApproval.reference ||
    approval.externalEvidence.note !==
      externalApproval.note
  ) {
    throw new ExternalQuoteApprovalApiError({
      status: 502,
      code: "UNSAFE_QUOTE_EXTERNAL_APPROVAL_RESPONSE",
      message:
        "The approval response did not preserve the exact external Quote evidence.",
    });
  }

  return Object.freeze({
    code: result.data.code,
    approval,
    externalApproval,
    replayed: result.data.replayed === true,
  });
}
