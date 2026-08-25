import {
  getBusinessCustomerRelationship,
  getBusinessCustomerRelationshipActivity,
  getBusinessCustomerRelationshipByContact,
  listBusinessCustomerRelationships,
} from "./businessCustomerRelationshipsApi.js";
import {
  getBusinessContact,
  loadBusinessContactProfileId,
} from "./businessContactsApi.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CUSTOMER_RELATIONSHIP_NAVIGATION_KEY =
  "meetroRelationshipHistoryContext";
export const CUSTOMER_RELATIONSHIP_CONTACT_RETURN_KEY =
  "meetroCustomerRelationshipReturnContact";

function text(value) {
  return String(value ?? "").trim();
}

function validUuid(value) {
  const normalized = text(value).toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

function safeStorage(storage) {
  return storage && typeof storage.getItem === "function" ? storage : null;
}

function parseStoredObject(storage, key) {
  const source = safeStorage(storage)?.getItem(key);
  if (!source) return null;
  try {
    const parsed = JSON.parse(source);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function readCustomerRelationshipNavigationContext(storage) {
  const parsed = parseStoredObject(storage, CUSTOMER_RELATIONSHIP_NAVIGATION_KEY);
  if (!parsed) return null;
  const businessContactId = validUuid(parsed.businessContactId);
  if (!businessContactId) return null;
  return Object.freeze({
    businessContactId,
    focus: ["overview", "work", "quotes", "invoices", "documents"].includes(text(parsed.focus))
      ? text(parsed.focus)
      : "overview",
    returnPage: text(parsed.returnPage) === "messagesInbox"
      ? "messagesInbox"
      : "businessCommandCenter",
  });
}

export async function loadCustomerRelationshipActivity({
  relationshipId,
  setPage,
  fetcher,
} = {}) {
  return getBusinessCustomerRelationshipActivity({
    relationshipId,
    setPage,
    fetcher,
  });
}

export function clearCustomerRelationshipNavigationContext(storage) {
  safeStorage(storage)?.removeItem?.(CUSTOMER_RELATIONSHIP_NAVIGATION_KEY);
  safeStorage(storage)?.removeItem?.("customerRelationshipsReturnPage");
}

export function writeCustomerRelationshipContactReturn(storage, contact = {}) {
  const businessContactId = validUuid(contact.id || contact.businessContactId);
  if (!businessContactId || !safeStorage(storage)?.setItem) return false;
  storage.setItem(
    CUSTOMER_RELATIONSHIP_CONTACT_RETURN_KEY,
    JSON.stringify({
      businessContactId,
      status: text(contact.status).toUpperCase() === "ARCHIVED"
        ? "ARCHIVED"
        : "ACTIVE",
    })
  );
  storage.setItem("meetroMessageSection", "contacts");
  return true;
}

export function readCustomerRelationshipContactReturn(storage) {
  const parsed = parseStoredObject(storage, CUSTOMER_RELATIONSHIP_CONTACT_RETURN_KEY);
  const businessContactId = validUuid(parsed?.businessContactId);
  if (!businessContactId) return null;
  return Object.freeze({
    businessContactId,
    status: text(parsed.status).toUpperCase() === "ARCHIVED"
      ? "ARCHIVED"
      : "ACTIVE",
  });
}

export function clearCustomerRelationshipContactReturn(storage) {
  safeStorage(storage)?.removeItem?.(CUSTOMER_RELATIONSHIP_CONTACT_RETURN_KEY);
}

export async function loadCustomerRelationshipDirectory({
  setPage,
  fetcher,
} = {}) {
  const contractorProfileId = await loadBusinessContactProfileId({
    setPage,
    fetcher,
  });
  return listBusinessCustomerRelationships({
    contractorProfileId,
    setPage,
    fetcher,
  });
}

export async function loadCustomerRelationshipDetail({
  relationshipId,
  setPage,
  fetcher,
} = {}) {
  const relationship = await getBusinessCustomerRelationship({
    relationshipId,
    setPage,
    fetcher,
  });
  const contact = await getBusinessContact({
    contactId: relationship.businessContactId,
    setPage,
    fetcher,
  });
  return Object.freeze({ relationship, contact });
}

export async function loadCustomerRelationshipForContact({
  businessContactId,
  setPage,
  fetcher,
} = {}) {
  const contact = await getBusinessContact({
    contactId: businessContactId,
    setPage,
    fetcher,
  });
  const relationship = await getBusinessCustomerRelationshipByContact({
    businessContactId,
    setPage,
    fetcher,
  });
  return Object.freeze({ relationship, contact });
}
