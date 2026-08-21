import { buildQuickQuoteConversationPatch } from "./quickQuoteConversationDraft.js";
import {
  buildBusinessDocumentAgreementPatch,
  normalizeBusinessDocumentAgreement,
} from "./businessDocumentAgreement.js";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function amount(value) {
  const parsed = Number(String(value || "").replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : "";
}

export function normalizeBusinessDocumentTab(value) {
  return value === "invoice" ? "invoice" : "quote";
}

export function buildInvoiceConversationPatch({ instruction } = {}) {
  const text = cleanText(instruction);
  if (!text) return Object.freeze({});

  const patch = {};
  const shared = buildQuickQuoteConversationPatch({ prompt: text });
  const customer = text.match(/\b(?:customer|client)\s+is\s+([^.!?]+)/i);
  const total = text.match(
    /(?:^|[.!?;]\s*)(?:invoice\s+total|total\s+due|amount)\s*(?:is|to|:)?\s*\$?\s*([\d,.]+)/i
  );
  const note = text.match(/\b(?:invoice\s+)?note\s*:\s*([^.!?]+)/i);
  const terms = text.match(/\b(?:payment\s+terms?|terms?)\s*:\s*([^.!?]+)/i);
  const work = text.match(
    /\b(?:work\s+completed|completed\s+work|work\s+performed)\s*:\s*([^.!?]+)/i
  );

  const photoOnly = /\b(?:photos?|images?)\b/i.test(text);
  if (shared.customerName || customer) patch.customerName = cleanText(shared.customerName || customer[1]);
  if (shared.projectTitle && !note && !terms && !work && !photoOnly) patch.projectTitle = shared.projectTitle;
  if (total || shared.totalOverride) patch.totalOverride = amount(total?.[1] || shared.totalOverride);
  const lineItems = [
    ...(shared.materialItems || []).map((item) => ({ description: item.name, total: item.total })),
    ...(shared.laborItems || []).map((item) => ({
      description: item.description,
      hours: item.hours,
      rate: item.rate,
      total: item.total,
    })),
  ];
  if (lineItems.length) patch.lineItems = lineItems;
  if (note) patch.notes = cleanText(note[1]);
  if (terms) patch.paymentTerms = cleanText(terms[1]);
  if (work) patch.workPerformed = cleanText(work[1]);

  if (/\b(?:everything|all work)\s+was\s+completed\s+as\s+quoted\b/i.test(text)) {
    patch.workPerformed = "All approved work was completed as quoted.";
  }

  if (/\b(?:keep|make)\s+(?:that|this|it)\s+private\b|\bdon['’]t\s+show\s+(?:that|this|it)\s+to\s+the\s+customer\b/i.test(text)) {
    patch.privateReminder = text;
  }

  if (/\b(?:these|those|the)\s+(?:photos?|images?)\s+(?:are|as)\s+after\b|\buse\s+(?:these|those)\s+as\s+after\s+photos?\b/i.test(text)) {
    patch.photoIntent = "after";
  }

  if (/\buse\s+(?:the\s+)?quote\s+photos?\s+as\s+before\s+photos?\b/i.test(text)) {
    patch.photoIntent = "before";
  }

  return Object.freeze(patch);
}

export function buildBusinessDocumentConversationPatch({
  documentType,
  instruction,
  current = {},
  revision,
} = {}) {
  const privateInstruction = /\b(?:keep|make)\s+(?:that|this|it)\s+private\b|\bdon['’]t\s+show\s+(?:that|this|it)\s+to\s+the\s+customer\b/i.test(
    cleanText(instruction)
  );

  if (privateInstruction) {
    return Object.freeze({ privateReminder: cleanText(instruction) });
  }

  if (normalizeBusinessDocumentTab(documentType) === "invoice") {
    return buildInvoiceConversationPatch({ instruction, current });
  }

  const quotePatch = buildQuickQuoteConversationPatch({
    prompt: instruction,
    current,
    revision: revision ?? Boolean(
      cleanText(current.projectDescription) ||
      cleanText(current.customerName) ||
      cleanText(current.totalOverride)
    ),
  });
  const agreementPatch = buildBusinessDocumentAgreementPatch(
    instruction,
    current.agreement
  );
  const customerQuotePatch = { ...quotePatch };
  if (Object.keys(agreementPatch).length) {
    delete customerQuotePatch.projectTitle;
    delete customerQuotePatch.projectDescription;
    delete customerQuotePatch.recommendedSolution;
  }
  return Object.freeze({
    ...customerQuotePatch,
    ...(Object.keys(agreementPatch).length ? {
      agreement: { ...normalizeBusinessDocumentAgreement(current.agreement), ...agreementPatch },
    } : {}),
  });
}

function hasRowValue(row = {}) {
  return [
    row.description,
    row.name,
    row.total,
    row.amount,
    row.quantity,
    row.unitPrice,
    row.cost,
    row.hours,
    row.rate,
  ].some((value) => cleanText(value));
}

function rowIdentity(row = {}) {
  return cleanText(row.description || row.name).toLowerCase();
}

function mergeRows(current = [], incoming = []) {
  const next = (Array.isArray(current) ? current : []).filter(hasRowValue).map((row) => ({ ...row }));
  (Array.isArray(incoming) ? incoming : []).filter(hasRowValue).forEach((row) => {
    const identity = rowIdentity(row);
    const existingIndex = identity
      ? next.findIndex((candidate) => rowIdentity(candidate) === identity)
      : -1;
    if (existingIndex >= 0) next[existingIndex] = { ...next[existingIndex], ...row };
    else next.push({ ...row });
  });
  return next;
}

export function mergeBusinessDocumentDraft(current = {}, patch = {}) {
  const next = { ...current, ...patch };
  if (Object.hasOwn(patch, "agreement")) {
    next.agreement = normalizeBusinessDocumentAgreement({
      ...normalizeBusinessDocumentAgreement(current.agreement),
      ...patch.agreement,
    });
  }
  for (const key of ["lineItems", "materialItems", "laborItems"]) {
    if (Object.hasOwn(patch, key)) next[key] = mergeRows(current[key], patch[key]);
  }
  return Object.freeze(next);
}

export function reconcileBusinessDocumentInstructions({
  documentType,
  baseline = {},
  instructions = [],
  manualOverrides = {},
} = {}) {
  let draft = { ...baseline };
  const privateReminders = [];
  const photoIntents = [];

  instructions.forEach((entry, index) => {
    const instruction = cleanText(typeof entry === "string" ? entry : entry?.text);
    if (!instruction) return;
    const patch = buildBusinessDocumentConversationPatch({
      documentType,
      instruction,
      current: draft,
      revision: index > 0,
    });
    const { privateReminder, photoIntent, ...documentPatch } = patch;
    if (privateReminder) privateReminders.push({ id: entry?.id || `instruction-${index}`, text: privateReminder });
    if (photoIntent) photoIntents.push({ id: entry?.id || `instruction-${index}`, intent: photoIntent });
    draft = mergeBusinessDocumentDraft(draft, documentPatch);
  });

  draft = mergeBusinessDocumentDraft(draft, manualOverrides);
  for (const key of ["lineItems", "materialItems", "laborItems"]) {
    if (Object.hasOwn(manualOverrides, key)) {
      draft = { ...draft, [key]: (manualOverrides[key] || []).filter(hasRowValue).map((row) => ({ ...row })) };
    }
  }

  return Object.freeze({
    draft: Object.freeze(draft),
    privateReminders: Object.freeze(privateReminders),
    photoIntents: Object.freeze(photoIntents),
  });
}

export function createInvoiceContinuityDraft({ job = {}, quote = {} } = {}) {
  const approved = ["APPROVED", "ACCEPTED"].includes(
    String(quote.canonicalStatus || "").toUpperCase()
  );
  const confirmedTotal = approved ? amount(quote.confirmedTotal) : "";

  return Object.freeze({
    customerName: cleanText(job.customerName || quote.customerName),
    customerEmail: cleanText(job.customerEmail || quote.customerEmail),
    serviceAddress: cleanText(job.location || quote.customerLocation),
    projectTitle: cleanText(job.title || quote.projectTitle),
    quoteReference: approved ? cleanText(quote.quoteNumber) : "",
    dueDate: "",
    workPerformed: "",
    notes: "",
    paymentTerms: "",
    totalOverride: confirmedTotal,
  });
}

export function customerVisibleWorkspaceDraft(draft = {}) {
  const customerVisible = { ...draft };
  delete customerVisible.privateReminder;
  delete customerVisible.privateCosts;
  delete customerVisible.privatePhotos;

  return Object.freeze(customerVisible);
}
