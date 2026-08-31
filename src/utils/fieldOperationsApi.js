import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

async function fieldRequest(path, options = {}, setPage, authFetchImpl = authFetch) {
  const { response, data } = await authFetchImpl(path, options, setPage);
  if (!response?.ok || data?.success !== true) {
    const error = new Error(data?.message || "Job field operations are unavailable.");
    error.code = data?.code || "FIELD_OPERATION_REQUEST_FAILED";
    error.status = response?.status || 0;
    throw error;
  }
  return data;
}

function query({ businessId, assignmentId }) {
  return new URLSearchParams({
    businessId: String(businessId || ""),
    assignmentId: String(assignmentId || ""),
  });
}

export function fetchFieldOperations(jobId, { businessId, assignmentId, managed }, setPage) {
  const surface = managed ? "team" : "employee";
  return fieldRequest(
    `/${surface}/jobs/${encodeURIComponent(jobId)}/field-operations?${query({ businessId, assignmentId })}`,
    { method: "GET" },
    setPage
  );
}

export function fetchManagedFieldCommunications(
  jobId,
  businessId,
  setPage,
  authFetchImpl = authFetch
) {
  const query = new URLSearchParams({
    businessId: String(businessId || ""),
  });
  return fieldRequest(
    `/team/jobs/${encodeURIComponent(jobId)}/field-communications?${query}`,
    { method: "GET", cache: "no-store" },
    setPage,
    authFetchImpl
  );
}

export function buildFieldTeamAlertRoute(destination) {
  if (!destination || typeof destination !== "object" || Array.isArray(destination)) {
    return null;
  }
  const fields = Object.keys(destination);
  const businessId = Number(destination.businessId);
  const jobId = String(destination.jobId || "").trim().toLowerCase();
  if (
    fields.length !== 3 ||
    !fields.includes("businessId") ||
    !fields.includes("jobId") ||
    !fields.includes("audience") ||
    !Number.isSafeInteger(businessId) ||
    businessId <= 0 ||
    !UUID_PATTERN.test(jobId) ||
    destination.audience !== "team"
  ) return null;
  const query = new URLSearchParams({
    businessId: String(businessId),
    jobId,
    audience: "team",
  });
  return `employeeMessages?${query}`;
}

export async function resolveFieldTeamAlertDestination(
  alertId,
  { businessId },
  authFetchImpl = authFetch
) {
  const normalizedAlertId = Number(alertId);
  const normalizedBusinessId = Number(businessId);
  if (
    !Number.isSafeInteger(normalizedAlertId) ||
    normalizedAlertId <= 0 ||
    !Number.isSafeInteger(normalizedBusinessId) ||
    normalizedBusinessId <= 0
  ) {
    const error = new Error("Exact Alert and business identity are required.");
    error.code = "FIELD_TEAM_ALERT_IDENTITY_INVALID";
    error.status = 400;
    throw error;
  }
  const query = new URLSearchParams({
    businessId: String(normalizedBusinessId),
  });
  const data = await fieldRequest(
    `/employee/alerts/${encodeURIComponent(normalizedAlertId)}/team-message-destination?${query}`,
    { method: "GET", cache: "no-store" },
    undefined,
    authFetchImpl
  );
  if (
    data.code !== "FIELD_TEAM_ALERT_DESTINATION_RESOLVED" ||
    data.destination?.businessId !== normalizedBusinessId ||
    !buildFieldTeamAlertRoute(data.destination)
  ) {
    const error = new Error("Private Team communication is unavailable.");
    error.code = "FIELD_TEAM_ALERT_DESTINATION_MALFORMED";
    error.status = 502;
    throw error;
  }
  return data;
}

export function updateFieldStatus(jobId, input, setPage) {
  return fieldRequest(
    `/employee/jobs/${encodeURIComponent(jobId)}/field-status`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    setPage
  );
}

export function sendFieldMessage(jobId, input, { managed, setPage }) {
  const surface = managed ? "team" : "employee";
  return fieldRequest(
    `/${surface}/jobs/${encodeURIComponent(jobId)}/field-messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    setPage
  );
}
