import { formatLocaleCurrency } from "../utils/localeFormat.js";
import { t } from "../utils/language.js";

function lineageKey(value) {
  if (value === "Revised") return "customerQuoteLineageRevised";
  if (value === "Additional") return "customerQuoteLineageAdditional";
  return "customerQuoteLineageOriginal";
}

function statusKey(value) {
  if (value === "APPROVED") return "customerQuoteStatusApproved";
  if (value === "DECLINED") return "customerQuoteStatusDeclined";
  return "customerQuoteStatusWaiting";
}

export default function ConversationQuoteCard({
  quote,
  language,
  canReview,
  onReview,
}) {
  if (!quote) return null;
  return (
    <article
      className="canonical-conversation-quote-card"
      style={styles.card}
      data-quote-id={quote.quoteId}
      data-job-id={quote.jobId}
      data-quote-business-status={quote.businessStatus}
    >
      <div style={styles.heading}>
        <span style={styles.eyebrow}>{t("quoteDeliveryQuote", language)}</span>
        <span style={styles.lineage}>{t(lineageKey(quote.lineageLabel), language)}</span>
      </div>
      <strong style={styles.business}>{quote.business.displayName}</strong>
      <strong style={styles.total}>
        {formatLocaleCurrency(quote.totalMinor / 100, quote.currency, {}, language)}
      </strong>
      <span style={styles.status}>{t(statusKey(quote.businessStatus), language)}</span>
      {canReview && (
        <button type="button" style={styles.review} onClick={onReview}>
          {t("customerQuoteReview", language)}
        </button>
      )}
    </article>
  );
}

const styles = {
  card: {
    display: "grid",
    gap: 8,
    width: "min(100%, 360px)",
    minWidth: 0,
    padding: 14,
    border: "1px solid #cbd5e1",
    borderLeft: "4px solid #1f5132",
    borderRadius: 8,
    background: "#fff",
    color: "#172317",
  },
  heading: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  eyebrow: { color: "#1f5132", fontSize: 12, fontWeight: 900 },
  lineage: { color: "#526052", fontSize: 12, fontWeight: 800 },
  business: { overflowWrap: "anywhere" },
  total: { fontSize: 24, letterSpacing: 0 },
  status: { color: "#526052", fontWeight: 700 },
  review: {
    minHeight: 44,
    width: "100%",
    padding: "0 16px",
    border: 0,
    borderRadius: 8,
    background: "#1f5132",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
};
