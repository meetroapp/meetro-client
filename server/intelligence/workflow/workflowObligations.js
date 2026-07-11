import { normalizeWorkflowStatus } from "./workflowStageMap.js";

const SATISFIED = new Set(["paid", "received", "complete", "completed", "satisfied", "approved", "confirmed", "sent", "created", "ready", "closed"]);
const PENDING = new Set(["pending", "due", "required", "waiting", "unresolved", "open", "missing", "blocked"]);

function present(record, fields) {
  return fields.some((field) => record[field] !== undefined && record[field] !== null && record[field] !== "");
}

function state(record, fields, { requiredFields = [], existsFields = [], notDue = false } = {}) {
  const required = requiredFields.some((field) => record[field] === true);
  const explicitlyNotRequired = requiredFields.some((field) => record[field] === false);
  const raw = fields.map((field) => normalizeWorkflowStatus(record[field])).find(Boolean) || "";
  if (raw === "not_required" || raw === "n/a") return "not_required";
  if (SATISFIED.has(raw) || existsFields.some((field) => Boolean(record[field]))) return "satisfied";
  if (PENDING.has(raw)) return raw === "blocked" ? "blocked" : "pending";
  if (required) return "missing";
  if (explicitlyNotRequired) return "not_required";
  if (notDue) return "not_due";
  if (present(record, [...fields, ...requiredFields])) return "unknown";
  return requiredFields.length ? "not_required" : "unknown";
}

export function evaluateWorkflowObligations(record = {}, stage = "") {
  const beforeCompletion = !["completion", "invoice_receipt", "closure", "job_history"].includes(stage);
  const approvalStatus = normalizeWorkflowStatus(record.approvalStatus || record.proposalStatus || record.quoteStatus);
  const customerApproval = ["approved", "accepted", "quote_approved"].includes(approvalStatus) || record.customerApproved || record.proposalApproved || record.quoteApproved
    ? "satisfied"
    : ["sent", "viewed", "waiting_approval", "proposal_sent", "quote_sent", "pending_customer_approval"].includes(approvalStatus)
      ? "pending"
      : record.customerApprovalRequired
        ? "missing"
        : "unknown";
  return {
    payment: state(record, ["paymentStatus", "finalPaymentStatus", "balanceStatus"], { requiredFields: ["paymentRequired", "finalPaymentRequired"], existsFields: ["paymentReceived", "paid", "finalBalancePaid"], notDue: beforeCompletion }),
    deposit: state(record, ["depositStatus"], { requiredFields: ["depositRequired"], existsFields: ["depositPaid", "depositReceived", "depositRecorded"], notDue: !["payment_deposit", "schedule_work", "perform_work", "completion", "invoice_receipt", "closure", "job_history"].includes(stage) }),
    invoice: state(record, ["invoiceStatus"], { requiredFields: ["invoiceRequired"], existsFields: ["invoice", "invoiceId"], notDue: beforeCompletion }),
    receipt: state(record, ["receiptStatus"], { requiredFields: ["receiptRequired"], existsFields: ["receipt", "receiptId"], notDue: beforeCompletion }),
    permits: state(record, ["permitStatus"], { requiredFields: ["permitRequired"], existsFields: ["permitApproved", "permitClosed"] }),
    inspection: state(record, ["inspectionStatus"], { requiredFields: ["inspectionRequired"], existsFields: ["inspectionPassed", "inspectionComplete"] }),
    documents: state(record, ["documentationStatus", "documentStatus"], { requiredFields: ["documentationRequired", "finalDocumentsRequired"], existsFields: ["documentsComplete", "documentsAcknowledged"] }),
    customerApproval,
    customerConfirmation: state(record, ["customerConfirmationStatus", "scheduleConfirmationStatus", "completionStatus"], { requiredFields: ["customerConfirmationRequired", "completionConfirmationRequired"], existsFields: ["customerConfirmed", "completionConfirmed"] }),
    completionRecord: state(record, ["completionStatus"], { requiredFields: ["completionRecordRequired"], existsFields: ["completionRecord", "completionId", "completedAt"] }),
    closureRecord: state(record, ["closureStatus"], { requiredFields: ["closureRecordRequired"], existsFields: ["closureRecord", "closureRecordId", "closedAt"] }),
    historyNormalization: state(record, ["historyStatus"], { requiredFields: ["historyNormalizationRequired"], existsFields: ["readOnlyHistory", "savedToHistory", "historyRecordId"] }),
  };
}
