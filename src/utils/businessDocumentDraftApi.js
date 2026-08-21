import { authFetch } from "./authFetch.js";

const DOCUMENT_TYPES = new Set(["QUOTE", "INVOICE"]);
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

function validatePhoto(value) {
  return plain(value) &&
    typeof value.id === "string" &&
    plain(value.media) &&
    typeof value.media.public_id === "string" &&
    typeof value.media.secure_url === "string" &&
    PHOTO_ROLES.has(value.role) &&
    PHOTO_VISIBILITIES.has(value.visibility);
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

export function validateBusinessDocumentDraft(value) {
  const workspace = plain(value) ? validateWorkspace(value.workspace, value.documentType) : null;
  if (!plain(value) ||
      !UUID_PATTERN.test(String(value.id || "")) ||
      !DOCUMENT_TYPES.has(value.documentType) ||
      value.status !== "WORKING_DRAFT" ||
      typeof value.reference !== "string" ||
      !Number.isSafeInteger(value.version) || value.version < 1 ||
      !plain(value.content) || !workspace ||
      !Array.isArray(value.photos) || !value.photos.every(validatePhoto) ||
      Number.isNaN(Date.parse(value.createdAt)) || Number.isNaN(Date.parse(value.updatedAt))) {
    return null;
  }
  return Object.freeze({
    ...value,
    content: Object.freeze({ ...value.content }),
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
