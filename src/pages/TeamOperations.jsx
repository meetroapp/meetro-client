import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import {
  fetchBusinessTimeSettings,
  fetchTeamToday,
  fetchTimesheets,
  updateBusinessTimeSettings,
} from "../utils/timeEvidenceApi";
import { fetchMyTeamAuthority } from "../utils/teamApi";

const WEEKDAYS = Object.freeze([
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
]);

const TIMEZONE_OPTIONS = Object.freeze([
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
]);

const CATEGORY_LABELS = Object.freeze({
  JOB_WORK: "Job Work",
  DRIVING: "Driving",
  OFFICE: "Office",
  SUPPLIES: "Supplies",
  BREAK: "Break",
  GENERAL: "General",
});

function routeValue(name) {
  try {
    const query = String(window.location.hash || "").split("?")[1] || "";
    return new URLSearchParams(query).get(name) || "";
  } catch {
    return "";
  }
}

function suggestedTimeZone() {
  try {
    const value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return value && value.includes("/") ? value : "America/New_York";
  } catch {
    return "America/New_York";
  }
}

function durationLabel(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function activeElapsed(startedAt, now) {
  const start = new Date(startedAt).getTime();
  return Number.isFinite(start) ? Math.max(0, Math.floor((now - start) / 1000)) : 0;
}

function timeLabel(value, timeZone) {
  if (!value) return "Active";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function dayLabel(dateKey) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function roleLabel(role) {
  if (role === "BOOKKEEPER_FINANCE") return "Bookkeeper / Finance";
  if (role === "FIELD_EMPLOYEE") return "Field Employee";
  return role === "OWNER" ? "Owner" : role === "MANAGER" ? "Manager" : role;
}

function TeamNavigation({ view, setPage, canViewToday, onView }) {
  return (
    <nav style={tabListStyle} aria-label="Team workspace">
      <button type="button" style={tabStyle(false)} onClick={() => setPage("teamMembers")}>Members</button>
      {canViewToday && (
        <button type="button" style={tabStyle(view === "today")} onClick={() => onView("today")}>Today</button>
      )}
      <button type="button" style={tabStyle(view === "timesheets")} onClick={() => onView("timesheets")}>Timesheets</button>
    </nav>
  );
}

function TimeSettingsSetup({ settings, businessId, setPage, onSaved }) {
  const [draft, setDraft] = useState(() => ({
    timeZone: settings?.timeZone || suggestedTimeZone(),
    weekStartDay: settings?.weekStartDay || "MONDAY",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!settings?.canManage) {
    return (
      <section style={setupStyle} aria-label="Business time settings required">
        <h2 style={headingStyle}>Business time settings are required</h2>
        <p style={copyStyle}>The Business Owner must confirm an IANA timezone and week-start day before Team calendar time can be grouped.</p>
      </section>
    );
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await updateBusinessTimeSettings({ businessId, ...draft }, setPage);
      onSaved(result.settings);
    } catch (saveError) {
      setError(saveError.message || "Business time settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const zones = TIMEZONE_OPTIONS.includes(draft.timeZone)
    ? TIMEZONE_OPTIONS
    : [draft.timeZone, ...TIMEZONE_OPTIONS];
  return (
    <section style={setupStyle} aria-labelledby="time-settings-heading">
      <p style={eyebrowStyle}>One-time setup</p>
      <h2 id="time-settings-heading" style={headingStyle}>Set Your Business Time Settings</h2>
      <p style={copyStyle}>The detected timezone is only a suggestion. Nothing becomes authoritative until you save it.</p>
      {error && <div role="alert" style={errorStyle}>{error}</div>}
      <form onSubmit={save} style={settingsGridStyle}>
        <label style={labelStyle}>
          Timezone
          <input style={inputStyle} list="business-timezone-options" value={draft.timeZone} onChange={(event) => setDraft((current) => ({ ...current, timeZone: event.target.value }))} />
          <datalist id="business-timezone-options">
            {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </datalist>
        </label>
        <label style={labelStyle}>
          Week starts on
          <select style={inputStyle} value={draft.weekStartDay} onChange={(event) => setDraft((current) => ({ ...current, weekStartDay: event.target.value }))}>
            {WEEKDAYS.map((day) => <option key={day} value={day}>{day[0] + day.slice(1).toLowerCase()}</option>)}
          </select>
        </label>
        <button type="submit" style={primaryButton} disabled={saving}>{saving ? "Saving…" : "Save & Continue"}</button>
      </form>
    </section>
  );
}

function TodayView({ data, now, timeZone, setPage }) {
  return (
    <section style={cardStyle} aria-labelledby="team-today-heading">
      <p style={eyebrowStyle}>Operations</p>
      <h2 id="team-today-heading" style={headingStyle}>Team Today</h2>
      <p style={copyStyle}>Live operational status derived from Team membership, assignments, field evidence, and canonical active timers.</p>
      <div style={listStyle}>
        {(data?.members || []).map((member) => {
          const timer = member.activeTimer;
          const job = timer?.jobId ? { jobId: timer.jobId, jobTitle: timer.jobTitle } : member.activeAssignment;
          return (
            <article key={member.membershipId} style={memberRowStyle}>
              <div style={memberIdentityStyle}>
                <strong>{member.employeeName || "Team member"}</strong>
                <span>{roleLabel(member.role)}</span>
              </div>
              <div style={memberFactsStyle}>
                <span><b>Status:</b> {member.fieldStatus ? member.fieldStatus.replaceAll("_", " ") : timer ? "ACTIVE" : "Available"}</span>
                {job?.jobId && (
                  <button type="button" style={jobLinkStyle} onClick={() => setPage(`workCenter?jobId=${encodeURIComponent(job.jobId)}`)}>
                    {job.jobTitle || "Open exact Job"}
                  </button>
                )}
                {timer ? (
                  <>
                    <span><b>{CATEGORY_LABELS[timer.category] || timer.category}</b> · Started {timeLabel(timer.startedAt, timeZone)}</span>
                    <span style={activePillStyle}>{durationLabel(activeElapsed(timer.startedAt, now))} active</span>
                    <small>Location at Clock In: {String(timer.locationStatus || "NOT_REQUESTED").replaceAll("_", " ").toLowerCase()}</small>
                  </>
                ) : <span>No active timer</span>}
              </div>
            </article>
          );
        })}
      </div>
      {!(data?.members || []).length && <p style={copyStyle}>No active Team members are available.</p>}
    </section>
  );
}

function TimesheetsView({ data, range, onRange, now, timeZone, setPage }) {
  return (
    <section style={cardStyle} aria-labelledby="timesheets-heading">
      <p style={eyebrowStyle}>Recorded Time</p>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 id="timesheets-heading" style={headingStyle}>Timesheets</h2>
          <p style={copyStyle}>Canonical time evidence for operational review. This is not payroll, wages, overtime, or customer billing.</p>
        </div>
        <div style={rangeButtonsStyle}>
          <button type="button" style={tabStyle(range === "TODAY")} onClick={() => onRange("TODAY")}>Today</button>
          <button type="button" style={tabStyle(range === "THIS_WEEK")} onClick={() => onRange("THIS_WEEK")}>This Week</button>
        </div>
      </div>
      <div style={summaryStyle}>
        <span>{data?.scope === "SELF" ? "My recorded time" : "Team recorded time"}</span>
        <strong>{durationLabel(data?.completedTotalSeconds)} completed</strong>
      </div>
      {Object.keys(data?.categoryTotals || {}).length > 0 && (
        <div style={categoryGridStyle} aria-label="Category totals">
          {Object.entries(data.categoryTotals).map(([category, seconds]) => (
            <div key={category} style={categoryCardStyle}>
              <span>{CATEGORY_LABELS[category] || category}</span>
              <strong>{durationLabel(seconds)}</strong>
            </div>
          ))}
        </div>
      )}
      <div style={listStyle}>
        {(data?.groups || []).map((group) => (
          <article key={`${group.membershipId}-${group.localDate}`} style={dayCardStyle}>
            <div style={dayHeaderStyle}>
              <div><strong>{group.employeeName || "Team member"}</strong><span>{dayLabel(group.localDate)}</span></div>
              <strong>{durationLabel(group.completedTotalSeconds)} tracked</strong>
            </div>
            {group.sessions.map((session) => (
              <div key={session.id} style={sessionRowStyle}>
                <div>
                  <strong>{CATEGORY_LABELS[session.category] || session.category}</strong>
                  {session.jobId ? (
                    <button type="button" style={jobLinkStyle} onClick={() => setPage(`workCenter?jobId=${encodeURIComponent(session.jobId)}`)}>
                      {session.jobTitle || "Open exact Job"}
                    </button>
                  ) : <span>No Job required</span>}
                  <small>Clock In location: {String(session.clockInLocationStatus || "NOT_REQUESTED").replaceAll("_", " ").toLowerCase()}</small>
                </div>
                <div style={sessionTimeStyle}>
                  <strong>{timeLabel(session.clockedInAt, timeZone)} – {session.active ? "Active" : timeLabel(session.clockedOutAt, timeZone)}</strong>
                  {session.active ? (
                    <span style={activePillStyle}>Current elapsed: {durationLabel(activeElapsed(session.clockedInAt, now))} · provisional</span>
                  ) : <span>{durationLabel(session.durationSeconds)}</span>}
                </div>
              </div>
            ))}
          </article>
        ))}
      </div>
      {!(data?.groups || []).length && <p style={copyStyle}>No recorded sessions fall within this Business-local range.</p>}
    </section>
  );
}

function TeamOperations({ setPage }) {
  const [authority, setAuthority] = useState(null);
  const [settings, setSettings] = useState(null);
  const [projection, setProjection] = useState(null);
  const [selectedView, setSelectedView] = useState(() => routeValue("view").toLowerCase() === "today" ? "today" : "timesheets");
  const [range, setRange] = useState("TODAY");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);

  const requestedBusinessId = Number(routeValue("businessId"));
  const membership = useMemo(() => {
    const active = (authority?.memberships || []).filter((item) => item.status === "ACTIVE");
    if (Number.isSafeInteger(requestedBusinessId) && requestedBusinessId > 0) {
      return active.find((item) => item.businessId === requestedBusinessId) || null;
    }
    return active.find((item) => item.permissions?.includes("TIME_TEAM_VIEW")) ||
      active.find((item) => item.permissions?.includes("TIME_SELF_VIEW")) || null;
  }, [authority, requestedBusinessId]);
  const canViewToday = Boolean(membership?.permissions?.includes("TEAM_TODAY_VIEW"));
  const view = selectedView === "today" && canViewToday ? "today" : "timesheets";

  useEffect(() => {
    let cancelled = false;
    fetchMyTeamAuthority(setPage)
      .then((result) => { if (!cancelled) setAuthority(result); })
      .catch((loadError) => { if (!cancelled) setError(loadError.message || "Team authority is unavailable."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [setPage]);

  useEffect(() => {
    if (!membership) return;
    let cancelled = false;
    fetchBusinessTimeSettings(membership.businessId, setPage)
      .then((result) => { if (!cancelled) setSettings(result.settings); })
      .catch((loadError) => { if (!cancelled) setError(loadError.message || "Business time settings are unavailable."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [membership, setPage]);

  const loadProjection = useCallback(async () => {
    if (!membership || !settings?.configured) return;
    setError("");
    try {
      const result = view === "today"
        ? await fetchTeamToday(membership.businessId, setPage)
        : await fetchTimesheets(membership.businessId, range, setPage);
      setProjection(result);
      setNow(Date.now());
    } catch (loadError) {
      setError(loadError.message || "Team time could not be loaded.");
    }
  }, [membership, range, setPage, settings?.configured, view]);

  useEffect(() => {
    const timer = window.setTimeout(loadProjection, 0);
    return () => window.clearTimeout(timer);
  }, [loadProjection]);

  useEffect(() => {
    const active = view === "today"
      ? (projection?.members || []).some((member) => member.activeTimer)
      : (projection?.sessions || []).some((session) => session.active);
    if (!active) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [projection, view]);

  function settingsSaved(nextSettings) {
    setSettings(nextSettings);
    setProjection(null);
  }

  return (
    <div className="app-page meetro-responsive-page meetro-visual-page" style={pageStyle}>
      <BusinessToolsPageHeader
        title="Team"
        description="Members, live operational visibility, and canonical recorded-time review."
        categoryLabel="Business Operations"
        onBack={() => setPage("businessCommandCenter")}
      />
      {membership && <TeamNavigation view={view} setPage={setPage} canViewToday={canViewToday} onView={(nextView) => { setSelectedView(nextView); setProjection(null); }} />}
      {error && <div role="alert" style={errorStyle}>{error}</div>}
      {loading && <div role="status" style={cardStyle}>Loading governed Team time…</div>}
      {!loading && !membership && (
        <section style={cardStyle}><h2 style={headingStyle}>No Team time authority</h2><p style={copyStyle}>This account has no active Business membership with time visibility.</p></section>
      )}
      {!loading && membership && settings && !settings.configured && (
        <TimeSettingsSetup settings={settings} businessId={membership.businessId} setPage={setPage} onSaved={settingsSaved} />
      )}
      {!loading && membership && settings?.configured && (
        <>
          <section style={settingsSummaryStyle}>
            <span><b>Business timezone:</b> {settings.timeZone}</span>
            <span><b>Week starts:</b> {settings.weekStartDay[0] + settings.weekStartDay.slice(1).toLowerCase()}</span>
            {settings.canManage && <button type="button" style={secondaryButton} onClick={() => setSettings((current) => ({ ...current, configured: false }))}>Change settings</button>}
          </section>
          {view === "today"
            ? <TodayView data={projection} now={now} timeZone={settings.timeZone} setPage={setPage} />
            : <TimesheetsView data={projection} range={range} onRange={(next) => { setRange(next); setProjection(null); }} now={now} timeZone={settings.timeZone} setPage={setPage} />}
        </>
      )}
      <BottomNav setPage={setPage} currentPage="teamMembers" />
    </div>
  );
}

const pageStyle = { paddingBottom: 96 };
const cardStyle = { background: "#fff", border: "1px solid #dce8df", borderRadius: 18, padding: 22, margin: "16px 0", boxShadow: "0 10px 30px rgba(20,63,39,.06)" };
const setupStyle = { ...cardStyle, background: "linear-gradient(135deg,#f5fbf6,#fff)" };
const eyebrowStyle = { color: "#607568", fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 6px" };
const headingStyle = { color: "#143f27", margin: "0 0 8px", fontSize: 22 };
const copyStyle = { color: "#52675a", margin: "0 0 16px", lineHeight: 1.5 };
const tabListStyle = { display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" };
const tabStyle = (selected) => ({ minHeight: 40, padding: "8px 15px", borderRadius: 999, border: `1px solid ${selected ? "#1d6035" : "#cbdacf"}`, background: selected ? "#1d6035" : "#fff", color: selected ? "#fff" : "#294c37", fontWeight: 800, cursor: "pointer" });
const settingsGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, alignItems: "end" };
const labelStyle = { display: "grid", gap: 7, color: "#294c37", fontWeight: 700 };
const inputStyle = { minHeight: 44, padding: "9px 11px", border: "1px solid #bdd0c2", borderRadius: 10, background: "#fff", color: "#173d27" };
const primaryButton = { minHeight: 44, border: 0, borderRadius: 11, padding: "10px 16px", background: "#125d34", color: "#fff", fontWeight: 800, cursor: "pointer" };
const secondaryButton = { ...primaryButton, minHeight: 38, background: "#fff", color: "#125d34", border: "1px solid #b9d3c0" };
const errorStyle = { ...cardStyle, background: "#fff4f2", color: "#8b2e2e", borderColor: "#e7beb8" };
const settingsSummaryStyle = { ...cardStyle, padding: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", color: "#294c37" };
const listStyle = { display: "grid", gap: 12 };
const memberRowStyle = { padding: 16, border: "1px solid #e1eae3", borderRadius: 14, display: "grid", gridTemplateColumns: "minmax(180px,.7fr) minmax(250px,1.3fr)", gap: 18, background: "#fbfdfb" };
const memberIdentityStyle = { display: "grid", alignContent: "start", gap: 4, color: "#234b32" };
const memberFactsStyle = { display: "grid", gap: 7, color: "#52675a" };
const activePillStyle = { display: "inline-flex", width: "fit-content", padding: "6px 9px", borderRadius: 999, background: "#e5f4e8", color: "#1b6335", fontWeight: 800, fontVariantNumeric: "tabular-nums" };
const jobLinkStyle = { border: 0, background: "transparent", color: "#126039", padding: 0, textAlign: "left", textDecoration: "underline", cursor: "pointer", font: "inherit", fontWeight: 700 };
const sectionHeaderStyle = { display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", flexWrap: "wrap" };
const rangeButtonsStyle = { display: "flex", gap: 8 };
const summaryStyle = { padding: 14, marginBottom: 14, borderRadius: 12, background: "#edf8ef", color: "#1a5d31", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" };
const categoryGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 16 };
const categoryCardStyle = { padding: 12, borderRadius: 11, background: "#f4f8f5", display: "grid", gap: 5, color: "#294c37" };
const dayCardStyle = { border: "1px solid #dce8df", borderRadius: 14, overflow: "hidden" };
const dayHeaderStyle = { display: "flex", justifyContent: "space-between", gap: 12, padding: 14, background: "#f4f8f5", color: "#234b32" };
const sessionRowStyle = { padding: 14, borderTop: "1px solid #e1eae3", display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", color: "#294c37" };
const sessionTimeStyle = { display: "grid", gap: 5, textAlign: "right", color: "#52675a" };

export default TeamOperations;
