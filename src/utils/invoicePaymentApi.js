import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID"]);
const METHODS = new Set(["CASH", "CHECK", "BANK_TRANSFER", "OTHER"]);

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

function uuid(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

function integer(value, { zero = false } = {}) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= (zero ? 0 : 1) ? parsed : null;
}

function text(value, maximum = 2000, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  return typeof value === "string" && value.trim() && value.length <= maximum
    ? value.trim()
    : "";
}

function date(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : "";
}

function timestamp(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || !value.trim()) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function currency(value) {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : "";
}

function validateDue(value) {
  if (!exact(value, ["mode", "date"])) return null;
  if (value.mode === "DUE_ON_RECEIPT" && value.date == null) {
    return { mode: value.mode, date: null };
  }
  const dueDate = date(value.date);
  return value.mode === "SPECIFIC_DATE" && dueDate
    ? { mode: value.mode, date: dueDate }
    : null;
}

function validateParty(value, key) {
  if (!exact(value, [key])) return null;
  const normalized = text(value[key], 500);
  return normalized ? { [key]: normalized } : null;
}

function validateJob(value) {
  if (!exact(value, ["title", "service"])) return null;
  const title = text(value.title, 500);
  const service = text(value.service, 500, { nullable: true });
  return title && (value.service == null || service)
    ? { title, service }
    : null;
}

function validateLine(value, audience) {
  const approved = value?.type === "approvedWork";
  const customerKeys = ["sequence", "type", "description", "quantity", "unitAmountMinor", "lineTotalMinor"];
  const professionalKeys = approved
    ? [...customerKeys, "lineItemId", "sourceQuoteId", "sourceQuoteVersion", "sourceScopeItemId", "lineageLabel"]
    : [...customerKeys, "lineItemId"];
  if (!exact(value, audience === "professional" ? professionalKeys : customerKeys)) return null;
  const normalized = {
    sequence: integer(value.sequence),
    type: approved ? "approvedWork" : value.type === "extraWork" ? "extraWork" : "",
    description: text(value.description, 1000),
    quantity: integer(value.quantity),
    unitAmountMinor: integer(value.unitAmountMinor, { zero: true }),
    lineTotalMinor: integer(value.lineTotalMinor, { zero: true }),
  };
  if (audience === "professional") {
    normalized.lineItemId = uuid(value.lineItemId);
    if (approved) {
      normalized.sourceQuoteId = uuid(value.sourceQuoteId);
      normalized.sourceQuoteVersion = integer(value.sourceQuoteVersion);
      normalized.sourceScopeItemId = uuid(value.sourceScopeItemId);
      normalized.lineageLabel = new Set(["ORIGINAL", "REVISED", "ADDITIONAL"]).has(value.lineageLabel)
        ? value.lineageLabel
        : "";
    }
  }
  if (
    !normalized.sequence || !normalized.type || !normalized.description ||
    !normalized.quantity || normalized.unitAmountMinor == null ||
    normalized.lineTotalMinor !== normalized.unitAmountMinor * normalized.quantity ||
    (audience === "professional" &&
      (!normalized.lineItemId || (approved && (
        !normalized.sourceQuoteId || !normalized.sourceQuoteVersion ||
        !normalized.sourceScopeItemId || !normalized.lineageLabel
      ))))
  ) return null;
  return normalized;
}

function validatePayment(value, audience) {
  const customerKeys = [
    "amountMinor", "currency", "receivedDate", "method",
    "customerReference", "recordedAt",
  ];
  const professionalKeys = [...customerKeys, "paymentId"];
  if (!exact(value, audience === "professional" ? professionalKeys : customerKeys)) return null;
  const normalized = {
    amountMinor: integer(value.amountMinor),
    currency: currency(value.currency),
    receivedDate: date(value.receivedDate),
    method: METHODS.has(value.method) ? value.method : "",
    customerReference: text(value.customerReference, 500, { nullable: true }),
    recordedAt: timestamp(value.recordedAt),
  };
  if (audience === "professional") normalized.paymentId = uuid(value.paymentId);
  if (
    !normalized.amountMinor || !normalized.currency || !normalized.receivedDate ||
    !normalized.method || !normalized.recordedAt ||
    (value.customerReference != null && !normalized.customerReference) ||
    (audience === "professional" && !normalized.paymentId)
  ) return null;
  return normalized;
}

export function validateInvoice(value, { audience, invoiceId = "", jobId = "" } = {}) {
  const baseKeys = [
    "contractVersion", "invoiceId", "invoiceNumber", "jobId", "requestId",
    "relationshipId", "conversationId", "business", "customer", "job", "status",
    "currency", "invoiceDate", "due", "lineItems", "subtotalMinor", "totalMinor",
    "paidMinor", "balanceMinor", "customerNotes", "terms", "issuedAt", "payments",
    "actions",
  ];
  const keys = audience === "professional" ? [...baseKeys, "currentVersion"] : baseKeys;
  if (!exact(value, keys) || !Array.isArray(value.lineItems) || value.lineItems.length > 500 ||
      !Array.isArray(value.payments) || value.payments.length > 500) return null;
  const lines = value.lineItems.map((line) => validateLine(line, audience));
  const payments = value.payments.map((payment) => validatePayment(payment, audience));
  const expectedActions = audience === "professional"
    ? ["canIssue", "canRecordPayment", "canShareExternal"]
    : ["canReview", "canPayOnline"];
  const normalized = {
    contractVersion: integer(value.contractVersion),
    invoiceId: uuid(value.invoiceId),
    invoiceNumber: text(value.invoiceNumber, 40),
    jobId: uuid(value.jobId),
    requestId: integer(value.requestId),
    relationshipId: integer(value.relationshipId),
    conversationId: value.conversationId == null ? null : integer(value.conversationId),
    business: validateParty(value.business, "displayName"),
    customer: validateParty(value.customer, "displayName"),
    job: validateJob(value.job),
    status: STATUSES.has(value.status) ? value.status : "",
    currency: currency(value.currency),
    invoiceDate: date(value.invoiceDate),
    due: validateDue(value.due),
    lineItems: lines,
    subtotalMinor: integer(value.subtotalMinor),
    totalMinor: integer(value.totalMinor),
    paidMinor: integer(value.paidMinor, { zero: true }),
    balanceMinor: integer(value.balanceMinor, { zero: true }),
    customerNotes: text(value.customerNotes, 2000, { nullable: true }),
    terms: text(value.terms, 2000, { nullable: true }),
    issuedAt: timestamp(value.issuedAt, { nullable: true }),
    payments,
    actions: exact(value.actions, expectedActions) &&
      expectedActions.every((key) => typeof value.actions[key] === "boolean")
      ? Object.fromEntries(expectedActions.map((key) => [key, value.actions[key]]))
      : null,
  };
  if (audience === "professional") normalized.currentVersion = integer(value.currentVersion);
  const exactInvoiceId = uuid(invoiceId);
  const exactJobId = uuid(jobId);
  if (
    normalized.contractVersion !== 1 || !normalized.invoiceId || !normalized.invoiceNumber ||
    !normalized.jobId || !normalized.requestId || !normalized.relationshipId ||
    !normalized.business || !normalized.customer || !normalized.job || !normalized.status ||
    !normalized.currency || !normalized.invoiceDate || !normalized.due ||
    lines.some((line) => !line) || payments.some((payment) => !payment) ||
    !normalized.subtotalMinor || normalized.totalMinor !== normalized.subtotalMinor ||
    normalized.paidMinor == null || normalized.balanceMinor == null ||
    normalized.totalMinor !== normalized.paidMinor + normalized.balanceMinor ||
    !normalized.actions || (value.customerNotes != null && !normalized.customerNotes) ||
    (value.terms != null && !normalized.terms) ||
    (value.issuedAt != null && !normalized.issuedAt) ||
    (audience === "professional" && !normalized.currentVersion) ||
    (exactInvoiceId && normalized.invoiceId !== exactInvoiceId) ||
    (exactJobId && normalized.jobId !== exactJobId)
  ) return null;
  if (audience === "customer" && (normalized.status === "DRAFT" || normalized.actions.canPayOnline)) {
    return null;
  }
  return Object.freeze(normalized);
}

function validateReadyJob(value) {
  if (!exact(value, [
    "jobId", "requestId", "relationshipId", "customerName", "serviceTitle",
    "completedAt", "completionVersion", "approvedAmount", "paymentsReceivedMinor",
    "amountStillDueMinor", "approvedWork",
  ])) return null;
  const amount = value.approvedAmount == null ? null : (() => {
    if (!exact(value.approvedAmount, ["currency", "totalMinor"])) return false;
    const normalized = {
      currency: currency(value.approvedAmount.currency),
      totalMinor: integer(value.approvedAmount.totalMinor),
    };
    return normalized.currency && normalized.totalMinor ? normalized : false;
  })();
  const normalized = {
    jobId: uuid(value.jobId),
    requestId: integer(value.requestId),
    relationshipId: integer(value.relationshipId),
    customerName: text(value.customerName, 500),
    serviceTitle: text(value.serviceTitle, 500),
    completedAt: timestamp(value.completedAt),
    completionVersion: integer(value.completionVersion),
    approvedAmount: amount,
    paymentsReceivedMinor: integer(value.paymentsReceivedMinor, { zero: true }),
    amountStillDueMinor: integer(value.amountStillDueMinor, { zero: true }),
    approvedWork: Array.isArray(value.approvedWork) ? value.approvedWork.map((item) => {
      if (!exact(item, ["description", "quantity", "unitAmountMinor", "lineTotalMinor"])) return null;
      const line = {
        description: text(item.description, 1000),
        quantity: integer(item.quantity),
        unitAmountMinor: integer(item.unitAmountMinor, { zero: true }),
        lineTotalMinor: integer(item.lineTotalMinor, { zero: true }),
      };
      return line.description && line.quantity && line.unitAmountMinor != null &&
        line.lineTotalMinor === line.quantity * line.unitAmountMinor ? line : null;
    }) : null,
  };
  return normalized.jobId && normalized.requestId && normalized.relationshipId &&
    normalized.customerName && normalized.serviceTitle && normalized.completedAt &&
    normalized.completionVersion && amount !== false &&
    normalized.paymentsReceivedMinor != null && normalized.amountStillDueMinor != null &&
    normalized.approvedWork?.every(Boolean) ? normalized : null;
}

export function validateInvoiceWorkspace(value) {
  if (!exact(value, ["contractVersion", "summary", "readyJobs", "invoices", "limit"]) ||
      !exact(value.summary, [
        "readyToInvoice", "drafts", "waitingForPayment", "paid",
        "totalOutstandingMinor", "currency",
      ]) || !Array.isArray(value.readyJobs) || !Array.isArray(value.invoices)) return null;
  const readyJobs = value.readyJobs.map(validateReadyJob);
  const invoices = value.invoices.map((invoice) => {
    if (!exact(invoice, [
      "invoiceId", "invoiceNumber", "jobId", "requestId", "relationshipId",
      "customerName", "serviceTitle", "currentVersion", "status", "currency",
      "totalMinor", "paidMinor", "balanceMinor", "invoiceDate", "due", "issuedAt",
    ])) return null;
    const normalized = {
      invoiceId: uuid(invoice.invoiceId), invoiceNumber: text(invoice.invoiceNumber, 40),
      jobId: uuid(invoice.jobId), requestId: integer(invoice.requestId),
      relationshipId: integer(invoice.relationshipId), customerName: text(invoice.customerName, 500),
      serviceTitle: text(invoice.serviceTitle, 500), currentVersion: integer(invoice.currentVersion),
      status: STATUSES.has(invoice.status) ? invoice.status : "", currency: currency(invoice.currency),
      totalMinor: integer(invoice.totalMinor), paidMinor: integer(invoice.paidMinor, { zero: true }),
      balanceMinor: integer(invoice.balanceMinor, { zero: true }), invoiceDate: date(invoice.invoiceDate),
      due: validateDue(invoice.due), issuedAt: timestamp(invoice.issuedAt, { nullable: true }),
    };
    return Object.values(normalized).some((item) => item === "" || item === undefined) ||
      normalized.paidMinor == null || normalized.balanceMinor == null ||
      normalized.totalMinor !== normalized.paidMinor + normalized.balanceMinor
      ? null : normalized;
  });
  const summary = {
    readyToInvoice: integer(value.summary.readyToInvoice, { zero: true }),
    drafts: integer(value.summary.drafts, { zero: true }),
    waitingForPayment: integer(value.summary.waitingForPayment, { zero: true }),
    paid: integer(value.summary.paid, { zero: true }),
    totalOutstandingMinor: value.summary.totalOutstandingMinor == null
      ? null : integer(value.summary.totalOutstandingMinor, { zero: true }),
    currency: value.summary.currency == null ? null : currency(value.summary.currency),
  };
  return value.contractVersion === 1 && readyJobs.every(Boolean) && invoices.every(Boolean) &&
    Object.values(summary).every((item) => item !== "") && integer(value.limit)
    ? Object.freeze({ contractVersion: 1, summary, readyJobs, invoices, limit: integer(value.limit) })
    : null;
}

export function normalizeInvoiceDeliverySnapshot(value, { invoiceId, jobId } = {}) {
  const keys = [
    "schemaVersion", "invoiceId", "invoiceNumber", "jobId", "status", "totalMinor",
    "balanceMinor", "currency", "due", "business", "job", "issuedAt",
  ];
  if (!exact(value, keys)) return null;
  const normalized = {
    schemaVersion: integer(value.schemaVersion), invoiceId: uuid(value.invoiceId),
    invoiceNumber: text(value.invoiceNumber, 40), jobId: uuid(value.jobId),
    status: value.status === "SENT" ? "SENT" : "", totalMinor: integer(value.totalMinor),
    balanceMinor: integer(value.balanceMinor, { zero: true }), currency: currency(value.currency),
    due: validateDue(value.due), business: validateParty(value.business, "displayName"),
    job: validateJob(value.job), issuedAt: timestamp(value.issuedAt),
  };
  return normalized.schemaVersion === 1 && normalized.invoiceId === uuid(invoiceId) &&
    normalized.jobId === uuid(jobId) && normalized.invoiceNumber && normalized.status &&
    normalized.totalMinor && normalized.balanceMinor != null &&
    normalized.balanceMinor <= normalized.totalMinor && normalized.currency &&
    normalized.due && normalized.business && normalized.job && normalized.issuedAt
    ? Object.freeze(normalized) : null;
}

export class InvoicePaymentApiError extends Error {
  constructor({ status = 500, code = "INVOICE_PAYMENT_FAILED", message } = {}) {
    super(message || "Invoice details are temporarily unavailable.");
    this.name = "InvoicePaymentApiError";
    this.status = status;
    this.code = code;
  }
}

async function request(endpoint, options, setPage, authFetchImpl) {
  const { response, data } = await authFetchImpl(endpoint, options, setPage);
  if (!response.ok || data?.success !== true) {
    throw new InvoicePaymentApiError({ status: response.status, code: data?.code, message: data?.message });
  }
  return data;
}

function commandOptions(body, idempotencyKey) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  };
}

export async function fetchProfessionalInvoiceWorkspace({ limit = 20, setPage, authFetchImpl = authFetch } = {}) {
  const bounded = integer(limit);
  if (!bounded || bounded > 50) throw new InvoicePaymentApiError({ status: 400, code: "INVALID_INVOICE_WORKSPACE_PAGE" });
  const data = await request(`/professional/invoices/workspace?limit=${bounded}`, { method: "GET", cache: "no-store" }, setPage, authFetchImpl);
  const workspace = validateInvoiceWorkspace(data.workspace);
  if (!workspace) throw new InvoicePaymentApiError({ status: 502, code: "UNSAFE_INVOICE_WORKSPACE_RESPONSE" });
  return workspace;
}

export async function fetchProfessionalInvoice({ invoiceId, setPage, authFetchImpl = authFetch } = {}) {
  const id = uuid(invoiceId);
  if (!id) throw new InvoicePaymentApiError({ status: 400, code: "INVALID_INVOICE_ID" });
  const data = await request(`/professional/invoices/${id}`, { method: "GET", cache: "no-store" }, setPage, authFetchImpl);
  const invoice = validateInvoice(data.invoice, { audience: "professional", invoiceId: id });
  if (!invoice) throw new InvoicePaymentApiError({ status: 502, code: "UNSAFE_PROFESSIONAL_INVOICE_RESPONSE" });
  return invoice;
}

export async function fetchProfessionalJobInvoice({ jobId, setPage, authFetchImpl = authFetch } = {}) {
  const id = uuid(jobId);
  if (!id) throw new InvoicePaymentApiError({ status: 400, code: "INVALID_JOB_ID" });
  const data = await request(`/professional/jobs/${id}/invoice`, { method: "GET", cache: "no-store" }, setPage, authFetchImpl);
  const invoice = validateInvoice(data.invoice, { audience: "professional", jobId: id });
  if (!invoice) throw new InvoicePaymentApiError({ status: 502, code: "UNSAFE_PROFESSIONAL_INVOICE_RESPONSE" });
  return invoice;
}

export async function fetchCustomerInvoice({ invoiceId, setPage, authFetchImpl = authFetch } = {}) {
  const id = uuid(invoiceId);
  if (!id) throw new InvoicePaymentApiError({ status: 400, code: "INVALID_INVOICE_ID" });
  const data = await request(`/customer/invoices/${id}`, { method: "GET", cache: "no-store" }, setPage, authFetchImpl);
  const invoice = validateInvoice(data.invoice, { audience: "customer", invoiceId: id });
  if (!invoice) throw new InvoicePaymentApiError({ status: 502, code: "UNSAFE_CUSTOMER_INVOICE_RESPONSE" });
  return invoice;
}

export async function fetchCustomerJobInvoice({ jobId, setPage, authFetchImpl = authFetch } = {}) {
  const id = uuid(jobId);
  if (!id) throw new InvoicePaymentApiError({ status: 400, code: "INVALID_JOB_ID" });
  const data = await request(`/customer/jobs/${id}/invoice`, { method: "GET", cache: "no-store" }, setPage, authFetchImpl);
  const invoice = validateInvoice(data.invoice, { audience: "customer", jobId: id });
  if (!invoice) throw new InvoicePaymentApiError({ status: 502, code: "UNSAFE_CUSTOMER_INVOICE_RESPONSE" });
  return invoice;
}

export async function createCanonicalInvoice({ jobId, expectedCompletionVersion, due, customerNotes = null, terms = null, extraWork = [], idempotencyKey, setPage, authFetchImpl = authFetch } = {}) {
  const id = uuid(jobId);
  const version = integer(expectedCompletionVersion);
  const normalizedExtraWork = Array.isArray(extraWork) && extraWork.length <= 100
    ? extraWork.map((item) => ({
        description: text(item?.description, 1000),
        quantity: integer(item?.quantity),
        unitAmountMinor: integer(item?.unitAmountMinor, { zero: true }),
      }))
    : null;
  if (!id || !version || !text(idempotencyKey, 200) || !validateDue(due) ||
      !normalizedExtraWork || normalizedExtraWork.some((item) =>
        !item.description || !item.quantity || item.unitAmountMinor == null)) {
    throw new InvoicePaymentApiError({ status: 400, code: "INVALID_INVOICE_CREATE_COMMAND" });
  }
  const data = await request(`/professional/jobs/${id}/invoices`, commandOptions({ expectedCompletionVersion: version, due, customerNotes, terms, extraWork: normalizedExtraWork }, idempotencyKey), setPage, authFetchImpl);
  const invoice = validateInvoice(data.invoice, { audience: "professional", jobId: id });
  if (!invoice) throw new InvoicePaymentApiError({ status: 502, code: "UNSAFE_PROFESSIONAL_INVOICE_RESPONSE" });
  return invoice;
}

export async function issueCanonicalInvoice({ invoiceId, expectedVersion, idempotencyKey, setPage, authFetchImpl = authFetch } = {}) {
  const id = uuid(invoiceId);
  const version = integer(expectedVersion);
  if (!id || !version || !text(idempotencyKey, 200)) throw new InvoicePaymentApiError({ status: 400, code: "INVALID_INVOICE_ISSUE_COMMAND" });
  const data = await request(`/professional/invoices/${id}/issue`, commandOptions({ expectedVersion: version }, idempotencyKey), setPage, authFetchImpl);
  const invoice = validateInvoice(data.invoice, { audience: "professional", invoiceId: id });
  if (!invoice || !plain(data.delivery) || uuid(data.delivery.invoiceId) !== id) {
    throw new InvoicePaymentApiError({ status: 502, code: "UNSAFE_INVOICE_DELIVERY_RESPONSE" });
  }
  return { invoice, delivery: data.delivery, replayed: data.replayed === true };
}

export async function recordCanonicalPayment({ invoiceId, expectedVersion, amountMinor, method, receivedDate, customerReference = null, idempotencyKey, setPage, authFetchImpl = authFetch } = {}) {
  const id = uuid(invoiceId);
  const version = integer(expectedVersion);
  const amount = integer(amountMinor);
  if (!id || !version || !amount || !METHODS.has(method) || !date(receivedDate) || !text(idempotencyKey, 200)) {
    throw new InvoicePaymentApiError({ status: 400, code: "INVALID_PAYMENT_COMMAND" });
  }
  const data = await request(`/professional/invoices/${id}/payments`, commandOptions({ expectedVersion: version, amountMinor: amount, method, receivedDate, customerReference }, idempotencyKey), setPage, authFetchImpl);
  const invoice = validateInvoice(data.invoice, { audience: "professional", invoiceId: id });
  const payment = invoice?.payments.find((item) => item.paymentId === data.payment?.paymentId);
  if (!invoice || !payment) throw new InvoicePaymentApiError({ status: 502, code: "UNSAFE_PAYMENT_RESPONSE" });
  return { invoice, payment, replayed: data.replayed === true };
}

export function createInvoiceCommandKey(prefix, cryptoProvider = globalThis.crypto) {
  const suffix = cryptoProvider?.randomUUID?.();
  if (!suffix) throw new InvoicePaymentApiError({ status: 500, code: "INVOICE_IDEMPOTENCY_UNAVAILABLE" });
  return `${prefix}-${suffix}`;
}
