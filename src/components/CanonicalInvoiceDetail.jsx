import { WorkCenterSourceBadge } from "./WorkCenterSource.jsx";
import { t } from "../utils/language.js";
import { useState } from "react";
import { fetchCanonicalInvoicePdf } from "../utils/invoicePaymentApi.js";
import { previewBusinessDocumentPdfArtifact, downloadBusinessDocumentPdfArtifact } from "../utils/businessDocumentDeviceShare.js";
import { invoicePaymentProvenance } from "../utils/invoicePaymentProvenance.js";
import { formatLocaleCurrency } from "../utils/localeFormat.js";
import { getInvoiceCopy } from "../utils/invoicePaymentLanguage.js";

function statusLabel(status, copy) {
  if (status === "DRAFT") return copy.drafts;
  if (status === "PAID") return copy.paid;
  if (status === "PARTIALLY_PAID") return copy.outstanding;
  return copy.waiting;
}

function lineageLabel(value, copy) {
  if (value === "REVISED") return copy.revised;
  if (value === "ADDITIONAL") return copy.additional;
  return copy.original;
}

export default function CanonicalInvoiceDetail({ invoice, language = "en", actions = null, sourceRecord = null }) {
  const [pdfState, setPdfState] = useState({ busy: false, error: "" });
  if (!invoice) return null;
  const copy = getInvoiceCopy(language);
  const provenance = invoicePaymentProvenance(invoice);
  const money = (minor) => formatLocaleCurrency(minor / 100, invoice.currency, {}, language);
  async function openPdf(preview) {
    if (pdfState.busy) return;
    setPdfState({ busy: true, error: "" });
    try {
      const artifact = await fetchCanonicalInvoicePdf({ invoiceId: invoice.invoiceId, expectedVersion: invoice.currentVersion, audience: invoice.currentVersion ? "professional" : "customer" });
      const ok = preview ? await previewBusinessDocumentPdfArtifact(artifact) : downloadBusinessDocumentPdfArtifact(artifact);
      if (!ok) throw new Error("The PDF could not be opened on this device.");
      setPdfState({ busy: false, error: "" });
    } catch (error) { setPdfState({ busy: false, error: error?.message || "The Invoice PDF is unavailable." }); }
  }
  return (
    <article
      style={styles.detail}
      data-canonical-invoice-id={invoice.invoiceId}
      data-canonical-job-id={invoice.jobId}
      data-canonical-invoice-status={invoice.status}
    >
      <header style={styles.header}>
        <div style={styles.identity}>
          <WorkCenterSourceBadge record={sourceRecord?.jobId === invoice.jobId ? sourceRecord : invoice} language={language} />
          <span style={styles.eyebrow}>{copy.invoice}</span>
          <h3 style={styles.title}>{invoice.invoiceNumber}</h3>
          <span style={styles.meta}>{invoice.business.displayName} / {invoice.customer.displayName}</span>
        </div>
        <span style={{ ...styles.status, ...(invoice.status === "PAID" ? styles.paid : {}) }}>
          {statusLabel(invoice.status, copy)}
        </span>
      </header>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryItem}><span>{copy.total}</span><strong style={styles.moneyValue}>{money(invoice.totalMinor)}</strong></div>
        <div style={styles.summaryItem}><span>{copy.paid}</span><strong style={styles.moneyValue}>{money(invoice.paidMinor)}</strong></div>
        <div style={styles.summaryItem}><span>{copy.balance}</span><strong style={styles.moneyValue}>{money(invoice.balanceMinor)}</strong></div>
      </div>

      <div style={styles.due}>
        <span>{invoice.job.title}</span>
        <strong>{invoice.due.mode === "DUE_ON_RECEIPT" ? copy.dueOnReceipt : `${copy.dueDate}: ${invoice.due.date}`}</strong>
      </div>

      <div style={styles.lines}>
        {invoice.lineItems.map((item) => (
          <div key={`${item.sequence}-${item.description}`} style={styles.line} data-invoice-line-item={item.sequence}>
            <div style={styles.lineCopy}>
              <span style={styles.lineage}>{lineageLabel(item.lineageLabel, copy)}</span>
              <strong>{item.description}</strong>
              <span>{item.quantity} x {money(item.unitAmountMinor)}</span>
            </div>
            <strong style={styles.moneyValue} data-invoice-money="line-total">{money(item.lineTotalMinor)}</strong>
          </div>
        ))}
      </div>

      {(invoice.customerNotes || invoice.terms) && (
        <div style={styles.notes}>
          {invoice.customerNotes && <p>{invoice.customerNotes}</p>}
          {invoice.terms && <p>{invoice.terms}</p>}
        </div>
      )}

      <section style={styles.paymentSection} aria-label={copy.payments}>
        <h4 style={styles.sectionTitle}>{copy.payments}</h4>
        {provenance.appliedBeforeInvoiceMinor > 0 && (
          <div style={styles.payment} data-payment-source="prior-applied">
            <div style={styles.paymentCopy}><strong>{t("wc52priorPayments", language)}</strong><p style={styles.muted}>{t("wc52priorPaymentsHelp", language)}</p></div>
            <strong style={styles.moneyValue} data-invoice-money="prior-applied">{money(provenance.appliedBeforeInvoiceMinor)}</strong>
          </div>
        )}
        {invoice.payments.length === 0 && provenance.appliedBeforeInvoiceMinor === 0 ? (
          <p style={styles.muted}>{copy.noPayments}</p>
        ) : invoice.payments.map((payment, index) => (
          <div key={payment.paymentId || `${payment.recordedAt}-${index}`} style={styles.payment}>
            <div style={styles.paymentCopy}><strong style={styles.moneyValue}>{money(payment.amountMinor)}</strong><span>{copy[payment.method === "BANK_TRANSFER" ? "bankTransfer" : payment.method.toLowerCase()] || copy.other}</span></div>
            <span>{payment.receivedDate}</span>
          </div>
        ))}
      </section>

      {invoice.actions?.canPayOnline === false && (
        <p style={styles.offline}>{copy.onlineUnavailable}</p>
      )}
      <div style={styles.header}>
        <button type="button" disabled={pdfState.busy} onClick={() => openPdf(true)}>Preview PDF</button>
        <button type="button" disabled={pdfState.busy} onClick={() => openPdf(false)}>Download PDF</button>
      </div>
      {pdfState.error && <p role="alert">{pdfState.error}</p>}
      {actions}
    </article>
  );
}

const styles = {
  detail: { display: "grid", gap: 16, minWidth: 0, padding: "clamp(16px, 3vw, 24px)", border: "1px solid #d7ded8", borderRadius: 8, background: "#fff", color: "#172317" },
  header: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  identity: { display: "grid", gap: 3, minWidth: 0 },
  eyebrow: { color: "#0f766e", fontSize: 12, fontWeight: 900, textTransform: "uppercase" },
  title: { margin: 0, fontSize: 22, letterSpacing: 0, overflowWrap: "anywhere" },
  meta: { color: "#526052", overflowWrap: "anywhere" },
  status: { padding: "7px 10px", borderRadius: 999, background: "#fff7d6", color: "#725400", fontSize: 12, fontWeight: 900 },
  paid: { background: "#e5f5ea", color: "#1f5132" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 },
  summaryItem: { display: "grid", gap: 4, minWidth: 0, padding: 12, border: "1px solid #e4e8e5", borderRadius: 6 },
  due: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, paddingBottom: 12, borderBottom: "1px solid #e4e8e5" },
  lines: { display: "grid", gap: 0 },
  line: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 12, minWidth: 0, padding: "12px 0", borderBottom: "1px solid #edf0ed" },
  lineCopy: { display: "grid", gap: 3, minWidth: 0, overflowWrap: "anywhere" },
  lineage: { color: "#0f766e", fontSize: 11, fontWeight: 900, textTransform: "uppercase" },
  notes: { padding: 12, background: "#f7faf8", borderRadius: 6, overflowWrap: "anywhere" },
  paymentSection: { display: "grid", gap: 8 },
  sectionTitle: { margin: 0, fontSize: 16, letterSpacing: 0 },
  payment: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "start", gap: 12, minWidth: 0, padding: 10, border: "1px solid #e4e8e5", borderRadius: 6 },
  paymentCopy: { display: "grid", gap: 3, minWidth: 0, overflowWrap: "anywhere" },
  moneyValue: { minWidth: "max-content", whiteSpace: "nowrap", flexShrink: 0, textAlign: "right" },
  muted: { margin: 0, color: "#667267" },
  offline: { margin: 0, padding: 12, borderLeft: "4px solid #0f766e", background: "#eff8f7", color: "#20433f" },
};
