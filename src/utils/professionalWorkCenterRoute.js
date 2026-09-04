const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

const WORK_CENTER_STAGE_SET = new Set([
  "evaluation",
  "quote",
  "deposit",
  "schedule",
  "work",
  "invoice",
  "completion",
  "review",
]);

function stage(value) {
  return typeof value === "string" &&
    WORK_CENTER_STAGE_SET.has(value)
    ? value
    : null;
}

export function buildProfessionalWorkCenterRoute({
  jobId,
  quoteId = null,
  visitId = null,
  stage: stageValue = null,
  returnPage = "",
} = {}) {
  const canonicalJobId = uuid(jobId);
  const canonicalQuoteId = uuid(quoteId);
  const canonicalVisitId = uuid(visitId);
  const canonicalStage = stage(stageValue);

  if (
    !canonicalJobId ||
    (!canonicalQuoteId &&
      !canonicalVisitId &&
      !canonicalStage)
  ) {
    return null;
  }

  const query = new URLSearchParams({
    jobId: canonicalJobId,
  });

  if (canonicalQuoteId) {
    query.set("quoteId", canonicalQuoteId);
  }

  if (canonicalVisitId) {
    query.set("visitId", canonicalVisitId);
  }

  if (canonicalStage) {
    query.set("stage", canonicalStage);
  }

  if (returnPage === "notifications") {
    query.set("returnPage", returnPage);
  }

  return `workCenter?${query.toString()}`;
}

export function parseProfessionalWorkCenterRoute(value) {
  const route = String(value || "").replace(/^#/, "");
  const [page, query = ""] = route.split("?", 2);
  if (page !== "workCenter") return null;
  const params = new URLSearchParams(query);
  if (
    [...params.keys()].some(
      (key) =>
        ![
          "jobId",
          "quoteId",
          "visitId",
          "stage",
          "returnPage",
        ].includes(key)
    )
  ) {
    return null;
  }

  const jobId = uuid(params.get("jobId"));
  const quoteId = uuid(params.get("quoteId"));
  const visitId = uuid(params.get("visitId"));
  const canonicalStage = stage(params.get("stage"));
  const returnPage =
    params.get("returnPage") === "notifications"
      ? "notifications"
      : "";

  if (
    !jobId ||
    (!quoteId && !visitId && !canonicalStage)
  ) {
    return null;
  }

  if (
    quoteId &&
    !visitId &&
    !canonicalStage &&
    !returnPage
  ) {
    return Object.freeze({ jobId, quoteId });
  }

  const result = {
    jobId,
    quoteId,
    visitId,
    returnPage,
  };

  if (canonicalStage) {
    result.stage = canonicalStage;
  }

  return Object.freeze(result);
}
