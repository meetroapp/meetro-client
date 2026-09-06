import { useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import ContextualAskMeetro from "../components/ContextualAskMeetro";
import MeetroIcon from "../components/MeetroIcon";
import QuickQuoteConversation from "../components/QuickQuoteConversation.jsx";
import UnifiedBusinessDocumentWorkspace from "../components/UnifiedBusinessDocumentWorkspace.jsx";
import { pickNativeJobPhoto } from "../utils/cameraPhotoPicker.js";
import {
  QUOTE_DRAFT_PHOTO_MAX_COUNT,
  cleanupQuoteDraftPhoto,
  isQuickQuoteDraftPhotoUploadEnabled,
  uploadQuoteDraftPhotos,
  validateQuoteDraftPhotoFile,
} from "../utils/quoteDraftPhotoMedia.js";
import { getLanguage, t } from "../utils/language";
import { getWorkCenterContextReturnLabel } from "../utils/workCenterReturnLabels";
import {
  calculateCustomerTotal,
  normalizeLaborPricingType,
} from "../utils/pricingCalculations";
import { restoreConversationOriginContext } from "../utils/conversationOrigin";
import {
  CONVERSATION_ACTION_STAGE,
  getConversationActionLabel,
} from "../utils/conversationActionLanguage";
import { getBusinessIdentityProjection } from "../utils/businessIdentity";
import { getAskMeetroWorkflowCopy } from "../utils/askMeetroWorkflowLanguage";
import {
  INTELLIGENCE_OPERATION,
  createIntelligenceKey,
  recordQuoteCompositionReview,
  recordWorkflowReview,
  requestWorkflowIntelligence,
} from "../utils/contextualIntelligence";
import { applyConfirmedQuoteComposition } from "../utils/canonicalQuoteDraftCommands";
import {
  buildQuoteCompositionInput,
  getSolutionReadyReviewElements,
} from "../utils/quoteBuilderIntelligenceBoundary.js";
import {
  attachCustomerDocumentPhotoEvidence,
  buildQuickQuoteDocumentModel,
} from "../utils/customerDocumentModel";
import {
  downloadCustomerDocumentPdf,
  getCustomerDocumentActionCopy,
  previewCustomerDocumentPdfWithMedia,
  shareCustomerDocumentPdf,
} from "../utils/customerDocumentPdf";
import { getQuickQuoteConversationCopy } from "../utils/quickQuoteConversationLanguage.js";
import { getActiveJobSnapshot } from "../utils/workCenter.js";
import { getQuickQuoteProfessionalContinuation } from "../utils/quickQuoteProfessionalContinuation.js";
import {
  buildQuickQuoteEstimateInput,
  fetchAuthorizedProfessionalJobs,
} from "../utils/professionalJobPicker.js";
import {
  buildJobLinkedQuotePrefill,
  fetchJobLinkedQuoteContext,
  jobLinkedQuoteHasExistingContent,
  resolveJobLinkedSavedQuoteResume,
} from "../utils/jobLinkedQuoteContext.js";
import {
  getBusinessDocumentDraft,
  listBusinessDocumentDrafts,
} from "../utils/businessDocumentDraftApi.js";
import {
  createCanonicalInvoice,
  createInvoiceCommandKey,
  fetchProfessionalInvoiceWorkspace,
} from "../utils/invoicePaymentApi.js";
import {
  fetchEffectiveApprovedInvoiceQuote,
} from "../utils/invoiceReviewDraft.js";
import {
  bootstrapExactSavedQuote,
  parseSavedQuoteRoute,
  replaceSavedQuoteRoute,
  resolveOwnedSavedQuotesForJob,
} from "../utils/savedQuoteRoute.js";
import { isGenericNewQuoteRoute } from "../utils/newQuoteCustomerSetup.js";
import {
  quoteCustomerPricingProjection,
  quoteIndependentPaymentTerms,
} from "../utils/quotePricingPresentation.js";
import {
  extractProfessionalCategoryCostCandidates,
} from "../utils/quickQuoteProfessionalCategoryCosts.js";
import {
  analyzeQuickQuoteAnalysisSession,
  appendQuickQuoteAnalysisEvidence,
  applyQuickQuoteAnalysisExecutionToPresentationState,
  createQuickQuoteAnalysisPresentationState,
  createQuickQuoteAnalysisSession,
  continueQuickQuoteAnalysisSession,
  discardQuickQuoteAnalysisSession,
  hydrateQuickQuoteAnalysisPresentationState,
  loadQuickQuoteAnalysisReviewedResult,
  loadQuickQuoteAnalysisSession,
  markQuickQuoteAnalysisPresentationStale,
} from "../utils/quickQuoteAnalysisSession.js";

function safeJson(value, fallback = null) {
  try {
    return JSON.parse(value || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeQuotePricingMethodLabel(value) {
  return value === "Fixed Price" ? "Flat Fee" : value || "Flat Fee";
}

function parseQuotePricingAmount(value) {
  const cleaned = String(value ?? "")
    .replace(/[$,\s]/g, "")
    .trim();

  if (!cleaned) return 0;

  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function parseOptionalQuoteAmount(value) {
  const cleaned = String(value ?? "").replace(/[$,\s]/g, "").trim();
  if (!cleaned) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function stringifySavedAmount(value) {
  if (Array.isArray(value) || value === null || value === undefined) return "";
  const amount = parseQuotePricingAmount(value);
  return amount > 0 ? String(amount) : "";
}

function cleanText(value) {
  return String(value || "").trim();
}

function createQuickQuoteDraftPhoto(file, media) {
  if (!media?.public_id || !media?.secure_url) return null;

  return {
    id: media.public_id,
    name: file?.name || "quote-photo",
    previewUrl: media.secure_url,
    media,
    uploadState: "transient",
  };
}

function todayLocalIsoDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatQuickQuoteSharePricingLine({
  description,
  quantity,
  unitPrice,
  total,
  unitLabel = "",
  notes = "",
}) {
  const descriptionText = cleanText(description);
  const totalAmount = parseOptionalQuoteAmount(total);

  if (!descriptionText || totalAmount === null || totalAmount <= 0) return "";

  const quantityAmount = parseOptionalQuoteAmount(quantity);
  const unitAmount = parseOptionalQuoteAmount(unitPrice);
  const hasArithmetic =
    quantityAmount !== null &&
    quantityAmount > 0 &&
    unitAmount !== null &&
    unitAmount > 0;

  const pricingText = hasArithmetic
    ? `${quantityAmount}${unitLabel ? ` ${unitLabel}` : ""} × $${unitAmount.toFixed(
        2
      )} = $${totalAmount.toFixed(2)}`
    : `$${totalAmount.toFixed(2)}`;

  const noteText = cleanText(notes);

  return `- ${descriptionText}: ${pricingText}${
    noteText ? ` (${noteText})` : ""
  }`;
}

function isGenericQuoteText(value) {
  const text = cleanText(value).toLowerCase();
  return !text || ["project", "request", "service", "quote"].includes(text);
}

function firstSpecificText(...values) {
  return values.map(cleanText).find((value) => !isGenericQuoteText(value)) || "";
}

function getMeasurementUnitLabel(unit = "", isSpanish = false) {
  const labels = {
    inches: isSpanish ? "pulgadas" : "inches",
    feet: isSpanish ? "pies" : "feet",
    feet_inches: isSpanish ? "pies + pulgadas" : "feet + inches",
    centimeters: isSpanish ? "centímetros" : "centimeters",
    meters: isSpanish ? "metros" : "meters",
    count: isSpanish ? "cantidad" : "count",
    square_feet: isSpanish ? "pies cuadrados" : "square feet",
    linear_feet: isSpanish ? "pies lineales" : "linear feet",
  };

  return labels[unit] || unit || "";
}

function formatImportedMeasurementLines(measurement = {}, isSpanish = false) {
  const label = cleanText(measurement.label);
  const unit = getMeasurementUnitLabel(measurement.unit, isSpanish);
  const lines = [];
  const formatValue = (value) => [value, unit].filter(Boolean).join(" ");
  const feetInchesValue = [
    measurement.feet ? `${measurement.feet} ${isSpanish ? "pies" : "ft"}` : "",
    measurement.inches ? `${measurement.inches} ${isSpanish ? "pulg." : "in"}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (measurement.width) {
    lines.push(`${isSpanish ? "Ancho" : "Width"}: ${formatValue(measurement.width)}`);
  }
  if (measurement.height) {
    lines.push(`${isSpanish ? "Alto" : "Height"}: ${formatValue(measurement.height)}`);
  }
  if (measurement.depth) {
    lines.push(`${isSpanish ? "Profundidad" : "Depth"}: ${formatValue(measurement.depth)}`);
  }

  if (lines.length === 0) {
    const value =
      measurement.unit === "feet_inches"
        ? feetInchesValue
        : [measurement.value, unit].filter(Boolean).join(" ");

    if (value) {
      lines.push(label ? `${label}: ${value}` : value);
    }
  } else if (label) {
    lines.unshift(label);
  }

  const quantity = cleanText(measurement.quantity);
  const notes = cleanText(measurement.notes);

  if (quantity) lines.push(`${isSpanish ? "Cantidad" : "Quantity"}: ${quantity}`);
  if (notes) lines.push(notes);

  return lines.filter(Boolean);
}

function normalizeQuoteWorkItem(item = {}, index = 0, isSpanish = false) {
  const title = cleanText(item.title) || `${isSpanish ? "Elemento" : "Scope Item"} ${index + 1}`;

  return {
    id: item.id || `imported-item-${index}`,
    title,
    notes: cleanText(item.notes),
    safetyNotes: cleanText(item.safetyNotes),
    photos: Array.isArray(item.photos) ? item.photos : [],
    measurements: Array.isArray(item.measurements)
      ? item.measurements
          .flatMap((measurement) => formatImportedMeasurementLines(measurement, isSpanish))
          .filter(Boolean)
      : [],
    materials: Array.isArray(item.materials)
      ? item.materials
          .map((material, materialIndex) => ({
            id: material.id || `${item.id || index}-material-${materialIndex}`,
            name: cleanText(material.name),
            quantity: cleanText(material.quantity),
            unitPrice: cleanText(material.unitPrice ?? material.unit),
            lineTotal: parseOptionalQuoteAmount(material.lineTotal),
            provider: cleanText(material.provider),
            notes: cleanText(material.notes),
          }))
          .filter((material) =>
            [
              material.name,
              material.quantity,
              material.unitPrice,
              material.lineTotal,
              material.provider,
              material.notes,
            ]
              .some(Boolean)
          )
      : [],
  };
}

function getQuoteMaterialLineTotal(material = {}) {
  if (material.lineTotal !== null && material.lineTotal !== undefined && material.lineTotal !== "") {
    const savedLineTotal = parseOptionalQuoteAmount(material.lineTotal);
    if (savedLineTotal !== null) return savedLineTotal;
  }
  const quantity = parseOptionalQuoteAmount(material.quantity);
  const unitPrice = parseOptionalQuoteAmount(material.unitPrice ?? material.unit);
  if (quantity === null || unitPrice === null) return null;
  return quantity * unitPrice;
}

function createQuoteRowId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getEditableRowTotal(row = {}, quantityKey = "quantity", priceKey = "unitPrice", totalKey = "total") {
  const manualTotal = parseOptionalQuoteAmount(row[totalKey]);
  if (manualTotal !== null) return manualTotal;

  const quantity = parseOptionalQuoteAmount(row[quantityKey]);
  const price = parseOptionalQuoteAmount(row[priceKey]);
  if (quantity === null || price === null) return 0;
  return quantity * price;
}

function normalizeQuoteLineItem(item = {}, index = 0, fallbackDescription = "") {
  const quantity = cleanText(item.quantity ?? item.qty ?? "1");
  const unitPrice = cleanText(item.unitPrice ?? item.rate ?? item.price ?? "");
  const savedTotal = cleanText(item.total ?? item.amount ?? item.lineTotal ?? "");
  const computedTotal =
    savedTotal || (quantity && unitPrice ? String(getEditableRowTotal({ quantity, unitPrice })) : "");

  return {
    id: item.id || `quote-line-${index}`,
    description: cleanText(item.description || item.label || item.title || fallbackDescription),
    quantity,
    unitPrice,
    total: computedTotal,
  };
}

function normalizeQuoteMaterialItem(item = {}, index = 0) {
  const quantity = cleanText(item.quantity ?? item.qty ?? "");
  const cost = cleanText(item.cost ?? item.unitPrice ?? item.price ?? "");
  const savedTotal = cleanText(item.total ?? item.amount ?? item.lineTotal ?? "");

  return {
    id: item.id || `material-line-${index}`,
    name: cleanText(item.name || item.description || item.label),
    quantity,
    cost,
    total: savedTotal || (quantity && cost ? String(getEditableRowTotal({ quantity, cost }, "quantity", "cost")) : ""),
    notes: cleanText(item.notes || item.provider),
  };
}

function normalizeQuoteLaborItem(item = {}, index = 0, isSpanish = false) {
  const hours = cleanText(item.hours ?? item.estimatedHours ?? item.quantity ?? "");
  const rate = cleanText(item.rate ?? item.unitPrice ?? "");
  const savedTotal = cleanText(item.total ?? item.amount ?? item.lineTotal ?? "");

  return {
    id: item.id || `labor-line-${index}`,
    description: cleanText(item.description || item.label || item.title) || (isSpanish ? "Mano de obra" : "Labor"),
    hours,
    rate,
    total: savedTotal || (hours && rate ? String(getEditableRowTotal({ hours, rate }, "hours", "rate")) : ""),
  };
}

function buildRecommendedSolutionText({
  importedWorkItems = [],
  projectDescription = "",
  isSpanish = false,
}) {
  const primaryNotes = importedWorkItems
    .map((item) => cleanText(item.notes))
    .filter(Boolean);
  const scopeTitles = importedWorkItems
    .map((item) => cleanText(item.title))
    .filter((title) => !isGenericQuoteText(title));
  const safetyNotes = importedWorkItems
    .map((item) => cleanText(item.safetyNotes))
    .filter(Boolean);

  if (isSpanish) {
    return [
      primaryNotes[0] || projectDescription || "Revisé la solicitud y preparé una solución recomendada para completar el trabajo.",
      scopeTitles.length
        ? `Recomendación: completar ${scopeTitles.join(", ")}.`
        : "Recomendación: completar el trabajo descrito con materiales y mano de obra revisados.",
      safetyNotes[0] ? `Notas adicionales: ${safetyNotes[0]}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    primaryNotes[0] || projectDescription || "I reviewed the request and prepared a recommended solution to complete the work.",
    scopeTitles.length
      ? `Recommendation: complete ${scopeTitles.join(", ")}.`
      : "Recommendation: complete the described work with reviewed materials and labor.",
    safetyNotes[0] ? `Additional notes: ${safetyNotes[0]}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

const proposalTypeOptions = [
  "Repair",
  "Replace",
  "Install",
  "Upgrade",
  "Maintenance",
  "Inspection",
  "Emergency Repair",
  "Custom",
];

const laborCategoryOptions = [
  "Handyman",
  "Carpentry",
  "Painting",
  "Drywall",
  "Plumbing",
  "Electrical",
  "Tile",
  "Cleaning",
  "Custom",
];

const materialProviderOptions = [
  "Professional Provides",
  "Customer Provides",
  "Supplier Pickup",
  "Delivery Needed",
  "Shared / Other",
];

const pricingMethodOptions = [
  "Flat Fee",
  "Hourly",
  "Materials + Labor",
  "Estimate Range",
  "Custom",
];

const priorityOptions = ["Standard", "Urgent", "Emergency", "Flexible"];

function QuoteBuilder({ setPage, initialDocument = "quote" }) {
  const language = getLanguage();
  const activeJobSnapshot = getActiveJobSnapshot();
  const isSpanish = language === "es";
  const quoteBuilderReturnPage =
    localStorage.getItem("quoteBuilderReturnPage") || "";
  const quoteBuilderSource =
    localStorage.getItem("quoteBuilderSource") || "";
  const invoiceBuilderReturnPage =
    localStorage.getItem("invoiceBuilderReturnPage") || "";
  const invoiceBuilderSource =
    localStorage.getItem("invoiceBuilderSource") || "";
  const isUnifiedInvoiceEntry = initialDocument === "invoice";
  const isUnifiedDepositRequestEntry = initialDocument === "depositRequest";
  const isGenericNewQuoteIntent =
    initialDocument === "quote" && isGenericNewQuoteRoute(window.location.hash);
  const isWorkCenterReturn =
    quoteBuilderReturnPage === "workCenter" ||
    quoteBuilderReturnPage === "contractorDashboard";
  const isBusinessToolsReturn =
    quoteBuilderReturnPage === "businessCommandCenter";
  const isUniversalQuickQuote =
    (isBusinessToolsReturn && quoteBuilderSource === "business_tools_quick_quote") ||
    quoteBuilderSource === "desktop_sidebar_quick_quote" ||
    quoteBuilderSource === "desktop_sidebar_quote_invoice";
  const isDesktopSidebarQuickQuote =
    quoteBuilderSource === "desktop_sidebar_quick_quote";
  const workCenterReturnCustomer =
    localStorage.getItem("workCenterReturnCustomer") || "";
  const initialSavedQuoteRouteRef = useRef(null);
  if (!initialSavedQuoteRouteRef.current) {
    initialSavedQuoteRouteRef.current = parseSavedQuoteRoute(window.location.hash);
  }
  const savedQuoteRoute = initialSavedQuoteRouteRef.current;
  const routeCanonicalJobId = savedQuoteRoute.jobId;
  const routeSavedDocumentId = savedQuoteRoute.draftId;

  const revisedQuoteContext = safeJson(
    localStorage.getItem("meetroRevisedQuoteContext")
  );

  const isRevisedQuoteFlow =
    revisedQuoteContext?.source === "workflow_change_request";

  const selectedWorkCenterRequest = isUniversalQuickQuote || isGenericNewQuoteIntent
    ? null
    : safeJson(localStorage.getItem("selectedWorkCenterRequest"));

  const selectedQuoteRequest = isUniversalQuickQuote || isGenericNewQuoteIntent
    ? null
    : safeJson(localStorage.getItem("selectedQuoteRequest"));

  const selectedHomeownerRequest = isUniversalQuickQuote || isGenericNewQuoteIntent
    ? null
    : safeJson(localStorage.getItem("selectedHomeownerRequest"));

  // Browser-stored quote records are not authoritative and must not reopen as saved work.
  const selectedQuoteForEdit = null;

  const isEditingExistingQuote = Boolean(selectedQuoteForEdit?.quoteId);

  const activeQuoteRequestId =
    localStorage.getItem("activeWorkCenterQuoteRequestId") || "";

  const workCenterRequestId =
    selectedWorkCenterRequest?.requestId ||
    selectedWorkCenterRequest?.id ||
    "";

  const request = routeCanonicalJobId || routeSavedDocumentId || isUniversalQuickQuote || isGenericNewQuoteIntent
    ? {}
    : isRevisedQuoteFlow
    ? {
        requestId: revisedQuoteContext?.requestId || "",
        title: revisedQuoteContext?.projectTitle || "Project",
        description: revisedQuoteContext?.projectDescription || "",
        homeownerName: revisedQuoteContext?.homeownerName || "Homeowner",
      }
    : selectedQuoteForEdit
    ? selectedQuoteForEdit
    : activeQuoteRequestId &&
      String(workCenterRequestId) === String(activeQuoteRequestId)
    ? selectedWorkCenterRequest
    : selectedQuoteRequest ||
      selectedWorkCenterRequest ||
      selectedHomeownerRequest ||
      {};

  const [quoteNumber, setQuoteNumber] = useState(
    selectedQuoteForEdit
      ? selectedQuoteForEdit.quoteNumber ||
          selectedQuoteForEdit.quote_number ||
          selectedQuoteForEdit.manualQuoteNumber ||
          ""
      : request.quoteNumber ||
          request.quote_number ||
          ""
  );
  const [quoteDate, setQuoteDate] = useState(
    selectedQuoteForEdit?.quoteDate ||
      selectedQuoteForEdit?.date ||
      todayLocalIsoDate()
  );
  const [labor, setLabor] = useState(
    stringifySavedAmount(
      selectedQuoteForEdit?.laborAmount ??
        selectedQuoteForEdit?.pricingBreakdown?.laborAmount ??
        selectedQuoteForEdit?.labor
    )
  );
  const [materials, setMaterials] = useState(
    stringifySavedAmount(
      selectedQuoteForEdit?.materialsAmount ??
        selectedQuoteForEdit?.pricingBreakdown?.materialsAmount ??
        selectedQuoteForEdit?.materials ??
        request.materialsTotal ??
        request.calculatedMaterialsTotal
    )
  );
  const [timeline, setTimeline] = useState(
    selectedQuoteForEdit?.timeline || request.timeline || ""
  );
  const [notes, setNotes] = useState(
    selectedQuoteForEdit?.notes ||
      request.visitNotes ||
      request.customerNeeds ||
      (request.source === "schedule_evaluation" ? "" : request.evaluationNotes) ||
      request.scope ||
      ""
  );
  const [terms, setTerms] = useState(
    selectedQuoteForEdit?.terms || request.terms || ""
  );
  const [totalOverride, setTotalOverride] = useState(
    stringifySavedAmount(
      selectedQuoteForEdit?.totalAmount ??
        selectedQuoteForEdit?.quoteTotal ??
        selectedQuoteForEdit?.amount ??
        request.totalAmount ??
        request.quoteTotal ??
        request.amount
    )
  );
  const legacyLaborAmount = parseQuotePricingAmount(labor);
  const legacyMaterialsAmount = parseQuotePricingAmount(materials);

  const quoteContextPayload = {
    scheduleId: request.scheduleId || "",
    visitId: request.visitId || request.scheduleId || "",
    visitDate: request.visitDate || request.date || "",
    visitTime: request.visitTime || request.time || "",
    evaluationId: request.evaluationId || request.evaluation?.id || "",
    evaluationNotes: request.evaluationNotes || request.evaluation?.notes || "",
    visitNotes: request.visitNotes || request.evaluation?.visitNotes || "",
    safetyNotes: request.safetyNotes || request.evaluation?.safetyNotes || "",
    evaluationItems: Array.isArray(request.evaluationItems)
      ? request.evaluationItems
      : Array.isArray(request.workItems)
      ? request.workItems
      : Array.isArray(request.evaluation?.workItems)
      ? request.evaluation.workItems
      : [],
    workItems: Array.isArray(request.workItems)
      ? request.workItems
      : Array.isArray(request.evaluationItems)
      ? request.evaluationItems
      : Array.isArray(request.evaluation?.workItems)
      ? request.evaluation.workItems
      : [],
    evaluationPhotos: Array.isArray(request.evaluationPhotos)
      ? request.evaluationPhotos
      : Array.isArray(request.evaluation?.photos)
      ? request.evaluation.photos
      : [],
    photosMetadata: Array.isArray(request.photosMetadata)
      ? request.photosMetadata
      : Array.isArray(request.evaluationPhotos)
      ? request.evaluationPhotos
      : [],
    measurements: Array.isArray(request.measurements) ? request.measurements : [],
    materialItems: Array.isArray(request.materialItems) ? request.materialItems : [],
    materialsTotal:
      parseOptionalQuoteAmount(request.materialsTotal ?? request.calculatedMaterialsTotal) ??
      null,
    materialsList: Array.isArray(request.materials) ? request.materials : [],
    customerPhone: request.customerPhone || request.phone || "",
    customerEmail: request.customerEmail || request.email || request.homeowner_email || "",
    customerAddress: request.customerAddress || request.address || request.location || "",
    manualCustomerContactId: request.manualCustomerContactId || "",
    isMeetroUser: request.isMeetroUser !== false,
  };

  const importedWorkItems = quoteContextPayload.workItems
    .map((item, index) => normalizeQuoteWorkItem(item, index, isSpanish))
    .filter((item) =>
      [
        item.title,
        item.notes,
        item.safetyNotes,
        item.photos.length,
        item.measurements.length,
        item.materials.length,
      ].some(Boolean)
    );
  const importedMaterials = (
    quoteContextPayload.materialItems.length > 0
      ? quoteContextPayload.materialItems.map((material, index) => ({
          id: material.id || `imported-material-${index}`,
          name: cleanText(material.name),
          quantity: cleanText(material.quantity),
          unitPrice: cleanText(material.unitPrice ?? material.unit),
          lineTotal: getQuoteMaterialLineTotal(material),
          provider: cleanText(material.provider),
          notes: cleanText(material.notes),
          workItemTitle: cleanText(material.workItemTitle),
        }))
      : quoteContextPayload.materialsList.length > 0
      ? quoteContextPayload.materialsList.map((material, index) => ({
          id: material.id || `imported-material-${index}`,
          name: cleanText(material.name),
          quantity: cleanText(material.quantity),
          unitPrice: cleanText(material.unitPrice ?? material.unit),
          lineTotal: getQuoteMaterialLineTotal(material),
          provider: cleanText(material.provider),
          notes: cleanText(material.notes),
        }))
      : importedWorkItems.flatMap((item) =>
        item.materials.map((material) => ({
          ...material,
          lineTotal: getQuoteMaterialLineTotal(material),
          workItemTitle: item.title,
        }))
        )
  ).filter((material) =>
    [
      material.name,
      material.quantity,
      material.unitPrice,
      material.lineTotal,
      material.provider,
      material.notes,
    ]
      .some(Boolean)
  );
  const hasImportedEvaluation =
    importedWorkItems.length > 0 ||
    importedMaterials.length > 0 ||
    Boolean(quoteContextPayload.evaluationNotes);

  const initialCustomerLocation = firstSpecificText(
    request.visitAddress,
    request.visitLocation,
    request.scheduleAddress,
    request.scheduleLocation,
    request.customerAddress,
    request.manualCustomerAddress,
    request.address,
    request.location,
    quoteContextPayload.customerAddress
  );

  const initialProjectTitle =
    firstSpecificText(
      request.projectTitle,
      request.project_title,
      request.title,
      request.serviceTitle,
      request.service,
      request.visitTitle,
      request.appointmentTitle,
      request.appointmentType,
      request.customerNeeds,
      request.description,
      request.projectDescription,
      request.project_description,
      importedWorkItems[0]?.title,
      request.category
    ) || (isUniversalQuickQuote ? "" : isSpanish ? "Visita programada" : "Scheduled Estimate Visit");

  const initialProjectDescription = isUniversalQuickQuote
    ? ""
    : hasImportedEvaluation
    ? request.visitNotes ||
      request.customerNeeds ||
      request.description ||
      request.projectDescription ||
      request.project_description ||
      (isSpanish
        ? "Detalles importados de la visita de evaluación."
        : "Details imported from the evaluation visit.")
    : request.description || request.project_description || "";

  const defaultRecommendedSolution = buildRecommendedSolutionText({
    importedWorkItems,
    projectDescription: initialProjectDescription,
    isSpanish,
  });
  const initialProblemFound =
    importedWorkItems.map((item) => cleanText(item.notes)).find(Boolean) ||
    quoteContextPayload.evaluationNotes ||
    initialProjectDescription;
  const [projectTitle, setProjectTitle] = useState(
    selectedQuoteForEdit?.projectTitle ||
      selectedQuoteForEdit?.title ||
      initialProjectTitle
  );
  const [projectDescription, setProjectDescription] = useState(
    selectedQuoteForEdit?.projectDescription ||
      selectedQuoteForEdit?.description ||
      initialProjectDescription
  );
  const [customerName, setCustomerName] = useState(
    selectedQuoteForEdit?.customerName ||
      selectedQuoteForEdit?.homeownerName ||
      request.customerName ||
      request.homeownerName ||
      request.homeowner_email ||
      ""
  );
  const [customerEmail, setCustomerEmail] = useState(
    selectedQuoteForEdit?.customerEmail ||
      request.customerEmail ||
      request.homeowner_email ||
      ""
  );
  const [customerPhone, setCustomerPhone] = useState(
    selectedQuoteForEdit?.customerPhone ||
      request.customerPhone ||
      request.phone ||
      ""
  );
  const [customerAddress, setCustomerAddress] = useState(
    selectedQuoteForEdit?.customerAddress ||
      selectedQuoteForEdit?.address ||
      request.customerAddress ||
      request.address ||
      ""
  );
  const [agreement, setAgreement] = useState(
    selectedQuoteForEdit?.agreement || {}
  );
  const [customerLocation, setCustomerLocation] = useState(
    selectedQuoteForEdit?.location ||
      selectedQuoteForEdit?.address ||
      initialCustomerLocation
  );
  const [problemFound, setProblemFound] = useState(
    selectedQuoteForEdit?.problemFound ||
      selectedQuoteForEdit?.customerRequest ||
      request.problemFound ||
      initialProblemFound
  );
  const [recommendedSolution, setRecommendedSolution] = useState(
    selectedQuoteForEdit?.recommendedSolution ||
      selectedQuoteForEdit?.proposalSummary ||
      request.recommendedSolution ||
      request.proposalSummary ||
      (isUniversalQuickQuote ? "" : defaultRecommendedSolution)
  );
  const [proposalType, setProposalType] = useState(
    selectedQuoteForEdit?.proposalType || selectedQuoteForEdit?.quoteMetadata?.proposalType || "Repair"
  );
  const [customProposalType, setCustomProposalType] = useState(
    selectedQuoteForEdit?.customProposalType || selectedQuoteForEdit?.quoteMetadata?.customProposalType || ""
  );
  const [laborCategory, setLaborCategory] = useState(
    selectedQuoteForEdit?.laborCategory || selectedQuoteForEdit?.quoteMetadata?.laborCategory || "Handyman"
  );
  const [customLaborCategory, setCustomLaborCategory] = useState(
    selectedQuoteForEdit?.customLaborCategory || selectedQuoteForEdit?.quoteMetadata?.customLaborCategory || ""
  );
  const [materialProvider, setMaterialProvider] = useState(
    selectedQuoteForEdit?.materialProvider || selectedQuoteForEdit?.quoteMetadata?.materialProvider || "Professional Provides"
  );
  const [pricingMethod, setPricingMethod] = useState(
    normalizeQuotePricingMethodLabel(
      selectedQuoteForEdit?.pricingMethod ||
        selectedQuoteForEdit?.quoteMetadata?.pricingMethod ||
        "Flat Fee"
    )
  );
  const [customPricingMethod, setCustomPricingMethod] = useState(
    selectedQuoteForEdit?.customPricingMethod || selectedQuoteForEdit?.quoteMetadata?.customPricingMethod || ""
  );
  const [priority, setPriority] = useState(
    selectedQuoteForEdit?.priority || selectedQuoteForEdit?.quoteMetadata?.priority || "Standard"
  );
  const [travelFee, setTravelFee] = useState(
    stringifySavedAmount(selectedQuoteForEdit?.travelFee || selectedQuoteForEdit?.quoteMetadata?.travelFee)
  );
  const [disposalFee, setDisposalFee] = useState(
    stringifySavedAmount(selectedQuoteForEdit?.disposalFee || selectedQuoteForEdit?.quoteMetadata?.disposalFee)
  );
  const [depositRequired, setDepositRequired] = useState(
    selectedQuoteForEdit?.depositRequired || selectedQuoteForEdit?.quoteMetadata?.depositRequired || "No"
  );
  const [depositAmount, setDepositAmount] = useState(
    stringifySavedAmount(selectedQuoteForEdit?.depositAmount || selectedQuoteForEdit?.quoteMetadata?.depositAmount)
  );
  const [pricingDisplayMode, setPricingDisplayMode] = useState(
    selectedQuoteForEdit?.pricingDisplayMode || "DETAILED_LINE_ITEMS"
  );
  const [materialsDisplayMode, setMaterialsDisplayMode] = useState(
    selectedQuoteForEdit?.materialsDisplayMode || "SHOW_SEPARATELY"
  );
  const [depositMode, setDepositMode] = useState(
    selectedQuoteForEdit?.depositMode ||
      (selectedQuoteForEdit?.depositRequired === "Yes" && selectedQuoteForEdit?.depositAmount ? "FIXED" : "NONE")
  );
  const [depositPercent, setDepositPercent] = useState(
    stringifySavedAmount(selectedQuoteForEdit?.depositPercent)
  );
  const [depositFixedAmount, setDepositFixedAmount] = useState(
    stringifySavedAmount(selectedQuoteForEdit?.depositFixedAmount || selectedQuoteForEdit?.depositAmount)
  );
  const [startDate, setStartDate] = useState(
    selectedQuoteForEdit?.startDate || selectedQuoteForEdit?.quoteMetadata?.startDate || ""
  );
  const [estimatedDuration, setEstimatedDuration] = useState(
    selectedQuoteForEdit?.estimatedDuration || selectedQuoteForEdit?.quoteMetadata?.estimatedDuration || ""
  );
  const [lineItems, setLineItems] = useState(() => {
    const savedLineItems = Array.isArray(selectedQuoteForEdit?.quoteLineItems)
      ? selectedQuoteForEdit.quoteLineItems
      : Array.isArray(selectedQuoteForEdit?.serviceLineItems)
      ? selectedQuoteForEdit.serviceLineItems
      : [];

    if (savedLineItems.length > 0) {
      return savedLineItems.map((item, index) => normalizeQuoteLineItem(item, index));
    }

    if (!isUniversalQuickQuote && importedWorkItems.length > 0) {
      return importedWorkItems.map((item, index) =>
        normalizeQuoteLineItem({}, index, item.title)
      );
    }

    return [normalizeQuoteLineItem({}, 0)];
  });
  const [materialRows, setMaterialRows] = useState(() => {
    const savedMaterials = Array.isArray(selectedQuoteForEdit?.materialItems)
      ? selectedQuoteForEdit.materialItems
      : Array.isArray(selectedQuoteForEdit?.quoteMaterials)
      ? selectedQuoteForEdit.quoteMaterials
      : [];

    if (savedMaterials.length > 0) {
      return savedMaterials.map((item, index) => normalizeQuoteMaterialItem(item, index));
    }

    if (!isUniversalQuickQuote && importedMaterials.length > 0) {
      return importedMaterials.map((item, index) => normalizeQuoteMaterialItem(item, index));
    }

    return [normalizeQuoteMaterialItem({}, 0)];
  });
  const [laborRows, setLaborRows] = useState(() => {
    const savedLabor = Array.isArray(selectedQuoteForEdit?.laborItems)
      ? selectedQuoteForEdit.laborItems
      : Array.isArray(selectedQuoteForEdit?.quoteLabor)
      ? selectedQuoteForEdit.quoteLabor
      : [];

    if (savedLabor.length > 0) {
      return savedLabor.map((item, index) =>
        normalizeQuoteLaborItem(item, index, isSpanish)
      );
    }

    return [normalizeQuoteLaborItem({}, 0, isSpanish)];
  });
  const [discount, setDiscount] = useState(
    stringifySavedAmount(
      selectedQuoteForEdit?.discountAmount ??
        selectedQuoteForEdit?.discount ??
        selectedQuoteForEdit?.pricingBreakdown?.discountAmount
    )
  );
  const [tax, setTax] = useState(
    stringifySavedAmount(
      selectedQuoteForEdit?.taxAmount ??
        selectedQuoteForEdit?.tax ??
        selectedQuoteForEdit?.pricingBreakdown?.taxAmount
    )
  );
  const [quotePreviewOpen, setQuotePreviewOpen] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState("");
  const [assistant, setAssistant] = useState({ busy: false, error: "", notice: "", result: null, commandKeys: null });
  const [quickQuoteView, setQuickQuoteView] = useState(
    isUniversalQuickQuote ? "entry" : "details"
  );
  const [quickQuotePrompt, setQuickQuotePrompt] = useState("");
  const [quickQuoteDraftPhotos, setQuickQuoteDraftPhotos] = useState([]);
  const [quickQuotePhotoNotice, setQuickQuotePhotoNotice] = useState("");
  const [quickQuoteContinuationNotice, setQuickQuoteContinuationNotice] =
    useState("");
  const [quickQuoteAttachedJob, setQuickQuoteAttachedJob] = useState(null);
  const [jobLinkedQuoteContext, setJobLinkedQuoteContext] = useState(() => ({
    status: routeCanonicalJobId && !isUnifiedInvoiceEntry
      ? "loading"
      : "standalone",
    reason: "",
    context: null,
    existingQuoteProtected: false,
    savedQuoteResume: null,
    reopenDocumentId: null,
  }));
  const [
    depositRequestSourceQuoteDocument,
    setDepositRequestSourceQuoteDocument,
  ] = useState(null);

  const [invoicePreparation, setInvoicePreparation] = useState(() => ({
    status: isUnifiedInvoiceEntry && routeCanonicalJobId ? "loading" : "standalone",
    job: null,
    resumeDocumentId: null,
    error: "",
  }));
  const invoicePreparationRequestRef = useRef(null);
  const setPageRef = useRef(setPage);
  setPageRef.current = setPage;
  const [savedRouteBootstrap, setSavedRouteBootstrap] = useState(() => ({
    status: routeSavedDocumentId ? "loading" : "standalone",
    reason: "",
    document: null,
  }));
  const jobLinkedQuoteHydrationRef = useRef("");
  const [quickQuoteJobConnection, setQuickQuoteJobConnection] = useState({
    stage: "idle",
    busy: false,
    error: "",
    jobs: [],
    selectedJobId: "",
  });
  const [quickQuotePhotoBusy, setQuickQuotePhotoBusy] = useState(false);
  const [quickQuotePhotoAssistant, setQuickQuotePhotoAssistant] = useState({
    busy: false,
    error: "",
    proposal: null,
    decisions: {},
    reviewingId: "",
  });
  const [quickQuoteAnalysisState, setQuickQuoteAnalysisState] = useState({
    available: false,
    stale: false,
    analyzedPrompt: "",
  });
  const [
    quickQuoteAnalysisSessionState,
    setQuickQuoteAnalysisSessionState,
  ] = useState(() =>
    createQuickQuoteAnalysisPresentationState()
  );
  const [
    quickQuoteReviewedResult,
    setQuickQuoteReviewedResult,
  ] = useState(null);
  const quickQuoteReviewedResultRequestRef =
    useRef(0);
  const quickQuotePhotoInputRef = useRef(null);
  const quickQuoteDraftPhotosRef = useRef([]);
  const quickQuotePersistedPhotoIdsRef = useRef(new Set());
  const quickQuotePhotoDocumentRef = useRef(new Map());
  const quickQuotePhotoTargetDocumentRef = useRef("quote");
  const quickQuoteCopy = getQuickQuoteConversationCopy(language);
  const quickQuotePhotoUploadEnabled =
    isQuickQuoteDraftPhotoUploadEnabled();

  const lineItemsTotal = lineItems.reduce(
    (sum, item) => sum + getEditableRowTotal(item),
    0
  );
  const materialRowsTotal = materialRows.reduce(
    (sum, item) => sum + getEditableRowTotal(item, "quantity", "cost"),
    0
  );
  const laborRowsTotal = laborRows.reduce(
    (sum, item) => sum + getEditableRowTotal(item, "hours", "rate"),
    0
  );
  const laborAmount = laborRowsTotal || legacyLaborAmount;
  const materialsAmount = materialRowsTotal || legacyMaterialsAmount;
  const discountAmount = parseQuotePricingAmount(discount);
  const taxAmount = parseQuotePricingAmount(tax);
  const travelFeeAmount = parseQuotePricingAmount(travelFee);
  const disposalFeeAmount = parseQuotePricingAmount(disposalFee);
  const depositAmountValue = parseQuotePricingAmount(depositAmount);
  const feesAmount = travelFeeAmount + disposalFeeAmount;
  const laborPricingType = normalizeLaborPricingType(pricingMethod);
  const subtotalAmount = lineItemsTotal + laborAmount + materialsAmount + feesAmount;
  const manualTotalAmount = parseOptionalQuoteAmount(totalOverride);
  const calculatedSubtotalWithAdjustments = calculateCustomerTotal({
    subtotal: subtotalAmount,
    discount: discountAmount,
    tax: taxAmount,
  });
  const calculatedTotal =
    manualTotalAmount !== null ? manualTotalAmount : calculatedSubtotalWithAdjustments;
  const importedPhotoCount = [
    ...quoteContextPayload.evaluationPhotos,
    ...importedWorkItems.flatMap((item) => item.photos || []),
  ].filter(Boolean).length;
  const importedMeasurementCount =
    quoteContextPayload.measurements.length +
    importedWorkItems.reduce((sum, item) => sum + item.measurements.length, 0);
  const importedFindingSummary =
    importedWorkItems.map((item) => cleanText(item.notes)).find(Boolean) ||
    cleanText(quoteContextPayload.evaluationNotes) ||
    (isSpanish ? "Resumen listo para revisar." : "Summary ready to review.");
  const compactMaterialRows = materialRows.filter((item) =>
    [item.name, item.quantity, item.cost, item.total].some((value) => cleanText(value))
  );

  useEffect(() => {
    quickQuoteDraftPhotosRef.current = quickQuoteDraftPhotos;
  }, [quickQuoteDraftPhotos]);

  useEffect(() => {
    const persistedPhotoIds = quickQuotePersistedPhotoIdsRef.current;
    document.body.classList.add("meetro-quote-builder-open");

    return () => {
      document.body.classList.remove("meetro-quote-builder-open");
      quickQuoteDraftPhotosRef.current.forEach((photo) => {
        if (photo.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
        if (photo.media && !persistedPhotoIds.has(photo.id)) {
          void cleanupQuoteDraftPhoto({ media: photo.media });
        }
      });
      quickQuoteDraftPhotosRef.current = [];
    };
  }, []);

  function updateRow(setRows, rowId, field, value) {
    setRows((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  }

  function removeRow(setRows, rowId, fallbackRow) {
    setRows((rows) => {
      const nextRows = rows.filter((row) => row.id !== rowId);
      return nextRows.length > 0 ? nextRows : [fallbackRow];
    });
  }

  const requestedCanonicalJobId =
    routeCanonicalJobId || cleanText(request.jobId || request.job_id);
  const canonicalJobId =
    quickQuoteAttachedJob?.jobId || requestedCanonicalJobId;
  const savedQuoteContextJobId =
    routeCanonicalJobId ||
    (routeSavedDocumentId ? savedRouteBootstrap.document?.jobId || "" : "");

  useEffect(() => {
    if (!isUnifiedInvoiceEntry || !routeCanonicalJobId || routeSavedDocumentId) {
      invoicePreparationRequestRef.current = null;
      return undefined;
    }
    const requestKey = `job:${routeCanonicalJobId}`;
    let active = true;
    setInvoicePreparation({ status: "loading", job: null, resumeDocumentId: null, error: "" });
    const existingRequest = invoicePreparationRequestRef.current;
    const request = existingRequest?.key === requestKey
      ? existingRequest.promise
      : Promise.all([
          fetchProfessionalInvoiceWorkspace({ limit: 50, setPage: setPageRef.current }),
          listBusinessDocumentDrafts({ type: "INVOICE", setPage: setPageRef.current }),
        ]).then(async ([workspace, documents]) => {
          const prepared = workspace.readyJobs.find((job) => job.jobId === routeCanonicalJobId);
          if (!prepared) return { workspace, documents, prepared: null, quoteReference: null };
          const quoteReference = await fetchEffectiveApprovedInvoiceQuote({
            jobId: routeCanonicalJobId,
            approvedTotalMinor: prepared.approvedAmount?.totalMinor,
            setPage: setPageRef.current,
          });
          return { workspace, documents, prepared, quoteReference };
        });
    invoicePreparationRequestRef.current = { key: requestKey, promise: request };
    void request.then(({ documents, prepared, quoteReference }) => {
      if (!active) return;
      if (!prepared) {
        setInvoicePreparation({
          status: "unavailable", job: null, resumeDocumentId: null,
          error: "This completed Job is not ready for Invoice review.",
        });
        return;
      }
      const matches = documents.filter((document) =>
        document.documentType === "INVOICE" &&
        document.status === "WORKING_DRAFT" &&
        document.jobId === routeCanonicalJobId
      );
      setQuickQuoteAttachedJob({
        jobId: prepared.jobId,
        title: prepared.serviceTitle,
        customerLabel: prepared.customerName,
        customerConcern: "",
        evaluation: null,
      });
      setInvoicePreparation({
        status: "ready",
        job: {
          ...prepared,
          quoteReference: quoteReference.quoteId,
          approvedQuoteVersion: quoteReference.quoteVersion,
          approvedQuoteDocumentNumber: quoteReference.documentNumber,
        },
        resumeDocumentId: matches[0]?.id || null,
        error: "",
      });
    }).catch((error) => {
      if (!active) return;
      setInvoicePreparation({
        status: "unavailable", job: null, resumeDocumentId: null,
        error: error?.code === "INVOICE_QUOTE_REFERENCE_READ_GAP"
          ? "INVOICE_QUOTE_REFERENCE_READ_GAP: The effective approved Quote reference is unavailable."
          : error?.message || "Invoice review is temporarily unavailable.",
      });
    });
    return () => { active = false; };
  }, [isUnifiedInvoiceEntry, routeCanonicalJobId, routeSavedDocumentId]);

  useEffect(() => {
    if (!routeSavedDocumentId || !savedQuoteRoute.valid) return undefined;
    let active = true;
    setSavedRouteBootstrap({ status: "loading", reason: "", document: null });
    void bootstrapExactSavedQuote({
      route: savedQuoteRoute,
      getDocument: (draftId) => getBusinessDocumentDraft({ draftId, setPage }),
    }).then((resolution) => {
        if (!active) return;
        if (resolution.status !== "ready") {
          setSavedRouteBootstrap({
            status: "unavailable",
            reason: resolution.reason,
            document: null,
          });
          return;
        }
        const document = resolution.document;
        setQuickQuoteAttachedJob({
          jobId: resolution.jobId || null,
          title: cleanText(document.content?.projectTitle),
          customerLabel: cleanText(document.content?.customerName),
          customerConcern: "",
          evaluation: null,
        });
        setSavedRouteBootstrap({ status: "ready", reason: "", document });
      });
    return () => {
      active = false;
    };
  }, [routeCanonicalJobId, routeSavedDocumentId, savedQuoteRoute.valid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isUnifiedInvoiceEntry || !savedQuoteContextJobId || !savedQuoteRoute.valid) {
      return undefined;
    }
    let active = true;
    setJobLinkedQuoteContext({
      status: "loading",
      reason: "",
      context: null,
      existingQuoteProtected: false,
      savedQuoteResume: null,
      reopenDocumentId: null,
    });
    void Promise.allSettled([
      fetchJobLinkedQuoteContext({ jobId: savedQuoteContextJobId, setPage }),
      listBusinessDocumentDrafts({ type: "QUOTE", setPage }),
    ]).then(([contextResult, documentsResult]) => {
        if (!active) return;
        const result = contextResult.status === "fulfilled"
          ? contextResult.value
          : { status: "error", reason: "JOB_CONTEXT_FETCH_FAILED", context: null };
        const savedProtection = documentsResult.status === "fulfilled"
          ? resolveOwnedSavedQuotesForJob(documentsResult.value, savedQuoteContextJobId)
          : { status: "unavailable", documents: [] };

        if (isUnifiedDepositRequestEntry) {
          setDepositRequestSourceQuoteDocument(
            savedProtection.status === "exact"
              ? savedProtection.documents[0]
              : null
          );
        }
        if (!routeSavedDocumentId && savedProtection.status === "ambiguous") {
          setJobLinkedQuoteContext({
            status: "ambiguous",
            reason: "MULTIPLE_SAVED_QUOTES",
            context: null,
            existingQuoteProtected: false,
            savedQuoteResume: null,
            reopenDocumentId: null,
          });
          return;
        }
        if (result.status !== "ready" || !result.context) {
          if (!routeSavedDocumentId && savedProtection.status === "exact") {
            setJobLinkedQuoteContext({
              status: "protected",
              reason: "",
              context: null,
              existingQuoteProtected: true,
              savedQuoteResume: savedProtection.resume,
              reopenDocumentId: null,
            });
            return;
          }
          setJobLinkedQuoteContext({
            status: result.status,
            reason: result.reason,
            context: null,
            existingQuoteProtected: false,
            savedQuoteResume: null,
            reopenDocumentId: null,
          });
          return;
        }
        const context = result.context;
        const existingQuoteProtected = jobLinkedQuoteHasExistingContent(context);
        const savedQuoteResume = savedProtection.status === "exact"
          ? savedProtection.resume
          : resolveJobLinkedSavedQuoteResume(context);
        setQuickQuoteAttachedJob({
          jobId: context.job.jobId,
          title: context.job.title,
          customerLabel: context.customer.displayName,
          customerConcern: context.project.customerConcern,
          evaluation: context.evaluation,
        });
        if (
          !existingQuoteProtected &&
          jobLinkedQuoteHydrationRef.current !== context.job.jobId
        ) {
          const prefill = buildJobLinkedQuotePrefill(context);
          if (prefill) {
            jobLinkedQuoteHydrationRef.current = context.job.jobId;
            setCustomerName(prefill.customerName);
            setCustomerEmail(prefill.customerEmail);
            setCustomerPhone(prefill.customerPhone);
            setCustomerLocation(prefill.customerLocation);
            setProjectTitle(prefill.projectTitle);
            setProjectDescription(prefill.projectDescription);
            setRecommendedSolution(prefill.recommendedSolution);
          }
        }
        setJobLinkedQuoteContext({
          status: existingQuoteProtected ? "protected" : "ready",
          reason: "",
          context,
          existingQuoteProtected,
          savedQuoteResume,
          reopenDocumentId: null,
        });
      });
    return () => {
      active = false;
    };
  }, [isUnifiedInvoiceEntry, routeSavedDocumentId, savedQuoteContextJobId, savedQuoteRoute.valid]); // eslint-disable-line react-hooks/exhaustive-deps

  function openProtectedJobLinkedQuote() {
    const resume = jobLinkedQuoteContext.savedQuoteResume ||
      resolveJobLinkedSavedQuoteResume(jobLinkedQuoteContext.context);
    if (!resume || resume.jobId !== routeCanonicalJobId) return;
    replaceSavedQuoteRoute({
      jobId: resume.jobId,
      draftId: resume.documentId,
    });
    setJobLinkedQuoteContext((current) => ({
      ...current,
      status: "ready",
      existingQuoteProtected: false,
      reopenDocumentId: resume.documentId,
    }));
  }

  function inputKey(prefix, index) {
    return `${prefix}_${index}`.replace(/[^a-z0-9_]/gi, "_").toLowerCase().slice(0, 80);
  }

  function persistOpenedQuoteRoute(document) {
    if (isUnifiedInvoiceEntry && document?.documentType === "INVOICE") return;
    if (document?.documentType !== "QUOTE") {
      replaceSavedQuoteRoute({});
      return;
    }
    if (document?.status !== "WORKING_DRAFT") {
      return;
    }
    replaceSavedQuoteRoute({
      jobId: document.jobId || "",
      draftId: document.id,
    });
  }

  async function createReviewedCompletedJobInvoice({
    extraWork, customerNotes, terms, due,
  }) {
    if (invoicePreparation.status !== "ready" || !invoicePreparation.job) {
      throw new Error("This completed Job is not ready for Invoice review.");
    }
    return createCanonicalInvoice({
      jobId: invoicePreparation.job.jobId,
      expectedCompletionVersion: invoicePreparation.job.completionVersion,
      due,
      customerNotes,
      terms,
      extraWork,
      idempotencyKey: createInvoiceCommandKey("invoice-create"),
      setPage,
    });
  }

  function estimateCostInputs() {
    return [
      ...materialRows.flatMap((item, index) => {
        const amount = Math.round(parseQuotePricingAmount(item.cost) * 100);
        const quantity = parseQuotePricingAmount(item.quantity) || 1;
        return cleanText(item.name) && amount >= 0 ? [{
          key: inputKey("material", index), classification: "MATERIAL",
          description: cleanText(item.name), quantity, unitCostMinor: amount,
        }] : [];
      }),
      ...laborRows.flatMap((item, index) => {
        const amount = Math.round(parseQuotePricingAmount(item.rate) * 100);
        const quantity = parseQuotePricingAmount(item.hours) || 1;
        return cleanText(item.description) && amount >= 0 ? [{
          key: inputKey("labor", index), classification: "LABOR",
          description: cleanText(item.description), quantity, unitCostMinor: amount,
        }] : [];
      }),
      ...(disposalFeeAmount > 0 ? [{
        key: "disposal_0", classification: "DISPOSAL", description: "Disposal",
        quantity: 1, unitCostMinor: Math.round(disposalFeeAmount * 100),
      }] : []),
    ];
  }

  function quoteCompositionInput(prompt, { estimateProposalId } = {}) {
    return buildQuoteCompositionInput({
      jobId: canonicalJobId,
      professionalInstructions: [problemFound, recommendedSolution, notes, prompt].filter(Boolean).join("\n") || undefined,
      lineItems,
      materialRows,
      materialProvider,
      availability: estimatedDuration || timeline,
      estimateProposalId,
    });
  }

  async function requestEstimateHelp(action, prompt) {
    if (!canonicalJobId) return;
    const estimateIntents = {
      materials: "ESTIMATE_MATERIALS",
      prices: "CHECK_MATERIAL_PRICES",
      labor: "ESTIMATE_LABOR",
    };
    const operation = action === "quote" ? INTELLIGENCE_OPERATION.QUOTE : INTELLIGENCE_OPERATION.ESTIMATE;
    setAssistant({ busy: true, error: "", notice: "", result: null, commandKeys: null });
    try {
      const input = operation === INTELLIGENCE_OPERATION.QUOTE
        ? quoteCompositionInput(prompt)
        : {
            jobId: canonicalJobId,
            intent: estimateIntents[action],
            professionalInstructions: [problemFound, recommendedSolution, notes, prompt].filter(Boolean).join("\n") || null,
            measurements: [],
            costInputs: estimateCostInputs(),
            sellingPriceMinor: calculatedTotal > 0 ? Math.round(calculatedTotal * 100) : null,
            retailerQuery: action === "prices"
              ? [prompt, ...materialRows.map((item) => cleanText(item.name))].filter(Boolean).join(" ").slice(0, 500) || null
              : null,
          };
      const result = await requestWorkflowIntelligence({
        operation,
        locale: language,
        input,
        expected: { jobId: canonicalJobId },
        setPage,
      });
      const candidates = result.proposal.proposedScopeItems?.filter((item) => item.canonicalCandidate) || [];
      setAssistant({
        busy: false,
        error: "",
        notice: "",
        result,
        commandKeys: operation === INTELLIGENCE_OPERATION.QUOTE ? {
          createKey: createIntelligenceKey(),
          scopeKeys: candidates.map(() => createIntelligenceKey()),
        } : null,
      });
    } catch (error) {
      setAssistant({ busy: false, error: error?.message || getAskMeetroWorkflowCopy(language).unavailable, notice: "", result: null, commandKeys: null });
    }
  }

  async function markEstimateSolutionReady() {
    const proposal = assistant.result?.proposal;
    if (!proposal || assistant.result.operation !== INTELLIGENCE_OPERATION.ESTIMATE) return;
    const elements = getSolutionReadyReviewElements(proposal);
    setAssistant((current) => ({ ...current, busy: true, error: "", notice: "" }));
    try {
      await Promise.all(elements.map((item) => recordWorkflowReview({
        proposalId: proposal.proposalId,
        elementId: item.id,
        action: "ACCEPTED",
        setPage,
      })));
      const result = await requestWorkflowIntelligence({
        operation: INTELLIGENCE_OPERATION.QUOTE,
        locale: language,
        input: quoteCompositionInput("", {
          estimateProposalId: proposal.proposalId,
        }),
        expected: { jobId: canonicalJobId },
        setPage,
      });
      const candidates = result.proposal.proposedScopeItems?.filter((item) => item.canonicalCandidate) || [];
      setAssistant({
        busy: false,
        error: "",
        notice: getAskMeetroWorkflowCopy(language).solutionReady,
        result,
        commandKeys: {
          createKey: createIntelligenceKey(),
          scopeKeys: candidates.map(() => createIntelligenceKey()),
        },
      });
    } catch (error) {
      setAssistant((current) => ({
        ...current,
        busy: false,
        error: error?.message || getAskMeetroWorkflowCopy(language).unavailable,
      }));
    }
  }

  async function handleUseQuoteComposition(editedCandidates = null) {
    const result = assistant.result;
    if (!result || result.operation !== INTELLIGENCE_OPERATION.QUOTE || !assistant.commandKeys) return;
    const proposal = editedCandidates ? {
      ...result.proposal,
      proposedScopeItems: result.proposal.proposedScopeItems.map((item) =>
        editedCandidates[item.id]
          ? { ...item, canonicalCandidate: editedCandidates[item.id] }
          : item
      ),
    } : result.proposal;
    const candidates = proposal.proposedScopeItems.filter((item) => item.canonicalCandidate);
    try {
      await Promise.all(candidates.map((item) => recordQuoteCompositionReview({
        proposalId: proposal.proposalId,
        elementId: item.id,
        action: editedCandidates?.[item.id] ? "EDITED" : "ACCEPTED",
        editedValue: editedCandidates?.[item.id],
        setPage,
      })));
      const quote = await applyConfirmedQuoteComposition({
        jobId: canonicalJobId,
        proposal,
        createKey: assistant.commandKeys.createKey,
        scopeKeys: assistant.commandKeys.scopeKeys,
        setPage,
      });
      setAssistant((current) => ({ ...current, notice: `${getAskMeetroWorkflowCopy(language).createQuote} · ${quote.scopeItemCount}` }));
    } catch (error) {
      setAssistant((current) => ({ ...current, error: error?.message || getAskMeetroWorkflowCopy(language).unavailable }));
    }
  }

  async function dismissEstimateHelp() {
    const result = assistant.result;
    if (!result) return;
    try {
      if (result.operation === INTELLIGENCE_OPERATION.QUOTE) {
        await Promise.all(result.proposal.proposedScopeItems.map((item) => recordQuoteCompositionReview({
          proposalId: result.proposal.proposalId,
          elementId: item.id,
          action: "REJECTED",
          setPage,
        })));
      } else {
        await Promise.all([...result.proposal.materials, ...result.proposal.labor, result.proposal.customerQuoteDraft].map((item) => recordWorkflowReview({
          proposalId: result.proposal.proposalId,
          elementId: item.id,
          action: "REJECTED",
          reasonCategory: "PROFESSIONAL_DISMISSED",
          setPage,
        })));
      }
      setAssistant((current) => ({ ...current, result: null, notice: "" }));
    } catch (error) {
      setAssistant((current) => ({ ...current, error: error?.message || getAskMeetroWorkflowCopy(language).unavailable }));
    }
  }



	  function getCurrentPricingPayload() {
    const currentLaborAmount = laborAmount;
    const currentMaterialsAmount = materialsAmount;
    const subtotal = subtotalAmount;
    const manualTotal = parseOptionalQuoteAmount(totalOverride);
    const totalAmount =
      manualTotal !== null ? manualTotal : Math.max(subtotal - discountAmount + taxAmount, 0);
    const normalizedLineItems = lineItems.map((item, index) => ({
      ...normalizeQuoteLineItem(item, index),
      total: getEditableRowTotal(item),
    }));
    const normalizedMaterialItems = materialRows.map((item, index) => ({
      ...normalizeQuoteMaterialItem(item, index),
      total: getEditableRowTotal(item, "quantity", "cost"),
    }));
    const normalizedLaborItems = laborRows.map((item, index) => ({
      ...normalizeQuoteLaborItem(item, index, isSpanish),
      total: getEditableRowTotal(item, "hours", "rate"),
    }));

	    return {
	      proposalType,
	      customProposalType,
	      laborCategory,
	      customLaborCategory,
	      materialProvider,
	      pricingMethod,
	      laborPricingType,
	      customPricingMethod,
	      priority,
	      travelFee: travelFeeAmount,
	      disposalFee: disposalFeeAmount,
	      depositRequired,
	      depositAmount: depositAmountValue,
	      startDate,
	      estimatedDuration,
	      laborAmount: currentLaborAmount,
	      laborFee: laborPricingType === "flat_fee" ? currentLaborAmount : "",
	      laborTotal: currentLaborAmount,
	      materialsAmount: currentMaterialsAmount,
	      materialsTotal: currentMaterialsAmount,
	      lineItemsTotal,
	      feesAmount,
	      discountAmount,
	      taxAmount,
	      subtotal,
      totalAmount,
      quoteTotal: totalAmount,
      amount: totalAmount,
      total: totalAmount,
      labor: currentLaborAmount,
      materials: currentMaterialsAmount,
      quoteLineItems: normalizedLineItems,
      materialItems: normalizedMaterialItems,
      quoteMaterials: normalizedMaterialItems,
      laborItems: normalizedLaborItems,
      quoteLabor: normalizedLaborItems,
	      pricingBreakdown: {
	        laborAmount: currentLaborAmount,
	        laborPricingType,
	        laborFee: laborPricingType === "flat_fee" ? currentLaborAmount : "",
	        laborTotal: currentLaborAmount,
	        materialsAmount: currentMaterialsAmount,
	        materialsTotal: currentMaterialsAmount,
	        lineItemsTotal,
	        travelFeeAmount,
	        disposalFeeAmount,
	        feesAmount,
	        discountAmount,
	        taxAmount,
	        subtotal,
        totalAmount,
        quoteTotal: totalAmount,
        currency: "USD",
        lineItems: [
          ...normalizedLineItems.map((item) => ({
            id: item.id,
            label: item.description || (isSpanish ? "Partida" : "Line Item"),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.total,
          })),
          {
            id: "labor",
            label: isSpanish ? "Mano de obra" : "Labor",
            amount: currentLaborAmount,
          },
          {
            id: "materials",
            label: isSpanish ? "Materiales" : "Materials",
            amount: currentMaterialsAmount,
          },
        ],
	      },
	      quoteMetadata: {
	        proposalType,
	        customProposalType,
	        laborCategory,
	        customLaborCategory,
	        materialProvider,
	        pricingMethod,
	        customPricingMethod,
	        priority,
	        travelFee: travelFeeAmount,
	        disposalFee: disposalFeeAmount,
	        depositRequired,
	        depositAmount: depositAmountValue,
	        startDate,
	        estimatedDuration,
	      },
	      lineItems: normalizedLineItems,
	    };
	  }

  function backToEvaluationNotes() {
    const hasUnsavedQuoteDraft = Boolean(
      quoteNumber.trim() ||
        labor.trim() ||
        materials.trim() ||
	        totalOverride.trim() ||
	        timeline.trim() ||
	        terms.trim() ||
	        travelFee.trim() ||
	        disposalFee.trim() ||
	        depositAmount.trim() ||
	        startDate.trim() ||
	        estimatedDuration.trim() ||
	        projectTitle.trim() ||
	        customerName.trim() ||
	        customerLocation.trim() ||
        problemFound.trim() ||
        recommendedSolution.trim() ||
        notes.trim()
    );

    if (
      hasUnsavedQuoteDraft &&
      !window.confirm(
        isSpanish
          ? "Volver a Notas de Evaluación? Los cambios no guardados de la cotización no se guardarán."
          : "Back to Evaluation Notes? Unsaved quote draft changes will not be saved."
      )
    ) {
      return;
    }

    localStorage.setItem("meetroWorkCenterTab", "schedule");
    localStorage.setItem("activeWorkCenterTab", "schedule");
    if (quoteContextPayload.scheduleId || quoteContextPayload.visitId) {
      localStorage.setItem(
        "quoteBuilderReturnEvaluationScheduleId",
        quoteContextPayload.scheduleId || quoteContextPayload.visitId
      );
    }
    setPage("workCenter");
  }

  const buildQuoteShareText = () => {
    const pricing = getCurrentPricingPayload();
    const businessIdentity = getBusinessIdentityProjection({}, {
      fallbackName: "Meetro Professional",
    });
    const serviceLines = pricing.quoteLineItems
      .map((item) =>
        formatQuickQuoteSharePricingLine({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })
      )
      .filter(Boolean)
      .join("\n");

    const materialLines = pricing.materialItems
      .map((item) => {
        const hasArithmetic =
          Boolean(cleanText(item.quantity)) && Boolean(cleanText(item.cost));
        const genericMaterial =
          /^(?:materials?|materiales|matériaux|materiais)$/i.test(
            cleanText(item.name)
          );

        if (!hasArithmetic && genericMaterial) return "";

        return formatQuickQuoteSharePricingLine({
          description: item.name,
          quantity: item.quantity,
          unitPrice: item.cost,
          total: item.total,
          notes: item.notes,
        });
      })
      .filter(Boolean)
      .join("\n");

    const laborLines = pricing.laborItems
      .map((item) => {
        const hasArithmetic =
          Boolean(cleanText(item.hours)) && Boolean(cleanText(item.rate));
        const genericLabor =
          /^(?:labor|labour|mano de obra|main-d'œuvre|mão de obra)$/i.test(
            cleanText(item.description)
          );

        if (!hasArithmetic && genericLabor) return "";

        return formatQuickQuoteSharePricingLine({
          description: item.description,
          quantity: item.hours,
          unitPrice: item.rate,
          total: item.total,
          unitLabel: isSpanish ? "h" : "hrs",
        });
      })
      .filter(Boolean)
      .join("\n");

    const laborShareBlock = laborLines
      ? `${isSpanish ? "Mano de obra" : "Labor"}:\n${laborLines}`
      : `${isSpanish ? "Mano de obra" : "Labor"}: $${pricing.laborAmount.toFixed(2)}`;

    const materialShareBlock = materialLines
      ? `${isSpanish ? "Materiales" : "Materials"}:\n${materialLines}`
      : `${isSpanish ? "Materiales" : "Materials"}: $${pricing.materialsAmount.toFixed(2)}`;

    return `${isSpanish ? "Cotización" : "Quote"}: ${projectTitle}

${isSpanish ? "Cliente" : "Customer"}: ${customerName || "—"}
${isSpanish ? "Ubicación" : "Location"}: ${customerLocation || "—"}
${isSpanish ? "Fecha" : "Date"}: ${quoteDate || "—"}
${isSpanish ? "Tipo / prioridad" : "Type / Priority"}: ${proposalType === "Custom" ? customProposalType || proposalType : proposalType} · ${priority}
${isSpanish ? "Partidas" : "Line Items"}:
${serviceLines || "—"}

${laborShareBlock}
${materialShareBlock}
${isSpanish ? "Tarifas" : "Fees"}: $${Number(pricing.feesAmount || 0).toFixed(2)}
${isSpanish ? "Tiempo estimado" : "Estimated timeline"}: ${timeline || "—"}
${isSpanish ? "Depósito" : "Deposit"}: ${depositRequired}${depositAmountValue ? ` · $${depositAmountValue.toFixed(2)}` : ""}
${isSpanish ? "Total" : "Total"}: $${pricing.totalAmount.toFixed(2)}

${isSpanish ? "Solución recomendada" : "Recommended Solution"}:
${recommendedSolution || "—"}

${isSpanish ? "Notas" : "Notes"}:
${notes || "—"}

${isSpanish ? "Términos" : "Terms"}:
${terms || "—"}

${businessIdentity.businessName}`;
  };

  function buildQuickQuotePdfModel(photoEvidence = {}, workingDraftStatus = "UNSAVED") {
    const pricing = getCurrentPricingPayload();
    const customerPricing = quoteCustomerPricingProjection({
      lineItems: pricing.quoteLineItems,
      materialItems: pricing.materialItems,
      laborItems: pricing.laborItems,
      totalOverride,
      discount: pricing.discountAmount,
      tax: pricing.taxAmount,
      fees: pricing.feesAmount,
      pricingDisplayMode,
      materialsDisplayMode,
      depositMode,
      depositPercent,
      depositFixedAmount,
    });
    const businessIdentity = getBusinessIdentityProjection({}, {
      fallbackName: "Meetro Professional",
    });
    return attachCustomerDocumentPhotoEvidence(buildQuickQuoteDocumentModel({
      quoteNumber,
      quoteDate,
      customerName,
      customerEmail,
      customerLocation,
      projectTitle,
      problemFound,
      recommendedSolution,
      scopeSummary: recommendedSolution || projectDescription || problemFound,
      fixedPrice: customerPricing.pricingDisplayMode === "TOTAL_ONLY" || Boolean(cleanText(totalOverride)) || pricingMethod === "Flat Fee",
      lineItems: customerPricing.customerRows.map((item) => ({
        description: item.description,
        total: item.amount,
        pricingPresentation: "flat",
      })),
      subtotal: customerPricing.pricingDisplayMode === "TOTAL_ONLY" ? undefined : customerPricing.total,
      discount: pricing.discountAmount,
      tax: pricing.taxAmount,
      fees: pricing.feesAmount,
      total: customerPricing.total,
      paymentTerms: quoteIndependentPaymentTerms(terms, customerPricing),
      pricingNote: customerPricing.inclusionNote,
      depositDue: customerPricing.deposit.valid ? customerPricing.deposit.due : null,
      remainingBalance: customerPricing.deposit.valid ? customerPricing.deposit.remaining : null,
      depositLabel: customerPricing.deposit.mode === "PERCENT" ? `${customerPricing.deposit.percent}% due on approval` : customerPricing.deposit.mode === "FIXED" ? "Due on approval" : "",
      estimatedDuration: estimatedDuration || timeline,
      notes,
      agreement,
      currency: "USD",
    }, { locale: language, branding: businessIdentity, workingDraftStatus }), photoEvidence);
  }

  async function exportQuickQuotePdf(photoEvidence = {}, workingDraftStatus = "UNSAVED") {
    const copy = getCustomerDocumentActionCopy(language);
    const exported = await downloadCustomerDocumentPdf(buildQuickQuotePdfModel(photoEvidence, workingDraftStatus));
    setCopiedNotice(exported ? copy.pdfReady : copy.pdfUnavailable);
  }

  async function previewQuickQuotePdfWithPhotos(photoEvidence = {}, workingDraftStatus = "UNSAVED") {
    const result = await previewCustomerDocumentPdfWithMedia(buildQuickQuotePdfModel(photoEvidence, workingDraftStatus));
    if (!result.ok) setCopiedNotice(getCustomerDocumentActionCopy(language).pdfUnavailable);
    return result;
  }

  async function shareQuickQuotePdf() {
    const copy = getCustomerDocumentActionCopy(language);
    const result = await shareCustomerDocumentPdf({
      model: buildQuickQuotePdfModel(),
      message: buildQuoteShareText(),
    });
    if (!result.ok && result.method !== "cancelled") setCopiedNotice(copy.pdfUnavailable);
    if (result.ok) setCopiedNotice(copy.pdfReady);
  }

  async function copyQuoteSummary() {
    const summary = buildQuoteShareText();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
        setCopiedNotice(
          isSpanish ? "Resumen copiado." : "Quote summary copied."
        );
        return;
      }
    } catch {
      // Fall through to the visible fallback below.
    }

    setCopiedNotice(
      isSpanish
        ? "Copia manualmente el resumen desde la vista previa."
        : "Copy manually from the preview if clipboard access is unavailable."
    );
    setQuotePreviewOpen(true);
  }

  function invalidateQuickQuoteReviewedResult() {
    /*
     * Invalidate every in-flight reviewed-result GET before
     * clearing presentation authority.
     *
     * A response started against an older browser evidence /
     * proposal state must never repopulate Reviewed Solution
     * or Materials List after that state becomes stale.
     */
    quickQuoteReviewedResultRequestRef.current += 1;

    setQuickQuoteReviewedResult(
      null
    );
  }

  async function refreshQuickQuoteReviewedResult(
    presentation,
    proposal,
    {
      surfaceError = false,
    } = {}
  ) {
    const sessionId =
      presentation?.sessionId;

    const evidenceVersion =
      presentation
        ?.latestEvidenceVersion;

    const proposalId =
      proposal?.proposalId;

    if (
      !sessionId ||
      !Number.isInteger(
        evidenceVersion
      ) ||
      evidenceVersion < 1 ||
      presentation?.stale ||
      !proposalId ||
      presentation
        ?.latestProposal
        ?.proposalId !==
        proposalId
    ) {
      invalidateQuickQuoteReviewedResult();
      return null;
    }

    const requestGeneration =
      quickQuoteReviewedResultRequestRef
        .current + 1;

    quickQuoteReviewedResultRequestRef.current =
      requestGeneration;

    try {
      const loaded =
        await loadQuickQuoteAnalysisReviewedResult({
          sessionId,
          expectedEvidenceVersion:
            evidenceVersion,
          expectedProposalId:
            proposalId,
          setPage,
        });

      if (
        quickQuoteReviewedResultRequestRef.current !==
        requestGeneration
      ) {
        return null;
      }

      setQuickQuoteReviewedResult(
        loaded.reviewedResult
      );

      return loaded.reviewedResult;
    } catch (error) {
      if (
        quickQuoteReviewedResultRequestRef.current !==
        requestGeneration
      ) {
        return null;
      }

      /*
       * R1-05:
       * Never fall back to browser review decisions as
       * durable Reviewed Solution / Materials authority.
       */
      setQuickQuoteReviewedResult(
        null
      );

      if (surfaceError) {
        setQuickQuotePhotoAssistant(
          (current) => ({
            ...current,
            error:
              error?.message ||
              quickQuoteCopy
                .reviewedResultLoadFailed,
          })
        );
      }

      return null;
    }
  }

  async function prepareQuickQuoteConversation() {
    const professionalInput =
      String(
        quickQuotePrompt ?? ""
      );

    const instruction =
      cleanText(
        professionalInput
      );

    const photos =
      quickQuoteDraftPhotosRef.current;

    if (
      !instruction &&
      photos.length === 0
    ) {
      return;
    }

    const governedPhotos =
      photos.map(
        (photo) =>
          photo.media
      );

    setQuickQuotePhotoNotice("");
    setQuickQuoteContinuationNotice("");
    invalidateQuickQuoteReviewedResult();
    setQuickQuoteView("working");

    setQuickQuotePhotoAssistant(
      (current) => ({
        ...current,
        busy: true,
        error: "",
        reviewingId: "",
      })
    );

    try {
      let presentation =
        quickQuoteAnalysisSessionState;

      let sessionId =
        presentation.sessionId;

      /*
       * R1-04 SERVER AUTHORITY
       *
       * First analysis creates one private durable session.
       * Later evidence changes append a new server evidence
       * version to that SAME session.
       *
       * The browser never supplies actor, evidence version,
       * role, provider, operation, or arbitrary turn payload.
       */
      if (!sessionId) {
        const created =
          await createQuickQuoteAnalysisSession({
            professionalInput,
            photos:
              governedPhotos,
            setPage,
          });

        presentation =
          hydrateQuickQuoteAnalysisPresentationState(
            created.session
          );

        sessionId =
          presentation.sessionId;
      } else {
        await appendQuickQuoteAnalysisEvidence({
          sessionId,
          professionalInput,
          photos:
            governedPhotos,
          setPage,
        });

        /*
         * Reload the server projection after evidence append.
         * This prevents an older Meetro turn from being treated
         * as current when the evidence version has advanced.
         */
        const loaded =
          await loadQuickQuoteAnalysisSession({
            sessionId,
            setPage,
          });

        presentation =
          hydrateQuickQuoteAnalysisPresentationState(
            loaded.session
          );

        if (
          presentation.latestProposal &&
          !presentation.stale
        ) {
          await refreshQuickQuoteReviewedResult(
            presentation,
            presentation.latestProposal
          );
        }
      }

      setQuickQuoteAnalysisSessionState(
        presentation
      );

      const execution =
        await analyzeQuickQuoteAnalysisSession({
          sessionId,
          locale:
            language,
          setPage,
        });

      const currentPresentation =
        applyQuickQuoteAnalysisExecutionToPresentationState(
          presentation,
          execution
        );

      setQuickQuoteAnalysisSessionState(
        currentPresentation
      );

      await refreshQuickQuoteReviewedResult(
        currentPresentation,
        execution.proposal
      );

      /*
       * Preserve the exact professional input as presentation.
       * No Quote, pricing, materials, labor, customer, deposit,
       * lifecycle, or publication state is mutated here.
       */
      setQuickQuoteAnalysisState({
        available: true,
        stale: false,
        analyzedPrompt:
          professionalInput,
      });

      /*
       * Reuse the existing R1-01 review presentation temporarily.
       * R1-04C will replace it with the multi-turn workspace.
       */
      setQuickQuotePhotoAssistant({
        busy: false,
        error: "",
        proposal:
          execution.proposal,
        decisions: {},
        reviewingId: "",
      });

      setQuickQuoteView("review");
    } catch (error) {
      setQuickQuotePhotoAssistant(
        (current) => ({
          ...current,
          busy: false,
          error:
            error?.message ||
            quickQuoteCopy
              .photoAnalysisFailed,
          reviewingId: "",
        })
      );

      setQuickQuoteView("entry");
    }
  }

  async function requestQuickQuoteInternalEstimate({
    job,
    jobId,
    professionalInput,
    professionalCategoryCosts = [],
  }) {
    setQuickQuoteJobConnection((current) => ({
      ...current,
      busy: true,
      error: "",
      selectedJobId: jobId,
    }));
    setAssistant({
      busy: true,
      error: "",
      notice: "",
      result: null,
      commandKeys: null,
    });

    try {
      const input = buildQuickQuoteEstimateInput({
        jobId,
        professionalInput,
        professionalCategoryCosts,
      });
      const result = await requestWorkflowIntelligence({
        operation: INTELLIGENCE_OPERATION.ESTIMATE,
        locale: language,
        input,
        expected: { jobId },
        setPage,
      });

      setQuickQuoteAttachedJob(
        job || {
          jobId,
          title: projectTitle || quickQuoteCopy.connectedJob,
          customerLabel: customerName || quickQuoteCopy.customer,
        }
      );
      setAssistant({
        busy: false,
        error: "",
        notice: "",
        result,
        commandKeys: null,
      });
      setQuickQuoteJobConnection({
        stage: "idle",
        busy: false,
        error: "",
        jobs: [],
        selectedJobId: "",
      });
      setQuickQuoteContinuationNotice("");
      setQuickQuoteView("internalEstimate");
      return true;
    } catch (error) {
      setAssistant({
        busy: false,
        error: "",
        notice: "",
        result: null,
        commandKeys: null,
      });
      setQuickQuoteJobConnection((current) => ({
        ...current,
        stage: routeCanonicalJobId ? "decision" : "picker",
        busy: false,
        error:
          error?.message || quickQuoteCopy.jobConnectionFailed,
        selectedJobId: "",
      }));
      return false;
    }
  }

  function prepareQuickQuoteInternalEstimate({
    job,
    jobId,
    professionalInput,
  }) {
    const extracted = extractProfessionalCategoryCostCandidates(
      professionalInput
    );

    if (extracted.costs.length || extracted.conflicts.length) {
      setQuickQuoteJobConnection({
        stage: "costConfirmation",
        busy: false,
        error: extracted.conflicts.length
          ? quickQuoteCopy.categoryCostConflict
          : "",
        jobs: [],
        selectedJobId: jobId,
        pendingJob: job || null,
        pendingJobId: jobId,
        professionalInput,
        professionalCategoryCosts: extracted.costs,
        categoryCostConflicts: extracted.conflicts,
      });
      return true;
    }

    return requestQuickQuoteInternalEstimate({
      job,
      jobId,
      professionalInput,
      professionalCategoryCosts: [],
    });
  }

  async function confirmQuickQuoteCategoryCosts() {
    if (
      quickQuoteJobConnection.stage !== "costConfirmation" ||
      quickQuoteJobConnection.categoryCostConflicts?.length
    ) {
      return false;
    }

    return requestQuickQuoteInternalEstimate({
      job: quickQuoteJobConnection.pendingJob,
      jobId: quickQuoteJobConnection.pendingJobId,
      professionalInput: quickQuoteJobConnection.professionalInput,
      professionalCategoryCosts:
        quickQuoteJobConnection.professionalCategoryCosts,
    });
  }

  async function openQuickQuoteJobPicker() {
    setQuickQuoteJobConnection((current) => ({
      ...current,
      stage: "picker",
      busy: true,
      error: "",
      jobs: [],
      selectedJobId: "",
    }));
    try {
      const jobs = await fetchAuthorizedProfessionalJobs({ setPage });
      setQuickQuoteJobConnection({
        stage: "picker",
        busy: false,
        error: "",
        jobs,
        selectedJobId: "",
      });
    } catch (error) {
      setQuickQuoteJobConnection({
        stage: "picker",
        busy: false,
        error:
          error?.message || quickQuoteCopy.jobListUnavailable,
        jobs: [],
        selectedJobId: "",
      });
    }
  }

  async function attachQuickQuoteToJob(job) {
    const professionalInput =
      quickQuoteAnalysisState.analyzedPrompt || quickQuotePrompt;
    return prepareQuickQuoteInternalEstimate({
      job,
      jobId: job.jobId,
      professionalInput,
    });
  }

  async function continueQuickQuoteWithProfessionalDetails() {
    if (quickQuoteJobConnection.stage !== "idle") {
      return false;
    }

    const continuation = getQuickQuoteProfessionalContinuation({
      professionalInput:
        quickQuoteAnalysisState.analyzedPrompt || quickQuotePrompt,
      canonicalJobId,
    });

    if (!continuation.canContinue) {
      return false;
    }

    if (continuation.nextStep === "INTERNAL_ESTIMATE") {
      return prepareQuickQuoteInternalEstimate({
        job: quickQuoteAttachedJob,
        jobId: continuation.canonicalJobId,
        professionalInput: continuation.professionalInput,
      });
    }

    setQuickQuoteContinuationNotice("");
    setQuickQuoteJobConnection({
      stage: "decision",
      busy: false,
      error: "",
      jobs: [],
      selectedJobId: "",
    });

    return true;
  }

  async function continueQuickQuoteConversation(
    message
  ) {
    const normalizedMessage =
      cleanText(message);

    const presentation =
      quickQuoteAnalysisSessionState;

    const priorProposal =
      presentation.latestProposal;

    if (
      !normalizedMessage ||
      !presentation.sessionId ||
      !priorProposal?.proposalId ||
      presentation.stale ||
      quickQuoteAnalysisState.stale ||
      quickQuotePhotoAssistant.busy
    ) {
      return false;
    }

    setQuickQuotePhotoAssistant(
      (current) => ({
        ...current,
        busy: true,
        error: "",
        reviewingId: "",
      })
    );

    try {
      const execution =
        await continueQuickQuoteAnalysisSession({
          sessionId:
            presentation.sessionId,
          priorProposalId:
            priorProposal.proposalId,
          message:
            normalizedMessage,
          locale:
            language,
          setPage,
        });

      const nextPresentation =
        applyQuickQuoteAnalysisExecutionToPresentationState(
          presentation,
          execution
        );

      /*
       * The continuation created a NEW latest proposal.
       * Invalidate any in-flight projection for the prior one
       * before publishing the new presentation.
       */
      invalidateQuickQuoteReviewedResult();

      setQuickQuoteAnalysisSessionState(
        nextPresentation
      );

      await refreshQuickQuoteReviewedResult(
        nextPresentation,
        execution.proposal
      );

      setQuickQuoteAnalysisState(
        (current) => ({
          ...current,
          available: true,
          stale: false,
        })
      );

      /*
       * Only the latest proposal remains review-active.
       * Earlier proposals and their review decisions stay durable
       * on the server and are available to governed continuation.
       */
      setQuickQuotePhotoAssistant({
        busy: false,
        error: "",
        proposal:
          execution.proposal,
        decisions: {},
        reviewingId: "",
      });

      return true;
    } catch (error) {
      setQuickQuotePhotoAssistant(
        (current) => ({
          ...current,
          busy: false,
          error:
            error?.message ||
            quickQuoteCopy
              .photoAnalysisFailed,
          reviewingId: "",
        })
      );

      return false;
    }
  }

  async function reviewQuickQuotePhotoSuggestion({
    category,
    item,
    action,
    editedText = "",
  }) {
    const proposal = quickQuotePhotoAssistant.proposal;
    const normalizedAction =
      String(action || "").trim().toUpperCase();

    if (
      !proposal?.proposalId ||
      !item?.id ||
      !["ACCEPTED", "EDITED", "REJECTED"].includes(
        normalizedAction
      ) ||
      quickQuoteAnalysisState.stale ||
      quickQuoteAnalysisSessionState.stale ||
      quickQuotePhotoAssistant.busy ||
      quickQuoteAnalysisSessionState
        .latestProposal
        ?.proposalId !==
        proposal.proposalId ||
      quickQuotePhotoAssistant.decisions[item.id]
    ) {
      return false;
    }

    const reviewedText =
      normalizedAction === "EDITED"
        ? cleanText(editedText)
        : cleanText(item.text);

    if (normalizedAction === "EDITED" && !reviewedText) {
      return false;
    }

    setQuickQuotePhotoAssistant((current) => ({
      ...current,
      busy: true,
      error: "",
      reviewingId: item.id,
    }));

    try {
      await recordWorkflowReview({
        proposalId: proposal.proposalId,
        elementId: item.id,
        action: normalizedAction,
        ...(normalizedAction === "EDITED"
          ? {
              editedValue: {
                ...item,
                text: reviewedText,
              },
            }
          : {}),
        setPage,
      });

      /*
       * R1-01:
       * Review decisions are recorded as governed evidence only.
       *
       * ACCEPTED and EDITED items must NOT yet write into:
       * - problemFound
       * - recommendedSolution
       * - notes
       * - materialRows
       * - laborRows
       * - pricing
       * - customer fields
       * - Quote state
       *
       * R1-05 will introduce Reviewed Solution / Materials List authority.
       */
      setQuickQuotePhotoAssistant((current) => ({
        ...current,
        decisions: {
          ...current.decisions,
          [item.id]: {
            action: normalizedAction,
            text: reviewedText,
            category,
          },
        },
      }));

      /*
       * The review POST is durable evidence.
       * The first-class Reviewed Solution / Materials List
       * is then re-read from the server projection.
       *
       * Browser photoDecisions remains presentation-only.
       */
      await refreshQuickQuoteReviewedResult(
        quickQuoteAnalysisSessionState,
        proposal,
        {
          surfaceError: true,
        }
      );

      setQuickQuotePhotoAssistant((current) => ({
        ...current,
        busy: false,
        reviewingId: "",
      }));

      return true;
    } catch (error) {
      setQuickQuotePhotoAssistant((current) => ({
        ...current,
        busy: false,
        reviewingId: "",
        error:
          error?.message || quickQuoteCopy.photoReviewFailed,
      }));

      return false;
    }
  }

  async function addQuickQuoteDraftPhotoFiles(files = []) {
    if (!quickQuotePhotoUploadEnabled || quickQuotePhotoBusy) return;

    const source = Array.from(files || []);
    if (!source.length) return;

    const existingCount = quickQuoteDraftPhotosRef.current.length;
    const remaining =
      QUOTE_DRAFT_PHOTO_MAX_COUNT - existingCount;

    if (remaining <= 0) {
      setQuickQuotePhotoNotice(quickQuoteCopy.photoLimit);
      return;
    }

    const acceptedFiles = [];
    let rejected = false;

    for (const file of source.slice(0, remaining)) {
      const validation = validateQuoteDraftPhotoFile(file);
      if (validation.ok) acceptedFiles.push(file);
      else rejected = true;
    }

    if (source.length > remaining) rejected = true;

    if (!acceptedFiles.length) {
      setQuickQuotePhotoNotice(
        rejected
          ? quickQuoteCopy.photoInvalid
          : quickQuoteCopy.photoLimit
      );
      return;
    }

    setQuickQuotePhotoBusy(true);
    setQuickQuotePhotoNotice(quickQuoteCopy.photoUploading);

    try {
      const upload = await uploadQuoteDraftPhotos({
        files: acceptedFiles,
        existingCount,
        setPage,
      });

      if (!upload.ok) {
        const pending = acceptedFiles.map((file) => {
          const id = `pending-photo-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${file.name}`}`;
          quickQuotePhotoDocumentRef.current.set(id, quickQuotePhotoTargetDocumentRef.current);
          return {
            id,
            name: file.name || "quote-photo",
            previewUrl: URL.createObjectURL(file),
            media: null,
            pendingFile: file,
            uploadState: "pending",
          };
        });
        setQuickQuoteDraftPhotos((current) => [...current, ...pending]);
        setQuickQuotePhotoNotice(quickQuoteCopy.photoUploadFailed);
        return;
      }

      const prepared = upload.photos
        .map((media, index) =>
          createQuickQuoteDraftPhoto(
            acceptedFiles[index],
            media
          )
        )
        .filter(Boolean);

      if (prepared.length !== upload.photos.length) {
        await Promise.all(
          upload.photos.map((media) =>
            cleanupQuoteDraftPhoto({ media, setPage })
          )
        );
        setQuickQuotePhotoNotice(quickQuoteCopy.photoUploadFailed);
        return;
      }

      setQuickQuoteDraftPhotos((current) => [
        ...current,
        ...prepared.map((photo) => {
          quickQuotePhotoDocumentRef.current.set(photo.id, quickQuotePhotoTargetDocumentRef.current);
          return photo;
        }),
      ]);

      const analysisWasAvailable =
        quickQuoteAnalysisState.available;

      if (analysisWasAvailable) {
        markQuickQuoteAnalysisStale();
        setQuickQuoteView("entry");
      }

      setQuickQuotePhotoNotice(
        analysisWasAvailable
          ? quickQuoteCopy.photoChangedNotice
          : rejected
          ? quickQuoteCopy.photoInvalid
          : quickQuoteCopy.photoDraftNotice
      );
    } finally {
      setQuickQuotePhotoBusy(false);
    }
  }

  async function openQuickQuotePhotoPicker() {
    if (!quickQuotePhotoUploadEnabled || quickQuotePhotoBusy) return;

    setQuickQuotePhotoNotice("");

    try {
      const result = await pickNativeJobPhoto({
        fileNamePrefix: "quick-quote-photo",
        quality: 72,
      });

      if (result?.photos?.length) {
        await addQuickQuoteDraftPhotoFiles(
          result.photos.map((photo) => photo.file).filter(Boolean)
        );
        return;
      }

      if (result?.cancelled) return;
    } catch {
      // Fall through to the browser file picker.
    }

    quickQuotePhotoInputRef.current?.click();
  }

  function handleQuickQuotePhotoInput(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    void addQuickQuoteDraftPhotoFiles(files);
  }

  async function ensureWorkspacePhotosDurable(pendingPhotos = []) {
    const pendingIds = new Set(pendingPhotos.map((photo) => photo.id));
    const pending = quickQuoteDraftPhotosRef.current.filter((photo) => pendingIds.has(photo.id) && photo.pendingFile);
    if (!pending.length) return { ok: true, photos: quickQuoteDraftPhotosRef.current, idMap: {} };
    const upload = await uploadQuoteDraftPhotos({
      files: pending.map((photo) => photo.pendingFile),
      existingCount: quickQuoteDraftPhotosRef.current.length - pending.length,
      setPage,
    });
    if (!upload.ok || upload.photos.length !== pending.length) return { ok: false };
    const replacements = new Map();
    const idMap = {};
    pending.forEach((photo, index) => {
      const replacement = createQuickQuoteDraftPhoto(photo.pendingFile, upload.photos[index]);
      if (!replacement) return;
      replacements.set(photo.id, replacement);
      idMap[photo.id] = replacement.id;
      const documentType = quickQuotePhotoDocumentRef.current.get(photo.id) || "quote";
      quickQuotePhotoDocumentRef.current.delete(photo.id);
      quickQuotePhotoDocumentRef.current.set(replacement.id, documentType);
      if (photo.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
    });
    if (replacements.size !== pending.length) return { ok: false };
    const next = quickQuoteDraftPhotosRef.current.map((photo) => replacements.get(photo.id) || photo);
    quickQuoteDraftPhotosRef.current = next;
    setQuickQuoteDraftPhotos(next);
    return { ok: true, photos: next, idMap };
  }

  function restoreWorkspacePhotos(nextPhotos = [], options = {}) {
    const prepared = nextPhotos.map((photo) => ({
      ...photo,
      previewUrl: photo.previewUrl || photo.media?.secure_url || (photo.pendingFile ? URL.createObjectURL(photo.pendingFile) : ""),
    }));
    let next;
    if (options.replaceAll) {
      next = prepared;
      quickQuotePhotoDocumentRef.current.clear();
    } else {
      const type = options.documentType || "quote";
      const retained = quickQuoteDraftPhotosRef.current.filter((photo) => quickQuotePhotoDocumentRef.current.get(photo.id) !== type);
      next = [...retained, ...prepared];
      [...quickQuotePhotoDocumentRef.current.entries()].forEach(([id, documentType]) => {
        if (documentType === type) quickQuotePhotoDocumentRef.current.delete(id);
      });
    }
    prepared.forEach((photo) => quickQuotePhotoDocumentRef.current.set(photo.id, options.documentType || "quote"));
    if (options.persisted) prepared.forEach((photo) => quickQuotePersistedPhotoIdsRef.current.add(photo.id));
    quickQuoteDraftPhotosRef.current = next;
    setQuickQuoteDraftPhotos(next);
  }

  function markWorkspacePhotosPersisted(photoIds = []) {
    photoIds.forEach((id) => quickQuotePersistedPhotoIdsRef.current.add(id));
  }

  function discardWorkspaceTransientPhotos() {
    quickQuoteDraftPhotosRef.current.forEach((photo) => {
      if (quickQuotePersistedPhotoIdsRef.current.has(photo.id)) return;
      if (photo.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
      if (photo.media) void cleanupQuoteDraftPhoto({ media: photo.media, setPage });
    });
  }

  function markQuickQuoteAnalysisStale() {
    invalidateQuickQuoteReviewedResult();

    setQuickQuoteAnalysisState((current) =>
      current.available
        ? {
            ...current,
            stale: true,
          }
        : current
    );

    setQuickQuoteAnalysisSessionState(
      (current) =>
        current.sessionId
          ? markQuickQuoteAnalysisPresentationStale(
              current
            )
          : current
    );
  }

  function handleQuickQuotePromptChange(value) {
    setQuickQuotePrompt(value);
    setQuickQuoteContinuationNotice("");

    /*
     * R1-01 presentation-only stale state.
     * This is not a durable evidence fingerprint or server authority.
     * Any professional description change after analysis requires
     * a new analysis before the previous result may be treated as current.
     */
    markQuickQuoteAnalysisStale();
  }

  function backToQuickQuoteJobDetails() {
    /*
     * Internal workflow navigation only.
     * Do not clean media, clear analysis, or navigate out of QuoteBuilder.
     */
    setQuickQuoteView("entry");
  }

  function returnToQuickQuoteAnalysis() {
    if (
      !quickQuoteAnalysisState.available ||
      quickQuoteAnalysisState.stale
    ) {
      return;
    }

    setQuickQuoteView("review");
  }

  async function removeQuickQuoteDraftPhoto(photoId) {
    if (quickQuotePhotoBusy) return;

    const photo = quickQuoteDraftPhotosRef.current.find(
      (item) => item.id === photoId
    );

    if (!photo?.media) return;

    setQuickQuotePhotoBusy(true);
    setQuickQuotePhotoNotice("");

    try {
      const cleaned = await cleanupQuoteDraftPhoto({
        media: photo.media,
        setPage,
      });

      if (!cleaned) {
        setQuickQuotePhotoNotice(
          quickQuoteCopy.photoCleanupFailed
        );
        return;
      }

      setQuickQuoteDraftPhotos((current) =>
        current.filter((item) => item.id !== photoId)
      );

      const analysisWasAvailable =
        quickQuoteAnalysisState.available;

      if (analysisWasAvailable) {
        markQuickQuoteAnalysisStale();
        setQuickQuoteView("entry");
      }

      setQuickQuotePhotoNotice(
        analysisWasAvailable
          ? quickQuoteCopy.photoChangedNotice
          : quickQuoteCopy.photoDraftNotice
      );
    } finally {
      setQuickQuotePhotoBusy(false);
    }
  }

  function navigateFromQuoteBuilder() {
    /*
     * Preserve the existing destination-selection logic exactly.
     * This function is called only after any required R1-01
     * transient-media cleanup has completed.
     */
    if (restoreConversationOriginContext(setPage)) return;

    if (isEditingExistingQuote) {
      localStorage.removeItem("selectedQuoteForEdit");
      localStorage.setItem("meetroWorkCenterTab", "quotes");
      localStorage.setItem("activeWorkCenterTab", "quotes");
      setPage("workCenter");
    } else if (isRevisedQuoteFlow) {
      setPage("conversationThread");
    } else if (isBusinessToolsReturn) {
      setPage("businessCommandCenter");
    } else if (isDesktopSidebarQuickQuote && quoteBuilderReturnPage) {
      localStorage.removeItem("quoteBuilderReturnPage");
      localStorage.removeItem("quoteBuilderSource");
      setPage(quoteBuilderReturnPage);
    } else if (
      ["business_dashboard_new_quote", "meetro_assistant_new_quote"].includes(quoteBuilderSource) &&
      quoteBuilderReturnPage
    ) {
      localStorage.removeItem("quoteBuilderReturnPage");
      localStorage.removeItem("quoteBuilderSource");
      setPage(quoteBuilderReturnPage);
    } else if (isWorkCenterReturn) {
      localStorage.setItem("meetroWorkCenterTab", "quotes");
      localStorage.setItem("activeWorkCenterTab", "quotes");
      setPage("workCenter");
    } else {
      setPage("businessLeads");
    }
  }

  async function exitQuickQuoteAnalysis() {
    const currentPhotos = [
      ...quickQuoteDraftPhotosRef.current,
    ];

    const hasPrivateAnalysis =
      Boolean(cleanText(quickQuotePrompt)) ||
      currentPhotos.length > 0 ||
      quickQuoteAnalysisState.available ||
      Boolean(
        quickQuoteAnalysisSessionState.sessionId
      ) ||
      Boolean(quickQuotePhotoAssistant.proposal);

    if (hasPrivateAnalysis) {
      const confirmed = window.confirm(
        `${quickQuoteCopy.discardTitle}\n\n${quickQuoteCopy.discardBody}`
      );

      if (!confirmed) {
        return;
      }
    }

    /*
     * R1-04 full workflow discard.
     *
     * Internal Back never deletes the session.
     * Explicit full exit does.
     *
     * Delete the durable private session first, then continue
     * with governed transient-media cleanup. If session discard
     * fails, do not navigate and do not start media cleanup.
     */
    const analysisSessionId =
      quickQuoteAnalysisSessionState
        .sessionId;

    if (analysisSessionId) {
      try {
        await discardQuickQuoteAnalysisSession({
          sessionId:
            analysisSessionId,
          setPage,
        });
      } catch (error) {
        setQuickQuotePhotoNotice(
          error?.message ||
            quickQuoteCopy
              .photoAnalysisFailed
        );

        setQuickQuoteView("entry");
        return;
      }

      setQuickQuoteAnalysisSessionState(
        createQuickQuoteAnalysisPresentationState()
      );

      invalidateQuickQuoteReviewedResult();

      setQuickQuoteAnalysisState({
        available: false,
        stale: false,
        analyzedPrompt: "",
      });

      setQuickQuotePhotoAssistant({
        busy: false,
        error: "",
        proposal: null,
        decisions: {},
        reviewingId: "",
      });

      /*
       * If Cloudinary cleanup below fails, the server session
       * is already authoritatively discarded. Keep only the
       * failed transient media refs so cleanup can be retried.
       */
      setQuickQuoteView("entry");
    }

    /*
     * Full workflow exit is different from internal Back.
     * Every governed transient photo must be explicitly cleaned
     * before navigation is allowed.
     */
    const failedPhotoIds = new Set();

    for (const photo of currentPhotos) {
      if (!photo?.media) {
        continue;
      }

      let cleaned;

      try {
        cleaned = await cleanupQuoteDraftPhoto({
          media: photo.media,
          setPage,
        });
      } catch {
        cleaned = false;
      }

      if (!cleaned) {
        failedPhotoIds.add(photo.id);
      }
    }

    if (failedPhotoIds.size > 0) {
      /*
       * Successfully cleaned refs are removed immediately.
       * Failed refs remain so cleanup can be retried.
       * Do not navigate out of the workflow.
       */
      const failedPhotos = currentPhotos.filter(
        (photo) => failedPhotoIds.has(photo.id)
      );

      quickQuoteDraftPhotosRef.current = failedPhotos;
      setQuickQuoteDraftPhotos(failedPhotos);
      setQuickQuotePhotoNotice(
        quickQuoteCopy.photoCleanupFailed
      );

      return;
    }

    /*
     * Clear the ref BEFORE setPage/navigating so the defensive
     * unmount cleanup does not issue duplicate cleanup requests.
     */
    quickQuoteDraftPhotosRef.current = [];

    setQuickQuoteDraftPhotos([]);
    setQuickQuotePrompt("");
    setQuickQuotePhotoNotice("");
    setQuickQuotePhotoAssistant({
      busy: false,
      error: "",
      proposal: null,
      decisions: {},
      reviewingId: "",
    });
    invalidateQuickQuoteReviewedResult();
    setQuickQuoteAnalysisState({
      available: false,
      stale: false,
      analyzedPrompt: "",
    });
    setQuickQuoteView("entry");

    navigateFromQuoteBuilder();
  }

  function applyUnifiedQuotePatch(patch = {}) {
    if (Object.hasOwn(patch, "customerName")) setCustomerName(patch.customerName);
    if (Object.hasOwn(patch, "customerEmail")) setCustomerEmail(patch.customerEmail);
    if (Object.hasOwn(patch, "customerPhone")) setCustomerPhone(patch.customerPhone);
    if (Object.hasOwn(patch, "customerAddress")) setCustomerAddress(patch.customerAddress);
    if (Object.hasOwn(patch, "agreement")) setAgreement(patch.agreement);
    if (Object.hasOwn(patch, "customerLocation")) setCustomerLocation(patch.customerLocation);
    if (Object.hasOwn(patch, "projectTitle")) setProjectTitle(patch.projectTitle);
    if (Object.hasOwn(patch, "projectDescription")) setProjectDescription(patch.projectDescription);
    if (Object.hasOwn(patch, "problemFound")) setProblemFound(patch.problemFound);
    if (Object.hasOwn(patch, "recommendedSolution")) setRecommendedSolution(patch.recommendedSolution);
    if (Object.hasOwn(patch, "timeline")) setTimeline(patch.timeline);
    if (Object.hasOwn(patch, "labor")) setLabor(patch.labor);
    if (Object.hasOwn(patch, "materials")) setMaterials(patch.materials);
    if (Object.hasOwn(patch, "estimatedDuration")) setEstimatedDuration(patch.estimatedDuration);
    if (Object.hasOwn(patch, "totalOverride")) setTotalOverride(patch.totalOverride);
    if (Object.hasOwn(patch, "notes")) setNotes(patch.notes);
    if (Object.hasOwn(patch, "terms")) setTerms(patch.terms);
    if (Object.hasOwn(patch, "quoteNumber")) setQuoteNumber(patch.quoteNumber);
    if (Object.hasOwn(patch, "quoteDate")) setQuoteDate(patch.quoteDate);
    if (Object.hasOwn(patch, "depositRequired")) setDepositRequired(patch.depositRequired);
    if (Object.hasOwn(patch, "depositAmount")) setDepositAmount(patch.depositAmount);
    if (Object.hasOwn(patch, "pricingDisplayMode")) setPricingDisplayMode(patch.pricingDisplayMode);
    if (Object.hasOwn(patch, "materialsDisplayMode")) setMaterialsDisplayMode(patch.materialsDisplayMode);
    if (Object.hasOwn(patch, "depositMode")) setDepositMode(patch.depositMode);
    if (Object.hasOwn(patch, "depositPercent")) setDepositPercent(patch.depositPercent);
    if (Object.hasOwn(patch, "depositFixedAmount")) setDepositFixedAmount(patch.depositFixedAmount);
    if (Object.hasOwn(patch, "discount")) setDiscount(patch.discount);
    if (Object.hasOwn(patch, "tax")) setTax(patch.tax);
    if (Object.hasOwn(patch, "travelFee")) setTravelFee(patch.travelFee);
    if (Object.hasOwn(patch, "disposalFee")) setDisposalFee(patch.disposalFee);
    if (Object.hasOwn(patch, "startDate")) setStartDate(patch.startDate);
    if (patch.depositTerms) {
      setTerms((current) => {
        const existing = cleanText(current);
        return existing.toLowerCase().includes(patch.depositTerms.toLowerCase())
          ? existing
          : [existing, patch.depositTerms].filter(Boolean).join(" · ");
      });
    }
    if (patch.replaceCollections) {
      setLineItems(
        patch.lineItems?.length
          ? patch.lineItems.map((item, index) => normalizeQuoteLineItem(item, index))
          : [normalizeQuoteLineItem({}, 0)]
      );
      setMaterialRows(
        patch.materialItems?.length
          ? patch.materialItems.map((item, index) => normalizeQuoteMaterialItem(item, index))
          : [normalizeQuoteMaterialItem({}, 0)]
      );
      setLaborRows(
        patch.laborItems?.length
          ? patch.laborItems.map((item, index) => normalizeQuoteLaborItem(item, index, isSpanish))
          : [normalizeQuoteLaborItem({}, 0, isSpanish)]
      );
    } else if (patch.lineItemDescription) {
      setLineItems((rows) => rows.map((row, index) =>
        index === 0 && !cleanText(row.description)
          ? { ...row, description: patch.lineItemDescription }
          : row
      ));
    }
    if (!patch.replaceCollections && patch.materialItems?.length) {
      setMaterialRows((rows) => {
        const next = [...rows];
        patch.materialItems.forEach((item) => {
          const index = next.findIndex((row) =>
            cleanText(row.name).toLowerCase() === cleanText(item.name).toLowerCase()
          );
          const normalized = normalizeQuoteMaterialItem(item, index >= 0 ? index : next.length);
          if (index >= 0) next[index] = { ...next[index], ...normalized, id: next[index].id };
          else next.push(normalized);
        });
        return next.filter((row, index) => index > 0 || cleanText(row.name) || Number(row.total || 0) > 0);
      });
    } else if (!patch.replaceCollections && patch.materialAmount) {
      setMaterialRows((rows) => rows.map((row, index) =>
        index === 0 ? { ...row, name: row.name || "Materials", total: patch.materialAmount } : row
      ));
    }
    if (!patch.replaceCollections && patch.laborItems?.length) {
      setLaborRows((rows) => patch.laborItems.map((item, index) =>
        normalizeQuoteLaborItem({ ...item, id: rows[index]?.id || item.id }, index, isSpanish)
      ));
    }
  }

  function leaveUnifiedBusinessWorkspace() {
    if (isUnifiedDepositRequestEntry) {
      setPage(routeCanonicalJobId
        ? `workCenter?jobId=${encodeURIComponent(routeCanonicalJobId)}`
        : "workCenter");
      return;
    }
    if (isUnifiedInvoiceEntry) {
      const destination = invoiceBuilderReturnPage || "conversationThread";
      if (invoiceBuilderSource) localStorage.removeItem("invoiceBuilderSource");
      if (invoiceBuilderReturnPage) localStorage.removeItem("invoiceBuilderReturnPage");
      setPage(destination);
      return;
    }

    if (isUniversalQuickQuote) {
      void exitQuickQuoteAnalysis();
      return;
    }

    navigateFromQuoteBuilder();
  }

  const unifiedQuoteDraft = {
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    customerLocation,
    projectTitle,
    projectDescription,
    recommendedSolution,
    quoteNumber,
    quoteDate,
    lineItems: lineItems.map((item) => ({ ...item, total: getEditableRowTotal(item) })),
    materialItems: materialRows.map((item) => ({ ...item, total: getEditableRowTotal(item, "quantity", "cost") })),
    laborItems: laborRows.map((item) => ({ ...item, total: getEditableRowTotal(item, "hours", "rate") })),
    total: calculatedTotal,
    totalOverride,
    terms,
    pricingDisplayMode,
    materialsDisplayMode,
    depositMode,
    depositPercent,
    depositFixedAmount,
    depositRequired,
    depositAmount,
    discount,
    tax,
    fees: String(feesAmount || ""),
    estimatedDuration,
    notes,
    agreement,
    canonicalStatus: "DRAFT",
  };

  const unifiedDepositRequestQuote =
    isUnifiedDepositRequestEntry && depositRequestSourceQuoteDocument
      ? {
          ...unifiedQuoteDraft,
          ...depositRequestSourceQuoteDocument.content,
          quoteNumber:
            depositRequestSourceQuoteDocument.documentNumber ||
            depositRequestSourceQuoteDocument.content?.quoteNumber ||
            unifiedQuoteDraft.quoteNumber ||
            "",
          customerParty:
            depositRequestSourceQuoteDocument.customerParty || null,
        }
      : unifiedQuoteDraft;

  const unifiedWorkspaceEnabled = true;

  if (unifiedWorkspaceEnabled) {
    if (!savedQuoteRoute.valid) {
      return (
        <div className="app-page meetro-form-page business-document-context-gate" role="alert">
          <h1>Saved Quote unavailable</h1>
          <p>
            Meetro could not verify this saved Quote route. No customer information
            was shown and nothing was opened or changed.
          </p>
          <button type="button" onClick={leaveUnifiedBusinessWorkspace}>Go Back</button>
        </div>
      );
    }
    if (routeSavedDocumentId && savedRouteBootstrap.status === "loading") {
      return (
        <div className="app-page meetro-form-page business-document-context-gate">
          <p role="status">Opening the exact authorized saved Quote…</p>
        </div>
      );
    }
    if (routeSavedDocumentId && savedRouteBootstrap.status !== "ready") {
      return (
        <div className="app-page meetro-form-page business-document-context-gate" role="alert">
          <h1>Saved Quote unavailable</h1>
          <p>
            Meetro could not verify this exact saved Quote for the signed-in
            professional. No customer information was shown and nothing was opened
            or changed.
          </p>
          <button type="button" onClick={leaveUnifiedBusinessWorkspace}>Go Back</button>
        </div>
      );
    }
    if (isUnifiedInvoiceEntry && routeCanonicalJobId && invoicePreparation.status === "loading") {
      return (
        <div className="app-page meetro-form-page business-document-context-gate">
          <p role="status">Preparing the completed Job for Invoice review…</p>
        </div>
      );
    }
    if (isUnifiedInvoiceEntry && routeCanonicalJobId && invoicePreparation.status !== "ready") {
      return (
        <div className="app-page meetro-form-page business-document-context-gate" role="alert">
          <h1>Invoice review unavailable</h1>
          <p>{invoicePreparation.error || "This completed Job is not ready for Invoice review."}</p>
          <button type="button" onClick={leaveUnifiedBusinessWorkspace}>Go Back</button>
        </div>
      );
    }
    if (
      !isUnifiedInvoiceEntry &&
      savedQuoteContextJobId &&
      ["loading", "standalone"].includes(jobLinkedQuoteContext.status)
    ) {
      return (
        <div className="app-page meetro-form-page business-document-context-gate">
          <p role="status">Loading the authorized Job, customer, and Evaluation context…</p>
        </div>
      );
    }
    if (
      !isUnifiedInvoiceEntry &&
      savedQuoteContextJobId &&
      !["ready", "protected"].includes(jobLinkedQuoteContext.status)
    ) {
      const multipleSavedQuotes = jobLinkedQuoteContext.status === "ambiguous";
      return (
        <div className="app-page meetro-form-page business-document-context-gate" role="alert">
          <h1>{multipleSavedQuotes ? "Choose a saved Quote" : "Job context unavailable"}</h1>
          <p>
            {multipleSavedQuotes
              ? "More than one saved Quote is linked to this Job. Open Saved Files and choose the exact Quote; Meetro did not select or create one automatically."
              : "Meetro could not verify this Job and its customer for the signed-in professional. No customer information was shown and no Quote was created."}
          </p>
          <button type="button" onClick={leaveUnifiedBusinessWorkspace}>Go Back</button>
        </div>
      );
    }
    if (!isUnifiedDepositRequestEntry && !routeSavedDocumentId && routeCanonicalJobId && jobLinkedQuoteContext.existingQuoteProtected) {
      const savedQuoteResume = jobLinkedQuoteContext.savedQuoteResume ||
        resolveJobLinkedSavedQuoteResume(jobLinkedQuoteContext.context);
      return (
        <div className="app-page meetro-form-page business-document-context-gate">
          <h1>Existing Quote protected</h1>
          <p>
            This Job already has saved Quote work. Open the exact saved Quote so fresh
            Job or Evaluation context does not replace professional-entered content.
          </p>
          <button
            type="button"
            disabled={!savedQuoteResume}
            onClick={openProtectedJobLinkedQuote}
          >
            Open Saved Quote
          </button>
          {!savedQuoteResume ? (
            <p role="alert">
              The exact saved working Quote could not be verified. Nothing was
              opened or changed.
            </p>
          ) : null}
          <button type="button" onClick={leaveUnifiedBusinessWorkspace}>Go Back</button>
        </div>
      );
    }
    return (
      <>
        <input
          ref={quickQuotePhotoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          disabled={!quickQuotePhotoUploadEnabled || quickQuotePhotoBusy}
          onChange={handleQuickQuotePhotoInput}
        />
        <UnifiedBusinessDocumentWorkspace
          setPage={setPage}
          language={language}
          initialDocument={initialDocument}
          initialSavedDocumentId={
            routeSavedDocumentId ||
            jobLinkedQuoteContext.reopenDocumentId ||
            (isUnifiedInvoiceEntry ? invoicePreparation.resumeDocumentId : null)
          }
          initialSavedDocument={savedRouteBootstrap.document}
          genericNewQuoteIntent={isGenericNewQuoteIntent}
          onDurableDocumentOpened={persistOpenedQuoteRoute}
          job={{
            id: canonicalJobId || null,
            requestId: invoicePreparation.job?.requestId || jobLinkedQuoteContext.context?.job.requestId || null,
            relationshipId:
              invoicePreparation.job?.relationshipId || jobLinkedQuoteContext.context?.job.relationshipId || null,
            title: invoicePreparation.job?.serviceTitle || quickQuoteAttachedJob?.title || activeJobSnapshot?.service || projectTitle,
            customerName: invoicePreparation.job?.customerName || quickQuoteAttachedJob?.customerLabel || activeJobSnapshot?.customer || customerName,
            location: routeCanonicalJobId
              ? customerLocation
              : activeJobSnapshot?.location || customerLocation,
            customerConcern:
              jobLinkedQuoteContext.context?.project.customerConcern || "",
            evaluation: jobLinkedQuoteContext.context?.evaluation || null,
            findings: jobLinkedQuoteContext.context?.findings || [],
            recommendations:
              jobLinkedQuoteContext.context?.recommendations || [],
            customerLinkedFromJob:
              invoicePreparation.status === "ready" || (
                ["ready", "protected"].includes(jobLinkedQuoteContext.status) &&
                Boolean(jobLinkedQuoteContext.context?.customer.displayName)
              ),
            canonical: Boolean(canonicalJobId),
          }}
          quote={
            isUnifiedDepositRequestEntry
              ? unifiedDepositRequestQuote
              : unifiedQuoteDraft
          }
          invoicePreparation={invoicePreparation.status === "ready" ? invoicePreparation.job : null}
          onCreateCanonicalInvoice={createReviewedCompletedJobInvoice}
          onApplyQuotePatch={applyUnifiedQuotePatch}
          onAddPhotos={(documentType = "quote") => {
            quickQuotePhotoTargetDocumentRef.current = documentType;
            void openQuickQuotePhotoPicker();
          }}
          canAddPhotos={quickQuotePhotoUploadEnabled}
          photos={quickQuoteDraftPhotos}
          photoBusy={quickQuotePhotoBusy}
          photoNotice={quickQuotePhotoNotice}
          onEnsurePhotosDurable={ensureWorkspacePhotosDurable}
          onRestorePhotos={restoreWorkspacePhotos}
          onPhotosPersisted={markWorkspacePhotosPersisted}
          onDiscardTransientPhotos={discardWorkspaceTransientPhotos}
          onDownloadQuote={(photoEvidence, workingDraftStatus) => void exportQuickQuotePdf(photoEvidence, workingDraftStatus)}
          onPreviewQuote={(photoEvidence, workingDraftStatus) => previewQuickQuotePdfWithPhotos(photoEvidence, workingDraftStatus)}
          onBack={leaveUnifiedBusinessWorkspace}
        />
      </>
    );
  }

  return (
    <div className="app-page meetro-form-page" style={page}>
      <button
        style={backButton}
        onClick={() => {
          if (isUniversalQuickQuote) {
            void exitQuickQuoteAnalysis();
            return;
          }

          navigateFromQuoteBuilder();
        }}
      >
        ←{" "}
        {isEditingExistingQuote
          ? isWorkCenterReturn
            ? getWorkCenterContextReturnLabel({
                language,
                customerName: workCenterReturnCustomer,
              })
            : isSpanish
            ? "Salir de cotización"
            : "Exit Quote"
          : isRevisedQuoteFlow
          ? getConversationActionLabel(
              CONVERSATION_ACTION_STAGE.ACTIVE,
              language
            )
          : isSpanish
          ? isBusinessToolsReturn
            ? "Volver a Herramientas"
            : isWorkCenterReturn
            ? getWorkCenterContextReturnLabel({
                language,
                customerName: workCenterReturnCustomer,
              })
            : "Volver a clientes"
          : isWorkCenterReturn
          ? getWorkCenterContextReturnLabel({
              language,
              customerName: workCenterReturnCustomer,
            })
          : isBusinessToolsReturn
          ? "Back to Business Tools"
          : "Back to Leads"}
      </button>

      {request.source === "schedule_evaluation" && (
        <button style={evaluationBackButton} onClick={backToEvaluationNotes}>
          ← {isSpanish ? "Volver a Notas de Evaluación" : "Back to Evaluation Notes"}
        </button>
      )}

      {isUniversalQuickQuote ? (
        <>
        <input
          ref={quickQuotePhotoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          disabled={
            !quickQuotePhotoUploadEnabled ||
            quickQuotePhotoBusy
          }
          onChange={handleQuickQuotePhotoInput}
        />
        {quickQuoteView === "internalEstimate" && assistant.result ? (
          <main
            className="quick-quote-internal-estimate"
            aria-labelledby="quick-quote-internal-estimate-title"
          >
            <button
              type="button"
              className="quick-quote-analysis-back"
              onClick={() => setQuickQuoteView("review")}
            >
              ← {quickQuoteCopy.backToJobAnalysis}
            </button>
            <header className="quick-quote-flow-header">
              <p>{quickQuoteCopy.privateInternal}</p>
              <h1 id="quick-quote-internal-estimate-title">
                {assistant.result.operation === INTELLIGENCE_OPERATION.ESTIMATE
                  ? quickQuoteCopy.internalEstimateTitle
                  : quickQuoteCopy.quoteReviewTitle}
              </h1>
              <div className="quick-quote-guidance">
                <strong>
                  {assistant.result.operation === INTELLIGENCE_OPERATION.ESTIMATE
                    ? quickQuoteCopy.internalEstimateHelp
                    : quickQuoteCopy.quoteReviewHelp}
                </strong>
                <span>{quickQuoteCopy.noQuotePricingPromotion}</span>
              </div>
            </header>
            <section className="quick-quote-connected-job">
              <span>{quickQuoteCopy.connectedJob}</span>
              <strong>{quickQuoteAttachedJob?.title}</strong>
              {quickQuoteAttachedJob?.customerLabel ? (
                <small>{quickQuoteAttachedJob.customerLabel}</small>
              ) : null}
            </section>
            <EstimateAssistantResult
              key={assistant.result.proposal.proposalId}
              result={assistant.result}
              language={language}
              onSolutionReady={() => void markEstimateSolutionReady()}
              onUseQuote={(edits) => void handleUseQuoteComposition(edits)}
              onDismiss={() => void dismissEstimateHelp()}
            />
            {assistant.error ? (
              <p className="quick-quote-action-notice" role="alert">
                {assistant.error}
              </p>
            ) : null}
          </main>
        ) : (
        <QuickQuoteConversation
          language={language}
          view={quickQuoteView}
          prompt={quickQuotePrompt}
          onPromptChange={handleQuickQuotePromptChange}
          onPrepare={prepareQuickQuoteConversation}
          onBackToDetails={backToQuickQuoteJobDetails}
          onReturnToAnalysis={returnToQuickQuoteAnalysis}
          analysisAvailable={
            quickQuoteAnalysisState.available
          }
          analysisStale={
            quickQuoteAnalysisState.stale
          }
          analysisBusy={
            quickQuotePhotoAssistant.busy
          }
          analysisTurns={
            quickQuoteAnalysisSessionState
              .turns
              .filter(
                (turn) =>
                  turn.evidenceVersion ===
                  quickQuoteAnalysisSessionState
                    .latestEvidenceVersion
              )
          }
          onContinueAnalysis={
            continueQuickQuoteConversation
          }
          onContinueWithMyDetails={continueQuickQuoteWithProfessionalDetails}
          jobConnection={quickQuoteJobConnection}
          onOpenJobPicker={() => void openQuickQuoteJobPicker()}
          onSelectJob={(job) => void attachQuickQuoteToJob(job)}
          onConfirmCategoryCosts={() =>
            void confirmQuickQuoteCategoryCosts()
          }
          onCancelJobConnection={() =>
            setQuickQuoteJobConnection({
              stage: "idle",
              busy: false,
              error: "",
              jobs: [],
              selectedJobId: "",
            })
          }
          onBackToJobConnection={() =>
            setQuickQuoteJobConnection((current) => ({
              ...current,
              stage: "decision",
              error: "",
              selectedJobId: "",
            }))
          }
          setPage={setPage}
          photoCount={quickQuoteDraftPhotos.length}
          photos={quickQuoteDraftPhotos}
          canAddPhotos={quickQuotePhotoUploadEnabled}
          photoBusy={quickQuotePhotoBusy}
          onAddPhotos={() =>
            void openQuickQuotePhotoPicker()
          }
          onRemovePhoto={(photoId) =>
            void removeQuickQuoteDraftPhoto(photoId)
          }
          photoProposal={
            quickQuotePhotoAssistant.proposal
          }
          reviewedResult={
            !quickQuoteAnalysisState.stale &&
            !quickQuoteAnalysisSessionState.stale &&
            quickQuoteReviewedResult
              ?.analysisSessionId ===
              quickQuoteAnalysisSessionState
                .sessionId &&
            quickQuoteReviewedResult
              ?.evidenceVersion ===
              quickQuoteAnalysisSessionState
                .latestEvidenceVersion &&
            quickQuoteReviewedResult
              ?.proposalId ===
              quickQuotePhotoAssistant
                .proposal
                ?.proposalId
              ? quickQuoteReviewedResult
              : null
          }
          photoDecisions={
            quickQuotePhotoAssistant.decisions
          }
          photoReviewBusyId={
            quickQuotePhotoAssistant.reviewingId
          }
          onReviewPhotoSuggestion={
            reviewQuickQuotePhotoSuggestion
          }
          notice={[
            quickQuoteContinuationNotice,
            quickQuotePhotoNotice,
            quickQuotePhotoAssistant.error,
          ]
            .filter(Boolean)
            .join(" ")}
        />
        )}
        </>
      ) : null}
      {!isUniversalQuickQuote && (
        <section
          id={isUniversalQuickQuote ? "quick-quote-full-details" : undefined}
          className={isUniversalQuickQuote ? "quick-quote-full-details" : undefined}
          tabIndex={isUniversalQuickQuote ? -1 : undefined}
          aria-label={isUniversalQuickQuote ? quickQuoteCopy.fullDetailsLabel : undefined}
        >
      <div style={hero}>
        {isRevisedQuoteFlow && (
          <div style={revisionBanner}>
            <MeetroIcon name="history" size={16} decorative />{" "}
            {isSpanish
              ? "Cotización revisada solicitada por cambio del servicio"
              : "Revised quote requested from service change"}
          </div>
        )}

        <p style={eyebrow}>{isSpanish ? "Constructor de Cotización" : "Quote Builder"}</p>
        <h1 style={title}>
          {projectTitle || (isSpanish ? "Cotización rápida" : "Quick Quote")}
        </h1>
        <p style={subtitle}>
          {projectDescription ||
            (isUniversalQuickQuote
              ? isSpanish
                ? "Crea una cotización editable sin abrir un flujo de trabajo activo."
                : "Create an editable quote without opening an active workflow."
              : "")}
        </p>
      </div>

      <div style={grid}>
        <div style={card}>
          <h2 style={sectionTitle}>{isSpanish ? "Resumen del proyecto" : "Project Summary"}</h2>

	          <p style={label}>{isSpanish ? "Nombre del cliente" : "Customer Name"}</p>
	          <input
            style={input}
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
	            placeholder={isSpanish ? "Nombre del cliente" : "Customer name"}
	          />
	
	          <div style={compactFieldGrid}>
	            <label style={compactLabel}>
	              {isSpanish ? "Título de cotización" : "Quote Title"}
	              <input
	                style={input}
	                value={projectTitle}
	                onChange={(event) => setProjectTitle(event.target.value)}
	                placeholder={isSpanish ? "Ej. Reparación de puerta" : "Ex. Door repair"}
	              />
	            </label>
	            <label style={compactLabel}>
	              {isSpanish ? "Ubicación" : "Location"}
	              <input
	                style={input}
	                value={customerLocation}
	                onChange={(event) => setCustomerLocation(event.target.value)}
	                placeholder={isSpanish ? "Ubicación pendiente" : "Location pending"}
	              />
	            </label>
	            <label style={compactLabel}>
	              {isSpanish ? "Número de cotización" : "Quote Number"}
	              <input
	                style={input}
	                value={quoteNumber}
	                onChange={(event) => setQuoteNumber(event.target.value)}
	                placeholder={isSpanish ? "Ej. COT-1024" : "Ex. Q-1024"}
	              />
	            </label>
	            <label style={compactLabel}>
	              {isSpanish ? "Fecha" : "Date"}
	              <input
	                style={input}
	                type="date"
	                value={quoteDate}
	                onChange={(event) => setQuoteDate(event.target.value)}
	              />
	            </label>
	          </div>

          <p style={label}>{isSpanish ? "Solicitud del cliente" : "Customer Request"}</p>
          <textarea
            style={textarea}
            value={projectDescription}
            onChange={(event) => setProjectDescription(event.target.value)}
            placeholder={
              isSpanish
                ? "Describe la solicitud o alcance."
                : "Describe the request or scope."
            }
	          />
	        </div>

	        <div style={card}>
	          <h2 style={sectionTitle}>{isSpanish ? "Configuración de cotización" : "Quote Settings"}</h2>
	          <div style={compactFieldGrid}>
	            <label style={compactLabel}>
	              {isSpanish ? "Tipo de propuesta" : "Proposal Type"}
	              <select style={selectInput} value={proposalType} onChange={(event) => setProposalType(event.target.value)}>
	                {proposalTypeOptions.map((option) => <option key={option}>{option}</option>)}
	              </select>
	            </label>
	            <label style={compactLabel}>
	              {isSpanish ? "Prioridad" : "Priority"}
	              <select style={selectInput} value={priority} onChange={(event) => setPriority(event.target.value)}>
	                {priorityOptions.map((option) => <option key={option}>{option}</option>)}
	              </select>
	            </label>
	            <label style={compactLabel}>
	              {isSpanish ? "Categoría de mano de obra" : "Labor Category"}
	              <select style={selectInput} value={laborCategory} onChange={(event) => setLaborCategory(event.target.value)}>
	                {laborCategoryOptions.map((option) => <option key={option}>{option}</option>)}
	              </select>
	            </label>
	            <label style={compactLabel}>
	              {isSpanish ? "Método de precio" : "Pricing Method"}
	              <select style={selectInput} value={pricingMethod} onChange={(event) => setPricingMethod(event.target.value)}>
	                {pricingMethodOptions.map((option) => <option key={option}>{option}</option>)}
	              </select>
	            </label>
	            <label style={compactLabel}>
	              {isSpanish ? "Proveedor de materiales" : "Material Provider"}
	              <select style={selectInput} value={materialProvider} onChange={(event) => setMaterialProvider(event.target.value)}>
	                {materialProviderOptions.map((option) => <option key={option}>{option}</option>)}
	              </select>
	            </label>
	            <label style={compactLabel}>
	              {isSpanish ? "Depósito requerido" : "Deposit Required"}
	              <select style={selectInput} value={depositRequired} onChange={(event) => setDepositRequired(event.target.value)}>
	                <option>No</option>
	                <option>Yes</option>
	              </select>
	            </label>
	          </div>
	          {(proposalType === "Custom" || laborCategory === "Custom" || pricingMethod === "Custom") && (
	            <div style={compactFieldGrid}>
	              {proposalType === "Custom" && (
	                <label style={compactLabel}>
	                  {isSpanish ? "Tipo personalizado" : "Custom Proposal Type"}
	                  <input style={input} value={customProposalType} onChange={(event) => setCustomProposalType(event.target.value)} />
	                </label>
	              )}
	              {laborCategory === "Custom" && (
	                <label style={compactLabel}>
	                  {isSpanish ? "Categoría personalizada" : "Custom Labor Category"}
	                  <input style={input} value={customLaborCategory} onChange={(event) => setCustomLaborCategory(event.target.value)} />
	                </label>
	              )}
	              {pricingMethod === "Custom" && (
	                <label style={compactLabel}>
	                  {isSpanish ? "Precio personalizado" : "Custom Pricing Method"}
	                  <input style={input} value={customPricingMethod} onChange={(event) => setCustomPricingMethod(event.target.value)} />
	                </label>
	              )}
	            </div>
	          )}
	        </div>

        <div style={proposalCard}>
          <p style={eyebrowDark}>{t("quoteDraftHelpTitle", language)}</p>
          <h2 style={sectionTitle}>
            {isSpanish ? "Problema encontrado" : "Problem Found"}
          </h2>
          <textarea
            style={proposalTextarea}
            value={problemFound}
            onChange={(event) => setProblemFound(event.target.value)}
            placeholder={
              isSpanish
                ? "Describe el problema encontrado o el servicio solicitado."
                : "Describe the problem found or requested service."
            }
          />
          <h2 style={sectionTitle}>
            {isSpanish ? "Solución recomendada" : "Recommended Solution"}
          </h2>
          <p style={proposalHint}>{t("quoteProposalReviewHint", language)}</p>
          <textarea
            style={proposalTextarea}
            value={recommendedSolution}
            onChange={(event) => setRecommendedSolution(event.target.value)}
            placeholder={
              isSpanish
                ? "Explica qué encontraste, qué recomiendas y qué pasará después."
                : "Explain what you found, what you recommend, and what happens next."
            }
          />
        </div>

	        {hasImportedEvaluation && (
	          <div style={card}>
	            <div style={compactSectionHeader}>
	              <div>
	                <p style={eyebrowDark}>
	                  {isSpanish ? "Importado de la visita" : "Imported From Evaluation"}
	                </p>
	                <h2 style={sectionTitle}>
	                  {isSpanish ? "Resumen de Evaluación" : "Evaluation Summary"}
	                </h2>
	              </div>
	              {quoteContextPayload.visitDate && (
                <span style={smallStatusPill}>
                  {quoteContextPayload.visitDate}
                  {quoteContextPayload.visitTime ? ` · ${quoteContextPayload.visitTime}` : ""}
                </span>
	              )}
	            </div>
	
	            <div style={evaluationSummaryGrid}>
	              <div style={evaluationSummaryTile}>
	                <strong>{importedWorkItems.length}</strong>
	                <span>{isSpanish ? "alcances" : "work items"}</span>
	              </div>
	              <div style={evaluationSummaryTile}>
	                <strong>{importedPhotoCount}</strong>
	                <span>{isSpanish ? "fotos" : "photos"}</span>
	              </div>
	              <div style={evaluationSummaryTile}>
	                <strong>{importedMaterials.length}</strong>
	                <span>{isSpanish ? "materiales" : "materials"}</span>
	              </div>
	              <div style={evaluationSummaryTile}>
	                <strong>{importedMeasurementCount}</strong>
	                <span>{isSpanish ? "medidas" : "measurements"}</span>
	              </div>
	            </div>
	            <p style={evaluationSummaryText}>{importedFindingSummary}</p>

	            <details style={evaluationDetailsDisclosure}>
	              <summary style={evaluationDetailsSummary}>
	                {isSpanish ? "Ver detalles de evaluación" : "View Evaluation Details"}
	              </summary>
	              {importedWorkItems.length > 0 ? (
	                <div style={importedEvaluationList}>
	                  {importedWorkItems.map((item, index) => (
	                    <div key={item.id || index} style={importedWorkItemCard}>
	                      <div style={importedWorkItemTop}>
	                        <span style={smallStatusPill}>
	                          {isSpanish ? "Elemento" : "Item"} {index + 1}
	                        </span>
	                        <strong style={importedWorkItemTitle}>{item.title}</strong>
	                      </div>
	                      {item.notes && <p style={importedFieldText}>{item.notes}</p>}
	                      {item.measurements.length > 0 && (
	                        <ul style={cleanList}>
	                          {item.measurements.map((measurement, measurementIndex) => (
	                            <li key={`${item.id}-measurement-${measurementIndex}`}>{measurement}</li>
	                          ))}
	                        </ul>
	                      )}
	                      {item.photos.length > 0 && (
	                        <div style={photoCountPill}>
	                          {item.photos.length} {isSpanish ? "fotos documentadas" : "photos documented"}
	                        </div>
	                      )}
	                    </div>
	                  ))}
	                </div>
	              ) : (
	                <p style={value}>
	                  {quoteContextPayload.evaluationNotes ||
	                    (isSpanish
	                      ? "La visita tiene notas importadas para revisar."
	                      : "This visit has imported notes for review.")}
	                </p>
	              )}
	            </details>
	          </div>
	        )}

        <div style={card}>
          <h2 style={sectionTitle}>{isSpanish ? "Partidas, totales y vista previa" : "Line Items, Totals, and Preview"}</h2>
          <p style={sectionHelperText}>{t("quotePricingPreviewHint", language)}</p>

          {canonicalJobId && (
            <ContextualAskMeetro
              language={language}
              contextLabel="estimate-and-quote"
              voiceContextLabel="estimate"
              contextName={projectTitle || getAskMeetroWorkflowCopy(language).estimate}
              actions={[
                { id: "materials", label: getAskMeetroWorkflowCopy(language).estimateMaterials },
                { id: "prices", label: getAskMeetroWorkflowCopy(language).checkPrices },
                { id: "labor", label: getAskMeetroWorkflowCopy(language).estimateLabor },
                { id: "quote", label: getAskMeetroWorkflowCopy(language).prepareQuote },
              ]}
              busy={assistant.busy}
              error={assistant.error}
              notice={assistant.notice}
              onRequest={requestEstimateHelp}
            >
              {assistant.result && (
                <EstimateAssistantResult
                  key={assistant.result.proposal.proposalId}
                  result={assistant.result}
                  language={language}
                  onSolutionReady={() => void markEstimateSolutionReady()}
                  onUseQuote={(edits) => void handleUseQuoteComposition(edits)}
                  onDismiss={() => void dismissEstimateHelp()}
                />
              )}
            </ContextualAskMeetro>
          )}

          <div style={quoteBuilderSection}>
            <h3 style={quoteBuilderSectionTitle}>{isSpanish ? "Partidas" : "Line Items"}</h3>
            {lineItems.map((item, index) => (
              <div key={item.id} style={editableRowCard}>
                <input
                  style={input}
                  value={item.description}
                  onChange={(event) =>
                    updateRow(setLineItems, item.id, "description", event.target.value)
                  }
                  placeholder={isSpanish ? "Descripción" : "Description"}
                />
                <div style={rowGridThree}>
                  <input
                    style={input}
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(event) =>
                      updateRow(setLineItems, item.id, "quantity", event.target.value)
                    }
                    placeholder={isSpanish ? "Cant." : "Qty"}
                  />
                  <input
                    style={input}
                    inputMode="decimal"
                    value={item.unitPrice}
                    onChange={(event) =>
                      updateRow(setLineItems, item.id, "unitPrice", event.target.value)
                    }
                    placeholder={isSpanish ? "Precio" : "Unit price"}
                  />
                  <input
                    style={input}
                    inputMode="decimal"
                    value={item.total}
                    onChange={(event) =>
                      updateRow(setLineItems, item.id, "total", event.target.value)
                    }
                    placeholder={`$${getEditableRowTotal(item).toFixed(2)}`}
                  />
                </div>
                <button
                  style={rowRemoveButton}
                  onClick={() =>
                    removeRow(setLineItems, item.id, normalizeQuoteLineItem({}, index))
                  }
                >
                  {isSpanish ? "Quitar partida" : "Remove line"}
                </button>
              </div>
            ))}
            <button
              style={secondaryActionButton}
              onClick={() =>
                setLineItems((rows) => [
                  ...rows,
                  normalizeQuoteLineItem({ id: createQuoteRowId("quote-line") }, rows.length),
                ])
              }
            >
              {isSpanish ? "Agregar partida" : "Add Line Item"}
            </button>
          </div>

	          <div style={quoteBuilderSection}>
	            <div style={compactSectionHeader}>
	              <h3 style={quoteBuilderSectionTitle}>
	                {isSpanish ? "Materiales" : `Materials (${compactMaterialRows.length})`}
	              </h3>
	              <span style={smallStatusPill}>${materialsAmount.toFixed(2)}</span>
	            </div>
	            {materialRows.map((item, index) => (
	              <div key={item.id} style={editableRowCard}>
	                <input
                  style={input}
                  value={item.name}
                  onChange={(event) =>
                    updateRow(setMaterialRows, item.id, "name", event.target.value)
                  }
	                  placeholder={isSpanish ? "Material" : "Material name"}
	                />
	                <div style={rowGridTwo}>
	                  <input
	                    style={input}
	                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(event) =>
                      updateRow(setMaterialRows, item.id, "quantity", event.target.value)
                    }
                    placeholder={isSpanish ? "Cant." : "Qty"}
                  />
                  <input
                    style={input}
                    inputMode="decimal"
                    value={item.cost}
                    onChange={(event) =>
                      updateRow(setMaterialRows, item.id, "cost", event.target.value)
                    }
	                    placeholder={isSpanish ? "Costo" : "Cost"}
	                  />
	                </div>
	                <div style={materialCompactLine}>
	                  <span>{item.name || (isSpanish ? "Material" : "Material")}</span>
	                  <strong>
	                    {isSpanish ? "Total" : "Total"} ${getEditableRowTotal(item, "quantity", "cost").toFixed(2)}
	                  </strong>
	                </div>
	                <details style={rowDetails}>
	                  <summary style={rowDetailsSummary}>
	                    {isSpanish ? "Detalles" : "Details"}
	                  </summary>
	                  <input
	                    style={input}
	                    inputMode="decimal"
	                    value={item.total}
	                    onChange={(event) =>
	                      updateRow(setMaterialRows, item.id, "total", event.target.value)
	                    }
	                    placeholder={`$${getEditableRowTotal(item, "quantity", "cost").toFixed(2)}`}
	                  />
	                  <textarea
	                    style={{ ...textarea, minHeight: "70px" }}
	                    value={item.notes}
	                    onChange={(event) =>
	                      updateRow(setMaterialRows, item.id, "notes", event.target.value)
	                    }
	                    placeholder={isSpanish ? "Notas" : "Notes"}
	                  />
	                </details>
	                <button
	                  style={rowRemoveButton}
                  onClick={() =>
                    removeRow(setMaterialRows, item.id, normalizeQuoteMaterialItem({}, index))
                  }
                >
                  {isSpanish ? "Quitar material" : "Remove material"}
                </button>
              </div>
            ))}
            <button
              style={secondaryActionButton}
              onClick={() =>
                setMaterialRows((rows) => [
                  ...rows,
                  normalizeQuoteMaterialItem({ id: createQuoteRowId("material-line") }, rows.length),
                ])
              }
            >
              {isSpanish ? "Agregar material" : "Add Material"}
            </button>
          </div>

          <div style={quoteBuilderSection}>
            <h3 style={quoteBuilderSectionTitle}>{isSpanish ? "Mano de obra" : "Labor"}</h3>
            {laborRows.map((item, index) => (
              <div key={item.id} style={editableRowCard}>
                <input
                  style={input}
                  value={item.description}
                  onChange={(event) =>
                    updateRow(setLaborRows, item.id, "description", event.target.value)
                  }
                  placeholder={isSpanish ? "Descripción de mano de obra" : "Labor description"}
                />
                <div style={rowGridThree}>
                  <input
                    style={input}
                    inputMode="decimal"
                    value={item.hours}
                    onChange={(event) =>
                      updateRow(setLaborRows, item.id, "hours", event.target.value)
                    }
                    placeholder={isSpanish ? "Horas" : "Hours"}
                  />
                  <input
                    style={input}
                    inputMode="decimal"
                    value={item.rate}
                    onChange={(event) =>
                      updateRow(setLaborRows, item.id, "rate", event.target.value)
                    }
                    placeholder={isSpanish ? "Tarifa" : "Rate"}
                  />
                  <input
                    style={input}
                    inputMode="decimal"
                    value={item.total}
                    onChange={(event) =>
                      updateRow(setLaborRows, item.id, "total", event.target.value)
                    }
                    placeholder={`$${getEditableRowTotal(item, "hours", "rate").toFixed(2)}`}
                  />
                </div>
                <button
                  style={rowRemoveButton}
                  onClick={() =>
                    removeRow(setLaborRows, item.id, normalizeQuoteLaborItem({}, index, isSpanish))
                  }
                >
                  {isSpanish ? "Quitar mano de obra" : "Remove labor"}
                </button>
              </div>
            ))}
            <button
              style={secondaryActionButton}
              onClick={() =>
                setLaborRows((rows) => [
                  ...rows,
                  normalizeQuoteLaborItem({ id: createQuoteRowId("labor-line") }, rows.length, isSpanish),
                ])
              }
            >
              {isSpanish ? "Agregar mano de obra" : "Add Labor"}
            </button>
          </div>

          <div style={pricingSummaryBox}>
            <div style={pricingSummaryRow}>
              <span>{isSpanish ? "Subtotal de partidas" : "Line Items Subtotal"}</span>
              <strong>${lineItemsTotal.toFixed(2)}</strong>
            </div>
            <div style={pricingSummaryRow}>
              <span>{isSpanish ? "Mano de obra" : "Labor"}</span>
              <strong>${laborAmount.toFixed(2)}</strong>
            </div>
            <div style={pricingSummaryRow}>
              <span>{isSpanish ? "Materiales" : "Materials"}</span>
              <strong>${materialsAmount.toFixed(2)}</strong>
            </div>
	            <div style={rowGridTwo}>
	              <label style={label}>
	                {isSpanish ? "Descuento" : "Discount"}
                <input
                  style={input}
                  inputMode="decimal"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  placeholder="$0.00"
                />
              </label>
              <label style={label}>
                {isSpanish ? "Impuesto" : "Tax"}
                <input
                  style={input}
                  inputMode="decimal"
                  value={tax}
                  onChange={(event) => setTax(event.target.value)}
                  placeholder="$0.00"
	                />
	              </label>
	              <label style={label}>
	                {isSpanish ? "Tarifa de viaje" : "Travel Fee"}
	                <input
	                  style={input}
	                  inputMode="decimal"
	                  value={travelFee}
	                  onChange={(event) => setTravelFee(event.target.value)}
	                  placeholder="$0.00"
	                />
	              </label>
	              <label style={label}>
	                {isSpanish ? "Desecho" : "Disposal Fee"}
	                <input
	                  style={input}
	                  inputMode="decimal"
	                  value={disposalFee}
	                  onChange={(event) => setDisposalFee(event.target.value)}
	                  placeholder="$0.00"
	                />
	              </label>
	              <label style={label}>
	                {isSpanish ? "Depósito" : "Deposit Amount"}
	                <input
	                  style={input}
	                  inputMode="decimal"
	                  value={depositAmount}
	                  onChange={(event) => setDepositAmount(event.target.value)}
	                  placeholder="$0.00"
	                />
	              </label>
	            </div>
	            <div style={rowGridTwo}>
	              <label style={label}>
	                {isSpanish ? "Fecha de inicio" : "Start Date"}
	                <input
	                  style={input}
	                  type="date"
	                  value={startDate}
	                  onChange={(event) => setStartDate(event.target.value)}
	                />
	              </label>
	              <label style={label}>
	                {isSpanish ? "Duración estimada" : "Estimated Duration"}
	                <input
	                  style={input}
	                  value={estimatedDuration}
	                  onChange={(event) => setEstimatedDuration(event.target.value)}
	                  placeholder={isSpanish ? "1–2 días" : "1–2 days"}
	                />
	              </label>
	            </div>
	            <div style={pricingSummaryRow}>
	              <span>{isSpanish ? "Tarifas" : "Fees"}</span>
	              <strong>${feesAmount.toFixed(2)}</strong>
	            </div>
	            <div style={pricingSummaryRow}>
	              <span>{isSpanish ? "Subtotal" : "Subtotal"}</span>
              <strong>${subtotalAmount.toFixed(2)}</strong>
            </div>
            <div style={pricingSummaryTotalRow}>
              <span>{isSpanish ? "Total" : "Total"}</span>
              <strong>${calculatedTotal.toFixed(2)}</strong>
            </div>
          </div>

          <label style={label}>{isSpanish ? "Tiempo estimado" : "Estimated Timeline"}</label>
          <input style={input} value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="1–2 days" />

          <label style={label}>{isSpanish ? "Notas" : "Notes"}</label>
          <textarea style={textarea} value={notes} onChange={(e) => setNotes(e.target.value)} />

          <label style={label}>{isSpanish ? "Términos" : "Terms"}</label>
          <textarea
            style={textarea}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder={
              isSpanish
                ? "Depósito, vigencia, exclusiones o condiciones."
                : "Deposit, expiration, exclusions, or conditions."
            }
          />

	          <label style={label}>{isSpanish ? "Anular total manualmente" : "Manual Total Override"}</label>
          <input
            style={{ ...input, fontWeight: "900" }}
            inputMode="decimal"
            value={totalOverride}
            onChange={(e) => setTotalOverride(e.target.value)}
            placeholder={
              subtotalAmount
                ? `$${subtotalAmount.toFixed(2)}`
                : "$0.00"
            }
          />
          <p style={pricingReviewText}>
            {manualTotalAmount !== null
              ? isSpanish
                ? "Total editado manualmente."
                : "Manual total entered."
              : isSpanish
                ? "Si lo dejas vacío, Meetro usa partidas + mano de obra + materiales menos descuento más impuesto."
                : "Leave blank to use line items + labor + materials minus discount plus tax."}
          </p>

          {!calculatedTotal && (
            <p style={pricingReviewText}>{t("addPricingBeforeSendingQuote")}</p>
          )}

          <div style={inlineActionGrid}>
            <button
              style={secondaryActionButton}
              onClick={() => setQuotePreviewOpen((isOpen) => !isOpen)}
            >
              {quotePreviewOpen
                ? isSpanish
                  ? "Ocultar vista previa"
                  : "Hide Preview"
                : isSpanish
                ? "Vista previa"
                : "Preview Quote"}
            </button>
            <button style={secondaryActionButton} onClick={copyQuoteSummary}>
              {isSpanish ? "Copiar resumen" : "Copy Summary"}
            </button>
            <button style={secondaryActionButton} onClick={() => void exportQuickQuotePdf()}>
              {getCustomerDocumentActionCopy(language).exportPdf}
            </button>
            <button style={secondaryActionButton} onClick={() => void shareQuickQuotePdf()}>
              {getCustomerDocumentActionCopy(language).sharePdf}
            </button>
          </div>

          {copiedNotice && <p style={externalShareHint}>{copiedNotice}</p>}

          {quotePreviewOpen && (
            <pre style={quotePreviewBox}>{buildQuoteShareText()}</pre>
          )}

        </div>
      </div>
        </section>
      )}

      <BottomNav
        setPage={setPage}
        currentPage={
          isDesktopSidebarQuickQuote
            ? "quoteBuilder"
            : isWorkCenterReturn
            ? "workCenter"
            : isBusinessToolsReturn
            ? "businessDashboard"
            : "businessLeads"
        }
      />
    </div>
  );
}

function EstimateAssistantResult({ result, language, onSolutionReady, onUseQuote, onDismiss }) {
  const copy = getAskMeetroWorkflowCopy(language);
  const proposal = result.proposal;
  const [editingQuote, setEditingQuote] = useState(false);
  const [quoteEdits, setQuoteEdits] = useState({});
  const formatMoney = (minor) => new Intl.NumberFormat(language, {
    style: "currency", currency: "USD",
  }).format((Number(minor) || 0) / 100);
  if (result.operation === INTELLIGENCE_OPERATION.QUOTE) {
    return (
      <div style={assistantResultBox}>
        <strong>{proposal.summary}</strong>
        {proposal.proposedScopeItems.map((item) => {
          const candidate = quoteEdits[item.id] || item.canonicalCandidate;
          return (
            <article key={item.id} style={assistantDraftItem}>
              {editingQuote && candidate ? (
                <>
                  <label style={label}>{copy.suggested}
                    <textarea style={textarea} value={candidate.description} onChange={(event) => setQuoteEdits((current) => ({
                      ...current,
                      [item.id]: { ...candidate, description: event.target.value },
                    }))} />
                  </label>
                  <label style={label}>{copy.price}
                    <input style={input} inputMode="decimal" value={candidate.unitAmountMinor / 100} onChange={(event) => {
                      const minor = Math.round(parseQuotePricingAmount(event.target.value) * 100);
                      setQuoteEdits((current) => ({ ...current, [item.id]: { ...candidate, unitAmountMinor: minor } }));
                    }} />
                  </label>
                </>
              ) : (
                <strong>{item.description}</strong>
              )}
              <span>{item.scopeSemantic.replaceAll("_", " ")}</span>
              <span>{candidate ? formatMoney(candidate.unitAmountMinor * candidate.quantity) : copy.needsVerification}</span>
            </article>
          );
        })}
        {proposal.commercialMissingInformation.map((item) => <p key={item.id} style={pricingReviewText}>{item.description}</p>)}
        <div style={inlineActionGrid}>
          <button type="button" style={secondaryActionButton} onClick={() => onUseQuote(editingQuote ? quoteEdits : null)}>{copy.createQuote}</button>
          <button type="button" style={quietActionButton} onClick={() => setEditingQuote(true)}>{copy.edit}</button>
          <button type="button" style={quietActionButton} onClick={onDismiss}>{copy.dismiss}</button>
        </div>
      </div>
    );
  }
  const professionalCategoryCosts = proposal.professionalCategoryCosts || {};
  const professionalMaterialsTotal = professionalCategoryCosts.materials;
  const professionalLaborTotal = professionalCategoryCosts.labor;
  const hasProfessionalCategoryCosts = Boolean(
    professionalMaterialsTotal || professionalLaborTotal
  );
  return (
    <div style={assistantResultBox}>
      <strong>{proposal.summary}</strong>
      {professionalMaterialsTotal ? (
        <section style={assistantDraftItem}>
          <strong>{copy.materials}</strong>
          <span>{copy.professionalMaterialsTotal}</span>
          <strong>{formatMoney(professionalMaterialsTotal.amountMinor)}</strong>
          <small>{copy.materialsNotItemized}</small>
        </section>
      ) : null}
      {professionalLaborTotal ? (
        <section style={assistantDraftItem}>
          <strong>{copy.labor}</strong>
          <span>{copy.professionalLaborTotal}</span>
          <strong>{formatMoney(professionalLaborTotal.amountMinor)}</strong>
          <small>{copy.laborNotItemized}</small>
        </section>
      ) : null}
      {!professionalMaterialsTotal && proposal.materials.map((item) => (
        <article key={item.id} style={assistantDraftItem}>
          <strong>{item.description}</strong>
          <span>{item.quantity} {item.unit}</span>
          <span>{item.effectiveUnitCostMinor == null ? copy.needsVerification : formatMoney(item.effectiveUnitCostMinor)}</span>
          {item.retailerReference && <small>{copy.referencePrice} · {copy.notGuaranteed}</small>}
        </article>
      ))}
      {professionalMaterialsTotal && proposal.materials.length ? (
        <details style={assistantDraftItem}>
          <summary>{copy.advisoryMaterialSuggestions}</summary>
          {proposal.materials.map((item) => (
            <p key={item.id} style={pricingReviewText}>{item.description}</p>
          ))}
        </details>
      ) : null}
      {!professionalLaborTotal && proposal.labor.map((item) => (
        <article key={item.id} style={assistantDraftItem}>
          <strong>{item.description}</strong>
          <span>{item.crewCount} × {item.hoursPerWorker}</span>
        </article>
      ))}
      {professionalLaborTotal && proposal.labor.length ? (
        <details style={assistantDraftItem}>
          <summary>{copy.advisoryLaborSuggestions}</summary>
          {proposal.labor.map((item) => (
            <p key={item.id} style={pricingReviewText}>{item.description}</p>
          ))}
        </details>
      ) : null}
      <section style={assistantDraftItem}>
        <strong>{copy.internalCostSummary}</strong>
        <div style={assistantCostGrid}>
          <span>{copy.materials}</span>
          <strong>{formatMoney(proposal.internalCost.materialsMinor)}</strong>
          <span>{copy.labor}</span>
          <strong>{formatMoney(proposal.internalCost.laborMinor)}</strong>
          {hasProfessionalCategoryCosts ? (
            <>
              <span>{copy.internalBaseTotal}</span>
              <strong>{formatMoney(proposal.internalCost.baseTotalMinor)}</strong>
            </>
          ) : null}
          {proposal.internalCost.contingencyMinor > 0 ? (
            <>
              <span>{copy.advisoryContingency}</span>
              <strong>{formatMoney(proposal.internalCost.contingencyMinor)}</strong>
            </>
          ) : null}
          {!hasProfessionalCategoryCosts || proposal.internalCost.contingencyMinor > 0 ? (
            <>
              <span>{copy.total}</span>
              <strong>{formatMoney(proposal.internalCost.totalMinor)}</strong>
            </>
          ) : null}
        </div>
        <small>{copy.internalOnly}</small>
        <small>{copy.customerQuotePricingSeparate}</small>
      </section>
      <p style={pricingReviewText}>{proposal.customerQuoteDraft.customerWording}</p>
      <div style={inlineActionGrid}>
        <button type="button" style={secondaryActionButton} onClick={onSolutionReady}>{copy.solutionReady}</button>
        <button type="button" style={quietActionButton} onClick={onDismiss}>{copy.dismiss}</button>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100dvh",
  background:
    "linear-gradient(180deg, var(--meetro-surface-warm, #fbf6ed), var(--meetro-surface-sage, #eef4ea))",
  padding:
    "max(24px, calc(env(safe-area-inset-top, 0px) + 18px)) max(18px, env(safe-area-inset-right, 0px)) calc(104px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "900px",
  margin: "0 auto",
  overflowX: "hidden",
};

const backButton = {
  border: "none",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "12px 16px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "18px",
};

const evaluationBackButton = {
  ...backButton,
  marginTop: "-8px",
  marginBottom: "14px",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
};

const hero = {
  background:
    "linear-gradient(135deg, var(--meetro-color-forest-deep, #14351f), var(--meetro-color-forest, #1f4d34))",
  color: "white",
  borderRadius: "30px",
  padding: "28px 24px",
  marginBottom: "20px",
  boxShadow: "var(--meetro-shadow-lifted, 0 24px 70px rgba(49,35,20,0.14))",
};

const revisionBanner = {
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.25)",
  padding: "12px 14px",
  borderRadius: "14px",
  marginBottom: "16px",
  fontWeight: "800",
  fontSize: "14px",
  backdropFilter: "blur(8px)",
};

const eyebrow = { margin: 0, fontWeight: "900", opacity: 0.9 };
const title = {
  margin: "10px auto",
  fontSize: "clamp(24px, 7vw, 32px)",
  lineHeight: 1.08,
  letterSpacing: "-0.04em",
  maxWidth: "100%",
  overflowWrap: "break-word",
  wordBreak: "break-word",
};
const subtitle = {
  margin: 0,
  lineHeight: 1.45,
  opacity: 0.95,
  fontSize: "15px",
  overflowWrap: "break-word",
};

const grid = {
  display: "grid",
  gap: "20px",
};

const card = {
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  borderRadius: "26px",
  padding: "20px",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49,35,20,0.08))",
  boxSizing: "border-box",
  maxWidth: "100%",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
};

const proposalCard = {
  ...card,
  border: "1px solid rgba(31,77,52,0.16)",
  background:
    "linear-gradient(180deg, var(--meetro-surface-paper, rgba(255,253,248,0.98)), var(--meetro-surface-warm, rgba(251,246,237,0.92)))",
};

const proposalHint = {
  margin: "0 0 12px",
  color: "#64748b",
  fontSize: "14px",
  fontWeight: "750",
  lineHeight: 1.45,
};

const proposalTextarea = {
  width: "100%",
  minHeight: "150px",
  border: "1px solid #ddd6fe",
  borderRadius: "18px",
  padding: "14px",
  color: "#0f172a",
  background: "#ffffff",
  fontSize: "15px",
  fontWeight: "750",
  lineHeight: 1.45,
  resize: "vertical",
  boxSizing: "border-box",
};

const sectionTitle = {
  marginTop: 0,
  color: "#111827",
  fontWeight: "950",
  lineHeight: 1.15,
};

const sectionHelperText = {
  margin: "4px 0 14px",
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const label = {
  display: "block",
  marginTop: "12px",
  marginBottom: "6px",
  color: "#111827",
  fontWeight: "900",
  minWidth: 0,
  maxWidth: "100%",
  lineHeight: 1.2,
  overflowWrap: "break-word",
  wordBreak: "normal",
  hyphens: "none",
};

const compactLabel = {
  ...label,
  marginTop: 0,
};

const value = {
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.5,
};

const compactFieldGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "10px",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const compactSectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
};

const eyebrowDark = {
  margin: 0,
  color: "var(--meetro-color-coffee, #4a3428)",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const smallStatusPill = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  borderRadius: "999px",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "950",
};

const evaluationSummaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
  marginTop: "12px",
};

const evaluationSummaryTile = {
  display: "grid",
  gap: "2px",
  padding: "10px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "12px",
  fontWeight: "850",
};

const evaluationSummaryText = {
  margin: "12px 0 0",
  color: "#334155",
  fontSize: "14px",
  fontWeight: "750",
  lineHeight: 1.4,
};

const evaluationDetailsDisclosure = {
  marginTop: "12px",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "10px",
};

const evaluationDetailsSummary = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "950",
  cursor: "pointer",
  minHeight: "44px",
  display: "flex",
  alignItems: "center",
};

const importedEvaluationList = {
  display: "grid",
  gap: "12px",
  marginTop: "12px",
};

const importedWorkItemCard = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const importedWorkItemTop = {
  display: "grid",
  gap: "8px",
};

const importedWorkItemTitle = {
  color: "#0f172a",
  fontSize: "18px",
  lineHeight: 1.15,
};

const importedFieldText = {
  margin: 0,
  color: "#475569",
  fontSize: "14px",
  fontWeight: "750",
  lineHeight: 1.45,
};

const cleanList = {
  margin: 0,
  paddingLeft: "18px",
  color: "#475569",
  fontSize: "14px",
  fontWeight: "750",
  lineHeight: 1.55,
};

const photoCountPill = {
  width: "fit-content",
  borderRadius: "999px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  color: "#475569",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const input = {
  width: "100%",
  minWidth: 0,
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #dbeafe",
  fontSize: "16px",
  boxSizing: "border-box",
};

const selectInput = {
  ...input,
  minHeight: "48px",
  background: "#ffffff",
};

const textarea = {
  ...input,
  minHeight: "110px",
  resize: "vertical",
};

const quoteBuilderSection = {
  display: "grid",
  gap: "12px",
  marginTop: "18px",
  maxWidth: "100%",
};

const quoteBuilderSectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "16px",
  fontWeight: "950",
};

const editableRowCard = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",
  maxWidth: "100%",
  boxShadow: "0 8px 18px rgba(15,23,42,0.04)",
};

const materialCompactLine = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  padding: "9px 10px",
  borderRadius: "12px",
  background: "#f8fafc",
  color: "#475569",
  fontSize: "13px",
  fontWeight: "850",
};

const rowDetails = {
  display: "grid",
  gap: "8px",
};

const rowDetailsSummary = {
  minHeight: "40px",
  display: "flex",
  alignItems: "center",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "900",
  cursor: "pointer",
};

const rowGridThree = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 118px), 1fr))",
  gap: "8px",
  maxWidth: "100%",
};

const rowGridTwo = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: "10px",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const inlineActionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "10px",
  marginTop: "10px",
  maxWidth: "100%",
};

const secondaryActionButton = {
  minHeight: "44px",
  border: "1px solid rgba(31,77,52,0.22)",
  background: "#ffffff",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const quietActionButton = {
  ...secondaryActionButton,
  color: "#475569",
  border: "1px solid #cbd5e1",
};

const assistantResultBox = {
  display: "grid",
  gap: "12px",
  minWidth: 0,
};

const assistantDraftItem = {
  display: "grid",
  gap: "5px",
  minWidth: 0,
  padding: "12px",
  border: "1px solid #d7ded8",
  borderRadius: "6px",
  background: "#ffffff",
  overflowWrap: "anywhere",
};

const assistantCostGrid = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: "10px",
  padding: "12px",
  border: "1px solid #8fa297",
  borderRadius: "6px",
  background: "#f5f8f5",
};

const rowRemoveButton = {
  border: "none",
  background: "#f8fafc",
  color: "#64748b",
  borderRadius: "12px",
  padding: "10px",
  fontWeight: "850",
  cursor: "pointer",
};

const quotePreviewBox = {
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

const externalShareHint = {
  margin: "10px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.4,
  textAlign: "center",
};

const pricingReviewText = {
  margin: "8px 0 0",
  color: "#9a3412",
  background: "#fff7ed",
  border: "1px solid rgba(249,115,22,0.22)",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: 1.35,
};

const pricingSummaryBox = {
  marginTop: "14px",
  display: "grid",
  gap: "8px",
  padding: "12px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const pricingSummaryRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  color: "#475569",
  fontSize: "14px",
  fontWeight: "800",
};

const pricingSummaryTotalRow = {
  ...pricingSummaryRow,
  borderTop: "1px solid #cbd5e1",
  paddingTop: "8px",
  color: "#0f172a",
  fontSize: "16px",
  fontWeight: "950",
};

export default QuoteBuilder;
