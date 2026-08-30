import { authFetch } from "./authFetch.js";

async function assignmentRequest(path, options = {}, setPage) {
  const { response, data } = await authFetch(path, options, setPage);
  if (!response?.ok || data?.success !== true) {
    const error = new Error(
      data?.message || "Job assignment information is unavailable."
    );
    error.code = data?.code || "JOB_ASSIGNMENT_REQUEST_FAILED";
    error.status = response?.status || 0;
    throw error;
  }
  return data;
}

function businessQuery(businessId) {
  return new URLSearchParams({ businessId: String(businessId || "") });
}

export function fetchManagedJobAssignments(businessId, setPage) {
  return assignmentRequest(
    `/team/jobs?${businessQuery(businessId)}`,
    { method: "GET" },
    setPage
  );
}

export function updateJobAssignments(
  jobId,
  { businessId, membershipIds, idempotencyKey },
  setPage
) {
  return assignmentRequest(
    `/team/jobs/${encodeURIComponent(jobId)}/assignments`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, membershipIds, idempotencyKey }),
    },
    setPage
  );
}

export function fetchEmployeeJobs(businessId, setPage) {
  return assignmentRequest(
    `/employee/jobs?${businessQuery(businessId)}`,
    { method: "GET" },
    setPage
  );
}

export function fetchEmployeeSchedule(businessId, setPage) {
  return assignmentRequest(
    `/employee/schedule?${businessQuery(businessId)}`,
    { method: "GET" },
    setPage
  );
}
