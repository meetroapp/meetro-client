import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import { authFetch, clearMeetroSession } from "../utils/authFetch";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import {
  acceptBusinessTeamInvitation,
  createBusinessTeamInvitation,
  deactivateBusinessTeamMember,
  fetchBusinessTeam,
  fetchMyTeamAuthority,
  inspectBusinessTeamInvitation,
  resendBusinessTeamInvitation,
  revokeBusinessTeamInvitation,
  updateBusinessTeamRole,
} from "../utils/teamApi";
import { resolvePrimaryTeamExperience } from "../utils/teamRoleExperience";
import { getAuthenticatedIdentitySnapshot } from "../utils/session";

const ROLE_OPTIONS = Object.freeze([
  { value: "MANAGER", label: "Manager" },
  { value: "BOOKKEEPER_FINANCE", label: "Bookkeeper / Finance" },
  { value: "FIELD_EMPLOYEE", label: "Field Employee" },
]);

const INVITATION_HASH_PATH = "/login#teamMembers?invitation=";
const INVITATION_NOTES = Object.freeze({
  genericCreate:
    "Invitation created. Its pending state now reserves one professional seat.",
  genericResend: "Invitation resent.",
  copySuccess: "Invitation link copied.",
  copyFailure: "Unable to copy automatically.\nSelect and copy the invitation link below.",
  noLink: "No invitation link is available for this Team invitation.",
  emailSent:
    "Invitation sent to:\n{email}\n\nPending · Seat reserved",
  emailFailed:
    "Invitation created, but email could not be delivered.\n\nPending · Seat reserved",
  resendEmailFailed:
    "Invitation was not resent, but the original invitation remains pending.",
  deliverySuccess: "Email: Sent",
  deliveryFailed: "Email: Delivery failed",
});

function toText(value) {
  return String(value || "").trim();
}

function firstTruthyText(...values) {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return "";
}

function resolveClientBaseUrl() {
  const env = import.meta.env || {};
  return (
    firstTruthyText(
      env.VITE_CLIENT_BASE_URL,
      env.VITE_CLIENT_ORIGIN,
      env.VITE_WEB_ORIGIN,
      env.VITE_APP_ORIGIN,
      env.VITE_APP_BASE_URL
    ).replace(/\/+$/, "") ||
    toText(window.location.origin).replace(/\/+$/, "")
  );
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(toText(value));
}

function normalizeInvitationDeliveryState(invitation = {}) {
  const raw = String(
    firstTruthyText(
      invitation.emailDeliveryStatus,
      invitation.deliveryStatus,
      invitation.delivery?.status,
      invitation.delivery?.email?.status,
      invitation.emailDelivery?.status,
      invitation.emailDelivery?.delivered,
      invitation.emailDelivery,
      invitation.emailSent,
      invitation.deliveryStatusCode
    ) || ""
  ).toLowerCase();
  if (raw === "true") return "sent";
  if (["sent", "delivered", "delivered_to_recipient", "queued", "success", "ok"].includes(raw)) return "sent";
  if (raw === "false") return "failed";
  if (
    ["failed", "blocked", "error", "undelivered", "delivery_failed", "not_delivered", "reject", "rejects", "bounced", "bounced_permanent"].includes(raw)
  ) return "failed";
  return "";
}

function resolveInvitationLink(invitation = {}, fallbackBaseUrl = "") {
  const baseUrl = toText(fallbackBaseUrl) || resolveClientBaseUrl();
  const explicitLink = firstTruthyText(
    invitation.joinUrl,
    invitation.inviteUrl,
    invitation.link,
    invitation.url,
    invitation.invitationUrl,
    invitation.webUrl,
    invitation.inviteLink
  );
  if (explicitLink && isHttpUrl(explicitLink)) return explicitLink;
  if (explicitLink) {
    const cleanExplicit = explicitLink.startsWith("/")
      ? explicitLink
      : `/${explicitLink}`;
    return `${baseUrl}${cleanExplicit}`;
  }
  const token = firstTruthyText(
    invitation.token,
    invitation.invitationToken
  );
  if (!token || !baseUrl) return "";
  return `${baseUrl}${INVITATION_HASH_PATH}${encodeURIComponent(token)}`;
}

function deliveryLabel(invitation = {}) {
  const state = normalizeInvitationDeliveryState(invitation);
  if (state === "sent") return INVITATION_NOTES.deliverySuccess;
  if (state === "failed") return INVITATION_NOTES.deliveryFailed;
  return "";
}

function resolveInvitationNotice(invitation, fallbackEmail = "", mode = "create") {
  const state = normalizeInvitationDeliveryState(invitation);
  const email = toText(fallbackEmail || invitation?.email);
  if (state === "sent") {
    return email
      ? INVITATION_NOTES.emailSent.replace("{email}", email)
      : mode === "resend"
      ? `${INVITATION_NOTES.deliverySuccess}\n\n${INVITATION_NOTES.genericResend}`
      : INVITATION_NOTES.genericCreate + "\n" + INVITATION_NOTES.deliverySuccess;
  }
  if (state === "failed") {
    return mode === "resend"
      ? INVITATION_NOTES.resendEmailFailed
      : INVITATION_NOTES.emailFailed;
  }
  return mode === "resend" ? INVITATION_NOTES.genericResend : INVITATION_NOTES.genericCreate;
}

function invitationTokenFromLocation() {
  try {
    const query = String(window.location.hash || "").split("?")[1] || "";
    return new URLSearchParams(query).get("invitation") || "";
  } catch {
    return "";
  }
}

function normalizeIdentityEmail(value) {
  return String(value || "").trim().toLowerCase();
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
  const [manualCopyLink, setManualCopyLink] = useState("");
  const [inviteSendState, setInviteSendState] = useState("");
  const [resendSendStateById, setResendSendStateById] = useState({});
  const [invitationPreview, setInvitationPreview] = useState(null);
  const [invitationPreviewLoading, setInvitationPreviewLoading] =
    useState(false);
  const [invitationPreviewError, setInvitationPreviewError] = useState("");
  const [invitationSession, setInvitationSession] = useState({
    status: "checking",
    email: "",
  });
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

  const workMembership = useMemo(() => {
    return (
      (authority?.memberships || []).find(
        (item) =>
          item.status === "ACTIVE" &&
          (["OWNER", "MANAGER"].includes(item.role) ||
            item.permissions?.includes("ASSIGNED_WORK"))
      ) || null
    );
  }, [authority]);

  const operationsMembership = useMemo(() => {
    return (
      (authority?.memberships || []).find(
        (item) =>
          item.status === "ACTIVE" &&
          (item.permissions?.includes("TIME_TEAM_VIEW") ||
            item.permissions?.includes("TIME_SELF_VIEW"))
      ) || null
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
    if (invitationToken) return undefined;

    const timer = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(timer);
  }, [invitationToken, load]);

  useEffect(() => {
    if (!invitationToken) return undefined;

    let cancelled = false;

    setInvitationPreviewLoading(true);
    setInvitationPreviewError("");

    inspectBusinessTeamInvitation(invitationToken)
      .then((result) => {
        if (cancelled) return;
        setInvitationPreview(result?.invitation || null);
      })
      .catch((previewError) => {
        if (cancelled) return;
        setInvitationPreviewError(
          previewError.message ||
            "This Team invitation could not be loaded."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setInvitationPreviewLoading(false);
        }
      });

    const authenticatedIdentity = getAuthenticatedIdentitySnapshot();

    if (authenticatedIdentity.status !== "authenticated") {
      setInvitationSession({
        status: "signed_out",
        email: "",
      });
    } else {
      setInvitationSession({
        status: "checking",
        email: "",
      });

      authFetch(
        "/auth/me",
        {
          method: "GET",
          skipAuthExpirationHandling: true,
        },
        setPage
      )
        .then(({ response, data }) => {
          if (cancelled) return;

          if (!response?.ok || !data?.user) {
            setInvitationSession({
              status: "signed_out",
              email: "",
            });
            return;
          }

          setInvitationSession({
            status: "authenticated",
            email: String(data.user.email || "").trim(),
          });
        })
        .catch(() => {
          if (!cancelled) {
            setInvitationSession({
              status: "signed_out",
              email: "",
            });
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [invitationToken, setPage]);

  function continueInvitationAuthentication(mode = "login", {
    switchAccount = false,
  } = {}) {
    if (!invitationToken) return;

    if (switchAccount) {
      clearMeetroSession();
    }

    const query = new URLSearchParams({
      teamInvitation: invitationToken,
      mode,
    });

    window.location.hash = `login?${query.toString()}`;
    window.location.reload();
  }

  async function acceptInvitation() {
    if (!invitationToken) return;
    setWorking(true);
    setError("");
    try {
      const result = await acceptBusinessTeamInvitation(
        invitationToken,
        setPage
      );

      const membership = result?.membership || null;

      window.dispatchEvent(
        new CustomEvent("meetroTeamAuthorityChanged")
      );

      const experience = resolvePrimaryTeamExperience({
        memberships: membership ? [membership] : [],
      });

      setNotice(
        "Invitation accepted. Your Team membership is active."
      );

      setPage(experience.landingRoute || "home");
    } catch (acceptError) {
      setError(acceptError.message || "The invitation could not be accepted.");
    } finally {
      setWorking(false);
    }
  }

  async function createInvitation(event) {
    event.preventDefault();
    if (!selectedMembership) return;
    setInviteSendState("sending");
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
      const invitation = result?.invitation || result || {};
      const deliveryState = normalizeInvitationDeliveryState(invitation);

      setInviteSendState(
        deliveryState === "failed" ? "delivery_failed" : "sent"
      );

      setInvitationLink(resolveInvitationLink(invitation, resolveClientBaseUrl()));
      setManualCopyLink("");
      setNotice(resolveInvitationNotice(invitation, inviteDraft.email));
      setInviteDraft({ displayName: "", email: "", role: "FIELD_EMPLOYEE" });
      await load();
    } catch (inviteError) {
      setInviteSendState("failed");
      setError(inviteError.message || "The invitation could not be created.");
    } finally {
      setWorking(false);
    }
  }

  async function copyInvitationLink(link = "") {
    const target = toText(link);
    if (!target) {
      setNotice(INVITATION_NOTES.noLink);
      return;
    }
    try {
      if (globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(target);
        setManualCopyLink("");
        setNotice(INVITATION_NOTES.copySuccess);
        return;
      }
    } catch {
      // no-op: handled in fallback path
    }
    setManualCopyLink(target);
    setNotice(INVITATION_NOTES.copyFailure);
  }

  async function resendInvitation(invitationId, fallbackEmail = "") {
    if (!selectedMembership) return;

    setResendSendStateById((current) => ({
      ...current,
      [invitationId]: "sending",
    }));

    setWorking(true);
    setError("");
    setNotice("");
    try {
      const result = await resendBusinessTeamInvitation(
        invitationId,
        selectedMembership.businessId,
        setPage
      );
      const invitation = result?.invitation || result || {};
      const deliveryState = normalizeInvitationDeliveryState(invitation);

      setResendSendStateById((current) => ({
        ...current,
        [invitationId]:
          deliveryState === "failed" ? "delivery_failed" : "sent",
      }));

      setNotice(resolveInvitationNotice(invitation, fallbackEmail, "resend"));
      setInvitationLink(
        resolveInvitationLink(invitation, resolveClientBaseUrl())
      );
      setManualCopyLink("");
      await load();
    } catch (resendError) {
      setResendSendStateById((current) => ({
        ...current,
        [invitationId]: "failed",
      }));

      setError(resendError.message || "The invitation could not be resent.");
    } finally {
      setWorking(false);
    }
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
  const canManageInvitations =
    permissions.has("TEAM_REVOKE_INVITATION") ||
    permissions.has("TEAM_INVITE");

  if (invitationToken) {
    const signedInEmail = normalizeIdentityEmail(
      invitationSession.email
    );
    const invitedEmail = normalizeIdentityEmail(
      invitationPreview?.email
    );
    const sessionChecking =
      invitationSession.status === "checking";
    const hasSession =
      invitationSession.status === "authenticated";
    const sessionMatchesInvitation =
      Boolean(hasSession && invitedEmail) &&
      signedInEmail === invitedEmail;

    const invitationStatus = String(
      invitationPreview?.status || ""
    ).toUpperCase();

    return (
      <div
        className="app-page meetro-responsive-page meetro-visual-page"
        style={invitationPageStyle}
      >
        <main style={invitationLandingCard}>
          <p style={eyebrowStyle}>Meetro Team Invitation</p>

          {invitationPreviewLoading && (
            <p style={copyStyle} role="status">
              Loading your invitation…
            </p>
          )}

          {invitationPreviewError && (
            <div role="alert" style={errorStyle}>
              {invitationPreviewError}
            </div>
          )}

          {!invitationPreviewLoading && invitationPreview && (
            <>
              <h1 style={invitationTitle}>
                Join {invitationPreview.businessName || "this Team"}
              </h1>

              <p style={invitationLead}>
                You’ve been invited to join as{" "}
                <strong>{roleLabel(invitationPreview.role)}</strong>.
              </p>

              <div style={invitationFacts}>
                <div>
                  <span style={invitationFactLabel}>Business</span>
                  <strong>
                    {invitationPreview.businessName || "Meetro Business"}
                  </strong>
                </div>

                <div>
                  <span style={invitationFactLabel}>Role</span>
                  <strong>{roleLabel(invitationPreview.role)}</strong>
                </div>

                <div>
                  <span style={invitationFactLabel}>
                    Invitation email
                  </span>
                  <strong>{invitationPreview.email}</strong>
                </div>
              </div>

              {invitationStatus !== "PENDING" ? (
                <div role="status" style={noticeStyle}>
                  This invitation is {statusLabel(invitationStatus)}.
                  Contact the business if you need a new invitation.
                </div>
              ) : sessionChecking ? (
                <p style={copyStyle} role="status">
                  Checking your current Meetro account…
                </p>
              ) : !hasSession ? (
                <>
                  <p style={copyStyle}>
                    Sign in with the exact invited email address, or create
                    your Meetro account to continue.
                  </p>

                  <div style={invitationActions}>
                    <button
                      type="button"
                      style={primaryButton}
                      onClick={() =>
                        continueInvitationAuthentication("login")
                      }
                    >
                      Sign in to Join
                    </button>

                    <button
                      type="button"
                      style={secondaryButton}
                      onClick={() =>
                        continueInvitationAuthentication("signup")
                      }
                    >
                      Create Account & Join
                    </button>
                  </div>
                </>
              ) : !sessionMatchesInvitation ? (
                <>
                  <div role="status" style={invitationMismatchBox}>
                    <strong>
                      You’re signed in with a different account.
                    </strong>
                    <p style={copyStyle}>
                      Current account:{" "}
                      {signedInEmail || "another Meetro account"}
                    </p>
                    <p style={copyStyle}>
                      This invitation requires:{" "}
                      {invitationPreview.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    style={primaryButton}
                    onClick={() =>
                      continueInvitationAuthentication("login", {
                        switchAccount: true,
                      })
                    }
                  >
                    Switch Account
                  </button>
                </>
              ) : (
                <>
                  <div role="status" style={invitationMatchBox}>
                    Signed in as <strong>{signedInEmail}</strong>
                  </div>

                  <button
                    type="button"
                    style={primaryButton}
                    onClick={acceptInvitation}
                    disabled={working}
                  >
                    {working ? "Joining…" : "Accept & Join Team"}
                  </button>
                </>
              )}
            </>
          )}
        </main>
      </div>
    );
  }

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

      {!loading && workMembership && (
        <section style={workAccessStyle} aria-label="Job assignment workspace">
          <div>
            <strong>
              {["OWNER", "MANAGER"].includes(workMembership.role)
                ? "Job assignment authority"
                : "Your assigned work"}
            </strong>
            <p style={workAccessCopyStyle}>
              {["OWNER", "MANAGER"].includes(workMembership.role)
                ? "Assign active Team members to exact business Jobs."
                : "Open only the Jobs and Schedule assigned to this membership."}
            </p>
          </div>
          <button
            type="button"
            style={primaryButton}
            onClick={() =>
              setPage(
                `employeeJobs?businessId=${encodeURIComponent(
                  workMembership.businessId
                )}`
              )
            }
          >
            {["OWNER", "MANAGER"].includes(workMembership.role)
              ? "Manage Job Assignments"
              : "Open My Jobs"}
          </button>
        </section>
      )}

      {!loading && operationsMembership && (
        <section style={workAccessStyle} aria-label="Team Today and Timesheets">
          <div>
            <strong>
              {operationsMembership.permissions?.includes("TEAM_TODAY_VIEW")
                ? "Team Today & Timesheets"
                : "My Timesheets"}
            </strong>
            <p style={workAccessCopyStyle}>
              Review canonical active timers and recorded time using the Business timezone.
            </p>
          </div>
          <button
            type="button"
            style={primaryButton}
            onClick={() =>
              setPage(
                `teamOperations?businessId=${encodeURIComponent(
                  operationsMembership.businessId
                )}&view=${operationsMembership.permissions?.includes("TEAM_TODAY_VIEW") ? "today" : "timesheets"}`
              )
            }
          >
            Open Team Time
          </button>
        </section>
      )}

      {invitationToken && (
        <section style={cardStyle} aria-labelledby="team-invitation-heading">
          <p style={eyebrowStyle}>Invitation</p>
          <h2 id="team-invitation-heading" style={headingStyle}>
            You are joining {authority?.pendingInvitations?.[0]?.businessName || "this business"}
          </h2>
          <p style={copyStyle}>
            Acceptance is bound to your authenticated email and cannot be
            claimed by another account. Employees join this exact Team; they do
            not create another Business, start another Trial, or choose a
            subscription plan.
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
              <h2 style={headingStyle}>Invite a Team Member</h2>
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
                  {inviteSendState === "sending" ? (
                    "Sending…"
                  ) : (
                    <span style={buttonFeedbackStack} aria-live="polite">
                      <span>Send Invitation</span>

                      {inviteSendState === "sent" && (
                        <small style={buttonFeedbackText}>
                          ✓ Sent just now
                        </small>
                      )}

                      {inviteSendState === "delivery_failed" && (
                        <small style={buttonFeedbackText}>
                          Delivery failed
                        </small>
                      )}

                      {inviteSendState === "failed" && (
                        <small style={buttonFeedbackText}>
                          Couldn’t send
                        </small>
                      )}
                    </span>
                  )}
                </button>
              </form>
              {invitationLink && (
                <div style={linkBox}>
                  <input
                    style={linkInput}
                    value={invitationLink}
                    readOnly
                  />
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={() => copyInvitationLink(invitationLink)}
                  >
                    Copy link
                  </button>
                </div>
              )}
              {manualCopyLink && (
                <div style={linkBox}>
                  <p style={copyFallbackText}>
                    Invitation link:
                  </p>
                  <input
                    style={linkInput}
                    value={manualCopyLink}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                  />
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
                        {deliveryLabel(invitation) && (
                          <> · {deliveryLabel(invitation)}</>
                        )}
                      </p>
                    </div>
                    <div style={rowActions}>
                      {invitation.status === "PENDING" &&
                        canManageInvitations && (
                          <>
                            <button
                              type="button"
                              style={secondaryButton}
                              onClick={() =>
                                resendInvitation(
                                  invitation.id,
                                  invitation.email
                                )
                              }
                              disabled={working}
                            >
                              {resendSendStateById[invitation.id] ===
                              "sending" ? (
                                "Sending…"
                              ) : (
                                <span
                                  style={buttonFeedbackStack}
                                  aria-live="polite"
                                >
                                  <span>Resend invitation</span>

                                  {resendSendStateById[invitation.id] ===
                                    "sent" && (
                                    <small style={buttonFeedbackText}>
                                      ✓ Sent just now
                                    </small>
                                  )}

                                  {resendSendStateById[invitation.id] ===
                                    "delivery_failed" && (
                                    <small style={buttonFeedbackText}>
                                      Delivery failed
                                    </small>
                                  )}

                                  {resendSendStateById[invitation.id] ===
                                    "failed" && (
                                    <small style={buttonFeedbackText}>
                                      Couldn’t send
                                    </small>
                                  )}
                                </span>
                              )}
                            </button>
                            {resolveInvitationLink(
                              invitation,
                              resolveClientBaseUrl()
                            ) && (
                              <button
                                type="button"
                                style={secondaryButton}
                                onClick={() =>
                                  copyInvitationLink(
                                    resolveInvitationLink(
                                      invitation,
                                      resolveClientBaseUrl()
                                    )
                                  )
                                }
                                disabled={working}
                              >
                                Copy link
                              </button>
                            )}
                          </>
                        )}
                      {invitation.status === "PENDING" &&
                        canManageInvitations && (
                          <button
                            type="button"
                            style={dangerButton}
                            onClick={() => revokeInvitation(invitation.id)}
                            disabled={working}
                          >
                            Revoke
                          </button>
                        )}
                    </div>
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
const buttonFeedbackStack = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  lineHeight: 1.1,
};

const buttonFeedbackText = {
  fontSize: 11,
  fontWeight: 700,
  opacity: 0.84,
  whiteSpace: "nowrap",
};

const invitationPageStyle = {
  ...pageStyle,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  paddingTop: 48,
};

const invitationLandingCard = {
  ...cardStyle,
  width: "min(620px, 100%)",
  padding: 28,
};

const invitationTitle = {
  margin: "4px 0 10px",
  color: "#183c28",
  fontSize: 30,
};

const invitationLead = {
  ...copyStyle,
  fontSize: 17,
  marginBottom: 22,
};

const invitationFacts = {
  display: "grid",
  gap: 12,
  margin: "0 0 22px",
};

const invitationFactLabel = {
  display: "block",
  marginBottom: 3,
  color: "#6c7f72",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const invitationActions = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const noticeStyle = {
  ...cardStyle,
  background: "#edf8ef",
  color: "#1a5d31",
  borderColor: "#b9d9c0",
};

const invitationMismatchBox = {
  ...noticeStyle,
  margin: "0 0 16px",
};

const invitationMatchBox = {
  ...noticeStyle,
  margin: "0 0 16px",
};

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
const linkInput = {
  flex: "1 1 300px",
  overflowWrap: "anywhere",
  color: "#234b32",
  background: "#ecf4eb",
  border: "1px solid #b9d3c0",
  borderRadius: 10,
  padding: "8px 10px",
  minHeight: 38,
};
const copyFallbackText = {
  ...copyStyle,
  margin: 0,
};
const errorStyle = {
  ...cardStyle,
  background: "#fff4f2",
  color: "#8b2e2e",
  borderColor: "#e7beb8",
};
const workAccessStyle = {
  ...cardStyle,
  background: "linear-gradient(135deg, #edf8ef, #f8fbf8)",
  borderColor: "#b9d9c0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  color: "#1a5d31",
};
const workAccessCopyStyle = { ...copyStyle, margin: "5px 0 0" };

export default TeamMembers;
