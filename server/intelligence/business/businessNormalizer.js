import { mapStatusToWorkflowStage, normalizeWorkflowStatus } from "../workflow/workflowStageMap.js";

function text(value) { return value === undefined || value === null ? "" : String(value).trim(); }
function first(...values) { return values.find((value) => value !== undefined && value !== null && String(value).trim() !== ""); }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function bool(value) { return value === true; }

function kindFromSource(source = "") {
  const value = source.toLowerCase();
  if (/proposal|quote/.test(value)) return "proposal";
  if (/invoice/.test(value)) return "invoice";
  if (/receipt/.test(value)) return "receipt";
  if (/payment|deposit/.test(value)) return "payment";
  if (/schedule|visit/.test(value)) return "schedule";
  if (/evaluation/.test(value)) return "evaluation";
  if (/completion/.test(value)) return "completion";
  if (/closure/.test(value)) return "closure";
  if (/history/.test(value)) return "history";
  if (/emergency/.test(value)) return "emergency";
  if (/relationship|conversation/.test(value)) return "relationship";
  return "workflow";
}

export function normalizeBusinessRecord({ source = "", record = {} } = {}) {
  const status = normalizeWorkflowStatus(first(record.status, record.workflowStatus, record.workflowStage, record.stage, record.workStatus, record.jobStage));
  const proposalStatus = normalizeWorkflowStatus(first(record.proposalStatus, record.quoteStatus, kindFromSource(source) === "proposal" ? record.status : ""));
  const invoiceStatus = normalizeWorkflowStatus(first(record.invoiceStatus, kindFromSource(source) === "invoice" ? record.status : ""));
  const receiptStatus = normalizeWorkflowStatus(first(record.receiptStatus, kindFromSource(source) === "receipt" ? record.status : ""));
  const stage = text(record.currentStage || mapStatusToWorkflowStage(status) || mapStatusToWorkflowStage(proposalStatus));
  return {
    source,
    kind: kindFromSource(source),
    isEmergency: kindFromSource(source) === "emergency" || Boolean(record.emergencyRequestId),
    businessId: text(record.businessId || record.business_id || record.professionalBusinessId || record.providerBusinessId),
    jobId: text(record.jobId || record.activeJobId), projectId: text(record.projectId || record.activeProjectId),
    requestId: text(record.requestId), emergencyRequestId: text(record.emergencyRequestId),
    conversationId: text(record.conversationId), completionId: text(record.completionId), closureId: text(record.closureId),
    historyId: text(record.historyId || record.historyRecordId), proposalId: text(record.proposalId || record.quoteId),
    invoiceId: text(record.invoiceId), receiptId: text(record.receiptId), scheduleId: text(record.scheduleId || record.visitId),
    paymentId: text(record.paymentId || record.depositId),
    evaluationId: text(record.evaluationId), status, stage, proposalStatus, invoiceStatus, receiptStatus,
    waitingOn: text(record.waitingOn?.actor || record.waitingOn || record.responsibility),
    blockers: Array.isArray(record.blockers) ? record.blockers.map((item) => text(item.code || item)).filter(Boolean).slice(0, 8) : [],
    scheduledAt: text(first(record.scheduledAt, record.startAt, record.visitAt, record.appointmentDate)),
    endAt: text(first(record.endAt, record.scheduledEndAt)), dueAt: text(first(record.dueAt, record.responseDueAt, record.slaDueAt)),
    explicitOverdue: bool(record.overdue) || status === "overdue", explicitConflict: bool(record.conflict) || bool(record.scheduleConflict),
    completedAt: text(record.completedAt), closedAt: text(record.closedAt), createdAt: text(record.createdAt), updatedAt: text(record.updatedAt),
    completionRecorded: bool(record.completionRecorded) || Boolean(record.completionId || record.completionRecord || record.completedAt),
    closureRecorded: bool(record.closureRecorded) || Boolean(record.closureId || record.closureRecord || record.closedAt),
    historyRecorded: bool(record.savedToHistory) || Boolean(record.historyId || record.historyRecordId || record.readOnlyHistory),
    evaluationComplete: bool(record.evaluationComplete) || Boolean(record.evaluationCompletedAt),
    approved: bool(record.approved) || ["approved", "accepted", "quote_approved", "customer_accepted"].includes(proposalStatus),
    paid: bool(record.paid) || Boolean(record.paidAt || record.paymentReceivedAt) || ["paid", "collected", "recorded", "received"].includes(invoiceStatus) || (kindFromSource(source) === "payment" && ["paid", "collected", "recorded", "received"].includes(status)),
    receiptResolved: bool(record.receiptDelivered) || Boolean(record.receiptSentAt) || ["sent", "delivered", "complete", "completed"].includes(receiptStatus),
    amount: number(first(record.totalAmount, record.quoteTotal, record.amount, record.total)),
    recordedRevenue: number(first(record.recordedRevenue, record.collectedRevenue, record.revenueRecorded)),
    currency: text(record.currency || record.currencyCode).toUpperCase(),
  };
}
