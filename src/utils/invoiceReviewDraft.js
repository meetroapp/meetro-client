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
  const workDetails = text.match(/(?:^|[,;]\s*)((?:replace|replaced|repair|repaired|install|installed)\b.+?)(?=,?\s*(?:extra|additional)\s+(?:charge|cost|work)\b|$)/i)?.[1];
  const match = text.match(/\b(?:for|to cover)\s+(?:the\s+)?(.+?)(?:[.!?]|$)/i);
  const description = cleanText(match?.[1] || workDetails?.replace(/[,;]\s*$/, "") || "Additional work")
    .replace(/^(?:extra|additional)\s+work\s+(?:on|for)\s+/i, "")
    .replace(/^(.)/, (letter) => letter.toUpperCase());
  return description || "Additional work";
}

export function invoiceReviewFingerprint(invoice = {}) {
  return JSON.stringify({
    workPerformed: String(invoice.workPerformed || ""),
    notes: String(invoice.notes || ""),
    paymentTerms: String(invoice.paymentTerms || ""),
    dueDate: String(invoice.dueDate || ""),
    lineItems: Array.isArray(invoice.lineItems) ? invoice.lineItems : [],
  });
}

export function buildInvoiceConversationProposal({ instruction, current = {}, now = new Date(), allowWorkPerformed = true } = {}) {
  const original = cleanText(instruction);
  const privateMatch = original.match(/(?:remind me privately|privately remind me|private reminder|recu[eé]rdame en privado)\s*(?:to|:)?\s*(.+)$/i);
  const text = cleanText(privateMatch ? original.slice(0, privateMatch.index).replace(/[,;]?(?:\s+and|\s+y)?\s*$/, "") : original);
  const patch = {};
  const recognizedChanges = [];
  let category = "";
  if (privateMatch) {
    patch.privateReminder = cleanText(privateMatch[1]).replace(/[.]$/, "");
    recognizedChanges.push("Private reminder · business only");
  }
  const completed = text.match(/(?:\bwe\s+)?\b(?:completed|finished|completamos|terminamos)\s+(?:the\s+|el\s+|la\s+)?([^,;.!?]+)/i);
  if (allowWorkPerformed && completed) {
    patch.workPerformed = `${cleanText(completed[1])} completed`;
    recognizedChanges.push("Work Completed");
  }

  if (/\b(?:bill(?:ed|ing)?|invoice(?:d|ing)?)\s+separately\b/i.test(text)) {
    category = "CUSTOMER_NOTE";
    patch.notes = appendCustomerNote(
      current.notes,
      "Additional work discussed with the customer will be billed separately and is not included on this invoice."
    );
    recognizedChanges.push("Customer notes");
  } else {
    // Currency is explicit, or a bare amount follows an unambiguous charge verb.
    // A unit after the number disqualifies a bare monetary interpretation.
    const extraText = text.split(/[,;](?!\d)/).find((clause) => /\b(?:add|charge|include|extra|additional|agrega|cobrar|adicional)\b/i.test(clause) && /\$|dollars?|usd|d[oó]lares|\b(?:charge|cost|price)\s+\d/i.test(clause)) || "";
    const extraAmount = extraText.match(/\$\s*([\d,]+(?:\.\d{1,2})?)\b|\b([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|usd|d[oó]lares)\b/i)
      || extraText.match(/\b(?:charge|extra charge|cost|price)\s+([\d,]+(?:\.\d{1,2})?)(?![\d.])(?!\s*(?:windows?|inches|hours?|years?|feet|cm|mm|ventanas?|horas?)\b)/i);
    if (extraAmount && /\b(?:additional|extra|repair|work|service|labor|material|trabajo|reparaci[oó]n)/i.test(text)) {
      const unitPrice = moneyText(extraAmount[1] || extraAmount[2]);
      if (unitPrice) {
        category = "EXTRA_WORK";
        patch.lineItems = [
          ...(Array.isArray(current.lineItems) ? current.lineItems : []),
          {
            id: `extra-work-${Date.now()}`,
            description: cleanText(text.match(/(?:^|[,;])\s*((?:replaced|repaired|installed|replace|reemplazamos|reparamos)\b.+?)\s+(?:for\s+)?(?:an?\s+)?(?:extra|additional|por)\s*\$/i)?.[1] || extraWorkDescription(text)),
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

  const dueWeekday = text.match(/\b(?:due|vence|vencimiento)\s+(?:on\s+|el\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i);
  const weekdays = { lunes: "monday", martes: "tuesday", miércoles: "wednesday", miercoles: "wednesday", jueves: "thursday", viernes: "friday", sábado: "saturday", sabado: "saturday", domingo: "sunday" };
  const dueDate = text.match(/\bdue\s+(?:on\s+)?(\d{4}-\d{2}-\d{2})\b/i);
  const resolvedDueDate = dueDate?.[1] || nextWeekdayIso(weekdays[dueWeekday?.[1]?.toLowerCase()] || dueWeekday?.[1], now);
  if (resolvedDueDate) {
    category = category || "DUE_DATE";
    patch.dueDate = resolvedDueDate;
    recognizedChanges.push("Due date");
  }

  const typedContext = [
    ...[...text.matchAll(/\b(\d+)\s+(windows?|doors?|ventanas?|puertas?)\b/gi)].map((match) => ({ type: "COUNT", value: Number(match[1]), unit: match[2] })),
    ...[...text.matchAll(/\b(\d+(?:\.\d+)?)\s+(inches|feet|cm|mm|pulgadas)\b/gi)].map((match) => ({ type: "MEASUREMENT", value: Number(match[1]), unit: match[2] })),
    ...[...text.matchAll(/\b(\d+(?:\.\d+)?)\s+(hours?|days?|horas?|d[ií]as?)\b/gi)].map((match) => ({ type: "DURATION", value: Number(match[1]), unit: match[2] })),
  ];
  return Object.freeze({
    typedContext: Object.freeze(typedContext),
    instruction: original,
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
