import { useCallback, useEffect, useState } from "react";
import {
  completeWorkArea,
  createWorkItem,
  createWorkPlanIdempotencyKey,
  fetchProfessionalJobWorkPlan,
  progressWorkItem,
  updateWorkItem,
} from "../utils/workPlanApi.js";
import { getWorkPlanCopy } from "../utils/workPlanLanguage.js";
import ProfessionalCompletionReview from "./ProfessionalCompletionReview.jsx";

function statusLabel(status, copy) {
  const labels = {
    READY_TO_START: copy.readyToStart,
    PLANNED: copy.readyToStart,
    IN_PROGRESS: copy.inProgress,
    NEEDS_ATTENTION: copy.needsAttention,
    DONE: copy.completed,
    COMPLETED: copy.completed,
  };
  return labels[status] || copy.readyToStart;
}

function displayDate(value, language) {
  if (!value) return "";
  const locale = { en: "en-US", es: "es", fr: "fr", "pt-BR": "pt-BR" }[language] || "en-US";
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(
    new Date(value)
  );
}

const emptyEditor = Object.freeze({
  mode: "",
  workstreamId: "",
  activityId: "",
  statement: "",
  customerVisible: false,
});

export default function ProfessionalWorkPlanWorkspace({
  jobId,
  language = "en",
  setPage,
  onCanonicalChange,
}) {
  const copy = getWorkPlanCopy(language);
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({ status: "loading", plan: null, error: "" });
  const [editor, setEditor] = useState(emptyEditor);
  const [busy, setBusy] = useState("");
  const [commandError, setCommandError] = useState("");

  const loadPlan = useCallback(async () => {
    const plan = await fetchProfessionalJobWorkPlan({ jobId, setPage });
    setState({ status: "ready", plan, error: "" });
    return plan;
  }, [jobId, setPage]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setState({ status: "loading", plan: null, error: "" });
    });
    void fetchProfessionalJobWorkPlan({ jobId, setPage })
      .then((plan) => {
        if (active) setState({ status: "ready", plan, error: "" });
      })
      .catch((error) => {
        if (active) {
          setState({
            status: "error",
            plan: null,
            error: String(error?.code || "WORK_PLAN_FAILED"),
          });
        }
      });
    return () => { active = false; };
  }, [jobId, refreshKey, setPage]);

  const runCommand = useCallback(async (key, action) => {
    setBusy(key);
    setCommandError("");
    try {
      await action();
      await loadPlan();
      setEditor(emptyEditor);
      onCanonicalChange?.();
    } catch (error) {
      setCommandError(String(error?.code || "WORK_PLAN_COMMAND_FAILED"));
    } finally {
      setBusy("");
    }
  }, [loadPlan, onCanonicalChange]);

  const plan = state.plan;
  const summary = plan?.summary;

  return (
    <section
      className="professional-work-plan"
      style={styles.section}
      aria-labelledby="professional-work-plan-title"
      data-work-plan-status={state.status}
      data-work-plan-error={state.error || commandError}
      data-work-plan-job-id={jobId || ""}
    >
      <header style={styles.header}>
        <div>
          <span style={styles.eyebrow}>{copy.workspaceEyebrow}</span>
          <h2 id="professional-work-plan-title" style={styles.title}>{copy.workPlan}</h2>
          <p style={styles.purpose}>{copy.workspacePurpose}</p>
        </div>
        {summary && (
          <span style={styles.progressPill}>
            {copy.format("summaryProgress", {
              completed: summary.completedCount,
              total: summary.workItemCount,
            })}
          </span>
        )}
      </header>

      {state.status === "loading" && <p role="status">{copy.loading}</p>}
      {state.status === "error" && (
        <div role="alert" style={styles.error}>
          <p>{copy.unavailable}</p>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            {copy.retry}
          </button>
        </div>
      )}
      {commandError && <p role="alert" style={styles.commandError}>{copy.commandFailed}</p>}

      {summary && (
        <div style={styles.summary} aria-label={copy.workItems}>
          <div style={styles.metric}><strong>{summary.workItemCount}</strong><span>{copy.workItems}</span></div>
          <div style={styles.metric}><strong>{summary.completedCount}</strong><span>{copy.completed}</span></div>
          <div style={styles.metric}><strong>{summary.remainingCount}</strong><span>{copy.remaining}</span></div>
          <div style={styles.metric}><strong>{summary.needsAttentionCount}</strong><span>{copy.needsAttention}</span></div>
        </div>
      )}

      {summary?.readyForCompletionReview && (
        <div style={styles.readyNotice} role="status">
          <strong>{copy.readyForCompletionReview}</strong>
          <span>{copy.readyForCompletionReviewBody}</span>
        </div>
      )}

      {summary?.readyForCompletionReview && (
        <ProfessionalCompletionReview
          jobId={jobId}
          language={language}
          setPage={setPage}
          onCompleted={() => {
            void loadPlan();
            onCanonicalChange?.();
          }}
        />
      )}

      {state.status === "ready" && plan.workstreams.length === 0 && (
        <p style={styles.empty}>{copy.noApprovedWork}</p>
      )}

      {plan?.workstreams.map((workstream) => (
        <article
          key={workstream.id}
          style={styles.workstream}
          data-workstream-id={workstream.id}
          data-workstream-status={workstream.status}
        >
          <header style={styles.workstreamHeader}>
            <div style={styles.workstreamHeading}>
              <span style={styles.sequence}>{workstream.sequence}</span>
              <div>
                <h3 style={styles.workstreamTitle}>{workstream.title}</h3>
                <span style={styles.statusText}>{statusLabel(workstream.status, copy)}</span>
              </div>
            </div>
            <div style={styles.headerActions}>
              {workstream.canAddWorkItem && (
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setEditor({
                    ...emptyEditor,
                    mode: "create",
                    workstreamId: workstream.id,
                  })}
                >
                  {copy.addWorkItem}
                </button>
              )}
              {workstream.canMarkComplete && (
                <button
                  type="button"
                  style={styles.primaryButton}
                  disabled={Boolean(busy)}
                  onClick={() => runCommand(`workstream-${workstream.id}`, () =>
                    completeWorkArea({
                      jobId,
                      workstreamId: workstream.id,
                      expectedVersion: workstream.currentVersion,
                      idempotencyKey: createWorkPlanIdempotencyKey("complete-area"),
                      setPage,
                    })
                  )}
                >
                  {busy === `workstream-${workstream.id}` ? copy.saving : copy.completeWorkArea}
                </button>
              )}
            </div>
          </header>

          {workstream.blockers.length > 0 && (
            <div style={styles.blockers}>
              <strong>{copy.blockers}</strong>
              <ul style={styles.list}>
                {workstream.blockers.map((blocker) => (
                  <li key={blocker.id}>{blocker.statement}</li>
                ))}
              </ul>
            </div>
          )}

          {editor.mode === "create" && editor.workstreamId === workstream.id && (
            <WorkItemEditor
              copy={copy}
              editor={editor}
              busy={busy === "create"}
              onChange={setEditor}
              onCancel={() => setEditor(emptyEditor)}
              onSave={() => runCommand("create", () => createWorkItem({
                jobId,
                workstreamId: workstream.id,
                statement: editor.statement,
                customerVisible: editor.customerVisible,
                idempotencyKey: createWorkPlanIdempotencyKey("create-item"),
                setPage,
              }))}
            />
          )}

          <div style={styles.activities}>
            {workstream.activities.length === 0 && (
              <p style={styles.empty}>{copy.noApprovedWork}</p>
            )}
            {workstream.activities.map((activity) => (
              <div
                key={activity.id}
                style={styles.activity}
                data-work-item-id={activity.id}
                data-work-item-status={activity.status}
              >
                <div style={styles.activityTop}>
                  <div style={styles.activityCopy}>
                    <span style={styles.statusText}>{statusLabel(activity.status, copy)}</span>
                    <p style={styles.statement}>{activity.statement}</p>
                    <time style={styles.date} dateTime={activity.updatedAt}>
                      {displayDate(activity.updatedAt, language)}
                    </time>
                  </div>
                  <div style={styles.activityActions}>
                    {activity.canStart && (
                      <button
                        type="button"
                        style={styles.primaryButton}
                        disabled={Boolean(busy)}
                        onClick={() => runCommand(`start-${activity.id}`, () => progressWorkItem({
                          jobId,
                          workstreamId: workstream.id,
                          activityId: activity.id,
                          expectedVersion: activity.currentVersion,
                          targetStatus: "IN_PROGRESS",
                          idempotencyKey: createWorkPlanIdempotencyKey("start-item"),
                          setPage,
                        }))}
                      >
                        {busy === `start-${activity.id}` ? copy.saving : copy.startWork}
                      </button>
                    )}
                    {activity.canUpdate && activity.status === "IN_PROGRESS" && (
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => setEditor({
                          mode: "update",
                          workstreamId: workstream.id,
                          activityId: activity.id,
                          statement: activity.statement,
                          customerVisible: false,
                        })}
                      >
                        {copy.updateWork}
                      </button>
                    )}
                    {activity.canComplete && (
                      <button
                        type="button"
                        style={styles.primaryButton}
                        disabled={Boolean(busy)}
                        onClick={() => runCommand(`complete-${activity.id}`, () => progressWorkItem({
                          jobId,
                          workstreamId: workstream.id,
                          activityId: activity.id,
                          expectedVersion: activity.currentVersion,
                          targetStatus: "DONE",
                          idempotencyKey: createWorkPlanIdempotencyKey("complete-item"),
                          setPage,
                        }))}
                      >
                        {busy === `complete-${activity.id}` ? copy.saving : copy.markComplete}
                      </button>
                    )}
                  </div>
                </div>

                {editor.mode === "update" && editor.activityId === activity.id && (
                  <WorkItemEditor
                    copy={copy}
                    editor={editor}
                    busy={busy === `update-${activity.id}`}
                    onChange={setEditor}
                    onCancel={() => setEditor(emptyEditor)}
                    onSave={() => runCommand(`update-${activity.id}`, () => updateWorkItem({
                      jobId,
                      workstreamId: workstream.id,
                      activityId: activity.id,
                      expectedVersion: activity.currentVersion,
                      statement: editor.statement,
                      customerVisible: editor.customerVisible,
                      idempotencyKey: createWorkPlanIdempotencyKey("update-item"),
                      setPage,
                    }))}
                  />
                )}

                {activity.updates.length > 0 && (
                  <details style={styles.updates}>
                    <summary>{copy.progressUpdates}</summary>
                    <ul style={styles.list}>
                      {activity.updates.map((update) => (
                        <li key={update.version}>
                          {update.statement}
                          {update.customerVisible && (
                            <span style={styles.customerUpdate}> {copy.customerUpdate}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function WorkItemEditor({ copy, editor, busy, onChange, onCancel, onSave }) {
  const valid = editor.statement.trim().length > 0 && editor.statement.length <= 5000;
  return (
    <form
      style={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !busy) onSave();
      }}
    >
      <label style={styles.label}>
        {copy.workItemDescription}
        <textarea
          value={editor.statement}
          maxLength={5000}
          rows={3}
          style={styles.textarea}
          onChange={(event) => onChange({ ...editor, statement: event.target.value })}
        />
      </label>
      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={editor.customerVisible}
          onChange={(event) => onChange({
            ...editor,
            customerVisible: event.target.checked,
          })}
        />
        <span><strong>{copy.customerUpdate}</strong><small>{copy.customerUpdateHint}</small></span>
      </label>
      <div style={styles.editorActions}>
        <button type="button" style={styles.secondaryButton} onClick={onCancel}>
          {copy.cancel}
        </button>
        <button type="submit" style={styles.primaryButton} disabled={!valid || busy}>
          {busy ? copy.saving : copy.save}
        </button>
      </div>
    </form>
  );
}

const styles = {
  section: { display: "grid", gap: 18, margin: "20px 0", minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  eyebrow: { color: "#475569", fontSize: 12, fontWeight: 800 },
  title: { margin: "3px 0 0", fontSize: 24, letterSpacing: 0 },
  purpose: { margin: "7px 0 0", color: "#475569", lineHeight: 1.5 },
  progressPill: { alignSelf: "flex-start", color: "#1f5132", fontWeight: 800, fontSize: 13 },
  summary: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 1, borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" },
  metric: { display: "grid", gap: 3, minWidth: 0, padding: "10px 8px", overflowWrap: "anywhere" },
  workstream: { display: "grid", gap: 16, padding: "18px 0", borderBottom: "1px solid #cbd5e1", minWidth: 0 },
  workstreamHeader: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  workstreamHeading: { display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 },
  sequence: { display: "grid", placeItems: "center", width: 30, height: 30, flex: "0 0 30px", borderRadius: 6, background: "#e8f1e5", color: "#1f5132", fontWeight: 900 },
  workstreamTitle: { margin: 0, fontSize: 18, letterSpacing: 0, overflowWrap: "anywhere" },
  statusText: { color: "#1f5132", fontSize: 12, fontWeight: 850 },
  headerActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  activities: { display: "grid", gap: 4 },
  activity: { display: "grid", gap: 12, padding: "14px 0 14px 14px", borderLeft: "3px solid #d7e3d2", minWidth: 0 },
  activityTop: { display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" },
  activityCopy: { minWidth: 0, flex: "1 1 260px" },
  statement: { margin: "4px 0", lineHeight: 1.5, overflowWrap: "anywhere" },
  date: { color: "#64748b", fontSize: 12 },
  activityActions: { display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" },
  primaryButton: { minHeight: 44, padding: "9px 14px", border: 0, borderRadius: 6, background: "#1f5132", color: "#fff", fontWeight: 850, cursor: "pointer" },
  secondaryButton: { minHeight: 44, padding: "9px 14px", border: "1px solid #64748b", borderRadius: 6, background: "#fff", color: "#243326", fontWeight: 800, cursor: "pointer" },
  blockers: { display: "grid", gap: 8, padding: 12, borderLeft: "3px solid #b45309", background: "#fffaf0", color: "#7c2d12" },
  list: { margin: 0, paddingLeft: 20, display: "grid", gap: 6 },
  updates: { color: "#475569", fontSize: 13 },
  customerUpdate: { color: "#166534", fontWeight: 800 },
  editor: { display: "grid", gap: 12, padding: 14, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8 },
  label: { display: "grid", gap: 6, fontWeight: 800 },
  textarea: { width: "100%", minHeight: 88, padding: 10, boxSizing: "border-box", border: "1px solid #94a3b8", borderRadius: 6, font: "inherit", resize: "vertical" },
  checkboxLabel: { display: "flex", alignItems: "flex-start", gap: 10, minHeight: 44 },
  editorActions: { display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" },
  readyNotice: { display: "grid", gap: 4, padding: 14, borderLeft: "3px solid #1f5132", background: "#eff7ed", color: "#24452e" },
  empty: { margin: 0, color: "#64748b" },
  error: { color: "#991b1b" },
  commandError: { margin: 0, color: "#991b1b", fontWeight: 700 },
};
