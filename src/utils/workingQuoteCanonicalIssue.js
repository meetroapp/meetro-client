import { authFetch } from "./authFetch.js";
import {
  fetchProfessionalQuoteDelivery,
  sendProfessionalQuoteInMeetro,
} from "./quoteDeliveryApi.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[0-9a-f]{64}$/i;

export class WorkingQuoteCanonicalIssueError extends Error {
  constructor(message, {
    code = "WORKING_QUOTE_CANONICAL_ISSUE_FAILED",
    status = 0,
    phase = "BRIDGE",
    checkpoint = {},
  } = {}) {
    super(message);
    this.name = "WorkingQuoteCanonicalIssueError";
    this.code = code;
    this.status = status;
    this.phase = phase;
    this.checkpoint = Object.freeze({ ...checkpoint });
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

function nonnegativeInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function commandError(result, phase, checkpoint, fallbackCode, fallbackMessage) {
  return new WorkingQuoteCanonicalIssueError(
    result?.data?.message || fallbackMessage,
    {
      status: result?.response?.status || 0,
      code: result?.data?.code || fallbackCode,
      phase,
      checkpoint,
    }
  );
}

function responseError(error, phase, checkpoint, fallbackCode, fallbackMessage) {
  if (error instanceof WorkingQuoteCanonicalIssueError) return error;
  return new WorkingQuoteCanonicalIssueError(error?.message || fallbackMessage, {
    status: error?.status || 0,
    code: error?.code || fallbackCode,
    phase,
    checkpoint,
  });
}

function normalizeSourceBusinessDocument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const documentId = uuid(value.documentId);
  const documentVersion = positiveInteger(value.documentVersion);
  if (
    Object.keys(value).length !== 2 ||
    !documentId ||
    !documentVersion
  ) return null;
  return Object.freeze({ documentId, documentVersion });
}

function normalizeCurrentVersion(value, expectedVersion) {
  if (!Array.isArray(value) || !value.length) return null;
  const current = value.at(-1);
  if (!current || typeof current !== "object" || Array.isArray(current)) return null;
  const version = positiveInteger(current.version);
  const totalMinor = nonnegativeInteger(current.totalMinor);
  const integrityHash = String(current.integrityHash || "").trim().toLowerCase();
  if (
    version !== expectedVersion ||
    !["DRAFT", "ISSUED"].includes(current.status) ||
    totalMinor == null ||
    !HASH_PATTERN.test(integrityHash)
  ) return null;
  return Object.freeze({
    version,
    status: current.status,
    totalMinor,
    integrityHash,
  });
}

export function normalizeWorkingDocumentCanonicalQuote(value, {
  documentId,
  documentVersion,
  jobId,
} = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = uuid(value.id);
  const normalizedJobId = uuid(value.jobId);
  const requestId = positiveInteger(value.requestId);
  const relationshipId = positiveInteger(value.relationshipId);
  const issuerParticipantId = uuid(value.issuerParticipantId);
  const currentVersion = positiveInteger(value.currentVersion);
  const totalMinor = nonnegativeInteger(value.totalMinor);
  const sourceBusinessDocument = normalizeSourceBusinessDocument(
    value.sourceBusinessDocument
  );
  const current = normalizeCurrentVersion(value.versions, currentVersion);
  const issuedAt = value.issuedAt == null
    ? null
    : !Number.isNaN(Date.parse(value.issuedAt))
      ? new Date(value.issuedAt).toISOString()
      : null;
  if (
    !id ||
    !normalizedJobId ||
    normalizedJobId !== uuid(jobId) ||
    !requestId ||
    !relationshipId ||
    !issuerParticipantId ||
    !["DRAFT", "ISSUED"].includes(value.status) ||
    !currentVersion ||
    totalMinor == null ||
    !/^[A-Z]{3}$/.test(String(value.currency || "")) ||
    !sourceBusinessDocument ||
    sourceBusinessDocument.documentId !== uuid(documentId) ||
    sourceBusinessDocument.documentVersion !== positiveInteger(documentVersion) ||
    !current ||
    current.status !== value.status ||
    current.totalMinor !== totalMinor ||
    (value.status === "DRAFT" && value.issuedAt != null) ||
    (value.status === "ISSUED" && !issuedAt) ||
    value.decisionState != null ||
    value.decisionVersion != null ||
    value.decidedAt != null
  ) return null;
  return Object.freeze({
    id,
    jobId: normalizedJobId,
    requestId,
    relationshipId,
    issuerParticipantId,
    status: value.status,
    currentVersion,
    totalMinor,
    currency: value.currency,
    issuedAt,
    integrityHash: current.integrityHash,
    documentNumber: typeof value.documentNumber === "string"
      ? value.documentNumber
      : null,
    sourceBusinessDocument,
  });
}

export function createWorkingQuoteCommandKeys(
  cryptoProvider = globalThis.crypto
) {
  const randomUuid = cryptoProvider?.randomUUID?.bind(cryptoProvider);
  if (typeof randomUuid !== "function") {
    throw new WorkingQuoteCanonicalIssueError(
      "A secure Quote command identity is unavailable.",
      { code: "QUOTE_COMMAND_IDENTITY_UNAVAILABLE" }
    );
  }
  function key(prefix) {
    const identity = uuid(randomUuid());
    if (!identity) {
      throw new WorkingQuoteCanonicalIssueError(
        "A secure Quote command identity is unavailable.",
        { code: "QUOTE_COMMAND_IDENTITY_UNAVAILABLE" }
      );
    }
    return `${prefix}-${identity}`;
  }
  return Object.freeze({
    bridge: key("working-quote-bridge"),
    issue: key("working-quote-issue"),
    delivery: key("working-quote-delivery"),
  });
}

function validCommandKey(value, prefix) {
  const normalized = String(value || "").trim();
  return normalized.startsWith(`${prefix}-`) &&
    uuid(normalized.slice(prefix.length + 1)) != null;
}

function validateDocument(document, jobId) {
  const documentId = uuid(document?.id);
  const documentVersion = positiveInteger(document?.version);
  const normalizedJobId = uuid(jobId);
  if (
    !documentId ||
    !documentVersion ||
    !normalizedJobId ||
    document?.documentType !== "QUOTE" ||
    document?.status !== "WORKING_DRAFT" ||
    (document.jobId && uuid(document.jobId) !== normalizedJobId)
  ) {
    throw new WorkingQuoteCanonicalIssueError(
      "An exact saved Working Quote connected to this Job is required.",
      { code: "SAVED_WORKING_QUOTE_REQUIRED" }
    );
  }
  return Object.freeze({ documentId, documentVersion, jobId: normalizedJobId });
}

export async function importWorkingQuoteAsCanonicalDraft({
  document,
  jobId,
  idempotencyKey,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const identity = validateDocument(document, jobId);
  if (!validCommandKey(idempotencyKey, "working-quote-bridge")) {
    throw new WorkingQuoteCanonicalIssueError(
      "A stable Working Quote bridge identity is required.",
      { code: "QUOTE_COMMAND_IDENTITIES_REQUIRED" }
    );
  }
  const result = await authFetchImpl(
    `/business-document-drafts/${encodeURIComponent(identity.documentId)}/canonical-quote`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ expectedDocumentVersion: identity.documentVersion }),
    },
    setPage
  );
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw commandError(
      result,
      "BRIDGE",
      {},
      "WORKING_QUOTE_BRIDGE_FAILED",
      "The saved Working Quote could not be prepared for governed issuance."
    );
  }
  const quote = normalizeWorkingDocumentCanonicalQuote(result.data.quote, {
    documentId: identity.documentId,
    documentVersion: identity.documentVersion,
    jobId: identity.jobId,
  });
  if (!quote) {
    throw new WorkingQuoteCanonicalIssueError(
      "The canonical Quote did not preserve the exact saved Working Quote identity and version.",
      { code: "UNSAFE_WORKING_QUOTE_BRIDGE_RESPONSE", phase: "BRIDGE" }
    );
  }
  return quote;
}

export async function issueCanonicalWorkingQuote({
  quote,
  document,
  jobId,
  idempotencyKey,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const identity = validateDocument(document, jobId);
  if (!validCommandKey(idempotencyKey, "working-quote-issue")) {
    throw new WorkingQuoteCanonicalIssueError(
      "A stable Quote issue identity is required.",
      { code: "QUOTE_COMMAND_IDENTITIES_REQUIRED", phase: "ISSUE" }
    );
  }
  if (
    quote?.status !== "DRAFT" ||
    quote.jobId !== identity.jobId ||
    quote.sourceBusinessDocument?.documentId !== identity.documentId ||
    quote.sourceBusinessDocument?.documentVersion !== identity.documentVersion
  ) {
    throw new WorkingQuoteCanonicalIssueError(
      "The exact canonical Draft Quote is required before issuance.",
      { code: "CANONICAL_DRAFT_QUOTE_REQUIRED", phase: "ISSUE", checkpoint: { canonicalQuote: quote } }
    );
  }
  const checkpoint = { canonicalQuote: quote };
  const result = await authFetchImpl(
    `/quotes/${encodeURIComponent(quote.id)}/issue`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ expectedVersion: quote.currentVersion }),
    },
    setPage
  );
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw commandError(
      result,
      "ISSUE",
      checkpoint,
      "CANONICAL_QUOTE_ISSUE_FAILED",
      "The canonical Quote was not issued. Nothing was delivered."
    );
  }
  const issuedQuote = normalizeWorkingDocumentCanonicalQuote(result.data.quote, {
    documentId: identity.documentId,
    documentVersion: identity.documentVersion,
    jobId: identity.jobId,
  });
  if (
    !issuedQuote ||
    issuedQuote.status !== "ISSUED" ||
    issuedQuote.id !== quote.id ||
    issuedQuote.relationshipId !== quote.relationshipId ||
    issuedQuote.issuerParticipantId !== quote.issuerParticipantId ||
    issuedQuote.currentVersion !== quote.currentVersion + 1 ||
    issuedQuote.totalMinor !== quote.totalMinor ||
    issuedQuote.currency !== quote.currency
  ) {
    throw new WorkingQuoteCanonicalIssueError(
      "The issued Quote response did not preserve the reviewed canonical identity and exact version.",
      {
        code: "UNSAFE_CANONICAL_QUOTE_ISSUE_RESPONSE",
        phase: "ISSUE",
        checkpoint,
      }
    );
  }
  return issuedQuote;
}

export async function issueAndSendWorkingQuote({
  document,
  jobId,
  commandKeys,
  checkpoint = {},
  setPage,
  authFetchImpl = authFetch,
  fetchDeliveryImpl = fetchProfessionalQuoteDelivery,
  sendDeliveryImpl = sendProfessionalQuoteInMeetro,
} = {}) {
  const identity = validateDocument(document, jobId);
  if (
    !validCommandKey(commandKeys?.bridge, "working-quote-bridge") ||
    !validCommandKey(commandKeys?.issue, "working-quote-issue") ||
    !validCommandKey(commandKeys?.delivery, "working-quote-delivery")
  ) {
    throw new WorkingQuoteCanonicalIssueError(
      "Stable Quote command identities are required.",
      { code: "QUOTE_COMMAND_IDENTITIES_REQUIRED" }
    );
  }
  let canonicalQuote = checkpoint.canonicalQuote || null;
  let issuedQuote = checkpoint.issuedQuote || null;
  let delivery = checkpoint.delivery || null;
  try {
    if (!canonicalQuote && !issuedQuote) {
      canonicalQuote = await importWorkingQuoteAsCanonicalDraft({
        document,
        jobId: identity.jobId,
        idempotencyKey: commandKeys.bridge,
        setPage,
        authFetchImpl,
      });
      if (canonicalQuote.status === "ISSUED") issuedQuote = canonicalQuote;
    }
  } catch (error) {
    throw responseError(
      error,
      "BRIDGE",
      {},
      "WORKING_QUOTE_BRIDGE_FAILED",
      "The saved Working Quote could not be prepared for governed issuance."
    );
  }
  if (!issuedQuote) {
    try {
      issuedQuote = await issueCanonicalWorkingQuote({
        quote: canonicalQuote,
        document,
        jobId: identity.jobId,
        idempotencyKey: commandKeys.issue,
        setPage,
        authFetchImpl,
      });
    } catch (error) {
      throw responseError(
        error,
        "ISSUE",
        { canonicalQuote },
        "CANONICAL_QUOTE_ISSUE_FAILED",
        "The canonical Quote was not issued. Nothing was delivered."
      );
    }
  }
  const issuedCheckpoint = { canonicalQuote, issuedQuote };
  try {
    if (!delivery) {
      delivery = await fetchDeliveryImpl({
        quoteId: issuedQuote.id,
        jobId: issuedQuote.jobId,
        setPage,
      });
    }
    if (
      delivery.expectedIssuedVersion !== issuedQuote.currentVersion ||
      delivery.snapshot?.quoteId !== issuedQuote.id ||
      delivery.snapshot?.jobId !== issuedQuote.jobId ||
      delivery.snapshot?.totalMinor !== issuedQuote.totalMinor ||
      delivery.snapshot?.currency !== issuedQuote.currency ||
      delivery.canSendInMeetro !== true
    ) {
      throw new WorkingQuoteCanonicalIssueError(
        "The issued Quote delivery target could not be verified.",
        {
          code: "UNSAFE_CANONICAL_QUOTE_DELIVERY",
          phase: "DELIVERY",
          checkpoint: { ...issuedCheckpoint, delivery },
        }
      );
    }
    const deliveryEvidence = await sendDeliveryImpl({
      delivery,
      idempotencyKey: commandKeys.delivery,
      setPage,
    });
    if (
      deliveryEvidence.quoteId !== issuedQuote.id ||
      deliveryEvidence.jobId !== issuedQuote.jobId ||
      deliveryEvidence.conversationId !== delivery.conversationId
    ) {
      throw new WorkingQuoteCanonicalIssueError(
        "The governed Quote delivery evidence could not be verified.",
        {
          code: "UNSAFE_CANONICAL_QUOTE_DELIVERY_EVIDENCE",
          phase: "DELIVERY",
          checkpoint: { ...issuedCheckpoint, delivery },
        }
      );
    }
    return Object.freeze({
      canonicalQuote,
      issuedQuote,
      delivery,
      deliveryEvidence,
    });
  } catch (error) {
    throw responseError(
      error,
      "DELIVERY",
      { ...issuedCheckpoint, delivery },
      "CANONICAL_QUOTE_DELIVERY_FAILED",
      "The Quote was issued, but delivery needs to be retried."
    );
  }
}
