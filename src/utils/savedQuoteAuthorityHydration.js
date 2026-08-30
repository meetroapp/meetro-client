import { authFetch } from "./authFetch.js";
import { fetchProfessionalQuoteDelivery } from "./quoteDeliveryApi.js";
import { normalizeWorkingDocumentCanonicalQuote } from "./workingQuoteCanonicalIssue.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class SavedQuoteAuthorityHydrationError extends Error {
  constructor({
    status = 500,
    code = "SAVED_QUOTE_AUTHORITY_HYDRATION_FAILED",
    message = "Unable to verify current Quote delivery status.",
  } = {}) {
    super(message);
    this.name = "SavedQuoteAuthorityHydrationError";
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

function customerParty(value) {
  if (value == null) return null;
  const businessContactId = uuid(value.businessContactId);
  const customerRelationshipId = uuid(value.customerRelationshipId);
  return businessContactId && customerRelationshipId
    ? Object.freeze({ businessContactId, customerRelationshipId })
    : undefined;
}

function sameCustomerParty(left, right) {
  if (left == null || right == null) return left === right;
  return left.businessContactId === right.businessContactId &&
    left.customerRelationshipId === right.customerRelationshipId;
}

function validateSourceDocument(document) {
  const documentId = uuid(document?.id);
  const documentVersion = positiveInteger(document?.version);
  const jobId = uuid(document?.jobId);
  const documentNumber = typeof document?.documentNumber === "string"
    ? document.documentNumber.trim()
    : "";
  if (
    !documentId ||
    !documentVersion ||
    !jobId ||
    document?.documentType !== "QUOTE" ||
    document?.status !== "WORKING_DRAFT" ||
    !documentNumber
  ) {
    throw new SavedQuoteAuthorityHydrationError({
      status: 400,
      code: "SAVED_WORKING_QUOTE_REQUIRED",
      message: "An exact saved Job-linked Quote is required.",
    });
  }
  return Object.freeze({ documentId, documentVersion, documentNumber, jobId });
}

function readError(result, fallbackCode) {
  return new SavedQuoteAuthorityHydrationError({
    status: result?.response?.status || 500,
    code: result?.data?.code || fallbackCode,
    message: result?.data?.message || "Unable to verify current Quote delivery status.",
  });
}

function sourceDocumentId(value) {
  return uuid(value?.sourceBusinessDocument?.documentId);
}

function decisionMatchesDelivery(canonicalQuote, delivery) {
  const expectedBusinessStatus = canonicalQuote.decisionState || "WAITING_ON_CUSTOMER";
  return (
    delivery.expectedIssuedVersion === canonicalQuote.currentVersion &&
    delivery.snapshot?.quoteId === canonicalQuote.id &&
    delivery.snapshot?.jobId === canonicalQuote.jobId &&
    delivery.snapshot?.businessStatus === expectedBusinessStatus &&
    delivery.snapshot?.totalMinor === canonicalQuote.totalMinor &&
    delivery.snapshot?.currency === canonicalQuote.currency &&
    delivery.snapshot?.issuedAt === canonicalQuote.issuedAt &&
    (
      canonicalQuote.decisionState == null
        ? delivery.snapshot?.decidedAt == null
        : delivery.snapshot?.decidedAt === canonicalQuote.decidedAt
    )
  );
}

function safeCanonicalQuoteProjection(quote, canonicalCustomerParty = null) {
  return Object.freeze({
    id: quote.id,
    jobId: quote.jobId,
    status: quote.status,
    currentVersion: quote.currentVersion,
    issuedAt: quote.issuedAt,
    decisionState: quote.decisionState,
    decisionVersion: quote.decisionVersion,
    decidedAt: quote.decidedAt,
    totalMinor: quote.totalMinor,
    currency: quote.currency,
    documentNumber: quote.documentNumber,
    sourceBusinessDocument: quote.sourceBusinessDocument,
    customerParty: canonicalCustomerParty,
  });
}

export async function hydrateSavedQuoteAuthority({
  document,
  setPage,
  authFetchImpl = authFetch,
  fetchDeliveryImpl = fetchProfessionalQuoteDelivery,
} = {}) {
  const sourceDocument = validateSourceDocument(document);
  const result = await authFetchImpl(
    `/jobs/${encodeURIComponent(sourceDocument.jobId)}/quotes`,
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (
    !result?.response?.ok ||
    result?.data?.success !== true ||
    !Array.isArray(result?.data?.quotes) ||
    result.data.quotes.length > 100
  ) {
    throw readError(result, "SAVED_QUOTE_CANONICAL_READ_FAILED");
  }

  const sourceMatches = result.data.quotes.filter(
    (quote) => sourceDocumentId(quote) === sourceDocument.documentId
  );
  if (sourceMatches.length > 1) {
    throw new SavedQuoteAuthorityHydrationError({
      status: 502,
      code: "AMBIGUOUS_SAVED_QUOTE_CANONICAL_MAPPING",
    });
  }
  if (!sourceMatches.length) {
    return Object.freeze({
      source: "SAVED_WORKING_QUOTE_AUTHORITY",
      sourceDocument,
      canonicalQuote: null,
      delivery: null,
    });
  }

  const normalizedCanonicalQuote = normalizeWorkingDocumentCanonicalQuote(
    sourceMatches[0],
    sourceDocument
  );
  if (!normalizedCanonicalQuote) {
    throw new SavedQuoteAuthorityHydrationError({
      status: 409,
      code: "SAVED_QUOTE_CANONICAL_MAPPING_MISMATCH",
      message: "The saved Quote no longer matches its canonical source version.",
    });
  }
  const sourceCustomerParty = customerParty(document.customerParty);
  const canonicalCustomerParty = customerParty(sourceMatches[0].customerParty);
  if (
    sourceCustomerParty === undefined ||
    canonicalCustomerParty === undefined ||
    !sameCustomerParty(sourceCustomerParty, canonicalCustomerParty)
  ) {
    throw new SavedQuoteAuthorityHydrationError({
      status: 409,
      code: "SAVED_QUOTE_CUSTOMER_AUTHORITY_MISMATCH",
      message: "The saved Quote customer no longer matches canonical Quote authority.",
    });
  }
  const canonicalQuote = safeCanonicalQuoteProjection(
    normalizedCanonicalQuote,
    canonicalCustomerParty
  );

  let delivery = null;
  if (canonicalQuote.status === "ISSUED") {
    delivery = await fetchDeliveryImpl({
      quoteId: canonicalQuote.id,
      jobId: canonicalQuote.jobId,
      setPage,
      authFetchImpl,
    });
    if (!decisionMatchesDelivery(canonicalQuote, delivery)) {
      throw new SavedQuoteAuthorityHydrationError({
        status: 502,
        code: "SAVED_QUOTE_DELIVERY_AUTHORITY_MISMATCH",
      });
    }
  }

  return Object.freeze({
    source: "SAVED_WORKING_QUOTE_AUTHORITY",
    sourceDocument,
    canonicalQuote,
    delivery,
  });
}

export const savedQuoteAuthorityHydrationInternals = Object.freeze({
  decisionMatchesDelivery,
  sameCustomerParty,
  safeCanonicalQuoteProjection,
  validateSourceDocument,
});
