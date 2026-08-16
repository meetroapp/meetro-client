import { buildCanonicalInvoiceDocumentModel } from "./customerDocumentModel.js";
import {
  downloadCustomerDocumentPdf,
  shareCustomerDocumentPdf,
} from "./customerDocumentPdf.js";
import { formatLocaleCurrency } from "./localeFormat.js";
import { getInvoiceCopy } from "./invoicePaymentLanguage.js";

export function buildInvoiceSharePresentation(invoice, { language = "en" } = {}) {
  if (!invoice?.invoiceId || invoice.status === "DRAFT" || !Array.isArray(invoice.lineItems)) {
    return null;
  }
  const copy = getInvoiceCopy(language);
  const money = (minor) => formatLocaleCurrency(minor / 100, invoice.currency, {}, language);
  const lines = [
    `${copy.invoice} ${invoice.invoiceNumber}`,
    `${invoice.business.displayName} - ${invoice.job.title}`,
    `${copy.total}: ${money(invoice.totalMinor)}`,
    `${copy.balance}: ${money(invoice.balanceMinor)}`,
    invoice.due.mode === "DUE_ON_RECEIPT"
      ? copy.dueOnReceipt
      : `${copy.dueDate}: ${invoice.due.date}`,
    "",
    ...invoice.lineItems.map((item) =>
      `${item.quantity} x ${item.description}: ${money(item.lineTotalMinor)}`
    ),
  ];
  if (invoice.customerNotes) lines.push("", invoice.customerNotes);
  if (invoice.terms) lines.push("", invoice.terms);
  return Object.freeze({
    title: `${copy.invoice} ${invoice.invoiceNumber}`,
    text: lines.join("\n"),
  });
}
function cancelled(error) {
  return error?.name === "AbortError" ||
    String(error?.message || "").toLowerCase().includes("cancel");
}

export async function shareInvoiceExternally({
  invoice,
  language = "en",
  branding = {},
  sharePdf = shareCustomerDocumentPdf,
} = {}) {
  const presentation = buildInvoiceSharePresentation(invoice, { language });
  const model = buildCanonicalInvoiceDocumentModel(invoice, { locale: language, branding });
  if (!presentation || !model) return { ok: false, method: "unavailable" };
  try {
    return await sharePdf({ model, message: presentation.text });
  } catch (error) {
    if (cancelled(error)) return { ok: false, method: "cancelled" };
    throw error;
  }
}

export async function downloadInvoicePdf({ invoice, language = "en", branding = {}, download = downloadCustomerDocumentPdf } = {}) {
  const model = buildCanonicalInvoiceDocumentModel(invoice, { locale: language, branding });
  return Boolean(model && await download(model));
}

export async function copyInvoiceDetails({
  invoice,
  language = "en",
  copy = globalThis.navigator?.clipboard?.writeText?.bind(globalThis.navigator?.clipboard),
} = {}) {
  const presentation = buildInvoiceSharePresentation(invoice, { language });
  if (!presentation || typeof copy !== "function") return false;
  await copy(presentation.text);
  return true;
}

export function buildInvoiceEmailUrl(invoice, { language = "en" } = {}) {
  const presentation = buildInvoiceSharePresentation(invoice, { language });
  return presentation
    ? `mailto:?subject=${encodeURIComponent(presentation.title)}&body=${encodeURIComponent(presentation.text)}`
    : null;
}
