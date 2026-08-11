import { useEffect, useState } from "react";
import {
  buildCanonicalQuoteLineage,
  getCanonicalQuoteJobContext,
} from "../utils/canonicalQuoteRead.js";
import { loadCanonicalQuotesForRecord } from "../utils/quoteReadController.js";
import { isCanonicalWorkCenterHydrationEnabled } from "../utils/workCenterCanonicalHydration.js";
import CanonicalQuoteCard from "./CanonicalQuoteCard.jsx";

function canonicalRecord(jobId) {
  return {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    lifecycleVerified: true,
    lifecycleContractVersion: 2,
    jobId,
  };
}

function quoteErrorMessage(error) {
  if (error?.status === 401) return "Sign in is required to read Quotes.";
  if (error?.status === 403) {
    return "Quote read authority is unavailable for this account.";
  }
  if (error?.status === 404) {
    return "Canonical Quotes are unavailable for this Job.";
  }
  return error?.message || "Canonical Quotes could not be loaded.";
}

export default function CanonicalQuotesPanel({ record = {}, setPage }) {
  const environmentEnabled = isCanonicalWorkCenterHydrationEnabled();
  const context = getCanonicalQuoteJobContext(record);
  const jobId = context?.jobId || "";
  const [state, setState] = useState({
    status: "loading",
    quotes: [],
    error: "",
  });

  useEffect(() => {
    let active = true;
    if (!environmentEnabled || !jobId) {
      Promise.resolve().then(() => {
        if (active) setState({ status: "unavailable", quotes: [], error: "" });
      });
      return () => {
        active = false;
      };
    }

    Promise.resolve().then(() => {
      if (active) setState({ status: "loading", quotes: [], error: "" });
    });
    void loadCanonicalQuotesForRecord({
      record: canonicalRecord(jobId),
      setPage,
    })
      .then((quotes) => {
        if (!active) return;
        setState({
          status: quotes ? "ready" : "unavailable",
          quotes: quotes || [],
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setState({ status: "error", quotes: [], error: quoteErrorMessage(error) });
      });

    return () => {
      active = false;
    };
  }, [environmentEnabled, jobId, setPage]);

  if (!environmentEnabled || !jobId) return null;
  const lineage = buildCanonicalQuoteLineage(state.quotes);

  return (
    <section style={styles.section} aria-labelledby="canonical-quotes-title">
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Canonical commercial read truth</span>
          <h3 id="canonical-quotes-title" style={styles.title}>Quotes</h3>
        </div>
        <span style={styles.readOnly}>Read-only</span>
      </div>
      {state.status === "loading" && (
        <p role="status" style={styles.message}>Loading canonical Quotes.</p>
      )}
      {state.status === "error" && (
        <p role="alert" style={styles.error}>{state.error}</p>
      )}
      {state.status === "ready" && state.quotes.length === 0 && (
        <p style={styles.message}>No canonical quote issued yet</p>
      )}
      {state.status === "ready" && lineage.length > 0 && (
        <div style={styles.list}>
          {lineage.map(({ quote, depth }) => (
            <CanonicalQuoteCard
              key={quote.id}
              jobId={jobId}
              quote={quote}
              depth={depth}
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
