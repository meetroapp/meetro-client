import { formatLocaleCurrency } from "../utils/localeFormat.js";
import { getInvoiceCopy } from "../utils/invoicePaymentLanguage.js";

export default function ConversationInvoiceCard({ invoice, language, canReview, onReview }) {
  if (!invoice) return null;
  const copy = getInvoiceCopy(language);
  return (
    <article
      className="canonical-conversation-invoice-card"
      style={styles.card}
      data-invoice-id={invoice.invoiceId}
      data-job-id={invoice.jobId}
      data-invoice-status={invoice.status}
    >
      <div style={styles.heading}>
        <span style={styles.eyebrow}>{copy.invoiceReceived}</span>
        <span style={styles.number}>{invoice.invoiceNumber}</span>
      </div>
      <strong style={styles.business}>{invoice.business.displayName}</strong>
      <strong style={styles.total}>
        {formatLocaleCurrency(invoice.totalMinor / 100, invoice.currency, {}, language)}
      </strong>
      <span style={styles.status}>{copy.balance}: {formatLocaleCurrency(invoice.balanceMinor / 100, invoice.currency, {}, language)}</span>
      {canReview && (
        <button type="button" style={styles.review} onClick={onReview}>
          {copy.reviewInvoice}
        </button>
      )}
    </article>
  );
}

const styles = {
  card: { display: "grid", gap: 8, width: "min(100%, 360px)", minWidth: 0, padding: 14, border: "1px solid #cbd5e1", borderLeft: "4px solid #0f766e", borderRadius: 8, background: "#fff", color: "#172317" },
  heading: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  eyebrow: { color: "#0f766e", fontSize: 12, fontWeight: 900 },
  number: { color: "#526052", fontSize: 12, fontWeight: 800, overflowWrap: "anywhere" },
  business: { overflowWrap: "anywhere" },
  total: { fontSize: 24, letterSpacing: 0 },
  status: { color: "#526052", fontWeight: 700 },
  review: { minHeight: 44, width: "100%", padding: "0 16px", border: 0, borderRadius: 8, background: "#0f766e", color: "#fff", fontWeight: 800, cursor: "pointer" },
};
