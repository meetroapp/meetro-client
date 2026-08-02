import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
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

  // Browser-stored quote records are not authoritative and must not reopen as saved work.
  const selectedQuoteForEdit = null;

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

          <div style={deliveryChoiceBox} role="status">
            <div>
              <p style={deliveryEyebrow}>
                {isSpanish ? "Disponibilidad" : "Availability"}
              </p>
              <h3 style={deliveryTitle}>
                {isSpanish
                  ? "Guardar y entregar cotizaciones aún no está disponible."
                  : "Quote saving and delivery are not available yet."}
              </h3>
              <p style={deliveryText}>
                {isSpanish
                  ? "Puedes preparar y revisar esta cotización en esta página, pero no se guarda ni se entrega al cliente."
                  : "You can prepare and review this quote on this page, but it is not saved or delivered to the customer."}
              </p>
            </div>
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
  border: "1px solid rgba(31,77,52,0.16)",
  background:
    "linear-gradient(180deg, var(--meetro-surface-paper, rgba(255,253,248,0.98)), var(--meetro-surface-warm, rgba(251,246,237,0.92)))",
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
  color: "var(--meetro-color-forest, #1f4d34)",
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
  border: "1px solid rgba(31,77,52,0.2)",
  background: "#ffffff",
  color: "var(--meetro-color-forest, #1f4d34)",
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
  background:
    "linear-gradient(180deg, var(--meetro-surface-warm, rgba(251,246,237,0.92)), var(--meetro-surface-paper, rgba(255,253,248,0.98)))",
  border: "1px solid rgba(31,77,52,0.14)",
  borderRadius: "20px",
  padding: "16px",
};

const deliveryEyebrow = {
  margin: "0 0 6px",
  color: "var(--meetro-color-coffee, #4a3428)",
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
