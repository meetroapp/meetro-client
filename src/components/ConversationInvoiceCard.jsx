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
      <dl style={styles.summary}>
        <div><dt>Invoice Total</dt><dd>{formatLocaleCurrency(invoice.totalMinor / 100, invoice.currency, {}, language)}</dd></div>
        <div><dt>Payments Received</dt><dd>{formatLocaleCurrency(invoice.paidMinor / 100, invoice.currency, {}, language)}</dd></div>
        <div style={styles.balance}><dt>Balance Due</dt><dd>{formatLocaleCurrency(invoice.balanceMinor / 100, invoice.currency, {}, language)}</dd></div>
      </dl>
      {invoice.terms ? <span style={styles.status}>{invoice.terms}</span> : null}
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
  summary: { display: "grid", gap: 6, margin: 0 },
  balance: { fontSize: 20, fontWeight: 900, borderTop: "1px solid #d9e4dc", paddingTop: 8 },
  status: { color: "#526052", fontWeight: 700 },
  review: { minHeight: 44, width: "100%", padding: "0 16px", border: 0, borderRadius: 8, background: "#0f766e", color: "#fff", fontWeight: 800, cursor: "pointer" },
};
