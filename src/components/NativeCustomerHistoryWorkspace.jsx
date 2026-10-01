import { useEffect, useState } from "react";
import { customerHistoryStatusLabel } from "../utils/professionalCustomerHistory.js";
import ProfessionalCustomerHistoryExport from "./ProfessionalCustomerHistoryExport.jsx";
import ProfessionalCustomerHistoryTabs from "./ProfessionalCustomerHistoryTabs.jsx";
import { buildProfessionalWorkCenterRoute } from "../utils/professionalWorkCenterRoute.js";
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

export default function NativeCustomerHistoryWorkspace({ subject, displayName = "", sourceState, language, copy, setPage, onRetry, onLoadMore }) {
  const [focus, setFocus] = useState("overview");
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
  if (history?.contractVersion === 2) {
    const open = jobId => {
      const route = buildProfessionalWorkCenterRoute({ jobId, returnPage: "customerRelationshipsCenter" });
      if (route) setPage?.(route);
    };
    const money = row => amount({ currency: row.currency, totalMinor: row.totalMinor }, language);
    const jobTitle = id => history.jobs.find(job => job.jobId === id)?.serviceTitle || copy.job;
    return <section
      className="customer-history-workspace-body"
      style={section}
      aria-label={copy.nativeHistory}
      data-native-customer-history-status={sourceState.status}
    >
      <header className="customer-history-identity">
        <span className="customer-history-avatar" aria-hidden="true">
          {(history.displayName || "C").slice(0, 1).toUpperCase()}
        </span>
        <div className="customer-history-identity-copy">
          <p className="customer-history-eyebrow">{copy.nativeSourceLabel}</p>
          <h2 className="customer-history-customer-name">{history.displayName}</h2>
          <p className="customer-history-context">{copy.title}</p>
        </div>
        <ProfessionalCustomerHistoryExport authority={subject} displayName={history.displayName} language={language} copy={copy} setPage={setPage} />
      </header>

      <ProfessionalCustomerHistoryTabs copy={copy} focus={focus} onChange={setFocus} />

      {focus === "overview" && <div className="customer-history-metric-grid">
        {[[copy.activeJobs,history.summary.activeJobs],[copy.completedJobs,history.summary.completedJobs],
          [copy.quotes,history.summary.quotes],[copy.invoices,history.summary.invoices],
          [copy.documentsPhotos,history.summary.documents + history.summary.photos]].map(([label,count]) =>
          <article key={label} className="customer-history-metric-card">
            <strong>{count}</strong>
            <span>{label}</span>
          </article>)}
      </div>}
      {focus === "work" && ["ACTIVE","COMPLETED"].map(state => <section key={state} style={section}>
        <h5>{state === "ACTIVE" ? copy.activeJobs : copy.completedJobs}</h5>
        {history.jobs.filter(job => job.completionState === state).length === 0 && <p>{copy.noWork}</p>}
        {history.jobs.filter(job => job.completionState === state).map(job => <article key={job.jobId} className="customer-history-record-card" style={card} data-native-job-history={job.jobId}>
          <h5>{job.serviceTitle}</h5><p>{job.completedAt ? copy.completed : copy.created}: {date(job.completedAt || job.createdAt, language)}</p>
          <button type="button" style={button} onClick={() => open(job.jobId)} aria-label={`${copy.openJob}: ${job.serviceTitle}`}>{copy.openJob}</button>
        </article>)}
      </section>)}
      {focus === "quotes" && <section style={section}>
        {history.quotes.length === 0 && <p>{copy.noQuotes}</p>}
        {history.quotes.map(quote => <article key={quote.quoteId} className="customer-history-record-card" style={card}>
          <h5>{quote.documentNumber || copy.quote} · {quote.lineageType === "REVISED_QUOTE" ? copy.revisedQuote : quote.lineageType === "SUPPLEMENTAL_QUOTE" ? copy.additionalQuote : copy.originalQuote}</h5>
          <p>{jobTitle(quote.jobId)} · {customerHistoryStatusLabel(quote.status,copy)}</p>
          {quote.customerDecision && <p>{copy.decision}: {customerHistoryStatusLabel(quote.customerDecision,copy)}</p>}
          <p>{copy.issued}: {date(quote.issuedAt,language)} · {copy.total}: {money(quote)}</p>
          <button type="button" style={button} onClick={() => open(quote.jobId)}>{copy.openJob}</button>
        </article>)}
      </section>}
      {focus === "invoices" && <section style={section}>
        {history.invoices.length === 0 && <p>{copy.noInvoices}</p>}
        {history.invoices.map(invoice => <article key={invoice.invoiceId} className="customer-history-record-card" style={card}>
          <h5>{invoice.invoiceNumber}</h5><p>{jobTitle(invoice.jobId)} · {customerHistoryStatusLabel(invoice.status,copy)}</p>
          <p>{copy.total}: {money(invoice)} · {copy.paid}: {amount({currency:invoice.currency,totalMinor:invoice.paidMinor},language)} · {copy.balance}: {amount({currency:invoice.currency,totalMinor:invoice.balanceMinor},language)}</p>
          <p>{copy.issued}: {date(invoice.issuedAt,language)}</p>
          <button type="button" style={button} onClick={() => open(invoice.jobId)}>{copy.openJob}</button>
        </article>)}
      </section>}
      {focus === "documents" && <section style={section}>
        {history.documents.length + history.media.length === 0 && <p>{copy.noDocumentsPhotos}</p>}
        {history.documents.map(doc => <article key={`${doc.documentType}:${doc.documentId}`} className="customer-history-record-card" style={card}>
          <h5>{doc.documentNumber || (doc.documentType === "QUOTE" ? copy.quote : copy.invoice)}</h5>
          <p>{doc.jobTitle || jobTitle(doc.parentId)} · {doc.provenance === "CANONICAL_QUOTE" ? copy.canonicalQuote : copy.canonicalInvoice}</p>
          <button type="button" style={button} onClick={() => open(doc.parentId)}>{copy.openJob}</button>
        </article>)}
        {history.media.map(photo => <a key={`${photo.parentId}:${photo.mediaId}`} style={card} href={photo.secureUrl} target="_blank" rel="noreferrer" aria-label={`${copy.openPhoto}: ${jobTitle(photo.parentId)}`}>
          <img src={photo.secureUrl} alt={copy.requestPhoto} loading="lazy" style={{maxWidth:"100%",width:240,height:"auto"}} /><p>{jobTitle(photo.parentId)} · {copy.requestPhoto}</p>
        </a>)}
      </section>}
      {sourceState.pageError && <div role="alert"><p>{copy.nativeHistoryUnavailable}</p><button type="button" style={button} onClick={onLoadMore} disabled={sourceState.loadingMore}>{copy.retry}</button></div>}
      {history.pagination.nextCursor && !sourceState.pageError && <button type="button" style={button} onClick={onLoadMore} disabled={sourceState.loadingMore}>{sourceState.loadingMore ? copy.loading : copy.loadMoreNative}</button>}
    </section>;
  }
  return <section
    className="customer-history-workspace-body"
    style={section}
    aria-label={copy.nativeHistory}
    data-native-customer-history-status={sourceState.status}
  >
    <header className="customer-history-identity customer-history-identity--loading">
      <span className="customer-history-avatar" aria-hidden="true">
        {(displayName || "C").slice(0, 1).toUpperCase()}
      </span>
      <div className="customer-history-identity-copy">
        <p className="customer-history-eyebrow">{copy.nativeSourceLabel}</p>
        <h2 className="customer-history-customer-name">{displayName || copy.nativeHistory}</h2>
        <p className="customer-history-context">{copy.title}</p>
      </div>
    </header>
    {sourceState.status === "loading" && <p className="customer-history-loading-status" role="status">{copy.loading}</p>}
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
