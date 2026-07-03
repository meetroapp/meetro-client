import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import { getQuoteHistory, saveQuoteHistory } from "../utils/workCenter";
import { updateRequestById, appendTimelineEvent } from "../utils/workflowTimeline";
import { getLanguage, t } from "../utils/language";
import { getProjectIdentity } from "../utils/projectIdentity";
import { linkQuoteToProject } from "../utils/workflowCommands";
import {
  getQuoteLinkIdentityWarnings,
  getQuoteLinkReconciliationReport,
} from "../utils/workCenterSelectors";
import {
  createWorkflowEvent,
  WORKFLOW_EVENT_TYPES,
} from "../utils/workflowEventFactory";
import { compareLegacyToFactoryEvent } from "../utils/workflowEventFactoryAudit";
import { markConversationUnreadForRecipient } from "../utils/conversationUnread";
import { createNotification } from "../utils/meetroNotifications";
import { getWorkCenterContextReturnLabel } from "../utils/workCenterReturnLabels";
import { formatMessageTime } from "../utils/displayTime";
import {
  calculateCustomerTotal,
  normalizeLaborPricingType,
} from "../utils/pricingCalculations";
import { restoreConversationOriginContext } from "../utils/conversationOrigin";
import { getBusinessIdentityProjection } from "../utils/businessIdentity";

function safeJson(value, fallback = null) {
  try {
    return JSON.parse(value || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function parseCurrencyAmount(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const cleaned = text.replace(/[$,\s]/g, "");
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount > 0 ? String(amount) : "";
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findAmountNearLabels(text, labels) {
  const source = String(text || "");
  if (!source.trim()) return "";

  const amountPattern = "(\\$?\\s*\\d[\\d,]*(?:\\.\\d{1,2})?)";

  for (const label of labels) {
    const safeLabel = escapeRegExp(label);
    const afterLabel = new RegExp(
      `(?:${safeLabel})[^\\d$]{0,50}${amountPattern}`,
      "i"
    );
    const beforeLabel = new RegExp(
      `${amountPattern}[^\\n\\r]{0,50}(?:${safeLabel})`,
      "i"
    );

    const afterMatch = source.match(afterLabel);
    if (afterMatch?.[1]) return parseCurrencyAmount(afterMatch[1]);

    const beforeMatch = source.match(beforeLabel);
    if (beforeMatch?.[1]) return parseCurrencyAmount(beforeMatch[1]);
  }

  return "";
}

function findTotalQuoteAmount(text) {
  return findAmountNearLabels(text, [
    "quote",
    "total",
    "estimate",
    "price",
    "bid",
    "cotizacion",
    "cotización",
    "total",
    "precio",
    "estimado",
    "presupuesto",
  ]);
}

function findTimelineFromText(text) {
  const source = String(text || "");
  const match = source.match(
    /\b(\d+\s*(?:-|to|a|–)?\s*\d*\s*(?:day|days|week|weeks|hour|hours|día|días|semana|semanas|hora|horas))\b/i
  );

  return match?.[1]?.trim() || "";
}

function cleanText(value) {
  return String(value || "").trim();
}

function isGenericQuoteText(value) {
  const text = cleanText(value).toLowerCase();
  return !text || ["project", "request", "service", "quote"].includes(text);
}

function firstSpecificText(...values) {
  return values.map(cleanText).find((value) => !isGenericQuoteText(value)) || "";
}

function getQuotePhotoImageData(photo = {}) {
  return cleanText(
    photo.dataUrl ||
      photo.previewUrl ||
      photo.imageUrl ||
      photo.photoUrl ||
      photo.url ||
      photo.src
  );
}

function hasRenderableQuotePhoto(photo = {}) {
  const imageData = getQuotePhotoImageData(photo);
  return /^data:image\/(png|jpe?g);base64,/i.test(imageData);
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

function QuoteBuilder({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";
  const quoteBuilderReturnPage =
    localStorage.getItem("quoteBuilderReturnPage") || "";
  const isWorkCenterReturn =
    quoteBuilderReturnPage === "workCenter" ||
    quoteBuilderReturnPage === "contractorDashboard";
  const isBusinessToolsReturn =
    quoteBuilderReturnPage === "businessCommandCenter";
  const isUniversalQuickQuote =
    isBusinessToolsReturn &&
    localStorage.getItem("quoteBuilderSource") === "business_tools_quick_quote";
  const workCenterReturnCustomer =
    localStorage.getItem("workCenterReturnCustomer") || "";

  const revisedQuoteContext = safeJson(
    localStorage.getItem("meetroRevisedQuoteContext")
  );

  const isRevisedQuoteFlow =
    revisedQuoteContext?.source === "workflow_change_request";

  const selectedWorkCenterRequest = isUniversalQuickQuote
    ? null
    : safeJson(localStorage.getItem("selectedWorkCenterRequest"));

  const selectedQuoteRequest = isUniversalQuickQuote
    ? null
    : safeJson(localStorage.getItem("selectedQuoteRequest"));

  const selectedHomeownerRequest = isUniversalQuickQuote
    ? null
    : safeJson(localStorage.getItem("selectedHomeownerRequest"));

  const selectedConversation = isUniversalQuickQuote
    ? null
    : safeJson(localStorage.getItem("selectedConversation"));

  const selectedQuoteForEdit = safeJson(
    localStorage.getItem("selectedQuoteForEdit")
  );

  const isEditingExistingQuote = Boolean(selectedQuoteForEdit?.quoteId);

  const activeQuoteRequestId =
    localStorage.getItem("activeWorkCenterQuoteRequestId") || "";

  const workCenterRequestId =
    selectedWorkCenterRequest?.requestId ||
    selectedWorkCenterRequest?.id ||
    "";

  const request = isUniversalQuickQuote
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

  const requestId = isUniversalQuickQuote
    ? ""
    : request.requestId ||
      request.id ||
      activeQuoteRequestId ||
      String(Date.now());

  function shadowLinkQuote(quote, action) {
    try {
      const identity = getProjectIdentity({
        projectId: request?.projectId,
        requestId: request?.requestId,
        title: request?.title || request?.projectTitle,
        name: request?.name,
      });

      if (!identity.projectId) {
        console.warn("Work Center shadow quote link skipped.", {
          quoteId: quote?.quoteId || "",
          action,
          warnings: identity.warnings,
        });
        return;
      }

      const shadowResult = linkQuoteToProject({
        projectId: identity.projectId,
        quoteRequestId: request.requestId || "",
        quoteId: quote?.quoteId || "",
        metadata: {
          action,
          source: quote?.source || "quote-builder",
        },
      });

      if (!shadowResult.ok || shadowResult.warnings.length > 0) {
        console.warn("Work Center shadow quote link warning.", shadowResult);
      }

      if (shadowResult.ok && import.meta.env.DEV) {
        try {
          const reconciliation = getQuoteLinkReconciliationReport();
          const identityWarnings = getQuoteLinkIdentityWarnings();
          const commonIdentityWarnings = Object.entries(
            identityWarnings.reasonCounts
          )
            .sort(([, firstCount], [, secondCount]) =>
              secondCount - firstCount
            )
            .slice(0, 5)
            .map(([code, count]) => ({ code, count }));

          console.info("Work Center quote link reconciliation.", {
            quoteCount: reconciliation.quoteCount,
            uniqueLinkedQuoteCount: reconciliation.uniqueLinkedQuoteCount,
            missingLinkCount: reconciliation.missingLinkCount,
            safeIdentityMissingLinkCount:
              reconciliation.safeIdentityMissingLinkCount,
            coveragePercentage: reconciliation.coveragePercentage,
            commonIdentityWarnings,
          });
        } catch (error) {
          console.warn(
            "Work Center quote reconciliation logging failed.",
            error
          );
        }
      }
    } catch (error) {
      console.warn("Work Center shadow quote link failed.", error);
    }
  }

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
      new Date().toISOString().slice(0, 10)
  );
  const [quoteSentInfo, setQuoteSentInfo] = useState(null);
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
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiSuggestionTarget, setAiSuggestionTarget] = useState("recommendedSolution");

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
    document.body.classList.add("meetro-quote-builder-open");

    return () => {
      document.body.classList.remove("meetro-quote-builder-open");
    };
  }, []);

  function generateAiDraft() {
    runAiQuoteHelp("improve");
  }

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

  function getMissingQuoteDetails() {
    const hasLineItem = lineItems.some((item) => cleanText(item.description));
    const hasMaterialsOrLabor =
      materialRows.some((item) => cleanText(item.name) || getEditableRowTotal(item, "quantity", "cost") > 0) ||
      laborRows.some((item) => cleanText(item.description) || getEditableRowTotal(item, "hours", "rate") > 0);

    return [
      !cleanText(customerName) ? (isSpanish ? "nombre del cliente" : "customer name") : "",
      !cleanText(problemFound) ? (isSpanish ? "problema encontrado" : "problem found") : "",
      !cleanText(recommendedSolution) ? (isSpanish ? "solución recomendada" : "recommended solution") : "",
      !hasLineItem ? (isSpanish ? "partidas de servicio" : "line items") : "",
      !hasMaterialsOrLabor ? (isSpanish ? "mano de obra o materiales" : "labor or materials") : "",
      calculatedTotal <= 0 ? (isSpanish ? "total del precio" : "price total") : "",
      !cleanText(terms) ? (isSpanish ? "términos de pago" : "payment terms") : "",
    ].filter(Boolean);
  }

  function runAiQuoteHelp(action) {
    const missingDetails = getMissingQuoteDetails();
    const scopeName = cleanText(projectTitle) || (isSpanish ? "este servicio" : "this service");
    const problemText = cleanText(problemFound || projectDescription);

    if (action === "missing") {
      setAiSuggestionTarget("notes");
      setAiSuggestion(
        missingDetails.length
          ? isSpanish
            ? `Esta cotización puede necesitar ${missingDetails.join(", ")} antes de compartirla.`
            : `This quote may need ${missingDetails.join(", ")} before sharing.`
          : isSpanish
          ? "Esta cotización tiene los detalles principales. Revisa precios, alcance y términos antes de compartir."
          : "This quote has the main details. Review pricing, scope, and terms before sharing."
      );
      return;
    }

    if (action === "lineItems") {
      setAiSuggestionTarget("notes");
      setAiSuggestion(
        isSpanish
          ? `Sugerencias de descripciones de partidas para revisar:\n- Evaluación y preparación para ${scopeName}\n- Mano de obra para completar el alcance aprobado\n- Materiales confirmados por el profesional\n- Limpieza y revisión final`
          : `Line item wording to review:\n- Evaluation and preparation for ${scopeName}\n- Labor to complete the approved scope\n- Professional-confirmed materials\n- Cleanup and final review`
      );
      return;
    }

    if (action === "terms") {
      setAiSuggestionTarget("terms");
      setAiSuggestion(
        isSpanish
          ? "El precio final depende de condiciones accesibles al momento del trabajo. Los cambios de alcance, materiales no incluidos o condiciones ocultas pueden requerir aprobación adicional por escrito."
          : "Final pricing depends on accessible conditions at the time of work. Scope changes, excluded materials, or hidden conditions may require additional written approval."
      );
      return;
    }

    setAiSuggestionTarget("recommendedSolution");
    setAiSuggestion(
      isSpanish
        ? `Después de revisar ${scopeName}, recomendamos completar el alcance descrito con materiales confirmados y mano de obra profesional. ${problemText ? `El problema principal identificado fue: ${problemText}. ` : ""}Antes de comenzar, el profesional confirmará acceso, medidas y cualquier condición que afecte el trabajo.`
        : `After reviewing ${scopeName}, we recommend completing the described scope with confirmed materials and professional labor. ${problemText ? `The main issue identified was: ${problemText}. ` : ""}Before work begins, the professional will confirm access, measurements, and any conditions that affect the job.`
    );
  }

  function applyAiSuggestion() {
    if (!aiSuggestion.trim()) return;

    if (aiSuggestionTarget === "terms") {
      setTerms(aiSuggestion);
      return;
    }

    if (aiSuggestionTarget === "notes") {
      setNotes((currentNotes) =>
        [currentNotes, aiSuggestion].map(cleanText).filter(Boolean).join("\n\n")
      );
      return;
    }

    setRecommendedSolution(aiSuggestion);
  }

  function firstText(...values) {
    return values
      .map((value) => String(value || "").trim())
      .find(Boolean) || "";
  }

  function readConversationRegistry() {
    try {
      const registry = JSON.parse(
        localStorage.getItem("meetro_conversation_registry") || "[]"
      );

      return Array.isArray(registry) ? registry : [];
    } catch {
      return [];
    }
  }

  function getRegistryConversationMatch() {
    const registry = readConversationRegistry();
    const candidateIds = new Set(
      [
        requestId,
        activeQuoteRequestId,
        localStorage.getItem("selectedQuoteRequestId"),
        localStorage.getItem("selectedHomeownerRequestId"),
        request.requestId,
        request.id,
        selectedWorkCenterRequest?.requestId,
        selectedWorkCenterRequest?.id,
        selectedQuoteRequest?.requestId,
        selectedQuoteRequest?.id,
        selectedHomeownerRequest?.requestId,
        selectedHomeownerRequest?.id,
        selectedConversation?.conversationId,
        selectedConversation?.id,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    );

    const candidateTitles = [
      projectTitle,
      request.title,
      request.projectTitle,
      selectedWorkCenterRequest?.title,
      selectedQuoteRequest?.title,
      selectedHomeownerRequest?.title,
      selectedConversation?.projectTitle,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);

    const candidateContacts = [
      request.homeownerName,
      request.homeowner_email,
      request.customerName,
      request.customer,
      selectedWorkCenterRequest?.homeownerName,
      selectedWorkCenterRequest?.homeowner_email,
      selectedQuoteRequest?.homeownerName,
      selectedQuoteRequest?.homeowner_email,
      selectedHomeownerRequest?.homeownerName,
      selectedHomeownerRequest?.homeowner_email,
      selectedConversation?.homeownerName,
      selectedConversation?.businessName,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);

    return registry.find((item) => {
      const id = String(item.id || item.conversationId || "").trim();

      if (id && candidateIds.has(id)) return true;

      const title = String(item.project_title || item.projectTitle || "").toLowerCase();
      const contact = String(
        item.homeowner_email || item.customer || item.name || ""
      ).toLowerCase();

      return (
        (title && candidateTitles.includes(title)) ||
        (contact && candidateContacts.includes(contact))
      );
    });
  }

  function hasMeetroQuoteContext() {
    return Boolean(
      revisedQuoteContext ||
        selectedQuoteForEdit ||
        selectedWorkCenterRequest ||
        selectedQuoteRequest ||
        selectedHomeownerRequest ||
        selectedConversation ||
        localStorage.getItem("activeConversationId") ||
        localStorage.getItem("selectedHomeownerRequestId") ||
        localStorage.getItem("selectedQuoteRequestId") ||
        activeQuoteRequestId ||
        isWorkCenterReturn ||
        quoteBuilderReturnPage === "businessLeads"
    );
  }

  function getQuoteConversationId() {
    if (isUniversalQuickQuote) return "";

    const explicitConversationId = firstText(
      revisedQuoteContext?.conversationId ||
        revisedQuoteContext?.projectConversationId,
      request.conversationId,
      request.conversation_id,
      request.projectConversationId,
      request.activeConversationId,
      selectedQuoteForEdit?.conversationId,
      selectedQuoteForEdit?.projectConversationId,
      selectedWorkCenterRequest?.conversationId,
      selectedWorkCenterRequest?.projectConversationId,
      selectedQuoteRequest?.conversationId,
      selectedQuoteRequest?.projectConversationId,
      selectedHomeownerRequest?.conversationId,
      selectedHomeownerRequest?.projectConversationId,
      selectedConversation?.conversationId,
      selectedConversation?.id,
      localStorage.getItem("activeConversationId")
    );

    if (explicitConversationId) return explicitConversationId;

    const registryMatch = getRegistryConversationMatch();
    const registryConversationId = firstText(
      registryMatch?.id,
      registryMatch?.conversationId
    );

    if (registryConversationId) return registryConversationId;

    if (!hasMeetroQuoteContext()) return "";

    return firstText(
      request.requestId,
      request.id,
      activeQuoteRequestId,
      localStorage.getItem("selectedQuoteRequestId"),
      localStorage.getItem("selectedHomeownerRequestId"),
      selectedWorkCenterRequest?.requestId,
      selectedWorkCenterRequest?.id,
      selectedQuoteRequest?.requestId,
      selectedQuoteRequest?.id,
      selectedHomeownerRequest?.requestId,
      selectedHomeownerRequest?.id
    );
  }

  const canSendThroughMeetroChat = Boolean(getQuoteConversationId());

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
	      laborPricingType,
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
      .filter((item) => cleanText(item.description))
      .map(
        (item) =>
          `- ${item.description}: ${item.quantity || "—"} × ${item.unitPrice || "—"} = $${Number(item.total || 0).toFixed(2)}`
      )
      .join("\n");
    const materialLines = pricing.materialItems
      .filter((item) => cleanText(item.name))
      .map(
        (item) =>
          `- ${item.name}: ${item.quantity || "—"} × ${item.cost || "—"} = $${Number(item.total || 0).toFixed(2)}${item.notes ? ` (${item.notes})` : ""}`
      )
      .join("\n");
    const laborLines = pricing.laborItems
      .filter((item) => cleanText(item.description))
      .map(
        (item) =>
          `- ${item.description}: ${item.hours || "—"} hrs × ${item.rate || "—"} = $${Number(item.total || 0).toFixed(2)}`
      )
      .join("\n");

    return `${isSpanish ? "Cotización" : "Quote"}: ${projectTitle}

${isSpanish ? "Cliente" : "Customer"}: ${customerName || "—"}
${isSpanish ? "Ubicación" : "Location"}: ${customerLocation || "—"}
${isSpanish ? "Fecha" : "Date"}: ${quoteDate || "—"}
${isSpanish ? "Tipo / prioridad" : "Type / Priority"}: ${proposalType === "Custom" ? customProposalType || proposalType : proposalType} · ${priority}
${isSpanish ? "Partidas" : "Line Items"}:
${serviceLines || "—"}

${isSpanish ? "Mano de obra" : "Labor"}: $${pricing.laborAmount.toFixed(2)}
${laborLines || ""}
${isSpanish ? "Materiales" : "Materials"}: $${pricing.materialsAmount.toFixed(2)}
${materialLines || ""}
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

  async function shareExternalQuote() {
    const pricing = getCurrentPricingPayload();
    const amount = pricing.totalAmount;

    if (!amount || amount <= 0) {
      alert(t("reviewAddPricingBeforeSending"));
      return;
    }

    const businessIdentity = getBusinessIdentityProjection({}, {
      fallbackName: "Meetro Professional",
    });
    const businessName = businessIdentity.businessName;

    const finalQuoteNumber =
      quoteNumber.trim() || `Q-${Date.now().toString().slice(-6)}`;

    localStorage.setItem("lastManualQuoteNumber", finalQuoteNumber);

    const today = new Date().toLocaleDateString();

    const doc = new jsPDF();

    let y = 54;
    const left = 14;
    const right = 196;
    const width = 170;
    const pageBottom = 280;

    const ensureSpace = (height = 18) => {
      if (y + height <= pageBottom) return;
      doc.addPage();
      y = 18;
    };

    const addHeading = (text) => {
      ensureSpace(14);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.setFont(undefined, "bold");
      doc.text(text, left, y);
      y += 8;
    };

    const addParagraph = (text, options = {}) => {
      const value = cleanText(text) || "—";
      const lines = doc.splitTextToSize(value, options.width || width);
      ensureSpace(lines.length * 5 + 5);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(options.fontSize || 10);
      doc.setFont(undefined, options.bold ? "bold" : "normal");
      doc.text(lines, options.x || left, y);
      y += lines.length * 5 + 4;
    };

    const addKeyValue = (key, value) => {
      ensureSpace(7);
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont(undefined, "bold");
      doc.text(`${key}:`, left, y);
      doc.setFont(undefined, "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(doc.splitTextToSize(cleanText(value) || "—", 126), left + 38, y);
      y += 7;
    };

    const addBullet = (text) => {
      const value = cleanText(text);
      if (!value) return;
      const lines = doc.splitTextToSize(`• ${value}`, width);
      ensureSpace(lines.length * 5 + 3);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(lines, left + 4, y);
      y += lines.length * 5 + 2;
    };

    const addPhotos = (photos = []) => {
      if (!photos.length) return 0;
      addParagraph(isSpanish ? "Fotos" : "Photos", { bold: true });
      const usablePhotos = photos.filter(hasRenderableQuotePhoto);

      if (usablePhotos.length === 0) {
        addParagraph(
          isSpanish
            ? "Foto documentada durante la evaluación."
            : "Photo documented during evaluation."
        );
        return 0;
      }

      const thumbSize = 34;
      const gap = 6;
      let x = left;
      let renderedCount = 0;

      usablePhotos.slice(0, 6).forEach((photo) => {
        ensureSpace(thumbSize + 8);
        try {
          const imageData = getQuotePhotoImageData(photo);
          const format = String(imageData).includes("image/png") ? "PNG" : "JPEG";
          doc.addImage(imageData, format, x, y, thumbSize, thumbSize);
          renderedCount += 1;
          x += thumbSize + gap;
          if (x + thumbSize > right) {
            x = left;
            y += thumbSize + gap;
          }
        } catch (error) {
          console.warn("Quote PDF photo skipped.", {
            photoId: photo.id || "",
            errorName: error?.name || "Error",
          });
        }
      });

      if (renderedCount > 0 && x !== left) y += thumbSize + gap;
      if (renderedCount === 0) {
        addParagraph(
          isSpanish
            ? "Foto documentada durante la evaluación."
            : "Photo documented during evaluation."
        );
      }

      return renderedCount;
    };

    const addPricingSummary = () => {
      ensureSpace(56);
      addHeading(isSpanish ? "Resumen del estimado" : "Estimate Summary");
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(left, y - 3, right - left, 42, 4, 4, "F");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(isSpanish ? "Mano de obra" : "Labor", left + 6, y + 7);
      doc.text(`$${pricing.laborAmount.toFixed(2)}`, right - 6, y + 7, { align: "right" });
      doc.text(isSpanish ? "Materiales" : "Materials", left + 6, y + 18);
      doc.text(`$${pricing.materialsAmount.toFixed(2)}`, right - 6, y + 18, { align: "right" });
      doc.setDrawColor(203, 213, 225);
      doc.line(left + 6, y + 25, right - 6, y + 25);
      doc.setFont(undefined, "bold");
      doc.text(isSpanish ? "Total del proyecto" : "Project Total", left + 6, y + 35);
      doc.text(`$${amount.toFixed(2)}`, right - 6, y + 35, { align: "right" });
      y += 48;
    };

    doc.setFillColor(32, 24, 95);
    doc.rect(0, 0, 210, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(businessName, left, 16);
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(isSpanish ? "Cotización Profesional" : "Professional Estimate", left, 27);
    doc.setFontSize(10);
    doc.text(`${isSpanish ? "Cotización" : "Quote"} #: ${finalQuoteNumber}`, 142, 16);
    doc.text(`${isSpanish ? "Fecha" : "Date"}: ${today}`, 142, 25);

    addHeading(isSpanish ? "Cliente / Proyecto" : "Customer / Project");
    addKeyValue(isSpanish ? "Proyecto" : "Project", projectTitle);
    addKeyValue(
      isSpanish ? "Cliente" : "Customer",
      customerName || "Customer"
    );

    addHeading(isSpanish ? "Ubicación" : "Location");
    addParagraph(customerLocation || (isSpanish ? "Ubicación pendiente" : "Location pending"));

    addPricingSummary();

    const customerFacingPhotos = importedWorkItems.flatMap((item) => item.photos || []);
    if (customerFacingPhotos.length > 0) {
      addPhotos(customerFacingPhotos);
    }

    addHeading(isSpanish ? "Problema encontrado" : "Problem Found");
    addParagraph(problemFound);

    addHeading(isSpanish ? "Solución recomendada" : "Recommended Solution");
    addParagraph(recommendedSolution || defaultRecommendedSolution);

    addHeading(isSpanish ? "Alcance del trabajo" : "Scope of Work");
    if (importedWorkItems.length > 0) {
      importedWorkItems.forEach((item) => addBullet(item.title));
    } else {
      addParagraph(projectDescription || "No description added.");
    }

    addHeading(isSpanish ? "Siguiente paso" : "Next Step");
    addParagraph(
      isSpanish
        ? "Si apruebas este estimado, el trabajo puede programarse y los materiales pueden prepararse."
        : "If you approve this estimate, work can be scheduled and materials can be ordered."
    );

    const hasSupportingDetails =
      importedWorkItems.some(
        (item) =>
          item.measurements.length > 0 ||
          item.materials.length > 0 ||
          item.safetyNotes ||
          item.notes
      ) || importedMaterials.length > 0 || notes;

    if (hasSupportingDetails) {
      doc.addPage();
      y = 18;
      addHeading(isSpanish ? "Detalles del proyecto" : "Project Details");

      importedWorkItems.forEach((item, index) => {
        addParagraph(`${index + 1}. ${item.title}`, { bold: true });
        if (item.notes && item.notes !== problemFound) {
          addParagraph(isSpanish ? "Notas adicionales" : "Additional Notes", { bold: true });
          addParagraph(item.notes);
        }
        if (item.measurements.length > 0) {
          addParagraph(isSpanish ? "Medidas" : "Measurements", { bold: true });
          item.measurements.forEach(addBullet);
        }
        if (item.materials.length > 0) {
          addParagraph(isSpanish ? "Materiales" : "Materials", { bold: true });
          item.materials.forEach((material) => {
            addParagraph(material.name || (isSpanish ? "Material" : "Material"), {
              bold: true,
            });
            if (material.quantity) addBullet(`${isSpanish ? "Cantidad" : "Qty"}: ${material.quantity}`);
            if (parseOptionalQuoteAmount(material.unitPrice) !== null) {
              addBullet(
                `${isSpanish ? "Precio unitario" : "Unit Price"}: $${parseOptionalQuoteAmount(material.unitPrice).toFixed(2)}`
              );
            }
            if (getQuoteMaterialLineTotal(material) !== null) {
              addBullet(
                `${isSpanish ? "Total de línea" : "Line Total"}: $${getQuoteMaterialLineTotal(material).toFixed(2)}`
              );
            }
            if (material.provider) addBullet(`${isSpanish ? "Proveedor" : "Provider"}: ${material.provider}`);
            if (material.notes) addBullet(material.notes);
          });
        }
        if (item.safetyNotes) {
          addParagraph(isSpanish ? "Notas de seguridad / acceso" : "Safety / Access Notes", {
            bold: true,
          });
          addParagraph(item.safetyNotes);
        }
      });

      if (importedMaterials.length > 0) {
        addParagraph(isSpanish ? "Total de materiales" : "Materials Total", { bold: true });
        addParagraph(`$${pricing.materialsAmount.toFixed(2)}`);
      }

      if (importedMaterials.length > 0 && importedWorkItems.every((item) => item.materials.length === 0)) {
        addHeading(isSpanish ? "Desglose de materiales" : "Materials Breakdown");
        importedMaterials.forEach((material) => {
          addParagraph(material.name || (isSpanish ? "Material" : "Material"), {
            bold: true,
          });
          if (material.quantity) addBullet(`${isSpanish ? "Cantidad" : "Qty"}: ${material.quantity}`);
          if (parseOptionalQuoteAmount(material.unitPrice) !== null) {
            addBullet(
              `${isSpanish ? "Precio unitario" : "Unit Price"}: $${parseOptionalQuoteAmount(material.unitPrice).toFixed(2)}`
            );
          }
          if (getQuoteMaterialLineTotal(material) !== null) {
            addBullet(
              `${isSpanish ? "Total de línea" : "Line Total"}: $${getQuoteMaterialLineTotal(material).toFixed(2)}`
            );
          }
          if (material.provider) addBullet(`${isSpanish ? "Proveedor" : "Provider"}: ${material.provider}`);
          if (material.notes) addBullet(material.notes);
        });
      }

      addHeading(isSpanish ? "Información de referencia" : "Reference Information");
      addParagraph(
        isSpanish
          ? "Estos detalles ayudan a explicar el estimado y se conservan para referencia del trabajo."
          : "These details help explain the estimate and are preserved for job reference."
      );
    }

    addHeading(isSpanish ? "Tiempo estimado" : "Timeline");
    addParagraph(timeline || "—");

    if (notes && notes !== recommendedSolution && notes !== problemFound) {
      addHeading(isSpanish ? "Notas" : "Notes");
      addParagraph(notes);
    }

    if (terms) {
      addHeading(isSpanish ? "Términos" : "Terms");
      addParagraph(terms);
    }

    ensureSpace(10);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      isSpanish ? "Generado por Meetro Community" : "Generated by Meetro Community",
      105,
      290,
      { align: "center" }
    );

    const pdfBlob = doc.output("blob");
    const pdfFile = new File(
      [pdfBlob],
      `${finalQuoteNumber}-${projectTitle || "quote"}.pdf`.replace(/[^a-z0-9-_\.]/gi, "_"),
      { type: "application/pdf" }
    );

    try {
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `${isSpanish ? "Cotización" : "Quote"} - ${projectTitle}`,
          text: isSpanish
            ? "Adjunto la cotización profesional."
            : "Attached is the professional quote.",
          files: [pdfFile],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: `${isSpanish ? "Cotización" : "Quote"} - ${projectTitle}`,
          text: buildQuoteShareText(),
        });
      } else {
        doc.save(pdfFile.name);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        doc.save(pdfFile.name);
      }
    }

    const externalQuote = {
      quoteId: selectedQuoteForEdit?.quoteId || `quote-${Date.now()}`,
      quoteNumber: finalQuoteNumber,
      quoteDate,
      date: quoteDate,
      status: selectedQuoteForEdit?.status || selectedQuoteForEdit?.quoteStatus || "draft",
      quoteStatus: selectedQuoteForEdit?.status || selectedQuoteForEdit?.quoteStatus || "draft",
      manualQuoteNumber: finalQuoteNumber,
      requestId,
      ...quoteContextPayload,
      ...pricing,
      projectTitle,
      title: projectTitle,
      problemFound,
      customerRequest: problemFound,
      homeownerName: customerName || "Homeowner",
      customerName: customerName || "Customer",
      location: customerLocation,
      address: customerLocation,
      businessName,
      timeline,
      recommendedSolution,
      proposalSummary: recommendedSolution,
      notes,
      terms,
      status: "sent",
      source: "external",
      createdAt: new Date().toISOString(),
    };

    const existingExternalHistory = JSON.parse(
      localStorage.getItem("workCenterQuoteHistory") || "[]"
    );

    localStorage.setItem(
      "workCenterQuoteHistory",
      JSON.stringify([
        externalQuote,
        ...existingExternalHistory.filter(
          (savedQuote) =>
            String(savedQuote.quoteId) !== String(externalQuote.quoteId)
        ),
      ])
    );

    shadowLinkQuote(externalQuote, "external_sent");

    localStorage.setItem(
      "meetroGlobalToast",
      JSON.stringify({
        type: "success",
        message: isSpanish ? "Cotización lista para compartir" : "Quote ready to share",
      })
    );
    window.dispatchEvent(new Event("meetro-global-toast"));

    setQuoteSentInfo({
      type: "external",
      quoteNumber: finalQuoteNumber,
      amount,
    });
  }

  function saveDraftQuote() {
    const pricing = getCurrentPricingPayload();
    const finalQuoteNumber =
      quoteNumber.trim() || `DRAFT-${Date.now().toString().slice(-6)}`;

    const amount = pricing.totalAmount;
    const businessIdentity = getBusinessIdentityProjection({}, {
      fallbackName: "Business",
    });

    const draftQuote = {
      quoteId: selectedQuoteForEdit?.quoteId || `quote-${Date.now()}`,
      quoteNumber: finalQuoteNumber,
      quoteDate,
      date: quoteDate,
      manualQuoteNumber: quoteNumber.trim() || finalQuoteNumber,
      requestId,
      ...quoteContextPayload,
      ...pricing,
      projectTitle,
      title: projectTitle,
      problemFound,
      customerRequest: problemFound,
      homeownerName: customerName || "Homeowner",
      customerName: customerName || "Customer",
      location: customerLocation,
      address: customerLocation,
      businessName: businessIdentity.businessName,
      timeline,
      recommendedSolution,
      proposalSummary: recommendedSolution,
      notes,
      terms,
      status: "draft",
      quoteStatus: "draft",
      source: "draft",
      updatedAt: new Date().toISOString(),
      createdAt: selectedQuoteForEdit?.createdAt || new Date().toISOString(),
    };

    const existingHistory = JSON.parse(
      localStorage.getItem("workCenterQuoteHistory") ||
        localStorage.getItem("meetroQuoteHistory") ||
        localStorage.getItem("quoteHistory") ||
        "[]"
    );

    const updatedHistory = [
      draftQuote,
      ...existingHistory.filter(
        (savedQuote) => String(savedQuote.quoteId) !== String(draftQuote.quoteId)
      ),
    ];

    localStorage.setItem("workCenterQuoteHistory", JSON.stringify(updatedHistory));
    localStorage.setItem("meetroQuoteHistory", JSON.stringify(updatedHistory));
    localStorage.setItem("quoteHistory", JSON.stringify(updatedHistory));
    shadowLinkQuote(
      draftQuote,
      isEditingExistingQuote ? "draft_updated" : "draft_created"
    );
    localStorage.removeItem("selectedQuoteForEdit");

    localStorage.setItem(
      "meetroGlobalToast",
      JSON.stringify({
        type: "success",
        message: isSpanish
          ? "Borrador guardado. Puedes terminarlo más tarde."
          : "Draft saved. You can finish it later.",
      })
    );

    window.dispatchEvent(new Event("meetro-global-toast"));

    alert(
      isSpanish
        ? "Borrador guardado. Puedes terminarlo más tarde."
        : "Draft saved. You can finish it later."
    );

    localStorage.setItem("quoteStatusFilter", "draft");

    if (isBusinessToolsReturn) {
      localStorage.removeItem("quoteBuilderReturnPage");
      setPage("businessCommandCenter");
      return;
    }

    localStorage.setItem("meetroWorkCenterTab", "quotes");
    localStorage.setItem("activeWorkCenterTab", "quotes");
    setPage("workCenter");
  }

  function sendQuote() {
    const pricing = getCurrentPricingPayload();
    const amount = pricing.totalAmount;

    const quoteConversationId = getQuoteConversationId();
    const businessIdentity = getBusinessIdentityProjection({}, {
      fallbackName: "Business",
    });

    if (!quoteConversationId) {
      alert(
        isSpanish
          ? "Abre o crea una conversación con el cliente antes de enviar la cotización por Meetro Chat. También puedes compartirla externamente."
          : "Continue or create a customer conversation before sending this quote through Meetro. You can still share it externally."
      );
      return;
    }

    if (!amount || amount <= 0) {
      alert(t("reviewAddPricingBeforeSending"));
      return;
    }

    const quote = {
      quoteId: selectedQuoteForEdit?.quoteId || `quote-${Date.now()}`,
      quoteNumber: quoteNumber.trim() || `Q-${Date.now().toString().slice(-6)}`,
      quoteDate,
      date: quoteDate,
      status: selectedQuoteForEdit?.status || selectedQuoteForEdit?.quoteStatus || "draft",
      quoteStatus: selectedQuoteForEdit?.status || selectedQuoteForEdit?.quoteStatus || "draft",
      manualQuoteNumber: quoteNumber.trim() || "",
      requestId,
      ...quoteContextPayload,
      ...pricing,
      projectTitle,
      title: projectTitle,
      problemFound,
      customerRequest: problemFound,
      homeownerName: customerName || "Homeowner",
      customerName: customerName || "Customer",
      location: customerLocation,
      address: customerLocation,
      businessName: businessIdentity.businessName,
      timeline,
      recommendedSolution,
      proposalSummary: recommendedSolution,
      notes,
      terms,
      status: "sent",
      quoteStatus: "sent",
      source: "quote_builder",
      deliveryMethod: "meetro_chat",
      conversationId: quoteConversationId,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const history = JSON.parse(
      localStorage.getItem("workCenterQuoteHistory") || "[]"
    );

    const updatedQuoteHistory = [
      quote,
      ...history.filter(
        (savedQuote) => String(savedQuote.quoteId) !== String(quote.quoteId)
      ),
    ];

    localStorage.setItem(
      "workCenterQuoteHistory",
      JSON.stringify(updatedQuoteHistory)
    );

    localStorage.setItem(
      "meetroQuoteHistory",
      JSON.stringify(updatedQuoteHistory)
    );

    localStorage.setItem(
      "quoteHistory",
      JSON.stringify(updatedQuoteHistory)
    );

    shadowLinkQuote(
      quote,
      isRevisedQuoteFlow ? "revision_sent" : "sent"
    );

    updateRequestById(
      requestId,
      (item) => {
        const existingQuotes =
          Array.isArray(item.quotesReceived)
            ? item.quotesReceived
            : [];

        return appendTimelineEvent(
          {
            ...item,
            status: "quoted",
            quotesReceived: [
              quote,
              ...existingQuotes,
            ],
            lastQuoteAt:
              new Date().toISOString(),
          },
          {
            type: "quoteReceived",
            label:
              `Quote received from ${quote.businessName || "Business"}`,
            createdAt:
              new Date().toISOString(),
            quoteId:
              quote.quoteId || "",
            amount:
              quote.amount || "",
            businessName:
              quote.businessName || "",
          }
        );
      },
      request.title || request.project_title || ""
    );


    if (quoteConversationId) {
      const workflowConversationKey =
        `meetro_conversation_${quoteConversationId}`;

      const existingConversation = JSON.parse(
        localStorage.getItem(workflowConversationKey) || "[]"
      );

      const workflowQuoteCard = {
        id: `workflow-quote-${Date.now()}`,
        type: "workflow_quote_sent",
        workflowType: "quote",
        workflowSource: "quote_builder",
        role: "business",
        senderRole: "business",
        sender: quote.businessName || "Business",
        text: notes ||
          recommendedSolution ||
          (isSpanish
            ? isRevisedQuoteFlow
              ? "Cotización revisada enviada."
              : "Cotización enviada para revisión."
            : isRevisedQuoteFlow
            ? "Revised quote submitted."
            : "Quote sent for review."),
        projectTitle,
        title: projectTitle,
        serviceTitle: projectTitle,
        customerName: quote.homeownerName || "Customer",
        homeownerName: quote.homeownerName || "Customer",
        requestId,
        conversationId: quoteConversationId,
        quoteId: quote.quoteId,
        quoteNumber: quote.quoteNumber,
        amount: pricing.totalAmount,
        total: pricing.totalAmount,
        labor: pricing.laborAmount,
        materials: pricing.materialsAmount,
        laborAmount: pricing.laborAmount,
        materialsAmount: pricing.materialsAmount,
        subtotal: pricing.subtotal,
        totalAmount: pricing.totalAmount,
        quoteTotal: pricing.quoteTotal,
        pricingBreakdown: pricing.pricingBreakdown,
        lineItems: quote.lineItems,
        timeline,
        notes,
        terms: quote.terms,
        status: "sent",
        quoteStatus: "sent",
        source: "quote_builder",
        deliveryMethod: "meetro_chat",
        quotePayload: quote,
        isRevisedQuote: isRevisedQuoteFlow,
        createdAt: new Date().toISOString(),
        time: formatMessageTime(new Date()),
      };

      if (import.meta.env.DEV) {
        try {
          const identity = getProjectIdentity({
            projectId: request?.projectId,
            requestId,
          });
          const shadowQuoteSentEvent = createWorkflowEvent({
            id: workflowQuoteCard.id,
            eventType: WORKFLOW_EVENT_TYPES.WORKFLOW_QUOTE_SENT,
            projectId: identity.projectId,
            conversationId: quoteConversationId,
            actor: localStorage.getItem("userId") || "",
            actorRole: "business",
            recordedAt: workflowQuoteCard.createdAt,
            source: "quote-builder",
            payload: workflowQuoteCard,
            legacy: {
              isLegacy: true,
              originalEventType: workflowQuoteCard.type,
              identitySource: identity.identitySource,
              identityWarnings: identity.warnings.map(
                (warning) => warning.code
              ),
            },
          });
          const audit = compareLegacyToFactoryEvent(
            workflowQuoteCard,
            shadowQuoteSentEvent
          );

          console.info("Meetro Quote Sent Factory Audit", {
            currentType: workflowQuoteCard.type,
            canonicalType: shadowQuoteSentEvent.eventType,
            matchesEventType: audit.matchesEventType,
            matchesProjectId: audit.matchesProjectId,
            matchesConversationId: audit.matchesConversationId,
            hasActor: audit.hasActor,
            hasActorRole: audit.hasActorRole,
            hasRecordedAt: audit.hasRecordedAt,
            payloadPreserved: audit.payloadPreserved,
            legacyPreserved: audit.legacyPreserved,
            schemaGaps: audit.schemaGaps,
            migrationRisk: audit.migrationRisk,
          });
        } catch (error) {
          console.warn("Meetro Quote Sent Factory Audit", {
            comparisonFailed: true,
            errorName: error?.name || "Error",
          });
        }
      }

      localStorage.setItem(
        workflowConversationKey,
        JSON.stringify([
          ...existingConversation,
          workflowQuoteCard
        ])
      );

      localStorage.setItem(
        "activeConversationId",
        quoteConversationId
      );

      localStorage.setItem(
        "selectedQuoteRequestId",
        String(requestId || quoteConversationId)
      );

      localStorage.setItem(
        "activeConversationName",
        quote.homeownerName || "Customer"
      );

      localStorage.setItem(
        "conversationReturnPage",
        "contractorDashboard"
      );

      localStorage.setItem("returnPage", "contractorDashboard");
      localStorage.setItem("meetroWorkCenterTab", "quotes");
      localStorage.setItem("activeWorkCenterTab", "quotes");
      localStorage.setItem("conversationReturnSection", "quotes");
      sessionStorage.setItem("conversationReturnPage", "contractorDashboard");
      sessionStorage.setItem("conversationReturnSection", "quotes");

      markConversationUnreadForRecipient(quoteConversationId, "business", {
        id: quoteConversationId,
        project_title: projectTitle || "Quote",
        project_description:
          isSpanish
            ? "Cotización enviada para revisión."
            : "Quote sent for review.",
        homeowner_email: quote.homeownerName || "Customer",
        location: request.location || "Saved Contact",
        status: isSpanish ? "Cotización enviada" : "Quote sent",
        conversation_type: "standard",
        saved_to_history: false,
      });

      createNotification({
        type: "quote_received",
        title: isSpanish ? "Cotización recibida" : "Quote received",
        message: isSpanish
          ? `${quote.businessName || "Un profesional"} envió una cotización para ${projectTitle || "tu solicitud"}.`
          : `${quote.businessName || "A professional"} sent a quote for ${projectTitle || "your request"}.`,
        role: "homeowner",
        requestId,
        conversationId: quoteConversationId,
        quoteId: quote.quoteId,
        dedupeKey: `quote_received:${quote.quoteId || quoteConversationId}`,
      });

      localStorage.removeItem(
        "meetroRevisedQuoteContext"
      );
    }

    localStorage.setItem(
      "meetroGlobalToast",
      JSON.stringify({
        type: "success",
        message: isRevisedQuoteFlow
          ? isSpanish
            ? "Cotización enviada a Meetro Chat"
            : "Quote sent to Meetro Chat"
          : isSpanish
          ? "Cotización enviada a Meetro Chat"
          : "Quote sent to Meetro Chat"
      })
    );

    window.dispatchEvent(
      new Event("meetro-global-toast")
    );
    window.dispatchEvent(new Event("meetro-messages-updated"));
    window.dispatchEvent(new Event("meetroQuoteLifecycleUpdated"));
    window.dispatchEvent(new Event("storage"));

    localStorage.removeItem("selectedQuoteForEdit");
    localStorage.setItem("activeWorkCenterTab", "quotes");

    setPage("conversationThread");
  }

  return (
    <div className="app-page meetro-form-page" style={page}>
      <button
        style={backButton}
        onClick={() => {
          if (restoreConversationOriginContext(setPage)) return;

          if (isEditingExistingQuote) {
            localStorage.removeItem("selectedQuoteForEdit");
            localStorage.setItem("meetroWorkCenterTab", "quotes");
            localStorage.setItem("activeWorkCenterTab", "quotes");
            setPage("workCenter");
          } else if (isRevisedQuoteFlow) {
            setPage("conversationThread");
          } else if (isWorkCenterReturn) {
            localStorage.setItem("meetroWorkCenterTab", "quotes");
            localStorage.setItem("activeWorkCenterTab", "quotes");
            setPage("workCenter");
          } else if (isBusinessToolsReturn) {
            setPage("businessCommandCenter");
          } else {
            setPage("businessLeads");
          }
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
          ? isSpanish
            ? "Volver al chat"
            : "Back to Chat"
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
          <p style={eyebrowDark}>
            {isSpanish ? "Propuesta para el cliente" : "Customer Proposal"}
          </p>
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
          <p style={proposalHint}>
            {isSpanish
              ? "Transforma tus notas internas en una explicación clara para el cliente antes de enviar."
              : "Turn your internal findings into a clear customer-ready recommendation before sending."}
          </p>
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
          <p style={sectionHelperText}>
            {isSpanish
              ? "Organiza materiales, mano de obra, depósito y términos antes de compartir con el cliente."
              : "Organize materials, labor, deposit, and terms before sharing with the customer."}
          </p>

          <div style={aiQuoteHelpCard}>
            <p style={eyebrowDark}>Meetro Proposal Help</p>
            <p style={aiQuoteHelpSubtitle}>
              Use Meetro to improve proposal wording, organize services, and check for missing details.
            </p>
            <div style={aiChipGrid}>
              <button style={aiChip} onClick={() => runAiQuoteHelp("improve")}>
                Improve wording
              </button>
              <button style={aiChip} onClick={() => runAiQuoteHelp("lineItems")}>
                Suggest line items
              </button>
              <button style={aiChip} onClick={() => runAiQuoteHelp("missing")}>
                Check missing details
              </button>
              <button style={aiChip} onClick={() => runAiQuoteHelp("friendly")}>
                Make customer friendly
              </button>
              <button style={aiChip} onClick={() => runAiQuoteHelp("terms")}>
                Add clear terms
              </button>
            </div>
            {aiSuggestion && (
              <div style={aiSuggestionBox}>
                <label style={label}>
                  {isSpanish ? "Sugerencia editable" : "Editable suggestion"}
                </label>
                <textarea
                  style={textarea}
                  value={aiSuggestion}
                  onChange={(event) => setAiSuggestion(event.target.value)}
                />
                <div style={inlineActionGrid}>
                  <button style={secondaryActionButton} onClick={applyAiSuggestion}>
                    {isSpanish ? "Usar sugerencia" : "Use Suggestion"}
                  </button>
                  <button
                    style={quietActionButton}
                    onClick={() => {
                      setAiSuggestion("");
                      setAiSuggestionTarget("recommendedSolution");
                    }}
                  >
                    {isSpanish ? "Limpiar" : "Clear"}
                  </button>
                </div>
              </div>
            )}
          </div>

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

          <button
            style={{
              ...sendButton,
              background: "#ffffff",
              color: "#5b3df5",
              border: "1px solid rgba(91,61,245,0.22)",
              boxShadow: "0 10px 24px rgba(91,61,245,0.10)",
              marginBottom: "10px",
            }}
            onClick={saveDraftQuote}
          >
            <MeetroIcon name="history" size={18} decorative /> {isSpanish ? "Guardar cotización" : "Save Quote"}
          </button>

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
          </div>

          {copiedNotice && <p style={externalShareHint}>{copiedNotice}</p>}

          {quotePreviewOpen && (
            <pre style={quotePreviewBox}>{buildQuoteShareText()}</pre>
          )}

          <div style={deliveryChoiceBox}>
            <div>
              <p style={deliveryEyebrow}>
                {isSpanish ? "Entrega de cotización" : "Quote delivery"}
              </p>
              <h3 style={deliveryTitle}>
                {isSpanish
                  ? "Meetro Chat es el flujo principal"
                  : "Meetro Chat is the primary workflow"}
              </h3>
              <p style={deliveryText}>
                {canSendThroughMeetroChat
                  ? isSpanish
                    ? "Envía esta cotización al cliente en Meetro Chat para aprobar o solicitar cambios."
                    : "Send this quote to the customer in Meetro Chat."
                  : isSpanish
                  ? "Comienza desde una solicitud, oportunidad o conversación de Meetro para enviarla por Meetro Chat. Puedes compartirla externamente."
                  : "Start from a Meetro request, lead, or conversation to send through Meetro Chat. You can still share externally."}
              </p>
            </div>

            <button
              style={{
                ...sendButton,
                opacity: canSendThroughMeetroChat ? 1 : 0.58,
                cursor: canSendThroughMeetroChat ? "pointer" : "not-allowed",
              }}
              onClick={sendQuote}
              disabled={!canSendThroughMeetroChat}
            >
              {isRevisedQuoteFlow
                ? isSpanish
                  ? "Enviar Cotización Revisada por Meetro Chat"
                  : "Send Revised Quote Through Meetro Chat"
                : isSpanish
                ? "Enviar por Meetro Chat"
                : "Send Through Meetro Chat"}
            </button>

            <button style={externalShareButton} onClick={shareExternalQuote}>
              {isSpanish ? "Compartir Externamente" : "Share Externally"}
            </button>

            <p style={externalShareHint}>
              {isSpanish
                ? "Usa la hoja de compartir para Email, Mensajes, AirDrop o imprimir."
                : "Use the share sheet for Email, Messages, AirDrop, or Print."}
            </p>

            {quoteSentInfo?.type === "external" && (
              <div style={bottomResultNotice}>
                <strong>
                  {isSpanish ? "Cotización lista para compartir" : "Quote ready to share"}
                </strong>

                <p>
                  {isSpanish
                    ? `Cotización #${quoteSentInfo.quoteNumber || "—"} por $${Number(quoteSentInfo.amount || 0).toFixed(2)}.`
                    : `Quote #${quoteSentInfo.quoteNumber || "—"} for $${Number(quoteSentInfo.amount || 0).toFixed(2)}.`}
                </p>

                <div style={bottomResultActions}>
                  <button style={bottomResultPrimaryButton} onClick={shareExternalQuote}>
                    {isSpanish ? "Compartir otra vez" : "Share Again"}
                  </button>

                  <button
                    style={bottomResultSecondaryButton}
                    onClick={() => setQuoteSentInfo(null)}
                  >
                    {isSpanish ? "Crear otra cotización" : "Create Another Quote"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav
        setPage={setPage}
        currentPage={
          isWorkCenterReturn
            ? "workCenter"
            : isBusinessToolsReturn
            ? "businessDashboard"
            : "businessLeads"
        }
      />
    </div>
  );
}

const page = {
  minHeight: "100dvh",
  background: "linear-gradient(180deg,#f8fafc,#eef2ff)",
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
  background: "white",
  color: "#5b3df5",
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
  background: "#eef2ff",
  color: "#4338ca",
};

const hero = {
  background: "linear-gradient(135deg,#111b46,#5b3df5)",
  color: "white",
  borderRadius: "30px",
  padding: "28px 24px",
  marginBottom: "20px",
  boxShadow: "0 22px 54px rgba(17,27,70,0.18)",
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
  background: "white",
  borderRadius: "26px",
  padding: "20px",
  boxShadow: "0 16px 38px rgba(15,23,42,0.075)",
  boxSizing: "border-box",
  maxWidth: "100%",
  border: "1px solid rgba(226,232,240,0.9)",
};

const proposalCard = {
  ...card,
  border: "1px solid rgba(91,61,245,0.16)",
  background: "linear-gradient(180deg,#ffffff,#faf7ff)",
};

const proposalHint = {
  margin: "0 0 12px",
  color: "#64748b",
  fontSize: "14px",
  fontWeight: "750",
  lineHeight: 1.45,
};

const proposalProblemText = {
  margin: "0 0 18px",
  color: "#334155",
  background: "#ffffff",
  border: "1px solid rgba(148,163,184,0.22)",
  borderRadius: "16px",
  padding: "12px",
  fontSize: "14px",
  fontWeight: "800",
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
  color: "#5b3df5",
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
  background: "#eef2ff",
  color: "#4f46e5",
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
  color: "#5b3df5",
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

const importedFieldBlock = {
  display: "grid",
  gap: "5px",
};

const importedFieldLabel = {
  color: "#334155",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
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

const materialDetailLines = {
  display: "grid",
  gap: "3px",
  marginTop: "4px",
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

const materialReviewBox = {
  marginTop: "14px",
  display: "grid",
  gap: "10px",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid rgba(91, 61, 245, 0.16)",
  background: "linear-gradient(180deg, #ffffff, #f8f7ff)",
};

const materialReviewTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "17px",
};

const materialReviewHint = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "750",
  lineHeight: 1.4,
};

const materialReviewList = {
  display: "grid",
  gap: "9px",
};

const materialReviewItem = {
  display: "grid",
  gap: "4px",
  padding: "12px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "13px",
  fontWeight: "750",
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

const aiButton = {
  width: "100%",
  border: "none",
  background: "#eef2ff",
  color: "#5b3df5",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "10px",
};

const aiQuoteHelpCard = {
  display: "grid",
  gap: "10px",
  padding: "16px",
  borderRadius: "18px",
  background: "#f8fafc",
  border: "1px solid #dbeafe",
  marginBottom: "18px",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const aiQuoteHelpSubtitle = {
  margin: 0,
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const aiChipGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  maxWidth: "100%",
};

const aiChip = {
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
  maxWidth: "100%",
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
  color: "#5b3df5",
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
  border: "1px solid rgba(91,61,245,0.22)",
  background: "#ffffff",
  color: "#5b3df5",
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

const deliveryChoiceBox = {
  marginTop: "18px",
  background: "linear-gradient(180deg,#f8f7ff,#ffffff)",
  border: "1px solid rgba(91,61,245,0.14)",
  borderRadius: "20px",
  padding: "16px",
};

const deliveryEyebrow = {
  margin: "0 0 6px",
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const deliveryTitle = {
  margin: "0 0 6px",
  color: "#111827",
  fontSize: "17px",
};

const deliveryText = {
  margin: 0,
  color: "#64748b",
  lineHeight: 1.45,
  fontSize: "14px",
};

const bottomResultNotice = {
  marginTop: "14px",
  background: "#f0fdf4",
  border: "1px solid rgba(34,197,94,0.24)",
  borderRadius: "18px",
  padding: "14px",
  color: "#14532d",
};

const bottomResultActions = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "8px",
  marginTop: "10px",
};

const bottomResultPrimaryButton = {
  border: "none",
  background: "#16a34a",
  color: "#ffffff",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const bottomResultSecondaryButton = {
  border: "1px solid rgba(34,197,94,0.24)",
  background: "#ffffff",
  color: "#14532d",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
  cursor: "pointer",
};








const sendButton = {
  width: "100%",
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "16px",
  padding: "15px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "16px",
};

const externalShareButton = {
  width: "100%",
  border: "1px solid rgba(91,61,245,0.22)",
  background: "#ffffff",
  color: "#5b3df5",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "10px",
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
