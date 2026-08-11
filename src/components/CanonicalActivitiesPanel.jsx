import { useEffect, useState } from "react";
import { loadCanonicalActivitiesForWorkstream } from "../utils/operationalReadController.js";

function canonicalRecord(jobId) {
  return {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    lifecycleVerified: true,
    lifecycleContractVersion: 2,
    jobId,
  };
}

function activityErrorMessage(error) {
  if (error?.status === 401) return "Sign in is required to read Activities.";
  if (error?.status === 403) {
    return "Activity read authority is unavailable for this account.";
  }
  if (error?.status === 404) {
    return "Canonical Activities are unavailable for this Workstream.";
  }
  return error?.message || "Canonical Activities could not be loaded.";
}

function activityTypeLabel(value) {
  return value.replaceAll("_", " ").toLowerCase();
}

export default function CanonicalActivitiesPanel({ jobId, workstream, setPage }) {
  const workstreamId = workstream?.id || "";
  const [state, setState] = useState({
    status: "loading",
    activities: [],
    error: "",
  });

  useEffect(() => {
    let active = true;
    if (!jobId || !workstreamId) {
      Promise.resolve().then(() => {
        if (active) setState({ status: "unavailable", activities: [], error: "" });
      });
      return () => {
        active = false;
      };
    }

    Promise.resolve().then(() => {
      if (active) setState({ status: "loading", activities: [], error: "" });
    });
    void loadCanonicalActivitiesForWorkstream({
      record: canonicalRecord(jobId),
      workstream,
      setPage,
    })
      .then((activities) => {
        if (!active) return;
        setState({
          status: activities ? "ready" : "unavailable",
          activities: activities || [],
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          status: "error",
          activities: [],
          error: activityErrorMessage(error),
        });
      });

    return () => {
      active = false;
    };
  }, [jobId, setPage, workstream, workstreamId]);

  return (
    <section style={styles.section} aria-labelledby={`activities-${workstreamId}`}>
      <h5 id={`activities-${workstreamId}`} style={styles.title}>Activities</h5>
      {state.status === "loading" && (
        <p role="status" style={styles.message}>Loading canonical Activities.</p>
      )}
      {state.status === "error" && (
        <p role="alert" style={styles.error}>{state.error}</p>
      )}
      {state.status === "ready" && state.activities.length === 0 && (
        <p style={styles.message}>No activities recorded</p>
      )}
      {state.status === "ready" && state.activities.length > 0 && (
        <div style={styles.list}>
          {state.activities.map((activity) => (
            <article key={activity.id} style={styles.activity}>
              <div style={styles.header}>
                <strong style={styles.type}>
                  {activityTypeLabel(activity.activityType)}
                </strong>
                <span style={styles.status}>{activity.status}</span>
              </div>
              <p style={styles.statement}>{activity.statement}</p>
              {activity.temporaryIntervention && (
                <div style={styles.temporary}>
                  <strong>Temporary intervention</strong>
                  <p style={styles.temporaryText}>{activity.temporaryDetails}</p>
                  <span style={styles.temporaryBoundary}>
                    Temporary only. Permanent correction and Finding resolution remain separate.
                  </span>
                </div>
              )}
              <div style={styles.meta}>
                <span>Activity version {activity.currentVersion}</span>
                {activity.performedAt && (
                  <span>Performed {new Date(activity.performedAt).toLocaleString()}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const styles = {
  section: {
    display: "grid",
    gap: 10,
    minWidth: 0,
    paddingLeft: 12,
    borderLeft: "3px solid #1d4ed8",
  },
  title: { margin: 0, color: "#1e3a8a", fontSize: 15, letterSpacing: 0 },
  message: { margin: 0, color: "#64748b", lineHeight: 1.5 },
  error: {
    margin: 0,
    padding: "8px 10px",
    borderLeft: "3px solid #b91c1c",
    color: "#991b1b",
    background: "#fef2f2",
    lineHeight: 1.5,
  },
  list: { display: "grid", gap: 12 },
  activity: {
    display: "grid",
    gap: 7,
    minWidth: 0,
    paddingBottom: 12,
    borderBottom: "1px solid #e2e8f0",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  type: { color: "#1e3a8a", fontSize: 13, textTransform: "capitalize" },
  status: { color: "#334155", fontSize: 12, fontWeight: 800 },
  statement: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
  temporary: {
    display: "grid",
    gap: 5,
    padding: "9px 10px",
    borderLeft: "3px solid #b45309",
    color: "#7c2d12",
    background: "#fff7ed",
  },
  temporaryText: { margin: 0, lineHeight: 1.45, overflowWrap: "anywhere" },
  temporaryBoundary: { fontSize: 12, fontWeight: 800, lineHeight: 1.4 },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    color: "#64748b",
    fontSize: 12,
  },
};
