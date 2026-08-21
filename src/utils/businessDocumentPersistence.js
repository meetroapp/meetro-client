import { reconcileBusinessDocumentInstructions } from "./businessDocumentWorkspace.js";

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

export function businessDocumentSnapshotFingerprint(snapshot) {
  return stable(snapshot);
}

function savedInstruction(turn) {
  return {
    id: String(turn.id || ""),
    documentType: String(turn.documentType || "").toUpperCase(),
    text: String(turn.text || ""),
    recognized: turn.recognized === true,
    revisions: Number(turn.revisions || 0),
    revisionHistory: Array.isArray(turn.revisionHistory) ? [...turn.revisionHistory] : [],
  };
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
    content: {
      customerName: content?.customerName || "",
      customerLocation: content?.customerLocation || content?.serviceAddress || "",
      serviceLocation: content?.serviceLocation || content?.serviceAddress || "",
      projectTitle: content?.projectTitle || "",
      projectDescription: content?.projectDescription || "",
      recommendedSolution: content?.recommendedSolution || "",
      workPerformed: content?.workPerformed || "",
      totalOverride: content?.totalOverride || "",
      terms: content?.terms || "",
      paymentTerms: content?.paymentTerms || "",
      estimatedDuration: content?.estimatedDuration || "",
      dueDate: content?.dueDate || "",
      notes: content?.notes || "",
      quoteReference: content?.quoteReference || "",
      quoteNumber: content?.quoteNumber || "",
      invoiceNumber: content?.invoiceNumber || "",
      quoteDate: content?.quoteDate || "",
      invoiceDate: content?.invoiceDate || "",
      currency: content?.currency || "USD",
      lineItems: (content?.lineItems || []).map((item) => ({ ...item })),
      materialItems: (content?.materialItems || []).map((item) => ({ ...item })),
      laborItems: (content?.laborItems || []).map((item) => ({ ...item })),
    },
    workspace: {
      activeDocument: type,
      instructions,
      manualOverrides: { ...manualOverrides },
      privateReminders: reconciliation.privateReminders.map((item) => ({ ...item })),
    },
    photos: photos.map((photo) => savedPhoto(
      photo,
      photoAssignments[photo.id] || defaultBusinessDocumentPhotoAssignment()
    )).filter(Boolean),
  };
}

export function hasMeaningfulBusinessDocumentDraft(payload = {}) {
  const content = payload.content || {};
  return Boolean(
    Object.entries(content).some(([key, value]) =>
      Array.isArray(value)
        ? value.some((row) => Object.values(row || {}).some((item) => String(item || "").trim()))
        : key !== "currency" && String(value || "").trim()
    ) ||
    payload.workspace?.instructions?.length ||
    payload.workspace?.privateReminders?.length ||
    payload.photos?.length
  );
}

export function restoreBusinessDocumentDraft(document) {
  const turns = (document.workspace?.instructions || []).map((turn) => ({ ...turn, editing: false }));
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
  };
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
