import {
  CANONICAL_CONVERSATION_COMMUNICATION_SHELL,
  buildCanonicalConversationRoute,
  normalizeCanonicalConversationId,
} from "./canonicalConversationMessaging.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const CUSTOMER_INVOICE_REVIEW_PAGE = "customerInvoiceReview";

function uuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}
export function buildCustomerInvoiceReviewRoute({ invoiceId, jobId, conversationId } = {}) {
  const normalizedInvoiceId = uuid(invoiceId);
  const normalizedJobId = uuid(jobId);
  const normalizedConversationId = normalizeCanonicalConversationId(conversationId);
  if (!normalizedInvoiceId || !normalizedJobId || !normalizedConversationId) return "";
  const query = new URLSearchParams({
    invoiceId: normalizedInvoiceId,
    jobId: normalizedJobId,
    conversationId: String(normalizedConversationId),
  });
  return `${CUSTOMER_INVOICE_REVIEW_PAGE}?${query}`;
}

export function parseCustomerInvoiceReviewRoute(routeValue = "") {
  const route = String(routeValue || "").replace(/^#/, "").trim();
  const [page, query = ""] = route.split("?", 2);
  const params = new URLSearchParams(query);
  const invoiceId = uuid(params.get("invoiceId"));
  const jobId = uuid(params.get("jobId"));
  const conversationId = normalizeCanonicalConversationId(params.get("conversationId"));
  const exact = JSON.stringify([...params.keys()].sort()) === JSON.stringify([
    "conversationId", "invoiceId", "jobId",
  ]);
  return Object.freeze({
    page, invoiceId, jobId, conversationId,
    valid: page === CUSTOMER_INVOICE_REVIEW_PAGE && exact && Boolean(invoiceId && jobId && conversationId),
  });
}

export function buildCustomerInvoiceConversationReturnRoute(conversationId) {
  return buildCanonicalConversationRoute(
    conversationId,
    CUSTOMER_INVOICE_REVIEW_PAGE,
    { shell: CANONICAL_CONVERSATION_COMMUNICATION_SHELL }
  );
}
