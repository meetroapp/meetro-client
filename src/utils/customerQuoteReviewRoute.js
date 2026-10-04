import {
  CANONICAL_CONVERSATION_COMMUNICATION_SHELL,
  buildCanonicalConversationRoute,
  normalizeCanonicalConversationId,
} from "./canonicalConversationMessaging.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const CUSTOMER_QUOTE_REVIEW_PAGE = "customerQuoteReview";

function uuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

export function buildCustomerQuoteReviewRoute({
  quoteId,
  jobId,
  conversationId,
} = {}) {
  const normalizedQuoteId = uuid(quoteId);
  const normalizedJobId = uuid(jobId);
  const normalizedConversationId = normalizeCanonicalConversationId(conversationId);
  if (!normalizedQuoteId || !normalizedJobId || !normalizedConversationId) {
    return "";
  }
  const query = new URLSearchParams({
    quoteId: normalizedQuoteId,
    jobId: normalizedJobId,
    conversationId: String(normalizedConversationId),
  });
  return `${CUSTOMER_QUOTE_REVIEW_PAGE}?${query.toString()}`;
}

export function parseCustomerQuoteReviewRoute(routeValue = "") {
  const route = String(routeValue || "").replace(/^#/, "").trim();
  const [page, query = ""] = route.split("?", 2);
  const params = new URLSearchParams(query);
  const quoteId = uuid(params.get("quoteId"));
  const jobId = uuid(params.get("jobId"));
  const conversationId = normalizeCanonicalConversationId(
    params.get("conversationId")
  );
  const keys = [...params.keys()].sort();
  const exact = JSON.stringify(keys) === JSON.stringify([
    "conversationId",
    "jobId",
    "quoteId",
  ]);
  return Object.freeze({
    page,
    quoteId,
    jobId,
    conversationId,
    valid:
      page === CUSTOMER_QUOTE_REVIEW_PAGE &&
      exact &&
      Boolean(quoteId && jobId && conversationId),
  });
}

export function buildCustomerQuoteConversationReturnRoute(conversationId) {
  return buildCanonicalConversationRoute(
    conversationId,
    CUSTOMER_QUOTE_REVIEW_PAGE,
    { shell: CANONICAL_CONVERSATION_COMMUNICATION_SHELL }
  );
}
