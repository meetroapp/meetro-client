import { authFetch } from "./authFetch.js";
import {
  validateCanonicalQuoteProjection,
  validateCanonicalQuotes,
} from "./canonicalQuoteRead.js";
import { createIntelligenceKey, IntelligenceApiError } from "./contextualIntelligence.js";

function commandError(response, data) {
  return new IntelligenceApiError(
    data?.message || "The canonical Draft Quote could not be updated.",
    { status: response.status, code: data?.code || "QUOTE_DRAFT_COMMAND_FAILED" }
  );
}

async function request({ endpoint, method = "GET", body, key, setPage, authFetchImpl }) {
  const options = { method };
  if (body !== undefined) options.body = JSON.stringify(body);
  if (key) options.headers = { "Idempotency-Key": key };
  const { response, data } = await authFetchImpl(endpoint, options, setPage);
  if (!response.ok || data?.success !== true) throw commandError(response, data);
  return data;
}

export async function applyConfirmedQuoteComposition({
  jobId,
  proposal,
  setPage,
  authFetchImpl = authFetch,
  createKey = createIntelligenceKey(),
  scopeKeys,
}) {
  if (!proposal || proposal.jobId !== jobId || proposal.humanToCanonicalBoundary?.directMutationAllowed !== false) {
    throw new TypeError("A reviewed Quote composition for the exact Job is required.");
  }
  const candidates = proposal.proposedScopeItems
    .filter((item) => item?.canonicalCandidate)
    .map((item) => ({ id: item.id, item: item.canonicalCandidate }));
  if (!candidates.length) {
    throw new IntelligenceApiError("Professional pricing is required before creating a Draft Quote.", { code: "QUOTE_PRICING_REQUIRED" });
  }
  const keys = scopeKeys || candidates.map(() => createIntelligenceKey());
  if (keys.length !== candidates.length) throw new TypeError("A command key is required for every accepted scope item.");

  const listed = await request({
    endpoint: `/jobs/${encodeURIComponent(jobId)}/quotes`,
    setPage,
    authFetchImpl,
  });
  const quotes = validateCanonicalQuotes(listed.quotes, { jobId });
  if (!quotes) throw new IntelligenceApiError("The server returned invalid canonical Quote data.", { code: "INVALID_CANONICAL_QUOTE_RESPONSE" });
  let quote = [...quotes].reverse().find((item) => item.status === "DRAFT") || null;
  if (!quote) {
    const created = await request({
      endpoint: `/jobs/${encodeURIComponent(jobId)}/quotes`,
      method: "POST",
      body: { currency: "USD" },
      key: createKey,
      setPage,
      authFetchImpl,
    });
    quote = validateCanonicalQuoteProjection(created.quote);
  }
  if (!quote || quote.jobId !== jobId || quote.status !== "DRAFT") {
    throw new IntelligenceApiError("An editable canonical Draft Quote is unavailable.", { code: "DRAFT_QUOTE_REQUIRED" });
  }

  for (let index = 0; index < candidates.length; index += 1) {
    const added = await request({
      endpoint: `/quotes/${encodeURIComponent(quote.id)}/scope-items`,
      method: "POST",
      body: { expectedVersion: quote.currentVersion, item: candidates[index].item },
      key: keys[index],
      setPage,
      authFetchImpl,
    });
    const next = validateCanonicalQuoteProjection(added.quote);
    if (!next || next.id !== quote.id || next.jobId !== jobId || next.status !== "DRAFT") {
      throw new IntelligenceApiError("The server returned invalid canonical Quote data.", { code: "INVALID_CANONICAL_QUOTE_RESPONSE" });
    }
    quote = next;
  }
  return quote;
}
