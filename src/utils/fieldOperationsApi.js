import { authFetch } from "./authFetch.js";

async function fieldRequest(path, options = {}, setPage) {
  const { response, data } = await authFetch(path, options, setPage);
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
