import { useEffect, useMemo, useState } from "react";
import {
  activateCanonicalVisitAuthority,
  runCanonicalVisitCommand,
} from "../utils/canonicalVisitProjection.js";
import {
  getCanonicalVisitErrorMessage,
  loadCanonicalVisitWorkspace,
} from "../utils/canonicalVisitController.js";
import { isCanonicalWorkCenterHydrationEnabled } from "../utils/workCenterCanonicalHydration.js";
import { requestEvaluationVisitHandoff } from "../utils/evaluationVisitHandoff.js";

const STATE_LABELS = Object.freeze({
  PROPOSED: "Pending customer confirmation",
  SCHEDULED: "Scheduled",
  STARTED: "In Progress",
  CANCELLED: "Cancelled",
  COMPLETED: "Visit completed",
});

const AUTHORITY_LABELS = Object.freeze({
  AVAILABLE: "Ready to schedule",
  ACTIVE: "Scheduling active",
  UNAVAILABLE: "Not available",
});

const EVENT_LABELS = Object.freeze({
  VISIT_PROPOSED: "Visit proposed",
  VISIT_SCHEDULE_PROPOSED: "New schedule proposed",
  VISIT_CONFIRMED: "Customer confirmed",
  VISIT_CHANGE_REQUESTED: "Customer requested a schedule change",
  VISIT_RESCHEDULED: "Visit rescheduled",
  VISIT_CANCELLED: "Visit cancelled",
  VISIT_STARTED: "Visit started",
  VISIT_COMPLETED: "Visit occurred",
});

function localInputValue(value) {
  const date = value ? new Date(value) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function initialSchedule(visit = null) {
  const start = visit?.scheduledStartAt
    ? new Date(visit.scheduledStartAt)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const end = visit?.scheduledEndAt ? new Date(visit.scheduledEndAt) : null;
  return {
    scheduledStartAt: localInputValue(start),
    scheduledEndAt: end ? localInputValue(end) : "",
    timeZone:
      visit?.timeZone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC",
    locationMode: visit?.locationMode || "JOB_SERVICE_LOCATION",
    reason: "",
  };
}

function formatVisitInstant(value, timeZone) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone,
      timeZoneName: "short",
    }).format(new Date(value));
  } catch {
    return "Schedule unavailable";
  }
}

function visitSchedule(visit) {
  const start = formatVisitInstant(visit.scheduledStartAt, visit.timeZone);
  return visit.scheduledEndAt
    ? `${start} – ${formatVisitInstant(visit.scheduledEndAt, visit.timeZone)}`
    : start;
}

function unresolvedChangeRequest(visit) {
  const events = visit.history?.events || [];
  let latest = null;
  for (const event of events) {
    if (event.type === "VISIT_CHANGE_REQUESTED") latest = event;
    if (
      latest &&
      ["VISIT_RESCHEDULED", "VISIT_CANCELLED", "VISIT_COMPLETED"].includes(
        event.type
      ) &&
      Date.parse(event.createdAt) >= Date.parse(latest.createdAt)
    ) {
      latest = null;
    }
  }
  return latest;
}

function schedulePayload(form) {
  const scheduledStartAt = new Date(form.scheduledStartAt);
  const scheduledEndAt = form.scheduledEndAt
    ? new Date(form.scheduledEndAt)
    : null;
  if (
    Number.isNaN(scheduledStartAt.getTime()) ||
    (scheduledEndAt && Number.isNaN(scheduledEndAt.getTime())) ||
    (scheduledEndAt && scheduledEndAt <= scheduledStartAt)
  ) {
    return null;
  }
  return {
    scheduledStartAt: scheduledStartAt.toISOString(),
    scheduledEndAt: scheduledEndAt ? scheduledEndAt.toISOString() : null,
    timeZone: form.timeZone,
    locationMode: form.locationMode,
  };
}

function subjectKey(subject) {
  return `${subject.purpose}:${subject.subjectId}`;
}

function notifyCanonicalVisitChanged(jobId, visitId = null) {
  window.dispatchEvent(new CustomEvent("meetro-canonical-visit-changed", {
    detail: { jobId, visitId, source: "job-overview" },
  }));
}

export default function CanonicalJobVisits({ record = {}, setPage }) {
  const environmentEnabled = isCanonicalWorkCenterHydrationEnabled();
  const jobId = String(record.jobId || "").trim();
  const requestId = Number(record.requestId || record.postId) || null;
  const relationshipId = Number(record.relationshipId) || null;
  const [reloadVersion, setReloadVersion] = useState(0);
  const [workspace, setWorkspace] = useState({
    status: "loading",
    evaluation: null,
    approvedWork: [],
    quoteDecisionSummary: { pending: 0, declined: 0 },
    error: "",
  });
  const [runningKey, setRunningKey] = useState("");
  const [notice, setNotice] = useState("");
  const [commandError, setCommandError] = useState("");
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(initialSchedule());

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setEditor(null);
      setNotice("");
      setCommandError("");
    });
    return () => {
      active = false;
    };
  }, [jobId]);

  useEffect(() => {
    let active = true;

    if (!environmentEnabled || !jobId) {
      Promise.resolve().then(() => {
        if (!active) return;
        setWorkspace({
          status: "unavailable",
          evaluation: null,
          approvedWork: [],
          quoteDecisionSummary: { pending: 0, declined: 0 },
          error: "Visit scheduling is unavailable for this job.",
        });
      });
      return () => {
        active = false;
      };
    }

    Promise.resolve().then(() => {
      if (active) {
        setWorkspace((current) => ({ ...current, status: "loading", error: "" }));
      }
    });
    void loadCanonicalVisitWorkspace({
      record: {
        source: "CANONICAL_BACKEND_READ",
        readOnly: true,
        lifecycleVerified: true,
        lifecycleContractVersion: 2,
        jobId,
        requestId,
        postId: requestId,
        relationshipId,
      },
      setPage,
    }).then((result) => {
      if (active) setWorkspace(result);
    });
    return () => {
      active = false;
    };
  }, [environmentEnabled, jobId, relationshipId, reloadVersion, requestId, setPage]);

  useEffect(() => {
    function handleCanonicalVisitChanged(event) {
      if (String(event?.detail?.jobId || "") !== jobId) return;
      setReloadVersion((current) => current + 1);
    }

    window.addEventListener(
      "meetro-canonical-visit-changed",
      handleCanonicalVisitChanged
    );
    return () => {
      window.removeEventListener(
        "meetro-canonical-visit-changed",
        handleCanonicalVisitChanged
      );
    };
  }, [jobId]);

  const subjects = useMemo(
    () => [workspace.evaluation, ...(workspace.approvedWork || [])].filter(Boolean),
    [workspace.approvedWork, workspace.evaluation]
  );

  function reload() {
    setReloadVersion((current) => current + 1);
  }

  function openEditor(subject, mode, visit = null) {
    setNotice("");
    setCommandError("");
    setForm(initialSchedule(visit));
    setEditor({
      key: subjectKey(subject),
      mode,
      purpose: subject.purpose,
      subjectId: subject.subjectId,
      evaluationId: subject.evaluationId || null,
      approvedQuoteDecisionId: subject.authority?.approvedQuoteDecisionId || null,
      visit,
    });
  }

  async function activate(subject) {
    const key = `${subjectKey(subject)}:activate`;
    setRunningKey(key);
    setNotice("");
    setCommandError("");
    try {
      await activateCanonicalVisitAuthority({
        jobId,
        purpose: subject.purpose,
        subjectId: subject.subjectId,
        setPage,
      });
      setNotice(
        subject.purpose === "EVALUATION"
          ? "Evaluation visit scheduling is ready."
          : "Work scheduling is ready."
      );
      reload();
      notifyCanonicalVisitChanged(jobId);
    } catch (error) {
      setCommandError(getCanonicalVisitErrorMessage(error));
    } finally {
      setRunningKey("");
    }
  }

  async function submitEditor(event) {
    event.preventDefault();
    if (!editor) return;
    const schedule =
      editor.mode === "cancel" ? null : schedulePayload(form);
    if (editor.mode !== "cancel" && !schedule) {
      setCommandError("Choose a valid Visit start and end time.");
      return;
    }
    const key = `${editor.key}:${editor.mode}:${editor.visit?.id || "new"}`;
    setRunningKey(key);
    setNotice("");
    setCommandError("");
    try {
      await runCanonicalVisitCommand({
        jobId,
        command: editor.mode,
        visit: editor.visit,
        purpose: editor.purpose,
        evaluationId:
          editor.purpose === "EVALUATION" ? editor.evaluationId : null,
        approvedQuoteDecisionId: editor.approvedQuoteDecisionId,
        schedule,
        reason: form.reason.trim() || null,
        setPage,
      });
      setNotice(
        {
          propose: "Visit proposed successfully.",
          reschedule: "Visit rescheduled successfully.",
          cancel: "Visit cancelled successfully.",
        }[editor.mode] || "Visit updated successfully."
      );
      setEditor(null);
      reload();
      notifyCanonicalVisitChanged(jobId, editor.visit?.id || null);
    } catch (error) {
      if (error?.code === "STALE_VISIT_VERSION") {
        setCommandError(
          "This visit changed elsewhere. The latest visit details were reloaded; no change was retried."
        );
        reload();
      } else {
        setCommandError(getCanonicalVisitErrorMessage(error));
      }
    } finally {
      setRunningKey("");
    }
  }

  async function completeVisit(subject, visit) {
    const key = `${subjectKey(subject)}:complete:${visit.id}`;
    setRunningKey(key);
    setNotice("");
    setCommandError("");
    try {
      await runCanonicalVisitCommand({
        jobId,
        command: "complete",
        visit,
        setPage,
      });
      setNotice(
        "Visit attendance recorded."
      );
      reload();
      notifyCanonicalVisitChanged(jobId, visit.id);
    } catch (error) {
      if (error?.code === "STALE_VISIT_VERSION") {
        setCommandError(
          "This visit changed elsewhere. The latest visit details were reloaded; no change was retried."
        );
        reload();
      } else {
        setCommandError(getCanonicalVisitErrorMessage(error));
      }
    } finally {
      setRunningKey("");
    }
  }

  async function startVisit(subject, visit, acknowledgeScheduleVariance = false) {
    const key = `${subjectKey(subject)}:start:${visit.id}`;
    setRunningKey(key);
    setNotice("");
    setCommandError("");
    try {
      const updated = await runCanonicalVisitCommand({
        jobId,
        command: "start",
        visit,
        acknowledgeScheduleVariance,
        setPage,
      });
      setNotice("Visit started. Evaluation documentation is now available.");
      reload();
      notifyCanonicalVisitChanged(jobId, visit.id);
      requestEvaluationVisitHandoff({
        jobId,
        visit: updated,
        source: "job-overview",
      });
    } catch (error) {
      if (
        error?.code === "VISIT_START_ACKNOWLEDGMENT_REQUIRED" &&
        !acknowledgeScheduleVariance &&
        window.confirm(
          "This start is outside the normal appointment window. Start the Visit now?"
        )
      ) {
        setRunningKey("");
        await startVisit(subject, visit, true);
        return;
      }
      if (error?.code === "STALE_VISIT_VERSION") reload();
      setCommandError(getCanonicalVisitErrorMessage(error));
    } finally {
      setRunningKey("");
    }
  }

  async function confirmVisit(subject, visit) {
    const key = `${subjectKey(subject)}:confirm:${visit.id}`;
    setRunningKey(key);
    setNotice("");
    setCommandError("");
    try {
      await runCanonicalVisitCommand({
        jobId,
        command: "confirm",
        visit,
        setPage,
      });
      setNotice("The customer’s exact proposed time is confirmed.");
      reload();
      notifyCanonicalVisitChanged(jobId, visit.id);
    } catch (error) {
      if (error?.code === "STALE_VISIT_VERSION") reload();
      setCommandError(getCanonicalVisitErrorMessage(error));
    } finally {
      setRunningKey("");
    }
  }

  if (!environmentEnabled || !jobId) return null;

  return (
    <section style={styles.section} aria-labelledby="canonical-job-visits-title">
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Visit planning</span>
          <h3 id="canonical-job-visits-title" style={styles.title}>
            Visits
          </h3>
        </div>
        <span style={styles.readOnly}>For this job</span>
      </div>

      <p style={styles.boundaryNote}>
        Plan visit timing and keep the customer informed.
      </p>

      {workspace.status === "loading" && (
        <p role="status" style={styles.message}>Loading visit schedule.</p>
      )}
      {workspace.status !== "loading" && workspace.error && (
        <p role="alert" style={styles.error}>{workspace.error}</p>
      )}
      {notice && <p role="status" style={styles.success}>{notice}</p>}
      {commandError && <p role="alert" style={styles.error}>{commandError}</p>}

      {workspace.status === "ready" && subjects.length === 0 && (
        <div style={styles.emptyState}>
          <strong>Scheduling is not available yet.</strong>
          <span>
            Evaluation Visits become available after professional Selection. Work
            Visits remain unavailable until the customer approves an issued quote.
          </span>
          {workspace.quoteDecisionSummary.pending > 0 && (
            <span>Waiting for the customer’s quote decision before work can be scheduled.</span>
          )}
          {workspace.quoteDecisionSummary.declined > 0 && (
            <span>Work cannot be scheduled from a declined quote.</span>
          )}
        </div>
      )}

      {workspace.status === "ready" && subjects.length > 0 && (
        <div style={styles.subjectList}>
          {subjects.map((subject) => {
            const key = subjectKey(subject);
            const authority = subject.authority;
            return (
              <article key={key} style={styles.subjectCard}>
                <div style={styles.subjectHeader}>
                  <div>
                    <span style={styles.subjectType}>
                      {subject.purpose === "EVALUATION"
                        ? "Evaluation Visit"
                        : "Approved Work"}
                    </span>
                    <strong style={styles.subjectTitle}>
                      {subject.purpose === "EVALUATION"
                        ? "Evaluation Visit"
                        : "Work scheduling"}
                    </strong>
                  </div>
                  <span style={styles.stateBadge}>
                    {authority
                      ? AUTHORITY_LABELS[authority.state] || authority.state
                      : "Unavailable"}
                  </span>
                </div>

                {subject.status === "error" && (
                  <p role="alert" style={styles.error}>{subject.error}</p>
                )}

                {authority && (
                  <>
                    {authority.state === "AVAILABLE" && (
                      <p style={styles.message}>
                        {authority.actions.canActivate === true
                          ? "This job is ready for scheduling. No visit has been scheduled yet."
                          : "Scheduling is not available yet. No visit has been added."}
                      </p>
                    )}
                    {authority.state === "UNAVAILABLE" && (
                      <p style={styles.message}>
                        Scheduling is not available for this evaluation.
                      </p>
                    )}
                    <div style={styles.actionRow}>
                      {authority.actions.canActivate === true && (
                        <button
                          type="button"
                          style={styles.primaryButton}
                          disabled={Boolean(runningKey)}
                          onClick={() => activate(subject)}
                        >
                          {runningKey === `${key}:activate`
                            ? "Preparing schedule…"
                            : subject.purpose === "EVALUATION"
                              ? "Schedule Evaluation"
                              : "Schedule Work"}
                        </button>
                      )}
                      {authority.actions.canPropose === true && (
                        <button
                          type="button"
                          style={styles.primaryButton}
                          disabled={Boolean(runningKey)}
                          onClick={() => openEditor(subject, "propose")}
                        >
                          Propose Visit
                        </button>
                      )}
                    </div>
                  </>
                )}

                {authority?.state === "ACTIVE" && subject.visits.length === 0 && (
                  <p style={styles.message}>No visits have been proposed yet.</p>
                )}

                {subject.visits.length > 0 && (
                  <div style={styles.visitGrid}>
                    {subject.visits.map((visit) => {
                      const changeRequest = unresolvedChangeRequest(visit);
                      return (
                        <section key={visit.id} style={styles.visitCard}>
                          <div style={styles.visitHeader}>
                            <strong>
                              {visit.state === "PROPOSED" && visit.actions.canConfirm
                                ? "Change Requested"
                                : STATE_LABELS[visit.state]}
                            </strong>
                            <span style={styles.version}>Version {visit.currentVersion}</span>
                          </div>
                          <p style={styles.schedule}>{visitSchedule(visit)}</p>
                          <span style={styles.location}>
                            {visit.locationMode === "REMOTE"
                              ? "Remote Visit"
                              : "Job service location"}
                          </span>
                          {visit.startedAt && (
                            <span style={styles.location}>
                              Started {formatVisitInstant(visit.startedAt, visit.timeZone)}
                            </span>
                          )}

                          {visit.state === "PROPOSED" && (
                            <p style={styles.pendingNotice}>
                              {visit.actions.canConfirm
                                ? "Customer proposed a new time. Approve this exact version or edit it."
                                : "Waiting for the customer to confirm or propose a new time."}
                            </p>
                          )}
                          {changeRequest && (
                            <p style={styles.changeNotice}>
                              <strong>Customer requested a schedule change.</strong>{" "}
                              {changeRequest.reason || "Review the request before rescheduling."}
                            </p>
                          )}
                          {visit.state === "CANCELLED" && visit.cancellationReason && (
                            <p style={styles.message}>Reason: {visit.cancellationReason}</p>
                          )}
                          {visit.state === "COMPLETED" && (
                            <p style={styles.completedNotice}>
                              This records only that the Visit occurred. No Evaluation,
                              approved scope, Workstream, or Job was completed by this action.
                            </p>
                          )}

                          <div style={styles.actionRow}>
                            {visit.actions.canConfirm === true && (
                              <button
                                type="button"
                                style={styles.primaryButton}
                                disabled={Boolean(runningKey)}
                                onClick={() => confirmVisit(subject, visit)}
                              >
                                {runningKey === `${key}:confirm:${visit.id}`
                                  ? "Confirming…"
                                  : "Approve New Time"}
                              </button>
                            )}
                            {visit.actions.canReschedule === true && (
                              <button
                                type="button"
                                style={styles.secondaryButton}
                                disabled={Boolean(runningKey)}
                                onClick={() => openEditor(subject, "reschedule", visit)}
                              >
                                Reschedule
                              </button>
                            )}
                            {visit.actions.canCancel === true && (
                              <button
                                type="button"
                                style={styles.dangerButton}
                                disabled={Boolean(runningKey)}
                                onClick={() => openEditor(subject, "cancel", visit)}
                              >
                                Cancel Visit
                              </button>
                            )}
                            {visit.actions.canStart === true && (
                              <button
                                type="button"
                                style={styles.primaryButton}
                                disabled={Boolean(runningKey)}
                                onClick={() => startVisit(subject, visit)}
                              >
                                {runningKey === `${key}:start:${visit.id}`
                                  ? "Starting…"
                                  : "Start Visit"}
                              </button>
                            )}
                            {visit.actions.canComplete === true && (
                              <button
                                type="button"
                                style={styles.primaryButton}
                                disabled={Boolean(runningKey)}
                                onClick={() => completeVisit(subject, visit)}
                              >
                                {runningKey === `${key}:complete:${visit.id}`
                                  ? "Recording…"
                                  : "Record Visit Occurred"}
                              </button>
                            )}
                          </div>

                          {visit.history?.events?.length > 0 && (
                            <details style={styles.history}>
                              <summary style={styles.historySummary}>Visit history</summary>
                              <ol style={styles.historyList}>
                                {visit.history.events.map((historyEvent) => (
                                  <li key={historyEvent.id} style={styles.historyItem}>
                                    <strong>
                                      {EVENT_LABELS[historyEvent.type] || historyEvent.type}
                                    </strong>
                                    <span>
                                      {formatVisitInstant(historyEvent.createdAt, visit.timeZone)}
                                    </span>
                                    {historyEvent.reason && <span>{historyEvent.reason}</span>}
                                  </li>
                                ))}
                              </ol>
                            </details>
                          )}
                        </section>
                      );
                    })}
                  </div>
                )}

                {editor?.key === key && (
                  <form style={styles.form} onSubmit={submitEditor}>
                    <strong>
                      {editor.mode === "propose"
                        ? "Propose Visit"
                        : editor.mode === "reschedule"
                          ? "Reschedule Visit"
                          : "Cancel Visit"}
                    </strong>
                    {editor.mode !== "cancel" && (
                      <>
                        <div style={styles.formGrid}>
                          <label style={styles.label}>
                            Start
                            <input
                              required
                              type="datetime-local"
                              style={styles.input}
                              value={form.scheduledStartAt}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  scheduledStartAt: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label style={styles.label}>
                            Arrival window end (optional)
                            <input
                              type="datetime-local"
                              style={styles.input}
                              value={form.scheduledEndAt}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  scheduledEndAt: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>
                        <label style={styles.label}>
                          Location
                          <select
                            style={styles.input}
                            value={form.locationMode}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                locationMode: event.target.value,
                              }))
                            }
                          >
                            <option value="JOB_SERVICE_LOCATION">Job service location</option>
                            <option value="REMOTE">Remote</option>
                          </select>
                        </label>
                        <span style={styles.timeZone}>Time zone: {form.timeZone}</span>
                      </>
                    )}
                    {editor.mode !== "propose" && (
                      <label style={styles.label}>
                        {editor.mode === "cancel"
                          ? editor.visit?.state === "STARTED"
                            ? "Why are you stopping this Visit?"
                            : "Cancellation reason (optional)"
                          : "Reason for rescheduling (optional)"}
                        <textarea
                          required={editor.mode === "cancel" && editor.visit?.state === "STARTED"}
                          style={styles.textarea}
                          maxLength={2000}
                          value={form.reason}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              reason: event.target.value,
                            }))
                          }
                        />
                      </label>
                    )}
                    <div style={styles.actionRow}>
                      <button
                        type="submit"
                        style={editor.mode === "cancel" ? styles.dangerButton : styles.primaryButton}
                        disabled={Boolean(runningKey)}
                      >
                        {runningKey ? "Saving…" : "Save Visit"}
                      </button>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        disabled={Boolean(runningKey)}
                        onClick={() => setEditor(null)}
                      >
                        Close
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

const styles = {
  section: {
    display: "grid",
    gap: 16,
    minWidth: 0,
    padding: "18px 0",
    borderTop: "1px solid #cbd5e1",
    borderBottom: "1px solid #cbd5e1",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    display: "block",
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  title: { margin: "4px 0 0", fontSize: 20, letterSpacing: 0 },
  readOnly: { color: "#166534", fontSize: 12, fontWeight: 800 },
  boundaryNote: {
    margin: 0,
    padding: 12,
    borderRadius: 12,
    background: "#f8fafc",
    color: "#334155",
    lineHeight: 1.5,
  },
  message: { margin: 0, color: "#64748b", lineHeight: 1.5 },
  error: {
    margin: 0,
    padding: 10,
    borderLeft: "3px solid #b91c1c",
    color: "#991b1b",
    background: "#fef2f2",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },
  success: {
    margin: 0,
    padding: 10,
    borderLeft: "3px solid #15803d",
    color: "#166534",
    background: "#f0fdf4",
    lineHeight: 1.5,
  },
  emptyState: {
    display: "grid",
    gap: 8,
    padding: 14,
    border: "1px dashed #94a3b8",
    borderRadius: 14,
    color: "#475569",
    lineHeight: 1.5,
  },
  subjectList: { display: "grid", gap: 14, minWidth: 0 },
  subjectCard: {
    display: "grid",
    gap: 14,
    minWidth: 0,
    padding: 16,
    border: "1px solid #dbe3ec",
    borderRadius: 16,
    background: "#ffffff",
  },
  subjectHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  subjectType: {
    display: "block",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  subjectTitle: { display: "block", marginTop: 3, color: "#0f172a" },
  stateBadge: {
    padding: "5px 9px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 800,
  },
  visitGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
    gap: 12,
    minWidth: 0,
  },
  visitCard: {
    display: "grid",
    alignContent: "start",
    gap: 10,
    minWidth: 0,
    padding: 14,
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    background: "#f8fafc",
  },
  visitHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  version: { color: "#64748b", fontSize: 12, fontWeight: 700 },
  schedule: { margin: 0, color: "#0f172a", fontWeight: 750, lineHeight: 1.45 },
  location: { color: "#475569", fontSize: 13 },
  pendingNotice: {
    margin: 0,
    padding: 10,
    borderRadius: 10,
    background: "#fff7ed",
    color: "#9a3412",
    lineHeight: 1.45,
  },
  changeNotice: {
    margin: 0,
    padding: 10,
    borderRadius: 10,
    background: "#fffbeb",
    color: "#92400e",
    lineHeight: 1.45,
  },
  completedNotice: {
    margin: 0,
    padding: 10,
    borderRadius: 10,
    background: "#f0fdf4",
    color: "#166534",
    lineHeight: 1.45,
  },
  actionRow: { display: "flex", flexWrap: "wrap", gap: 9, alignItems: "center" },
  primaryButton: {
    minHeight: 44,
    padding: "10px 14px",
    border: "1px solid #1d4ed8",
    borderRadius: 10,
    background: "#1d4ed8",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    minHeight: 44,
    padding: "10px 14px",
    border: "1px solid #94a3b8",
    borderRadius: 10,
    background: "#ffffff",
    color: "#334155",
    fontWeight: 800,
    cursor: "pointer",
  },
  dangerButton: {
    minHeight: 44,
    padding: "10px 14px",
    border: "1px solid #b91c1c",
    borderRadius: 10,
    background: "#ffffff",
    color: "#991b1b",
    fontWeight: 800,
    cursor: "pointer",
  },
  history: { borderTop: "1px solid #e2e8f0", paddingTop: 8 },
  historySummary: { color: "#334155", fontWeight: 800, cursor: "pointer" },
  historyList: { display: "grid", gap: 8, margin: "10px 0 0", paddingLeft: 22 },
  historyItem: { display: "grid", gap: 2, color: "#475569", fontSize: 13 },
  form: {
    display: "grid",
    gap: 12,
    minWidth: 0,
    padding: 14,
    border: "1px solid #93c5fd",
    borderRadius: 14,
    background: "#eff6ff",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    gap: 10,
    minWidth: 0,
  },
  label: { display: "grid", gap: 6, minWidth: 0, color: "#334155", fontWeight: 750 },
  input: {
    width: "100%",
    minWidth: 0,
    minHeight: 44,
    boxSizing: "border-box",
    padding: "9px 10px",
    border: "1px solid #94a3b8",
    borderRadius: 9,
    background: "#ffffff",
    color: "#0f172a",
  },
  textarea: {
    width: "100%",
    minWidth: 0,
    minHeight: 82,
    boxSizing: "border-box",
    padding: 10,
    border: "1px solid #94a3b8",
    borderRadius: 9,
    resize: "vertical",
  },
  timeZone: { color: "#475569", fontSize: 13, overflowWrap: "anywhere" },
};
