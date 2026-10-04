import { listBusinessDocumentDrafts } from "./businessDocumentDraftApi.js";

export const QUOTE_INVOICE_FILE_TYPES = Object.freeze({
  QUOTE: Object.freeze({ label: "Quote", icon: "quickQuote" }),
  INVOICE: Object.freeze({ label: "Invoice", icon: "quickInvoice" }),
});

export function quoteInvoiceFileType(document) {
  return Object.hasOwn(QUOTE_INVOICE_FILE_TYPES, document?.documentType)
    ? QUOTE_INVOICE_FILE_TYPES[document.documentType]
    : null;
}

export async function listQuoteInvoiceSavedFiles({
  type = "", listDocuments = listBusinessDocumentDrafts, ...options
} = {}) {
  const types = type ? [type] : Object.keys(QUOTE_INVOICE_FILE_TYPES);
  if (types.some((value) => !Object.hasOwn(QUOTE_INVOICE_FILE_TYPES, value))) return [];
  const results = await Promise.all(types.map(async (documentType) => {
    const documents = await listDocuments({ ...options, type: documentType });
    // Enforce the drawer's boundary even if the API returns an unexpected type.
    return documents.filter((document) =>
      quoteInvoiceFileType(document) && document.documentType === documentType
    );
  }));
  return [...new Map(results.flat().map((document) => [document.id, document])).values()]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || left.id.localeCompare(right.id));
}
