import { WORKFLOW_STAGES } from "./workflowContracts.js";
import { mapStatusToWorkflowStage, normalizeWorkflowStatus } from "./workflowStageMap.js";

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function truthy(record, fields) {
  return fields.some((field) => Boolean(record[field]));
}

function mergeRelated(resolution = {}) {
  return (resolution.related || []).reduce((merged, item) => ({ ...merged, ...item.record }), {});
}

function statusCandidates(record = {}) {
  return [
    record.status,
    record.workflowStatus,
    record.workflowStage,
    record.stage,
    record.workStatus,
    record.jobStage,
    record.quoteStatus,
    record.proposalStatus,
    record.completionStatus,
    record.closureStatus,
    record.historyStatus,
  ].map(normalizeWorkflowStatus).filter(Boolean);
}

function inferStage(record = {}) {
  const statuses = statusCandidates(record);
  const mapped = statuses.map(mapStatusToWorkflowStage).filter(Boolean);
  const proposalStatus = normalizeWorkflowStatus(record.approvalStatus || record.proposalStatus || record.quoteStatus);
  const closed = statuses.some((status) => ["closed", "closure_completed"].includes(status)) || truthy(record, ["closedAt", "closureRecord", "closureRecordId"]);
  const history = truthy(record, ["readOnlyHistory", "savedToHistory", "historyRecordId"]) || statuses.some((status) => ["history", "archived"].includes(status));
  if (closed && history) return "job_history";
  if (closed) return "closure";
  if (truthy(record, ["invoice", "invoiceId", "receipt", "receiptId"]) || mapped.includes("invoice_receipt")) return "invoice_receipt";
  if (truthy(record, ["completionRecord", "completionId", "completedAt"]) || mapped.includes("completion")) return "completion";
  if (mapped.includes("perform_work")) return "perform_work";
  if (mapped.includes("schedule_work")) return "schedule_work";
  if (["approved", "accepted", "quote_approved"].includes(proposalStatus)) return "payment_deposit";
  if (["sent", "viewed", "waiting_approval", "proposal_sent", "quote_sent", "pending_customer_approval", "revision_requested", "change_requested", "changes_requested"].includes(proposalStatus)) return "customer_approval";
  if (mapped.includes("payment_deposit")) return "payment_deposit";
  if (mapped.includes("customer_approval")) return "customer_approval";
  if (truthy(record, ["proposal", "quote", "proposalId", "quoteId"]) || mapped.includes("proposal")) return "proposal";
  if (["confirmed", "complete", "completed"].includes(normalizeWorkflowStatus(record.scheduleStatus)) && normalizeWorkflowStatus(record.quoteStatus) === "needed") return "evaluation";
  if (truthy(record, ["evaluation", "evaluationId", "evaluationCompletedAt", "findings"]) || mapped.includes("evaluation")) return "evaluation";
  if (truthy(record, ["schedule", "scheduleId", "scheduledAt", "appointmentDate"]) || mapped.includes("schedule")) return "schedule";
  return mapped[0] || (truthy(record, ["conversationId"]) ? "communication" : "relationship");
}

function inferWorkflowType(resolution = {}, record = {}, stage = "") {
  if (resolution.primary?.type) return resolution.primary.type;
  if (record.emergencyRequestId) return "emergency_job";
  if (stage === "job_history") return "job_history";
  return "standard_job";
}

export function normalizeWorkflowResolution(resolution) {
  if (!resolution?.primary?.record) return null;
  const record = mergeRelated(resolution);
  const currentStage = inferStage(record);
  const workflowId = String(first(record.projectId, record.jobId, record.emergencyRequestId, record.requestId, record.completionId, record.conversationId, record.id) || "");
  if (!workflowId) return null;
  const currentIndex = WORKFLOW_STAGES.indexOf(currentStage);

  return {
    record,
    workflowId,
    workflowType: inferWorkflowType(resolution, record, currentStage),
    source: resolution.primary.source,
    matchedBy: resolution.matchedBy,
    currentStage,
    completedStages: currentIndex > 0 ? WORKFLOW_STAGES.slice(0, currentIndex) : [],
    explicitStatuses: statusCandidates(record),
    ambiguous: resolution.ambiguous,
  };
}
