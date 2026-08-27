import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { jsPDF } from "jspdf";

const PAGE = Object.freeze({ width: 612, height: 792, margin: 48, footerY: 766 });
const COLOR = Object.freeze({ ink: [24, 49, 70], text: [42, 45, 48], muted: [91, 105, 116], line: [196, 209, 218], fill: [242, 246, 248], accent: [31, 81, 50], white: [255, 255, 255] });

const LABELS = Object.freeze({
  en: Object.freeze({ quote: "QUOTE", invoice: "INVOICE", customer: "Customer", project: "Project", date: "Date", dueDate: "Due date", scope: "Scope of Work", work: "Work Performed", description: "Description", quantity: "Qty", unit: "Unit", amount: "Amount", subtotal: "Subtotal", discount: "Discount", tax: "Tax", fees: "Fees", projectPrice: "PROJECT PRICE", totalDue: "TOTAL DUE", paid: "Amount paid", balance: "BALANCE DUE", paymentTerms: "Payment Terms", duration: "Estimated Duration", conditions: "Project Conditions", exclusions: "Not Included", notes: "Notes", warranty: "Warranty Notes", message: "Customer Message", acceptance: "Acceptance / Status", awaiting: "Awaiting customer decision in Meetro", approved: "Approved in Meetro", declined: "Declined in Meetro", dueReceipt: "Due on receipt", preparedWith: "Prepared with Meetro", exportPdf: "Export PDF", sharePdf: "Share PDF", pdfReady: "PDF ready.", pdfUnavailable: "PDF export is unavailable on this device." }),
  es: Object.freeze({ quote: "COTIZACION", invoice: "FACTURA", customer: "Cliente", project: "Proyecto", date: "Fecha", dueDate: "Vencimiento", scope: "Alcance del trabajo", work: "Trabajo realizado", description: "Descripcion", quantity: "Cant.", unit: "Unidad", amount: "Importe", subtotal: "Subtotal", discount: "Descuento", tax: "Impuesto", fees: "Cargos", projectPrice: "PRECIO DEL PROYECTO", totalDue: "TOTAL", paid: "Pagado", balance: "SALDO PENDIENTE", paymentTerms: "Terminos de pago", duration: "Duracion estimada", conditions: "Condiciones del proyecto", exclusions: "No incluido", notes: "Notas", warranty: "Garantia", message: "Mensaje al cliente", acceptance: "Aceptacion / Estado", awaiting: "Esperando la decision del cliente en Meetro", approved: "Aprobada en Meetro", declined: "Rechazada en Meetro", dueReceipt: "Vence al recibir", preparedWith: "Preparado con Meetro", exportPdf: "Exportar PDF", sharePdf: "Compartir PDF", pdfReady: "PDF listo.", pdfUnavailable: "La exportacion PDF no esta disponible en este dispositivo." }),
  fr: Object.freeze({ quote: "DEVIS", invoice: "FACTURE", customer: "Client", project: "Projet", date: "Date", dueDate: "Echeance", scope: "Etendue des travaux", work: "Travaux effectues", description: "Description", quantity: "Qte", unit: "Unite", amount: "Montant", subtotal: "Sous-total", discount: "Remise", tax: "Taxe", fees: "Frais", projectPrice: "PRIX DU PROJET", totalDue: "TOTAL DU", paid: "Montant paye", balance: "SOLDE DU", paymentTerms: "Conditions de paiement", duration: "Duree estimee", conditions: "Conditions du projet", exclusions: "Non inclus", notes: "Notes", warranty: "Garantie", message: "Message au client", acceptance: "Acceptation / Statut", awaiting: "En attente de la decision du client dans Meetro", approved: "Approuve dans Meetro", declined: "Refuse dans Meetro", dueReceipt: "Du a reception", preparedWith: "Prepare avec Meetro", exportPdf: "Exporter le PDF", sharePdf: "Partager le PDF", pdfReady: "PDF pret.", pdfUnavailable: "L'exportation PDF n'est pas disponible sur cet appareil." }),
  "pt-BR": Object.freeze({ quote: "ORCAMENTO", invoice: "FATURA", customer: "Cliente", project: "Projeto", date: "Data", dueDate: "Vencimento", scope: "Escopo do trabalho", work: "Trabalho realizado", description: "Descricao", quantity: "Qtd.", unit: "Unidade", amount: "Valor", subtotal: "Subtotal", discount: "Desconto", tax: "Imposto", fees: "Taxas", projectPrice: "PRECO DO PROJETO", totalDue: "TOTAL", paid: "Valor pago", balance: "SALDO DEVIDO", paymentTerms: "Termos de pagamento", duration: "Duracao estimada", conditions: "Condicoes do projeto", exclusions: "Nao incluido", notes: "Notas", warranty: "Garantia", message: "Mensagem ao cliente", acceptance: "Aceite / Status", awaiting: "Aguardando decisao do cliente no Meetro", approved: "Aprovado no Meetro", declined: "Recusado no Meetro", dueReceipt: "Vencimento no recebimento", preparedWith: "Preparado com Meetro", exportPdf: "Exportar PDF", sharePdf: "Compartilhar PDF", pdfReady: "PDF pronto.", pdfUnavailable: "A exportacao de PDF nao esta disponivel neste dispositivo." }),
});

const PARITY_LABELS = Object.freeze({
  en: Object.freeze({ observation: "Observation", confirmTerms: "Confirm terms before delivery.", notConfirmed: "Not confirmed." }),
  es: Object.freeze({ observation: "Observacion", confirmTerms: "Confirma los terminos antes de entregar.", notConfirmed: "Sin confirmar." }),
  fr: Object.freeze({ observation: "Observation", confirmTerms: "Confirmez les conditions avant la remise.", notConfirmed: "Non confirme." }),
  "pt-BR": Object.freeze({ observation: "Observacao", confirmTerms: "Confirme os termos antes da entrega.", notConfirmed: "Nao confirmado." }),
});

const PHOTO_LABELS = Object.freeze({
  en: Object.freeze({ projectPhotos: "Project Photos / Evidence", beforePhotos: "Before Photos", afterPhotos: "After Photos" }),
  es: Object.freeze({ projectPhotos: "Fotos / evidencia del proyecto", beforePhotos: "Fotos de antes", afterPhotos: "Fotos de despues" }),
  fr: Object.freeze({ projectPhotos: "Photos / preuves du projet", beforePhotos: "Photos avant", afterPhotos: "Photos apres" }),
  "pt-BR": Object.freeze({ projectPhotos: "Fotos / evidencias do projeto", beforePhotos: "Fotos de antes", afterPhotos: "Fotos de depois" }),
});

const AGREEMENT_LABELS = Object.freeze({
  en: Object.freeze({ additionalWork: "Additional Work / Change Orders", hiddenConditions: "Hidden / Unforeseen Conditions", diagnostic: "Diagnostic / Troubleshooting Fees", customerResponsibilities: "Customer Responsibilities", warranty: "Warranty / Workmanship", cancellation: "Cancellation / Rescheduling", preauthorizedLimit: "Pre-authorized Additional Work Limit", acceptance: "Acceptance Terms" }),
  es: Object.freeze({ additionalWork: "Trabajo adicional / Ordenes de cambio", hiddenConditions: "Condiciones ocultas / imprevistas", diagnostic: "Diagnostico / resolucion de problemas", customerResponsibilities: "Responsabilidades del cliente", warranty: "Garantia / mano de obra", cancellation: "Cancelacion / reprogramacion", preauthorizedLimit: "Limite preautorizado de trabajo adicional", acceptance: "Terminos de aceptacion" }),
  fr: Object.freeze({ additionalWork: "Travaux supplementaires / Avenants", hiddenConditions: "Conditions cachees / imprevues", diagnostic: "Diagnostic / depannage", customerResponsibilities: "Responsabilites du client", warranty: "Garantie / main-d'oeuvre", cancellation: "Annulation / report", preauthorizedLimit: "Limite preautorisee de travaux supplementaires", acceptance: "Conditions d'acceptation" }),
  "pt-BR": Object.freeze({ additionalWork: "Trabalho adicional / Alteracoes", hiddenConditions: "Condicoes ocultas / imprevistas", diagnostic: "Diagnostico / solucao de problemas", customerResponsibilities: "Responsabilidades do cliente", warranty: "Garantia / mao de obra", cancellation: "Cancelamento / reagendamento", preauthorizedLimit: "Limite pre-autorizado de trabalho adicional", acceptance: "Termos de aceite" }),
});

const WORKING_DRAFT_LABELS = Object.freeze({
  en: Object.freeze({ unsavedLabel: "DRAFT PREVIEW", savedLabel: "READY FOR CUSTOMER REVIEW", unsavedStatus: "Draft Preview — Not Saved or Issued", savedStatus: "Ready for Customer Review" }),
  es: Object.freeze({ unsavedLabel: "VISTA PREVIA", savedLabel: "LISTO PARA REVISION DEL CLIENTE", unsavedStatus: "Vista previa del borrador — No guardado ni emitido", savedStatus: "Listo para revision del cliente" }),
  fr: Object.freeze({ unsavedLabel: "APERCU DU BROUILLON", savedLabel: "PRET POUR EXAMEN CLIENT", unsavedStatus: "Apercu du brouillon — Non enregistre ni emis", savedStatus: "Pret pour examen du client" }),
  "pt-BR": Object.freeze({ unsavedLabel: "PRE-VISUALIZACAO", savedLabel: "PRONTO PARA REVISAO DO CLIENTE", unsavedStatus: "Pre-visualizacao do rascunho — Nao salvo nem emitido", savedStatus: "Pronto para revisao do cliente" }),
});

function labels(locale) {
  const language = LABELS[locale] ? locale : "en";
  return Object.freeze({ ...LABELS[language], ...PARITY_LABELS[language] });
}

function photoLabels(locale) {
  return PHOTO_LABELS[locale] || PHOTO_LABELS.en;
}

function agreementLabels(locale) {
  return AGREEMENT_LABELS[locale] || AGREEMENT_LABELS.en;
}

function workingDraftLabels(locale) {
  return WORKING_DRAFT_LABELS[locale] || WORKING_DRAFT_LABELS.en;
}

function draftPresentation(model) {
  const copy = workingDraftLabels(model.locale);
  return model.workingDraftStatus === "SAVED"
    ? { label: copy.savedLabel, status: copy.savedStatus }
    : { label: copy.unsavedLabel, status: copy.unsavedStatus };
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
  if (model.draft) return draftPresentation(model).status;
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
    model.draft ? draftPresentation(model).status : "",
    model.documentNumber,
    model.customer.name,
    model.customer.phone,
    model.customer.email,
    model.customer.address,
    model.projectTitle,
    model.projectLocation,
    model.observation,
    model.scopeSummary,
    model.photoEvidence?.projectPhotos?.length ? photoLabels(model.locale).projectPhotos : null,
    model.photoEvidence?.beforePhotos?.length ? photoLabels(model.locale).beforePhotos : null,
    model.photoEvidence?.afterPhotos?.length ? photoLabels(model.locale).afterPhotos : null,
    ...model.lineItems.flatMap((item) => [
      item.description,
      item.pricingPresentation === "flat" ? null : item.quantity,
      item.pricingPresentation === "flat" ? null : item.unitAmountMinor,
      item.lineTotalMinor,
    ]),
    model.subtotalMinor,
    model.discountMinor,
    model.taxMinor,
    model.feesMinor,
    model.totalMinor,
    model.paidMinor,
    model.balanceMinor,
    model.paymentTerms,
    model.pricingNote,
    model.depositLabel,
    model.depositDueMinor,
    model.remainingBalanceMinor,
    model.estimatedDuration,
    ...model.conditions,
    ...model.exclusions,
    model.notes,
    model.warrantyNotes,
    model.customerMessage,
    model.acceptance,
    ...(model.agreement?.exclusions || []),
    model.agreement?.additionalWorkTerms,
    model.agreement?.hiddenConditionsTerms,
    model.agreement?.diagnosticTerms,
    model.agreement?.customerResponsibilities,
    model.agreement?.warrantyTerms,
    model.agreement?.cancellationTerms,
    model.agreement?.preauthorizedAdditionalWorkLimit,
    model.agreement?.acceptanceTerms,
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

  function photoSection(title, photos) {
    if (!photos?.length) return;
    if (photos.some((photo) => !photo.dataUrl)) {
      throw new TypeError("Customer-visible photo evidence must be prepared before PDF rendering.");
    }
    ensureSpace(140);
    y = addText(doc, title, PAGE.margin, y, { size: 12, color: COLOR.ink, style: "bold" });
    y += 5;
    const gap = 10;
    const columns = 3;
    const width = (contentWidth - gap * (columns - 1)) / columns;
    const height = 96;
    for (let index = 0; index < photos.length; index += columns) {
      ensureSpace(height + 10);
      photos.slice(index, index + columns).forEach((photo, column) => {
        const dataFormat = photo.dataUrl.match(/^data:image\/(png|jpeg|webp);/i)?.[1];
        const photoFormat = (dataFormat || photo.format || "").toUpperCase() === "JPG"
          ? "JPEG"
          : (dataFormat || photo.format || "").toUpperCase();
        const sourceWidth = Number(photo.width) || width;
        const sourceHeight = Number(photo.height) || height;
        const scale = Math.min(width / sourceWidth, height / sourceHeight);
        const renderedWidth = sourceWidth * scale;
        const renderedHeight = sourceHeight * scale;
        doc.addImage(
          photo.dataUrl,
          photoFormat || undefined,
          PAGE.margin + column * (width + gap) + (width - renderedWidth) / 2,
          y + (height - renderedHeight) / 2,
          renderedWidth,
          renderedHeight,
          undefined,
          "FAST"
        );
      });
      y += height + 10;
    }
    y += 4;
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
  if (model.draft) addText(doc, draftPresentation(model).label, PAGE.width - PAGE.margin, y, { size: 9, color: COLOR.accent, style: "bold", align: "right" });
  y += 8;
  doc.setDrawColor(...COLOR.ink);
  doc.setLineWidth(1.2);
  doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
  y += 10;

  const documentDate = model.documentDate ? formatCustomerDocumentDate(model.documentDate, model.locale) : "-";
  const dueDate = model.dueDate ? formatCustomerDocumentDate(model.dueDate, model.locale) : null;
  const meta = [
    model.customer.name || model.projectLocation
      ? [
          copy.customer,
          [model.customer.name, model.projectLocation]
            .filter(Boolean)
            .join("\n"),
        ]
      : null,
    model.projectTitle ? [copy.project, model.projectTitle] : null,
    [model.kind === "QUOTE" ? copy.quote : copy.invoice, model.documentNumber || (model.draft ? draftPresentation(model).label : "-")],
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

  section(copy.observation, model.observation);
  section(model.kind === "QUOTE" ? copy.scope : copy.work, model.scopeSummary);
  const evidenceLabels = photoLabels(model.locale);
  photoSection(evidenceLabels.projectPhotos, model.photoEvidence?.projectPhotos);
  photoSection(evidenceLabels.beforePhotos, model.photoEvidence?.beforePhotos);
  photoSection(evidenceLabels.afterPhotos, model.photoEvidence?.afterPhotos);

  if (model.lineItems.length > 0) {
    ensureSpace(70);

    if (model.kind === "INVOICE") {
      y = addText(doc, copy.description, PAGE.margin, y, {
        size: 12,
        color: COLOR.ink,
        style: "bold",
      });
    }

    const showUnitPricingColumns = model.lineItems.some(
      (item) => item.pricingPresentation !== "flat"
    );
    const columns = {
      description: PAGE.margin,
      quantity: 376,
      unit: 430,
      amount: 512,
    };
    const descriptionWidth = showUnitPricingColumns ? 300 : 420;

    doc.setFillColor(...COLOR.fill);
    doc.rect(PAGE.margin, y + 3, contentWidth, 22, "F");
    addText(doc, copy.description, columns.description + 7, y + 17, {
      size: 7.5,
      color: COLOR.muted,
      style: "bold",
    });

    if (showUnitPricingColumns) {
      addText(doc, copy.quantity, columns.quantity, y + 17, {
        size: 7.5,
        color: COLOR.muted,
        style: "bold",
      });
      addText(doc, copy.unit, columns.unit, y + 17, {
        size: 7.5,
        color: COLOR.muted,
        style: "bold",
      });
    }

    addText(doc, copy.amount, columns.amount, y + 17, {
      size: 7.5,
      color: COLOR.muted,
      style: "bold",
    });

    y += 31;

    for (const item of model.lineItems) {
      const descriptionLines = doc.splitTextToSize(
        item.description,
        descriptionWidth
      );
      const rowHeight = Math.max(22, descriptionLines.length * 12 + 8);
      ensureSpace(rowHeight + 4);

      addText(doc, item.description, columns.description + 7, y + 10, {
        size: 8.8,
        maxWidth: descriptionWidth,
      });

      if (item.pricingPresentation !== "flat") {
        addText(doc, String(item.quantity), columns.quantity, y + 10, {
          size: 8.8,
        });
        addText(
          doc,
          item.unitAmountMinor == null
            ? "-"
            : formatMoney(
                item.unitAmountMinor,
                model.currency,
                model.locale
              ),
          columns.unit,
          y + 10,
          { size: 8.3 }
        );
      }

      addText(
        doc,
        formatMoney(
          item.lineTotalMinor,
          model.currency,
          model.locale
        ),
        columns.amount,
        y + 10,
        { size: 8.3, style: "bold" }
      );

      doc.setDrawColor(...COLOR.line);
      doc.line(
        PAGE.margin,
        y + rowHeight,
        PAGE.width - PAGE.margin,
        y + rowHeight
      );
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

  section("Pricing", model.pricingNote);
  if (model.kind === "QUOTE" && model.depositLabel && model.depositDueMinor != null) {
    section(
      "Deposit",
      `${model.depositLabel} — ${formatMoney(model.depositDueMinor, model.currency, model.locale)}${model.remainingBalanceMinor != null ? `\nRemaining balance — ${formatMoney(model.remainingBalanceMinor, model.currency, model.locale)}` : ""}`
    );
  }

  section(copy.paymentTerms, model.paymentTerms === "DUE_ON_RECEIPT"
    ? copy.dueReceipt
    : model.paymentTerms || (model.kind === "QUOTE" ? copy.confirmTerms : copy.notConfirmed));
  if (model.kind === "QUOTE") section(copy.duration, model.estimatedDuration || copy.notConfirmed);
  bulletSection(copy.conditions, model.conditions);
  bulletSection(copy.exclusions, model.exclusions);
  if (model.kind === "QUOTE") {
    const agreementCopy = agreementLabels(model.locale);
    bulletSection(copy.exclusions, model.agreement?.exclusions);
    section(agreementCopy.additionalWork, model.agreement?.additionalWorkTerms);
    section(agreementCopy.hiddenConditions, model.agreement?.hiddenConditionsTerms);
    section(agreementCopy.diagnostic, model.agreement?.diagnosticTerms);
    section(agreementCopy.customerResponsibilities, model.agreement?.customerResponsibilities);
    section(agreementCopy.preauthorizedLimit, model.agreement?.preauthorizedAdditionalWorkLimit);
    section(agreementCopy.cancellation, model.agreement?.cancellationTerms);
    section(agreementCopy.warranty, model.agreement?.warrantyTerms);
    section(agreementCopy.acceptance, model.agreement?.acceptanceTerms);
  }
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
    subject: model.draft ? draftPresentation(model).status : readableStatus(model, copy),
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

async function customerDocumentImageDataUrl(imageUrl, fetchImpl) {
  if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(imageUrl || "")) return imageUrl;
  if (typeof fetchImpl !== "function") return null;
  const response = await fetchImpl(imageUrl, { method: "GET", credentials: "omit", cache: "force-cache" });
  if (!response.ok) return null;
  const blob = await response.blob();
  if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(blob.type) || blob.size > 12_000_000) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  const base64 = globalThis.btoa?.(binary);
  return base64 ? `data:${blob.type};base64,${base64}` : null;
}

export async function prepareCustomerDocumentPdfModel(model, { fetchImpl = globalThis.fetch } = {}) {
  const withLogo = await resolveCustomerDocumentLogo(model, fetchImpl);
  if (!withLogo.photoEvidence) return withLogo;
  const preparedGroups = {};
  for (const group of ["projectPhotos", "beforePhotos", "afterPhotos"]) {
    preparedGroups[group] = Object.freeze(await Promise.all((withLogo.photoEvidence[group] || []).map(async (photo) => {
      const dataUrl = await customerDocumentImageDataUrl(photo.dataUrl || photo.imageUrl, fetchImpl);
      if (!dataUrl) {
        const error = new Error("Customer-visible photo evidence is unavailable for PDF output.");
        error.code = "CUSTOMER_DOCUMENT_PHOTO_UNAVAILABLE";
        throw error;
      }
      return Object.freeze({ ...photo, dataUrl });
    })));
  }
  return Object.freeze({
    ...withLogo,
    photoEvidence: Object.freeze(preparedGroups),
  });
}

async function createCustomerDocumentPdfArtifactWithLogo(model, options = {}) {
  return createCustomerDocumentPdfArtifact(
    await prepareCustomerDocumentPdfModel(model, options),
    options
  );
}

export async function previewCustomerDocumentPdfWithMedia(model, options = {}) {
  const remoteLogo = Boolean(model?.branding?.logoUrl && !model.branding.logoUrl.startsWith("data:image/"));
  const remotePhoto = ["projectPhotos", "beforePhotos", "afterPhotos"].some((group) =>
    model?.photoEvidence?.[group]?.some((photo) => !photo.dataUrl)
  );
  if (!remoteLogo && !remotePhoto) return previewCustomerDocumentPdf(model, options);
  const openWindow = options.openWindow || globalThis.open;
  let reservedWindow = null;
  if (typeof openWindow === "function") {
    try {
      reservedWindow = openWindow("", "_blank");
      if (reservedWindow) reservedWindow.opener = null;
    } catch {
      reservedWindow = null;
    }
  }
  try {
    const result = previewCustomerDocumentPdf(
      await prepareCustomerDocumentPdfModel(model, options),
      {
        ...options,
        openWindow: (url, target, features) => {
          if (reservedWindow?.location) {
            reservedWindow.location.replace?.(url);
            return reservedWindow;
          }
          return openWindow?.(url, target, features);
        },
      }
    );
    if (!result.ok) reservedWindow?.close?.();
    return result;
  } catch (error) {
    reservedWindow?.close?.();
    if (error?.code === "CUSTOMER_DOCUMENT_PHOTO_UNAVAILABLE") {
      return Object.freeze({ ok: false, method: "photo-unavailable" });
    }
    throw error;
  }
}

export async function downloadCustomerDocumentPdf(model, { documentObject = globalThis.document, urlObject = globalThis.URL, fetchImpl = globalThis.fetch } = {}) {
  if (!documentObject?.createElement || !urlObject?.createObjectURL) return false;
  let artifact;
  try {
    artifact = await createCustomerDocumentPdfArtifactWithLogo(model, { fetchImpl });
  } catch (error) {
    if (error?.code === "CUSTOMER_DOCUMENT_PHOTO_UNAVAILABLE") return false;
    throw error;
  }
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
  try {
    const artifact = await createCustomerDocumentPdfArtifactWithLogo(model);
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
    if (typeof download === "function" && await download(model)) {
      return { ok: true, method: "download", fileName: artifact.fileName };
    }
  } catch (error) {
    if (cancelled(error)) return { ok: false, method: "cancelled" };
    if (error?.code === "CUSTOMER_DOCUMENT_PHOTO_UNAVAILABLE") return { ok: false, method: "unavailable" };
    throw error;
  }
  return { ok: false, method: "unavailable" };
}
