import { authFetch } from "./authFetch.js";

export const INTELLIGENCE_ROUTE = "/api/companion/ask";
export const WORKFLOW_REVIEW_ROUTE = "/api/intelligence/proposals";

export const INTELLIGENCE_OPERATION = Object.freeze({
  EVALUATION: "evaluation.assist",
  QUICK_QUOTE_PHOTO: "quick_quote.photo_assist",
  ESTIMATE: "estimate.compose",
  QUOTE: "quote.compose",
  INVOICE: "invoice.assist",
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUCCESS = new Set(["INTELLIGENCE_OPERATION_COMPLETED", "INTELLIGENCE_OPERATION_REPLAYED"]);
const REVIEW_SUCCESS = new Set(["INTELLIGENCE_REVIEW_RECORDED", "INTELLIGENCE_REVIEW_REPLAYED"]);
const PROHIBITED_KEYS = new Set([
  "accesstoken", "authorization", "cookie", "grant", "grants", "hash", "hashes",
  "idempotencykey", "password", "refreshtoken", "secret", "token", "tokens",
]);

function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeUuid(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return UUID.test(normalized) ? normalized : "";
}

function normalizeKey(value) {
  return String(value).replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function assertSafeObject(value, { allowInternalCost = false } = {}) {
  const pending = [value];
  const visited = new Set();
  while (pending.length) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    for (const [key, child] of Object.entries(current)) {
      const normalized = normalizeKey(key);
      if (PROHIBITED_KEYS.has(normalized)) throw new IntelligenceApiError("Unsafe assistant metadata was rejected.", { code: "UNSAFE_INTELLIGENCE_RESPONSE" });
      if (!allowInternalCost && /internal(?:cost|margin|markup)|retailerreference/.test(normalized)) {
        throw new IntelligenceApiError("Private estimating data was rejected.", { code: "UNSAFE_INTELLIGENCE_RESPONSE" });
      }
      if (child && typeof child === "object") pending.push(child);
    }
  }
}

function boundedText(value, maximum, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  return typeof value === "string" && value.length <= maximum ? value : "";
}

function array(value, maximum = 100) {
  return Array.isArray(value) && value.length <= maximum ? value : null;
}

function validateProfessionalCategoryCosts(value) {
  if (value == null) return true;
  if (
    !plain(value) ||
    Object.keys(value).sort().join(",") !== "labor,materials"
  ) {
    return false;
  }
  const validEntry = (entry, classification) => {
    if (entry == null) return true;
    return (
      plain(entry) &&
      Object.keys(entry).sort().join(",") ===
        "amountMinor,basis,classification,customerVisibleByDefault,provenance" &&
      entry.classification === classification &&
      Number.isSafeInteger(entry.amountMinor) &&
      entry.amountMinor >= 0 &&
      entry.provenance === "PROFESSIONAL_INPUT" &&
      entry.basis === "FLAT_TOTAL" &&
      entry.customerVisibleByDefault === false
    );
  };
  return (
    validEntry(value.materials, "MATERIAL") &&
    validEntry(value.labor, "LABOR")
  );
}

function validateEnvelope(value, operation, expected = {}) {
  if (!plain(value) || value.schemaVersion !== 1 || !safeUuid(value.proposalId)) return null;
  if (expected.jobId && safeUuid(value.jobId) !== safeUuid(expected.jobId)) return null;
  if (expected.evaluationId && safeUuid(value.evaluationId) !== safeUuid(expected.evaluationId)) return null;
  if (expected.invoiceId && safeUuid(value.invoiceId) !== safeUuid(expected.invoiceId)) return null;
  const allowedAuthority = operation === INTELLIGENCE_OPERATION.ESTIMATE
    ? "INTERNAL_ESTIMATE_DRAFT_NON_CANONICAL"
    : "ADVISORY_NON_CANONICAL";
  if (value.authorityClassification !== allowedAuthority) return null;
  if (value.humanToCanonicalBoundary?.directMutationAllowed !== false) return null;
  return value;
}

function validateSuggestion(value) {
  if (!plain(value) || typeof value.id !== "string" || !value.id || value.id.length > 160) return null;
  const text = boundedText(value.text, 5000);
  return text ? { ...value, id: value.id, text } : null;
}

export function validateEvaluationAssistance(value, expected = {}) {
  const proposal = validateEnvelope(value, INTELLIGENCE_OPERATION.EVALUATION, expected);
  if (!proposal) return null;
  const keys = ["observed", "professionalInput", "needsVerification", "inspectionSuggestions", "measurementSuggestions", "findingDrafts", "recommendationDrafts"];
  if (keys.some((key) => !array(proposal[key], 40)?.every((item) => validateSuggestion(item)))) return null;
  if (!plain(proposal.evaluationDraft) || !plain(proposal.photoAnalysis)) return null;
  assertSafeObject(proposal);
  return proposal;
}

function validateQuickQuotePhotoSourceReference(value) {
  if (!plain(value)) return null;

  const keys = Object.keys(value);
  if (
    keys.length !== 3 ||
    !["type", "id", "version"].every((key) =>
      Object.hasOwn(value, key)
    )
  ) {
    return null;
  }

  if (
    value.type !== "QUOTE_DRAFT_PHOTO" ||
    typeof value.id !== "string" ||
    !value.id ||
    value.id.length > 500 ||
    !Number.isInteger(value.version) ||
    value.version < 1
  ) {
    return null;
  }

  return value;
}

function validateQuickQuotePhotoItem(
  value,
  expectedClassification
) {
  if (!plain(value)) return null;

  const keys = Object.keys(value);
  if (
    keys.length !== 4 ||
    !["id", "text", "classification", "sourceReferences"].every(
      (key) => Object.hasOwn(value, key)
    )
  ) {
    return null;
  }

  const suggestion = validateSuggestion(value);
  const references = array(value.sourceReferences, 12);

  if (
    !suggestion ||
    value.classification !== expectedClassification ||
    !references ||
    !references.every(validateQuickQuotePhotoSourceReference) ||
    (
      expectedClassification === "OBSERVED" &&
      references.length === 0
    )
  ) {
    return null;
  }

  return value;
}

export function validateQuickQuotePhotoAssistance(
  value,
  expected = {}
) {
  const proposal = validateEnvelope(
    value,
    INTELLIGENCE_OPERATION.QUICK_QUOTE_PHOTO,
    expected
  );

  if (!proposal || !boundedText(proposal.summary, 1200)) {
    return null;
  }

  const collections = [
    ["observed", "OBSERVED"],
    ["needsVerification", "NEEDS_VERIFICATION"],
    ["repairSuggestions", "AI_SUGGESTED"],
    ["materialSuggestions", "AI_SUGGESTED"],
  ];

  for (const [key, classification] of collections) {
    const items = array(proposal[key], 40);

    if (
      !items ||
      !items.every((item) =>
        validateQuickQuotePhotoItem(item, classification)
      )
    ) {
      return null;
    }
  }

  if (
    !plain(proposal.photoAnalysis) ||
    proposal.photoAnalysis.supported !== true ||
    proposal.photoAnalysis.imageMeasurementsAreEstimates !== true
  ) {
    return null;
  }

  const analyzedReferenceIds = array(
    proposal.photoAnalysis.analyzedReferenceIds,
    5
  );
  const limitations = array(
    proposal.photoAnalysis.limitations,
    20
  );
  const warnings = array(proposal.warnings, 40);

  if (
    !analyzedReferenceIds ||
    !analyzedReferenceIds.every(
      (item) =>
        typeof item === "string" &&
        Boolean(item) &&
        item.length <= 500
    ) ||
    !limitations ||
    !limitations.every(
      (item) => Boolean(boundedText(item, 500))
    ) ||
    !warnings ||
    !warnings.every(
      (item) => Boolean(boundedText(item, 500))
    )
  ) {
    return null;
  }

  if (
    !plain(proposal.reviewContract) ||
    proposal.reviewContract.explicitHumanDecisionRequired !== true ||
    !array(proposal.reviewContract.actions, 3) ||
    !["ACCEPTED", "EDITED", "REJECTED"].every((action) =>
      proposal.reviewContract.actions.includes(action)
    )
  ) {
    return null;
  }

  if (
    proposal.humanToCanonicalBoundary
      ?.workingDraftApplicationRequiresReview !== true
  ) {
    return null;
  }

  assertSafeObject(proposal);
  return proposal;
}

export function validateEstimateDraft(value, expected = {}) {
  const proposal = validateEnvelope(value, INTELLIGENCE_OPERATION.ESTIMATE, expected);
  if (!proposal || !array(proposal.materials, 80) || !array(proposal.labor, 80) ||
      !plain(proposal.internalCost) || proposal.internalCost.customerVisible !== false ||
      !plain(proposal.customerQuoteDraft) ||
      !validateProfessionalCategoryCosts(proposal.professionalCategoryCosts)) return null;
  assertSafeObject(proposal, { allowInternalCost: true });
  assertSafeObject(proposal.customerQuoteDraft);
  if (/Home Depot|homedepot\.com/i.test(JSON.stringify(proposal.customerQuoteDraft))) return null;
  return proposal;
}

export function validateInvoiceAssistance(value, expected = {}) {
  const proposal = validateEnvelope(value, INTELLIGENCE_OPERATION.INVOICE, expected);
  if (!proposal || !plain(proposal.canonicalFinancialTruth) || !array(proposal.lineDescriptions, 100)) return null;
  if (!["totalMinor", "paidMinor", "balanceMinor", "status", "currency"].every((key) => Object.hasOwn(proposal.canonicalFinancialTruth, key))) return null;
  assertSafeObject(proposal);
  return proposal;
}

export function validateQuoteComposition(value, expected = {}) {
  const proposal = validateEnvelope(value, INTELLIGENCE_OPERATION.QUOTE, expected);
  if (!proposal || !array(proposal.proposedScopeItems, 80) || !array(proposal.exclusions, 80) || !array(proposal.assumptions, 80)) return null;
  assertSafeObject(proposal, { allowInternalCost: false });
  return proposal;
}

const VALIDATORS = Object.freeze({
  [INTELLIGENCE_OPERATION.EVALUATION]: validateEvaluationAssistance,
  [INTELLIGENCE_OPERATION.QUICK_QUOTE_PHOTO]:
    validateQuickQuotePhotoAssistance,
  [INTELLIGENCE_OPERATION.ESTIMATE]: validateEstimateDraft,
  [INTELLIGENCE_OPERATION.QUOTE]: validateQuoteComposition,
  [INTELLIGENCE_OPERATION.INVOICE]: validateInvoiceAssistance,
});

export class IntelligenceApiError extends Error {
  constructor(message, { status = 0, code = "INTELLIGENCE_REQUEST_FAILED" } = {}) {
    super(message);
    this.name = "IntelligenceApiError";
    this.status = status;
    this.code = code;
  }
}

export function createIntelligenceKey(cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider || typeof cryptoProvider.randomUUID !== "function") {
    throw new IntelligenceApiError("Ask Meetro is unavailable on this device.", { code: "INTELLIGENCE_IDEMPOTENCY_UNAVAILABLE" });
  }
  return cryptoProvider.randomUUID().toLowerCase();
}

export async function requestWorkflowIntelligence({
  operation,
  locale = "en-US",
  input,
  expected = {},
  idempotencyKey = createIntelligenceKey(),
  setPage,
  authFetchImpl = authFetch,
}) {
  if (!VALIDATORS[operation] || !plain(input)) throw new TypeError("A governed Ask Meetro operation is required.");
  const { response, data } = await authFetchImpl(INTELLIGENCE_ROUTE, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ operation, capability: operation, locale, context: {}, input }),
  }, setPage);
  if (!response.ok || data?.success !== true || !SUCCESS.has(data.code) || data.operation !== operation) {
    throw new IntelligenceApiError(
      data?.code === "INTELLIGENCE_PROVIDER_UNAVAILABLE"
        ? "Ask Meetro is not connected to an intelligence provider yet."
        : data?.message || "Ask Meetro could not prepare this suggestion.",
      { status: response.status, code: data?.code }
    );
  }
  const proposal = VALIDATORS[operation](data.result, expected);
  if (!proposal) throw new IntelligenceApiError("Ask Meetro returned an unsafe or invalid suggestion.", { status: 502, code: "UNSAFE_INTELLIGENCE_RESPONSE" });
  return {
    operation,
    operationId: safeUuid(data.operationId),
    correlationId: safeUuid(data.correlationId),
    proposal,
    replayed: data.code === "INTELLIGENCE_OPERATION_REPLAYED",
  };
}

export async function recordWorkflowReview({
  proposalId,
  elementId,
  action,
  editedValue,
  reasonCategory,
  idempotencyKey = createIntelligenceKey(),
  setPage,
  authFetchImpl = authFetch,
}) {
  const normalizedProposalId = safeUuid(proposalId);
  const normalizedAction = String(action || "").trim().toUpperCase();
  if (!normalizedProposalId || !/^[a-z][a-z0-9_.:-]{0,159}$/.test(String(elementId || "")) ||
      !["ACCEPTED", "EDITED", "REJECTED"].includes(normalizedAction)) {
    throw new TypeError("A governed Ask Meetro review is required.");
  }
  const body = { elementId, action: normalizedAction };
  if (normalizedAction === "EDITED") body.editedValue = editedValue;
  if (reasonCategory) body.reasonCategory = reasonCategory;
  const { response, data } = await authFetchImpl(
    `${WORKFLOW_REVIEW_ROUTE}/${encodeURIComponent(normalizedProposalId)}/review`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    },
    setPage
  );
  if (!response.ok || data?.success !== true || !REVIEW_SUCCESS.has(data.code) || data.canonicalMutationPerformed !== false) {
    throw new IntelligenceApiError(data?.message || "The Ask Meetro review could not be recorded.", { status: response.status, code: data?.code });
  }
  return data.review;
}

export async function recordQuoteCompositionReview({
  proposalId,
  elementId,
  action,
  editedValue,
  idempotencyKey = createIntelligenceKey(),
  setPage,
  authFetchImpl = authFetch,
}) {
  const body = { elementId, action };
  if (action === "EDITED") body.editedValue = editedValue;
  const { response, data } = await authFetchImpl(
    `/api/intelligence/quote-compositions/${encodeURIComponent(proposalId)}/feedback`,
    { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(body) },
    setPage
  );
  if (!response.ok || data?.success !== true || data.canonicalMutationPerformed !== false) {
    throw new IntelligenceApiError(data?.message || "The Quote suggestion review could not be recorded.", { status: response.status, code: data?.code });
  }
  return data.feedback;
}
