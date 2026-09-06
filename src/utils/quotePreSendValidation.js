import {
  normalizeQuotePricingSettings,
  quoteCustomerPricingProjection,
} from "./quotePricingPresentation.js";

const PLACEHOLDER_PATTERN = /^(?:tbd|tba|todo|placeholder|lorem ipsum|n\/?a|none|enter(?:\s+.+)?|add(?:\s+.+)?|describe(?:\s+.+)?|scope(?:\s+of\s+work)?|test)$/i;
const GENERIC_SCOPE_PATTERN = /^(?:labor|materials?|service|repair|work|project|installation|job)(?:\s+(?:and|&|\/)\s+(?:labor|materials?|service|repair|work|project|installation|job))*$/i;
const OPTIONAL_CUSTOMER_FIELDS = Object.freeze([
  ["paymentTerms", "payment terms"],
  ["terms", "payment terms"],
  ["estimatedDuration", "estimated duration"],
  ["notes", "customer notes"],
]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function amountText(value) {
  return String(value ?? "").trim();
}

function parseMoney(value) {
  const raw = amountText(value);
  if (!raw) return { empty: true, minor: null };
  if (typeof value !== "string") return { error: true };
  const match = raw.match(
    /^\$?(?:(?:0|[1-9]\d*)|(?:[1-9]\d{0,2}(?:,\d{3})+))(?:\.(\d{1,2}))?$/
  );
  if (!match) return { error: true };
  const numeric = raw.replace(/^\$/, "").replaceAll(",", "");
  const [whole, fraction = ""] = numeric.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor <= 9_000_000_000_000
    ? { minor }
    : { error: true };
}

function result(blockingErrors = [], warnings = []) {
  const frozenBlocking = Object.freeze(
    blockingErrors.map((item) => Object.freeze({ ...item }))
  );
  const frozenWarnings = Object.freeze(
    warnings.map((item) => Object.freeze({ ...item }))
  );
  return Object.freeze({
    ready: frozenBlocking.length === 0,
    blockingErrors: frozenBlocking,
    warnings: frozenWarnings,
  });
}

function problem(code, field, message) {
  return { code, field, message };
}

function depositIsRequired(source = {}) {
  const legacy = source.depositRequired;
  return (
    legacy === true ||
    ["yes", "true", "required"].includes(String(legacy ?? "").trim().toLowerCase()) ||
    ["PERCENT", "FIXED"].includes(String(source.depositMode ?? "").trim().toUpperCase())
  );
}

function rowDescription(row = {}) {
  return text(row.description || row.name);
}

function quoteScopeDescriptions(source = {}) {
  if (amountText(source.totalOverride)) {
    return [text(source.projectTitle || source.projectDescription || source.recommendedSolution)].filter(Boolean);
  }
  return [
    ...(source.lineItems || []),
    ...(source.laborItems || []),
    ...(String(source.materialsDisplayMode || "").toUpperCase() === "CUSTOMER_PROVIDES" ? [] : source.materialItems || []),
  ].map(rowDescription).filter(Boolean);
}

function rawCommercialValues(source = {}) {
  const values = [];
  for (const field of ["totalOverride", "subtotal", "discount", "tax", "fees"]) {
    if (amountText(source[field])) values.push(source[field]);
  }
  for (const row of [...(source.lineItems || []), ...(source.laborItems || []), ...(source.materialItems || [])]) {
    for (const field of ["total", "amount", "unitPrice", "cost", "rate"]) {
      if (amountText(row?.[field])) values.push(row[field]);
    }
  }
  return values;
}

function depositTermsContradict(source, pricing) {
  const terms = text(source.paymentTerms || source.terms);
  if (!terms) return false;
  const percents = [...terms.matchAll(/(\d{1,3}(?:\.\d+)?)\s*(?:%|percent)\s*(?:deposit|down\s+payment)\b/gi)]
    .map((match) => Number(match[1]));
  const fixed = [...terms.matchAll(/(?:deposit|down payment)[^$\n]{0,40}\$([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi)]
    .map((match) => parseMoney(match[1]).minor)
    .filter(Number.isSafeInteger);
  if (pricing.depositMode === "NONE") return percents.length > 0 || fixed.length > 0;
  if (pricing.depositMode === "PERCENT") {
    return fixed.length > 0 || new Set(percents).size > 1 ||
      (percents.length > 0 && percents[0] !== pricing.depositPercent);
  }
  return percents.length > 0 || new Set(fixed).size > 1 ||
    (fixed.length > 0 && fixed[0] !== Math.round(pricing.depositFixedAmount * 100));
}

export function validateQuotePreSend(source = {}) {
  const blockingErrors = [];
  const warnings = [];
  const pricing = normalizeQuotePricingSettings(source);
  const projection = quoteCustomerPricingProjection(source);
  const descriptions = quoteScopeDescriptions(source);

  if (!text(source.customerName)) blockingErrors.push(problem("QUOTE_CUSTOMER_REQUIRED", "customerName", "Choose or enter the customer for this Quote."));
  if (!text(source.projectTitle || source.projectDescription)) blockingErrors.push(problem("QUOTE_PROJECT_REQUIRED", "projectTitle", "Choose or enter the Job or project for this Quote."));
  if (!descriptions.length) {
    blockingErrors.push(problem("QUOTE_SCOPE_REQUIRED", "scope", "Add at least one customer-facing scope item before sending."));
  } else if (descriptions.some((description) => PLACEHOLDER_PATTERN.test(description))) {
    blockingErrors.push(problem("QUOTE_SCOPE_PLACEHOLDER", "scope", "Replace placeholder scope text with the work the customer is being quoted."));
  }

  const malformedCommercialValue = rawCommercialValues(source).some((value) => parseMoney(value).error);
  const subtotal = parseMoney(source.subtotal);
  if (malformedCommercialValue) {
    blockingErrors.push(problem("QUOTE_TOTAL_INVALID", "amount", "Correct the malformed Quote amount before sending."));
  } else if (!subtotal.empty && !amountText(source.totalOverride) && subtotal.minor !== Math.round(projection.total * 100)) {
    blockingErrors.push(problem("QUOTE_TOTAL_INCONSISTENT", "amount", "The Quote subtotal does not match its included pricing."));
  } else if (!Number.isFinite(projection.total) || projection.total <= 0) {
    blockingErrors.push(problem("QUOTE_TOTAL_REQUIRED", "amount", "Enter a Quote total greater than $0 before sending."));
  }

  const explicitlyRequired = depositIsRequired(source);
  if (explicitlyRequired && pricing.depositMode === "NONE") {
    blockingErrors.push(problem("DEPOSIT_VALUE_REQUIRED", "deposit", "A deposit is required for this Quote, but no deposit amount or percentage has been entered."));
  } else if (pricing.depositMode === "PERCENT") {
    const percentRaw = amountText(source.depositPercent);
    const percent = Number(percentRaw);
    if (!percentRaw) blockingErrors.push(problem("DEPOSIT_VALUE_REQUIRED", "deposit", "A deposit is required for this Quote, but no deposit amount or percentage has been entered."));
    else if (!Number.isFinite(percent) || percent <= 0 || percent > 100) blockingErrors.push(problem("DEPOSIT_PERCENT_INVALID", "deposit", "Enter a deposit percentage greater than 0 and no more than 100."));
  } else if (pricing.depositMode === "FIXED") {
    const fixed = parseMoney(source.depositFixedAmount ?? source.depositAmount);
    if (fixed.empty) blockingErrors.push(problem("DEPOSIT_VALUE_REQUIRED", "deposit", "A deposit is required for this Quote, but no deposit amount or percentage has been entered."));
    else if (fixed.error || fixed.minor <= 0) blockingErrors.push(problem("DEPOSIT_FIXED_INVALID", "deposit", "Enter a fixed deposit amount greater than $0."));
    else if (fixed.minor > Math.round(projection.total * 100)) blockingErrors.push(problem("DEPOSIT_EXCEEDS_QUOTE_TOTAL", "deposit", "The fixed deposit cannot exceed the Quote total."));
  }

  if (!blockingErrors.some((item) => item.field === "deposit") && depositTermsContradict(source, pricing)) {
    blockingErrors.push(problem("DEPOSIT_TERMS_CONTRADICT", "deposit", "The structured deposit and customer-facing payment terms contradict each other."));
  }

  const paymentTerms = text(source.paymentTerms || source.terms);
  if (!paymentTerms && pricing.depositMode === "NONE") warnings.push(problem("QUOTE_PAYMENT_TERMS_MISSING", "terms", "Add payment terms so the customer knows when payment is expected."));
  if (!text(source.estimatedDuration || source.timeline)) warnings.push(problem("QUOTE_DURATION_MISSING", "estimatedDuration", "Add an estimated duration or scheduling expectation for the customer."));
  if (descriptions.length === 1 && (descriptions[0].length < 12 || GENERIC_SCOPE_PATTERN.test(descriptions[0])) && !PLACEHOLDER_PATTERN.test(descriptions[0])) {
    warnings.push(problem("QUOTE_SCOPE_SPARSE", "scope", "Review the scope; it may be too brief or generic for the customer."));
  }
  const optionalPlaceholders = OPTIONAL_CUSTOMER_FIELDS
    .filter(([field]) => text(source[field]) && PLACEHOLDER_PATTERN.test(text(source[field])))
    .map(([, label]) => label);
  if (optionalPlaceholders.length) warnings.push(problem("QUOTE_OPTIONAL_PLACEHOLDER", optionalPlaceholders[0] === "payment terms" ? "terms" : "details", `Replace placeholder text in ${[...new Set(optionalPlaceholders)].join(" and ")}, or remove it.`));
  if (String(source.materialsDisplayMode || "").toUpperCase() === "CUSTOMER_PROVIDES" && !text(source.agreement?.customerResponsibilities)) {
    warnings.push(problem("QUOTE_CUSTOMER_RESPONSIBILITIES_MISSING", "agreement", "Clarify the customer's material responsibilities before sending."));
  }
  return result(blockingErrors, warnings);
}

function positiveDocumentVersion(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function shouldValidateQuotePreSendForDelivery({ documentType, documentVersion, currentContentChanged = false, issued = false, deliveries = [] } = {}) {
  if (String(documentType || "").trim().toUpperCase() !== "QUOTE") return false;
  if (issued === true) return false;
  if (currentContentChanged === true) return true;
  const version = positiveDocumentVersion(documentVersion);
  if (!version) return true;
  const exactVersionAlreadyDelivered = Array.isArray(deliveries) && deliveries.some((delivery) => positiveDocumentVersion(delivery?.documentVersion) === version && delivery?.state !== "FAILED");
  return !exactVersionAlreadyDelivered;
}
