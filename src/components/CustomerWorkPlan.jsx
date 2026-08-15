import { useEffect, useState } from "react";
import { fetchCustomerJobWorkPlan } from "../utils/workPlanApi.js";
import { getWorkPlanCopy } from "../utils/workPlanLanguage.js";

function statusLabel(status, copy) {
  return {
    READY_TO_START: copy.readyToStart,
    IN_PROGRESS: copy.inProgress,
    COMPLETED: copy.completed,
  }[status] || copy.readyToStart;
}

export default function CustomerWorkPlan({ jobId, language = "en", setPage }) {
  const copy = getWorkPlanCopy(language);
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({ status: "idle", plan: null, error: "" });

  useEffect(() => {
    let active = true;
    if (!jobId) {
      queueMicrotask(() => {
        if (active) setState({ status: "idle", plan: null, error: "" });
      });
      return () => { active = false; };
    }
    queueMicrotask(() => {
      if (active) setState({ status: "loading", plan: null, error: "" });
    });
    void fetchCustomerJobWorkPlan({ jobId, setPage })
      .then((plan) => {
        if (active) setState({ status: "ready", plan, error: "" });
      })
      .catch((error) => {
        if (active) {
          setState({
            status: "error",
            plan: null,
            error: String(error?.code || "CUSTOMER_WORK_PLAN_FAILED"),
          });
        }
      });
    return () => { active = false; };
  }, [jobId, refreshKey, setPage]);

  if (!jobId) return null;
  const plan = state.plan;
  return (
    <section
      style={styles.section}
      aria-labelledby="customer-work-plan-title"
      data-customer-work-plan-status={state.status}
      data-customer-work-plan-error={state.error}
      data-customer-work-plan-job-id={jobId}
    >
      <header style={styles.header}>
        <div>
          <span style={styles.eyebrow}>{copy.workspaceEyebrow}</span>
          <h2 id="customer-work-plan-title" style={styles.title}>{copy.workPlan}</h2>
          <p style={styles.purpose}>{copy.customerPurpose}</p>
        </div>
        {plan && (
          <span style={styles.progress}>
            {plan.summary.completedCount} {copy.completed} ·{" "}
            {plan.summary.remainingCount} {copy.remaining}
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
      {plan?.summary.readyForCompletionReview && (
        <div role="status" style={styles.readyNotice}>
          <strong>{copy.readyForCompletionReview}</strong>
          <span>{copy.readyForCompletionReviewBody}</span>
        </div>
      )}
      {state.status === "ready" && plan.workstreams.length === 0 && (
        <p style={styles.empty}>{copy.noApprovedWork}</p>
      )}

      <div style={styles.workstreams}>
        {plan?.workstreams.map((workstream) => (
          <article
            key={workstream.id}
            style={styles.workstream}
            data-customer-workstream-id={workstream.id}
            data-customer-workstream-status={workstream.status}
          >
            <header style={styles.workstreamHeader}>
              <h3 style={styles.workstreamTitle}>{workstream.title}</h3>
              <span style={styles.status}>{statusLabel(workstream.status, copy)}</span>
            </header>
            {workstream.activities.length > 0 && (
              <ul style={styles.items}>
                {workstream.activities.map((activity) => (
                  <li key={activity.id} style={styles.item}>
                    <span style={styles.itemStatus}>{statusLabel(activity.status, copy)}</span>
                    <span style={styles.itemText}>{activity.statement}</span>
                  </li>
                ))}
              </ul>
            )}
            {workstream.updates.length > 0 ? (
              <div style={styles.updates}>
                <strong>{copy.progressUpdates}</strong>
                <ul style={styles.updateList}>
                  {workstream.updates.map((update, index) => (
                    <li key={`${update.activityId}-${update.recordedAt}-${index}`}>
                      {update.statement}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p style={styles.empty}>{copy.customerNoProgress}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

const styles = {
  section: { display: "grid", gap: 16, margin: "16px 0", padding: "18px 0", borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  eyebrow: { color: "#475569", fontSize: 12, fontWeight: 800 },
  title: { margin: "3px 0 0", fontSize: 22, letterSpacing: 0 },
  purpose: { margin: "6px 0 0", color: "#475569", lineHeight: 1.5 },
  progress: { color: "#1f5132", fontSize: 13, fontWeight: 800 },
  workstreams: { display: "grid", gap: 0 },
  workstream: { display: "grid", gap: 12, padding: "16px 0", borderTop: "1px solid #e2e8f0", minWidth: 0 },
  workstreamHeader: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  workstreamTitle: { margin: 0, fontSize: 17, letterSpacing: 0, overflowWrap: "anywhere" },
  status: { color: "#1f5132", fontSize: 12, fontWeight: 850 },
  items: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 },
  item: { display: "grid", gridTemplateColumns: "minmax(90px, auto) 1fr", gap: 10, alignItems: "start", minWidth: 0 },
  itemStatus: { color: "#475569", fontSize: 12, fontWeight: 800 },
  itemText: { lineHeight: 1.5, overflowWrap: "anywhere" },
  updates: { display: "grid", gap: 8, paddingLeft: 12, borderLeft: "3px solid #d7e3d2" },
  updateList: { margin: 0, paddingLeft: 20, display: "grid", gap: 6, lineHeight: 1.5 },
  readyNotice: { display: "grid", gap: 4, padding: 14, borderLeft: "3px solid #1f5132", background: "#eff7ed", color: "#24452e" },
  empty: { margin: 0, color: "#64748b" },
  error: { color: "#991b1b" },
  secondaryButton: { minHeight: 44, padding: "9px 14px", border: "1px solid #64748b", borderRadius: 6, background: "#fff", color: "#243326", fontWeight: 800, cursor: "pointer" },
};
