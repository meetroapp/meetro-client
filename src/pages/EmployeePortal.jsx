import { useCallback, useEffect, useMemo, useState } from "react";
import EmployeeShell from "../components/EmployeeShell";
import { TimeEvidencePanel } from "./EmployeeJobs";
import { fetchEmployeeJobs, fetchEmployeeSchedule } from "../utils/jobAssignmentApi";
import { fetchFieldOperations } from "../utils/fieldOperationsApi";
import { fetchOwnTime } from "../utils/timeEvidenceApi";

const VIEW_META = Object.freeze({
  home: { page: "employeeHome", title: "Home", description: "Today’s field work at a glance." },
  schedule: { page: "employeeSchedule", title: "Schedule", description: "Only Visits attached to your authorized Jobs." },
  time: { page: "employeeTime", title: "Time", description: "Your canonical Clock In and Clock Out evidence." },
  messages: { page: "employeeMessages", title: "Messages", description: "Internal communication for your assigned Jobs." },
  profile: { page: "employeeProfile", title: "Profile", description: "Your Team access and account context." },
});

function readable(value, fallback = "Assigned") {
  const text = String(value || fallback).toLowerCase().replaceAll("_", " ");
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function when(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time pending";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function locationText(location) {
  const address = location?.address;
  if (address) return [address.line1, address.city, address.region, address.postalCode].filter(Boolean).join(", ");
  return location?.serviceArea || "Service location pending";
}

export default function EmployeePortal({ membership, setPage, view = "home" }) {
  const meta = VIEW_META[view] || VIEW_META.home;
  const businessId = membership?.businessId;
  const [workspace, setWorkspace] = useState({ jobs: [], schedule: [], operations: [], time: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError("");
    try {
      const [jobsResult, scheduleResult, timeResult] = await Promise.all([
        fetchEmployeeJobs(businessId, setPage),
        fetchEmployeeSchedule(businessId, setPage),
        fetchOwnTime(businessId, setPage),
      ]);
      const jobs = jobsResult.jobs || [];
      const operations = await Promise.all(jobs.map(async (job) => {
        const assignment = job.assignments?.[0];
        if (!assignment) return { job, assignment: null, operations: null };
        try {
          const result = await fetchFieldOperations(
            job.id,
            { businessId, assignmentId: assignment.id, managed: false },
            setPage
          );
          return { job, assignment, operations: result.operations };
        } catch {
          return { job, assignment, operations: null };
        }
      }));
      setWorkspace({ jobs, schedule: scheduleResult.schedule || [], operations, time: timeResult });
    } catch (loadError) {
      setError(loadError.message || "Your field workspace is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [businessId, setPage]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const current = workspace.operations.find((item) => item.operations?.currentStatus !== "FIELD_WORK_COMPLETED") || workspace.operations[0] || null;
  const recentMessage = useMemo(() => workspace.operations
    .flatMap((item) => (item.operations?.messages || []).map((message) => ({ ...message, job: item.job })))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] || null, [workspace.operations]);

  return (
    <EmployeeShell membership={membership} currentPage={meta.page} setPage={setPage} title={meta.title} description={meta.description}>
      {error && <div role="alert" style={errorStyle}>{error}</div>}
      {loading ? <section style={cardStyle} role="status">Loading your authorized field workspace…</section> : (
        <PortalView
          view={view}
          membership={membership}
          workspace={workspace}
          current={current}
          recentMessage={recentMessage}
          setPage={setPage}
        />
      )}
    </EmployeeShell>
  );
}

function PortalView({ view, membership, workspace, current, recentMessage, setPage }) {
  if (view === "schedule") return <ScheduleView schedule={workspace.schedule} />;
  if (view === "time") {
    return <TimeEvidencePanel businessId={membership.businessId} job={current?.job || null} assignment={current?.assignment || null} setPage={setPage} />;
  }
  if (view === "messages") return <MessagesView operations={workspace.operations} setPage={setPage} membership={membership} />;
  if (view === "profile") return <ProfileView membership={membership} />;
  return <HomeView membership={membership} workspace={workspace} current={current} recentMessage={recentMessage} setPage={setPage} />;
}

function HomeView({ membership, workspace, current, recentMessage, setPage }) {
  const active = workspace.time?.activeSession;
  const todayKey = new Date().toDateString();
  const today = workspace.schedule.filter((item) => new Date(item.startsAt).toDateString() === todayKey);
  return (
    <div style={gridStyle}>
      <section style={{ ...cardStyle, gridColumn: "1 / -1", background: "linear-gradient(135deg,#153f28,#267244)", color: "#fff" }}>
        <p style={{ ...eyebrowStyle, color: "#c9e6d0" }}>Current assignment</p>
        <h2 style={{ ...headingStyle, color: "#fff" }}>{current?.job?.title || "No active assignment"}</h2>
        <p style={{ ...copyStyle, color: "#e3f1e7" }}>{current ? `${current.job.customer?.displayName || "Customer"} · ${locationText(current.job.location)}` : `When ${membership.businessName || "your business"} assigns work, it will appear here.`}</p>
        {current && <button type="button" style={lightButton} onClick={() => setPage(`employeeJobs?businessId=${membership.businessId}&jobId=${encodeURIComponent(current.job.id)}`)}>Open Job Detail</button>}
      </section>
      <section style={cardStyle}>
        <p style={eyebrowStyle}>Today’s work</p>
        <h2 style={headingStyle}>{today.length ? `${today.length} scheduled Visit${today.length === 1 ? "" : "s"}` : "No scheduled Visits"}</h2>
        {today.slice(0, 2).map((item) => <p key={item.visitId} style={copyStyle}><strong>{item.jobTitle}</strong><br />{when(item.startsAt)}</p>)}
        <button type="button" style={textButton} onClick={() => setPage(`employeeSchedule?businessId=${membership.businessId}`)}>View schedule</button>
      </section>
      <section style={cardStyle}>
        <p style={eyebrowStyle}>Next field action</p>
        <h2 style={headingStyle}>{current?.operations?.nextStatus ? `Mark ${readable(current.operations.nextStatus)}` : "No action pending"}</h2>
        <p style={copyStyle}>Current status: {readable(current?.operations?.currentStatus)}</p>
        {current && <button type="button" style={textButton} onClick={() => setPage(`employeeJobs?businessId=${membership.businessId}&jobId=${encodeURIComponent(current.job.id)}`)}>Continue in Job Detail</button>}
      </section>
      <section style={cardStyle}>
        <p style={eyebrowStyle}>Current timer</p>
        <h2 style={headingStyle}>{active ? `${readable(active.category)} active` : "Not clocked in"}</h2>
        <p style={copyStyle}>{active ? `Started ${when(active.clockedInAt)}` : "Clock In when you begin authorized work."}</p>
        <button type="button" style={textButton} onClick={() => setPage(`employeeTime?businessId=${membership.businessId}`)}>Open Time</button>
      </section>
      <section style={cardStyle}>
        <p style={eyebrowStyle}>Recent internal update</p>
        <h2 style={headingStyle}>{recentMessage?.job?.title || "No Team updates yet"}</h2>
        <p style={copyStyle}>{recentMessage?.message || "Internal Job messages from your business will appear here."}</p>
        <button type="button" style={textButton} onClick={() => setPage(`employeeMessages?businessId=${membership.businessId}`)}>Open Messages</button>
      </section>
    </div>
  );
}

function ScheduleView({ schedule }) {
  return <section style={cardStyle}><p style={eyebrowStyle}>Assigned Visits</p><h2 style={headingStyle}>My Schedule</h2>{schedule.length ? schedule.map((item) => <article key={item.visitId} style={rowStyle}><div><strong>{item.jobTitle}</strong><p style={copyStyle}>{readable(item.purpose)} · {readable(item.state)}</p></div><div><strong>{when(item.startsAt)}</strong><p style={copyStyle}>{item.location?.remote ? "Remote" : locationText(item.location)}</p></div></article>) : <p style={copyStyle}>No active Visit is scheduled for your assigned Jobs.</p>}</section>;
}

function MessagesView({ operations, setPage, membership }) {
  const messages = operations.flatMap((item) => (item.operations?.messages || []).map((message) => ({ ...message, job: item.job }))).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  return <section style={cardStyle}><p style={eyebrowStyle}>Internal only</p><h2 style={headingStyle}>Field Messages</h2><p style={copyStyle}>These updates stay between you and your business Team. Customers do not receive them.</p>{messages.length ? messages.map((message) => <article key={message.id} style={rowStyle}><div><strong>{message.job.title}</strong><p style={copyStyle}>{message.message}</p><small>{message.senderName} · {when(message.createdAt)}</small></div><button type="button" style={textButton} onClick={() => setPage(`employeeJobs?businessId=${membership.businessId}&jobId=${encodeURIComponent(message.job.id)}`)}>Open Job</button></article>) : <p style={copyStyle}>No internal Job messages yet.</p>}</section>;
}

function ProfileView({ membership }) {
  return <div style={gridStyle}><section style={{ ...cardStyle, gridColumn: "1 / -1" }}><p style={eyebrowStyle}>Team Access</p><h2 style={headingStyle}>{membership.businessName || "Your business"}</h2><dl style={definitionStyle}><div><dt>Role</dt><dd>Field Employee</dd></div><div><dt>Access</dt><dd>Access managed by your business</dd></div><div><dt>Status</dt><dd>{readable(membership.status, "Active")}</dd></div></dl><p style={copyStyle}>Subscription plans and Business billing are managed by the Business Owner and are not part of your employee profile.</p></section></div>;
}

const cardStyle = { background: "#fff", border: "1px solid #dbe7de", borderRadius: 18, padding: 20, boxShadow: "0 10px 30px rgba(20,63,39,.06)", minWidth: 0 };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 14 };
const eyebrowStyle = { margin: "0 0 7px", color: "#5b7d66", fontSize: 12, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase" };
const headingStyle = { margin: "0 0 9px", color: "#173f28", fontSize: 22 };
const copyStyle = { margin: "5px 0 12px", color: "#587060", lineHeight: 1.5 };
const rowStyle = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", padding: "14px 0", borderTop: "1px solid #e4ece6", flexWrap: "wrap" };
const textButton = { border: 0, background: "transparent", padding: 0, color: "#17623a", fontWeight: 800, textDecoration: "underline", cursor: "pointer" };
const lightButton = { minHeight: 43, border: 0, borderRadius: 11, padding: "10px 15px", background: "#fff", color: "#16562f", fontWeight: 800, cursor: "pointer" };
const errorStyle = { ...cardStyle, color: "#8b2e2e", background: "#fff4f2", marginBottom: 14 };
const definitionStyle = { display: "grid", gap: 10, margin: "18px 0", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" };
