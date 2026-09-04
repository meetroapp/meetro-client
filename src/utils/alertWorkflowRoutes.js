function positiveInteger(value) {
  const raw = String(value || "");
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseBusinessLeadAlertRoute(value = "") {
  const route = String(value || "").replace(/^#/, "");
  const [page, query = ""] = route.split("?", 2);
  if (page !== "businessLeads") return null;
  const params = new URLSearchParams(query);
  const requestId = positiveInteger(params.get("requestId"));
  const emergencyRequestId = positiveInteger(params.get("emergencyRequestId"));
  if (Boolean(requestId) === Boolean(emergencyRequestId)) return null;
  return Object.freeze({
    requestId,
    emergencyRequestId,
    returnPage: params.get("returnPage") === "notifications"
      ? "notifications"
      : "",
  });
}

export function parseHomeownerRequestAlertRoute(value = "") {
  const route = String(value || "").replace(/^#/, "");
  const [page, query = ""] = route.split("?", 2);

  if (page !== "homeownerRequestDetails") {
    return null;
  }

  const params = new URLSearchParams(query);

  if (
    [...params.keys()].some(
      (key) =>
        ![
          "requestId",
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

  const requestId =
    positiveInteger(params.get("requestId"));
  const jobId = uuid(params.get("jobId"));
  const quoteId = uuid(params.get("quoteId"));
  const visitId = uuid(params.get("visitId"));
  const stage = workCenterStage(
    params.get("stage")
  );
  const returnPage =
    params.get("returnPage") === "notifications"
      ? "notifications"
      : "myRequests";

  if (!requestId && !jobId) return null;

  if (
    requestId &&
    !jobId &&
    !quoteId &&
    !visitId &&
    !stage
  ) {
    return Object.freeze({
      requestId,
      returnPage,
    });
  }

  return Object.freeze({
    requestId,
    jobId,
    quoteId,
    visitId,
    stage,
    returnPage,
  });
}


const WORK_CENTER_ALERT_STAGE_SET = new Set([
  "evaluation",
  "quote",
  "deposit",
  "schedule",
  "work",
  "invoice",
  "completion",
  "review",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(value) {
  const normalized =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : "";

  return UUID_PATTERN.test(normalized)
    ? normalized
    : null;
}

function workCenterStage(value) {
  return typeof value === "string" &&
    WORK_CENTER_ALERT_STAGE_SET.has(value)
    ? value
    : null;
}

export function buildHomeownerWorkCenterAlertRoute({
  requestId = null,
  jobId = null,
  quoteId = null,
  visitId = null,
  stage = null,
  returnPage = "notifications",
} = {}) {
  const canonicalRequestId =
    positiveInteger(requestId);
  const canonicalJobId = uuid(jobId);
  const canonicalQuoteId = uuid(quoteId);
  const canonicalVisitId = uuid(visitId);
  const canonicalStage = workCenterStage(stage);

  if (!canonicalRequestId && !canonicalJobId) {
    return null;
  }

  const query = new URLSearchParams();

  if (canonicalRequestId) {
    query.set(
      "requestId",
      String(canonicalRequestId)
    );
  }

  if (canonicalJobId) {
    query.set("jobId", canonicalJobId);
  }

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
    query.set("returnPage", "notifications");
  }

  return `homeownerRequestDetails?${query.toString()}`;
}
