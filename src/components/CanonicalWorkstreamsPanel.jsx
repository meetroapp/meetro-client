import { useEffect, useState } from "react";
import { getCanonicalOperationalJobContext } from "../utils/canonicalOperationalRead.js";
import { loadCanonicalWorkstreamsForRecord } from "../utils/operationalReadController.js";
import { isCanonicalWorkCenterHydrationEnabled } from "../utils/workCenterCanonicalHydration.js";
import CanonicalWorkstreamCard from "./CanonicalWorkstreamCard.jsx";

function workstreamErrorMessage(error) {
  if (error?.status === 401) return "Sign in is required to read Workstreams.";
  if (error?.status === 403) {
    return "Workstream read authority is unavailable for this account.";
  }
  if (error?.status === 404) {
    return "Canonical Workstreams are unavailable for this Job.";
  }
  return error?.message || "Canonical Workstreams could not be loaded.";
}

function canonicalRecord(jobId) {
  return {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    lifecycleVerified: true,
    lifecycleContractVersion: 2,
    jobId,
  };
}

export default function CanonicalWorkstreamsPanel({ record = {}, setPage }) {
  const environmentEnabled = isCanonicalWorkCenterHydrationEnabled();
  const context = getCanonicalOperationalJobContext(record);
  const jobId = context?.jobId || "";
  const [state, setState] = useState({
    status: "loading",
    workstreams: [],
    error: "",
  });

  useEffect(() => {
    let active = true;
    if (!environmentEnabled || !jobId) {
      Promise.resolve().then(() => {
        if (active) setState({ status: "unavailable", workstreams: [], error: "" });
      });
      return () => {
        active = false;
      };
    }

    Promise.resolve().then(() => {
      if (active) setState({ status: "loading", workstreams: [], error: "" });
    });
    void loadCanonicalWorkstreamsForRecord({
      record: canonicalRecord(jobId),
      setPage,
    })
      .then((workstreams) => {
        if (!active) return;
        setState({
          status: workstreams ? "ready" : "unavailable",
          workstreams: workstreams || [],
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          status: "error",
          workstreams: [],
          error: workstreamErrorMessage(error),
        });
      });

    return () => {
      active = false;
    };
  }, [environmentEnabled, jobId, setPage]);

  if (!environmentEnabled || !jobId) return null;

  return (
    <section style={styles.section} aria-labelledby="canonical-workstreams-title">
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Canonical read-only lifecycle truth</span>
          <h3 id="canonical-workstreams-title" style={styles.title}>Workstreams</h3>
        </div>
        <span style={styles.readOnly}>Read-only</span>
      </div>
      {state.status === "loading" && (
        <p role="status" style={styles.message}>Loading canonical Workstreams.</p>
      )}
      {state.status === "error" && (
        <p role="alert" style={styles.error}>{state.error}</p>
      )}
      {state.status === "ready" && state.workstreams.length === 0 && (
        <p style={styles.message}>No workstreams recorded</p>
      )}
      {state.status === "ready" && state.workstreams.length > 0 && (
        <div style={styles.list}>
          {state.workstreams.map((workstream) => (
            <CanonicalWorkstreamCard
              key={workstream.id}
              jobId={jobId}
              workstream={workstream}
              setPage={setPage}
            />
          ))}
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
    padding: "16px 0",
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
  message: { margin: 0, color: "#64748b", lineHeight: 1.5 },
  error: {
    margin: 0,
    padding: 10,
    borderLeft: "3px solid #b91c1c",
    color: "#991b1b",
    background: "#fef2f2",
    lineHeight: 1.5,
  },
  list: { display: "grid", gap: 0, minWidth: 0 },
};
