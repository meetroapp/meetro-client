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
  if (page !== "homeownerRequestDetails") return null;
  const params = new URLSearchParams(query);
  const requestId = positiveInteger(params.get("requestId"));
  if (!requestId) return null;
  return Object.freeze({
    requestId,
    returnPage: params.get("returnPage") === "notifications"
      ? "notifications"
      : "myRequests",
  });
}
