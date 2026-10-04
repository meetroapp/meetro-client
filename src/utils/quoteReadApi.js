import { authFetch } from "./authFetch.js";
import {
  validateCanonicalQuoteProjection,
  validateCanonicalQuotes,
} from "./canonicalQuoteRead.js";

export class CanonicalQuoteReadError extends Error {
  constructor({
    status = 500,
    code = "CANONICAL_QUOTE_READ_FAILED",
    message = "Canonical Quote detail could not be loaded.",
  } = {}) {
    super(message);
    this.name = "CanonicalQuoteReadError";
    this.status = status;
    this.code = code;
  }
}

function invalidResponse() {
  return new CanonicalQuoteReadError({
    status: 502,
    code: "INVALID_CANONICAL_QUOTE_RESPONSE",
    message: "The server returned invalid canonical Quote detail.",
  });
}

async function requestCanonicalQuote({ endpoint, field, validate, setPage }) {
  const { response, data } = await authFetch(endpoint, { method: "GET" }, setPage);
  if (!response.ok || data?.success !== true || !(field in data)) {
    throw new CanonicalQuoteReadError({
      status: response.status,
      code: data?.code,
      message: data?.message,
    });
  }
  const projection = validate(data[field]);
  if (!projection) throw invalidResponse();
  return projection;
}

export function listCanonicalQuotesForJob({ jobId, setPage }) {
  return requestCanonicalQuote({
    endpoint: `/jobs/${encodeURIComponent(jobId)}/quotes`,
    field: "quotes",
    validate: (quotes) => validateCanonicalQuotes(quotes, { jobId }),
    setPage,
  });
}

export function getCanonicalQuoteDetail({ jobId, quoteId, setPage }) {
  return requestCanonicalQuote({
    endpoint: `/quotes/${encodeURIComponent(quoteId)}`,
    field: "quote",
    validate: (quote) => {
      const canonical = validateCanonicalQuoteProjection(quote);
      return canonical?.jobId === jobId && canonical.id === quoteId
        ? canonical
        : null;
    },
    setPage,
  });
}
