import { useEffect, useState } from "react";
import { loadCanonicalWorkstreamCompletionEligibility } from "../utils/operationalReadController.js";
import CanonicalActivitiesPanel from "./CanonicalActivitiesPanel.jsx";
import CanonicalObligationsPanel from "./CanonicalObligationsPanel.jsx";

const REASON_LABELS = Object.freeze({
  INELIGIBLE_WORKSTREAM_STATE: "Workstream state is not eligible",
  OPEN_FINDING: "Open Finding",
  PARTIAL_FINDING: "Partially resolved Finding",
  OPEN_OBLIGATION: "Open obligation",
  ACTIVE_ACTIVITY: "Planned or in-progress Activity",
});

function canonicalRecord(jobId) {
  return {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    lifecycleVerified: true,
    lifecycleContractVersion: 2,
    jobId,
  };
}

function eligibilityErrorMessage(error) {
  if (error?.status === 401) return "Sign in is required to read eligibility.";
  if (error?.status === 403) {
    return "Completion eligibility read authority is unavailable for this account.";
  }
  if (error?.status === 404) {
    return "Completion eligibility is unavailable for this Workstream.";
  }
  return error?.message || "Completion eligibility could not be loaded.";
}

function CompletionEligibility({ jobId, workstream, setPage }) {
  const [state, setState] = useState({
    status: "loading",
    eligibility: null,
    error: "",
  });

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setState({ status: "loading", eligibility: null, error: "" });
    });
    void loadCanonicalWorkstreamCompletionEligibility({
      record: canonicalRecord(jobId),
      workstream,
      setPage,
    })
      .then((eligibility) => {
        if (!active) return;
        setState({
          status: eligibility ? "ready" : "unavailable",
          eligibility,
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          status: "error",
          eligibility: null,
          error: eligibilityErrorMessage(error),
        });
      });
    return () => {
      active = false;
    };
  }, [jobId, setPage, workstream]);

  if (state.status === "loading") {
    return <p role="status" style={styles.message}>Loading completion eligibility.</p>;
  }
  if (state.status === "error") {
    return <p role="alert" style={styles.error}>{state.error}</p>;
  }
  if (!state.eligibility) return null;

  const { eligibility } = state;
  return (
    <div style={styles.eligibility} aria-label="Server-derived completion eligibility">
      <div style={styles.eligibilityHeader}>
        <strong>Completion eligibility</strong>
        <span style={eligibility.eligible ? styles.eligible : styles.notEligible}>
          {eligibility.eligible ? "Eligible" : "Not eligible"}
        </span>
      </div>
      {eligibility.reasons.length > 0 && (
        <ul style={styles.reasonList}>
          {eligibility.reasons.map((reason) => (
            <li key={reason}>{REASON_LABELS[reason]}</li>
          ))}
        </ul>
      )}
      {(eligibility.deferredScope.findings > 0 ||
        eligibility.deferredScope.obligations > 0) && (
        <span style={styles.deferredScope}>
          Deferred scope: {eligibility.deferredScope.findings} Finding(s),{" "}
          {eligibility.deferredScope.obligations} obligation(s)
        </span>
      )}
    </div>
  );
}

export default function CanonicalWorkstreamCard({ jobId, workstream, setPage }) {
  return (
    <article style={styles.workstream}>
      <div style={styles.header}>
        <div style={styles.headingGroup}>
          <span style={styles.sequence}>Work Item {workstream.sequence}</span>
          <h4 style={styles.title}>{workstream.title}</h4>
        </div>
        <span style={styles.state}>{workstream.state}</span>
      </div>
      <span style={styles.version}>Plan version {workstream.currentVersion}</span>
      <CompletionEligibility jobId={jobId} workstream={workstream} setPage={setPage} />
      <div style={styles.detailGrid}>
        <CanonicalActivitiesPanel
          jobId={jobId}
          workstream={workstream}
          setPage={setPage}
        />
        <CanonicalObligationsPanel
          jobId={jobId}
          workstream={workstream}
          setPage={setPage}
        />
      </div>
    </article>
  );
}

const styles = {
  workstream: {
    display: "grid",
    gap: 12,
    minWidth: 0,
    padding: "18px 0",
    borderBottom: "1px solid #cbd5e1",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headingGroup: { display: "grid", gap: 4, minWidth: 0 },
  sequence: { color: "#64748b", fontSize: 12, fontWeight: 800 },
  title: { margin: 0, fontSize: 17, letterSpacing: 0, overflowWrap: "anywhere" },
  state: { color: "#1f5132", fontSize: 12, fontWeight: 800 },
  version: { color: "#64748b", fontSize: 12 },
  message: { margin: 0, color: "#64748b", lineHeight: 1.5 },
  error: {
    margin: 0,
    padding: "8px 10px",
    borderLeft: "3px solid #b91c1c",
    color: "#991b1b",
    background: "#fef2f2",
    lineHeight: 1.5,
  },
  eligibility: {
    display: "grid",
    gap: 8,
    padding: "10px 0",
    borderTop: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0",
  },
  eligibilityHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  eligible: { color: "#166534", fontSize: 12, fontWeight: 800 },
  notEligible: { color: "#991b1b", fontSize: 12, fontWeight: 800 },
  reasonList: { margin: 0, paddingLeft: 20, color: "#475569", lineHeight: 1.5 },
  deferredScope: { color: "#64748b", fontSize: 12 },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
    gap: 18,
    minWidth: 0,
  },
};
