import { useCallback, useEffect, useState } from "react";
import { fetchCustomerEfr } from "../utils/customerEfrApi.js";
import { getEfrCopy } from "../utils/efrLanguage.js";

function stateLabel(value, copy) {
  const labels = {
    NEEDS_ATTENTION: copy.needsAttention,
    RESOLVED: copy.resolved,
    RECOMMENDED: copy.active,
    DEFERRED: copy.deferred,
    NOT_PROCEEDING: copy.declined,
  };
  return labels[value] || copy.unavailable;
}

export default function CustomerProjectAssessment({ jobId, language, setPage }) {
  const copy = getEfrCopy(language);
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState({
    status: "idle",
    assessment: null,
    error: "",
  });
  const retry = useCallback(() => setRefresh((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    if (!jobId) {
      queueMicrotask(() => {
        if (active) setState({ status: "idle", assessment: null, error: "" });
      });
      return () => { active = false; };
    }
    queueMicrotask(() => {
      if (active) setState({ status: "loading", assessment: null, error: "" });
    });
    void fetchCustomerEfr({ jobId, setPage })
      .then((assessment) => {
        if (active) setState({ status: "ready", assessment, error: "" });
      })
      .catch((error) => {
        if (active) {
          setState({
            status: "error",
            assessment: null,
            error: String(error?.code || "CUSTOMER_EFR_FAILED"),
          });
        }
      });
    return () => { active = false; };
  }, [jobId, refresh, setPage]);

  if (!jobId) return null;
  const assessment = state.assessment;
  const empty = assessment &&
    assessment.findings.length === 0 &&
    assessment.recommendations.length === 0;

  return (
    <section
      style={styles.section}
      aria-labelledby="customer-project-assessment-title"
      data-customer-efr-status={state.status}
      data-customer-efr-error={state.error}
    >
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>{copy.assessment}</span>
          <h2 id="customer-project-assessment-title" style={styles.title}>
            {copy.evaluation}
          </h2>
        </div>
        {assessment?.evaluation && (
          <span style={styles.status}>
            {assessment.evaluation.status === "COMPLETE" ? copy.completed : copy.draft}
          </span>
        )}
      </div>

      {state.status === "loading" && <p role="status">{copy.loadingAssessment}</p>}
      {state.status === "error" && (
        <div style={styles.error} role="alert">
          <p>{copy.assessmentUnavailable}</p>
          <button type="button" style={styles.secondaryButton} onClick={retry}>
            {copy.retry}
          </button>
        </div>
      )}
      {assessment?.evaluation && (
        <p style={styles.summary}>
          {assessment.evaluation.status === "COMPLETE"
            ? copy.evaluationComplete
            : copy.evaluationInProgress}
        </p>
      )}
      {state.status === "ready" && !assessment?.evaluation && empty && (
        <p style={styles.summary}>{copy.noSharedAssessment}</p>
      )}
      {assessment?.findings.length > 0 && (
        <div style={styles.group}>
          <h3 style={styles.groupTitle}>{copy.professionalFound}</h3>
          {assessment.findings.map((finding) => (
            <article key={finding.id} style={styles.item}>
              <span style={styles.itemState}>{stateLabel(finding.state, copy)}</span>
              <p style={styles.itemText}>{finding.statement}</p>
            </article>
          ))}
        </div>
      )}
      {assessment?.recommendations.length > 0 && (
        <div style={styles.group}>
          <h3 style={styles.groupTitle}>{copy.professionalRecommends}</h3>
          {assessment.recommendations.map((recommendation) => (
            <article key={recommendation.id} style={styles.item}>
              <span style={styles.itemState}>{stateLabel(recommendation.state, copy)}</span>
              <p style={styles.itemText}>{recommendation.statement}</p>
            </article>
          ))}
        </div>
      )}
      {state.status === "ready" && empty && assessment?.evaluation && (
        <p style={styles.summary}>{copy.noSharedAssessment}</p>
      )}
    </section>
  );
}

const styles = {
  section: {
    display: "grid",
    gap: 14,
    margin: "16px 0",
    padding: "18px 0",
    borderTop: "1px solid #cbd5e1",
    borderBottom: "1px solid #cbd5e1",
    minWidth: 0,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  eyebrow: { color: "#475569", fontSize: 12, fontWeight: 800 },
  title: { margin: "3px 0 0", fontSize: 22, letterSpacing: 0 },
  status: { color: "#166534", fontSize: 13, fontWeight: 800 },
  summary: { margin: 0, color: "#475569", lineHeight: 1.5 },
  group: { display: "grid", gap: 10 },
  groupTitle: { margin: 0, fontSize: 17, letterSpacing: 0 },
  item: {
    display: "grid",
    gap: 6,
    padding: 12,
    border: "1px solid #d7dee8",
    borderRadius: 8,
    background: "#ffffff",
    minWidth: 0,
  },
  itemState: { color: "#1f5132", fontSize: 12, fontWeight: 800 },
  itemText: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
  error: { display: "grid", gap: 10, color: "#991b1b" },
  secondaryButton: {
    minHeight: 44,
    justifySelf: "start",
    padding: "9px 14px",
    border: "1px solid #64748b",
    borderRadius: 6,
    background: "#ffffff",
    color: "#334155",
    fontWeight: 800,
    cursor: "pointer",
  },
};
