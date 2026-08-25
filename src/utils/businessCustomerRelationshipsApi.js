import { authFetch } from "./authFetch.js";
import {
  BusinessContactApiError,
  createBusinessContactCommandKey,
} from "./businessContactsApi.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value) {
  return String(value ?? "").trim();
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export class BusinessCustomerRelationshipApiError extends Error {
  constructor({ status = 500, code, message } = {}) {
    super(message || "The Customer Relationship operation could not be completed.");
    this.name = "BusinessCustomerRelationshipApiError";
    this.status = status;
    this.code = code || "BUSINESS_CUSTOMER_RELATIONSHIP_FAILED";
  }
}

async function request(endpoint, options, { setPage, fetcher = authFetch } = {}) {
  const result = await fetcher(endpoint, options, setPage);
  const response = result?.response || { ok: false, status: 500 };
  const data = result?.data || {};
  if (!response.ok || data.success !== true) {
    throw new BusinessCustomerRelationshipApiError({
      status: response.status,
      code: data.code,
      message: data.message,
    });
  }
  return data;
}

function validatedRelationship(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !UUID_PATTERN.test(text(value.id)) ||
      !UUID_PATTERN.test(text(value.businessContactId)) ||
      !positiveInteger(value.contractorProfileId) ||
      !positiveInteger(value.version)) {
    throw new BusinessCustomerRelationshipApiError({
      code: "BUSINESS_CUSTOMER_RELATIONSHIP_RESPONSE_INVALID",
      message: "The server returned an invalid Customer Relationship.",
    });
  }
  return Object.freeze({ ...value });
}

function validContactId(value) {
  const id = text(value).toLowerCase();
  if (!UUID_PATTERN.test(id)) {
    throw new BusinessCustomerRelationshipApiError({
      status: 400,
      code: "BUSINESS_CUSTOMER_RELATIONSHIP_ID_INVALID",
      message: "A valid saved Contact is required.",
    });
  }
  return id;
}

function validRelationshipId(value) {
  const id = text(value).toLowerCase();
  if (!UUID_PATTERN.test(id)) {
    throw new BusinessCustomerRelationshipApiError({
      status: 400,
      code: "BUSINESS_CUSTOMER_RELATIONSHIP_ID_INVALID",
      message: "A valid Customer Relationship identity is required.",
    });
  }
  return id;
}

function validatedActivityItem(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BusinessCustomerRelationshipApiError({
      code: "BUSINESS_CUSTOMER_RELATIONSHIP_ACTIVITY_RESPONSE_INVALID",
      message: `The server returned invalid ${label} activity.`,
    });
  }
  return Object.freeze({ ...value });
}

function validatedDocumentActivityItem(value) {
  const item = validatedActivityItem(value, "document");
  if (
    !text(item.documentId) ||
    !["QUOTE", "INVOICE"].includes(text(item.documentType)) ||
    text(item.parentType) !== "JOB" ||
    !text(item.parentId)
  ) {
    throw new BusinessCustomerRelationshipApiError({
      code: "BUSINESS_CUSTOMER_RELATIONSHIP_ACTIVITY_RESPONSE_INVALID",
      message: "The server returned invalid document activity.",
    });
  }
  return item;
}

function validatedMediaActivityItem(value) {
  const item = validatedActivityItem(value, "media");
  let secureUrl;
  try {
    secureUrl = new URL(text(item.secureUrl));
  } catch {
    secureUrl = null;
  }
  if (
    !text(item.mediaId) ||
    text(item.kind) !== "PHOTO" ||
    text(item.mediaType) !== "IMAGE" ||
    text(item.parentType) !== "JOB" ||
    !text(item.parentId) ||
    secureUrl?.protocol !== "https:" ||
    secureUrl.hostname !== "res.cloudinary.com"
  ) {
    throw new BusinessCustomerRelationshipApiError({
      code: "BUSINESS_CUSTOMER_RELATIONSHIP_ACTIVITY_RESPONSE_INVALID",
      message: "The server returned invalid media activity.",
    });
  }
  return item;
}

function validatedActivity(value, relationshipId) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !value.relationship || typeof value.relationship !== "object" ||
      text(value.relationship.id).toLowerCase() !== relationshipId ||
      !Array.isArray(value.work) || !Array.isArray(value.quotes) ||
      !Array.isArray(value.invoices) || !Array.isArray(value.documents) ||
      !Array.isArray(value.media)) {
    throw new BusinessCustomerRelationshipApiError({
      code: "BUSINESS_CUSTOMER_RELATIONSHIP_ACTIVITY_RESPONSE_INVALID",
      message: "The server returned invalid Customer Relationship activity.",
    });
  }
  return Object.freeze({
    ...value,
    relationship: Object.freeze({ ...value.relationship }),
    work: Object.freeze(value.work.map((item) => validatedActivityItem(item, "work"))),
    quotes: Object.freeze(value.quotes.map((item) => validatedActivityItem(item, "Quote"))),
    invoices: Object.freeze(value.invoices.map((item) => validatedActivityItem(item, "Invoice"))),
    documents: Object.freeze(value.documents.map(validatedDocumentActivityItem)),
    media: Object.freeze(value.media.map(validatedMediaActivityItem)),
  });
}

export function createBusinessCustomerRelationshipCommandKey(
  cryptoProvider = globalThis.crypto
) {
  return createBusinessContactCommandKey(cryptoProvider);
}

export async function getBusinessCustomerRelationshipByContact({
  businessContactId,
  setPage,
  fetcher = authFetch,
} = {}) {
  const contactId = validContactId(businessContactId);
  try {
    const data = await request(
      `/business-customer-relationships/by-contact/${encodeURIComponent(contactId)}`,
      { method: "GET", cache: "no-store" },
      { setPage, fetcher }
    );
    return validatedRelationship(data.relationship);
  } catch (error) {
    if (
      error?.status === 404 &&
      error?.code === "BUSINESS_CUSTOMER_RELATIONSHIP_NOT_FOUND"
    ) {
      return null;
    }
    throw error;
  }
}

export async function getBusinessCustomerRelationship({
  relationshipId,
  setPage,
  fetcher = authFetch,
} = {}) {
  const id = validRelationshipId(relationshipId);
  const data = await request(
    `/business-customer-relationships/${encodeURIComponent(id)}`,
    { method: "GET", cache: "no-store" },
    { setPage, fetcher }
  );
  return validatedRelationship(data.relationship);
}

export async function getBusinessCustomerRelationshipActivity({
  relationshipId,
  setPage,
  fetcher = authFetch,
} = {}) {
  const id = validRelationshipId(relationshipId);
  const data = await request(
    `/business-customer-relationships/${encodeURIComponent(id)}/activity`,
    { method: "GET", cache: "no-store" },
    { setPage, fetcher }
  );
  return validatedActivity(data.activity, id);
}

export async function listBusinessCustomerRelationships({
  contractorProfileId,
  limit = 100,
  setPage,
  fetcher = authFetch,
} = {}) {
  const profileId = positiveInteger(contractorProfileId);
  const requestedLimit = positiveInteger(limit);
  if (!profileId || !requestedLimit || requestedLimit > 200) {
    throw new BusinessCustomerRelationshipApiError({
      status: 400,
      code: "BUSINESS_CUSTOMER_RELATIONSHIP_QUERY_INVALID",
      message: "A valid business is required before loading Customer Relationships.",
    });
  }
  const params = new URLSearchParams({
    contractorProfileId: String(profileId),
    limit: String(requestedLimit),
  });
  const data = await request(
    `/business-customer-relationships?${params.toString()}`,
    { method: "GET", cache: "no-store" },
    { setPage, fetcher }
  );
  if (!Array.isArray(data.relationships)) {
    throw new BusinessCustomerRelationshipApiError({
      code: "BUSINESS_CUSTOMER_RELATIONSHIP_RESPONSE_INVALID",
      message: "The server returned an invalid Customer Relationship list.",
    });
  }
  return Object.freeze(data.relationships.map(validatedRelationship));
}

export async function establishBusinessCustomerRelationship({
  contractorProfileId,
  businessContactId,
  idempotencyKey,
  setPage,
  fetcher = authFetch,
} = {}) {
  const profileId = positiveInteger(contractorProfileId);
  const contactId = validContactId(businessContactId);
  if (!profileId || !UUID_PATTERN.test(text(idempotencyKey))) {
    throw new BusinessCustomerRelationshipApiError({
      status: 400,
      code: "BUSINESS_CUSTOMER_RELATIONSHIP_INVALID",
      message: "A valid business and retry identity are required.",
    });
  }
  const data = await request(
    "/business-customer-relationships",
    {
      method: "POST",
      headers: { "Idempotency-Key": text(idempotencyKey) },
      body: JSON.stringify({
        contractorProfileId: profileId,
        businessContactId: contactId,
      }),
    },
    { setPage, fetcher }
  );
  return validatedRelationship(data.relationship);
}

export { BusinessContactApiError };
