import { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage } from "../utils/language";
import { getWorkCenterContextReturnLabel } from "../utils/workCenterReturnLabels";
import {
  calculateInvoiceTotals,
  moneyValue,
  normalizeInvoiceLineItems,
} from "../utils/invoiceCalculations";
import {
  getActiveJobSnapshot,
  getBusinessSchedule,
  saveBusinessSchedule,
} from "../utils/workCenter";
import { formatMessageTime } from "../utils/displayTime";
import { restoreConversationOriginContext } from "../utils/conversationOrigin";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyLineItem() {
  return {
    id: `line_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: "labor",
    description: "",
    quantity: "1",
    unitPrice: "",
  };
}

function formatMoney(value) {
  return `$${moneyValue(value).toFixed(2)}`;
}

function getInvoiceFingerprint(invoice) {
  return JSON.stringify({
    invoiceNumber: invoice.invoiceNumber || "",
    invoiceDate: invoice.invoiceDate || "",
    dueDate: invoice.dueDate || "",
    customerName: invoice.customerName || "",
    customerPhone: invoice.customerPhone || "",
    customerEmail: invoice.customerEmail || "",
    serviceAddress: invoice.serviceAddress || "",
    serviceDescription: invoice.serviceDescription || "",
    jobReference: invoice.jobReference || "",
    completionDate: invoice.completionDate || "",
    workPerformed: invoice.workPerformed || "",
    lineItems: normalizeInvoiceLineItems(invoice.lineItems || []),
    labor: invoice.labor || "",
    materials: invoice.materials || "",
    serviceFee: invoice.serviceFee || "",
    discount: invoice.discount || "",
    tax: invoice.tax || "",
    otherCharges: invoice.otherCharges || "",
    total: moneyValue(invoice.total),
    notes: invoice.notes || "",
    paymentTerms: invoice.paymentTerms || "",
    warrantyNotes: invoice.warrantyNotes || "",
    customerMessage: invoice.customerMessage || "",
  });
}

function InvoiceBuilder({ setPage }) {
  const activeJobSnapshot = getActiveJobSnapshot();

  const language = getLanguage();
  const isSpanish = language === "es";
  const invoiceCopy = {
    customerInformation: isSpanish ? "Información del cliente" : "Customer Information",
    customerName: isSpanish ? "Nombre del cliente" : "Customer Name",
    phone: isSpanish ? "Teléfono" : "Phone",
    email: isSpanish ? "Correo electrónico" : "Email",
    serviceAddress: isSpanish ? "Dirección del servicio" : "Service Address",
    invoiceNumber: isSpanish ? "Número de factura" : "Invoice Number",
    invoiceDate: isSpanish ? "Fecha de factura" : "Invoice Date",
    dueDate: isSpanish ? "Fecha de vencimiento" : "Due Date",
    jobWork: isSpanish ? "Trabajo / servicio" : "Job / Work",
    workPerformedSummary: isSpanish ? "Resumen del trabajo realizado" : "Work performed summary",
    serviceDescription: isSpanish ? "Descripción del servicio" : "Service description",
    serviceDescriptionPlaceholder: isSpanish ? "Servicio completado según lo solicitado." : "Service completed as requested.",
    jobReference: isSpanish ? "Referencia del trabajo" : "Job reference",
    completionDate: isSpanish ? "Fecha de finalización" : "Completion date",
    aiInvoiceHelp: isSpanish ? "Ayuda de IA para factura" : "AI Invoice Help",
    aiInvoiceSubtitle: isSpanish
      ? "Usa Meetro Assistant para mejorar el texto de la factura, organizar cargos y revisar detalles faltantes."
      : "Use Meetro Assistant to improve invoice wording, organize charges, and check for missing details.",
    improveWording: isSpanish ? "Mejorar texto" : "Improve wording",
    checkMissingDetails: isSpanish ? "Revisar detalles faltantes" : "Check missing details",
    makeCustomerFriendly: isSpanish ? "Hacerlo claro para el cliente" : "Make customer friendly",
    addPaymentTerms: isSpanish ? "Agregar términos de pago" : "Add payment terms",
    summarizeWork: isSpanish ? "Resumir trabajo realizado" : "Summarize work performed",
    editableSuggestion: isSpanish ? "Sugerencia editable" : "Editable suggestion",
    useSuggestion: isSpanish ? "Usar sugerencia" : "Use Suggestion",
    clear: isSpanish ? "Borrar" : "Clear",
    lineItems: isSpanish ? "Partidas" : "Line Items",
    lineItemsHint: isSpanish
      ? "Agrega mano de obra, materiales, tarifas de servicio u otros cargos de factura."
      : "Add labor, materials, service fees, or other invoice charges.",
    addItem: isSpanish ? "Agregar partida" : "Add Item",
    item: isSpanish ? "Partida" : "Item",
    remove: isSpanish ? "Eliminar" : "Remove",
    type: isSpanish ? "Tipo" : "Type",
    labor: isSpanish ? "Mano de obra" : "Labor",
    laborPricingType: isSpanish ? "Tipo de mano de obra" : "Labor pricing type",
    flatFee: isSpanish ? "Tarifa fija" : "Flat Fee",
    hourly: isSpanish ? "Por hora" : "Hourly",
    laborFee: isSpanish ? "Tarifa de mano de obra" : "Labor Fee",
    laborHours: isSpanish ? "Horas de mano de obra" : "Labor Hours",
    laborRate: isSpanish ? "Tarifa por hora" : "Labor Rate",
    laborType: isSpanish ? "Tipo de mano de obra" : "Labor Type",
    materials: isSpanish ? "Materiales" : "Materials",
    serviceFee: isSpanish ? "Tarifa de servicio" : "Service fee",
    other: isSpanish ? "Otro" : "Other",
    description: isSpanish ? "Descripción" : "Description",
    lineItemPlaceholder: isSpanish
      ? "Describe el trabajo, material o cargo."
      : "Describe the work, material, or charge.",
    quantity: isSpanish ? "Cant." : "Qty",
    unitPrice: isSpanish ? "Precio unitario" : "Unit price",
    amount: isSpanish ? "Monto" : "Amount",
    lineItemsEmpty: isSpanish
      ? "Las partidas son opcionales. Los campos existentes de mano de obra, materiales, tarifa y otros cargos todavía calculan el total."
      : "Line items are optional. Existing labor, materials, service fee, and other charge fields still calculate the invoice total.",
    charges: isSpanish ? "Cargos" : "Charges",
    chargesHint: isSpanish
      ? "Estos totales siguen disponibles para facturas simples y datos guardados anteriores."
      : "These totals remain available for simple invoices and older saved invoice data.",
    discount: isSpanish ? "Descuento" : "Discount",
    tax: isSpanish ? "Impuesto" : "Tax",
    otherCharges: isSpanish ? "Otros cargos" : "Other charges",
    notesTerms: isSpanish ? "Notas / términos" : "Notes / Terms",
    notes: isSpanish ? "Notas" : "Notes",
    paymentTerms: isSpanish ? "Términos de pago" : "Payment terms",
    warrantyNotes: isSpanish ? "Notas de garantía" : "Warranty notes",
    customerMessage: isSpanish ? "Mensaje al cliente" : "Customer message",
    summary: isSpanish ? "Resumen" : "Summary",
    lineItemsSubtotal: isSpanish ? "Subtotal de partidas" : "Line items subtotal",
    laborTotal: isSpanish ? "Total de mano de obra" : "Labor total",
    materialsTotal: isSpanish ? "Total de materiales" : "Materials total",
    subtotal: isSpanish ? "Subtotal" : "Subtotal",
    totalDue: isSpanish ? "Total a pagar" : "Total due",
    saveReceipt: isSpanish ? "Guardar recibo" : "Save Receipt",
    saveInvoice: isSpanish ? "Guardar factura" : "Save Invoice",
    hidePreview: isSpanish ? "Ocultar vista previa" : "Hide Preview",
    previewInvoice: isSpanish ? "Vista previa de factura" : "Preview Invoice",
    copySummary: isSpanish ? "Copiar resumen" : "Copy Summary",
    printInvoice: isSpanish ? "Imprimir factura" : "Print Invoice",
    sendInvoice: isSpanish ? "Enviar factura" : "Send Invoice",
    saveInvoiceFirst: isSpanish ? "Guarda la factura primero" : "Save invoice first",
    saveInvoiceEyebrow: isSpanish ? "Guardar factura" : "Save Invoice",
    saveQuestion: isSpanish ? "¿Dónde quieres guardar esta factura?" : "Where do you want to save this invoice?",
    closeSaveOptions: isSpanish ? "Cerrar opciones de guardado" : "Close save options",
    saveToThisJob: isSpanish ? "Guardar en este trabajo" : "Save to this job",
    saveToThisJobHelp: isSpanish
      ? "Adjunta esta factura al trabajo actual de Work Center y sus registros de soporte."
      : "Attaches this invoice to the current Work Center job and its supporting records.",
    saveToThisJobUnavailable: isSpanish
      ? "Abre desde un trabajo de Work Center para usar esta opción."
      : "Open from a Work Center job to use this option.",
    saveToCustomerHistory: isSpanish ? "Guardar en historial del cliente" : "Save to customer history",
    saveToCustomerHistoryHelp: isSpanish
      ? "Guarda un registro local de solo lectura bajo esta relación con el cliente."
      : "Saves a local read-only invoice record under this customer relationship.",
    saveToCustomerHistoryUnavailable: isSpanish
      ? "Agrega un nombre de cliente para usar esta opción."
      : "Add a customer name to use this option.",
    downloadSavePdf: isSpanish ? "Descargar / guardar PDF" : "Download / Save PDF",
    downloadSavePdfHelp: isSpanish
      ? "Abre el diseño limpio de impresión. En web, elige Guardar como PDF. En iPhone, usa Compartir/Imprimir para guardar en Archivos."
      : "Opens the clean print layout. On web, choose Save as PDF in the print dialog. On iPhone, use Share/Print to save to Files.",
    copySummaryHelp: isSpanish
      ? "Copia el resumen de la factura para mensajes o registros."
      : "Copies the invoice summary text for messages or records.",
    invoiceSummaryCopied: isSpanish ? "Resumen de factura copiado." : "Invoice summary copied.",
    copyUnavailable: isSpanish
      ? "Copiar no está disponible. Usa el texto de vista previa como respaldo."
      : "Copy is unavailable. Use the preview text as a fallback.",
    invoiceReadyPdf: isSpanish
      ? "Factura lista. Usa el diálogo de impresión para guardar como PDF."
      : "Invoice ready. Use the print dialog to save as PDF.",
    saveAfterAdding: isSpanish ? "Guarda la factura después de agregar" : "Save invoice after adding",
    openFromCustomerContext: isSpanish
      ? "Abre esta factura desde una conversación con cliente o un trabajo de Work Center antes de enviarla."
      : "Open this invoice from a customer conversation or Work Center job before sending.",
    noLineItemsSaved: isSpanish
      ? "No hay partidas guardadas. Los cargos de resumen aparecen abajo."
      : "No line items saved. Summary charges are shown below.",
    invoice: isSpanish ? "Factura" : "Invoice",
    draftInvoice: isSpanish ? "Factura borrador" : "Draft Invoice",
    customer: isSpanish ? "Cliente" : "Customer",
    jobRef: isSpanish ? "Ref. del trabajo" : "Job Ref",
    completed: isSpanish ? "Completado" : "Completed",
  };
  const returnPage = localStorage.getItem("invoiceBuilderReturnPage") || "";
  const isWorkCenterReceipt = returnPage === "workCenter";
  const isBusinessToolsInvoice = returnPage === "businessCommandCenter";
  const hasContextInvoice = !isBusinessToolsInvoice;
  const workCenterScheduleId = localStorage.getItem("invoiceBuilderScheduleId") || "";
  const workCenterQuoteId = localStorage.getItem("invoiceBuilderQuoteId") || "";

  const conversationId = hasContextInvoice
    ? localStorage.getItem("activeConversationId") || ""
    : "";
  const canSendInvoiceToConversation = Boolean(
    conversationId && conversationId !== "general"
  );

  const service = isBusinessToolsInvoice
    ? ""
    : activeJobSnapshot?.service ||
      localStorage.getItem("activeJobService") ||
      localStorage.getItem("selectedEmergencyService") ||
      localStorage.getItem("activeConversationName") ||
      "Service";

  const [customerName, setCustomerName] = useState(
    isBusinessToolsInvoice
      ? ""
      : activeJobSnapshot?.customer ||
          localStorage.getItem("activeJobCustomer") ||
          localStorage.getItem("activeConversationName") ||
          ""
  );
  const [customerPhone, setCustomerPhone] = useState(
    isBusinessToolsInvoice
      ? ""
      : localStorage.getItem("activeCustomerPhone") ||
          localStorage.getItem("customerPhone") ||
          ""
  );
  const [customerEmail, setCustomerEmail] = useState(
    isBusinessToolsInvoice
      ? ""
      : localStorage.getItem("activeCustomerEmail") ||
          localStorage.getItem("customerEmail") ||
          ""
  );
  const [serviceAddress, setServiceAddress] = useState(
    isBusinessToolsInvoice
      ? ""
      : activeJobSnapshot?.location ||
          localStorage.getItem("activeJobLocation") ||
          localStorage.getItem("activeCustomerLocation") ||
          ""
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayIsoDate());
  const [dueDate, setDueDate] = useState("");
  const [serviceDescription, setServiceDescription] = useState(service);
  const [jobReference, setJobReference] = useState(
    isBusinessToolsInvoice
      ? ""
      : workCenterScheduleId || workCenterQuoteId || activeJobSnapshot?.id || ""
  );
  const [completionDate, setCompletionDate] = useState("");
  const [workPerformed, setWorkPerformed] = useState(
    "Service completed as requested."
  );

  const [laborPricingType, setLaborPricingType] = useState("flat_fee");
  const [labor, setLabor] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [laborRate, setLaborRate] = useState("");

  const [materials, setMaterials] = useState("");

  const [serviceFee, setServiceFee] = useState("");

  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("");
  const [otherCharges, setOtherCharges] = useState("");

  const [notes, setNotes] = useState("Thank you for choosing Meetro.");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [warrantyNotes, setWarrantyNotes] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiSuggestionTarget, setAiSuggestionTarget] = useState("workPerformed");
  const [lineItems, setLineItems] = useState([]);
  const [savedInvoiceFingerprint, setSavedInvoiceFingerprint] = useState("");
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);

  const invoiceTotals = useMemo(
    () =>
      calculateInvoiceTotals({
        lineItems,
        laborPricingType,
        laborFee: labor,
        laborHours,
        laborRate,
        labor,
        materials,
        serviceFee,
        otherCharges,
        discount,
        tax,
      }),
    [
      lineItems,
      laborPricingType,
      labor,
      laborHours,
      laborRate,
      materials,
      serviceFee,
      otherCharges,
      discount,
      tax,
    ]
  );

  const safeTotal = invoiceTotals.totalDue;

  const currentInvoiceFingerprint = useMemo(
    () =>
      getInvoiceFingerprint({
        invoiceNumber,
        invoiceDate,
        dueDate,
        customerName,
        customerPhone,
        customerEmail,
        serviceAddress,
        serviceDescription,
        jobReference,
        completionDate,
        workPerformed,
        lineItems,
        laborPricingType,
        labor,
        laborHours,
        laborRate,
        materials,
        serviceFee,
        discount,
        tax,
        otherCharges,
        total: safeTotal,
        notes,
        paymentTerms,
        warrantyNotes,
        customerMessage,
      }),
    [
      invoiceNumber,
      invoiceDate,
      dueDate,
      customerName,
      customerPhone,
      customerEmail,
      serviceAddress,
      serviceDescription,
      jobReference,
      completionDate,
      workPerformed,
      lineItems,
      laborPricingType,
      labor,
      laborHours,
      laborRate,
      materials,
      serviceFee,
      discount,
      tax,
      otherCharges,
      safeTotal,
      notes,
      paymentTerms,
      warrantyNotes,
      customerMessage,
    ]
  );

  const invoiceIsValid = getMissingInvoiceDetails().length === 0;
  const invoiceIsSaved =
    Boolean(savedInvoiceFingerprint) &&
    savedInvoiceFingerprint === currentInvoiceFingerprint;
  const canSendInvoice =
    canSendInvoiceToConversation && invoiceIsValid && invoiceIsSaved;
  const canSaveToCurrentJob = Boolean(isWorkCenterReceipt && workCenterScheduleId);
  const canSaveToCustomerHistory = Boolean(customerName.trim());

  function getMissingInvoiceDetails() {
    return [
      !customerName.trim() ? "customer name" : "",
      !workPerformed.trim() ? "work performed" : "",
      !serviceDescription.trim() ? "service description" : "",
      safeTotal <= 0 ? "total due" : "",
      !paymentTerms.trim() ? "payment terms" : "",
      !dueDate.trim() ? "due date" : "",
    ].filter(Boolean);
  }

  function runAiInvoiceHelp(action) {
    const serviceName = serviceDescription.trim() || service || "the completed service";

    if (action === "missing") {
      const missing = getMissingInvoiceDetails();
      setAiSuggestionTarget("notes");
      setAiSuggestion(
        missing.length
          ? `This invoice may need ${missing.join(", ")} before sharing.`
          : "This invoice has the main details. Review charges, due date, and payment terms before sending."
      );
      return;
    }

    if (action === "terms") {
      setAiSuggestionTarget("paymentTerms");
      setAiSuggestion(
        "Payment is due by the listed due date. Please contact the professional before that date with any questions about the completed work or invoice details."
      );
      return;
    }

    if (action === "summary") {
      setAiSuggestionTarget("workPerformed");
      setAiSuggestion(
        `Work performed: completed ${serviceName} as reviewed with the customer, including final cleanup and a basic completion review.`
      );
      return;
    }

    setAiSuggestionTarget(action === "friendly" ? "customerMessage" : "notes");
    setAiSuggestion(
      action === "friendly"
        ? "Thank you for trusting us with this work. This invoice summarizes the completed service, confirmed charges, and payment details for your records."
        : "Invoice wording suggestion: completed the approved scope of work, reviewed the finished service, and prepared this invoice for customer payment."
    );
  }

  function applyAiSuggestion() {
    if (!aiSuggestion.trim()) return;
    if (aiSuggestionTarget === "paymentTerms") setPaymentTerms(aiSuggestion);
    else if (aiSuggestionTarget === "customerMessage") setCustomerMessage(aiSuggestion);
    else if (aiSuggestionTarget === "workPerformed") setWorkPerformed(aiSuggestion);
    else setNotes((current) => [current, aiSuggestion].filter(Boolean).join("\n\n"));
  }

  function updateLineItem(id, field, value) {
    setLineItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function addLineItem() {
    setLineItems((currentItems) => [...currentItems, createEmptyLineItem()]);
  }

  function removeLineItem(id) {
    setLineItems((currentItems) =>
      currentItems.filter((item) => item.id !== id)
    );
  }

  function buildInvoicePayload(status = "draft") {
    const finalInvoiceNumber =
      invoiceNumber.trim() || `INV-${Date.now().toString().slice(-6)}`;

    return {
      invoiceNumber: finalInvoiceNumber,
      invoiceDate,
      dueDate,
      conversationId,
      service,
      serviceDescription,
      jobReference,
      completionDate,
      customerName,
      customerPhone,
      customerEmail,
      serviceAddress,
      workPerformed,
      lineItems: invoiceTotals.lineItems,
      laborPricingType: invoiceTotals.laborPricingType,
      laborFee: labor,
      laborHours,
      laborRate,
      laborTotal: invoiceTotals.laborTotal,
      labor,
      materialsTotal: invoiceTotals.materialsTotal,
      materials,
      serviceFee,
      discount,
      tax,
      otherCharges,
      total: safeTotal,
      subtotal: invoiceTotals.subtotal,
      lineItemsSubtotal: invoiceTotals.lineItemsSubtotal,
      laborPricingType: invoiceTotals.laborPricingType,
      laborTotal: invoiceTotals.laborTotal,
      materialsTotal: invoiceTotals.materialsTotal,
      fallbackSubtotal: invoiceTotals.fallbackSubtotal,
      notes,
      paymentTerms,
      warrantyNotes,
      customerMessage,
      status,
      quoteId: workCenterQuoteId,
    };
  }

  function buildInvoiceSummary() {
    const invoice = buildInvoicePayload("preview");
    const untitledItem = isSpanish ? "Partida sin título" : "Untitled item";
    return `${isSpanish ? "Factura" : "Invoice"}: ${invoice.invoiceNumber}
${invoiceCopy.customerName}: ${invoice.customerName || "—"}
${invoiceCopy.phone}: ${invoice.customerPhone || "—"}
${invoiceCopy.email}: ${invoice.customerEmail || "—"}
${invoiceCopy.serviceAddress}: ${invoice.serviceAddress || "—"}
${invoiceCopy.invoiceDate}: ${invoice.invoiceDate || "—"}
${invoiceCopy.dueDate}: ${invoice.dueDate || "—"}

${invoiceCopy.workPerformedSummary}:
${invoice.workPerformed || "—"}

${invoiceCopy.serviceDescription}:
${invoice.serviceDescription || "—"}

${invoiceCopy.lineItems}:
${invoice.lineItems?.length
  ? invoice.lineItems
      .map(
        (item) =>
          `- ${item.description || untitledItem} (${item.type || "other"}): ${item.quantity || 0} x $${moneyValue(item.unitPrice).toFixed(2)} = $${moneyValue(item.amount).toFixed(2)}`
      )
      .join("\n")
  : "—"}

${invoiceCopy.laborType}: ${invoice.laborPricingType === "hourly" ? invoiceCopy.hourly : invoiceCopy.flatFee}
${invoiceCopy.laborTotal}: $${moneyValue(invoice.laborTotal).toFixed(2)}
${invoiceCopy.materials}: $${moneyValue(invoice.materialsTotal).toFixed(2)}
${invoiceCopy.serviceFee}: $${moneyValue(invoice.serviceFee).toFixed(2)}
${invoiceCopy.otherCharges}: $${moneyValue(invoice.otherCharges).toFixed(2)}
${invoiceCopy.subtotal}: $${moneyValue(invoice.subtotal).toFixed(2)}
${invoiceCopy.discount}: -$${moneyValue(invoice.discount).toFixed(2)}
${invoiceCopy.tax}: $${moneyValue(invoice.tax).toFixed(2)}
${invoiceCopy.totalDue}: $${invoice.total.toFixed(2)}

${invoiceCopy.notes}:
${invoice.notes || "—"}

${invoiceCopy.paymentTerms}:
${invoice.paymentTerms || "—"}

${invoiceCopy.warrantyNotes}:
${invoice.warrantyNotes || "—"}

${invoiceCopy.customerMessage}:
${invoice.customerMessage || "—"}`;
  }

  async function copySummary() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(buildInvoiceSummary());
      setStatusMessage(invoiceCopy.invoiceSummaryCopied);
    } catch {
      setPreviewOpen(true);
      setStatusMessage(invoiceCopy.copyUnavailable);
    }
  }

  function saveInvoiceToCustomerHistory(invoice, savedAt) {
    const historyKey = "meetro_customer_invoice_history";
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || "[]");
    const customerKey =
      customerName.trim().toLowerCase() ||
      conversationId ||
      invoice.customerName ||
      "unknown_customer";
    const historyRecord = {
      ...invoice,
      id:
        invoice.invoiceNumber ||
        `invoice_${Date.now().toString(36)}`,
      customerKey,
      customerName: invoice.customerName,
      source: "invoice_builder",
      savedTo: "customer_history",
      savedAt,
    };
    const nextHistory = [
      historyRecord,
      ...existingHistory.filter(
        (item) => String(item.id || item.invoiceNumber || "") !== String(historyRecord.id)
      ),
    ];

    localStorage.setItem(historyKey, JSON.stringify(nextHistory));
    window.dispatchEvent(new Event("meetroCustomerHistoryUpdated"));
  }

  function persistInvoice(status = "draft", options = {}) {
    const { saveToJob = false, returnToWorkCenter = false } = options;
    const savedAt = new Date().toISOString();
    const invoiceStatus = saveToJob ? "created" : status;
    const invoice = buildInvoicePayload(invoiceStatus);
    setInvoiceNumber(invoice.invoiceNumber);
    localStorage.setItem("activeInvoiceConversationId", conversationId);
    localStorage.setItem("activeInvoiceService", invoice.serviceDescription || service);
    localStorage.setItem("activeInvoiceCustomerName", invoice.customerName);
    localStorage.setItem("activeInvoiceCustomerPhone", invoice.customerPhone);
    localStorage.setItem("activeInvoiceCustomerEmail", invoice.customerEmail);
    localStorage.setItem("activeInvoiceServiceAddress", invoice.serviceAddress);
    localStorage.setItem("activeInvoiceNumber", invoice.invoiceNumber);
    localStorage.setItem("activeInvoiceDate", invoice.invoiceDate);
    localStorage.setItem("activeInvoiceDueDate", invoice.dueDate);
    localStorage.setItem("activeInvoiceWorkPerformed", workPerformed);
    localStorage.setItem("activeInvoiceLineItems", JSON.stringify(invoice.lineItems));
    localStorage.setItem("activeInvoiceLaborPricingType", invoice.laborPricingType);
    localStorage.setItem("activeInvoiceLabor", String(invoice.laborTotal));
    localStorage.setItem("activeInvoiceLaborFee", labor);
    localStorage.setItem("activeInvoiceLaborHours", laborHours);
    localStorage.setItem("activeInvoiceLaborRate", laborRate);
    localStorage.setItem("activeInvoiceMaterials", materials);
    localStorage.setItem("activeInvoiceFee", serviceFee);
    localStorage.setItem("activeInvoiceDiscount", discount);
    localStorage.setItem("activeInvoiceTax", tax);
    localStorage.setItem("activeInvoiceOtherCharges", otherCharges);
    localStorage.setItem("activeInvoiceNotes", notes);
    localStorage.setItem("activeInvoicePaymentTerms", paymentTerms);
    localStorage.setItem("activeInvoiceWarrantyNotes", warrantyNotes);
    localStorage.setItem("activeInvoiceCustomerMessage", customerMessage);
    localStorage.setItem("activeInvoiceTotal", String(safeTotal));
    localStorage.setItem("activeInvoiceStatus", invoiceStatus);
    localStorage.setItem("activeInvoiceCreatedAt", savedAt);
    if (invoiceStatus === "sent") {
      localStorage.setItem("activeInvoiceSentAt", savedAt);
    }

    localStorage.setItem("emergencyLaborCharge", labor);
    localStorage.setItem("emergencyMaterialCharge", materials);
    localStorage.setItem("emergencyServiceFee", serviceFee);

    if (saveToJob && workCenterScheduleId) {
      const schedule = getBusinessSchedule();
      const updatedSchedule = schedule.map((item) =>
        String(item.id || item.scheduleId || "") === String(workCenterScheduleId)
          ? {
              ...item,
              invoiceStatus: "created",
              receiptStatus: "created",
              invoiceCreatedAt: savedAt,
              receiptCreatedAt: savedAt,
              receipt: {
                ...invoice,
                status: "created",
                createdAt: savedAt,
              },
              updatedAt: savedAt,
            }
          : item
      );
      saveBusinessSchedule(updatedSchedule);
      window.dispatchEvent(new Event("meetroJobRecordUpdated"));
      if (returnToWorkCenter) {
        localStorage.removeItem("invoiceBuilderReturnPage");
        localStorage.removeItem("invoiceBuilderScheduleId");
        localStorage.removeItem("invoiceBuilderQuoteId");
        setPage("workCenter");
      }
    }

    setSavedInvoiceFingerprint(getInvoiceFingerprint(invoice));
    setStatusMessage(
      invoiceStatus === "sent" ? "Invoice sent." : "Invoice saved."
    );

    return invoice;
  }

  function saveInvoice() {
    setSaveSheetOpen(true);
  }

  function saveInvoiceToJob() {
    if (!canSaveToCurrentJob) {
      setStatusMessage("Open this invoice from a Work Center job to save it to that job.");
      return;
    }

    persistInvoice("draft", { saveToJob: true });
    setSaveSheetOpen(false);
    setStatusMessage("Invoice saved to this job.");
  }

  function saveInvoiceToHistory() {
    if (!canSaveToCustomerHistory) {
      setStatusMessage("Add a customer name before saving to customer history.");
      return;
    }

    const savedAt = new Date().toISOString();
    const invoice = persistInvoice("draft");
    saveInvoiceToCustomerHistory(invoice, savedAt);
    setSaveSheetOpen(false);
    setStatusMessage("Invoice saved to customer history.");
  }

  async function saveInvoiceAsPdfOrDownload() {
    setSaveSheetOpen(false);
    setPreviewOpen(true);

    if (navigator.share && /iPhone|iPad|iPod/i.test(navigator.userAgent || "")) {
      try {
        await navigator.share({
          title: invoiceNumber || "Invoice",
          text: buildInvoiceSummary(),
        });
        setStatusMessage(
          "Invoice summary shared. Use Share/Print to save a PDF to Files."
        );
        return;
      } catch {
        setStatusMessage("Use Share/Print to save this invoice to Files.");
        return;
      }
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
    setStatusMessage(invoiceCopy.invoiceReadyPdf);
  }

  async function copySummaryFromSaveSheet() {
    await copySummary();
    setSaveSheetOpen(false);
  }

  function printInvoice() {
    setPreviewOpen(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  }

  function sendInvoice() {
    if (!invoiceIsValid) {
      setStatusMessage(
        `${invoiceCopy.saveAfterAdding}: ${getMissingInvoiceDetails().join(", ")}.`
      );
      return;
    }

    if (!invoiceIsSaved) {
      setStatusMessage(`${invoiceCopy.saveInvoiceFirst}.`);
      return;
    }

    if (!canSendInvoiceToConversation) {
      setStatusMessage(
        invoiceCopy.openFromCustomerContext
      );
      return;
    }

    const savedAt = new Date().toISOString();
    const invoice = persistInvoice("sent");

    const storageKey = `meetro_conversation_${conversationId}`;
    const existingMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");

    const invoiceMessage = {
      id: Date.now(),
      sender: "business",
      role: "business",
      type: "workflow_invoice_request",
      text:
        language === "es"
          ? `Factura enviada — Total: $${safeTotal}`
          : `Invoice sent — Total: $${safeTotal}`,
      title:
        language === "es"
          ? "Solicitud de pago"
          : "Payment Request",
      subtitle:
        language === "es"
          ? "Revisa los cargos y confirma el pago."
          : "Review charges and confirm payment.",
      requestId:
        localStorage.getItem("activeRequestId") ||
        conversationId,
      projectTitle: service,
      invoice: {
        ...invoice,
        status: "payment_requested",
      },
      paymentStatus: "payment_requested",
      time: formatMessageTime(new Date()),
      createdAt: savedAt,
    };

    localStorage.setItem(
      storageKey,
      JSON.stringify([...existingMessages, invoiceMessage])
    );

    localStorage.setItem(`meetro_conversation_read_${conversationId}`, "false");

    const registry = JSON.parse(
      localStorage.getItem("meetro_conversation_registry") || "[]"
    );

    const updatedRegistry = registry.map((item) =>
      String(item.id) === String(conversationId)
        ? {
            ...item,
            unread: true,
	            project_description:
	              language === "es"
                ? `Factura enviada — Total: $${safeTotal}`
                : `Invoice sent — Total: $${safeTotal}`,
            status: language === "es" ? "Factura enviada" : "Invoice sent",
            updatedAt: Date.now(),
          }
        : item
    );

    localStorage.setItem(
      "meetro_conversation_registry",
      JSON.stringify(updatedRegistry)
    );

    const unreadCount = updatedRegistry.filter(
      (item) => item.unread && !item.saved_to_history
    ).length;

    localStorage.setItem("mockUnreadMessages", String(unreadCount));

    window.dispatchEvent(new Event("meetroInvoiceUpdated"));
    window.dispatchEvent(new Event("meetro-messages-updated"));

    setPage("emergencyCompletionActions");
  }

  return (
    <div className="app-page meetro-form-page" style={page}>
      <style>
        {`
          @media print {
            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            body * {
              visibility: hidden !important;
            }

            .meetro-print-invoice,
            .meetro-print-invoice * {
              visibility: visible !important;
            }

            .meetro-print-invoice {
              display: block !important;
              position: absolute !important;
              inset: 0 auto auto 0 !important;
              width: 100% !important;
              max-width: 8.5in !important;
              margin: 0 auto !important;
              padding: 0.35in !important;
              color: #111827 !important;
              background: #ffffff !important;
              box-shadow: none !important;
              border: none !important;
            }

            .meetro-no-print,
            .bottom-nav-dock,
            .meetro-assistant-launcher,
            nav,
            button {
              display: none !important;
            }
          }
        `}
      </style>
      <div style={card}>
        <button
          style={backBtn}
          onClick={() => {
            if (restoreConversationOriginContext(setPage)) return;

            if (isBusinessToolsInvoice) {
              localStorage.removeItem("invoiceBuilderReturnPage");
            }

            setPage(
              isBusinessToolsInvoice
                ? "businessCommandCenter"
                : isWorkCenterReceipt
                ? "workCenter"
                : "conversationThread"
            );
          }}
        >
          ←{" "}
          {isBusinessToolsInvoice
            ? language === "es"
              ? "Volver a Herramientas"
              : "Back to Business Tools"
            : isWorkCenterReceipt
            ? getWorkCenterContextReturnLabel({
                language,
                customerName:
                  customerName || localStorage.getItem("workCenterReturnCustomer") || "",
              })
            : language === "es"
              ? "Volver al chat"
              : "Back to Chat"}
        </button>

        <div style={icon}>INV</div>

        <h1 style={title}>
          {language === "es" ? "Crear factura" : "Create Invoice"}
        </h1>

        <p style={subtitle}>
          {language === "es"
            ? "Agrega cargos, notas y envía la factura al cliente."
            : "Create an editable invoice with customer information, work details, charges, and terms."}
        </p>

        <section style={section}>
          <h2 style={sectionTitle}>{invoiceCopy.customerInformation}</h2>
          <div style={grid}>
            <TextField label={invoiceCopy.customerName} value={customerName} setValue={setCustomerName} />
            <TextField label={invoiceCopy.phone} value={customerPhone} setValue={setCustomerPhone} inputMode="tel" />
            <TextField label={invoiceCopy.email} value={customerEmail} setValue={setCustomerEmail} type="email" />
            <TextField label={invoiceCopy.serviceAddress} value={serviceAddress} setValue={setServiceAddress} />
            <TextField label={invoiceCopy.invoiceNumber} value={invoiceNumber} setValue={setInvoiceNumber} placeholder="INV-1001" />
            <TextField label={invoiceCopy.invoiceDate} value={invoiceDate} setValue={setInvoiceDate} type="date" />
            <TextField label={invoiceCopy.dueDate} value={dueDate} setValue={setDueDate} type="date" />
          </div>
        </section>

        <section style={section}>
          <h2 style={sectionTitle}>{invoiceCopy.jobWork}</h2>
          <label style={label}>{invoiceCopy.workPerformedSummary}</label>
          <AutoGrowTextarea
            style={textarea}
            value={workPerformed}
            setValue={setWorkPerformed}
          />

          <label style={label}>{invoiceCopy.serviceDescription}</label>
          <AutoGrowTextarea
            style={textarea}
            value={serviceDescription}
            setValue={setServiceDescription}
            placeholder={invoiceCopy.serviceDescriptionPlaceholder}
          />

          <div style={grid}>
            <TextField label={invoiceCopy.jobReference} value={jobReference} setValue={setJobReference} />
            <TextField label={invoiceCopy.completionDate} value={completionDate} setValue={setCompletionDate} type="date" />
          </div>
        </section>

        <section style={aiHelpCard}>
          <h2 style={sectionTitle}>{invoiceCopy.aiInvoiceHelp}</h2>
          <p style={aiSubtitle}>
            {invoiceCopy.aiInvoiceSubtitle}
          </p>
          <div style={chipGrid}>
            <button style={chip} onClick={() => runAiInvoiceHelp("improve")}>{invoiceCopy.improveWording}</button>
            <button style={chip} onClick={() => runAiInvoiceHelp("missing")}>{invoiceCopy.checkMissingDetails}</button>
            <button style={chip} onClick={() => runAiInvoiceHelp("friendly")}>{invoiceCopy.makeCustomerFriendly}</button>
            <button style={chip} onClick={() => runAiInvoiceHelp("terms")}>{invoiceCopy.addPaymentTerms}</button>
            <button style={chip} onClick={() => runAiInvoiceHelp("summary")}>{invoiceCopy.summarizeWork}</button>
          </div>
          {aiSuggestion && (
            <div style={aiSuggestionBox}>
              <label style={label}>{invoiceCopy.editableSuggestion}</label>
              <AutoGrowTextarea
                style={textarea}
                value={aiSuggestion}
                setValue={setAiSuggestion}
              />
              <div style={actionsGrid}>
                <button style={secondaryBtn} onClick={applyAiSuggestion}>{invoiceCopy.useSuggestion}</button>
                <button style={secondaryBtn} onClick={() => setAiSuggestion("")}>{invoiceCopy.clear}</button>
              </div>
            </div>
          )}
        </section>

        <section style={section}>
          <div style={sectionHeaderRow}>
            <div>
              <h2 style={sectionTitle}>{invoiceCopy.lineItems}</h2>
              <p style={sectionHint}>
                {invoiceCopy.lineItemsHint}
              </p>
            </div>
            <button type="button" style={smallAddButton} onClick={addLineItem}>
              + {invoiceCopy.addItem}
            </button>
          </div>

          {lineItems.length > 0 ? (
            <div style={lineItemsList}>
              {lineItems.map((item, index) => (
                <div key={item.id} style={lineItemCard}>
                  <div style={lineItemHeader}>
                    <strong>{invoiceCopy.item} {index + 1}</strong>
                    <button
                      type="button"
                      style={removeLineItemButton}
                      onClick={() => removeLineItem(item.id)}
                    >
                      {invoiceCopy.remove}
                    </button>
                  </div>
                  <label style={labelStyle}>{invoiceCopy.type}</label>
                  <select
                    style={input}
                    value={item.type}
                    onChange={(event) =>
                      updateLineItem(item.id, "type", event.target.value)
                    }
                  >
                    <option value="labor">{invoiceCopy.labor}</option>
                    <option value="materials">{invoiceCopy.materials}</option>
                    <option value="service fee">{invoiceCopy.serviceFee}</option>
                    <option value="other">{invoiceCopy.other}</option>
                  </select>

                  <label style={labelStyle}>{invoiceCopy.description}</label>
                  <AutoGrowTextarea
                    style={lineItemTextarea}
                    value={item.description}
                    setValue={(value) =>
                      updateLineItem(item.id, "description", value)
                    }
                    placeholder={invoiceCopy.lineItemPlaceholder}
                  />

                  <div style={lineItemGrid}>
                    <TextField
                      label={invoiceCopy.quantity}
                      value={item.quantity}
                      setValue={(value) =>
                        updateLineItem(item.id, "quantity", value)
                      }
                      type="number"
                    />
                    <TextField
                      label={invoiceCopy.unitPrice}
                      value={item.unitPrice}
                      setValue={(value) =>
                        updateLineItem(item.id, "unitPrice", value)
                      }
                      type="number"
                    />
                    <div>
                      <label style={labelStyle}>{invoiceCopy.amount}</label>
                      <div style={lineItemAmount}>
                        {formatMoney(
                          moneyValue(item.quantity) * moneyValue(item.unitPrice)
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={lineItemsEmpty}>
              {invoiceCopy.lineItemsEmpty}
            </div>
          )}
        </section>

        <section style={section}>
          <h2 style={sectionTitle}>{invoiceCopy.charges}</h2>
          <p style={sectionHint}>
            {invoiceCopy.chargesHint}
          </p>
          <div style={grid}>
            <div>
              <label style={labelStyle}>{invoiceCopy.laborPricingType}</label>
              <select
                value={laborPricingType}
                onChange={(event) => setLaborPricingType(event.target.value)}
                style={input}
              >
                <option value="flat_fee">{invoiceCopy.flatFee}</option>
                <option value="hourly">{invoiceCopy.hourly}</option>
              </select>
            </div>
            {laborPricingType === "hourly" ? (
              <>
                <Field label={invoiceCopy.laborHours} value={laborHours} setValue={setLaborHours} />
                <Field label={invoiceCopy.laborRate} value={laborRate} setValue={setLaborRate} />
              </>
            ) : (
              <Field label={invoiceCopy.laborFee} value={labor} setValue={setLabor} />
            )}
            <Field label={invoiceCopy.materials} value={materials} setValue={setMaterials} />
            <Field label={invoiceCopy.serviceFee} value={serviceFee} setValue={setServiceFee} />
            <Field label={invoiceCopy.discount} value={discount} setValue={setDiscount} />
            <Field label={invoiceCopy.tax} value={tax} setValue={setTax} />
            <Field label={invoiceCopy.otherCharges} value={otherCharges} setValue={setOtherCharges} />
          </div>
        </section>

        <section style={section}>
          <h2 style={sectionTitle}>{invoiceCopy.notesTerms}</h2>
          <label style={label}>{invoiceCopy.notes}</label>
          <AutoGrowTextarea style={textarea} value={notes} setValue={setNotes} />

          <label style={label}>{invoiceCopy.paymentTerms}</label>
          <AutoGrowTextarea style={textarea} value={paymentTerms} setValue={setPaymentTerms} />

          <label style={label}>{invoiceCopy.warrantyNotes}</label>
          <AutoGrowTextarea style={textarea} value={warrantyNotes} setValue={setWarrantyNotes} />

          <label style={label}>{invoiceCopy.customerMessage}</label>
          <AutoGrowTextarea style={textarea} value={customerMessage} setValue={setCustomerMessage} />
        </section>

        <section style={section}>
          <h2 style={sectionTitle}>{invoiceCopy.summary}</h2>
          <div style={summaryBox}>
            <SummaryRow label={invoiceCopy.lineItemsSubtotal} value={invoiceTotals.lineItemsSubtotal} />
            <SummaryRow label={invoiceCopy.laborTotal} value={invoiceTotals.laborTotal} />
            <SummaryRow label={invoiceCopy.materialsTotal} value={invoiceTotals.materialsTotal} />
            <SummaryRow label={invoiceCopy.serviceFee} value={moneyValue(serviceFee)} />
            <SummaryRow label={invoiceCopy.otherCharges} value={moneyValue(otherCharges)} />
            <SummaryRow label={invoiceCopy.subtotal} value={invoiceTotals.subtotal} />
            <SummaryRow label={invoiceCopy.discount} value={-moneyValue(discount)} />
            <SummaryRow label={invoiceCopy.tax} value={moneyValue(tax)} />
            <div style={totalBox}>
              <span>{invoiceCopy.totalDue}</span>
              <strong>${safeTotal.toFixed(2)}</strong>
            </div>
          </div>
        </section>

        <div style={actionsGrid}>
          <button style={sendBtn} onClick={saveInvoice}>
            {isWorkCenterReceipt ? invoiceCopy.saveReceipt : invoiceCopy.saveInvoice}
          </button>
          <button style={secondaryBtn} onClick={() => setPreviewOpen((open) => !open)}>
            {previewOpen ? invoiceCopy.hidePreview : invoiceCopy.previewInvoice}
          </button>
          <button style={secondaryBtn} onClick={copySummary}>
            {invoiceCopy.copySummary}
          </button>
          <button style={secondaryBtn} onClick={printInvoice}>
            {invoiceCopy.printInvoice}
          </button>
          <button
            style={{
              ...sendBtn,
              opacity: canSendInvoice ? 1 : 0.55,
              cursor: canSendInvoice ? "pointer" : "not-allowed",
            }}
            onClick={sendInvoice}
            disabled={!canSendInvoice}
          >
            {canSendInvoice ? invoiceCopy.sendInvoice : invoiceCopy.saveInvoiceFirst}
          </button>
        </div>

        {statusMessage && <p style={statusText}>{statusMessage}</p>}
        {previewOpen && (
          <InvoicePreview invoice={buildInvoicePayload("preview")} copy={invoiceCopy} />
        )}
      </div>

      {saveSheetOpen && (
        <div style={sheetOverlay} onClick={() => setSaveSheetOpen(false)}>
          <div style={saveSheet} onClick={(event) => event.stopPropagation()}>
            <div style={sheetHandle}></div>
            <div style={sheetHeader}>
              <div>
                <p style={sheetEyebrow}>{invoiceCopy.saveInvoiceEyebrow}</p>
                <h2 style={sheetTitle}>{invoiceCopy.saveQuestion}</h2>
              </div>
              <button
                type="button"
                style={sheetClose}
                onClick={() => setSaveSheetOpen(false)}
                aria-label={invoiceCopy.closeSaveOptions}
              >
                ×
              </button>
            </div>

            <button
              type="button"
              style={{
                ...saveOption,
                opacity: canSaveToCurrentJob ? 1 : 0.55,
              }}
              onClick={saveInvoiceToJob}
              disabled={!canSaveToCurrentJob}
            >
              <strong>{invoiceCopy.saveToThisJob}</strong>
              <span>
                {invoiceCopy.saveToThisJobHelp}
              </span>
              {!canSaveToCurrentJob && (
                <em>{invoiceCopy.saveToThisJobUnavailable}</em>
              )}
            </button>

            <button
              type="button"
              style={{
                ...saveOption,
                opacity: canSaveToCustomerHistory ? 1 : 0.55,
              }}
              onClick={saveInvoiceToHistory}
              disabled={!canSaveToCustomerHistory}
            >
              <strong>{invoiceCopy.saveToCustomerHistory}</strong>
              <span>
                {invoiceCopy.saveToCustomerHistoryHelp}
              </span>
              {!canSaveToCustomerHistory && (
                <em>{invoiceCopy.saveToCustomerHistoryUnavailable}</em>
              )}
            </button>

            <button
              type="button"
              style={saveOption}
              onClick={saveInvoiceAsPdfOrDownload}
            >
              <strong>{invoiceCopy.downloadSavePdf}</strong>
              <span>
                {invoiceCopy.downloadSavePdfHelp}
              </span>
            </button>

            <button
              type="button"
              style={saveOption}
              onClick={copySummaryFromSaveSheet}
            >
              <strong>{invoiceCopy.copySummary}</strong>
              <span>{invoiceCopy.copySummaryHelp}</span>
            </button>
          </div>
        </div>
      )}

      <BottomNav
        setPage={setPage}
        currentPage={isBusinessToolsInvoice ? "businessDashboard" : "messages"}
      />
    </div>
  );
}

function Field({ label, value, setValue }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        style={input}
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  setValue,
  type = "text",
  inputMode,
  placeholder = "",
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        style={input}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

function SummaryRow({ label, value }) {
  const amount = Number(value || 0);
  return (
    <div style={summaryRow}>
      <span>{label}</span>
      <strong>
        {amount < 0 ? "-" : ""}${Math.abs(amount).toFixed(2)}
      </strong>
    </div>
  );
}

function AutoGrowTextarea({
  value,
  setValue,
  style,
  placeholder = "",
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 104), 420)}px`;
    element.style.overflowY = element.scrollHeight > 420 ? "auto" : "hidden";
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      style={style}
      value={value}
      placeholder={placeholder}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

function InvoicePreview({ invoice, copy }) {
  const lineItems = normalizeInvoiceLineItems(invoice.lineItems || []);
  const isSpanish = getLanguage() === "es";
  const fallbackLabels = {
    invoice: isSpanish ? "Factura" : "Invoice",
    draftInvoice: isSpanish ? "Factura borrador" : "Draft Invoice",
    invoiceDate: isSpanish ? "Fecha de factura" : "Invoice Date",
    dueDate: isSpanish ? "Fecha de vencimiento" : "Due Date",
    customer: isSpanish ? "Cliente" : "Customer",
    serviceAddress: isSpanish ? "Dirección del servicio" : "Service Address",
    jobRef: isSpanish ? "Ref. del trabajo" : "Job Ref",
    completed: isSpanish ? "Completado" : "Completed",
    workPerformedSummary: isSpanish ? "Resumen del trabajo realizado" : "Work Performed",
    serviceDescription: isSpanish ? "Descripción del servicio" : "Service Description",
    lineItems: isSpanish ? "Partidas" : "Line Items",
    description: isSpanish ? "Descripción" : "Description",
    type: isSpanish ? "Tipo" : "Type",
    quantity: isSpanish ? "Cant." : "Qty",
    unitPrice: isSpanish ? "Unidad" : "Unit",
    amount: isSpanish ? "Importe" : "Amount",
    item: isSpanish ? "Partida sin título" : "Untitled item",
    other: isSpanish ? "Otro" : "Other",
    noLineItemsSaved: isSpanish
      ? "No hay partidas guardadas. Los cargos resumidos se muestran abajo."
      : "No line items saved. Summary charges are shown below.",
    subtotal: isSpanish ? "Subtotal" : "Subtotal",
    discount: isSpanish ? "Descuento" : "Discount",
    tax: isSpanish ? "Impuesto" : "Tax",
    totalDue: isSpanish ? "Total adeudado" : "Total Due",
    paymentTerms: isSpanish ? "Términos de pago" : "Payment Terms",
    notes: isSpanish ? "Notas" : "Notes",
    warrantyNotes: isSpanish ? "Notas de garantía" : "Warranty Notes",
    customerMessage: isSpanish ? "Mensaje al cliente" : "Customer Message",
  };
  const label = { ...fallbackLabels, ...(copy || {}) };

  return (
    <section className="meetro-print-invoice" style={printPreview}>
      <header style={printHeader}>
        <div>
          <p style={printEyebrow}>{label.invoice}</p>
          <h2 style={printTitle}>{invoice.invoiceNumber || label.draftInvoice}</h2>
        </div>
        <div style={printMeta}>
          <span>{label.invoiceDate}: {invoice.invoiceDate || "—"}</span>
          <span>{label.dueDate}: {invoice.dueDate || "—"}</span>
        </div>
      </header>

      <div style={printInfoGrid}>
        <div style={printInfoBox}>
          <strong>{label.customer}</strong>
          <span>{invoice.customerName || "—"}</span>
          <span>{invoice.customerPhone || "—"}</span>
          <span>{invoice.customerEmail || "—"}</span>
        </div>
        <div style={printInfoBox}>
          <strong>{label.serviceAddress}</strong>
          <span>{invoice.serviceAddress || "—"}</span>
          <span>{label.jobRef}: {invoice.jobReference || "—"}</span>
          <span>{label.completed}: {invoice.completionDate || "—"}</span>
        </div>
      </div>

      <div style={printSection}>
        <strong>{label.workPerformedSummary}</strong>
        <p>{invoice.workPerformed || "—"}</p>
        <strong>{label.serviceDescription}</strong>
        <p>{invoice.serviceDescription || "—"}</p>
      </div>

      <div style={printSection}>
        <strong>{label.lineItems}</strong>
        {lineItems.length > 0 ? (
          <div style={printTable}>
            <div style={{ ...printTableRow, ...printTableHead }}>
              <span>{label.description}</span>
              <span>{label.type}</span>
              <span>{label.quantity}</span>
              <span>{label.unitPrice}</span>
              <span>{label.amount}</span>
            </div>
            {lineItems.map((item) => (
              <div key={item.id} style={printTableRow}>
                <span>{item.description || label.item}</span>
                <span>{item.type || label.other}</span>
                <span>{item.quantity || "0"}</span>
                <span>{formatMoney(item.unitPrice)}</span>
                <span>{formatMoney(item.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p>{label.noLineItemsSaved}</p>
        )}
      </div>

      <div style={printTotals}>
        <SummaryRow label={label.subtotal} value={invoice.subtotal} />
        <SummaryRow label={label.discount} value={-moneyValue(invoice.discount)} />
        <SummaryRow label={label.tax} value={moneyValue(invoice.tax)} />
        <div style={printTotalDue}>
          <span>{label.totalDue}</span>
          <strong>{formatMoney(invoice.total)}</strong>
        </div>
      </div>

      {(invoice.paymentTerms ||
        invoice.notes ||
        invoice.warrantyNotes ||
        invoice.customerMessage) && (
        <div style={printSection}>
          {invoice.paymentTerms && (
            <>
              <strong>{label.paymentTerms}</strong>
              <p>{invoice.paymentTerms}</p>
            </>
          )}
          {invoice.notes && (
            <>
              <strong>{label.notes}</strong>
              <p>{invoice.notes}</p>
            </>
          )}
          {invoice.warrantyNotes && (
            <>
              <strong>{label.warrantyNotes}</strong>
              <p>{invoice.warrantyNotes}</p>
            </>
          )}
          {invoice.customerMessage && (
            <>
              <strong>{label.customerMessage}</strong>
              <p>{invoice.customerMessage}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

const page = {
  minHeight: "100vh",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 24px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
  background: "linear-gradient(135deg,#f8fafc,#eef2ff)",
  boxSizing: "border-box",
  width: "100%",
  overflowX: "hidden",
  maxWidth: "760px",
  margin: "0 auto",
};

const card = {
  maxWidth: "520px",
  margin: "0 auto",
  background: "#ffffff",
  borderRadius: "32px",
  padding: "24px",
  boxShadow: "0 20px 60px rgba(15,23,42,0.10)",
  boxSizing: "border-box",
  width: "100%",
  overflow: "hidden",
};

const backBtn = {
  border: "none",
  background: "#f5f3ff",
  color: "#5b3df5",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: "900",
  marginBottom: "18px",
  cursor: "pointer",
};

const icon = {
  width: "74px",
  height: "74px",
  borderRadius: "24px",
  background: "#eef2ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "38px",
  margin: "0 auto 14px",
};

const title = {
  textAlign: "center",
  fontSize: "30px",
  fontWeight: "900",
  margin: "0 0 8px",
};

const subtitle = {
  textAlign: "center",
  color: "#475569",
  lineHeight: 1.5,
  marginBottom: "20px",
};

const section = {
  display: "grid",
  gap: "12px",
  marginTop: "18px",
  padding: "14px",
  borderRadius: "20px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxSizing: "border-box",
  maxWidth: "100%",
};

const sectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "18px",
  fontWeight: "950",
};

const label = {
  display: "block",
  fontWeight: "900",
  margin: "14px 0 8px",
};

const labelStyle = {
  display: "block",
  fontWeight: "900",
  marginBottom: "8px",
  fontSize: "13px",
};

const textarea = {
  width: "100%",
  minHeight: "104px",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: "700",
  fontSize: "16px",
  boxSizing: "border-box",
  resize: "vertical",
  lineHeight: 1.45,
  overflowY: "hidden",
};

const lineItemTextarea = {
  ...textarea,
  minHeight: "72px",
  borderRadius: "14px",
  fontSize: "15px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
  gap: "12px",
  maxWidth: "100%",
};

const input = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  fontSize: "16px",
  boxSizing: "border-box",
};

const totalBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#f8fafc",
  borderRadius: "20px",
  padding: "16px",
  margin: "18px 0",
  fontSize: "18px",
};

const summaryBox = {
  display: "grid",
  gap: "8px",
  borderRadius: "18px",
  background: "#f8fafc",
  padding: "12px",
};

const sectionHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
};

const sectionHint = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const smallAddButton = {
  border: "1px solid rgba(91,61,245,0.22)",
  background: "#f5f3ff",
  color: "#5b3df5",
  borderRadius: "999px",
  padding: "10px 13px",
  fontWeight: "950",
  cursor: "pointer",
};

const lineItemsList = {
  display: "grid",
  gap: "12px",
};

const lineItemCard = {
  display: "grid",
  gap: "10px",
  padding: "12px",
  borderRadius: "18px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  minWidth: 0,
};

const lineItemHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
};

const removeLineItemButton = {
  border: "1px solid rgba(239,68,68,0.22)",
  background: "#fff1f2",
  color: "#be123c",
  borderRadius: "999px",
  padding: "8px 10px",
  fontSize: "12px",
  fontWeight: "950",
  cursor: "pointer",
};

const lineItemGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 105px), 1fr))",
  gap: "10px",
  alignItems: "end",
};

const lineItemAmount = {
  minHeight: "48px",
  display: "flex",
  alignItems: "center",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  padding: "0 14px",
  color: "#0f172a",
  fontSize: "16px",
  fontWeight: "950",
};

const lineItemsEmpty = {
  padding: "12px",
  borderRadius: "16px",
  background: "#f8fafc",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const summaryRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  color: "#475569",
  fontWeight: "850",
};

const aiHelpCard = {
  ...section,
  background: "#f8fafc",
  border: "1px solid #dbeafe",
};

const aiSubtitle = {
  margin: 0,
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const chipGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  maxWidth: "100%",
};

const chip = {
  border: "1px solid rgba(91,61,245,0.2)",
  background: "#ffffff",
  color: "#5b3df5",
  borderRadius: "999px",
  padding: "10px 12px",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "13px",
};

const aiSuggestionBox = {
  display: "grid",
  gap: "8px",
};

const actionsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "10px",
  marginTop: "14px",
  maxWidth: "100%",
};

const sheetOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 14000,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding:
    "16px max(14px, env(safe-area-inset-right, 0px)) calc(18px + env(safe-area-inset-bottom, 0px)) max(14px, env(safe-area-inset-left, 0px))",
  background: "rgba(15,23,42,0.38)",
  boxSizing: "border-box",
};

const saveSheet = {
  width: "100%",
  maxWidth: "520px",
  maxHeight: "min(82dvh, 680px)",
  overflowY: "auto",
  background: "#ffffff",
  borderRadius: "28px 28px 22px 22px",
  padding: "10px 16px 18px",
  boxShadow: "0 -18px 56px rgba(15,23,42,0.22)",
  border: "1px solid rgba(226,232,240,0.95)",
};

const sheetHandle = {
  width: "44px",
  height: "5px",
  borderRadius: "999px",
  background: "#cbd5e1",
  margin: "0 auto 14px",
};

const sheetHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "12px",
};

const sheetEyebrow = {
  margin: "0 0 4px",
  color: "#5b3df5",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const sheetTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "21px",
  lineHeight: 1.15,
};

const sheetClose = {
  width: "38px",
  height: "38px",
  border: "1px solid rgba(148,163,184,0.42)",
  borderRadius: "50%",
  background: "#ffffff",
  color: "#334155",
  fontSize: "24px",
  fontWeight: "900",
  cursor: "pointer",
  flexShrink: 0,
};

const saveOption = {
  width: "100%",
  border: "1px solid #e2e8f0",
  background: "linear-gradient(135deg,#ffffff,#f8fafc)",
  borderRadius: "18px",
  padding: "14px",
  marginTop: "10px",
  display: "grid",
  gap: "5px",
  textAlign: "left",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: "750",
  cursor: "pointer",
};

const sendBtn = {
  width: "100%",
  padding: "16px",
  border: "none",
  borderRadius: "18px",
  background: "#5b3df5",
  color: "#ffffff",
  fontWeight: "900",
  cursor: "pointer",
};

const secondaryBtn = {
  ...sendBtn,
  background: "#ffffff",
  color: "#5b3df5",
  border: "1px solid rgba(91,61,245,0.22)",
};

const statusText = {
  margin: "12px 0 0",
  color: "#166534",
  background: "#f0fdf4",
  border: "1px solid rgba(34,197,94,0.24)",
  borderRadius: "14px",
  padding: "10px 12px",
  fontWeight: "850",
};

const previewBox = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowX: "hidden",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: "16px",
  padding: "14px",
  fontSize: "13px",
  lineHeight: 1.5,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const printPreview = {
  marginTop: "18px",
  padding: "20px",
  borderRadius: "18px",
  border: "1px solid #dbe4f0",
  background: "#ffffff",
  color: "#111827",
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
};

const printHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  alignItems: "flex-start",
  borderBottom: "2px solid #111827",
  paddingBottom: "14px",
  marginBottom: "14px",
};

const printEyebrow = {
  margin: "0 0 4px",
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const printTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "24px",
};

const printMeta = {
  display: "grid",
  gap: "4px",
  color: "#475569",
  fontSize: "13px",
  fontWeight: "800",
  textAlign: "right",
};

const printInfoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
  gap: "12px",
  marginBottom: "14px",
};

const printInfoBox = {
  display: "grid",
  gap: "4px",
  padding: "12px",
  borderRadius: "14px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.35,
};

const printSection = {
  display: "grid",
  gap: "6px",
  marginTop: "14px",
  color: "#334155",
  lineHeight: 1.45,
};

const printTable = {
  display: "grid",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  overflow: "hidden",
};

const printTableRow = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.6fr) minmax(70px, 0.7fr) 48px 72px 78px",
  gap: "8px",
  padding: "9px 10px",
  borderTop: "1px solid #e2e8f0",
  fontSize: "12px",
  alignItems: "center",
};

const printTableHead = {
  borderTop: "none",
  background: "#f8fafc",
  color: "#0f172a",
  fontWeight: "950",
};

const printTotals = {
  display: "grid",
  gap: "8px",
  margin: "16px 0 0 auto",
  maxWidth: "280px",
  padding: "12px",
  borderRadius: "14px",
  background: "#f8fafc",
};

const printTotalDue = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  paddingTop: "10px",
  borderTop: "1px solid #cbd5e1",
  color: "#111827",
  fontSize: "18px",
  fontWeight: "950",
};

export default InvoiceBuilder;
