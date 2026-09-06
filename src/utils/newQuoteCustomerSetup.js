import { authFetch } from "./authFetch.js";
import { getBusinessContactActiveRoles } from "./businessContactsApi.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value, maximum = 500) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= maximum ? normalized : null;
}

function uuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function exactKeys(value, keys) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function normalizeExistingQuote(value) {
  if (value == null) return null;
  if (!exactKeys(value, ["workingDraftId", "canonicalQuoteId"])) return undefined;
  const workingDraftId = value.workingDraftId == null ? null : uuid(value.workingDraftId);
  const canonicalQuoteId = value.canonicalQuoteId == null ? null : uuid(value.canonicalQuoteId);
  if ((!workingDraftId && value.workingDraftId != null) ||
      (!canonicalQuoteId && value.canonicalQuoteId != null) ||
      (!workingDraftId && !canonicalQuoteId)) return undefined;
  return Object.freeze({ workingDraftId, canonicalQuoteId });
}

function normalizeJob(value, customerName) {
  if (!exactKeys(value, [
    "jobId", "requestId", "relationshipId", "title", "city", "serviceArea",
    "customerName", "newQuoteEligible", "existingQuote",
  ])) return null;
  const existingQuote = normalizeExistingQuote(value.existingQuote);
  const normalized = {
    jobId: uuid(value.jobId),
    requestId: positiveInteger(value.requestId),
    relationshipId: positiveInteger(value.relationshipId),
    title: text(value.title, 500),
    city: value.city == null ? null : text(value.city, 120),
    serviceArea: value.serviceArea == null ? null : text(value.serviceArea, 260),
    customerName: text(value.customerName, 200),
    newQuoteEligible: value.newQuoteEligible,
    existingQuote,
  };
  if (!normalized.jobId || !normalized.requestId || !normalized.relationshipId ||
      !normalized.title || normalized.customerName !== customerName ||
      typeof normalized.newQuoteEligible !== "boolean" || existingQuote === undefined ||
      normalized.newQuoteEligible !== (existingQuote === null)) return null;
  return Object.freeze(normalized);
}

export function normalizeProfessionalQuoteCustomerOptions(value) {
  if (!exactKeys(value, ["success", "code", "contractVersion", "customers"]) ||
      value.success !== true ||
      value.code !== "PROFESSIONAL_QUOTE_CUSTOMER_OPTIONS_LOADED" ||
      value.contractVersion !== 1 || !Array.isArray(value.customers) ||
      value.customers.length > 200) return null;
  const ids = new Set();
  const customers = value.customers.map((candidate) => {
    if (!exactKeys(candidate, ["customerId", "displayName", "jobs"])) return null;
    const customerId = positiveInteger(candidate.customerId);
    const displayName = text(candidate.displayName, 200);
    if (!customerId || !displayName || ids.has(customerId) ||
        !Array.isArray(candidate.jobs) || !candidate.jobs.length ||
        candidate.jobs.length > 100) return null;
    ids.add(customerId);
    const jobs = candidate.jobs.map((job) => normalizeJob(job, displayName));
    if (jobs.some((job) => !job)) return null;
    return Object.freeze({ customerId, displayName, jobs: Object.freeze(jobs) });
  });
  return customers.some((customer) => !customer) ? null : Object.freeze(customers);
}

export async function fetchProfessionalQuoteCustomerOptions({
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const result = await authFetchImpl(
    "/professional/quote-customer-options",
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (!result?.response?.ok) {
    throw new Error(result?.data?.message || "Meetro customers could not be loaded.");
  }
  const customers = normalizeProfessionalQuoteCustomerOptions(result.data);
  if (!customers) throw new Error("The server returned invalid Meetro customer options.");
  return customers;
}

export function buildGenericNewQuoteRoute() {
  return "quoteBuilder?new=1";
}

export function isGenericNewQuoteRoute(hash = "") {
  const [page = "", query = ""] = String(hash).replace(/^#/, "").split("?", 2);
  const parameters = new URLSearchParams(query);
  return page === "quoteBuilder" && parameters.get("new") === "1" &&
    !parameters.has("jobId") && !parameters.has("draftId");
}

export function eligibleExternalCustomerOptions({ contacts = [], relationships = [] } = {}) {
  const eligibleContacts = new Map(
    contacts
      .filter((contact) => contact?.status === "ACTIVE")
      .filter((contact) => getBusinessContactActiveRoles(contact).includes("CUSTOMER"))
      .map((contact) => [String(contact.id || "").toLowerCase(), contact])
  );
  return Object.freeze(relationships.flatMap((relationship) => {
    const contact = eligibleContacts.get(String(relationship?.businessContactId || "").toLowerCase());
    return contact && relationship?.id
      ? [Object.freeze({ contact, relationship })]
      : [];
  }));
}

export function buildJobLinkedNewQuoteRoute(job) {
  const jobId = uuid(job?.jobId);
  if (!jobId) return "";
  const draftId = uuid(job?.existingQuote?.workingDraftId);
  const parameters = new URLSearchParams({ jobId });
  if (draftId) parameters.set("draftId", draftId);
  return `quoteBuilder?${parameters.toString()}`;
}
