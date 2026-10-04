export const QUOTE_PRICING_DISPLAY_MODES = Object.freeze([
  "TOTAL_ONLY",
  "CATEGORY_BREAKDOWN",
  "DETAILED_LINE_ITEMS",
]);

export const QUOTE_MATERIALS_DISPLAY_MODES = Object.freeze([
  "INCLUDED_IN_TOTAL",
  "SHOW_SEPARATELY",
  "CUSTOMER_PROVIDES",
]);

export const QUOTE_DEPOSIT_MODES = Object.freeze([
  "NONE",
  "PERCENT",
  "FIXED",
]);

function enumValue(value, values, fallback) {
  const normalized = String(value || "").trim().toUpperCase();
  return values.includes(normalized) ? normalized : fallback;
}

function amount(value) {
  const normalized = String(value ?? "").replace(/[$,\s]/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function rounded(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function rowAmount(row = {}, quantityKey = "quantity", priceKey = "unitPrice") {
  const direct = amount(row.total ?? row.amount);
  if (direct !== null && String(row.total ?? row.amount ?? "").trim()) return direct;
  const quantity = amount(row[quantityKey]);
  const price = amount(row[priceKey]);
  return quantity !== null && price !== null ? rounded(quantity * price) : 0;
}

function visibleRow(row, description, value) {
  const safeDescription = String(description || "").trim();
  return safeDescription && value > 0
    ? Object.freeze({ ...row, description: safeDescription, amount: rounded(value) })
    : null;
}

export function normalizeQuotePricingSettings(source = {}) {
  const legacyDeposit = String(source.depositRequired || "").trim().toLowerCase();
  const legacyFixed = amount(source.depositAmount);
  let depositMode = enumValue(source.depositMode, QUOTE_DEPOSIT_MODES, "NONE");
  if (!source.depositMode && legacyDeposit === "yes" && legacyFixed) depositMode = "FIXED";
  const depositPercent = amount(source.depositPercent);
  const depositFixedAmount = amount(source.depositFixedAmount ?? source.depositAmount);
  return Object.freeze({
    pricingDisplayMode: enumValue(
      source.pricingDisplayMode,
      QUOTE_PRICING_DISPLAY_MODES,
      "DETAILED_LINE_ITEMS"
    ),
    materialsDisplayMode: enumValue(
      source.materialsDisplayMode,
      QUOTE_MATERIALS_DISPLAY_MODES,
      "SHOW_SEPARATELY"
    ),
    depositMode,
    depositPercent:
      depositMode === "PERCENT" && depositPercent !== null && depositPercent <= 100
        ? depositPercent
        : null,
    depositFixedAmount:
      depositMode === "FIXED" && depositFixedAmount !== null
        ? depositFixedAmount
        : null,
  });
}

export function calculateQuoteDeposit(total, source = {}) {
  const safeTotal = amount(total) ?? 0;
  const settings = normalizeQuotePricingSettings(source);
  if (settings.depositMode === "NONE") {
    return Object.freeze({ valid: true, mode: "NONE", due: 0, remaining: rounded(safeTotal) });
  }
  if (settings.depositMode === "PERCENT") {
    if (settings.depositPercent === null || settings.depositPercent > 100) {
      return Object.freeze({ valid: false, mode: "PERCENT", due: 0, remaining: rounded(safeTotal) });
    }
    const due = rounded(safeTotal * settings.depositPercent / 100);
    return Object.freeze({
      valid: true,
      mode: "PERCENT",
      percent: settings.depositPercent,
      due,
      remaining: rounded(Math.max(0, safeTotal - due)),
    });
  }
  if (settings.depositFixedAmount === null || settings.depositFixedAmount > safeTotal) {
    return Object.freeze({ valid: false, mode: "FIXED", due: 0, remaining: rounded(safeTotal) });
  }
  return Object.freeze({
    valid: true,
    mode: "FIXED",
    due: rounded(settings.depositFixedAmount),
    remaining: rounded(Math.max(0, safeTotal - settings.depositFixedAmount)),
  });
}

export function quoteCustomerPricingProjection(quote = {}) {
  const settings = normalizeQuotePricingSettings(quote);
  const serviceRows = (quote.lineItems || []).map((row) =>
    visibleRow(row, row.description, rowAmount(row))
  ).filter(Boolean);
  const laborRows = (quote.laborItems || []).map((row) =>
    visibleRow(row, row.description || "Labor", rowAmount(row, "hours", "rate"))
  ).filter(Boolean);
  const materialRows = (quote.materialItems || []).map((row) =>
    visibleRow(row, row.name || row.description || "Materials", rowAmount(row, "quantity", "cost"))
  ).filter(Boolean);
  const serviceTotal = serviceRows.reduce((sum, row) => sum + row.amount, 0);
  const laborTotal = laborRows.reduce((sum, row) => sum + row.amount, 0);
  const materialTotal = materialRows.reduce((sum, row) => sum + row.amount, 0);
  const fees = amount(quote.fees) ?? 0;
  const discount = amount(quote.discount) ?? 0;
  const tax = amount(quote.tax) ?? 0;
  const explicitTotal = amount(quote.totalOverride);
  const suppliedMaterialTotal = settings.materialsDisplayMode === "CUSTOMER_PROVIDES"
    ? 0
    : materialTotal;
  const calculatedTotal = rounded(Math.max(
    0,
    serviceTotal + laborTotal + suppliedMaterialTotal + fees - discount + tax
  ));
  const total = explicitTotal !== null && String(quote.totalOverride ?? "").trim()
    ? rounded(explicitTotal)
    : calculatedTotal;

  let rows = [];
  if (settings.pricingDisplayMode === "CATEGORY_BREAKDOWN") {
    const categories = [
      visibleRow({}, "Services", serviceTotal),
      visibleRow({}, "Labor", laborTotal),
      settings.materialsDisplayMode === "CUSTOMER_PROVIDES"
        ? null
        : visibleRow({}, "Materials", materialTotal),
    ].filter(Boolean);
    rows = categories;
  } else if (settings.pricingDisplayMode === "DETAILED_LINE_ITEMS") {
    rows = [
      ...serviceRows,
      ...laborRows,
      ...(settings.materialsDisplayMode === "CUSTOMER_PROVIDES" ? [] : materialRows),
    ];
  }

  const inclusionNote = settings.materialsDisplayMode === "CUSTOMER_PROVIDES"
    ? "Customer to provide materials"
    : settings.materialsDisplayMode === "INCLUDED_IN_TOTAL"
      ? "Labor and standard materials included"
      : "";
  const deposit = calculateQuoteDeposit(total, settings);
  return Object.freeze({
    ...settings,
    internal: Object.freeze({
      serviceRows: Object.freeze(serviceRows),
      laborRows: Object.freeze(laborRows),
      materialRows: Object.freeze(materialRows),
      serviceTotal: rounded(serviceTotal),
      laborTotal: rounded(laborTotal),
      materialTotal: rounded(materialTotal),
    }),
    customerRows: Object.freeze(rows),
    total,
    inclusionNote,
    deposit,
  });
}

export function quoteDepositTerms(source = {}, total = 0) {
  const settings = normalizeQuotePricingSettings(source);
  const deposit = calculateQuoteDeposit(total, settings);
  if (settings.depositMode === "NONE") return "";
  if (!deposit.valid) return "Deposit terms need review.";
  if (settings.depositMode === "PERCENT") {
    return `${settings.depositPercent}% deposit due on approval — $${deposit.due.toFixed(2)}. Remaining balance — $${deposit.remaining.toFixed(2)}.`;
  }
  return `Deposit due on approval — $${deposit.due.toFixed(2)}. Remaining balance — $${deposit.remaining.toFixed(2)}.`;
}

function normalizedGeneratedTerm(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(",", "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[.;:]+$/g, "");
}

function numberPattern(value) {
  const safe = Number(value);
  if (!Number.isFinite(safe)) return "(?!)";
  const text = String(safe).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Number.isInteger(safe) ? `${text}(?:\\.0+)?` : text;
}

function isGeneratedDepositTerm(value, deposit) {
  if (!deposit?.valid || deposit.mode === "NONE") return false;
  const term = normalizedGeneratedTerm(value);
  const due = numberPattern(deposit.due);
  const remaining = numberPattern(deposit.remaining);
  if (new RegExp(`^remaining balance\\s*-\\s*\\$?${remaining}$`).test(term)) return true;
  if (deposit.mode === "PERCENT") {
    const percent = numberPattern(deposit.percent);
    return new RegExp(
      `^${percent}% deposit(?: required| due on approval)?(?:\\s*-\\s*\\$?${due})?$`
    ).test(term);
  }
  return new RegExp(
    `^(?:deposit(?: required| due on approval)?(?:\\s*-\\s*\\$?${due})?|\\$?${due} deposit(?: required| due on approval)?)$`
  ).test(term);
}

export function quoteIndependentPaymentTerms(value, pricing = {}) {
  const deposit = pricing?.deposit;
  const groups = String(value || "")
    .split(/\s*·\s*|\r?\n+/)
    .map((group) => group.trim())
    .filter(Boolean)
    .map((group) => group
      .split(/(?<=[.!?])\s+(?=[A-Za-z0-9$])/)
      .map((term) => term.trim())
      .filter((term) => term && !isGeneratedDepositTerm(term, deposit))
      .join(" "))
    .filter(Boolean);
  return groups.join(" · ");
}
