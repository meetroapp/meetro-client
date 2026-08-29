import { authFetch } from "./authFetch.js";
import { validateCanonicalQuotes } from "./canonicalQuoteRead.js";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function moneyText(value) {
  const normalized = String(value || "").replace(/[$,\s]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? String(amount) : "";
}

function appendCustomerNote(current, addition) {
  const existing = cleanText(current);
  const next = cleanText(addition);
  if (!existing) return next;
  if (!next || existing.toLocaleLowerCase().includes(next.toLocaleLowerCase())) return existing;
  return `${existing}\n\n${next}`;
}

function nextWeekdayIso(weekday, now = new Date()) {
  const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const target = names.indexOf(String(weekday || "").toLocaleLowerCase());
  if (target < 0) return "";
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let days = (target - date.getDay() + 7) % 7;
  if (days === 0) days = 7;
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function extraWorkDescription(text) {
  const match = text.match(/\b(?:for|to cover)\s+(?:the\s+)?(.+?)(?:[.!?]|$)/i);
  const description = cleanText(match?.[1] || "Additional work")
    .replace(/^(?:extra|additional)\s+work\s+(?:on|for)\s+/i, "")
    .replace(/^(.)/, (letter) => letter.toUpperCase());
  return description || "Additional work";
}

export function invoiceReviewFingerprint(invoice = {}) {
  return JSON.stringify({
    notes: String(invoice.notes || ""),
    paymentTerms: String(invoice.paymentTerms || ""),
    dueDate: String(invoice.dueDate || ""),
    lineItems: Array.isArray(invoice.lineItems) ? invoice.lineItems : [],
  });
}

export function buildInvoiceConversationProposal({ instruction, current = {}, now = new Date() } = {}) {
  const text = cleanText(instruction);
  const patch = {};
  const recognizedChanges = [];
  let category = "";

  if (/\b(?:bill(?:ed|ing)?|invoice(?:d|ing)?)\s+separately\b/i.test(text)) {
    category = "CUSTOMER_NOTE";
    patch.notes = appendCustomerNote(
      current.notes,
      "Additional work discussed with the customer will be billed separately and is not included on this invoice."
    );
    recognizedChanges.push("Customer notes");
  } else {
    const extraAmount = text.match(/\b(?:add|charge|include)\s+\$?\s*([\d,.]+)(?:\s*(?:dollars?|usd))?\b/i);
    if (extraAmount && /\b(?:additional|extra|repair|work|service|labor|material)/i.test(text)) {
      const unitPrice = moneyText(extraAmount[1]);
      if (unitPrice) {
        category = "EXTRA_WORK";
        patch.lineItems = [
          ...(Array.isArray(current.lineItems) ? current.lineItems : []),
          {
            id: `extra-work-${Date.now()}`,
            description: extraWorkDescription(text),
            quantity: "1",
            unitPrice,
          },
        ];
        recognizedChanges.push("Extra work");
      }
    }
  }

  if (!recognizedChanges.length && /\bthank(?:-|\s)?you\b/i.test(text)) {
    category = "CUSTOMER_NOTE";
    patch.notes = appendCustomerNote(
      current.notes,
      "Thank you for your business. We appreciate the opportunity to help."
    );
    recognizedChanges.push("Customer notes");
  }

  const paymentTerms = text.match(/\b(?:payment\s+terms?\s*(?:to|are|is|:)?\s*|make\s+(?:the\s+)?payment\s+terms?\s+)(net\s*\d+)\b/i);
  if (paymentTerms) {
    category = category || "PAYMENT_TERMS";
    patch.paymentTerms = paymentTerms[1].replace(/net\s*/i, "Net ");
    recognizedChanges.push("Payment terms");
  }

  const dueWeekday = text.match(/\bdue\s+(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  const dueDate = text.match(/\bdue\s+(?:on\s+)?(\d{4}-\d{2}-\d{2})\b/i);
  const resolvedDueDate = dueDate?.[1] || nextWeekdayIso(dueWeekday?.[1], now);
  if (resolvedDueDate) {
    category = category || "DUE_DATE";
    patch.dueDate = resolvedDueDate;
    recognizedChanges.push("Due date");
  }

  return Object.freeze({
    instruction: text,
    category,
    patch: Object.freeze(patch),
    recognizedChanges: Object.freeze(recognizedChanges),
    baselineFingerprint: invoiceReviewFingerprint(current),
  });
}

export function invoiceReviewFinancials({ preparation, invoice = {} } = {}) {
  const approvedMinor = Number(preparation?.approvedAmount?.totalMinor || 0);
  const paymentsReceivedMinor = Number(preparation?.paymentsReceivedMinor || 0);
  const extraWorkMinor = (Array.isArray(invoice.lineItems) ? invoice.lineItems : []).reduce((sum, item) => {
    const quantity = Number(item?.quantity || 0);
    const unitPrice = Number(item?.unitPrice ?? item?.amount ?? item?.total ?? 0);
    const amountMinor = Math.round(quantity * unitPrice * 100);
    return Number.isSafeInteger(amountMinor) && amountMinor > 0 ? sum + amountMinor : sum;
  }, 0);
  const totalMinor = approvedMinor + extraWorkMinor;
  return Object.freeze({
    approvedMinor,
    extraWorkMinor,
    totalMinor,
    paymentsReceivedMinor,
    amountStillDueMinor: Math.max(0, totalMinor - paymentsReceivedMinor),
  });
}

export function selectEffectiveApprovedInvoiceQuote(quotes, { approvedTotalMinor } = {}) {
  const approved = (Array.isArray(quotes) ? quotes : []).filter(
    (quote) => quote?.status === "ISSUED" && quote?.decisionState === "APPROVED"
  );
  const approvedParentIds = new Set(
    approved.map((quote) => quote.parentQuoteId).filter(Boolean)
  );
  const leaves = approved.filter((quote) => !approvedParentIds.has(quote.id));
  const matching = Number.isSafeInteger(Number(approvedTotalMinor))
    ? leaves.filter((quote) => Number(quote.totalMinor) === Number(approvedTotalMinor))
    : leaves;
  return matching.length === 1 ? matching[0] : null;
}

export async function fetchEffectiveApprovedInvoiceQuote({
  jobId,
  approvedTotalMinor,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const { response, data } = await authFetchImpl(
    `/jobs/${encodeURIComponent(jobId)}/quotes`,
    { method: "GET", cache: "no-store" },
    setPage
  );
  const quotes = response?.ok && data?.success === true
    ? validateCanonicalQuotes(data.quotes, { jobId })
    : null;
  const quote = selectEffectiveApprovedInvoiceQuote(quotes, { approvedTotalMinor });
  if (!quote) {
    const error = new Error("The effective approved Quote reference is unavailable for this Invoice.");
    error.code = "INVOICE_QUOTE_REFERENCE_READ_GAP";
    throw error;
  }
  return Object.freeze({
    quoteId: quote.id,
    quoteVersion: quote.decisionVersion,
    documentNumber: quote.documentNumber || null,
  });
}
