const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

export function buildProfessionalWorkCenterRoute({ jobId, quoteId } = {}) {
  const canonicalJobId = uuid(jobId);
  const canonicalQuoteId = uuid(quoteId);
  if (!canonicalJobId || !canonicalQuoteId) return null;
  const query = new URLSearchParams({
    jobId: canonicalJobId,
    quoteId: canonicalQuoteId,
  });
  return `workCenter?${query.toString()}`;
}

export function parseProfessionalWorkCenterRoute(value) {
  const route = String(value || "").replace(/^#/, "");
  const [page, query = ""] = route.split("?", 2);
  if (page !== "workCenter") return null;
  const params = new URLSearchParams(query);
  if ([...params.keys()].some((key) => !["jobId", "quoteId"].includes(key))) {
    return null;
  }
  const jobId = uuid(params.get("jobId"));
  const quoteId = uuid(params.get("quoteId"));
  return jobId && quoteId ? Object.freeze({ jobId, quoteId }) : null;
}
