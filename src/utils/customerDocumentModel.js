import { normalizeBusinessDocumentAgreement } from "./businessDocumentAgreement.js";

const SUPPORTED_LANGUAGES = new Set(["en", "es", "fr", "pt-BR"]);

function language(value) {
  return SUPPORTED_LANGUAGES.has(value) ? value : "en";
}

function text(value, maximum = 4000) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized.slice(0, maximum) : "";
}

function optionalText(value, maximum = 4000) {
  return text(value, maximum) || null;
}

function minor(value, { allowZero = true } = {}) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= (allowZero ? 0 : 1)
    ? amount
    : null;
}

function majorToMinor(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100)
    : 0;
}

function currency(value) {
  const normalized = text(value, 3).toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "USD";
}

function date(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : value.trim();
}

function list(values, maximum = 200) {
  return Array.isArray(values)
    ? values.map((value) => text(value, maximum)).filter(Boolean)
    : [];
}

function safeLogoUrl(value) {
  const normalized = text(value, 2000);
  if (/^data:image\/(?:png|jpeg);base64,[a-z0-9+/=]+$/i.test(normalized)) {
    return normalized;
  }
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function buildCustomerSafeBusinessBranding(source = {}, fallbackName = "Meetro Professional") {
  const name = text(
    source.displayName || source.businessName || source.business_name || source.name,
    200
  ) || fallbackName;
  const city = text(source.city || source.businessCity, 120);
  const state = text(source.state || source.stateProvince || source.state_province, 120);
  const regionCandidate = text(source.location || [city, state].filter(Boolean).join(", "), 240);
  const region = /\b\d+(?:\.\d+)?\s*(?:mi|miles?|km|kilometers?)\b/i.test(regionCandidate)
    ? ""
    : regionCandidate;
  return Object.freeze({
    name,
    logoUrl: safeLogoUrl(
      source.logo || source.logoUrl || source.logo_url || source.imageUrl || source.image_url
    ),
    phone: optionalText(source.phone || source.businessPhone || source.business_phone, 80),
    email: optionalText(source.email || source.businessEmail || source.business_email, 200),
    website: optionalText(source.website || source.businessWebsite || source.business_website, 240),
    region: region || null,
  });
}

function safeCustomerDocumentPhotoUrl(value) {
  const normalized = text(value, 2000);
  if (/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(normalized)) return normalized;
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function customerDocumentPhoto(photo, role) {
  const mediaId = text(photo?.media?.public_id || photo?.mediaId, 500);
  const imageUrl = safeCustomerDocumentPhotoUrl(
    photo?.media?.secure_url || photo?.imageUrl || photo?.dataUrl
  );
  if (!mediaId || !imageUrl) return null;
  return Object.freeze({
    mediaId,
    imageUrl,
    dataUrl: /^data:image\//i.test(imageUrl) ? imageUrl : null,
    format: optionalText(photo?.media?.format || photo?.format, 20),
    width: minor(photo?.media?.width || photo?.width),
    height: minor(photo?.media?.height || photo?.height),
    role,
  });
}

export function attachCustomerDocumentPhotoEvidence(model, groups = {}) {
  if (!model?.schemaVersion) return model;
  const projectPhotos = (groups.general || [])
    .map((photo) => customerDocumentPhoto(photo, "GENERAL_EVIDENCE"))
    .filter(Boolean);
  const beforePhotos = (groups.before || [])
    .map((photo) => customerDocumentPhoto(photo, "BEFORE"))
    .filter(Boolean);
  const afterPhotos = (groups.after || [])
    .map((photo) => customerDocumentPhoto(photo, "AFTER"))
    .filter(Boolean);
  return Object.freeze({
    ...model,
    photoEvidence: Object.freeze({
      projectPhotos: Object.freeze(projectPhotos),
      beforePhotos: Object.freeze(beforePhotos),
      afterPhotos: Object.freeze(afterPhotos),
    }),
  });
}

function quickQuoteScope(value) {
  let scope = text(value, 8000);
  if (!scope) return null;
  const commercialClauses = [
    /\b(?:duration|estimated\s+duration)\s*(?:is|:)?\s*\d+(?:\s*[–—-]\s*\d+)?\s*(?:hours?|hrs?|days?|weeks?|horas?|días?|dias?|semaines?|jours?|semanas?)\b/gi,
    /\b(?:about|around|approximately|aproximadamente|environ)\s+\d+(?:\s*[–—-]\s*\d+)?\s*(?:hours?|hrs?|days?|weeks?|horas?|días?|dias?|semaines?|jours?|semanas?)\b/gi,
    /\b(?:final\s+(?:price|selling\s+price)|project\s+price|total)\s*(?:is|:)?\s*\$?\s*[\d,.]+\b/gi,
    /\b(?:with\s+)?\d{1,3}\s*%\s*(?:deposit|down\s+payment)(?:\s+required)?\b/gi,
  ];
  for (const clause of commercialClauses) scope = scope.replace(clause, "");
  scope = scope
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([.!?])(?:\s*[.!?])+/g, "$1")
    .replace(/(?:^|[.!?]\s+)(?:and|with)\s+/gi, (match) => match.replace(/(?:and|with)\s+/i, ""))
    .replace(/(?:,\s*)?(?:and|with)\s*[.!?]?$/i, "")
    .replace(/^[,.;:\s]+|[,;:\s]+$/g, "")
    .trim();
  return scope || null;
}

function quickQuotePaymentTerms(value) {
  const terms = text(value, 5000);
  if (!terms) return null;
  return terms.replace(
    /\b(\d{1,3}\s*%)\s*(?:deposit|down\s+payment)\b(?!\s+required)/i,
    "$1 deposit required"
  );
}

function customer(source = {}) {
  return Object.freeze({
    name: optionalText(source.displayName || source.name || source.customerName, 200),
    phone: optionalText(source.phone || source.customerPhone, 80),
    email: optionalText(source.email || source.customerEmail, 200),
    address: optionalText(source.address || source.serviceAddress || source.location, 500),
  });
}

function lineItem({
  description,
  quantity = 1,
  unitAmountMinor = null,
  lineTotalMinor,
  pricingPresentation = "unit",
}) {
  const safeDescription = text(description, 1200);
  const safePricingPresentation =
    pricingPresentation === "flat" ? "flat" : "unit";
  const safeQuantity =
    safePricingPresentation === "flat" ? null : Number(quantity);
  const safeTotal = minor(lineTotalMinor);
  const safeUnit =
    safePricingPresentation === "flat"
      ? null
      : unitAmountMinor == null
      ? null
      : minor(unitAmountMinor);

  if (
    !safeDescription ||
    safeTotal == null ||
    (safePricingPresentation === "unit" &&
      (!Number.isFinite(safeQuantity) || safeQuantity <= 0))
  ) {
    return null;
  }

  return Object.freeze({
    description: safeDescription,
    quantity: safeQuantity,
    unitAmountMinor: safeUnit,
    lineTotalMinor: safeTotal,
    pricingPresentation: safePricingPresentation,
  });
}

function model({
  kind,
  draft,
  workingDraftStatus,
  locale,
  branding,
  documentNumber,
  documentDate,
  dueDate,
  status,
  customerDetails,
  projectTitle,
  projectLocation,
  lineItems,
  scopeSummary,
  observation,
  subtotalMinor,
  discountMinor,
  taxMinor,
  feesMinor,
  totalMinor,
  paidMinor,
  balanceMinor,
  paymentTerms,
  estimatedDuration,
  conditions,
  exclusions,
  notes,
  warrantyNotes,
  customerMessage,
  acceptance,
  agreement,
  currencyCode,
}) {
  return Object.freeze({
    schemaVersion: 1,
    kind,
    draft: draft === true,
    ...(draft === true ? { workingDraftStatus: workingDraftStatus === "SAVED" ? "SAVED" : "UNSAVED" } : {}),
    locale: language(locale),
    currency: currency(currencyCode),
    branding,
    documentNumber: optionalText(documentNumber, 120),
    documentDate: date(documentDate),
    dueDate: date(dueDate),
    status: optionalText(status, 120),
    customer: customerDetails,
    projectTitle: optionalText(projectTitle, 300),
    projectLocation: optionalText(projectLocation, 500),
    lineItems: Object.freeze(lineItems.filter(Boolean)),
    scopeSummary: optionalText(scopeSummary, 8000),
    observation: optionalText(observation, 8000),
    subtotalMinor: minor(subtotalMinor),
    discountMinor: minor(discountMinor),
    taxMinor: minor(taxMinor),
    feesMinor: minor(feesMinor),
    totalMinor: minor(totalMinor) ?? 0,
    paidMinor: paidMinor == null ? null : minor(paidMinor),
    balanceMinor: balanceMinor == null ? null : minor(balanceMinor),
    paymentTerms: optionalText(paymentTerms, 5000),
    estimatedDuration: optionalText(estimatedDuration, 1000),
    conditions: Object.freeze(list(conditions, 3000)),
    exclusions: Object.freeze(list(exclusions, 3000)),
    notes: optionalText(notes, 5000),
    warrantyNotes: optionalText(warrantyNotes, 3000),
    customerMessage: optionalText(customerMessage, 3000),
    acceptance: optionalText(acceptance, 500),
    ...(agreement ? { agreement: normalizeBusinessDocumentAgreement(agreement) } : {}),
  });
}

export function buildCanonicalQuoteDocumentModel(
  delivery,
  { locale = "en", branding = {}, quoteContext = {} } = {}
) {
  if (
    delivery?.source !== "PROFESSIONAL_QUOTE_DELIVERY" ||
    delivery.snapshot?.quoteId !== delivery.quoteId ||
    delivery.snapshot?.jobId !== delivery.jobId
  ) return null;
  const snapshot = delivery.snapshot;
  const lines = snapshot.scopeItems.map((item) => lineItem({
    description: item.description,
    quantity: item.quantity,
    unitAmountMinor: Number.isInteger(item.amountMinor / item.quantity)
      ? item.amountMinor / item.quantity
      : null,
    lineTotalMinor: item.amountMinor,
  }));
  if (lines.some((item) => !item)) return null;
  return model({
    kind: "QUOTE",
    draft: false,
    locale,
    branding: buildCustomerSafeBusinessBranding(
      { ...branding, displayName: snapshot.business.displayName },
      snapshot.business.displayName
    ),
    documentNumber: snapshot.lineageLabel,
    documentDate: snapshot.issuedAt,
    status: snapshot.businessStatus,
    customerDetails: customer(quoteContext.customer || {}),
    projectTitle: quoteContext.job?.title || snapshot.job?.title,
    projectLocation: quoteContext.job?.location,
    lineItems: lines,
    subtotalMinor: snapshot.totalMinor,
    totalMinor: snapshot.totalMinor,
    paymentTerms: quoteContext.paymentTerms,
    estimatedDuration: quoteContext.estimatedDuration,
    conditions: snapshot.conditions || [],
    exclusions: (snapshot.exclusions || []).map((item) => item.description),
    acceptance: snapshot.businessStatus === "APPROVED"
      ? "APPROVED"
      : snapshot.businessStatus === "DECLINED"
        ? "DECLINED"
        : "AWAITING_CUSTOMER_DECISION",
    currencyCode: snapshot.currency,
  });
}

export function buildCanonicalInvoiceDocumentModel(
  invoice,
  { locale = "en", branding = {} } = {}
) {
  if (!invoice?.invoiceId || !Array.isArray(invoice.lineItems)) return null;
  const lines = invoice.lineItems.map((item) => lineItem({
    description: item.description,
    quantity: item.quantity,
    unitAmountMinor: item.unitAmountMinor,
    lineTotalMinor: item.lineTotalMinor,
  }));
  if (lines.some((item) => !item)) return null;
  return model({
    kind: "INVOICE",
    draft: invoice.status === "DRAFT",
    locale,
    branding: buildCustomerSafeBusinessBranding(
      { ...branding, displayName: invoice.business?.displayName },
      invoice.business?.displayName || "Meetro Professional"
    ),
    documentNumber: invoice.invoiceNumber,
    documentDate: invoice.invoiceDate,
    dueDate: invoice.due?.mode === "SPECIFIC_DATE" ? invoice.due.date : null,
    status: invoice.status,
    customerDetails: customer(invoice.customer || {}),
    projectTitle: invoice.job?.title || invoice.job?.service,
    lineItems: lines,
    scopeSummary: invoice.job?.service,
    subtotalMinor: invoice.subtotalMinor,
    totalMinor: invoice.totalMinor,
    paidMinor: invoice.paidMinor,
    balanceMinor: invoice.balanceMinor,
    paymentTerms: invoice.terms || (invoice.due?.mode === "DUE_ON_RECEIPT" ? "DUE_ON_RECEIPT" : null),
    notes: invoice.customerNotes,
    acceptance: invoice.status,
    currencyCode: invoice.currency,
  });
}

export function buildQuickQuoteDocumentModel(
  draft,
  { locale = "en", branding = {}, workingDraftStatus = "UNSAVED" } = {}
) {
  const safeCurrency = currency(draft?.currency || "USD");
  const fixedPrice = draft?.fixedPrice === true;
  const lines = Array.isArray(draft?.lineItems)
    ? draft.lineItems.map((item) => {
        const pricingPresentation =
          item.pricingPresentation === "flat" ? "flat" : "unit";

        return lineItem({
          description: item.description,
          quantity:
            pricingPresentation === "flat"
              ? null
              : Number(item.quantity) || 1,
          unitAmountMinor:
            pricingPresentation === "flat"
              ? null
              : majorToMinor(item.unitPrice),
          lineTotalMinor: majorToMinor(item.total),
          pricingPresentation,
        });
      }).filter(
        (item) =>
          item &&
          (!fixedPrice ||
            item.lineTotalMinor > 0 ||
            (item.unitAmountMinor ?? 0) > 0)
      )
    : [];
  const subtotalMinor = majorToMinor(draft?.subtotal);
  const recommendedSolution = optionalText(draft?.recommendedSolution, 8000);
  const customerDescription = optionalText(draft?.projectDescription, 8000);
  return model({
    kind: "QUOTE",
    draft: true,
    workingDraftStatus,
    locale,
    branding: buildCustomerSafeBusinessBranding(branding),
    documentNumber: draft?.quoteNumber,
    documentDate: draft?.quoteDate,
    status: "DRAFT_PREVIEW",
    customerDetails: customer(draft || {}),
    projectTitle: draft?.projectTitle,
    projectLocation: draft?.customerLocation,
    lineItems: lines,
    scopeSummary: quickQuoteScope(
      draft?.scopeSummary || draft?.recommendedSolution || draft?.customerRequest || draft?.problemFound
    ),
    observation: recommendedSolution && customerDescription && recommendedSolution !== customerDescription
      ? customerDescription
      : null,
    subtotalMinor: fixedPrice && subtotalMinor === 0 ? undefined : subtotalMinor,
    discountMinor: majorToMinor(draft?.discount),
    taxMinor: majorToMinor(draft?.tax),
    feesMinor: majorToMinor(draft?.fees),
    totalMinor: majorToMinor(draft?.total),
    paymentTerms: quickQuotePaymentTerms(draft?.paymentTerms || draft?.terms),
    estimatedDuration: draft?.estimatedDuration || draft?.timeline,
    conditions: draft?.conditions || [],
    exclusions: draft?.exclusions || [],
    agreement: draft?.agreement,
    notes: draft?.notes,
    acceptance: "DRAFT_PREVIEW_NOT_ISSUED",
    currencyCode: safeCurrency,
  });
}

export function buildQuickInvoiceDocumentModel(
  draft,
  { locale = "en", branding = {}, workingDraftStatus = "UNSAVED" } = {}
) {
  const lines = Array.isArray(draft?.lineItems)
    ? draft.lineItems.map((item) => lineItem({
        description: item.description,
        quantity: Number(item.quantity) || 1,
        unitAmountMinor: majorToMinor(item.unitPrice),
        lineTotalMinor: majorToMinor(item.amount),
      }))
    : [];
  return model({
    kind: "INVOICE",
    draft: true,
    workingDraftStatus,
    locale,
    branding: buildCustomerSafeBusinessBranding(branding),
    documentNumber: draft?.invoiceNumber,
    documentDate: draft?.invoiceDate,
    dueDate: draft?.dueDate,
    status: "DRAFT_PREVIEW",
    customerDetails: customer(draft || {}),
    projectTitle: draft?.serviceDescription || draft?.service,
    projectLocation: draft?.serviceAddress,
    lineItems: lines,
    scopeSummary: draft?.workPerformed,
    subtotalMinor: majorToMinor(draft?.subtotal),
    discountMinor: majorToMinor(draft?.discount),
    taxMinor: majorToMinor(draft?.tax),
    feesMinor: majorToMinor(draft?.serviceFee) + majorToMinor(draft?.otherCharges),
    totalMinor: majorToMinor(draft?.total),
    paidMinor: 0,
    balanceMinor: majorToMinor(draft?.total),
    paymentTerms: draft?.paymentTerms,
    notes: draft?.notes,
    warrantyNotes: draft?.warrantyNotes,
    customerMessage: draft?.customerMessage,
    acceptance: "DRAFT_PREVIEW_NOT_RECORDED",
    currencyCode: draft?.currency || "USD",
  });
}
