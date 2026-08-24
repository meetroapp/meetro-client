import { normalizeBusinessDocumentAgreement } from "./businessDocumentAgreement.js";

const DETAIL_FIELDS = Object.freeze({
  quote: Object.freeze([
    Object.freeze(["customerName", "businessDocumentFieldCustomer"]),
    Object.freeze(["customerEmail", "businessDocumentFieldCustomerEmail"]),
    Object.freeze(["customerPhone", "businessDocumentFieldCustomerPhone"]),
    Object.freeze(["customerAddress", "businessDocumentFieldCustomerAddress"]),
    Object.freeze(["projectTitle", "businessDocumentFieldProject"]),
    Object.freeze(["recommendedSolution", "businessDocumentFieldScope"]),
    Object.freeze(["projectDescription", "businessDocumentFieldCustomerDescription"]),
    Object.freeze(["estimatedDuration", "businessDocumentFieldEstimatedDuration"]),
  ]),
  invoice: Object.freeze([
    Object.freeze(["customerName", "businessDocumentFieldCustomer"]),
    Object.freeze(["customerEmail", "businessDocumentFieldCustomerEmail"]),
    Object.freeze(["customerPhone", "businessDocumentFieldCustomerPhone"]),
    Object.freeze(["customerAddress", "businessDocumentFieldCustomerAddress"]),
    Object.freeze(["projectTitle", "businessDocumentFieldJob"]),
    Object.freeze(["workPerformed", "businessDocumentFieldWorkCompleted"]),
    Object.freeze(["dueDate", "businessDocumentFieldDueDate"]),
  ]),
});

function normalizedDocumentType(documentType) {
  return String(documentType || "").trim().toLowerCase() === "invoice"
    ? "invoice"
    : "quote";
}

export function businessDocumentDetailFields(documentType) {
  return DETAIL_FIELDS[normalizedDocumentType(documentType)];
}

export function cloneBusinessDocumentEditorSource(source = {}) {
  return {
    ...source,
    agreement: normalizeBusinessDocumentAgreement(source.agreement),
    lineItems: (source.lineItems || []).map((item) => ({ ...item })),
    materialItems: (source.materialItems || []).map((item) => ({ ...item })),
    laborItems: (source.laborItems || []).map((item) => ({ ...item })),
  };
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function mergeBusinessDocumentEditorSource({
  draft = {},
  previousSource = {},
  nextSource = {},
} = {}) {
  const nextDraft = cloneBusinessDocumentEditorSource(nextSource);

  for (const [key, value] of Object.entries(draft)) {
    if (!sameValue(value, previousSource[key])) {
      nextDraft[key] = value;
    }
  }

  return nextDraft;
}
