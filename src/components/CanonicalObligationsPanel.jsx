import { useEffect, useState } from "react";
import { loadCanonicalObligationsForWorkstream } from "../utils/operationalReadController.js";

function canonicalRecord(jobId) {
  return {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    lifecycleVerified: true,
    lifecycleContractVersion: 2,
    jobId,
  };
}

function obligationErrorMessage(error) {
  if (error?.status === 401) return "Sign in is required to read Obligations.";
  if (error?.status === 403) {
    return "Obligation read authority is unavailable for this account.";
  }
  if (error?.status === 404) {
    return "Canonical Obligations are unavailable for this Workstream.";
  }
  return error?.message || "Canonical Obligations could not be loaded.";
}

export default function CanonicalObligationsPanel({ jobId, workstream, setPage }) {
  const workstreamId = workstream?.id || "";
  const [state, setState] = useState({
    status: "loading",
    obligations: [],
    error: "",
  });

  useEffect(() => {
    let active = true;
    if (!jobId || !workstreamId) {
      Promise.resolve().then(() => {
        if (active) setState({ status: "unavailable", obligations: [], error: "" });
      });
      return () => {
        active = false;
      };
    }

    Promise.resolve().then(() => {
      if (active) setState({ status: "loading", obligations: [], error: "" });
    });
    void loadCanonicalObligationsForWorkstream({
      record: canonicalRecord(jobId),
      workstream,
      setPage,
    })
      .then((obligations) => {
        if (!active) return;
        setState({
          status: obligations ? "ready" : "unavailable",
          obligations: obligations || [],
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          status: "error",
          obligations: [],
          error: obligationErrorMessage(error),
        });
      });

    return () => {
      active = false;
    };
  }, [jobId, setPage, workstream, workstreamId]);

  return (
    <section style={styles.section} aria-labelledby={`obligations-${workstreamId}`}>
      <h5 id={`obligations-${workstreamId}`} style={styles.title}>Obligations</h5>
      {state.status === "loading" && (
        <p role="status" style={styles.message}>Loading canonical Obligations.</p>
      )}
      {state.status === "error" && (
        <p role="alert" style={styles.error}>{state.error}</p>
      )}
      {state.status === "ready" && state.obligations.length === 0 && (
        <p style={styles.message}>No obligations recorded</p>
      )}
      {state.status === "ready" && state.obligations.length > 0 && (
        <div style={styles.list}>
          {state.obligations.map((obligation) => (
            <article key={obligation.id} style={styles.obligation}>
              <div style={styles.header}>
                <strong style={styles.label}>Obligation {obligation.sequence}</strong>
                <span style={styles.status}>{obligation.status}</span>
              </div>
              <p style={styles.statement}>{obligation.statement}</p>
              {obligation.sourceFindingId && (
                <span style={styles.findingReference}>
                  Source Finding reference: {obligation.sourceFindingId}
                </span>
              )}
              <div style={styles.meta}>
                <span>Obligation version {obligation.currentVersion}</span>
                <strong style={styles.commercialBoundary}>
                  Lifecycle status only. Not payment status.
                </strong>
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
    borderLeft: "3px solid #0f766e",
  },
  title: { margin: 0, color: "#115e59", fontSize: 15, letterSpacing: 0 },
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
  obligation: {
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
  label: { color: "#115e59", fontSize: 13 },
  status: { color: "#334155", fontSize: 12, fontWeight: 800 },
  statement: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
  findingReference: {
    color: "#475569",
    fontSize: 12,
    overflowWrap: "anywhere",
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    color: "#64748b",
    fontSize: 12,
  },
  commercialBoundary: { color: "#7c2d12" },
};
