import {
  getCanonicalQuoteJobContext,
  validateNormalizedCanonicalQuoteProjection,
} from "./canonicalQuoteRead.js";
import {
  getCanonicalQuoteDetail,
  listCanonicalQuotesForJob,
} from "./quoteReadApi.js";

export async function loadCanonicalQuotesForRecord({ record, setPage }) {
  const context = getCanonicalQuoteJobContext(record);
  if (!context) return null;
  return listCanonicalQuotesForJob({ jobId: context.jobId, setPage });
}

export async function loadCanonicalQuoteDetail({ record, quote, setPage }) {
  const context = getCanonicalQuoteJobContext(record);
  const canonicalQuote = validateNormalizedCanonicalQuoteProjection(quote);
  if (!context || !canonicalQuote || canonicalQuote.jobId !== context.jobId) {
    return null;
  }
  return getCanonicalQuoteDetail({
    jobId: context.jobId,
    quoteId: canonicalQuote.id,
    setPage,
  });
}
