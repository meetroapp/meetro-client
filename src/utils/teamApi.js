import { authFetch } from "./authFetch.js";

async function teamRequest(path, options = {}, setPage) {
  const { response, data } = await authFetch(path, options, setPage);
  if (!response?.ok || data?.success !== true) {
    const error = new Error(
      data?.message || "Team information is unavailable."
    );
    error.code = data?.code || "BUSINESS_TEAM_REQUEST_FAILED";
    error.status = response?.status || 0;
    throw error;
  }
  return data;
}

function jsonOptions(method, body) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function fetchMyTeamAuthority(setPage) {
  return teamRequest("/team/me", { method: "GET" }, setPage);
}

export function fetchBusinessTeam(businessId, setPage) {
  const query = new URLSearchParams({ businessId: String(businessId || "") });
  return teamRequest(`/team?${query.toString()}`, { method: "GET" }, setPage);
}

export function createBusinessTeamInvitation(payload, setPage) {
  return teamRequest(
    "/team/invitations",
    jsonOptions("POST", payload),
    setPage
  );
}

export function resendBusinessTeamInvitation(invitationId, businessId, setPage) {
  return teamRequest(
    `/team/invitations/${encodeURIComponent(invitationId)}/resend`,
    jsonOptions("POST", { businessId }),
    setPage
  );
}

export function acceptBusinessTeamInvitation(token, setPage) {
  return teamRequest(
    "/team/invitations/accept",
    jsonOptions("POST", { token }),
    setPage
  );
}

export function revokeBusinessTeamInvitation(
  invitationId,
  businessId,
  setPage
) {
  return teamRequest(
    `/team/invitations/${encodeURIComponent(invitationId)}/revoke`,
    jsonOptions("POST", { businessId }),
    setPage
  );
}

export function updateBusinessTeamRole(
  membershipId,
  businessId,
  role,
  setPage
) {
  return teamRequest(
    `/team/members/${encodeURIComponent(membershipId)}/role`,
    jsonOptions("PATCH", { businessId, role }),
    setPage
  );
}

export function deactivateBusinessTeamMember(
  membershipId,
  businessId,
  setPage
) {
  return teamRequest(
    `/team/members/${encodeURIComponent(membershipId)}/deactivate`,
    jsonOptions("POST", { businessId }),
    setPage
  );
}
