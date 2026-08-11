import { useEffect, useState } from "react";
import { loadCanonicalFindingsForEvaluation } from "../utils/findingRecommendationReadController.js";
import CanonicalRecommendationsPanel from "./CanonicalRecommendationsPanel.jsx";

function findingErrorMessage(error) {
  if (error?.status === 401) return "Sign in is required to read Findings.";
  if (error?.status === 403) {
    return "Finding read authority is unavailable for this account.";
  }
  if (error?.status === 404) {
    return "Canonical Findings are unavailable for this Evaluation.";
  }
  return error?.message || "Canonical Findings could not be loaded.";
}

function FindingEvidence({ finding }) {
  if (
    finding.concernLinks.length === 0 &&
    finding.evidenceReferences.length === 0
  ) {
    return null;
  }
  return (
    <div style={styles.evidence} aria-label="Finding provenance evidence">
      {finding.concernLinks.map((link) => (
        <span key={link.id} style={styles.evidenceItem}>
          Concern relationship: {link.relationshipType}
        </span>
      ))}
      {finding.evidenceReferences.map((reference) => (
        <span key={reference.id} style={styles.evidenceItem}>
          Evidence: {reference.evidenceType} · {reference.referenceNamespace}
        </span>
      ))}
    </div>
  );
}

export default function CanonicalFindingsPanel({
  enabled = false,
  evaluation,
  setPage,
}) {
  const evaluationId = evaluation?.evaluation?.id || "";
  const [state, setState] = useState({
    status: "loading",
    findings: [],
    error: "",
  });

  useEffect(() => {
    let active = true;
    if (!enabled || !evaluationId) {
      Promise.resolve().then(() => {
        if (!active) return;
        setState({ status: "unavailable", findings: [], error: "" });
      });
      return () => {
        active = false;
      };
    }

    Promise.resolve().then(() => {
      if (!active) return;
      setState({ status: "loading", findings: [], error: "" });
    });
    void loadCanonicalFindingsForEvaluation({ evaluation, setPage })
      .then((findings) => {
        if (!active) return;
        if (!findings) {
          setState({ status: "unavailable", findings: [], error: "" });
          return;
        }
        setState({ status: "ready", findings, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          status: "error",
          findings: [],
          error: findingErrorMessage(error),
        });
      });

    return () => {
      active = false;
    };
  }, [enabled, evaluation, evaluationId, setPage]);

  if (!enabled || !evaluationId) return null;

  return (
    <section style={styles.section} aria-labelledby="canonical-findings-title">
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Canonical read-only lifecycle truth</span>
          <h3 id="canonical-findings-title" style={styles.title}>
            Findings
          </h3>
        </div>
        <span style={styles.readOnly}>Read-only</span>
      </div>
      {state.status === "loading" && (
        <p role="status" style={styles.message}>Loading canonical Findings.</p>
      )}
      {state.status === "error" && (
        <p role="alert" style={styles.error}>{state.error}</p>
      )}
      {state.status === "ready" && state.findings.length === 0 && (
        <p style={styles.message}>No findings recorded</p>
      )}
      {state.status === "ready" && state.findings.length > 0 && (
        <div style={styles.findingsList}>
          {state.findings.map((finding, index) => (
            <article key={finding.id} style={styles.finding}>
              <div style={styles.findingHeader}>
                <h4 style={styles.findingTitle}>Finding {index + 1}</h4>
                <div style={styles.stateRow}>
                  <span style={styles.confirmation}>
                    Status: {finding.confirmationState}
                  </span>
                  <span style={styles.resolution}>
                    Resolution: {finding.resolutionState}
                  </span>
                </div>
              </div>
              <p style={styles.statement}>{finding.statement}</p>
              <div style={styles.versionRow}>
                <span>Finding version {finding.currentVersion}</span>
                <span>Evaluation version {finding.evaluationVersion}</span>
              </div>
              <FindingEvidence finding={finding} />
              <CanonicalRecommendationsPanel finding={finding} setPage={setPage} />
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
    gap: 16,
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
  findingsList: { display: "grid", gap: 18 },
  finding: {
    display: "grid",
    gap: 10,
    minWidth: 0,
    paddingBottom: 18,
    borderBottom: "1px solid #e2e8f0",
  },
  findingHeader: { display: "grid", gap: 7 },
  findingTitle: { margin: 0, fontSize: 16, letterSpacing: 0 },
  stateRow: { display: "flex", flexWrap: "wrap", gap: 10 },
  confirmation: { color: "#1f5132", fontSize: 12, fontWeight: 800 },
  resolution: { color: "#7c2d12", fontSize: 12, fontWeight: 800 },
  statement: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
  versionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    color: "#64748b",
    fontSize: 12,
  },
  evidence: {
    display: "grid",
    gap: 4,
    padding: "8px 0",
    borderTop: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0",
  },
  evidenceItem: { color: "#475569", fontSize: 12, overflowWrap: "anywhere" },
};
