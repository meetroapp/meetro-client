import { useEffect, useState } from "react";
import { fetchNativeCustomerJobHistory } from "../utils/jobCompletionApi.js";

const locale = { en: "en-US", es: "es", fr: "fr", "pt-BR": "pt-BR" };
const section = { display: "grid", gap: 14, minWidth: 0, width: "100%" };
const card = { minWidth: 0, padding: 16, border: "1px solid #dce5d8", borderRadius: 8, background: "#fff", overflowWrap: "anywhere" };
const button = { minHeight: 44, padding: "9px 14px", border: "1px solid #64748b", borderRadius: 6, background: "#fff", color: "#243326", fontWeight: 700, cursor: "pointer", textAlign: "left" };

function date(value, language) {
  return new Intl.DateTimeFormat(locale[language] || locale.en, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function amount(value, language) {
  if (!value) return "";
  return new Intl.NumberFormat(locale[language] || locale.en, { style: "currency", currency: value.currency }).format(value.totalMinor / 100);
}

export default function NativeCustomerHistoryWorkspace({ subject, sourceState, language, copy, setPage, onRetry, onLoadMore }) {
  const [selectedJobId, setSelectedJobId] = useState("");
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [detailState, setDetailState] = useState({ status: "idle", detail: null });

  useEffect(() => {
    let active = true;
    if (!selectedJobId) return () => { active = false; };
    queueMicrotask(() => { if (active) setDetailState({ status: "loading", detail: null }); });
    void fetchNativeCustomerJobHistory({
      contractorProfileId: subject.contractorProfileId,
      homeownerUserId: subject.homeownerUserId,
      jobId: selectedJobId,
      setPage,
    }).then(detail => {
      if (active) setDetailState({ status: "ready", detail });
    }).catch(() => {
      if (active) setDetailState({ status: "error", detail: null });
    });
    return () => { active = false; };
  }, [subject.contractorProfileId, subject.homeownerUserId, selectedJobId, detailRefreshKey, setPage]);

  if (selectedJobId) {
    const job = detailState.detail?.job;
    return <section style={section} aria-label={copy.nativeJobDetail}>
      <button type="button" style={button} onClick={() => setSelectedJobId("")}>{copy.backToNativeHistory}</button>
      {detailState.status === "loading" && <p role="status">{copy.loading}</p>}
      {detailState.status === "error" && <div role="alert" style={card}>
        <p>{copy.nativeHistoryUnavailable}</p>
        <button type="button" style={button} onClick={() => setDetailRefreshKey(value => value + 1)}>{copy.retry}</button>
      </div>}
      {job && <article style={card} data-native-job-history={job.jobId}>
        <p>{copy.nativeSourceLabel} · {job.sourceType === "emergency_request" ? copy.emergencySource : copy.ordinarySource}</p>
        <h4>{job.serviceTitle}</h4>
        <p>{copy.completed} {date(job.completedAt, language)}</p>
        {job.approvedQuote && <p>{copy.approvedQuote}: {amount(job.approvedQuote, language)}</p>}
        <p>{copy.completedWork}: {job.completionSummary.workstreamCount}</p>
      </article>}
    </section>;
  }

  const history = sourceState.history;
  return <section style={section} aria-label={copy.nativeHistory} data-native-customer-history-status={sourceState.status}>
    <h4>{copy.nativeHistory}</h4>
    {sourceState.status === "loading" && <p role="status">{copy.loading}</p>}
    {sourceState.status === "error" && <div role="alert" style={card}>
      <p>{copy.nativeHistoryUnavailable}</p>
      <button type="button" style={button} onClick={onRetry}>{copy.retry}</button>
    </div>}
    {sourceState.status === "ready" && history?.jobs.length === 0 && <p role="status">{copy.noNativeCompletedWork}</p>}
    {history?.jobs.map(job => <button key={job.jobId} type="button" style={button}
      onClick={() => setSelectedJobId(job.jobId)} aria-label={`${copy.openNativeJob}: ${job.serviceTitle}`}>
      <strong>{job.serviceTitle}</strong><br />
      <span>{job.sourceType === "emergency_request" ? copy.emergencySource : copy.ordinarySource}</span>
      <span> · {date(job.completedAt, language)}</span>
      {job.approvedQuote && <span> · {amount(job.approvedQuote, language)}</span>}
    </button>)}
    {sourceState.status === "ready" && sourceState.pageError && <div role="alert" style={card}>
      <p>{copy.nativeHistoryUnavailable}</p>
      <button type="button" style={button} onClick={onLoadMore} disabled={sourceState.loadingMore}>{copy.retry}</button>
    </div>}
    {sourceState.status === "ready" && history?.pagination.nextCursor && !sourceState.pageError &&
      <button type="button" style={button} onClick={onLoadMore} disabled={sourceState.loadingMore}>
        {sourceState.loadingMore ? copy.loading : copy.loadMoreNative}
      </button>}
  </section>;
}
