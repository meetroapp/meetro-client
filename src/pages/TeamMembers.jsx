import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import {
  acceptBusinessTeamInvitation,
  createBusinessTeamInvitation,
  deactivateBusinessTeamMember,
  fetchBusinessTeam,
  fetchMyTeamAuthority,
  revokeBusinessTeamInvitation,
  updateBusinessTeamRole,
} from "../utils/teamApi";

const ROLE_OPTIONS = Object.freeze([
  { value: "MANAGER", label: "Manager" },
  { value: "BOOKKEEPER_FINANCE", label: "Bookkeeper / Finance" },
  { value: "FIELD_EMPLOYEE", label: "Field Employee" },
]);

function invitationTokenFromLocation() {
  try {
    const query = String(window.location.hash || "").split("?")[1] || "";
    return new URLSearchParams(query).get("invitation") || "";
  } catch {
    return "";
  }
}

function roleLabel(role) {
  if (role === "OWNER") return "Owner";
  return ROLE_OPTIONS.find((option) => option.value === role)?.label || role;
}

function statusLabel(status) {
  return String(status || "")
    .toLowerCase()
    .replace(/_/g, " ");
}

function TeamMembers({ setPage }) {
  const [authority, setAuthority] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invitationLink, setInvitationLink] = useState("");
  const [inviteDraft, setInviteDraft] = useState({
    displayName: "",
    email: "",
    role: "FIELD_EMPLOYEE",
  });
  const [invitationToken] = useState(() => invitationTokenFromLocation());

  const selectedMembership = useMemo(() => {
    const memberships = authority?.memberships || [];
    return (
      memberships.find((item) => item.permissions?.includes("TEAM_VIEW")) ||
      null
    );
  }, [authority]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const mine = await fetchMyTeamAuthority(setPage);
      setAuthority(mine);
      const memberships = mine.memberships || [];
      const selected = memberships.find((item) =>
        item.permissions?.includes("TEAM_VIEW")
      );
      if (selected) {
        setTeam(await fetchBusinessTeam(selected.businessId, setPage));
      } else {
        setTeam(null);
      }
    } catch (loadError) {
      setError(loadError.message || "Team information is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [setPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function acceptInvitation() {
    if (!invitationToken) return;
    setWorking(true);
    setError("");
    try {
      await acceptBusinessTeamInvitation(invitationToken, setPage);
      setNotice(
        "Invitation accepted. Your exact business Team membership is active."
      );
      await load();
    } catch (acceptError) {
      setError(acceptError.message || "The invitation could not be accepted.");
    } finally {
      setWorking(false);
    }
  }

  async function createInvitation(event) {
    event.preventDefault();
    if (!selectedMembership) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const result = await createBusinessTeamInvitation(
        {
          businessId: selectedMembership.businessId,
          ...inviteDraft,
        },
        setPage
      );
      const link = `${
        window.location.origin
      }/login#teamMembers?invitation=${encodeURIComponent(
        result.invitation.token
      )}`;
      setInvitationLink(link);
      setNotice(
        "Invitation created. Its pending state now reserves one professional seat."
      );
      setInviteDraft({ displayName: "", email: "", role: "FIELD_EMPLOYEE" });
      await load();
    } catch (inviteError) {
      setError(inviteError.message || "The invitation could not be created.");
    } finally {
      setWorking(false);
    }
  }

  async function copyInvitationLink() {
    await navigator.clipboard.writeText(invitationLink);
    setNotice(
      "Invitation link copied. Share it only with the exact invited person."
    );
  }

  async function revokeInvitation(invitationId) {
    if (
      !window.confirm(
        "Revoke this pending invitation and release its reserved seat?"
      )
    )
      return;
    setWorking(true);
    try {
      await revokeBusinessTeamInvitation(
        invitationId,
        selectedMembership.businessId,
        setPage
      );
      setNotice("Invitation revoked. The reserved seat is available again.");
      await load();
    } catch (revokeError) {
      setError(revokeError.message || "The invitation could not be revoked.");
    } finally {
      setWorking(false);
    }
  }

  async function changeRole(membershipId, role) {
    setWorking(true);
    try {
      await updateBusinessTeamRole(
        membershipId,
        selectedMembership.businessId,
        role,
        setPage
      );
      setNotice("Team role updated from server authority.");
      await load();
    } catch (roleError) {
      setError(roleError.message || "The Team role could not be updated.");
    } finally {
      setWorking(false);
    }
  }

  async function deactivateMember(membershipId) {
    if (
      !window.confirm(
        "Deactivate this Team membership? Its history will be preserved."
      )
    )
      return;
    setWorking(true);
    try {
      await deactivateBusinessTeamMember(
        membershipId,
        selectedMembership.businessId,
        setPage
      );
      setNotice(
        "Team member deactivated. Historical membership was preserved."
      );
      await load();
    } catch (deactivateError) {
      setError(
        deactivateError.message || "The Team member could not be deactivated."
      );
    } finally {
      setWorking(false);
    }
  }

  const permissions = new Set(
    team?.permissions || selectedMembership?.permissions || []
  );
  const seatAuthority = team?.seatAuthority;

  return (
    <div
      className="app-page meetro-responsive-page meetro-visual-page"
      style={pageStyle}
    >
      <BusinessToolsPageHeader
        title="Team Members"
        description="Server-owned membership, invitation, role, and seat authority for your business."
        categoryLabel="Business Operations"
        onBack={() =>
          setPage(selectedMembership ? "businessCommandCenter" : "home")
        }
      />

      {error && (
        <div role="alert" style={errorStyle}>
          {error}
        </div>
      )}
      {notice && (
        <div role="status" style={noticeStyle}>
          {notice}
        </div>
      )}

      {invitationToken && (
        <section style={cardStyle} aria-labelledby="team-invitation-heading">
          <p style={eyebrowStyle}>Invitation</p>
          <h2 id="team-invitation-heading" style={headingStyle}>
            Join the exact business Team
          </h2>
          <p style={copyStyle}>
            Acceptance is bound to your authenticated email and cannot be
            claimed by another account.
          </p>
          <button
            type="button"
            style={primaryButton}
            onClick={acceptInvitation}
            disabled={working}
          >
            {working ? "Verifying…" : "Accept Team Invitation"}
          </button>
        </section>
      )}

      {loading ? (
        <div role="status" style={cardStyle}>
          Loading Team authority…
        </div>
      ) : team ? (
        <>
          <section style={summaryGrid} aria-label="Team seat authority">
            <div style={metricCard}>
              <span style={metricLabel}>Business</span>
              <strong>
                {team.business?.name || `Business ${team.business?.id}`}
              </strong>
            </div>
            <div style={metricCard}>
              <span style={metricLabel}>Seat authority</span>
              <strong>
                {seatAuthority?.source === "MEETRO_BUSINESS_TRIAL"
                  ? "Meetro Business Trial"
                  : seatAuthority?.source === "PAID_SUBSCRIPTION"
                  ? "Paid plan"
                  : "Staging QA"}
              </strong>
            </div>
            <div style={metricCard}>
              <span style={metricLabel}>Reserved / total</span>
              <strong>
                {seatAuthority?.reservedSeats ?? 0} /{" "}
                {seatAuthority?.seatLimit ?? 0}
              </strong>
            </div>
            <div style={metricCard}>
              <span style={metricLabel}>Available</span>
              <strong>{seatAuthority?.seatsAvailable ?? 0}</strong>
            </div>
          </section>

          {permissions.has("TEAM_INVITE") && (
            <section style={cardStyle}>
              <p style={eyebrowStyle}>Add a Team member</p>
              <h2 style={headingStyle}>Create invitation</h2>
              <p style={copyStyle}>
                A pending invitation immediately reserves one seat. The owner
                already occupies one seat.
              </p>
              <form onSubmit={createInvitation} style={formGrid}>
                <label style={labelStyle}>
                  Name
                  <input
                    style={inputStyle}
                    value={inviteDraft.displayName}
                    onChange={(event) =>
                      setInviteDraft((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    maxLength={160}
                  />
                </label>
                <label style={labelStyle}>
                  Email
                  <input
                    style={inputStyle}
                    type="email"
                    required
                    value={inviteDraft.email}
                    onChange={(event) =>
                      setInviteDraft((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </label>
                <label style={labelStyle}>
                  Preset role
                  <select
                    style={inputStyle}
                    value={inviteDraft.role}
                    onChange={(event) =>
                      setInviteDraft((current) => ({
                        ...current,
                        role: event.target.value,
                      }))
                    }
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  style={primaryButton}
                  disabled={working || (seatAuthority?.seatsAvailable ?? 0) < 1}
                >
                  Create Invitation
                </button>
              </form>
              {invitationLink && (
                <div style={linkBox}>
                  <code style={linkCode}>{invitationLink}</code>
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={copyInvitationLink}
                  >
                    Copy link
                  </button>
                </div>
              )}
            </section>
          )}

          <section style={cardStyle}>
            <p style={eyebrowStyle}>Memberships</p>
            <h2 style={headingStyle}>People in this business</h2>
            <div style={listStyle}>
              {(team.members || []).map((member) => (
                <article key={member.id} style={rowStyle}>
                  <div>
                    <strong>{member.displayName || member.email}</strong>
                    <p style={rowMeta}>
                      {member.email} · {statusLabel(member.status)}
                    </p>
                  </div>
                  <div style={rowActions}>
                    {permissions.has("TEAM_MANAGE_ROLES") &&
                    member.role !== "OWNER" &&
                    member.status === "ACTIVE" ? (
                      <select
                        aria-label={`Role for ${
                          member.displayName || member.email
                        }`}
                        style={compactSelect}
                        value={member.role}
                        disabled={working}
                        onChange={(event) =>
                          changeRole(member.id, event.target.value)
                        }
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={rolePill}>{roleLabel(member.role)}</span>
                    )}
                    {permissions.has("TEAM_DEACTIVATE") &&
                      member.role !== "OWNER" &&
                      member.status === "ACTIVE" &&
                      member.userId !== team.actor?.userId && (
                        <button
                          type="button"
                          style={dangerButton}
                          onClick={() => deactivateMember(member.id)}
                          disabled={working}
                        >
                          Deactivate
                        </button>
                      )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <p style={eyebrowStyle}>Invitations</p>
            <h2 style={headingStyle}>Seat reservations</h2>
            {(team.invitations || []).length === 0 ? (
              <p style={copyStyle}>No invitations yet.</p>
            ) : (
              <div style={listStyle}>
                {team.invitations.map((invitation) => (
                  <article key={invitation.id} style={rowStyle}>
                    <div>
                      <strong>
                        {invitation.displayName || invitation.email}
                      </strong>
                      <p style={rowMeta}>
                        {invitation.email} · {roleLabel(invitation.role)} ·{" "}
                        {statusLabel(invitation.status)}
                      </p>
                    </div>
                    {invitation.status === "PENDING" &&
                      permissions.has("TEAM_REVOKE_INVITATION") && (
                        <button
                          type="button"
                          style={dangerButton}
                          onClick={() => revokeInvitation(invitation.id)}
                          disabled={working}
                        >
                          Revoke
                        </button>
                      )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section style={cardStyle}>
          <h2 style={headingStyle}>
            {authority?.memberships?.length
              ? "Your Team membership"
              : "No active Team workspace"}
          </h2>
          <p style={copyStyle}>
            {authority?.memberships?.length
              ? `Your ${roleLabel(
                  authority.memberships[0].role
                )} membership is ${statusLabel(
                  authority.memberships[0].status
                )}. Team administration is available to Owners and Managers.`
              : authority?.pendingInvitations?.length
              ? "Open the exact invitation link to accept your pending membership."
              : "This account does not have an active business Team membership."}
          </p>
        </section>
      )}

      <BottomNav setPage={setPage} currentPage="teamMembers" />
    </div>
  );
}

const pageStyle = { paddingBottom: 96 };
const cardStyle = {
  background: "#fff",
  border: "1px solid #dce8df",
  borderRadius: 18,
  padding: 22,
  margin: "16px 0",
  boxShadow: "0 10px 30px rgba(20, 63, 39, 0.06)",
};
const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
  margin: "16px 0",
};
const metricCard = { ...cardStyle, margin: 0, display: "grid", gap: 6 };
const metricLabel = {
  color: "#607568",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: ".08em",
};
const eyebrowStyle = { ...metricLabel, margin: "0 0 6px" };
const headingStyle = { color: "#143f27", margin: "0 0 8px", fontSize: 22 };
const copyStyle = { color: "#52675a", margin: "0 0 16px", lineHeight: 1.5 };
const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
  alignItems: "end",
};
const labelStyle = {
  display: "grid",
  gap: 6,
  color: "#294c37",
  fontWeight: 700,
  fontSize: 14,
};
const inputStyle = {
  minHeight: 44,
  border: "1px solid #bdd0c2",
  borderRadius: 10,
  padding: "9px 11px",
  background: "#fff",
  color: "#173d27",
};
const primaryButton = {
  minHeight: 44,
  border: 0,
  borderRadius: 11,
  padding: "10px 16px",
  background: "#125d34",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};
const secondaryButton = {
  ...primaryButton,
  background: "#edf6ef",
  color: "#125d34",
  border: "1px solid #b9d3c0",
};
const dangerButton = {
  ...secondaryButton,
  color: "#8b2e2e",
  background: "#fff6f4",
  borderColor: "#e4b9b3",
};
const listStyle = { display: "grid", gap: 10 };
const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: 14,
  border: "1px solid #e1eae3",
  borderRadius: 12,
  background: "#fbfdfb",
};
const rowMeta = { margin: "4px 0 0", color: "#64776b", fontSize: 13 };
const rowActions = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};
const rolePill = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#e7f4e9",
  color: "#1d6035",
  fontWeight: 700,
  fontSize: 13,
};
const compactSelect = { ...inputStyle, minHeight: 38, padding: "6px 9px" };
const linkBox = {
  marginTop: 14,
  padding: 12,
  borderRadius: 10,
  background: "#f2f7f3",
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};
const linkCode = {
  flex: "1 1 300px",
  overflowWrap: "anywhere",
  color: "#234b32",
};
const noticeStyle = {
  ...cardStyle,
  background: "#edf8ef",
  color: "#1a5d31",
  borderColor: "#b9d9c0",
};
const errorStyle = {
  ...cardStyle,
  background: "#fff4f2",
  color: "#8b2e2e",
  borderColor: "#e7beb8",
};

export default TeamMembers;
