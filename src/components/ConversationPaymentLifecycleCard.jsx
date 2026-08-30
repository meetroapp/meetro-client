import { formatLocaleCurrency } from "../utils/localeFormat.js";

function money(minor, currency, language) {
  return formatLocaleCurrency(minor / 100, currency, {}, language);
}

export default function ConversationPaymentLifecycleCard({ payment, language }) {
  if (!payment) return null;
  const received = payment.state !== "PAYMENT_REQUIRED";
  const title = payment.state === "PAYMENT_REQUIRED"
    ? "Payment Required"
    : payment.state === "DEPOSIT_RECEIVED"
      ? "Deposit Received"
      : "Payment Partially Received";
  return (
    <article className="canonical-conversation-payment-card" style={styles.card}>
      <header style={styles.header}>
        <span style={styles.eyebrow}>{title}</span>
        <strong>{received
          ? money(payment.payment.grossAmountMinor, payment.currency, language)
          : money(payment.requiredMinor, payment.currency, language)}</strong>
      </header>
      <dl style={styles.summary}>
        <div><dt>Approved Work</dt><dd>{money(payment.quoteTotalMinor, payment.currency, language)}</dd></div>
        <div><dt>Deposit Required</dt><dd>{money(payment.requiredMinor, payment.currency, language)}</dd></div>
        <div><dt>Payment Received</dt><dd>{money(payment.receivedMinor, payment.currency, language)}</dd></div>
        <div><dt>Remaining Deposit</dt><dd>{money(payment.remainingMinor, payment.currency, language)}</dd></div>
        <div style={styles.balance}><dt>Balance Remaining</dt><dd>{money(payment.balanceRemainingMinor, payment.currency, language)}</dd></div>
      </dl>
      {received ? (
        <p style={styles.detail}>
          Recorded as {payment.payment.displayMethod}
          {payment.payment.externalReference ? ` · ${payment.payment.externalReference}` : ""}
        </p>
      ) : (
        <section style={styles.instructions}>
          <strong>How to Pay</strong>
          <p>Use the payment instructions provided by the business. Payment is recorded only after the business confirms it was received.</p>
        </section>
      )}
      {payment.paymentTerms ? <p style={styles.terms}>{payment.paymentTerms}</p> : null}
    </article>
  );
}

const styles = {
  card: { display: "grid", gap: 10, width: "min(100%, 390px)", minWidth: 0, padding: 16, border: "1px solid #bbd7c2", borderLeft: "4px solid #176b3a", borderRadius: 10, background: "#fff", color: "#172317" },
  header: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" },
  eyebrow: { color: "#176b3a", fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".04em" },
  summary: { display: "grid", gap: 6, margin: 0 },
  balance: { borderTop: "1px solid #d9e4dc", paddingTop: 8, fontWeight: 900 },
  detail: { margin: 0, color: "#526052", fontWeight: 700 },
  instructions: { padding: 10, borderRadius: 8, background: "#f4f8f5" },
  terms: { margin: 0, color: "#526052", fontSize: 13 },
};
