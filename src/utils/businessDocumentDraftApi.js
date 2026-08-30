import { authFetch } from "./authFetch.js";

const DOCUMENT_TYPES = new Set(["QUOTE", "INVOICE", "DEPOSIT_REQUEST"]);
const NUMBERED_DOCUMENT_TYPES = new Set(["QUOTE", "INVOICE"]);
const NUMBERING_INITIALIZATION_MODES = new Set(["START_NEW", "CONTINUE_EXISTING"]);
const NUMBERING_PREFIX_PATTERN = /^[A-Z]{1,8}$/;
const DOCUMENT_NUMBER_PATTERN = /^[A-Z]{1,8}-[0-9]{1,12}$/;
const MAX_SEQUENCE_NUMBER = 999999999999;
const PHOTO_ROLES = new Set(["UNCLASSIFIED", "GENERAL_EVIDENCE", "BEFORE", "AFTER"]);
const PHOTO_VISIBILITIES = new Set(["PRIVATE_INTERNAL", "CUSTOMER_VISIBLE"]);
const PHOTO_INTENTS = new Set(["BEFORE", "AFTER"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class BusinessDocumentDraftError extends Error {
  constructor(message, { status = 0, code = "BUSINESS_DOCUMENT_FAILED", currentVersion } = {}) {
    super(message);
    this.name = "BusinessDocumentDraftError";
    this.status = status;
    this.code = code;
    this.currentVersion = currentVersion;
  }
}

export function createBusinessDocumentSaveKey(cryptoProvider = globalThis.crypto) {
  const key = cryptoProvider?.randomUUID?.();
  if (!UUID_PATTERN.test(String(key || ""))) {
    throw new BusinessDocumentDraftError("A secure save identity is unavailable.", {
      code: "BUSINESS_DOCUMENT_SAVE_IDENTITY_UNAVAILABLE",
    });
  }
  return key.toLowerCase();
}

function plain(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validTimestamp(value) {
  return typeof value === "string" && value.trim() && !Number.isNaN(Date.parse(value));
}

export function validateBusinessDocumentNumbering(value) {
  if (!plain(value) || typeof value.initialized !== "boolean" ||
      !NUMBERED_DOCUMENT_TYPES.has(value.documentType)) return null;
  if (!value.initialized) {
    return Object.freeze({ initialized: false, documentType: value.documentType });
  }
  if (!NUMBERING_PREFIX_PATTERN.test(value.prefix) ||
      !Number.isSafeInteger(value.width) || value.width < 1 || value.width > 12 ||
      !Number.isSafeInteger(value.lastNumber) || value.lastNumber < 0 ||
      value.lastNumber > MAX_SEQUENCE_NUMBER ||
      (value.nextNumberPreview !== null && !DOCUMENT_NUMBER_PATTERN.test(value.nextNumberPreview)) ||
      !NUMBERING_INITIALIZATION_MODES.has(value.initializationMode) ||
      !validTimestamp(value.initializedAt) ||
      (value.firstAllocatedAt !== undefined && value.firstAllocatedAt !== null &&
        !validTimestamp(value.firstAllocatedAt))) return null;
  return Object.freeze({
    initialized: true,
    documentType: value.documentType,
    prefix: value.prefix,
    width: value.width,
    lastNumber: value.lastNumber,
    nextNumberPreview: value.nextNumberPreview,
    initializationMode: value.initializationMode,
    initializedAt: value.initializedAt,
    firstAllocatedAt: value.firstAllocatedAt ?? null,
  });
}

function validatePhoto(value) {
  return plain(value) &&
    typeof value.id === "string" &&
    plain(value.media) &&
    typeof value.media.public_id === "string" &&
    typeof value.media.secure_url === "string" &&
    PHOTO_ROLES.has(value.role) &&
    PHOTO_VISIBILITIES.has(value.visibility);
}

function validateCustomerParty(value) {
  if (value == null) return null;
  if (!plain(value) ||
      !Object.keys(value).every((key) => [
        "businessContactId",
        "customerRelationshipId",
        "contractorProfileId",
        "jobId",
        "linkedAt",
      ].includes(key)) ||
      !UUID_PATTERN.test(String(value.businessContactId || "")) ||
      !UUID_PATTERN.test(String(value.customerRelationshipId || "")) ||
      (value.contractorProfileId !== undefined &&
        (!Number.isSafeInteger(Number(value.contractorProfileId)) || Number(value.contractorProfileId) < 1)) ||
      (value.jobId !== undefined && !UUID_PATTERN.test(String(value.jobId || ""))) ||
      (value.linkedAt !== undefined && !validTimestamp(value.linkedAt))) return undefined;
  return Object.freeze({
    businessContactId: String(value.businessContactId).toLowerCase(),
    customerRelationshipId: String(value.customerRelationshipId).toLowerCase(),
    ...(value.contractorProfileId !== undefined
      ? { contractorProfileId: Number(value.contractorProfileId) }
      : {}),
    ...(value.jobId !== undefined ? { jobId: String(value.jobId).toLowerCase() } : {}),
    ...(value.linkedAt !== undefined ? { linkedAt: value.linkedAt } : {}),
  });
}

function validateInstruction(value, documentType) {
  const validOptionalTimestamp = (timestamp) =>
    timestamp === undefined ||
    (typeof timestamp === "string" && timestamp.trim() && !Number.isNaN(Date.parse(timestamp)));
  if (!plain(value) ||
      typeof value.id !== "string" || !value.id ||
      value.documentType !== documentType ||
      typeof value.text !== "string" || !value.text ||
      typeof value.recognized !== "boolean" ||
      !Number.isSafeInteger(value.revisions) || value.revisions < 0 ||
      !Array.isArray(value.revisionHistory) || !value.revisionHistory.every((item) => typeof item === "string") ||
      (value.originalText !== undefined && (typeof value.originalText !== "string" || !value.originalText.trim())) ||
      (value.responseText !== undefined && typeof value.responseText !== "string") ||
      (value.privateReminder !== undefined && typeof value.privateReminder !== "boolean") ||
      (value.photoIntent != null && !PHOTO_INTENTS.has(value.photoIntent)) ||
      !validOptionalTimestamp(value.createdAt) ||
      !validOptionalTimestamp(value.updatedAt)) return null;
  return Object.freeze({ ...value, revisionHistory: Object.freeze([...value.revisionHistory]) });
}

function validateWorkspace(value, documentType) {
  if (!plain(value) || value.activeDocument !== documentType ||
      !Array.isArray(value.instructions) || !plain(value.manualOverrides) ||
      !Array.isArray(value.privateReminders)) return null;
  const instructions = value.instructions.map((item) => validateInstruction(item, documentType));
  if (instructions.some((item) => !item) || value.privateReminders.some((item) =>
    !plain(item) || typeof item.id !== "string" || typeof item.text !== "string"
  )) return null;
  return Object.freeze({
    ...value,
    instructions: Object.freeze(instructions),
    manualOverrides: Object.freeze({ ...value.manualOverrides }),
    privateReminders: Object.freeze(value.privateReminders.map((item) => Object.freeze({ ...item }))),
  });
}

function validateDepositRequestAuthority(value, document) {
  if (document.documentType !== "DEPOSIT_REQUEST") {
    return value == null && document.paymentRequirementId == null ? null : undefined;
  }
  if (!plain(value) ||
      !UUID_PATTERN.test(String(document.paymentRequirementId || "")) ||
      value.paymentRequirementId !== document.paymentRequirementId ||
      value.jobId !== document.jobId ||
      !UUID_PATTERN.test(String(value.quoteId || "")) ||
      !UUID_PATTERN.test(String(value.customerDecisionId || "")) ||
      !Number.isSafeInteger(value.relationshipId) || value.relationshipId < 1 ||
      !Number.isSafeInteger(value.issuedQuoteVersion) || value.issuedQuoteVersion < 1 ||
      !["DUE", "PARTIALLY_SATISFIED"].includes(value.state) ||
      !/^[A-Z]{3}$/.test(value.currency || "") ||
      ![value.quoteTotalMinor, value.requiredMinor, value.appliedMinor, value.remainingMinor]
        .every((amount) => Number.isSafeInteger(amount) && amount >= 0) ||
      value.requiredMinor <= 0 || value.requiredMinor > value.quoteTotalMinor ||
      value.appliedMinor + value.remainingMinor !== value.requiredMinor ||
      value.remainingMinor <= 0) return undefined;
  return Object.freeze({
    ...value,
    depositRule: plain(value.depositRule)
      ? Object.freeze({ ...value.depositRule })
      : null,
  });
}

export function validateBusinessDocumentDraft(value) {
  const workspace = plain(value) ? validateWorkspace(value.workspace, value.documentType) : null;
  const customerParty = plain(value) ? validateCustomerParty(value.customerParty) : undefined;
  const customerDisplayName = typeof value?.customerDisplayName === "string"
    ? value.customerDisplayName.trim()
    : value?.customerDisplayName == null
      ? null
      : undefined;
  const depositRequestAuthority = plain(value)
    ? validateDepositRequestAuthority(value.depositRequestAuthority, value)
    : undefined;
  if (!plain(value) ||
      !UUID_PATTERN.test(String(value.id || "")) ||
      !DOCUMENT_TYPES.has(value.documentType) ||
      value.status !== "WORKING_DRAFT" ||
      typeof value.reference !== "string" ||
      (value.documentNumber !== undefined && value.documentNumber !== null &&
        (typeof value.documentNumber !== "string" || !value.documentNumber.trim())) ||
      !Number.isSafeInteger(value.version) || value.version < 1 ||
      !plain(value.content) || !workspace ||
      !Array.isArray(value.photos) || !value.photos.every(validatePhoto) ||
      customerParty === undefined ||
      customerDisplayName === undefined ||
      depositRequestAuthority === undefined ||
      (value.documentType === "DEPOSIT_REQUEST" && value.documentNumber != null) ||
      Number.isNaN(Date.parse(value.createdAt)) || Number.isNaN(Date.parse(value.updatedAt))) {
    return null;
  }
  return Object.freeze({
    ...value,
    content: Object.freeze({ ...value.content }),
    customerParty,
    customerDisplayName,
    paymentRequirementId: value.paymentRequirementId || null,
    depositRequestAuthority,
    workspace,
    photos: Object.freeze(value.photos.map((photo) => Object.freeze({ ...photo, media: Object.freeze({ ...photo.media }) }))),
  });
}

function apiError(response, data) {
  return new BusinessDocumentDraftError(
    data?.message || "The working document could not be saved.",
    {
      status: response?.status || 0,
      code: data?.code || "BUSINESS_DOCUMENT_FAILED",
      currentVersion: data?.currentVersion,
    }
  );
}

async function request(endpoint, options, { setPage, authFetchImpl = authFetch } = {}) {
  const { response, data } = await authFetchImpl(endpoint, options, setPage);
  if (!response?.ok || data?.success !== true) throw apiError(response, data);
  return data;
}

function validatedNumberingResponse(data, expectedDocumentType) {
  const numbering = validateBusinessDocumentNumbering(data?.numbering);
  if (!numbering || numbering.documentType !== expectedDocumentType) {
    throw new BusinessDocumentDraftError("The server returned invalid business-document numbering.", {
      code: "BUSINESS_DOCUMENT_NUMBERING_RESPONSE_INVALID",
    });
  }
  return numbering;
}

export async function getBusinessDocumentNumbering({
  documentType,
  jobId,
  setPage,
  authFetchImpl,
} = {}) {
  const expectedDocumentType = String(documentType || "").trim().toUpperCase();
  const parameters = new URLSearchParams();
  parameters.set("documentType", expectedDocumentType);
  if (String(jobId || "").trim()) parameters.set("jobId", String(jobId).trim());
  const data = await request(
    `/business-document-numbering?${parameters.toString()}`,
    { method: "GET" },
    { setPage, authFetchImpl }
  );
  return validatedNumberingResponse(data, expectedDocumentType);
}

export async function initializeBusinessDocumentNumbering({
  payload,
  setPage,
  authFetchImpl,
} = {}) {
  const data = await request("/business-document-numbering", {
    method: "POST",
    body: JSON.stringify(payload),
  }, { setPage, authFetchImpl });
  const numbering = validatedNumberingResponse(
    data,
    String(payload?.documentType || "").trim().toUpperCase()
  );
  if (!numbering.initialized) {
    throw new BusinessDocumentDraftError("The server did not initialize business-document numbering.", {
      code: "BUSINESS_DOCUMENT_NUMBERING_RESPONSE_INVALID",
    });
  }
  return numbering;
}

function responseFilename(response, fallback) {
  const disposition = response?.headers?.get?.("content-disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const candidate = String(match?.[1] || fallback || "customer-document.pdf")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
  return candidate.toLowerCase().endsWith(".pdf") ? candidate : `${candidate || "customer-document"}.pdf`;
}

export async function getBusinessDocumentCustomerPdf({
  draftId,
  expectedVersion,
  documentType,
  reference,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const endpoint = `/business-document-drafts/${encodeURIComponent(draftId)}/customer-pdf?version=${encodeURIComponent(expectedVersion)}`;
  const { response, data } = await authFetchImpl(endpoint, { method: "GET", responseType: "blob" }, setPage);
  if (!response?.ok) {
    let errorData = {};
    try { errorData = JSON.parse(await data?.text?.()); } catch { /* preserve bounded fallback */ }
    throw apiError(response, errorData);
  }
  const contentType = String(response.headers?.get?.("content-type") || data?.type || "").split(";", 1)[0].toLowerCase();
  if (!(data instanceof Blob) || contentType !== "application/pdf" || data.size < 5) {
    throw new BusinessDocumentDraftError("The server returned an invalid customer PDF.", { code: "BUSINESS_DOCUMENT_PDF_RESPONSE_INVALID" });
  }
  return Object.freeze({
    blob: data,
    fileName: responseFilename(
      response,
      `${String(documentType || "customer-document").toLowerCase()}-${String(reference || "document")}-v${expectedVersion}.pdf`
    ),
    contentType,
    documentId: draftId,
    documentVersion: Number(expectedVersion),
  });
}

export async function createBusinessDocumentDraft({ payload, idempotencyKey, setPage, authFetchImpl } = {}) {
  const data = await request("/business-document-drafts", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  }, { setPage, authFetchImpl });
  const document = validateBusinessDocumentDraft(data.document);
  if (!document) throw new BusinessDocumentDraftError("The server returned an invalid working document.", { code: "BUSINESS_DOCUMENT_RESPONSE_INVALID" });
  return document;
}

export async function updateBusinessDocumentDraft({ draftId, expectedVersion, payload, idempotencyKey, setPage, authFetchImpl } = {}) {
  const data = await request(`/business-document-drafts/${encodeURIComponent(draftId)}`, {
    method: "PATCH",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ ...payload, expectedVersion }),
  }, { setPage, authFetchImpl });
  const document = validateBusinessDocumentDraft(data.document);
  if (!document) throw new BusinessDocumentDraftError("The server returned an invalid working document.", { code: "BUSINESS_DOCUMENT_RESPONSE_INVALID" });
  return document;
}

export async function deleteBusinessDocumentDraft({ draftId, expectedVersion, setPage, authFetchImpl } = {}) {
  const data = await request(`/business-document-drafts/${encodeURIComponent(draftId)}`, {
    method: "DELETE",
    body: JSON.stringify({ expectedVersion }),
  }, { setPage, authFetchImpl });
  if (data.deletedDraftId !== draftId) {
    throw new BusinessDocumentDraftError("The server returned an invalid delete result.", {
      code: "BUSINESS_DOCUMENT_RESPONSE_INVALID",
    });
  }
  return Object.freeze({ deletedDraftId: data.deletedDraftId });
}

export async function getBusinessDocumentDraft({ draftId, setPage, authFetchImpl } = {}) {
  const data = await request(`/business-document-drafts/${encodeURIComponent(draftId)}`, { method: "GET" }, { setPage, authFetchImpl });
  const document = validateBusinessDocumentDraft(data.document);
  if (!document) throw new BusinessDocumentDraftError("The server returned an invalid working document.", { code: "BUSINESS_DOCUMENT_RESPONSE_INVALID" });
  return document;
}

export async function listBusinessDocumentDrafts({ search = "", type = "", status = "WORKING_DRAFT", time = "ALL", setPage, authFetchImpl } = {}) {
  const parameters = new URLSearchParams();
  if (String(search).trim()) parameters.set("search", String(search).trim());
  if (String(type).trim()) parameters.set("type", String(type).trim().toUpperCase());
  if (String(status).trim()) parameters.set("status", String(status).trim().toUpperCase());
  if (String(time).trim()) parameters.set("time", String(time).trim().toUpperCase());
  const data = await request(`/business-document-drafts?${parameters.toString()}`, { method: "GET" }, { setPage, authFetchImpl });
  if (!Array.isArray(data.documents)) throw new BusinessDocumentDraftError("The server returned an invalid Saved Files list.", { code: "BUSINESS_DOCUMENT_RESPONSE_INVALID" });
  const documents = data.documents.map(validateBusinessDocumentDraft);
  if (documents.some((document) => !document)) throw new BusinessDocumentDraftError("The server returned an invalid Saved Files list.", { code: "BUSINESS_DOCUMENT_RESPONSE_INVALID" });
  return Object.freeze(documents);
}

function validateDelivery(value) {
  if (!plain(value) || !UUID_PATTERN.test(String(value.id || "")) ||
      !UUID_PATTERN.test(String(value.documentId || "")) ||
      !DOCUMENT_TYPES.has(value.documentType) ||
      (value.documentNumber !== undefined && value.documentNumber !== null &&
        (typeof value.documentNumber !== "string" || !value.documentNumber.trim())) ||
      !Number.isSafeInteger(value.documentVersion) || value.documentVersion < 1 ||
      !new Set(["EMAIL", "MEETRO_MESSAGE"]).has(value.channel) ||
      !new Set(["REQUESTING", "DELIVERY_REQUESTED", "SENT", "FAILED"]).has(value.state)) return null;
  return Object.freeze({ ...value });
}

export async function deliverBusinessDocumentDraft({
  draftId,
  expectedVersion,
  channel,
  recipientEmail,
  subject = "",
  customerMessage = "",
  idempotencyKey,
  setPage,
  authFetchImpl,
} = {}) {
  const data = await request(`/business-document-drafts/${encodeURIComponent(draftId)}/deliveries`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      expectedVersion,
      channel,
      ...(channel === "EMAIL" ? { recipientEmail } : {}),
      subject,
      customerMessage,
    }),
  }, { setPage, authFetchImpl });
  const delivery = validateDelivery(data.delivery);
  if (!delivery) throw new BusinessDocumentDraftError("The server returned invalid delivery evidence.", { code: "BUSINESS_DOCUMENT_RESPONSE_INVALID" });
  return delivery;
}

export async function listBusinessDocumentDeliveries({ draftId, setPage, authFetchImpl } = {}) {
  const data = await request(`/business-document-drafts/${encodeURIComponent(draftId)}/deliveries`, {
    method: "GET",
  }, { setPage, authFetchImpl });
  if (!Array.isArray(data.deliveries)) throw new BusinessDocumentDraftError("The server returned invalid delivery history.", { code: "BUSINESS_DOCUMENT_RESPONSE_INVALID" });
  const deliveries = data.deliveries.map(validateDelivery);
  if (deliveries.some((delivery) => !delivery)) throw new BusinessDocumentDraftError("The server returned invalid delivery history.", { code: "BUSINESS_DOCUMENT_RESPONSE_INVALID" });
  return Object.freeze(deliveries);
}
