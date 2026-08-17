import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { jsPDF } from "jspdf";

const PAGE = Object.freeze({ width: 612, height: 792, margin: 48, footerY: 766 });
const COLOR = Object.freeze({ ink: [24, 49, 70], text: [42, 45, 48], muted: [91, 105, 116], line: [196, 209, 218], fill: [242, 246, 248], accent: [31, 81, 50], white: [255, 255, 255] });

const LABELS = Object.freeze({
  en: Object.freeze({ quote: "QUOTE", invoice: "INVOICE", draft: "DRAFT PREVIEW", customer: "Customer", project: "Project", date: "Date", dueDate: "Due date", status: "Status", scope: "Scope of Work", work: "Work Performed", description: "Description", quantity: "Qty", unit: "Unit", amount: "Amount", subtotal: "Subtotal", discount: "Discount", tax: "Tax", fees: "Fees", projectPrice: "PROJECT PRICE", totalDue: "TOTAL DUE", paid: "Amount paid", balance: "BALANCE DUE", paymentTerms: "Payment Terms", duration: "Estimated Duration", conditions: "Project Conditions", exclusions: "Not Included", notes: "Notes", warranty: "Warranty Notes", message: "Customer Message", acceptance: "Acceptance / Status", awaiting: "Awaiting customer decision in Meetro", approved: "Approved in Meetro", declined: "Declined in Meetro", draftQuote: "Preview only - not issued or saved", draftInvoice: "Preview only - not issued or recorded", dueReceipt: "Due on receipt", preparedWith: "Prepared with Meetro", exportPdf: "Export PDF", sharePdf: "Share PDF", pdfReady: "PDF ready.", pdfUnavailable: "PDF export is unavailable on this device." }),
  es: Object.freeze({ quote: "COTIZACION", invoice: "FACTURA", draft: "VISTA PREVIA", customer: "Cliente", project: "Proyecto", date: "Fecha", dueDate: "Vencimiento", status: "Estado", scope: "Alcance del trabajo", work: "Trabajo realizado", description: "Descripcion", quantity: "Cant.", unit: "Unidad", amount: "Importe", subtotal: "Subtotal", discount: "Descuento", tax: "Impuesto", fees: "Cargos", projectPrice: "PRECIO DEL PROYECTO", totalDue: "TOTAL", paid: "Pagado", balance: "SALDO PENDIENTE", paymentTerms: "Terminos de pago", duration: "Duracion estimada", conditions: "Condiciones del proyecto", exclusions: "No incluido", notes: "Notas", warranty: "Garantia", message: "Mensaje al cliente", acceptance: "Aceptacion / Estado", awaiting: "Esperando la decision del cliente en Meetro", approved: "Aprobada en Meetro", declined: "Rechazada en Meetro", draftQuote: "Vista previa - no emitida ni guardada", draftInvoice: "Vista previa - no emitida ni registrada", dueReceipt: "Vence al recibir", preparedWith: "Preparado con Meetro", exportPdf: "Exportar PDF", sharePdf: "Compartir PDF", pdfReady: "PDF listo.", pdfUnavailable: "La exportacion PDF no esta disponible en este dispositivo." }),
  fr: Object.freeze({ quote: "DEVIS", invoice: "FACTURE", draft: "APERCU", customer: "Client", project: "Projet", date: "Date", dueDate: "Echeance", status: "Statut", scope: "Etendue des travaux", work: "Travaux effectues", description: "Description", quantity: "Qte", unit: "Unite", amount: "Montant", subtotal: "Sous-total", discount: "Remise", tax: "Taxe", fees: "Frais", projectPrice: "PRIX DU PROJET", totalDue: "TOTAL DU", paid: "Montant paye", balance: "SOLDE DU", paymentTerms: "Conditions de paiement", duration: "Duree estimee", conditions: "Conditions du projet", exclusions: "Non inclus", notes: "Notes", warranty: "Garantie", message: "Message au client", acceptance: "Acceptation / Statut", awaiting: "En attente de la decision du client dans Meetro", approved: "Approuve dans Meetro", declined: "Refuse dans Meetro", draftQuote: "Apercu - non emis et non enregistre", draftInvoice: "Apercu - non emis et non comptabilise", dueReceipt: "Du a reception", preparedWith: "Prepare avec Meetro", exportPdf: "Exporter le PDF", sharePdf: "Partager le PDF", pdfReady: "PDF pret.", pdfUnavailable: "L'exportation PDF n'est pas disponible sur cet appareil." }),
  "pt-BR": Object.freeze({ quote: "ORCAMENTO", invoice: "FATURA", draft: "PRE-VISUALIZACAO", customer: "Cliente", project: "Projeto", date: "Data", dueDate: "Vencimento", status: "Status", scope: "Escopo do trabalho", work: "Trabalho realizado", description: "Descricao", quantity: "Qtd.", unit: "Unidade", amount: "Valor", subtotal: "Subtotal", discount: "Desconto", tax: "Imposto", fees: "Taxas", projectPrice: "PRECO DO PROJETO", totalDue: "TOTAL", paid: "Valor pago", balance: "SALDO DEVIDO", paymentTerms: "Termos de pagamento", duration: "Duracao estimada", conditions: "Condicoes do projeto", exclusions: "Nao incluido", notes: "Notas", warranty: "Garantia", message: "Mensagem ao cliente", acceptance: "Aceite / Status", awaiting: "Aguardando decisao do cliente no Meetro", approved: "Aprovado no Meetro", declined: "Recusado no Meetro", draftQuote: "Previa - nao emitida nem salva", draftInvoice: "Previa - nao emitida nem registrada", dueReceipt: "Vencimento no recebimento", preparedWith: "Preparado com Meetro", exportPdf: "Exportar PDF", sharePdf: "Compartilhar PDF", pdfReady: "PDF pronto.", pdfUnavailable: "A exportacao de PDF nao esta disponivel neste dispositivo." }),
});

function labels(locale) {
  return LABELS[locale] || LABELS.en;
}

export function getCustomerDocumentActionCopy(locale = "en") {
  const copy = labels(locale);
  return Object.freeze({
    exportPdf: copy.exportPdf,
    sharePdf: copy.sharePdf,
    pdfReady: copy.pdfReady,
    pdfUnavailable: copy.pdfUnavailable,
  });
}

function formatMoney(minor, currency, locale) {
  return new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);
}

function formatCustomerDocumentDate(value, locale) {
  const date = String(value);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00`)
    : new Date(value);
  return parsed.toLocaleDateString(locale);
}

function readableStatus(model, copy) {
  if (model.draft) return model.kind === "QUOTE" ? copy.draftQuote : copy.draftInvoice;
  if (model.acceptance === "APPROVED") return copy.approved;
  if (model.acceptance === "DECLINED") return copy.declined;
  if (model.acceptance === "AWAITING_CUSTOMER_DECISION") return copy.awaiting;
  return String(model.status || "").replaceAll("_", " ").toLowerCase();
}

function safeFileName(model) {
  const number = String(model.documentNumber || "preview")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "preview";
  return `${model.kind === "QUOTE" ? "Quote" : "Invoice"}-${number}.pdf`;
}

function validateModel(model) {
  return Boolean(
    model?.schemaVersion === 1 &&
    (model.kind === "QUOTE" || model.kind === "INVOICE") &&
    model.branding?.name &&
    Array.isArray(model.lineItems) &&
    Number.isSafeInteger(model.totalMinor) &&
    model.totalMinor >= 0
  );
}

function addText(doc, value, x, y, { size = 10, color = COLOR.text, style = "normal", maxWidth, align = "left" } = {}) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = maxWidth ? doc.splitTextToSize(String(value || ""), maxWidth) : [String(value || "")];
  doc.text(lines, x, y, { align });
  return y + lines.length * size * 1.25;
}

export function collectCustomerDocumentText(model) {
  if (!validateModel(model)) return "";
  return [
    model.branding.name,
    model.branding.phone,
    model.branding.email,
    model.branding.website,
    model.branding.region,
    model.kind,
    model.draft ? "DRAFT PREVIEW" : "",
    model.documentNumber,
    model.customer.name,
    model.customer.phone,
    model.customer.email,
    model.customer.address,
    model.projectTitle,
    model.projectLocation,
    model.scopeSummary,
    ...model.lineItems.flatMap((item) => [item.description, item.quantity, item.unitAmountMinor, item.lineTotalMinor]),
    model.subtotalMinor,
    model.discountMinor,
    model.taxMinor,
    model.feesMinor,
    model.totalMinor,
    model.paidMinor,
    model.balanceMinor,
    model.paymentTerms,
    model.estimatedDuration,
    ...model.conditions,
    ...model.exclusions,
    model.notes,
    model.warrantyNotes,
    model.customerMessage,
    model.acceptance,
  ].filter((value) => value !== null && value !== undefined && value !== "").join("\n");
}

export function renderCustomerDocumentPdf(model, { jsPDFImpl = jsPDF } = {}) {
  if (!validateModel(model)) throw new TypeError("A verified customer document model is required.");
  const copy = labels(model.locale);
  const doc = new jsPDFImpl({ unit: "pt", format: "letter", orientation: "portrait", compress: true });
  const contentWidth = PAGE.width - PAGE.margin * 2;
  let y = PAGE.margin;

  function pageHeader(continuation = false) {
    if (continuation) {
      addText(doc, model.branding.name, PAGE.margin, 34, { size: 9, color: COLOR.muted, style: "bold" });
      addText(doc, model.kind === "QUOTE" ? copy.quote : copy.invoice, PAGE.width - PAGE.margin, 34, { size: 9, color: COLOR.muted, style: "bold", align: "right" });
      doc.line(PAGE.margin, 42, PAGE.width - PAGE.margin, 42);
      y = 60;
    }
  }

  function ensureSpace(height) {
    if (y + height <= PAGE.footerY - 18) return;
    doc.addPage("letter", "portrait");
    pageHeader(true);
  }

  function section(title, body) {
    if (!body) return;
    const bodyLines = doc.splitTextToSize(String(body), contentWidth);
    const height = 28 + bodyLines.length * 13;
    ensureSpace(Math.min(height, 180));
    y = addText(doc, title, PAGE.margin, y, { size: 12, color: COLOR.ink, style: "bold" });
    y = addText(doc, body, PAGE.margin, y + 3, { size: 9.5, maxWidth: contentWidth });
    y += 8;
  }

  function bulletSection(title, values) {
    if (!values?.length) return;
    ensureSpace(50);
    y = addText(doc, title, PAGE.margin, y, { size: 12, color: COLOR.ink, style: "bold" });
    for (const value of values) {
      const lines = doc.splitTextToSize(String(value), contentWidth - 16);
      ensureSpace(lines.length * 13 + 5);
      addText(doc, "-", PAGE.margin + 4, y + 3, { size: 9.5 });
      y = addText(doc, value, PAGE.margin + 16, y + 3, { size: 9.5, maxWidth: contentWidth - 16 });
    }
    y += 8;
  }

  const embeddedLogo = /^data:image\/(?:png|jpeg);base64,/i.test(model.branding.logoUrl || "");
  if (embeddedLogo) {
    const format = model.branding.logoUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
    doc.addImage(model.branding.logoUrl, format, PAGE.margin, y - 10, 34, 34, undefined, "FAST");
  }
  addText(doc, model.branding.name, PAGE.margin + (embeddedLogo ? 44 : 0), y + 4, { size: 17, color: COLOR.ink, style: "bold", maxWidth: embeddedLogo ? 286 : 330 });
  addText(doc, model.kind === "QUOTE" ? copy.quote : copy.invoice, PAGE.width - PAGE.margin, y + 5, { size: 23, color: COLOR.ink, style: "bold", align: "right" });
  y += 30;
  const contact = [model.branding.phone, model.branding.email, model.branding.website, model.branding.region].filter(Boolean).join("  |  ");
  if (contact) y = addText(doc, contact, PAGE.margin, y, { size: 8.5, color: COLOR.muted, maxWidth: contentWidth });
  if (model.draft) addText(doc, copy.draft, PAGE.width - PAGE.margin, y, { size: 9, color: COLOR.accent, style: "bold", align: "right" });
  y += 8;
  doc.setDrawColor(...COLOR.ink);
  doc.setLineWidth(1.2);
  doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
  y += 10;

  const documentDate = model.documentDate ? formatCustomerDocumentDate(model.documentDate, model.locale) : "-";
  const dueDate = model.dueDate ? formatCustomerDocumentDate(model.dueDate, model.locale) : null;
  const meta = [
    model.customer.name ? [copy.customer, model.customer.name] : null,
    model.projectTitle ? [copy.project, model.projectTitle] : null,
    [model.kind === "QUOTE" ? copy.quote : copy.invoice, model.documentNumber || (model.draft ? copy.draft : "-")],
    [dueDate ? `${copy.date} / ${copy.dueDate}` : copy.date, dueDate ? `${documentDate} / ${dueDate}` : documentDate],
  ].filter(Boolean);
  const metaWidth = contentWidth / meta.length;
  const metaValueWidth = metaWidth - 16;
  const maxMetaValueLines = Math.max(
    ...meta.map(([, value]) => doc.splitTextToSize(String(value || ""), metaValueWidth).length),
    1
  );
  const metaHeight = 34 + Math.max(0, maxMetaValueLines - 1) * 8.5 * 1.25;
  doc.setFillColor(...COLOR.fill);
  doc.setDrawColor(...COLOR.line);
  doc.rect(PAGE.margin, y, contentWidth, metaHeight, "FD");
  meta.forEach(([label, value], index) => {
    const x = PAGE.margin + metaWidth * index + 8;
    addText(doc, label.toUpperCase(), x, y + 11, { size: 6.8, color: COLOR.muted, style: "bold" });
    addText(doc, value, x, y + 25, { size: 8.5, color: COLOR.text, style: "bold", maxWidth: metaValueWidth });
  });
  y += metaHeight + 14;

  section(model.kind === "QUOTE" ? copy.scope : copy.work, model.scopeSummary);

  if (model.lineItems.length > 0) {
    ensureSpace(70);
    if (model.kind === "INVOICE") {
      y = addText(doc, copy.description, PAGE.margin, y, { size: 12, color: COLOR.ink, style: "bold" });
    }
    const columns = { description: PAGE.margin, quantity: 376, unit: 430, amount: 512 };
    doc.setFillColor(...COLOR.fill);
    doc.rect(PAGE.margin, y + 3, contentWidth, 22, "F");
    addText(doc, copy.description, columns.description + 7, y + 17, { size: 7.5, color: COLOR.muted, style: "bold" });
    addText(doc, copy.quantity, columns.quantity, y + 17, { size: 7.5, color: COLOR.muted, style: "bold" });
    addText(doc, copy.unit, columns.unit, y + 17, { size: 7.5, color: COLOR.muted, style: "bold" });
    addText(doc, copy.amount, columns.amount, y + 17, { size: 7.5, color: COLOR.muted, style: "bold" });
    y += 31;
    for (const item of model.lineItems) {
      const descriptionLines = doc.splitTextToSize(item.description, 300);
      const rowHeight = Math.max(22, descriptionLines.length * 12 + 8);
      ensureSpace(rowHeight + 4);
      addText(doc, item.description, columns.description + 7, y + 10, { size: 8.8, maxWidth: 300 });
      addText(doc, String(item.quantity), columns.quantity, y + 10, { size: 8.8 });
      addText(doc, item.unitAmountMinor == null ? "-" : formatMoney(item.unitAmountMinor, model.currency, model.locale), columns.unit, y + 10, { size: 8.3 });
      addText(doc, formatMoney(item.lineTotalMinor, model.currency, model.locale), columns.amount, y + 10, { size: 8.3, style: "bold" });
      doc.setDrawColor(...COLOR.line);
      doc.line(PAGE.margin, y + rowHeight, PAGE.width - PAGE.margin, y + rowHeight);
      y += rowHeight + 3;
    }
    y += 5;
  }

  ensureSpace(model.kind === "INVOICE" ? 126 : 82);
  const totalLabel = model.kind === "QUOTE" ? copy.projectPrice : copy.totalDue;
  doc.setDrawColor(...COLOR.ink);
  doc.setFillColor(...COLOR.fill);
  doc.setLineWidth(1.2);
  doc.rect(PAGE.margin, y, contentWidth, 48, "FD");
  addText(doc, totalLabel, PAGE.margin + 28, y + 29, { size: 11, color: COLOR.ink, style: "bold" });
  addText(doc, formatMoney(model.kind === "INVOICE" ? model.balanceMinor ?? model.totalMinor : model.totalMinor, model.currency, model.locale), PAGE.width - PAGE.margin - 28, y + 31, { size: 22, color: COLOR.ink, style: "bold", align: "right" });
  y += 62;
  const financialRows = [
    model.subtotalMinor != null ? [copy.subtotal, model.subtotalMinor] : null,
    model.discountMinor ? [copy.discount, -model.discountMinor] : null,
    model.taxMinor ? [copy.tax, model.taxMinor] : null,
    model.feesMinor ? [copy.fees, model.feesMinor] : null,
    model.kind === "INVOICE" && model.paidMinor != null ? [copy.paid, model.paidMinor] : null,
  ].filter(Boolean);
  for (const [label, amount] of financialRows) {
    ensureSpace(18);
    addText(doc, label, PAGE.margin + 300, y, { size: 8.5, color: COLOR.muted });
    addText(doc, formatMoney(amount, model.currency, model.locale), PAGE.width - PAGE.margin, y, { size: 8.5, style: "bold", align: "right" });
    y += 16;
  }
  y += 4;

  section(copy.paymentTerms, model.paymentTerms === "DUE_ON_RECEIPT" ? copy.dueReceipt : model.paymentTerms);
  section(copy.duration, model.estimatedDuration);
  bulletSection(copy.conditions, model.conditions);
  bulletSection(copy.exclusions, model.exclusions);
  section(copy.notes, model.notes);
  section(copy.warranty, model.warrantyNotes);
  section(copy.message, model.customerMessage);
  section(copy.acceptance, readableStatus(model, copy));

  const pages = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(...COLOR.line);
    doc.line(PAGE.margin, PAGE.footerY - 10, PAGE.width - PAGE.margin, PAGE.footerY - 10);
    addText(doc, model.branding.name, PAGE.margin, PAGE.footerY, { size: 7, color: COLOR.muted });
    addText(doc, `${copy.preparedWith}  |  ${pageNumber} / ${pages}`, PAGE.width - PAGE.margin, PAGE.footerY, { size: 7, color: COLOR.muted, align: "right" });
  }
  doc.setProperties({
    title: `${model.kind === "QUOTE" ? copy.quote : copy.invoice} ${model.documentNumber || ""}`.trim(),
    subject: model.draft ? copy.draft : readableStatus(model, copy),
    author: model.branding.name,
    creator: "Meetro",
  });
  return doc;
}

export function createCustomerDocumentPdfArtifact(model, options = {}) {
  const doc = renderCustomerDocumentPdf(model, options);
  const blob = doc.output("blob");
  const fileName = safeFileName(model);
  const title = `${model.kind === "QUOTE" ? labels(model.locale).quote : labels(model.locale).invoice} ${model.documentNumber || ""}`.trim();
  return Object.freeze({ doc, blob, fileName, title });
}

export function previewCustomerDocumentPdf(
  model,
  {
    createArtifact = createCustomerDocumentPdfArtifact,
    urlApi = globalThis.URL,
    openWindow = globalThis.open,
    scheduleRevoke = globalThis.setTimeout,
  } = {}
) {
  if (typeof urlApi?.createObjectURL !== "function" || typeof openWindow !== "function") {
    return Object.freeze({ ok: false, method: "unavailable" });
  }
  const artifact = createArtifact(model);
  const objectUrl = urlApi.createObjectURL(artifact.blob);
  let revoked = false;
  const revokeOnce = () => {
    if (revoked) return;
    revoked = true;
    urlApi.revokeObjectURL?.(objectUrl);
  };
  try {
    openWindow(objectUrl, "_blank", "noopener,noreferrer");
  } catch {
    revokeOnce();
    return Object.freeze({ ok: false, method: "blocked" });
  }
  if (typeof scheduleRevoke === "function") {
    scheduleRevoke(revokeOnce, 60_000);
  }
  return Object.freeze({ ok: true, method: "pdf-preview", fileName: artifact.fileName });
}

async function resolveCustomerDocumentLogo(model, fetchImpl = globalThis.fetch) {
  const logoUrl = model?.branding?.logoUrl;
  if (!logoUrl || logoUrl.startsWith("data:image/") || typeof fetchImpl !== "function") return model;
  try {
    const response = await fetchImpl(logoUrl, { method: "GET", credentials: "omit", cache: "force-cache" });
    if (!response.ok) return model;
    const blob = await response.blob();
    if (!new Set(["image/png", "image/jpeg"]).has(blob.type) || blob.size > 2_000_000) return model;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    const base64 = globalThis.btoa?.(binary);
    if (!base64) return model;
    return Object.freeze({
      ...model,
      branding: Object.freeze({
        ...model.branding,
        logoUrl: `data:${blob.type};base64,${base64}`,
      }),
    });
  } catch {
    return model;
  }
}

async function createCustomerDocumentPdfArtifactWithLogo(model, options = {}) {
  return createCustomerDocumentPdfArtifact(
    await resolveCustomerDocumentLogo(model, options.fetchImpl),
    options
  );
}

export async function downloadCustomerDocumentPdf(model, { documentObject = globalThis.document, urlObject = globalThis.URL, fetchImpl = globalThis.fetch } = {}) {
  if (!documentObject?.createElement || !urlObject?.createObjectURL) return false;
  const artifact = await createCustomerDocumentPdfArtifactWithLogo(model, { fetchImpl });
  const url = urlObject.createObjectURL(artifact.blob);
  const link = documentObject.createElement("a");
  link.href = url;
  link.download = artifact.fileName;
  link.rel = "noopener";
  documentObject.body?.appendChild?.(link);
  link.click();
  link.remove?.();
  urlObject.revokeObjectURL?.(url);
  return true;
}

async function shareNativePdf(artifact, { nativeFilesystem = Filesystem, nativeShare = Share } = {}) {
  const data = artifact.doc.output("datauristring").split(",")[1];
  const path = `meetro-customer-documents/${artifact.fileName}`;
  await nativeFilesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true });
  const { uri } = await nativeFilesystem.getUri({ path, directory: Directory.Cache });
  try {
    await nativeShare.share({ title: artifact.title, files: [uri], dialogTitle: artifact.title });
  } finally {
    await nativeFilesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {});
  }
}

function cancelled(error) {
  return error?.name === "AbortError" || String(error?.message || "").toLowerCase().includes("cancel");
}

export async function shareCustomerDocumentPdf({
  model,
  message = "",
  platform = Capacitor.getPlatform(),
  isNative = Capacitor.isNativePlatform(),
  nativePdfShare = shareNativePdf,
  webShare = globalThis.navigator?.share?.bind(globalThis.navigator),
  canShare = globalThis.navigator?.canShare?.bind(globalThis.navigator),
  download = downloadCustomerDocumentPdf,
} = {}) {
  if (!validateModel(model)) return { ok: false, method: "unavailable" };
  const artifact = await createCustomerDocumentPdfArtifactWithLogo(model);
  try {
    if (isNative && (platform === "ios" || platform === "android") && typeof nativePdfShare === "function") {
      await nativePdfShare(artifact);
      return { ok: true, method: "native-pdf", fileName: artifact.fileName };
    }
    const file = typeof File === "function"
      ? new File([artifact.blob], artifact.fileName, { type: "application/pdf" })
      : Object.assign(artifact.blob, { name: artifact.fileName });
    const payload = { title: artifact.title, text: message, files: [file] };
    if (typeof webShare === "function" && (typeof canShare !== "function" || canShare({ files: [file] }))) {
      await webShare(payload);
      return { ok: true, method: "web-pdf", fileName: artifact.fileName };
    }
    if (typeof download === "function" && download(model)) {
      return { ok: true, method: "download", fileName: artifact.fileName };
    }
  } catch (error) {
    if (cancelled(error)) return { ok: false, method: "cancelled" };
    throw error;
  }
  return { ok: false, method: "unavailable" };
}
