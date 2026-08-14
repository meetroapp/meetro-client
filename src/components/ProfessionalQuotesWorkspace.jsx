import WorkCenterBackButton from "./WorkCenterBackButton.jsx";
import { t } from "../utils/language.js";
import { formatLocaleCurrency, formatLocaleDate } from "../utils/localeFormat.js";

const GROUPS = Object.freeze([
  { classification: "DRAFT", titleKey: "professionalQuotesDrafts", descriptionKey: "professionalQuotesDraftsHelp" },
  { classification: "WAITING_ON_CUSTOMER", titleKey: "professionalQuotesWaiting", descriptionKey: "professionalQuotesWaitingHelp" },
  { classification: "APPROVED", titleKey: "professionalQuotesApproved", descriptionKey: "professionalQuotesApprovedHelp" },
  { classification: "DECLINED", titleKey: "professionalQuotesDeclined", descriptionKey: "professionalQuotesDeclinedHelp", collapsed: true },
]);

function statusLabel(classification, language) {
  return t({
    DRAFT: "professionalQuotesStatusDraft",
    WAITING_ON_CUSTOMER: "professionalQuotesStatusWaiting",
    APPROVED: "professionalQuotesStatusApproved",
    DECLINED: "professionalQuotesStatusDeclined",
  }[classification], language);
}

function QuoteSummary({ quote, language, onOpenQuote }) {
  const actionLabel = quote.classification === "DRAFT" && quote.actions.canContinueDraft
    ? t("professionalQuotesContinue", language)
    : t("professionalQuotesView", language);
  return (
    <article className="professional-quotes-card" style={styles.card} data-quote-id={quote.id}>
      <div style={styles.cardHeading}>
        <div style={styles.identity}>
          <strong style={styles.customer}>{quote.customer.displayName}</strong>
          <span style={styles.job}>{quote.job.title}</span>
        </div>
        <span style={styles.status}>{statusLabel(quote.classification, language)}</span>
      </div>
      <div style={styles.details}>
        <strong style={styles.amount}>
          {formatLocaleCurrency(quote.totalMinor / 100, quote.currency, {}, language)}
        </strong>
        <span>{quote.lineageLabel}</span>
        <span>
          {t("professionalQuotesUpdated", language)} {formatLocaleDate(
            quote.lastActivityAt,
            { month: "short", day: "numeric", year: "numeric" },
            language
          )}
        </span>
      </div>
      <button
        type="button"
        style={styles.primaryAction}
        onClick={() => onOpenQuote?.({ quoteId: quote.id, jobId: quote.jobId, quote })}
        disabled={!quote.actions.canViewQuote}
      >
        {actionLabel}
      </button>
    </article>
  );
}

function QuoteGroup({ group, quotes, language, onOpenQuote }) {
  const content = (
    <div className="professional-quotes-grid" style={styles.grid}>
      {quotes.length > 0 ? quotes.map((quote) => (
        <QuoteSummary key={quote.id} quote={quote} language={language} onOpenQuote={onOpenQuote} />
      )) : (
        <p style={styles.groupEmpty}>{t("professionalQuotesSectionEmpty", language)}</p>
      )}
    </div>
  );
  if (group.collapsed) {
    return (
      <details style={styles.group}>
        <summary style={styles.summaryControl}>
          <span>{t(group.titleKey, language)}</span>
          <span style={styles.count}>{quotes.length}</span>
        </summary>
        <p style={styles.groupDescription}>{t(group.descriptionKey, language)}</p>
        {content}
      </details>
    );
  }
  return (
    <section style={styles.group} aria-labelledby={`professional-quotes-${group.classification}`}>
      <div style={styles.groupHeading}>
        <div>
          <h3 id={`professional-quotes-${group.classification}`} style={styles.groupTitle}>
            {t(group.titleKey, language)}
          </h3>
          <p style={styles.groupDescription}>{t(group.descriptionKey, language)}</p>
        </div>
        <span style={styles.count}>{quotes.length}</span>
      </div>
      {content}
    </section>
  );
}

export default function ProfessionalQuotesWorkspace({
  sourceState,
  language,
  onBack,
  onRetry,
  onLoadMore,
  onOpenQuote,
}) {
  const confirmed = sourceState?.confirmed;
  const quotes = confirmed?.quotes || [];
  return (
    <section className="professional-quotes-workspace meetro-visual-surface" style={styles.workspace}>
      <WorkCenterBackButton
        label={t("backToWorkCenter", language)}
        onClick={onBack}
      />
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>{t("workCenterQuotesTitle", language)}</h2>
          <p style={styles.purpose}>{t("professionalQuotesWorkspacePurpose", language)}</p>
        </div>
        {sourceState?.refreshing && (
          <span role="status" style={styles.refreshing}>{t("professionalQuotesRefreshing", language)}</span>
        )}
      </header>

      {sourceState?.status === "loading" && !confirmed && (
        <p role="status" style={styles.state}>{t("professionalQuotesLoading", language)}</p>
      )}
      {sourceState?.status === "error" && !confirmed && (
        <div role="alert" style={styles.errorState}>
          <strong>{t("professionalQuotesUnavailable", language)}</strong>
          <button type="button" style={styles.retry} onClick={onRetry}>
            {t("professionalQuotesRetry", language)}
          </button>
        </div>
      )}
      {confirmed && quotes.length === 0 && (
        <p style={styles.state}>{t("professionalQuotesEmpty", language)}</p>
      )}
      {confirmed && quotes.length > 0 && (
        <div style={styles.groups}>
          {GROUPS.map((group) => (
            <QuoteGroup
              key={group.classification}
              group={group}
              quotes={quotes.filter((quote) => quote.classification === group.classification)}
              language={language}
              onOpenQuote={onOpenQuote}
            />
          ))}
        </div>
      )}
      {confirmed?.pagination?.hasMore && (
        <button
          type="button"
          style={styles.showMore}
          onClick={onLoadMore}
          disabled={sourceState?.loadingMore}
        >
          {sourceState?.loadingMore
            ? t("professionalQuotesLoadingMore", language)
            : t("professionalQuotesShowMore", language)}
        </button>
      )}
      {sourceState?.error && confirmed && (
        <p role="alert" style={styles.inlineError}>{t("professionalQuotesMoreUnavailable", language)}</p>
      )}
    </section>
  );
}

const styles = {
  workspace: { display: "grid", gap: 20, width: "min(100%, 1080px)", minWidth: 0, margin: "0 auto", padding: "clamp(16px, 3vw, 28px)", paddingBottom: "calc(var(--meetro-bottom-nav-clearance, 0px) + 32px)" },
  header: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  title: { margin: 0, color: "#172317", fontSize: "clamp(24px, 4vw, 34px)" },
  purpose: { margin: "6px 0 0", color: "#526052", lineHeight: 1.5 },
  refreshing: { color: "#526052", fontSize: 13, fontWeight: 700 },
  state: { margin: 0, padding: "28px 16px", textAlign: "center", color: "#526052", border: "1px solid #dce5d8", borderRadius: 16 },
  errorState: { display: "grid", gap: 12, justifyItems: "start", padding: 18, color: "#8f1d1d", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 16 },
  retry: { minHeight: 44, padding: "0 18px", border: 0, borderRadius: 999, color: "#fff", background: "#1f5132", fontWeight: 800, cursor: "pointer" },
  groups: { display: "grid", gap: 18, minWidth: 0 },
  group: { minWidth: 0, padding: "clamp(14px, 2.5vw, 20px)", border: "1px solid #dce5d8", borderRadius: 18, background: "#fff" },
  groupHeading: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  groupTitle: { margin: 0, color: "#172317", fontSize: 19 },
  groupDescription: { margin: "5px 0 14px", color: "#667266", lineHeight: 1.45 },
  count: { display: "inline-grid", placeItems: "center", minWidth: 32, minHeight: 32, padding: "0 10px", borderRadius: 999, color: "#1f5132", background: "#edf5ea", fontWeight: 800 },
  summaryControl: { display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 44, color: "#172317", fontWeight: 800, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 290px), 1fr))", gap: 12, minWidth: 0 },
  groupEmpty: { gridColumn: "1 / -1", margin: 0, color: "#7b867b" },
  card: { display: "grid", gap: 14, minWidth: 0, padding: 16, border: "1px solid #dce5d8", borderRadius: 16, background: "#fbfdf9" },
  cardHeading: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 10, minWidth: 0 },
  identity: { display: "grid", gap: 4, minWidth: 0, flex: "1 1 180px" },
  customer: { color: "#172317", overflowWrap: "anywhere" },
  job: { color: "#526052", overflowWrap: "anywhere", lineHeight: 1.4 },
  status: { padding: "5px 9px", borderRadius: 999, color: "#1f5132", background: "#edf5ea", fontSize: 12, fontWeight: 800 },
  details: { display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "6px 12px", color: "#667266", fontSize: 13 },
  amount: { color: "#172317", fontSize: 18 },
  primaryAction: { minHeight: 44, width: "100%", padding: "0 18px", border: 0, borderRadius: 999, color: "#fff", background: "#1f5132", fontWeight: 800, cursor: "pointer" },
  showMore: { justifySelf: "center", minHeight: 44, padding: "0 22px", border: "1px solid #1f5132", borderRadius: 999, color: "#1f5132", background: "#fff", fontWeight: 800, cursor: "pointer" },
  inlineError: { margin: 0, textAlign: "center", color: "#8f1d1d" },
};
