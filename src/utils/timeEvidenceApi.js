import { authFetch } from "./authFetch.js";

async function timeRequest(path, options = {}, setPage) {
  const { response, data } = await authFetch(path, options, setPage);
  if (!response?.ok || data?.success !== true) {
    const error = new Error(data?.message || "Employee time evidence is unavailable.");
    error.code = data?.code || "TIME_EVIDENCE_REQUEST_FAILED";
    error.status = response?.status || 0;
    throw error;
  }
  return data;
}

export function fetchOwnTime(businessId, setPage) {
  const query = new URLSearchParams({ businessId: String(businessId || "") });
  return timeRequest(`/employee/time?${query}`, { method: "GET" }, setPage);
}

export function fetchTeamTime(businessId, setPage) {
  const query = new URLSearchParams({ businessId: String(businessId || "") });
  return timeRequest(`/team/time?${query}`, { method: "GET" }, setPage);
}

export function fetchBusinessTimeSettings(businessId, setPage) {
  const query = new URLSearchParams({ businessId: String(businessId || "") });
  return timeRequest(`/team/time-settings?${query}`, { method: "GET" }, setPage);
}

export function updateBusinessTimeSettings(input, setPage) {
  return timeRequest(
    "/team/time-settings",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    setPage
  );
}

export function fetchTeamToday(businessId, setPage) {
  const query = new URLSearchParams({ businessId: String(businessId || "") });
  return timeRequest(`/team/today?${query}`, { method: "GET" }, setPage);
}

export function fetchTimesheets(businessId, range, setPage) {
  const query = new URLSearchParams({
    businessId: String(businessId || ""),
    range: String(range || "TODAY"),
  });
  return timeRequest(`/team/timesheets?${query}`, { method: "GET" }, setPage);
}

export function clockInTime(input, setPage) {
  return timeRequest(
    "/employee/time/clock-in",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    setPage
  );
}

export function clockOutTime(input, setPage) {
  return timeRequest(
    "/employee/time/clock-out",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    setPage
  );
}
