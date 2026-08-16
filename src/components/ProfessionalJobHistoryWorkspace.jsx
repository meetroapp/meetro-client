import { useEffect, useState } from "react";
import CanonicalInvoiceDetail from "./CanonicalInvoiceDetail.jsx";
import { fetchProfessionalJobHistoryDetail } from "../utils/jobCompletionApi.js";
import { fetchProfessionalJobInvoice } from "../utils/invoicePaymentApi.js";
import { getJobCompletionCopy } from "../utils/jobCompletionLanguage.js";
import { getInvoiceCopy } from "../utils/invoicePaymentLanguage.js";

function displayDate(value, language) {
  const locale = { en: "en-US", es: "es", fr: "fr", "pt-BR": "pt-BR" }[language] || "en-US";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function displayMoney(approvedQuote, language) {
  if (!approvedQuote) return "";
  const locale = { en: "en-US", es: "es", fr: "fr", "pt-BR": "pt-BR" }[language] || "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: approvedQuote.currency }).format(approvedQuote.totalMinor / 100);
}

export default function ProfessionalJobHistoryWorkspace({
  sourceState,
  language = "en",
  setPage,
  onRetry,
  onLoadMore,
}) {
  const copy = getJobCompletionCopy(language);
  const invoiceCopy = getInvoiceCopy(language);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [detailState, setDetailState] = useState({ status: "idle", detail: null, invoice: null, error: "" });

  useEffect(() => {
    let active = true;
    if (!selectedJobId) {
      queueMicrotask(() => {
        if (active) setDetailState({ status: "idle", detail: null, invoice: null, error: "" });
      });
      return () => { active = false; };
    }
    queueMicrotask(() => {
      if (active) setDetailState({ status: "loading", detail: null, invoice: null, error: "" });
    });
    void Promise.all([
      fetchProfessionalJobHistoryDetail({ jobId: selectedJobId, setPage }),
      fetchProfessionalJobInvoice({ jobId: selectedJobId, setPage })
        .catch((error) => error?.code === "INVOICE_UNAVAILABLE" ? null : Promise.reject(error)),
    ])
      .then(([detail, invoice]) => {
        if (active) setDetailState({ status: "ready", detail, invoice, error: "" });
      })
      .catch((error) => {
        if (active) setDetailState({ status: "error", detail: null, invoice: null, error: String(error?.code || "JOB_HISTORY_FAILED") });
      });
    return () => { active = false; };
  }, [selectedJobId, setPage]);

  if (selectedJobId) {
    const detail = detailState.detail;
    return (
      <section style={styles.section} data-professional-job-history-detail={selectedJobId}>
        <button type="button" style={styles.secondaryButton} onClick={() => setSelectedJobId("")}>
          {copy.backToHistory}
        </button>
        {detailState.status === "loading" && <p role="status">{copy.loading}</p>}
        {detailState.status === "error" && <p role="alert" style={styles.error}>{copy.historyUnavailable}</p>}
        {detail && (
          <>
            <header style={styles.header}>
              <div>
                <span style={styles.eyebrow}>{copy.workCompleted}</span>
                <h2 style={styles.title}>{detail.serviceTitle}</h2>
                <p style={styles.purpose}>{detail.customerName} · {copy.completedOn} {displayDate(detail.completedAt, language)}</p>
              </div>
              <strong style={styles.status}>{detailState.invoice
                ? invoiceCopy[detailState.invoice.status === "PAID"
                  ? "paid"
                  : detailState.invoice.status === "DRAFT"
                    ? "drafts"
                    : detailState.invoice.status === "PARTIALLY_PAID"
                      ? "outstanding"
                      : "waiting"]
                : copy.readyToInvoice}</strong>
            </header>
            <div style={styles.metrics}>
              <span><strong>{detail.completionSummary.workstreamCount}</strong> {copy.work}</span>
              <span><strong>{detail.completionSummary.workItemCount}</strong> {copy.completed}</span>
              <span><strong>{detail.completionSummary.customerUpdateCount}</strong> {copy.customerUpdates}</span>
            </div>
            {detail.approvedQuote && <p><strong>{copy.approvedAmount}:</strong> {displayMoney(detail.approvedQuote, language)}</p>}
            {detail.originalRequest && (
              <div>
                <h3 style={styles.subheading}>{copy.originalRequest}</h3>
                <p style={styles.body}>{detail.originalRequest.concern}</p>
              </div>
            )}
            <div style={styles.record}>
              <strong>{copy.preservedRecord}</strong>
              <p style={styles.body}>{copy.preservedRecordBody}</p>
            </div>
            {detailState.invoice && (
              <section style={styles.financialRecord} aria-label={invoiceCopy.invoice}>
                <CanonicalInvoiceDetail invoice={detailState.invoice} language={language} />
              </section>
            )}
          </>
        )}
      </section>
    );
  }

  const history = sourceState?.history;
  return (
    <section style={styles.section} aria-labelledby="professional-job-history-title" data-professional-job-history-status={sourceState?.status || "loading"}>
      <header style={styles.header}>
        <div>
          <h2 id="professional-job-history-title" style={styles.title}>{copy.history}</h2>
          <p style={styles.purpose}>{copy.historyPurpose}</p>
        </div>
        {history && <strong style={styles.status}>{history.totalCount} {copy.completedJobs}</strong>}
      </header>
      {sourceState?.status === "loading" && <p role="status">{copy.loading}</p>}
      {sourceState?.status === "error" && (
        <div role="alert" style={styles.error}>
          <p>{copy.historyUnavailable}</p>
          <button type="button" style={styles.secondaryButton} onClick={onRetry}>{copy.retry}</button>
        </div>
      )}
      {sourceState?.status === "ready" && history?.jobs.length === 0 && <p style={styles.empty}>{copy.noHistory}</p>}
      <div style={styles.list}>
        {history?.jobs.map((job) => (
          <button key={job.jobId} type="button" style={styles.row} onClick={() => setSelectedJobId(job.jobId)}>
            <span style={styles.rowMain}>
              <strong style={styles.rowTitle}>{job.customerName}</strong>
              <span>{job.serviceTitle}</span>
              <span style={styles.meta}>{copy.completedOn} {displayDate(job.completedAt, language)}</span>
            </span>
            <span style={styles.rowAside}>
              {job.approvedQuote && <strong>{displayMoney(job.approvedQuote, language)}</strong>}
              <span>{copy.viewJob}</span>
            </span>
          </button>
        ))}
      </div>
      {history?.pagination.nextCursor && (
        <button
          type="button"
          style={styles.secondaryButton}
          disabled={sourceState?.loadingMore}
          onClick={onLoadMore}
        >
          {sourceState?.loadingMore ? copy.loading : copy.loadMore}
        </button>
      )}
    </section>
  );
}

const styles = {
  section: { display: "grid", gap: 16, minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  eyebrow: { color: "#475569", fontSize: 12, fontWeight: 800 },
  title: { margin: 0, fontSize: 24, letterSpacing: 0 },
  subheading: { margin: 0, fontSize: 17, letterSpacing: 0 },
  purpose: { margin: "6px 0 0", color: "#475569", lineHeight: 1.5 },
  status: { color: "#1f5132", fontSize: 13 },
  list: { display: "grid", gap: 0, borderTop: "1px solid #cbd5e1" },
  row: { minHeight: 72, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "14px 0", border: 0, borderBottom: "1px solid #cbd5e1", background: "transparent", color: "#172317", textAlign: "left", cursor: "pointer" },
  rowMain: { display: "grid", gap: 4, minWidth: 0 },
  rowTitle: { overflowWrap: "anywhere" },
  rowAside: { display: "grid", gap: 4, flexShrink: 0, textAlign: "right", color: "#1f5132" },
  meta: { color: "#64748b", fontSize: 13 },
  metrics: { display: "flex", gap: 16, flexWrap: "wrap", padding: "14px 0", borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" },
  record: { display: "grid", gap: 6, paddingLeft: 12, borderLeft: "3px solid #1f5132" },
  financialRecord: { minWidth: 0 },
  body: { margin: 0, lineHeight: 1.55, overflowWrap: "anywhere" },
  empty: { margin: 0, color: "#64748b" },
  error: { color: "#991b1b" },
  secondaryButton: { minHeight: 44, width: "fit-content", padding: "9px 14px", border: "1px solid #64748b", borderRadius: 6, background: "#fff", color: "#243326", fontWeight: 800, cursor: "pointer" },
};
