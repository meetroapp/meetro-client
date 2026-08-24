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
