import { buildQuickQuoteConversationPatch } from "./quickQuoteConversationDraft.js";

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
  const customer = text.match(/\b(?:customer|client)\s+is\s+([^.!?]+)/i);
  const total = text.match(
    /(?:^|[.!?;]\s*)(?:invoice\s+total|total\s+due|amount)\s*(?:is|to|:)?\s*\$\s*([\d,.]+)/i
  );
  const note = text.match(/\b(?:invoice\s+)?note\s*:\s*([^.!?]+)/i);
  const terms = text.match(/\b(?:payment\s+terms?|terms?)\s*:\s*([^.!?]+)/i);
  const work = text.match(
    /\b(?:work\s+completed|completed\s+work|work\s+performed)\s*:\s*([^.!?]+)/i
  );

  if (customer) patch.customerName = cleanText(customer[1]);
  if (total) patch.totalOverride = amount(total[1]);
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
} = {}) {
  if (normalizeBusinessDocumentTab(documentType) === "invoice") {
    return buildInvoiceConversationPatch({ instruction, current });
  }

  const privateInstruction = /\b(?:keep|make)\s+(?:that|this|it)\s+private\b|\bdon['’]t\s+show\s+(?:that|this|it)\s+to\s+the\s+customer\b/i.test(
    cleanText(instruction)
  );

  if (privateInstruction) {
    return Object.freeze({ privateReminder: cleanText(instruction) });
  }

  return buildQuickQuoteConversationPatch({
    prompt: instruction,
    current,
    revision: Boolean(
      cleanText(current.projectDescription) ||
        cleanText(current.customerName) ||
        cleanText(current.totalOverride)
    ),
  });
}

export function createInvoiceContinuityDraft({ job = {}, quote = {} } = {}) {
  const approved = ["APPROVED", "ACCEPTED"].includes(
    String(quote.canonicalStatus || "").toUpperCase()
  );
  const confirmedTotal = approved ? amount(quote.confirmedTotal) : "";

  return Object.freeze({
    customerName: cleanText(job.customerName || quote.customerName),
    serviceAddress: cleanText(job.location || quote.customerLocation),
    projectTitle: cleanText(job.title || quote.projectTitle),
    quoteReference: approved ? cleanText(quote.quoteNumber) : "",
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
