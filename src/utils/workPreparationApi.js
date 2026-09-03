import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const REFERENCE_PATTERN = /^[a-z][a-z0-9_.-]{1,79}$/;

export const WORK_PREPARATION_ITEM_KINDS = Object.freeze([
  "MATERIAL",
  "TOOL",
  "EQUIPMENT",
  "PREPARATION_TASK",
]);
export const WORK_PREPARATION_PROVIDERS = Object.freeze(["BUSINESS", "CUSTOMER"]);
export const WORK_PREPARATION_COMMERCIAL_TREATMENTS = Object.freeze([
  "INCLUDED_IN_ACCEPTED_TOTAL",
  "SEPARATELY_ACCEPTED",
  "CUSTOMER_SUPPLIED",
  "ALLOWANCE",
  "APPROVAL_REQUIRED",
  "NOT_CUSTOMER_BILLABLE",
]);
export const WORK_PREPARATION_EVENT_TYPES = Object.freeze([
  "CUSTOMER_ITEM_REQUESTED",
  "CUSTOMER_ITEM_RECEIVED",
  "MATERIAL_STAGED",
  "BUSINESS_INVENTORY_ALLOCATED",
  "TOOLS_READY",
  "EQUIPMENT_READY",
  "PREPARATION_STARTED",
  "PREPARATION_READY",
  "PREPARATION_BLOCKED",
]);

const ITEM_KIND_SET = new Set(WORK_PREPARATION_ITEM_KINDS);
const PROVIDER_SET = new Set(WORK_PREPARATION_PROVIDERS);
const COMMERCIAL_SET = new Set(WORK_PREPARATION_COMMERCIAL_TREATMENTS);
const EVENT_TYPE_SET = new Set(WORK_PREPARATION_EVENT_TYPES);
const PLANNING_STATES = new Set(["PLANNING", "PLANNED", "RETIRED"]);
const WORK_START_POLICIES = new Set(["NONE", "REQUIRED_ITEMS_READY"]);
const LINEAGES = new Set(["QUOTE_SCOPE_ITEM", "ACCEPTED_SCOPE_ELABORATION"]);
const VISIBILITIES = new Set(["BUSINESS_ONLY", "CUSTOMER_VISIBLE"]);
const ACQUISITION_STATES = new Set([
  "NOT_REQUIRED",
  "NOT_STARTED",
  "PARTIALLY_PURCHASED",
  "PURCHASED",
  "CUSTOMER_ITEM_PENDING",
  "BLOCKED",
  "READY",
]);
const PREPARATION_STATES = new Set(["NOT_STARTED", "IN_PROGRESS", "READY", "BLOCKED"]);
const DEPOSIT_STATES = new Set([
  "NOT_REQUIRED",
  "DUE",
  "PARTIALLY_SATISFIED",
  "RECONCILIATION_REQUIRED",
  "SATISFIED",
  "TERMS_UNVERIFIED",
  "SUPERSEDED",
  "VOIDED",
  "UNAVAILABLE",
]);
const SAFE_ACTIONS = new Set([
  "REVISE_PLAN",
  "RECORD_PURCHASE",
  "RECORD_PREPARATION",
  "REVIEW_DEPOSIT",
  "RESOLVE_REQUIRED_PREPARATION",
]);
const READ_CODES = new Set([
  "WORK_PREPARATION_FOUND",
  "WORK_PREPARATION_NOT_MATERIALIZED",
]);

export class WorkPreparationApiError extends Error {
  constructor({
    status = 500,
    code = "WORK_PREPARATION_FAILED",
    message = "Materials & Preparation is temporarily unavailable.",
  } = {}) {
    super(message);
    this.name = "WorkPreparationApiError";
    this.status = status;
    this.code = code || "WORK_PREPARATION_FAILED";
  }
}

function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exact(value, keys) {
  return plain(value) &&
    Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key));
}

function uuid(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function integer(value, { zero = false, nullable = false } = {}) {
  if (nullable && value == null) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= (zero ? 0 : 1) ? parsed : null;
}

function decimal(value, { zero = false } = {}) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= (zero ? 0 : Number.EPSILON)
    ? Number(parsed.toFixed(3))
    : null;
}

function text(value, maximum, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= maximum ? normalized : null;
}

function timestamp(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function boolean(value) {
  return typeof value === "boolean" ? value : null;
}

function currency(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  return typeof value === "string" && CURRENCY_PATTERN.test(value) ? value : null;
}

function unique(values) {
  return new Set(values).size === values.length;
}

function validKey(value) {
  return typeof value === "string" && IDEMPOTENCY_PATTERN.test(value.trim());
}

function normalizePurchaseSummary(value) {
  if (!exact(value, ["recordCount", "netQuantity", "internalCostMinor"])) return null;
  const normalized = {
    recordCount: integer(value.recordCount, { zero: true }),
    netQuantity: decimal(value.netQuantity, { zero: true }),
    internalCostMinor: integer(value.internalCostMinor, { zero: true }),
  };
  return Object.values(normalized).some((item) => item == null) ? null : normalized;
}

function normalizeItem(value, plan) {
  const keys = [
    "id",
    "sequence",
    "kind",
    "description",
    "quantity",
    "unit",
    "providerResponsibility",
    "commercialTreatment",
    "visibility",
    "requiredForWorkStart",
    "sourceLineage",
    "sourceScopeItemId",
    "acquisitionState",
    "preparationState",
    "readyForWorkStart",
    "internalEstimatedCostMinor",
    "internalCostCurrency",
    "purchase",
  ];
  if (!exact(value, keys)) return null;
  const normalized = {
    id: uuid(value.id),
    sequence: integer(value.sequence),
    kind: ITEM_KIND_SET.has(value.kind) ? value.kind : null,
    description: text(value.description, 1000),
    quantity: decimal(value.quantity),
    unit: text(value.unit, 80),
    providerResponsibility: PROVIDER_SET.has(value.providerResponsibility)
      ? value.providerResponsibility
      : null,
    commercialTreatment: COMMERCIAL_SET.has(value.commercialTreatment)
      ? value.commercialTreatment
      : null,
    visibility: VISIBILITIES.has(value.visibility) ? value.visibility : null,
    requiredForWorkStart: boolean(value.requiredForWorkStart),
    sourceLineage: LINEAGES.has(value.sourceLineage) ? value.sourceLineage : null,
    sourceScopeItemId: uuid(value.sourceScopeItemId, { nullable: true }),
    acquisitionState: ACQUISITION_STATES.has(value.acquisitionState)
      ? value.acquisitionState
      : null,
    preparationState: PREPARATION_STATES.has(value.preparationState)
      ? value.preparationState
      : null,
    readyForWorkStart: boolean(value.readyForWorkStart),
    internalEstimatedCostMinor: integer(value.internalEstimatedCostMinor, {
      zero: true,
      nullable: true,
    }),
    internalCostCurrency: currency(value.internalCostCurrency, { nullable: true }),
    purchase: normalizePurchaseSummary(value.purchase),
  };
  if (
    !normalized.id || !normalized.sequence || !normalized.kind || !normalized.description ||
    !normalized.quantity || !normalized.unit || !normalized.providerResponsibility ||
    !normalized.commercialTreatment || !normalized.visibility ||
    normalized.requiredForWorkStart == null || !normalized.sourceLineage ||
    normalized.acquisitionState == null || normalized.preparationState == null ||
    normalized.readyForWorkStart == null || !normalized.purchase ||
    (value.sourceScopeItemId != null && !normalized.sourceScopeItemId) ||
    ((normalized.internalEstimatedCostMinor == null) !==
      (normalized.internalCostCurrency == null)) ||
    (normalized.sourceLineage === "QUOTE_SCOPE_ITEM" && !normalized.sourceScopeItemId) ||
    (normalized.sourceLineage === "ACCEPTED_SCOPE_ELABORATION" &&
      normalized.sourceScopeItemId != null) ||
    (normalized.providerResponsibility === "CUSTOMER" &&
      (normalized.kind !== "MATERIAL" ||
        normalized.commercialTreatment !== "CUSTOMER_SUPPLIED" ||
        normalized.internalEstimatedCostMinor != null)) ||
    (normalized.kind !== "MATERIAL" &&
      (normalized.providerResponsibility !== "BUSINESS" ||
        normalized.commercialTreatment !== "NOT_CUSTOMER_BILLABLE")) ||
    plan?.commercialCurrency && normalized.internalCostCurrency &&
      normalized.internalCostCurrency !== plan.commercialCurrency
  ) return null;
  return Object.freeze(normalized);
}

function normalizeReadiness(value, planningState) {
  const keys = [
    "planningState",
    "acquisitionState",
    "preparationState",
    "customerItemPending",
    "workStartBlocked",
    "requiredItemCount",
    "readyRequiredItemCount",
    "summary",
  ];
  if (!exact(value, keys)) return null;
  const normalized = {
    planningState: PLANNING_STATES.has(value.planningState) ? value.planningState : null,
    acquisitionState: ACQUISITION_STATES.has(value.acquisitionState)
      ? value.acquisitionState
      : null,
    preparationState: PREPARATION_STATES.has(value.preparationState)
      ? value.preparationState
      : null,
    customerItemPending: boolean(value.customerItemPending),
    workStartBlocked: boolean(value.workStartBlocked),
    requiredItemCount: integer(value.requiredItemCount, { zero: true }),
    readyRequiredItemCount: integer(value.readyRequiredItemCount, { zero: true }),
    summary: text(value.summary, 160),
  };
  if (
    Object.values(normalized).some((item) => item == null) ||
    normalized.planningState !== planningState ||
    normalized.readyRequiredItemCount > normalized.requiredItemCount
  ) return null;
  return Object.freeze(normalized);
}

function normalizeDeposit(value) {
  if (!exact(value, ["state", "commitmentLocked"])) return null;
  const state = DEPOSIT_STATES.has(value.state) ? value.state : null;
  const commitmentLocked = boolean(value.commitmentLocked);
  if (
    !state || commitmentLocked == null ||
    commitmentLocked !== !["NOT_REQUIRED", "SATISFIED"].includes(state)
  ) return null;
  return Object.freeze({ state, commitmentLocked });
}

function normalizeSource(value) {
  if (!plain(value)) return null;

  const hasQuoteApprovalId = Object.hasOwn(value, "quoteApprovalId");
  const hasApprovalSource = Object.hasOwn(value, "approvalSource");

  if (hasQuoteApprovalId !== hasApprovalSource) return null;

  const keys = [
    "quoteId",
    "issuedQuoteVersion",
    "approvedCustomerDecisionId",
    ...(hasQuoteApprovalId ? ["quoteApprovalId", "approvalSource"] : []),
  ];

  if (!exact(value, keys)) return null;

  const quoteId = uuid(value.quoteId);
  const issuedQuoteVersion = integer(value.issuedQuoteVersion);
  const approvedCustomerDecisionId = uuid(
    value.approvedCustomerDecisionId,
    { nullable: true }
  );
  const quoteApprovalId = hasQuoteApprovalId
    ? uuid(value.quoteApprovalId, { nullable: true })
    : null;
  const approvalSource = hasApprovalSource
    ? value.approvalSource == null
      ? null
      : ["MEETRO_CUSTOMER", "EXTERNAL_EVIDENCE"].includes(
          value.approvalSource
        )
        ? value.approvalSource
        : undefined
    : null;

  const external = approvalSource === "EXTERNAL_EVIDENCE";
  const commonMeetro = approvalSource === "MEETRO_CUSTOMER";
  const legacyMeetro = !hasQuoteApprovalId && !hasApprovalSource;

  if (
    !quoteId ||
    !issuedQuoteVersion ||
    approvalSource === undefined ||
    (
      value.approvedCustomerDecisionId != null &&
      !approvedCustomerDecisionId
    ) ||
    (
      hasQuoteApprovalId &&
      value.quoteApprovalId != null &&
      !quoteApprovalId
    ) ||
    (
      external &&
      (
        !quoteApprovalId ||
        approvedCustomerDecisionId
      )
    ) ||
    (
      commonMeetro &&
      (
        !quoteApprovalId ||
        !approvedCustomerDecisionId
      )
    ) ||
    (
      legacyMeetro &&
      (
        quoteApprovalId ||
        !approvedCustomerDecisionId
      )
    )
  ) {
    return null;
  }

  return Object.freeze({
    quoteId,
    issuedQuoteVersion,
    approvedCustomerDecisionId,
    ...(hasQuoteApprovalId ? { quoteApprovalId } : {}),
    ...(hasApprovalSource ? { approvalSource } : {}),
  });
}

function normalizePlanPurchaseSummary(value, expectedCurrency) {
  if (!exact(value, ["recordCount", "correctionCount", "internalCostMinor", "currency"])) {
    return null;
  }
  const normalized = {
    recordCount: integer(value.recordCount, { zero: true }),
    correctionCount: integer(value.correctionCount, { zero: true }),
    internalCostMinor: integer(value.internalCostMinor, { zero: true }),
    currency: currency(value.currency),
  };
  return Object.values(normalized).some((item) => item == null) ||
    normalized.currency !== expectedCurrency
    ? null
    : Object.freeze(normalized);
}

export function normalizeWorkPreparation(value, { jobId = "" } = {}) {
  const expectedJobId = uuid(jobId);
  if (!expectedJobId || !plain(value)) return null;
  if (value.exists === false) {
    return exact(value, ["contractVersion", "exists", "jobId"]) &&
      Number(value.contractVersion) === 1 && uuid(value.jobId) === expectedJobId
      ? Object.freeze({ contractVersion: 1, exists: false, jobId: expectedJobId })
      : null;
  }
  const keys = [
    "contractVersion",
    "exists",
    "id",
    "jobId",
    "relationshipId",
    "source",
    "currentVersion",
    "planningState",
    "workStartPolicy",
    "readiness",
    "deposit",
    "items",
    "createdAt",
    "updatedAt",
    "internalNotes",
    "purchaseSummary",
    "safeNextActions",
  ];
  if (!exact(value, keys) || value.exists !== true || !Array.isArray(value.items) ||
    value.items.length > 200 || !Array.isArray(value.safeNextActions)) return null;
  const planningState = PLANNING_STATES.has(value.planningState) ? value.planningState : null;
  const commercialCurrency = currency(value.purchaseSummary?.currency);
  const context = { commercialCurrency };
  const items = value.items.map((item) => normalizeItem(item, context));
  const safeNextActions = value.safeNextActions.map((action) =>
    SAFE_ACTIONS.has(action) ? action : null
  );
  const normalized = {
    contractVersion: integer(value.contractVersion),
    exists: true,
    id: uuid(value.id),
    jobId: uuid(value.jobId),
    relationshipId:
      value.relationshipId == null ? null : integer(value.relationshipId),
    source: normalizeSource(value.source),
    currentVersion: integer(value.currentVersion),
    planningState,
    workStartPolicy: WORK_START_POLICIES.has(value.workStartPolicy)
      ? value.workStartPolicy
      : null,
    readiness: normalizeReadiness(value.readiness, planningState),
    deposit: normalizeDeposit(value.deposit),
    items,
    createdAt: timestamp(value.createdAt),
    updatedAt: timestamp(value.updatedAt),
    internalNotes: text(value.internalNotes, 5000, { nullable: true }),
    purchaseSummary: normalizePlanPurchaseSummary(value.purchaseSummary, commercialCurrency),
    safeNextActions,
  };
  if (
    normalized.contractVersion !== 1 || normalized.jobId !== expectedJobId ||
    !normalized.id ||
    (value.relationshipId != null && !normalized.relationshipId) ||
    !normalized.source ||
    (
      normalized.source.approvalSource === "EXTERNAL_EVIDENCE"
        ? normalized.relationshipId != null
        : !normalized.relationshipId
    ) ||
    !normalized.currentVersion || !normalized.planningState ||
    !normalized.workStartPolicy || !normalized.readiness || !normalized.deposit ||
    !normalized.createdAt || !normalized.updatedAt ||
    (value.internalNotes != null && !normalized.internalNotes) ||
    !normalized.purchaseSummary || items.some((item) => !item) ||
    safeNextActions.some((action) => !action) ||
    !unique(items.map((item) => item.id)) ||
    !unique(items.map((item) => item.sequence)) ||
    !unique(safeNextActions)
  ) return null;
  return Object.freeze({
    ...normalized,
    items: Object.freeze(items),
    safeNextActions: Object.freeze(safeNextActions),
  });
}

function normalizeWriteItem(value, { requireId = false } = {}) {
  if (!plain(value)) return null;
  const allowed = [
    "id",
    "sequence",
    "kind",
    "description",
    "quantity",
    "unit",
    "providerResponsibility",
    "commercialTreatment",
    "visibility",
    "requiredForWorkStart",
    "internalEstimatedCostMinor",
    "internalCostCurrency",
    "sourceLineage",
    "sourceScopeItemId",
  ];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return null;
  const normalized = {
    ...(value.id == null ? {} : { id: uuid(value.id) }),
    sequence: integer(value.sequence),
    kind: ITEM_KIND_SET.has(value.kind) ? value.kind : null,
    description: text(value.description, 1000),
    quantity: decimal(value.quantity),
    unit: text(value.unit, 80),
    providerResponsibility: PROVIDER_SET.has(value.providerResponsibility)
      ? value.providerResponsibility
      : null,
    commercialTreatment: COMMERCIAL_SET.has(value.commercialTreatment)
      ? value.commercialTreatment
      : null,
    visibility: VISIBILITIES.has(value.visibility) ? value.visibility : null,
    requiredForWorkStart: boolean(value.requiredForWorkStart),
    internalEstimatedCostMinor: integer(value.internalEstimatedCostMinor, {
      zero: true,
      nullable: true,
    }),
    internalCostCurrency: currency(value.internalCostCurrency, { nullable: true }),
    sourceLineage: LINEAGES.has(value.sourceLineage) ? value.sourceLineage : null,
    sourceScopeItemId: uuid(value.sourceScopeItemId, { nullable: true }),
  };
  if (
    (value.id != null && !normalized.id) || (requireId && !normalized.id) ||
    !normalized.sequence || !normalized.kind || !normalized.description ||
    !normalized.quantity || !normalized.unit || !normalized.providerResponsibility ||
    !normalized.commercialTreatment || !normalized.visibility ||
    normalized.requiredForWorkStart == null || !normalized.sourceLineage ||
    (value.sourceScopeItemId != null && !normalized.sourceScopeItemId) ||
    ((normalized.internalEstimatedCostMinor == null) !==
      (normalized.internalCostCurrency == null)) ||
    (normalized.sourceLineage === "QUOTE_SCOPE_ITEM" && !normalized.sourceScopeItemId) ||
    (normalized.sourceLineage === "ACCEPTED_SCOPE_ELABORATION" &&
      (normalized.sourceScopeItemId != null ||
        !["NOT_CUSTOMER_BILLABLE", "CUSTOMER_SUPPLIED"].includes(
          normalized.commercialTreatment
        ))) ||
    (normalized.providerResponsibility === "CUSTOMER" &&
      (normalized.kind !== "MATERIAL" ||
        normalized.commercialTreatment !== "CUSTOMER_SUPPLIED" ||
        normalized.internalEstimatedCostMinor != null)) ||
    (normalized.kind !== "MATERIAL" &&
      (normalized.providerResponsibility !== "BUSINESS" ||
        normalized.commercialTreatment !== "NOT_CUSTOMER_BILLABLE"))
  ) return null;
  return normalized;
}

async function request(endpoint, options, setPage, authFetchImpl) {
  const result = await authFetchImpl(endpoint, options, setPage);
  if (!result?.response?.ok || result?.data?.success !== true) {
    throw new WorkPreparationApiError({
      status: result?.response?.status || 500,
      code: result?.data?.code,
      message: result?.data?.message,
    });
  }
  return { data: result.data, status: result.response.status || 200 };
}

export function createWorkPreparationIdempotencyKey(
  action = "command",
  cryptoProvider = globalThis.crypto
) {
  const normalizedAction = String(action || "command")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "command";
  if (!cryptoProvider || typeof cryptoProvider.randomUUID !== "function") {
    throw new WorkPreparationApiError({
      status: 0,
      code: "WORK_PREPARATION_IDEMPOTENCY_UNAVAILABLE",
      message: "This action is unavailable on this device.",
    });
  }
  return `work-preparation:${normalizedAction}:${cryptoProvider.randomUUID()}`;
}

export async function fetchWorkPreparation({
  jobId,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedJobId = uuid(jobId);
  if (!normalizedJobId) {
    throw new WorkPreparationApiError({ status: 400, code: "INVALID_WORK_PREPARATION_JOB" });
  }
  const { data, status } = await request(
    `/jobs/${encodeURIComponent(normalizedJobId)}/work-preparation`,
    { method: "GET", cache: "no-store" },
    setPage,
    authFetchImpl
  );
  if (!READ_CODES.has(data.code)) {
    throw new WorkPreparationApiError({ status: 502, code: "UNSAFE_WORK_PREPARATION_RESPONSE" });
  }
  const workPreparation = normalizeWorkPreparation(data.workPreparation, {
    jobId: normalizedJobId,
  });
  if (!workPreparation || workPreparation.exists !== (data.code === "WORK_PREPARATION_FOUND")) {
    throw new WorkPreparationApiError({ status: 502, code: "UNSAFE_WORK_PREPARATION_RESPONSE" });
  }
  return Object.freeze({ code: data.code, status, workPreparation });
}

function normalizedIdentityCommand({ jobId, planId = null, idempotencyKey }) {
  const normalizedJobId = uuid(jobId);
  const normalizedPlanId = planId == null ? null : uuid(planId);
  if (!normalizedJobId || (planId != null && !normalizedPlanId) || !validKey(idempotencyKey)) {
    throw new WorkPreparationApiError({ status: 400, code: "INVALID_WORK_PREPARATION_COMMAND" });
  }
  return {
    jobId: normalizedJobId,
    planId: normalizedPlanId,
    idempotencyKey: idempotencyKey.trim(),
  };
}

async function requestPlanCommand({
  endpoint,
  body,
  command,
  jobId,
  idempotencyKey,
  expectedCodes,
  setPage,
  authFetchImpl,
}) {
  const { data } = await request(
    endpoint,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    },
    setPage,
    authFetchImpl
  );
  if (!expectedCodes.has(data.code)) {
    throw new WorkPreparationApiError({ status: 502, code: "UNSAFE_WORK_PREPARATION_RESPONSE" });
  }
  const workPreparation = normalizeWorkPreparation(data.workPreparation, { jobId });
  if (!workPreparation?.exists) {
    throw new WorkPreparationApiError({ status: 502, code: "UNSAFE_WORK_PREPARATION_RESPONSE" });
  }
  return Object.freeze({
    code: data.code,
    workPreparation,
    replayed: data.replayed === true,
    command,
  });
}

export async function materializeWorkPreparation({
  jobId,
  approvedCustomerDecisionId = null,
  quoteApprovalId = null,
  idempotencyKey,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const identity = normalizedIdentityCommand({ jobId, idempotencyKey });

  const decisionId =
    approvedCustomerDecisionId == null
      ? null
      : uuid(approvedCustomerDecisionId);

  const approvalId =
    quoteApprovalId == null
      ? null
      : uuid(quoteApprovalId);

  if (
    (!decisionId && !approvalId) ||
    (
      approvedCustomerDecisionId != null &&
      !decisionId
    ) ||
    (
      quoteApprovalId != null &&
      !approvalId
    )
  ) {
    throw new WorkPreparationApiError({
      status: 400,
      code: "INVALID_APPROVED_WORK_APPROVAL",
    });
  }

  const body = {
    ...(decisionId
      ? { approvedCustomerDecisionId: decisionId }
      : {}),
    ...(approvalId
      ? { quoteApprovalId: approvalId }
      : {}),
  };

  return requestPlanCommand({
    endpoint: `/jobs/${encodeURIComponent(identity.jobId)}/work-preparation/materialize`,
    body,
    command: "MATERIALIZE",
    jobId: identity.jobId,
    idempotencyKey: identity.idempotencyKey,
    expectedCodes: new Set([
      "WORK_PREPARATION_MATERIALIZED",
      "WORK_PREPARATION_ALREADY_MATERIALIZED",
    ]),
    setPage,
    authFetchImpl,
  });
}

export async function reviseWorkPreparation({
  jobId,
  planId,
  expectedVersion,
  planningState,
  workStartPolicy,
  internalNotes = null,
  items,
  idempotencyKey,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const identity = normalizedIdentityCommand({ jobId, planId, idempotencyKey });
  const version = integer(expectedVersion);
  const notes = text(internalNotes, 5000, { nullable: true });
  if (
    !version || !PLANNING_STATES.has(planningState) ||
    !WORK_START_POLICIES.has(workStartPolicy) ||
    (internalNotes != null && !notes) || !Array.isArray(items) || items.length > 200
  ) {
    throw new WorkPreparationApiError({ status: 400, code: "INVALID_WORK_PREPARATION_REVISION" });
  }
  const normalizedItems = items.map((item) => normalizeWriteItem(item));
  if (
    normalizedItems.some((item) => !item) ||
    !unique(normalizedItems.map((item) => item.sequence)) ||
    !unique(normalizedItems.filter((item) => item.id).map((item) => item.id))
  ) {
    throw new WorkPreparationApiError({ status: 400, code: "INVALID_WORK_PREPARATION_ITEMS" });
  }
  return requestPlanCommand({
    endpoint: `/jobs/${encodeURIComponent(identity.jobId)}/work-preparation/${encodeURIComponent(identity.planId)}/revisions`,
    body: {
      expectedVersion: version,
      planningState,
      workStartPolicy,
      internalNotes: notes,
      items: normalizedItems,
    },
    command: "REVISE",
    jobId: identity.jobId,
    idempotencyKey: identity.idempotencyKey,
    expectedCodes: new Set(["WORK_PREPARATION_REVISED"]),
    setPage,
    authFetchImpl,
  });
}

function normalizePurchaseResponse(value, expected) {
  const keys = [
    "id", "planId", "planVersion", "itemId", "quantity", "unit",
    "internalCostMinor", "internalCostCurrency", "purchasedAt", "visibility", "eventId",
  ];
  if (!exact(value, keys)) return null;
  const normalized = {
    id: uuid(value.id),
    planId: uuid(value.planId),
    planVersion: integer(value.planVersion),
    itemId: uuid(value.itemId),
    quantity: decimal(value.quantity),
    unit: text(value.unit, 80),
    internalCostMinor: integer(value.internalCostMinor, { nullable: true }),
    internalCostCurrency: currency(value.internalCostCurrency, { nullable: true }),
    purchasedAt: timestamp(value.purchasedAt),
    visibility: VISIBILITIES.has(value.visibility) ? value.visibility : null,
    eventId: uuid(value.eventId),
  };
  if (
    !normalized.id || normalized.planId !== expected.planId ||
    normalized.planVersion !== expected.planVersion || normalized.itemId !== expected.itemId ||
    !normalized.quantity || !normalized.unit || !normalized.purchasedAt ||
    !normalized.visibility || !normalized.eventId ||
    ((normalized.internalCostMinor == null) !== (normalized.internalCostCurrency == null))
  ) return null;
  return Object.freeze(normalized);
}

export async function recordWorkPreparationPurchase({
  jobId,
  planId,
  itemId,
  expectedVersion,
  quantity,
  unit,
  internalCostMinor = null,
  internalCostCurrency = null,
  vendor = null,
  purchasedAt,
  externalReference = null,
  visibility = "BUSINESS_ONLY",
  idempotencyKey,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const identity = normalizedIdentityCommand({ jobId, planId, idempotencyKey });
  const normalizedItemId = uuid(itemId);
  const version = integer(expectedVersion);
  const normalizedQuantity = decimal(quantity);
  const normalizedUnit = text(unit, 80);
  const cost = integer(internalCostMinor, { nullable: true });
  const costCurrency = currency(internalCostCurrency, { nullable: true });
  const normalizedVendor = text(vendor, 300, { nullable: true });
  const instant = timestamp(purchasedAt);
  const reference = text(externalReference, 500, { nullable: true });
  if (
    !normalizedItemId || !version || !normalizedQuantity || !normalizedUnit ||
    ((cost == null) !== (costCurrency == null)) ||
    (vendor != null && !normalizedVendor) || !instant ||
    (externalReference != null && !reference) || !VISIBILITIES.has(visibility)
  ) {
    throw new WorkPreparationApiError({ status: 400, code: "INVALID_MATERIAL_PURCHASE" });
  }
  const { data } = await request(
    `/jobs/${encodeURIComponent(identity.jobId)}/work-preparation/${encodeURIComponent(identity.planId)}/items/${encodeURIComponent(normalizedItemId)}/purchases`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Idempotency-Key": identity.idempotencyKey },
      body: JSON.stringify({
        expectedVersion: version,
        quantity: normalizedQuantity,
        unit: normalizedUnit,
        internalCostMinor: cost,
        internalCostCurrency: costCurrency,
        vendor: normalizedVendor,
        purchasedAt: instant,
        externalReference: reference,
        visibility,
      }),
    },
    setPage,
    authFetchImpl
  );
  const purchase = normalizePurchaseResponse(data.purchase, {
    planId: identity.planId,
    planVersion: version,
    itemId: normalizedItemId,
  });
  if (data.code !== "MATERIAL_PURCHASE_RECORDED" || !purchase) {
    throw new WorkPreparationApiError({ status: 502, code: "UNSAFE_WORK_PREPARATION_RESPONSE" });
  }
  return Object.freeze({ code: data.code, purchase, replayed: data.replayed === true });
}

function normalizeEventResponse(value, expected) {
  const keys = [
    "id", "planId", "planVersion", "itemId", "eventType",
    "readinessDimension", "resultingReadinessState", "visibility",
  ];
  if (!exact(value, keys)) return null;
  const itemId = uuid(value.itemId, { nullable: true });
  const dimension = ["ACQUISITION", "PREPARATION"].includes(value.readinessDimension)
    ? value.readinessDimension
    : null;
  const state = dimension === "ACQUISITION"
    ? (ACQUISITION_STATES.has(value.resultingReadinessState)
        ? value.resultingReadinessState
        : null)
    : (PREPARATION_STATES.has(value.resultingReadinessState)
        ? value.resultingReadinessState
        : null);
  const normalized = {
    id: uuid(value.id),
    planId: uuid(value.planId),
    planVersion: integer(value.planVersion),
    itemId,
    eventType: EVENT_TYPE_SET.has(value.eventType) ? value.eventType : null,
    readinessDimension: dimension,
    resultingReadinessState: state,
    visibility: VISIBILITIES.has(value.visibility) ? value.visibility : null,
  };
  if (
    !normalized.id || normalized.planId !== expected.planId ||
    normalized.planVersion !== expected.planVersion ||
    normalized.itemId !== expected.itemId || normalized.eventType !== expected.eventType ||
    !normalized.readinessDimension || !normalized.resultingReadinessState ||
    !normalized.visibility
  ) return null;
  return Object.freeze(normalized);
}

export async function recordWorkPreparationEvent({
  jobId,
  planId,
  itemId = null,
  expectedVersion,
  eventType,
  visibility = "BUSINESS_ONLY",
  customerVisibleNote = null,
  internalNote = null,
  idempotencyKey,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const identity = normalizedIdentityCommand({ jobId, planId, idempotencyKey });
  const normalizedItemId = uuid(itemId, { nullable: true });
  const version = integer(expectedVersion);
  const customerNote = text(customerVisibleNote, 1000, { nullable: true });
  const privateNote = text(internalNote, 2000, { nullable: true });
  if (
    (itemId != null && !normalizedItemId) || !version || !EVENT_TYPE_SET.has(eventType) ||
    !VISIBILITIES.has(visibility) ||
    (customerVisibleNote != null && !customerNote) ||
    (internalNote != null && !privateNote) ||
    (visibility === "CUSTOMER_VISIBLE" && !customerNote) ||
    (visibility === "BUSINESS_ONLY" && customerNote)
  ) {
    throw new WorkPreparationApiError({ status: 400, code: "INVALID_WORK_PREPARATION_EVENT" });
  }
  const { data } = await request(
    `/jobs/${encodeURIComponent(identity.jobId)}/work-preparation/${encodeURIComponent(identity.planId)}/events`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Idempotency-Key": identity.idempotencyKey },
      body: JSON.stringify({
        itemId: normalizedItemId,
        expectedVersion: version,
        eventType,
        visibility,
        customerVisibleNote: customerNote,
        internalNote: privateNote,
      }),
    },
    setPage,
    authFetchImpl
  );
  const event = normalizeEventResponse(data.event, {
    planId: identity.planId,
    planVersion: version,
    itemId: normalizedItemId,
    eventType,
  });
  if (data.code !== "WORK_PREPARATION_EVENT_RECORDED" || !event) {
    throw new WorkPreparationApiError({ status: 502, code: "UNSAFE_WORK_PREPARATION_RESPONSE" });
  }
  return Object.freeze({ code: data.code, event, replayed: data.replayed === true });
}

export function formatWorkPreparationMoney(minor, currencyCode, language = "en") {
  if (!Number.isSafeInteger(minor) || minor < 0 || !currency(currencyCode)) return "—";
  const locale = { en: "en-US", es: "es", fr: "fr", "pt-BR": "pt-BR" }[language] || "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currencyCode}`;
  }
}

export function validWorkPreparationReferenceNamespace(value) {
  return typeof value === "string" && REFERENCE_PATTERN.test(value.trim());
}
