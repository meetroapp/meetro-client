import {
  buildBusinessDocumentConversationPatch,
  isServerOwnedDocumentNumberRequest,
  reconcileBusinessDocumentInstructions,
} from "./businessDocumentWorkspace.js";
import { normalizeBusinessDocumentAgreement } from "./businessDocumentAgreement.js";
import { normalizeBusinessDocumentCustomerParty } from "./businessDocumentCustomerParty.js";

export const BUSINESS_DOCUMENT_PHOTO_ROLES = Object.freeze([
  "UNCLASSIFIED", "GENERAL_EVIDENCE", "BEFORE", "AFTER",
]);
export const BUSINESS_DOCUMENT_PHOTO_VISIBILITIES = Object.freeze([
  "PRIVATE_INTERNAL", "CUSTOMER_VISIBLE",
]);

export function defaultBusinessDocumentPhotoAssignment() {
  return Object.freeze({ role: "UNCLASSIFIED", visibility: "PRIVATE_INTERNAL" });
}

export function normalizeBusinessDocumentPhotoAssignment(assignment = {}) {
  const hasKnownRole = BUSINESS_DOCUMENT_PHOTO_ROLES.includes(assignment.role);
  const role = hasKnownRole
    ? assignment.role
    : "UNCLASSIFIED";
  let visibility = BUSINESS_DOCUMENT_PHOTO_VISIBILITIES.includes(assignment.visibility)
    ? assignment.visibility
    : "PRIVATE_INTERNAL";
  if (!hasKnownRole && visibility === "CUSTOMER_VISIBLE") visibility = "PRIVATE_INTERNAL";
  return {
    ...assignment,
    role: role === "UNCLASSIFIED" && visibility === "CUSTOMER_VISIBLE"
      ? "GENERAL_EVIDENCE"
      : role,
    visibility,
  };
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().filter((key) => key !== "pendingFile" && key !== "previewUrl").map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const SERVER_MEDIA_PRESENTATION_KEYS = new Set([
  "customer_visible_by_default",
  "display_order",
  "lifecycle_state",
  "name",
  "uploaded_at",
]);

function fingerprintText(value) {
  return String(value ?? "").trim();
}

function fingerprintTotal(total, quantity, price) {
  const saved = fingerprintText(total);
  // QuoteBuilder projects untouched placeholder rows with a numeric zero total.
  // That zero is calculated system state, not professional-authored pricing.
  if (saved && Number(saved) !== 0) return saved;
  const quantityNumber = Number(fingerprintText(quantity));
  const priceNumber = Number(fingerprintText(price));
  return Number.isFinite(quantityNumber) && Number.isFinite(priceNumber) &&
    fingerprintText(quantity) && fingerprintText(price)
    ? String(quantityNumber * priceNumber)
    : "";
}

function isEmptyPersistedQuoteLineSeed(row = {}) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  const allowed = new Set([
    "id", "description", "label", "title", "name", "quantity", "qty",
    "unitPrice", "rate", "price", "total", "amount", "lineTotal", "notes",
  ]);
  if (Object.entries(row).some(([key, value]) =>
    !allowed.has(key) && fingerprintText(value)
  )) return false;

  if (fingerprintText(row.description ?? row.label ?? row.title ?? row.name)) return false;
  if (fingerprintText(row.notes)) return false;
  if (fingerprintText(row.unitPrice ?? row.rate ?? row.price)) return false;

  const quantity = fingerprintText(row.quantity ?? row.qty);
  if (quantity && quantity !== "1") return false;

  for (const value of [row.total, row.amount, row.lineTotal]) {
    const text = fingerprintText(value);
    if (!text) continue;
    const numeric = Number(text.replace(/^\$/, "").replaceAll(",", ""));
    if (!Number.isFinite(numeric) || numeric !== 0) return false;
  }
  return true;
}

function canonicalFingerprintRows(key, rows) {
  return rows.map((item, index) => {
    if (key === "materialItems") {
      const quantity = fingerprintText(item.quantity ?? item.qty);
      const cost = fingerprintText(item.cost ?? item.unitPrice ?? item.price);
      return {
        id: fingerprintText(item.id) || `material-line-${index}`,
        name: fingerprintText(item.name ?? item.description ?? item.label),
        quantity,
        cost,
        total: fingerprintTotal(item.total ?? item.amount ?? item.lineTotal, quantity, cost),
        notes: fingerprintText(item.notes ?? item.provider),
      };
    }
    if (key === "laborItems") {
      const hours = fingerprintText(item.hours ?? item.estimatedHours ?? item.quantity);
      const rate = fingerprintText(item.rate ?? item.unitPrice);
      return {
        id: fingerprintText(item.id) || `labor-line-${index}`,
        description: fingerprintText(item.description ?? item.label ?? item.title) || "Labor",
        hours,
        rate,
        total: fingerprintTotal(item.total ?? item.amount ?? item.lineTotal, hours, rate),
      };
    }
    const quantity = fingerprintText(item.quantity ?? item.qty) || "1";
    const unitPrice = fingerprintText(item.unitPrice ?? item.rate ?? item.price);
    return {
      id: fingerprintText(item.id) || `quote-line-${index}`,
      description: fingerprintText(item.description ?? item.label ?? item.title),
      quantity,
      unitPrice,
      total: fingerprintTotal(item.total ?? item.amount ?? item.lineTotal, quantity, unitPrice),
    };
  }).filter((row) => {
    if (key === "materialItems") return row.name || row.cost || row.total || row.notes;
    if (key === "laborItems") {
      const defaultLaborLabel = /^(?:labor|labour|mano de obra|main-d['’]oeuvre|mão de obra)$/i.test(
        row.description
      );
      return !defaultLaborLabel || row.hours || row.rate || row.total;
    }
    return row.description || row.unitPrice || row.total;
  });
}

function canonicalFingerprintValue(value, path = []) {
  if (Array.isArray(value)) {
    const key = path.at(-1);
    if (["lineItems", "materialItems", "laborItems"].includes(key)) {
      return canonicalFingerprintRows(key, value);
    }
    return value.map((item, index) => canonicalFingerprintValue(item, [...path, index]));
  }
  if (!value || typeof value !== "object") {
    if ((path.includes("content") || path.includes("manualOverrides")) && value !== undefined && value !== null) {
      return String(value).trim();
    }
    return value;
  }
  const inMedia = path.at(-1) === "media";
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => (!inMedia || !SERVER_MEDIA_PRESENTATION_KEYS.has(key)) &&
      !(key === "uploadState" && value.media?.public_id))
    .map(([key, item]) => [key, canonicalFingerprintValue(item, [...path, key])]));
}

export function businessDocumentSnapshotFingerprint(snapshot) {
  return stable(canonicalFingerprintValue(snapshot));
}

export function businessDocumentSavePresentation({
  savedDocument = null,
  currentFingerprint = "",
  savedFingerprint = "",
  hasMeaningfulContent = false,
  busy = false,
} = {}) {
  const dirty = savedDocument
    ? currentFingerprint !== savedFingerprint
    : hasMeaningfulContent === true;
  return Object.freeze({
    dirty,
    label: busy ? "Saving…" : savedDocument ? (dirty ? "Save Changes" : "Saved ✓") : "Save Draft",
    savedAt: savedDocument && !dirty ? String(savedDocument.updatedAt || "") : "",
  });
}

export function businessDocumentPhotoVisibilityNotice(photos = [], assignments = {}) {
  const hasCustomerVisiblePhoto = photos.some((photo) =>
    assignments[photo.id]?.visibility === "CUSTOMER_VISIBLE"
  );
  return hasCustomerVisiblePhoto
    ? "Customer-visible photos will appear on the document. Private photos remain internal."
    : "Photos are private and will not appear on customer documents.";
}

export function businessDocumentTurnResponse(turn = {}) {
  if (String(turn.responseText || "").trim()) return String(turn.responseText).trim();
  if (isServerOwnedDocumentNumberRequest(turn.text)) {
    return "Document numbers are assigned by Meetro when the working document is first saved and cannot be changed in conversation.";
  }
  if (turn.privateReminder === true) return "Private reminder saved for this working document.";
  if (["before", "after", "BEFORE", "AFTER"].includes(turn.photoIntent)) {
    return "Photo classification updated for this working document.";
  }
  if (turn.recognized === true) {
    return `${String(turn.documentType || "").toLowerCase() === "invoice" ? "Invoice" : "Quote"} working draft updated. Review the live document.`;
  }
  return "I kept your instruction here. Use manual edit for unsupported details.";
}

function validTimestamp(value) {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null;
}

export function buildBusinessDocumentConversationTurn({
  id,
  documentType,
  instruction,
  current = {},
  previousTurn = null,
  resolvedPatch = null,
  now = new Date().toISOString(),
} = {}) {
  const text = String(instruction || "").trim();
  const type = String(documentType || "").toLowerCase();
  const patch = resolvedPatch === null
    ? buildBusinessDocumentConversationPatch({ documentType: type, instruction: text, current })
    : Object.freeze({ ...resolvedPatch });
  const recognized = Object.keys(patch).length > 0;
  const timestamp = validTimestamp(now) || new Date().toISOString();
  const createdAt = previousTurn ? validTimestamp(previousTurn.createdAt) : timestamp;
  const turn = {
    ...(previousTurn || {}),
    id: String(id || previousTurn?.id || ""),
    documentType: type,
    originalText: String(previousTurn?.originalText || previousTurn?.text || text),
    text,
    recognized,
    revisions: previousTurn ? Number(previousTurn.revisions || 0) + 1 : 0,
    revisionHistory: previousTurn
      ? [...(previousTurn.revisionHistory || []), String(previousTurn.text || "")]
      : [],
    privateReminder: Boolean(patch.privateReminder),
    photoIntent: patch.photoIntent || null,
    ...(createdAt ? { createdAt } : {}),
    updatedAt: timestamp,
    editing: false,
    responseText: "",
  };
  turn.responseText = businessDocumentTurnResponse(turn);
  return Object.freeze({ turn: Object.freeze(turn), patch: Object.freeze({ ...patch }) });
}

function savedInstruction(turn) {
  const saved = {
    id: String(turn.id || ""),
    documentType: String(turn.documentType || "").toUpperCase(),
    originalText: String(turn.originalText || turn.revisionHistory?.[0] || turn.text || ""),
    text: String(turn.text || ""),
    responseText: businessDocumentTurnResponse(turn),
    recognized: turn.recognized === true,
    revisions: Number(turn.revisions || 0),
    revisionHistory: Array.isArray(turn.revisionHistory) ? [...turn.revisionHistory] : [],
    privateReminder: turn.privateReminder === true,
    photoIntent: turn.photoIntent ? String(turn.photoIntent).toUpperCase() : null,
  };
  const createdAt = validTimestamp(turn.createdAt);
  const updatedAt = validTimestamp(turn.updatedAt);
  if (createdAt) saved.createdAt = createdAt;
  if (updatedAt) saved.updatedAt = updatedAt;
  return saved;
}

function savedPhoto(photo, assignment) {
  if (!photo?.media?.public_id) return null;
  const normalizedAssignment = normalizeBusinessDocumentPhotoAssignment(assignment);
  return {
    id: photo.id || photo.media.public_id,
    name: photo.name || "Document photo",
    purpose: "quote-draft-photo",
    media: { ...photo.media },
    role: normalizedAssignment.role,
    visibility: normalizedAssignment.visibility,
  };
}

export function buildBusinessDocumentSavePayload({
  documentType,
  content,
  turns = [],
  manualOverrides = {},
  photos = [],
  photoAssignments = {},
  jobId = null,
  jobAnalysisSessionId = null,
  customerParty = null,
} = {}) {
  const type = String(documentType || "").toUpperCase();
  const instructions = turns
    .filter((turn) => String(turn.documentType || "").toUpperCase() === type)
    .map(savedInstruction);
  const reconciliation = reconcileBusinessDocumentInstructions({
    documentType: type.toLowerCase(),
    baseline: {},
    instructions,
    manualOverrides,
  });
  return {
    documentType: type,
    jobId: jobId || null,
    customerParty: normalizeBusinessDocumentCustomerParty(customerParty),
    content: {
      customerName: content?.customerName || "",
      customerEmail: content?.customerEmail || "",
      ...(content?.customerPhone ? { customerPhone: content.customerPhone } : {}),
      ...(content?.customerAddress ? { customerAddress: content.customerAddress } : {}),
      customerLocation: content?.customerLocation || content?.serviceAddress || "",
      serviceLocation: content?.serviceLocation || content?.serviceAddress || "",
      projectTitle: content?.projectTitle || "",
      projectDescription: content?.projectDescription || "",
      recommendedSolution: content?.recommendedSolution || "",
      workPerformed: content?.workPerformed || "",
      totalOverride: content?.totalOverride || "",
      ...(String(content?.subtotal ?? "").trim() ? { subtotal: content.subtotal } : {}),
      ...(String(content?.discount ?? "").trim() ? { discount: content.discount } : {}),
      ...(String(content?.tax ?? "").trim() ? { tax: content.tax } : {}),
      ...(String(content?.fees ?? "").trim() ? { fees: content.fees } : {}),
      ...(String(content?.paidAmount ?? "").trim() ? { paidAmount: content.paidAmount } : {}),
      ...(String(content?.balanceDue ?? "").trim() ? { balanceDue: content.balanceDue } : {}),
      terms: content?.terms || "",
      paymentTerms: content?.paymentTerms || "",
      pricingDisplayMode: content?.pricingDisplayMode || "",
      materialsDisplayMode: content?.materialsDisplayMode || "",
      depositMode: content?.depositMode || "",
      depositPercent: content?.depositPercent || "",
      depositFixedAmount: content?.depositFixedAmount || "",
      estimatedDuration: content?.estimatedDuration || "",
      dueDate: content?.dueDate || "",
      notes: content?.notes || "",
      ...(content?.warrantyNotes ? { warrantyNotes: content.warrantyNotes } : {}),
      ...(content?.customerMessage ? { customerMessage: content.customerMessage } : {}),
      ...(Array.isArray(content?.conditions) && content.conditions.length ? { conditions: [...content.conditions] } : {}),
      ...(Array.isArray(content?.exclusions) && content.exclusions.length ? { exclusions: [...content.exclusions] } : {}),
      quoteReference: content?.quoteReference || "",
      quoteNumber: content?.quoteNumber || "",
      invoiceNumber: content?.invoiceNumber || "",
      quoteDate: content?.quoteDate || "",
      invoiceDate: content?.invoiceDate || "",
      currency: content?.currency || "USD",
      agreement: normalizeBusinessDocumentAgreement(content?.agreement),
      lineItems: (content?.lineItems || [])
        .filter((item) => !isEmptyPersistedQuoteLineSeed(item))
        .map((item) => ({ ...item })),
      materialItems: (content?.materialItems || []).map((item) => ({ ...item })),
      laborItems: (content?.laborItems || []).map((item) => ({ ...item })),
    },
    workspace: {
      activeDocument: type,
      instructions,
      manualOverrides: { ...manualOverrides },
      privateReminders: reconciliation.privateReminders.map((item) => ({ ...item })),
      ...(String(jobAnalysisSessionId || "").trim()
        ? { jobAnalysisSessionId: String(jobAnalysisSessionId).trim() }
        : {}),
    },
    photos: photos.map((photo) => savedPhoto(
      photo,
      photoAssignments[photo.id] || defaultBusinessDocumentPhotoAssignment()
    )).filter(Boolean),
  };
}

export function buildNewBusinessDocumentDraftPayload({
  documentType,
  documentDate = "",
} = {}) {
  const type = String(documentType || "").trim().toLowerCase();
  if (!["quote", "invoice"].includes(type)) {
    const error = new Error("A Quote or Invoice type is required to start a new working document.");
    error.code = "BUSINESS_DOCUMENT_NEW_TYPE_INVALID";
    throw error;
  }

  return buildBusinessDocumentSavePayload({
    documentType: type,
    content: type === "quote"
      ? { quoteDate: String(documentDate || "").trim() }
      : { invoiceDate: String(documentDate || "").trim() },
    turns: [],
    manualOverrides: {},
    photos: [],
    photoAssignments: {},
    jobId: null,
    jobAnalysisSessionId: null,
    customerParty: null,
  });
}

export function validateNewBusinessDocumentDraft({
  documentType,
  previousDocument,
  nextDocument,
} = {}) {
  const expectedType = String(documentType || "").trim().toUpperCase();
  const previousNumber = String(previousDocument?.documentNumber || "").trim();
  const nextNumber = String(nextDocument?.documentNumber || "").trim();
  if (
    !previousDocument?.id ||
    !nextDocument?.id ||
    nextDocument.documentType !== expectedType ||
    nextDocument.id === previousDocument.id ||
    !previousNumber ||
    !nextNumber ||
    nextNumber === previousNumber
  ) {
    const error = new Error("Meetro could not verify a distinct new working-document identity. The current document remains open.");
    error.code = "BUSINESS_DOCUMENT_NEW_IDENTITY_INVALID";
    throw error;
  }
  return nextDocument;
}

export function hasMeaningfulBusinessDocumentDraft(payload = {}) {
  const content = payload.content || {};
  const meaningfulScalarFields = [
    "customerName",
    "customerEmail",
    "customerPhone",
    "customerAddress",
    "customerLocation",
    "serviceLocation",
    "projectTitle",
    "projectDescription",
    "recommendedSolution",
    "workPerformed",
    "totalOverride",
    "subtotal",
    "discount",
    "tax",
    "fees",
    "paidAmount",
    "balanceDue",
    "terms",
    "paymentTerms",
    "pricingDisplayMode",
    "materialsDisplayMode",
    "depositMode",
    "depositPercent",
    "depositFixedAmount",
    "estimatedDuration",
    "dueDate",
    "notes",
    "warrantyNotes",
    "customerMessage",
    "quoteReference",
  ];
  const hasMeaningfulAgreement = Object.values(
    normalizeBusinessDocumentAgreement(content.agreement)
  ).some((value) => Array.isArray(value)
    ? value.some((item) => fingerprintText(item))
    : fingerprintText(value));
  const hasMeaningfulRows = ["lineItems", "materialItems", "laborItems"]
    .some((key) => canonicalFingerprintRows(key, content[key] || []).length > 0);
  const hasMeaningfulCollections = ["conditions", "exclusions"]
    .some((key) => (content[key] || []).some((item) => fingerprintText(item)));
  const hasMeaningfulManualOverrides = Object.entries(
    payload.workspace?.manualOverrides || {}
  ).some(([key, value]) => {
    if (["lineItems", "materialItems", "laborItems"].includes(key)) {
      return canonicalFingerprintRows(key, Array.isArray(value) ? value : []).length > 0;
    }
    if (key === "agreement") {
      return Object.values(normalizeBusinessDocumentAgreement(value)).some((item) =>
        Array.isArray(item)
          ? item.some((entry) => fingerprintText(entry))
          : fingerprintText(item)
      );
    }
    return Array.isArray(value)
      ? value.some((item) => fingerprintText(item))
      : fingerprintText(value);
  });
  return Boolean(
    meaningfulScalarFields.some((key) => fingerprintText(content[key])) ||
    hasMeaningfulAgreement ||
    hasMeaningfulRows ||
    hasMeaningfulCollections ||
    normalizeBusinessDocumentCustomerParty(payload.customerParty) ||
    payload.workspace?.instructions?.length ||
    payload.workspace?.privateReminders?.length ||
    payload.workspace?.jobAnalysisSessionId ||
    hasMeaningfulManualOverrides ||
    payload.photos?.length
  );
}

export function restoreBusinessDocumentConversationTurns(instructions = [], documentType = "") {
  return instructions.map((turn) => {
    const restored = {
      ...turn,
      documentType: String(turn.documentType || documentType || "").toLowerCase(),
      originalText: String(turn.originalText || turn.revisionHistory?.[0] || turn.text || ""),
      revisionHistory: Array.isArray(turn.revisionHistory) ? [...turn.revisionHistory] : [],
      privateReminder: turn.privateReminder === true,
      photoIntent: turn.photoIntent ? String(turn.photoIntent).toLowerCase() : null,
      editing: false,
    };
    restored.responseText = businessDocumentTurnResponse(restored);
    return restored;
  });
}

export function restoreBusinessDocumentDraft(document) {
  const turns = restoreBusinessDocumentConversationTurns(
    document.workspace?.instructions || [],
    document.documentType
  );
  const photos = (document.photos || []).map((photo) => ({
    id: photo.id,
    name: photo.name,
    previewUrl: photo.media?.secure_url || "",
    media: { ...photo.media },
    uploadState: "durable",
  }));
  const photoAssignments = Object.fromEntries((document.photos || []).map((photo) => [
    photo.id,
    normalizeBusinessDocumentPhotoAssignment({ role: photo.role, visibility: photo.visibility }),
  ]));
  return {
    documentType: document.documentType.toLowerCase(),
    content: { ...document.content },
    turns,
    manualOverrides: { ...(document.workspace?.manualOverrides || {}) },
    privateReminders: (document.workspace?.privateReminders || []).map((item) => ({ ...item })),
    photos,
    photoAssignments,
    jobId: document.jobId || null,
    jobAnalysisSessionId: document.workspace?.jobAnalysisSessionId || null,
    customerParty: normalizeBusinessDocumentCustomerParty(document.customerParty),
  };
}

export function businessDocumentRestoredSnapshotFingerprint(document) {
  const restored = restoreBusinessDocumentDraft(document);
  const payload = buildBusinessDocumentSavePayload({
    documentType: restored.documentType,
    content: restored.content,
    turns: restored.turns,
    manualOverrides: restored.manualOverrides,
    photos: restored.photos,
    photoAssignments: restored.photoAssignments,
    jobId: restored.jobId,
    jobAnalysisSessionId: restored.jobAnalysisSessionId,
    customerParty: restored.customerParty,
  });
  return businessDocumentSnapshotFingerprint({
    payload,
    recoveryPhotos: recoveryPhotoProjection(restored.photos, restored.photoAssignments),
  });
}

export function customerVisibleBusinessDocumentPhotos(photos = [], assignments = {}) {
  return photos.filter((photo) =>
    assignments[photo.id]?.visibility === "CUSTOMER_VISIBLE" &&
    ["GENERAL_EVIDENCE", "BEFORE", "AFTER"].includes(assignments[photo.id]?.role)
  );
}

export function customerVisibleBusinessDocumentPhotoGroups(photos = [], assignments = {}) {
  const visiblePhotos = customerVisibleBusinessDocumentPhotos(photos, assignments);
  return Object.freeze({
    general: Object.freeze(visiblePhotos.filter((photo) => assignments[photo.id]?.role === "GENERAL_EVIDENCE")),
    before: Object.freeze(visiblePhotos.filter((photo) => assignments[photo.id]?.role === "BEFORE")),
    after: Object.freeze(visiblePhotos.filter((photo) => assignments[photo.id]?.role === "AFTER")),
  });
}

export function recoveryPhotoProjection(photos = [], assignments = {}) {
  return photos.map((photo) => {
    const assignment = normalizeBusinessDocumentPhotoAssignment(
      assignments[photo.id] || defaultBusinessDocumentPhotoAssignment()
    );
    return {
      id: photo.id,
      name: photo.name,
      media: photo.media ? { ...photo.media } : null,
      pendingFile: photo.pendingFile || null,
      uploadState: photo.uploadState || (photo.media ? "durable" : "pending"),
      assignment: {
        role: assignment.role,
        visibility: assignment.visibility,
      },
    };
  });
}
