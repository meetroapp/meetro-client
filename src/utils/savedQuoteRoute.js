const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

export function parseSavedQuoteRoute(hash = "") {
  const [page = "", query = ""] = String(hash).replace(/^#/, "").split("?", 2);
  const parameters = new URLSearchParams(query);
  const hasJobId = parameters.has("jobId");
  const hasDraftId = parameters.has("draftId");
  const jobId = uuid(parameters.get("jobId"));
  const draftId = uuid(parameters.get("draftId"));
  const invalidJobId = hasJobId && !jobId;
  const invalidDraftId = hasDraftId && !draftId;
  return Object.freeze({
    page,
    jobId,
    draftId,
    valid:
      ["quoteBuilder", "invoiceBuilder", "depositRequestBuilder"].includes(page) &&
      !invalidJobId &&
      !invalidDraftId &&
      (page === "quoteBuilder" || !hasDraftId),
    invalidJobId,
    invalidDraftId,
    intent: draftId ? "EXACT_SAVED_QUOTE" : jobId ? "JOB_CONTEXT" : "STANDALONE",
  });
}

export function buildSavedQuoteRoute({ jobId = "", draftId = "" } = {}) {
  const normalizedJobId = uuid(jobId);
  const normalizedDraftId = uuid(draftId);
  if ((jobId && !normalizedJobId) || (draftId && !normalizedDraftId)) return "";
  const parameters = new URLSearchParams();
  if (normalizedJobId) parameters.set("jobId", normalizedJobId);
  if (normalizedDraftId) parameters.set("draftId", normalizedDraftId);
  const query = parameters.toString();
  return `quoteBuilder${query ? `?${query}` : ""}`;
}

export function replaceSavedQuoteRoute(identity, browser = globalThis.window) {
  const route = buildSavedQuoteRoute(identity);
  if (!route || !browser?.history?.replaceState || !browser?.location) return false;
  const nextUrl = `${browser.location.pathname || ""}${browser.location.search || ""}#${route}`;
  browser.history.replaceState(browser.history.state, "", nextUrl);
  return true;
}

export function validateSavedQuoteRouteDocument(document, {
  jobId = "",
  draftId = "",
} = {}) {
  const expectedJobId = uuid(jobId);
  const expectedDraftId = uuid(draftId);
  const documentId = uuid(document?.id);
  const documentJobId = uuid(document?.jobId);
  if (
    !expectedDraftId ||
    documentId !== expectedDraftId ||
    document?.documentType !== "QUOTE" ||
    document?.status !== "WORKING_DRAFT"
  ) {
    return Object.freeze({ status: "unavailable", reason: "SAVED_QUOTE_UNAVAILABLE" });
  }
  if (expectedJobId && documentJobId !== expectedJobId) {
    return Object.freeze({ status: "unavailable", reason: "JOB_DRAFT_MISMATCH" });
  }
  return Object.freeze({
    status: "ready",
    reason: "",
    documentId,
    jobId: documentJobId,
    document,
  });
}

export async function bootstrapExactSavedQuote({ route, getDocument } = {}) {
  if (
    route?.valid !== true ||
    route.intent !== "EXACT_SAVED_QUOTE" ||
    !uuid(route.draftId) ||
    typeof getDocument !== "function"
  ) {
    return Object.freeze({ status: "unavailable", reason: "INVALID_SAVED_QUOTE_ROUTE" });
  }
  try {
    const document = await getDocument(route.draftId);
    return validateSavedQuoteRouteDocument(document, route);
  } catch {
    return Object.freeze({ status: "unavailable", reason: "SAVED_QUOTE_UNAVAILABLE" });
  }
}

export function resolveOwnedSavedQuotesForJob(documents, jobId) {
  const expectedJobId = uuid(jobId);
  if (!expectedJobId || !Array.isArray(documents)) {
    return Object.freeze({ status: "unavailable", documents: Object.freeze([]) });
  }
  const matches = documents.filter((document) =>
    document?.documentType === "QUOTE" &&
    document?.status === "WORKING_DRAFT" &&
    uuid(document?.id) &&
    uuid(document?.jobId) === expectedJobId
  );
  if (matches.length === 0) {
    return Object.freeze({ status: "none", documents: Object.freeze([]) });
  }
  if (matches.length > 1) {
    return Object.freeze({ status: "ambiguous", documents: Object.freeze(matches) });
  }
  return Object.freeze({
    status: "exact",
    documents: Object.freeze(matches),
    resume: Object.freeze({
      jobId: expectedJobId,
      documentId: uuid(matches[0].id),
    }),
  });
}
