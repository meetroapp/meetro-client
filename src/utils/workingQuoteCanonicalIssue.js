import { authFetch } from "./authFetch.js";
import {
  fetchProfessionalQuoteDelivery,
  sendProfessionalQuoteInMeetro,
} from "./quoteDeliveryApi.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[0-9a-f]{64}$/i;
const DOCUMENT_NUMBER_PATTERN = /^[A-Z]{1,8}-[0-9]{1,12}$/;

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
  const allowedKeys = new Set([
    "documentId",
    "documentVersion",
    "currentDocumentVersion",
    "currentSnapshotMatchesSource",
  ]);
  const documentId = uuid(value.documentId);
  const documentVersion = positiveInteger(value.documentVersion);
  const hasContinuityAttestation =
    Object.hasOwn(value, "currentDocumentVersion") ||
    Object.hasOwn(value, "currentSnapshotMatchesSource");
  const currentDocumentVersion = hasContinuityAttestation
    ? positiveInteger(value.currentDocumentVersion)
    : null;
  if (
    !Object.keys(value).every((key) => allowedKeys.has(key)) ||
    !documentId ||
    !documentVersion ||
    (hasContinuityAttestation && (
      !currentDocumentVersion ||
      typeof value.currentSnapshotMatchesSource !== "boolean"
    ))
  ) return null;
  return Object.freeze({
    documentId,
    documentVersion,
    ...(hasContinuityAttestation
      ? {
          currentDocumentVersion,
          currentSnapshotMatchesSource: value.currentSnapshotMatchesSource,
        }
      : {}),
  });
}

function sourceBusinessDocumentMatchesIdentity(source, identity) {
  return Boolean(
    source?.documentId === identity.documentId &&
    (
      source.documentVersion === identity.documentVersion ||
      (
        source.currentDocumentVersion === identity.documentVersion &&
        source.currentSnapshotMatchesSource === true
      )
    )
  );
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
  const decisionState = ["APPROVED", "DECLINED"].includes(value.decisionState)
    ? value.decisionState
    : null;
  const decisionVersion = value.decisionVersion == null
    ? null
    : positiveInteger(value.decisionVersion);
  const decidedAt = value.decidedAt == null
    ? null
    : !Number.isNaN(Date.parse(value.decidedAt))
      ? new Date(value.decidedAt).toISOString()
      : null;
  const noDecision =
    value.decisionState == null &&
    value.decisionVersion == null &&
    value.decidedAt == null;
  const exactDecision =
    decisionState != null &&
    decisionVersion === currentVersion &&
    decidedAt != null &&
    value.status === "ISSUED";
  const exactSourceVersion =
    sourceBusinessDocument?.documentVersion === positiveInteger(documentVersion);
  const verifiedCurrentSourceSnapshot = Boolean(
    sourceBusinessDocument?.currentDocumentVersion === positiveInteger(documentVersion) &&
    sourceBusinessDocument?.currentSnapshotMatchesSource === true
  );
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
    (!exactSourceVersion && !verifiedCurrentSourceSnapshot) ||
    !current ||
    current.status !== value.status ||
    current.totalMinor !== totalMinor ||
    (value.status === "DRAFT" && value.issuedAt != null) ||
    (value.status === "ISSUED" && !issuedAt) ||
    (!noDecision && !exactDecision)
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
    decisionState,
    decisionVersion,
    decidedAt,
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

export function workingQuoteDeliveryPresentation({
  canonicalQuote = null,
  issuedQuote = canonicalQuote,
  deliveryEvidence = null,
  hydrationState = "READY",
} = {}) {
  if (hydrationState === "LOADING") {
    return Object.freeze({
      state: "AUTHORITY_LOADING",
      issued: false,
      delivered: false,
      badgeLabel: "VERIFYING STATUS",
      statusText: "Checking current Quote status.",
      actionLabel: "Checking…",
      actionDisabled: true,
    });
  }
  if (hydrationState === "ERROR") {
    return Object.freeze({
      state: "AUTHORITY_UNAVAILABLE",
      issued: false,
      delivered: false,
      badgeLabel: "STATUS UNAVAILABLE",
      statusText: "Unable to verify current Quote delivery status.",
      actionLabel: "Unavailable",
      actionDisabled: true,
    });
  }
  if (canonicalQuote?.status === "DRAFT") {
    return Object.freeze({
      state: "CANONICAL_DRAFT",
      issued: false,
      delivered: false,
      badgeLabel: "CANONICAL DRAFT",
      statusText: "Canonical Quote prepared · Not issued.",
      actionLabel: "Send Quote to Customer",
      actionDisabled: false,
    });
  }
  const issued = issuedQuote?.status === "ISSUED" && Boolean(uuid(issuedQuote.id));
  const delivered = Boolean(
    issued &&
    positiveInteger(deliveryEvidence?.messageId) &&
    positiveInteger(deliveryEvidence?.conversationId) &&
    uuid(deliveryEvidence?.quoteId) === uuid(issuedQuote.id) &&
    uuid(deliveryEvidence?.jobId) === uuid(issuedQuote.jobId) &&
    typeof deliveryEvidence?.sentAt === "string" &&
    !Number.isNaN(Date.parse(deliveryEvidence.sentAt))
  );
  if (issued && issuedQuote.decisionState === "APPROVED") {
    if (!delivered) {
      return Object.freeze({
        state: "AUTHORITY_UNAVAILABLE",
        issued: true,
        delivered: false,
        badgeLabel: "APPROVED · DELIVERY UNVERIFIED",
        statusText: "Unable to verify the exact delivered Quote version.",
        actionLabel: "Unavailable",
        actionDisabled: true,
      });
    }
    return Object.freeze({
      state: "APPROVED",
      issued: true,
      delivered,
      badgeLabel: "APPROVED",
      statusText: "Approved by customer.",
      actionLabel: "Send Copy Again",
      actionDisabled: false,
    });
  }
  if (issued && issuedQuote.decisionState === "DECLINED") {
    if (!delivered) {
      return Object.freeze({
        state: "AUTHORITY_UNAVAILABLE",
        issued: true,
        delivered: false,
        badgeLabel: "DECLINED · DELIVERY UNVERIFIED",
        statusText: "Unable to verify the exact delivered Quote version.",
        actionLabel: "Unavailable",
        actionDisabled: true,
      });
    }
    return Object.freeze({
      state: "DECLINED",
      issued: true,
      delivered,
      badgeLabel: "DECLINED",
      statusText: "Declined by customer.",
      actionLabel: "Send Copy Again",
      actionDisabled: false,
    });
  }
  if (delivered) {
    return Object.freeze({
      state: "DELIVERED",
      issued: true,
      delivered: true,
      badgeLabel: "SENT",
      statusText: "Sent to customer · Waiting for customer response",
      actionLabel: "Send Again",
      actionDisabled: false,
    });
  }
  if (issued) {
    return Object.freeze({
      state: "ISSUED_NOT_DELIVERED",
      issued: true,
      delivered: false,
      badgeLabel: "ISSUED · DELIVERY PENDING",
      statusText: "Quote issued · Not delivered to customer.",
      actionLabel: "Send in Meetro",
      actionDisabled: false,
    });
  }
  return Object.freeze({
    state: "WORKING_DRAFT",
    issued: false,
    delivered: false,
    badgeLabel: "WORKING DRAFT",
    statusText: null,
    actionLabel: "Send Quote to Customer",
    actionDisabled: false,
  });
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

function workingQuoteReadinessMessage(missing) {
  if (missing.includes("savedDocument")) {
    return "Save this quote before sending it.";
  }
  if (missing.includes("exactSavedContent")) {
    return "Save your latest quote changes before sending it.";
  }
  if (missing.includes("documentNumber")) {
    return "A server-assigned Quote number is required before sending.";
  }
  if (missing.includes("documentVersion")) {
    return "The exact saved Quote version is required before sending.";
  }
  if (missing.includes("authority")) {
    return "The customer and project for this quote could not be verified. Nothing was sent.";
  }
  if (missing.includes("customer")) {
    return "The customer for this quote could not be verified. Nothing was sent.";
  }
  if (missing.includes("project")) {
    return "The project for this quote could not be verified. Nothing was sent.";
  }
  if (missing.includes("total")) {
    return "The saved Quote total could not be verified. Nothing was sent.";
  }
  return "";
}

export function workingQuoteSendReadiness({
  document,
  identity,
  jobId,
  total,
  exactSavedContent = true,
} = {}) {
  let documentIdentity = null;
  try {
    documentIdentity = validateDocument(document, jobId);
  } catch {
    // The readiness result is presentation-only and must fail closed, not throw.
  }

  const documentNumber = typeof document?.documentNumber === "string"
    ? document.documentNumber.trim()
    : "";
  const documentVersion = positiveInteger(document?.version);
  const hasTotal = total !== null && total !== undefined &&
    !(typeof total === "string" && !total.trim());
  const normalizedTotal = hasTotal ? Number(total) : Number.NaN;
  const exactIdentity = documentIdentity
    ? normalizeWorkingQuoteReviewIdentity(identity, documentIdentity)
    : null;
  const missing = [];

  if (!documentIdentity) missing.push("savedDocument");
  if (exactSavedContent !== true) missing.push("exactSavedContent");
  if (!DOCUMENT_NUMBER_PATTERN.test(documentNumber)) missing.push("documentNumber");
  if (!documentVersion) missing.push("documentVersion");
  if (!exactIdentity?.customerName) missing.push("customer");
  if (!exactIdentity?.projectTitle) missing.push("project");
  if (!Number.isFinite(normalizedTotal) || normalizedTotal < 0) missing.push("total");
  if (!exactIdentity) missing.push("authority");

  const uniqueMissing = Object.freeze([...new Set(missing)]);
  return Object.freeze({
    ready: uniqueMissing.length === 0,
    customerName: exactIdentity?.customerName || "",
    projectTitle: exactIdentity?.projectTitle || "",
    jobId: documentIdentity?.jobId || null,
    documentId: documentIdentity?.documentId || null,
    documentNumber,
    documentVersion,
    total: Number.isFinite(normalizedTotal) && normalizedTotal >= 0
      ? normalizedTotal
      : null,
    currency: "USD",
    missing: uniqueMissing,
    message: workingQuoteReadinessMessage(uniqueMissing),
  });
}

export function normalizeWorkingQuoteReviewIdentity(value, {
  documentId,
  documentVersion,
  jobId,
} = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const normalized = {
    documentId: uuid(value.documentId),
    documentVersion: positiveInteger(value.documentVersion),
    jobId: uuid(value.jobId),
    requestId: positiveInteger(value.requestId),
    relationshipId: positiveInteger(value.relationshipId),
    customerName: typeof value.customerName === "string"
      ? value.customerName.trim()
      : "",
    projectTitle: typeof value.projectTitle === "string"
      ? value.projectTitle.trim()
      : "",
  };
  if (
    Object.keys(value).sort().join(",") !==
      "customerName,documentId,documentVersion,jobId,projectTitle,relationshipId,requestId" ||
    normalized.documentId !== uuid(documentId) ||
    normalized.documentVersion !== positiveInteger(documentVersion) ||
    normalized.jobId !== uuid(jobId) ||
    !normalized.requestId ||
    !normalized.relationshipId ||
    !normalized.customerName ||
    normalized.customerName.length > 200 ||
    !normalized.projectTitle ||
    normalized.projectTitle.length > 500
  ) return null;
  return Object.freeze(normalized);
}

export async function fetchWorkingQuoteReviewIdentity({
  document,
  jobId,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const identity = validateDocument(document, jobId);
  const result = await authFetchImpl(
    `/business-document-drafts/${encodeURIComponent(identity.documentId)}/quote-review?version=${encodeURIComponent(identity.documentVersion)}`,
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw commandError(
      result,
      "IDENTITY",
      {},
      "WORKING_QUOTE_REVIEW_IDENTITY_FAILED",
      "The customer and project for this quote could not be verified."
    );
  }
  const review = normalizeWorkingQuoteReviewIdentity(result.data.review, identity);
  if (!review) {
    throw new WorkingQuoteCanonicalIssueError(
      "The working Quote review identity did not match the exact saved document and Job.",
      { code: "UNSAFE_WORKING_QUOTE_REVIEW_IDENTITY", phase: "IDENTITY" }
    );
  }
  return review;
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
    !sourceBusinessDocumentMatchesIdentity(quote.sourceBusinessDocument, identity)
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
    (quote.relationshipId != null &&
      issuedQuote.relationshipId !== quote.relationshipId) ||
    (quote.issuerParticipantId != null &&
      issuedQuote.issuerParticipantId !== quote.issuerParticipantId) ||
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
  deliveryIntent = "INITIAL",
  setPage,
  authFetchImpl = authFetch,
  fetchDeliveryImpl = fetchProfessionalQuoteDelivery,
  sendDeliveryImpl = sendProfessionalQuoteInMeetro,
} = {}) {
  const identity = validateDocument(document, jobId);
  const normalizedDeliveryIntent = ["INITIAL", "COPY"].includes(deliveryIntent)
    ? deliveryIntent
    : null;
  if (
    !normalizedDeliveryIntent ||
    !validCommandKey(commandKeys?.bridge, "working-quote-bridge") ||
    !validCommandKey(commandKeys?.issue, "working-quote-issue") ||
    !validCommandKey(commandKeys?.delivery, "working-quote-delivery")
  ) {
    throw new WorkingQuoteCanonicalIssueError(
      "Stable Quote command identities are required.",
      { code: "QUOTE_COMMAND_IDENTITIES_REQUIRED" }
    );
  }
  if (
    normalizedDeliveryIntent === "COPY" &&
    (!checkpoint?.issuedQuote || !checkpoint?.delivery?.existingDelivery)
  ) {
    throw new WorkingQuoteCanonicalIssueError(
      "An exact prior Quote delivery is required before another copy can be sent.",
      { code: "QUOTE_COPY_REQUIRES_PRIOR_DELIVERY", phase: "DELIVERY", checkpoint }
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
    if (delivery.existingDelivery && normalizedDeliveryIntent === "INITIAL") {
      return Object.freeze({
        canonicalQuote,
        issuedQuote,
        delivery,
        deliveryEvidence: delivery.existingDelivery,
      });
    }
    const deliveryEvidence = await sendDeliveryImpl({
      delivery,
      idempotencyKey: commandKeys.delivery,
      deliveryIntent: normalizedDeliveryIntent,
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
