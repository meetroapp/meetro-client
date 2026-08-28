import { normalizeCustomerTermsSnapshot } from "./customerQuoteDetailApi.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[0-9a-f]{64}$/i;
const MAX_MINOR_AMOUNT = 9_000_000_000_000;

export const CANONICAL_QUOTE_STATUSES = Object.freeze(["DRAFT", "ISSUED"]);
export const CANONICAL_QUOTE_VERSION_STATUSES = Object.freeze([
  "DRAFT",
  "ISSUED",
  "APPROVED",
  "DECLINED",
  "SUPERSEDED",
]);
export const CANONICAL_QUOTE_DECISIONS = Object.freeze([
  "APPROVED",
  "DECLINED",
]);
export const CANONICAL_QUOTE_LINEAGE_TYPES = Object.freeze([
  "REVISED_QUOTE",
  "SUPPLEMENTAL_QUOTE",
]);
export const CANONICAL_QUOTE_LINEAGE_REASONS = Object.freeze([
  "SCOPE_CHANGE",
  "PRICING_CHANGE",
  "CUSTOMER_DECLINED",
  "SUPPLEMENTAL_WORK",
  "OTHER",
]);
export const CANONICAL_QUOTE_CLASSIFICATIONS = Object.freeze([
  "MATERIAL",
  "LABOR_SERVICE",
]);
export const CANONICAL_QUOTE_SCOPE_SEMANTICS = Object.freeze([
  "COMPLETED_BILLABLE_SERVICE",
  "TEMPORARY_SERVICE",
  "FUTURE_WORK",
  "MATERIAL_INCLUDED",
  "MATERIAL_EXCLUDED",
  "CUSTOMER_SUPPLIED_MATERIAL",
  "SEPARATE_PROPOSAL",
]);
export const CANONICAL_MATERIAL_RESPONSIBILITIES = Object.freeze([
  "PROFESSIONAL_SUPPLIED",
  "CUSTOMER_SUPPLIED",
  "EXCLUDED",
  "PENDING_SELECTION",
  "NOT_APPLICABLE",
]);
export const CANONICAL_QUOTE_SOURCE_TYPES = Object.freeze([
  "FINDING",
  "RECOMMENDATION",
  "WORKSTREAM",
  "WORK_ACTIVITY",
  "WORKSTREAM_OBLIGATION",
  "MANUAL_PROFESSIONAL",
]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, keys) {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key))
  );
}

function canonicalUuid(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function nonnegativeInteger(value, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= maximum
    ? parsed
    : null;
}

function canonicalTimestamp(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function boundedText(value, maximum) {
  return typeof value === "string" && value.trim() && value.length <= maximum
    ? value
    : null;
}

function normalizeCustomerParty(value) {
  if (value == null) return null;
  const allowed = [
    "businessContactId",
    "customerRelationshipId",
    "contractorProfileId",
    "jobId",
    "linkedAt",
  ];
  if (!isPlainObject(value) || !Object.keys(value).every((key) => allowed.includes(key))) {
    return undefined;
  }
  const businessContactId = canonicalUuid(value.businessContactId);
  const customerRelationshipId = canonicalUuid(value.customerRelationshipId);
  const contractorProfileId = value.contractorProfileId == null
    ? null
    : positiveInteger(value.contractorProfileId);
  const jobId = value.jobId == null ? null : canonicalUuid(value.jobId);
  const linkedAt = value.linkedAt == null
    ? null
    : canonicalTimestamp(value.linkedAt);
  if (
    !businessContactId ||
    !customerRelationshipId ||
    (value.contractorProfileId != null && !contractorProfileId) ||
    (value.jobId != null && !jobId) ||
    (value.linkedAt != null && !linkedAt)
  ) return undefined;
  return {
    businessContactId,
    customerRelationshipId,
    ...(contractorProfileId ? { contractorProfileId } : {}),
    ...(jobId ? { jobId } : {}),
    ...(linkedAt ? { linkedAt } : {}),
  };
}

function canonicalCurrency(value) {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : null;
}

function normalizeCanonicalQuoteSource(value) {
  const keys = [
    "type",
    "version",
    "findingId",
    "recommendationId",
    "workstreamId",
    "activityId",
    "obligationId",
  ];
  if (!hasExactKeys(value, keys) || !CANONICAL_QUOTE_SOURCE_TYPES.includes(value.type)) {
    return null;
  }
  const version = value.version == null ? null : positiveInteger(value.version);
  const findingId = canonicalUuid(value.findingId, { nullable: true });
  const recommendationId = canonicalUuid(value.recommendationId, {
    nullable: true,
  });
  const workstreamId = canonicalUuid(value.workstreamId, { nullable: true });
  const activityId = canonicalUuid(value.activityId, { nullable: true });
  const obligationId = canonicalUuid(value.obligationId, { nullable: true });
  if (
    (value.version != null && !version) ||
    (value.findingId != null && !findingId) ||
    (value.recommendationId != null && !recommendationId) ||
    (value.workstreamId != null && !workstreamId) ||
    (value.activityId != null && !activityId) ||
    (value.obligationId != null && !obligationId)
  ) {
    return null;
  }
  const source = {
    type: value.type,
    version,
    findingId,
    recommendationId,
    workstreamId,
    activityId,
    obligationId,
  };
  const matches = {
    MANUAL_PROFESSIONAL:
      version == null &&
      !findingId &&
      !recommendationId &&
      !workstreamId &&
      !activityId &&
      !obligationId,
    FINDING:
      Boolean(version && findingId) &&
      !recommendationId &&
      !workstreamId &&
      !activityId &&
      !obligationId,
    RECOMMENDATION:
      Boolean(version && recommendationId) &&
      !findingId &&
      !workstreamId &&
      !activityId &&
      !obligationId,
    WORKSTREAM:
      Boolean(version && workstreamId) &&
      !findingId &&
      !recommendationId &&
      !activityId &&
      !obligationId,
    WORK_ACTIVITY:
      Boolean(version && workstreamId && activityId) &&
      !findingId &&
      !recommendationId &&
      !obligationId,
    WORKSTREAM_OBLIGATION:
      Boolean(version && workstreamId && obligationId) &&
      !findingId &&
      !recommendationId &&
      !activityId,
  };
  return matches[value.type] ? source : null;
}

function normalizeCanonicalScopeItem(value) {
  const keys = [
    "scopeItemId",
    "scopeItemRevision",
    "sequence",
    "classification",
    "scopeSemantic",
    "materialResponsibility",
    "description",
    "quantity",
    "unitAmountMinor",
    "lineTotalMinor",
    "includedInTotal",
    "source",
    "createdAt",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const scopeItemId = canonicalUuid(value.scopeItemId);
  const scopeItemRevision = positiveInteger(value.scopeItemRevision);
  const sequence = positiveInteger(value.sequence);
  const description = boundedText(value.description, 1000);
  const quantity = positiveInteger(value.quantity);
  const unitAmountMinor = nonnegativeInteger(value.unitAmountMinor, MAX_MINOR_AMOUNT);
  const lineTotalMinor = nonnegativeInteger(value.lineTotalMinor, MAX_MINOR_AMOUNT);
  const source = normalizeCanonicalQuoteSource(value.source);
  const createdAt = canonicalTimestamp(value.createdAt);
  if (
    !scopeItemId ||
    !scopeItemRevision ||
    !sequence ||
    !CANONICAL_QUOTE_CLASSIFICATIONS.includes(value.classification) ||
    !CANONICAL_QUOTE_SCOPE_SEMANTICS.includes(value.scopeSemantic) ||
    !CANONICAL_MATERIAL_RESPONSIBILITIES.includes(
      value.materialResponsibility
    ) ||
    !description ||
    !quantity ||
    quantity > 10_000 ||
    unitAmountMinor == null ||
    lineTotalMinor == null ||
    typeof value.includedInTotal !== "boolean" ||
    !source ||
    !createdAt
  ) {
    return null;
  }
  return {
    scopeItemId,
    scopeItemRevision,
    sequence,
    classification: value.classification,
    scopeSemantic: value.scopeSemantic,
    materialResponsibility: value.materialResponsibility,
    description,
    quantity,
    unitAmountMinor,
    lineTotalMinor,
    includedInTotal: value.includedInTotal,
    source,
    createdAt,
  };
}

function normalizeWireExclusionSource(value) {
  const keys = [
    "source_type",
    "source_version",
    "source_workstream_version",
    "source_finding_id",
    "source_recommendation_id",
    "source_workstream_id",
    "source_activity_id",
    "source_obligation_id",
  ];
  if (!hasExactKeys(value, keys)) return null;
  return normalizeCanonicalQuoteSource({
    type: value.source_type,
    version:
      value.source_type === "WORKSTREAM"
        ? value.source_workstream_version
        : value.source_version,
    findingId: value.source_finding_id,
    recommendationId: value.source_recommendation_id,
    workstreamId: value.source_workstream_id,
    activityId: value.source_activity_id,
    obligationId: value.source_obligation_id,
  });
}

function normalizeCanonicalExclusion(value, { normalizedSource = false } = {}) {
  const keys = [
    "scopeItemId",
    "sequence",
    "classification",
    "scopeSemantic",
    "materialResponsibility",
    "source",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const scopeItemId = canonicalUuid(value.scopeItemId);
  const sequence = positiveInteger(value.sequence);
  const source = normalizedSource
    ? normalizeCanonicalQuoteSource(value.source)
    : normalizeWireExclusionSource(value.source);
  if (
    !scopeItemId ||
    !sequence ||
    !CANONICAL_QUOTE_CLASSIFICATIONS.includes(value.classification) ||
    !CANONICAL_QUOTE_SCOPE_SEMANTICS.includes(value.scopeSemantic) ||
    !CANONICAL_MATERIAL_RESPONSIBILITIES.includes(
      value.materialResponsibility
    ) ||
    !source
  ) {
    return null;
  }
  return {
    scopeItemId,
    sequence,
    classification: value.classification,
    scopeSemantic: value.scopeSemantic,
    materialResponsibility: value.materialResponsibility,
    source,
  };
}

function normalizeConditions(value) {
  return Array.isArray(value) && value.length === 0 ? [] : null;
}

function normalizeExclusions(value, options) {
  if (!Array.isArray(value) || value.length > 200) return null;
  const exclusions = value.map((item) =>
    normalizeCanonicalExclusion(item, options)
  );
  return exclusions.some((exclusion) => !exclusion) ? null : exclusions;
}

function normalizeCanonicalQuoteVersion(value, options) {
  const hasTerms = Object.hasOwn(value || {}, "customerTermsSnapshot");
  const hasIntegrityVersion = Object.hasOwn(value || {}, "integrityVersion");
  const keys = [
    "version",
    "status",
    "currency",
    "materialsSubtotalMinor",
    "laborServiceSubtotalMinor",
    "totalMinor",
    "scopeItemCount",
    "conditions",
    "exclusions",
    ...(hasTerms ? ["customerTermsSnapshot"] : []),
    "issuedAt",
    "integrityHash",
    ...(hasIntegrityVersion ? ["integrityVersion"] : []),
    "createdAt",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const version = positiveInteger(value.version);
  const currency = canonicalCurrency(value.currency);
  const materialsSubtotalMinor = nonnegativeInteger(
    value.materialsSubtotalMinor,
    MAX_MINOR_AMOUNT
  );
  const laborServiceSubtotalMinor = nonnegativeInteger(
    value.laborServiceSubtotalMinor,
    MAX_MINOR_AMOUNT
  );
  const totalMinor = nonnegativeInteger(value.totalMinor, MAX_MINOR_AMOUNT);
  const scopeItemCount = nonnegativeInteger(value.scopeItemCount, 10_000);
  const conditions = normalizeConditions(value.conditions);
  const exclusions = normalizeExclusions(value.exclusions, options);
  const customerTermsSnapshot = hasTerms
    ? normalizeCustomerTermsSnapshot(value.customerTermsSnapshot)
    : null;
  const integrityVersion = hasIntegrityVersion
    ? positiveInteger(value.integrityVersion)
    : 1;
  const issuedAt = canonicalTimestamp(value.issuedAt, { nullable: true });
  const createdAt = canonicalTimestamp(value.createdAt);
  if (
    !version ||
    !CANONICAL_QUOTE_VERSION_STATUSES.includes(value.status) ||
    !currency ||
    materialsSubtotalMinor == null ||
    laborServiceSubtotalMinor == null ||
    totalMinor == null ||
    scopeItemCount == null ||
    !conditions ||
    !exclusions ||
    (hasTerms && value.customerTermsSnapshot != null && !customerTermsSnapshot) ||
    !integrityVersion ||
    (integrityVersion === 1 && value.customerTermsSnapshot != null) ||
    (integrityVersion >= 2 && !customerTermsSnapshot) ||
    (value.issuedAt != null && !issuedAt) ||
    (value.status === "DRAFT" && issuedAt != null) ||
    (value.status !== "DRAFT" && !issuedAt) ||
    typeof value.integrityHash !== "string" ||
    !HASH_PATTERN.test(value.integrityHash) ||
    !createdAt
  ) {
    return null;
  }
  return {
    version,
    status: value.status,
    currency,
    materialsSubtotalMinor,
    laborServiceSubtotalMinor,
    totalMinor,
    scopeItemCount,
    conditions,
    exclusions,
    customerTermsSnapshot,
    issuedAt,
    integrityHash: value.integrityHash.toLowerCase(),
    integrityVersion,
    createdAt,
  };
}

export function getCanonicalQuoteJobContext(record = {}) {
  const jobId = canonicalUuid(record.jobId);
  if (
    record.source !== "CANONICAL_BACKEND_READ" ||
    record.readOnly !== true ||
    record.lifecycleVerified !== true ||
    positiveInteger(record.lifecycleContractVersion) !== 2 ||
    !jobId
  ) {
    return null;
  }
  return Object.freeze({
    authoritySource: "CANONICAL_BACKEND_READ",
    lifecycleContractVersion: 2,
    readOnly: true,
    jobId,
  });
}

function validateQuoteProjection(value, options) {
  const hasTerms = Object.hasOwn(value || {}, "customerTermsSnapshot");
  const hasIntegrityVersion = Object.hasOwn(value || {}, "integrityVersion");
  const hasDocumentNumber = Object.hasOwn(value || {}, "documentNumber");
  const hasSourceDocument = Object.hasOwn(value || {}, "sourceBusinessDocument");
  const hasCustomerParty = Object.hasOwn(value || {}, "customerParty");
  const keys = [
    "id",
    "jobId",
    "requestId",
    "relationshipId",
    "issuerParticipantId",
    "parentQuoteId",
    "lineageType",
    "lineageReasonCategory",
    "status",
    "issuedAt",
    "currency",
    "currentVersion",
    "materialsSubtotalMinor",
    "laborServiceSubtotalMinor",
    "totalMinor",
    "scopeItemCount",
    "conditions",
    "exclusions",
    ...(hasTerms ? ["customerTermsSnapshot"] : []),
    ...(hasIntegrityVersion ? ["integrityVersion"] : []),
    "scopeItems",
    "versions",
    "createdAt",
    "updatedAt",
    "decisionState",
    "decisionVersion",
    "decidedAt",
    ...(hasDocumentNumber ? ["documentNumber"] : []),
    ...(hasSourceDocument ? ["sourceBusinessDocument"] : []),
    ...(hasCustomerParty ? ["customerParty"] : []),
  ];
  if (!hasExactKeys(value, keys)) return null;
  const id = canonicalUuid(value.id);
  const jobId = canonicalUuid(value.jobId);
  const requestId = positiveInteger(value.requestId);
  const relationshipId = positiveInteger(value.relationshipId);
  const issuerParticipantId = canonicalUuid(value.issuerParticipantId);
  const parentQuoteId = canonicalUuid(value.parentQuoteId, { nullable: true });
  const issuedAt = canonicalTimestamp(value.issuedAt, { nullable: true });
  const currency = canonicalCurrency(value.currency);
  const currentVersion = positiveInteger(value.currentVersion);
  const materialsSubtotalMinor = nonnegativeInteger(
    value.materialsSubtotalMinor,
    MAX_MINOR_AMOUNT
  );
  const laborServiceSubtotalMinor = nonnegativeInteger(
    value.laborServiceSubtotalMinor,
    MAX_MINOR_AMOUNT
  );
  const totalMinor = nonnegativeInteger(value.totalMinor, MAX_MINOR_AMOUNT);
  const scopeItemCount = nonnegativeInteger(value.scopeItemCount, 10_000);
  const conditions = normalizeConditions(value.conditions);
  const exclusions = normalizeExclusions(value.exclusions, options);
  const customerTermsSnapshot = hasTerms
    ? normalizeCustomerTermsSnapshot(value.customerTermsSnapshot)
    : null;
  const integrityVersion = hasIntegrityVersion
    ? positiveInteger(value.integrityVersion)
    : 1;
  const documentNumber = hasDocumentNumber && value.documentNumber != null
    ? boundedText(value.documentNumber, 64)
    : null;
  const sourceBusinessDocument = hasSourceDocument && value.sourceBusinessDocument != null
    ? hasExactKeys(value.sourceBusinessDocument, ["documentId", "documentVersion"])
      ? {
        documentId: canonicalUuid(value.sourceBusinessDocument?.documentId),
        documentVersion: positiveInteger(value.sourceBusinessDocument?.documentVersion),
      }
      : { documentId: "", documentVersion: null }
    : null;
  const customerParty = hasCustomerParty
    ? normalizeCustomerParty(value.customerParty)
    : null;
  const scopeItems = Array.isArray(value.scopeItems)
    ? value.scopeItems.map(normalizeCanonicalScopeItem)
    : null;
  const versions = Array.isArray(value.versions)
    ? value.versions.map((version) =>
        normalizeCanonicalQuoteVersion(version, options)
      )
    : null;
  const createdAt = canonicalTimestamp(value.createdAt);
  const updatedAt = canonicalTimestamp(value.updatedAt);
  const decisionVersion =
    value.decisionVersion == null ? null : positiveInteger(value.decisionVersion);
  const decidedAt = canonicalTimestamp(value.decidedAt, { nullable: true });
  const current = versions?.at(-1);
  const rootLineage =
    value.parentQuoteId == null &&
    value.lineageType == null &&
    value.lineageReasonCategory == null;
  const derivedLineage =
    Boolean(parentQuoteId) &&
    CANONICAL_QUOTE_LINEAGE_TYPES.includes(value.lineageType) &&
    CANONICAL_QUOTE_LINEAGE_REASONS.includes(value.lineageReasonCategory);
  const noDecision =
    value.decisionState == null &&
    value.decisionVersion == null &&
    value.decidedAt == null;
  const terminalDecision =
    CANONICAL_QUOTE_DECISIONS.includes(value.decisionState) &&
    decisionVersion === currentVersion &&
    Boolean(decidedAt) &&
    value.status === "ISSUED";
  if (
    !id ||
    !jobId ||
    !requestId ||
    !relationshipId ||
    !issuerParticipantId ||
    (value.parentQuoteId != null && !parentQuoteId) ||
    parentQuoteId === id ||
    (!rootLineage && !derivedLineage) ||
    !CANONICAL_QUOTE_STATUSES.includes(value.status) ||
    (value.issuedAt != null && !issuedAt) ||
    (value.status === "DRAFT" && issuedAt != null) ||
    (value.status === "ISSUED" && !issuedAt) ||
    !currency ||
    !currentVersion ||
    materialsSubtotalMinor == null ||
    laborServiceSubtotalMinor == null ||
    totalMinor == null ||
    scopeItemCount == null ||
    !conditions ||
    !exclusions ||
    (hasTerms && value.customerTermsSnapshot != null && !customerTermsSnapshot) ||
    !integrityVersion ||
    (integrityVersion === 1 && value.customerTermsSnapshot != null) ||
    (integrityVersion >= 2 && !customerTermsSnapshot) ||
    !scopeItems ||
    scopeItems.length > 10_000 ||
    scopeItems.some((item) => !item) ||
    scopeItems.length !== scopeItemCount ||
    new Set(scopeItems.map((item) => item.scopeItemId)).size !==
      scopeItems.length ||
    new Set(scopeItems.map((item) => item.sequence)).size !== scopeItems.length ||
    !versions ||
    versions.length === 0 ||
    versions.length > 1_000 ||
    versions.some((version) => !version) ||
    versions.some((version, index) => version.version !== index + 1) ||
    !current ||
    current.version !== currentVersion ||
    current.status !== value.status ||
    current.currency !== currency ||
    current.materialsSubtotalMinor !== materialsSubtotalMinor ||
    current.laborServiceSubtotalMinor !== laborServiceSubtotalMinor ||
    current.totalMinor !== totalMinor ||
    current.scopeItemCount !== scopeItemCount ||
    current.issuedAt !== issuedAt ||
    current.integrityVersion !== integrityVersion ||
    JSON.stringify(current.customerTermsSnapshot) !==
      JSON.stringify(customerTermsSnapshot) ||
    !createdAt ||
    !updatedAt ||
    (value.decisionVersion != null && !decisionVersion) ||
    (value.decidedAt != null && !decidedAt) ||
    (!noDecision && !terminalDecision) ||
    (hasDocumentNumber && value.documentNumber != null && !documentNumber) ||
    (hasSourceDocument && value.sourceBusinessDocument != null &&
      (!sourceBusinessDocument.documentId || !sourceBusinessDocument.documentVersion)) ||
    (hasCustomerParty && customerParty === undefined)
  ) {
    return null;
  }
  return {
    id,
    jobId,
    requestId,
    relationshipId,
    issuerParticipantId,
    parentQuoteId,
    lineageType: value.lineageType,
    lineageReasonCategory: value.lineageReasonCategory,
    status: value.status,
    issuedAt,
    currency,
    currentVersion,
    materialsSubtotalMinor,
    laborServiceSubtotalMinor,
    totalMinor,
    scopeItemCount,
    conditions,
    exclusions,
    customerTermsSnapshot,
    integrityVersion,
    scopeItems,
    versions,
    createdAt,
    updatedAt,
    decisionState: value.decisionState,
    decisionVersion,
    decidedAt,
    documentNumber,
    sourceBusinessDocument,
    customerParty,
  };
}

export function validateCanonicalQuoteProjection(value) {
  return validateQuoteProjection(value, { normalizedSource: false });
}

export function validateNormalizedCanonicalQuoteProjection(value) {
  return validateQuoteProjection(value, { normalizedSource: true });
}

function quoteLineageIsAcyclic(quotes) {
  const byId = new Map(quotes.map((quote) => [quote.id, quote]));
  for (const quote of quotes) {
    const visited = new Set([quote.id]);
    let parentId = quote.parentQuoteId;
    while (parentId) {
      if (visited.has(parentId)) return false;
      visited.add(parentId);
      parentId = byId.get(parentId)?.parentQuoteId || null;
    }
  }
  return true;
}

export function validateCanonicalQuotes(value, { jobId } = {}) {
  const expectedJobId = canonicalUuid(jobId);
  if (!expectedJobId || !Array.isArray(value) || value.length > 100) return null;
  const quotes = value.map(validateCanonicalQuoteProjection);
  if (
    quotes.some((quote) => !quote) ||
    quotes.some((quote) => quote.jobId !== expectedJobId) ||
    new Set(quotes.map((quote) => quote.id)).size !== quotes.length
  ) {
    return null;
  }
  const ids = new Set(quotes.map((quote) => quote.id));
  if (
    quotes.some((quote) => quote.parentQuoteId && !ids.has(quote.parentQuoteId)) ||
    !quoteLineageIsAcyclic(quotes)
  ) {
    return null;
  }
  return quotes;
}

export function buildCanonicalQuoteLineage(quotes = []) {
  if (!Array.isArray(quotes)) return [];
  const byParent = new Map();
  quotes.forEach((quote) => {
    const key = quote.parentQuoteId || null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(quote);
  });
  const ordered = [];
  const visit = (quote, depth) => {
    ordered.push({ quote, depth });
    (byParent.get(quote.id) || []).forEach((child) => visit(child, depth + 1));
  };
  (byParent.get(null) || []).forEach((quote) => visit(quote, 0));
  return ordered;
}
