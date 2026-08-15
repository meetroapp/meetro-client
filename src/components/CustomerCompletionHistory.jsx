import { useEffect, useState } from "react";
import { fetchCustomerJobHistory } from "../utils/jobCompletionApi.js";
import { getJobCompletionCopy } from "../utils/jobCompletionLanguage.js";

function displayDate(value, language) {
  const locale = { en: "en-US", es: "es", fr: "fr", "pt-BR": "pt-BR" }[language] || "en-US";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function displayMoney(approvedQuote, language) {
  if (!approvedQuote) return "";
  const locale = { en: "en-US", es: "es", fr: "fr", "pt-BR": "pt-BR" }[language] || "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: approvedQuote.currency }).format(approvedQuote.totalMinor / 100);
}

export default function CustomerCompletionHistory({
  jobId,
  language = "en",
  setPage,
  onMessageProfessional,
}) {
  const copy = getJobCompletionCopy(language);
  const [state, setState] = useState({ status: "loading", history: null, error: "" });

  useEffect(() => {
    let active = true;
    if (!jobId) {
      queueMicrotask(() => {
        if (active) setState({ status: "idle", history: null, error: "" });
      });
      return () => { active = false; };
    }
    queueMicrotask(() => {
      if (active) setState({ status: "loading", history: null, error: "" });
    });
    void fetchCustomerJobHistory({ jobId, setPage })
      .then((history) => {
        if (active) setState({ status: "ready", history, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        if (error?.status === 404 && error?.code === "JOB_HISTORY_UNAVAILABLE") {
          setState({ status: "unavailable", history: null, error: "" });
          return;
        }
        setState({ status: "error", history: null, error: String(error?.code || "JOB_HISTORY_FAILED") });
      });
    return () => { active = false; };
  }, [jobId, setPage]);

  if (!jobId || state.status === "idle" || state.status === "unavailable" || state.status === "loading") return null;
  if (state.status === "error") {
    return <p role="alert" style={styles.error} data-customer-job-history-error={state.error}>{copy.historyUnavailable}</p>;
  }

  const history = state.history;
  if (!history) return null;
  return (
    <section style={styles.section} aria-labelledby="customer-job-history-title" data-customer-job-history-job-id={history.jobId}>
      <header style={styles.header}>
        <div>
          <span style={styles.eyebrow}>{copy.history}</span>
          <h2 id="customer-job-history-title" style={styles.title}>{copy.workCompleted}</h2>
          <p style={styles.purpose}>{copy.customerCompletionBody}</p>
        </div>
        <strong style={styles.status}>{copy.completedOn} {displayDate(history.completedAt, language)}</strong>
      </header>
      <div style={styles.metrics}>
        <span><strong>{history.completionSummary.workstreamCount}</strong> {copy.work}</span>
        <span><strong>{history.completionSummary.workItemCount}</strong> {copy.completed}</span>
        <span><strong>{history.completionSummary.customerUpdateCount}</strong> {copy.customerUpdates}</span>
      </div>
      {history.approvedQuote && <p><strong>{copy.approvedAmount}:</strong> {displayMoney(history.approvedQuote, language)}</p>}
      {history.originalRequest && (
        <div>
          <h3 style={styles.subheading}>{copy.originalRequest}</h3>
          <p style={styles.body}>{history.originalRequest.concern}</p>
        </div>
      )}
      <div style={styles.record}>
        <strong>{copy.preservedRecord}</strong>
        <p style={styles.body}>{copy.preservedRecordBody}</p>
      </div>
      {history.actions.canMessageProfessional && onMessageProfessional && (
        <button type="button" style={styles.primaryButton} onClick={onMessageProfessional}>
          {copy.messageProfessional}
        </button>
      )}
    </section>
  );
}

const styles = {
  section: { display: "grid", gap: 16, margin: "16px 0", padding: "18px 0", borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  eyebrow: { color: "#475569", fontSize: 12, fontWeight: 800 },
  title: { margin: "3px 0 0", fontSize: 22, letterSpacing: 0 },
  subheading: { margin: 0, fontSize: 17, letterSpacing: 0 },
  purpose: { margin: "6px 0 0", color: "#475569", lineHeight: 1.5 },
  status: { color: "#1f5132", fontSize: 13 },
  metrics: { display: "flex", gap: 16, flexWrap: "wrap", padding: "14px 0", borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" },
  record: { display: "grid", gap: 6, paddingLeft: 12, borderLeft: "3px solid #1f5132" },
  body: { margin: 0, lineHeight: 1.55, overflowWrap: "anywhere" },
  primaryButton: { minHeight: 44, width: "fit-content", padding: "10px 16px", border: "1px solid #1f5132", borderRadius: 6, background: "#1f5132", color: "#fff", fontWeight: 800, cursor: "pointer" },
  error: { margin: "16px 0", color: "#991b1b" },
};
