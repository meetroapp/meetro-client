import { useEffect, useState } from "react";
import {
  fetchCanonicalVisitDetail,
  fetchCanonicalVisits,
  runCanonicalVisitCommand,
} from "../utils/canonicalVisitProjection.js";
import {
  buildProfessionalScheduleCommandSchedule,
  resolveProfessionalScheduleTimeZone,
} from "../utils/professionalScheduleProjection.js";
import { getConversationVisitReadFailureCopy } from "../utils/conversationVisitReadFailure.js";

function tomorrow() {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return value.toISOString().slice(0, 10);
}

function formForVisit(visit = null) {
  const timeZone = resolveProfessionalScheduleTimeZone({
    visitTimeZone: visit?.timeZone,
    deviceTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const wall = (value, type) => {
    if (!value) return "";
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date(value)).map((part) => [part.type, part.value])
    );
    return type === "date"
      ? `${parts.year}-${parts.month}-${parts.day}`
      : `${parts.hour}:${parts.minute}`;
  };
  return {
    date: wall(visit?.scheduledStartAt, "date") || tomorrow(),
    startTime: wall(visit?.scheduledStartAt, "time") || "09:00",
    endTime: wall(visit?.scheduledEndAt, "time"),
    timeZone,
    locationMode: visit?.locationMode || "JOB_SERVICE_LOCATION",
    note: "",
  };
}

function formatSchedule(visit, language) {
  try {
    const start = new Intl.DateTimeFormat(language, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: visit.timeZone,
      timeZoneName: "short",
    }).format(new Date(visit.scheduledStartAt));
    if (!visit.scheduledEndAt) return start;
    const end = new Intl.DateTimeFormat(language, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: visit.timeZone,
      timeZoneName: "short",
    }).format(new Date(visit.scheduledEndAt));
    return `${start} – ${end}`;
  } catch {
    return "Schedule unavailable";
  }
}

function currentEvaluationVisit(visits) {
  return [...visits]
    .filter((visit) => visit.purpose === "EVALUATION")
    .sort((left, right) => {
      const activeDifference =
        Number(["CANCELLED", "COMPLETED"].includes(left.state)) -
        Number(["CANCELLED", "COMPLETED"].includes(right.state));
      if (activeDifference) return activeDifference;
      return Date.parse(right.versionCreatedAt) - Date.parse(left.versionCreatedAt);
    })[0] || null;
}

function stateCopy(visit, viewerIsProfessional) {
  if (!visit) {
    return viewerIsProfessional
      ? {
          title: "Schedule Evaluation Visit",
          guidance: "Choose a date and arrival time to inspect the project.",
        }
      : {
          title: "Evaluation visit not scheduled",
          guidance: "The selected professional will propose a visit time here.",
        };
  }
  if (visit.state === "PROPOSED" && visit.actions.canConfirm) {
    return viewerIsProfessional
      ? {
          title: "Customer proposed a new time",
          guidance: "Approve this exact Visit version or edit the schedule.",
        }
      : {
          title: "Evaluation Visit Proposed",
          guidance: "Approve this exact time or propose a new one.",
        };
  }
  if (visit.state === "PROPOSED") {
    return viewerIsProfessional
      ? {
          title: "Evaluation Visit Proposed",
          guidance: "Waiting for the customer to approve or propose a new time.",
        }
      : {
          title: "New time proposed",
          guidance: "Waiting for the professional to approve or revise your proposal.",
        };
  }
  if (visit.state === "SCHEDULED") {
    return {
      title: "Evaluation Visit Confirmed",
      guidance: viewerIsProfessional
        ? "Complete the Visit only after it occurs."
        : "Both sides confirmed this exact schedule.",
    };
  }
  if (visit.state === "COMPLETED") {
    return {
      title: "Evaluation Visit Completed",
      guidance: viewerIsProfessional
        ? "The Evaluation can now be documented from this Visit."
        : "The professional can now document the assessment.",
    };
  }
  return {
    title: "Evaluation Visit Cancelled",
    guidance: "No active Evaluation Visit is scheduled.",
  };
}

export default function CanonicalConversationVisitCard({
  jobId,
  viewerRole,
  language = "en",
  setPage,
  displayMode = "inline",
  openEditorToken = 0,
}) {
  const viewerIsProfessional = viewerRole === "professional" || viewerRole === "business";
  const [state, setState] = useState({ phase: "loading", visit: null, error: "" });
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(() => formForVisit());
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setState((current) => ({ ...current, phase: "loading", error: "" }));
    });
    void fetchCanonicalVisits({
      jobId,
      purpose: "EVALUATION",
      setPage,
    }).then(async (visits) => {
      const summary = currentEvaluationVisit(visits);
      const visit = summary
        ? await fetchCanonicalVisitDetail({
            jobId,
            visitId: summary.id,
            purpose: "EVALUATION",
            setPage,
          })
        : null;
      if (active) setState({ phase: "ready", visit, error: "" });
    }).catch((error) => {
      if (active) {
        setState({
          phase: "error",
          visit: null,
          error: getConversationVisitReadFailureCopy(error),
        });
      }
    });
    return () => { active = false; };
  }, [jobId, reload, setPage]);

  useEffect(() => {
    if (!openEditorToken || !viewerIsProfessional || state.phase !== "ready") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (!state.visit) {
        setForm(formForVisit());
        setEditor("propose");
      } else if (state.visit.actions.canReschedule) {
        setForm(formForVisit(state.visit));
        setEditor("reschedule");
      }
    });
    return () => { active = false; };
  }, [openEditorToken, state.phase, state.visit, viewerIsProfessional]);

  function open(mode) {
    setNotice("");
    setForm(formForVisit(state.visit));
    setEditor(mode);
  }

  async function command(commandName, schedule = null) {
    if (running) return;
    setRunning(true);
    setNotice("");
    try {
      const updated = await runCanonicalVisitCommand({
        jobId,
        command: commandName,
        visit: state.visit,
        purpose: "EVALUATION",
        schedule,
        reason: form.note.trim() || null,
        setPage,
      });
      setEditor(null);
      setState({ phase: "ready", visit: updated, error: "" });
      setNotice("Evaluation Visit updated.");
      setReload((value) => value + 1);
      window.dispatchEvent(new CustomEvent("meetro-canonical-visit-changed", {
        detail: { jobId, visitId: updated.id, source: "conversation" },
      }));
    } catch (error) {
      if (error?.code === "STALE_VISIT_VERSION") {
        setEditor(null);
        setReload((value) => value + 1);
        setNotice("This Visit changed elsewhere. The latest version was loaded; nothing was retried.");
      } else {
        setNotice(error?.message || "The Visit could not be updated.");
      }
    } finally {
      setRunning(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (running) return;
    const schedule = buildProfessionalScheduleCommandSchedule({
      purpose: "EVALUATION",
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      timeZone: form.timeZone,
      locationMode: form.locationMode,
    });
    if (!schedule) {
      setNotice("Choose a valid future date and arrival time.");
      return;
    }
    await command(editor === "alternate" ? "change-request" : editor, schedule);
  }

  if (!jobId || state.phase === "loading") {
    return jobId ? <p role="status" style={styles.message}>Loading Evaluation Visit…</p> : null;
  }
  if (state.phase === "error") {
    return <p role="alert" style={styles.error}>{state.error}</p>;
  }

  const visit = state.visit;
  const copy = stateCopy(visit, viewerIsProfessional);
  const showForm = ["propose", "reschedule", "alternate"].includes(editor);

  return (
    <article
      style={styles.card}
      data-canonical-visit-id={visit?.id || "none"}
      data-canonical-visit-version={visit?.currentVersion || 0}
      data-canonical-visit-state={visit?.state || "NEEDS_SCHEDULING"}
      data-visit-display-mode={displayMode}
    >
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Evaluation Visit</span>
          <h3 style={styles.title}>{copy.title}</h3>
        </div>
        {visit && <span style={styles.version}>Version {visit.currentVersion}</span>}
      </div>
      <p style={styles.guidance}>{copy.guidance}</p>
      {visit && (
        <>
          <strong style={styles.schedule}>{formatSchedule(visit, language)}</strong>
          <span style={styles.location}>
            {visit.locationMode === "REMOTE" ? "Remote" : "Project service location"}
          </span>
        </>
      )}
      {notice && <p role="status" style={styles.notice}>{notice}</p>}
      <div style={styles.actions}>
        {!visit && viewerIsProfessional && (
          <button type="button" style={styles.primary} disabled={running} onClick={() => open("propose")}>
            Schedule Visit
          </button>
        )}
        {visit?.actions.canConfirm && (
          <button type="button" style={styles.primary} disabled={running} onClick={() => command("confirm")}>
            {viewerIsProfessional ? "Approve New Time" : "Approve Visit"}
          </button>
        )}
        {!viewerIsProfessional && visit?.actions.canRequestChange && !["COMPLETED", "CANCELLED"].includes(visit.state) && (
          <button type="button" style={styles.secondary} disabled={running} onClick={() => open("alternate")}>
            Propose New Time
          </button>
        )}
        {viewerIsProfessional && visit?.actions.canReschedule && !["COMPLETED", "CANCELLED"].includes(visit.state) && (
          <button type="button" style={styles.secondary} disabled={running} onClick={() => open("reschedule")}>
            Edit
          </button>
        )}
        {viewerIsProfessional && visit?.actions.canComplete && (
          <button type="button" style={styles.primary} disabled={running} onClick={() => command("complete")}>
            Complete Visit
          </button>
        )}
      </div>
      {showForm && (
        <form style={styles.form} onSubmit={submit}>
          <strong>{editor === "alternate" ? "Propose a new time" : "Schedule Evaluation Visit"}</strong>
          <div style={styles.formGrid}>
            <label style={styles.label}>Date
              <input required type="date" value={form.date} style={styles.input} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
            </label>
            <label style={styles.label}>Arrival time
              <input required type="time" value={form.startTime} style={styles.input} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
            </label>
            <label style={styles.label}>Arrival window end (optional)
              <input type="time" value={form.endTime} style={styles.input} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} />
            </label>
            <label style={styles.label}>Location
              <select value={form.locationMode} style={styles.input} onChange={(event) => setForm((current) => ({ ...current, locationMode: event.target.value }))}>
                <option value="JOB_SERVICE_LOCATION">Project service location</option>
                <option value="REMOTE">Remote</option>
              </select>
            </label>
          </div>
          <label style={styles.label}>{editor === "propose" ? "Customer note (optional)" : "Coordination note (optional)"}
            <textarea maxLength={2000} value={form.note} style={styles.textarea} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
          </label>
          <span style={styles.timeZone}>Time zone: {form.timeZone}</span>
          <div style={styles.actions}>
            <button type="submit" style={styles.primary} disabled={running}>{running ? "Saving…" : "Save Visit"}</button>
            <button type="button" style={styles.secondary} disabled={running} onClick={() => setEditor(null)}>Keep Conversation Open</button>
          </div>
        </form>
      )}
    </article>
  );
}

const styles = {
  card: { margin: "12px", padding: 16, border: "1px solid #cbdccf", borderRadius: 18, background: "#f8fcf8", display: "grid", gap: 10, color: "#172317" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  eyebrow: { color: "#55705a", fontSize: 11, fontWeight: 900, letterSpacing: ".06em", textTransform: "uppercase" },
  title: { margin: "4px 0 0", fontSize: 18 },
  version: { color: "#55705a", fontSize: 12, fontWeight: 800 },
  guidance: { margin: 0, color: "#445246", lineHeight: 1.45 },
  schedule: { color: "#172317" },
  location: { color: "#55705a", fontSize: 13 },
  actions: { display: "flex", flexWrap: "wrap", gap: 8 },
  primary: { minHeight: 44, border: 0, borderRadius: 12, padding: "10px 14px", background: "#244d2a", color: "#fff", fontWeight: 850 },
  secondary: { minHeight: 44, border: "1px solid #a9bbaa", borderRadius: 12, padding: "10px 14px", background: "#fff", color: "#244d2a", fontWeight: 850 },
  form: { display: "grid", gap: 12, paddingTop: 12, borderTop: "1px solid #dce6dc" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 10 },
  label: { display: "grid", gap: 6, color: "#334936", fontWeight: 750, fontSize: 13 },
  input: { width: "100%", minHeight: 44, boxSizing: "border-box", border: "1px solid #a9bbaa", borderRadius: 10, padding: "8px 10px", font: "inherit", background: "#fff" },
  textarea: { width: "100%", minHeight: 76, boxSizing: "border-box", border: "1px solid #a9bbaa", borderRadius: 10, padding: 10, font: "inherit" },
  timeZone: { color: "#64748b", fontSize: 12 },
  notice: { margin: 0, color: "#28552e", fontWeight: 750 },
  message: { margin: 12, color: "#55705a" },
  error: { margin: 12, padding: 12, borderRadius: 12, background: "#fff5f5", color: "#991b1b" },
};
