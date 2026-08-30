const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

export function buildProfessionalWorkCenterRoute({
  jobId,
  quoteId = null,
  visitId = null,
  returnPage = "",
} = {}) {
  const canonicalJobId = uuid(jobId);
  const canonicalQuoteId = uuid(quoteId);
  const canonicalVisitId = uuid(visitId);
  if (!canonicalJobId || (!canonicalQuoteId && !canonicalVisitId)) return null;
  const query = new URLSearchParams({ jobId: canonicalJobId });
  if (canonicalQuoteId) query.set("quoteId", canonicalQuoteId);
  if (canonicalVisitId) query.set("visitId", canonicalVisitId);
  if (returnPage === "notifications") query.set("returnPage", returnPage);
  return `workCenter?${query.toString()}`;
}

export function parseProfessionalWorkCenterRoute(value) {
  const route = String(value || "").replace(/^#/, "");
  const [page, query = ""] = route.split("?", 2);
  if (page !== "workCenter") return null;
  const params = new URLSearchParams(query);
  if ([...params.keys()].some((key) => !["jobId", "quoteId", "visitId", "returnPage"].includes(key))) {
    return null;
  }
  const jobId = uuid(params.get("jobId"));
  const quoteId = uuid(params.get("quoteId"));
  const visitId = uuid(params.get("visitId"));
  const returnPage = params.get("returnPage") === "notifications"
    ? "notifications"
    : "";
  if (!jobId || (!quoteId && !visitId)) return null;
  if (quoteId && !visitId && !returnPage) {
    return Object.freeze({ jobId, quoteId });
  }
  return Object.freeze({ jobId, quoteId, visitId, returnPage });
}
