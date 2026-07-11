import { mapStatusToWorkflowStage, normalizeWorkflowStatus } from "../workflow/workflowStageMap.js";

function text(value) { return value === undefined || value === null ? "" : String(value).trim(); }
function status(record = {}) { return normalizeWorkflowStatus(record.status || record.workflowStatus || record.workflowStage || record.workStatus || record.proposalStatus || record.quoteStatus || record.invoiceStatus); }
function stage(record = {}) { return mapStatusToWorkflowStage(status(record)); }
function identity(entry = {}) {
  const record = entry.record || {};
  if (record.emergencyRequestId) return `emergency:${text(record.emergencyRequestId)}`;
  if (record.jobId || record.projectId) return `job:${text(record.jobId || record.projectId)}`;
  if (record.requestId) return `request:${text(record.requestId)}`;
  if (record.proposalId || record.quoteId) return `proposal:${text(record.proposalId || record.quoteId)}`;
  if (record.invoiceId) return `invoice:${text(record.invoiceId)}`;
  if (record.conversationId || (entry.kind === "conversation" && record.id)) return `conversation:${text(record.conversationId || record.id)}`;
  return "";
}

function unique(entries, predicate) {
  const seen = new Set();
  return entries.filter(predicate).filter((entry) => {
    const key = identity(entry);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isClosed(entry) {
  const record = entry.record || {};
  return stage(record) === "job_history" || Boolean(record.closedAt || record.readOnlyHistory || record.savedToHistory) || ["closed", "closure_completed", "history", "archived"].includes(status(record));
}
function isCompleted(entry) { return ["completion", "invoice_receipt", "closure", "job_history"].includes(stage(entry.record || {})) || Boolean(entry.record?.completedAt || entry.record?.completionId); }
function isActive(entry) { return ["relationship", "communication", "schedule", "evaluation", "proposal", "customer_approval", "payment_deposit", "schedule_work", "perform_work"].includes(stage(entry.record || {})); }

export function buildRelationshipActivity(records = []) {
  const requests = unique(records, (entry) => Boolean(entry.record?.requestId) || entry.kind === "request");
  const jobs = unique(
    [...records].sort((left, right) => Number(isClosed(right)) - Number(isClosed(left)) || Number(isCompleted(right)) - Number(isCompleted(left))),
    (entry) => Boolean(entry.record?.jobId || entry.record?.projectId || entry.record?.emergencyRequestId) || ["workflow", "emergency", "completion", "closure", "history"].includes(entry.kind)
  );
  const conversations = unique(records, (entry) => entry.kind === "conversation" || entry.kind === "hiring");
  const proposals = unique(records, (entry) => entry.kind === "proposal" || Boolean(entry.record?.proposalId || entry.record?.quoteId));
  const invoices = unique(records, (entry) => entry.kind === "invoice" || Boolean(entry.record?.invoiceId));
  const emergencies = unique(records, (entry) => entry.kind === "emergency" || Boolean(entry.record?.emergencyRequestId));
  const hiring = unique(records, (entry) => entry.kind === "hiring" || /hiring|applicant/.test(`${entry.record?.type || ""} ${entry.record?.category || ""}`.toLowerCase()));
  const community = unique(records, (entry) => entry.kind === "community" || /community/.test(`${entry.record?.type || ""} ${entry.record?.category || ""}`.toLowerCase()));
  const openProposal = (entry) => ["draft", "proposal_ready", "ready", "ready_to_send", "proposal_sent", "quote_sent", "sent", "viewed", "waiting_approval", "pending_customer_approval", "revision_requested"].includes(status(entry.record));
  const unpaidInvoice = (entry) => !["paid", "satisfied", "closed"].includes(normalizeWorkflowStatus(entry.record?.paymentStatus || entry.record?.invoiceStatus));

  return {
    summary: {
      totalRequests: requests.length,
      activeRequests: requests.filter(isActive).length,
      completedJobs: jobs.filter(isCompleted).length,
      closedJobs: jobs.filter(isClosed).length,
      emergencyJobs: emergencies.length,
      activeEmergencies: emergencies.filter(isActive).length,
      openProposals: proposals.filter(openProposal).length,
      approvedProposals: proposals.filter((entry) => ["approved", "accepted", "quote_approved"].includes(status(entry.record))).length,
      unpaidInvoices: invoices.filter(unpaidInvoice).length,
      openConversations: conversations.filter((entry) => !["closed", "archived", "blocked", "revoked"].includes(status(entry.record))).length,
      unresolvedFollowUps: 0,
      hiringConversations: hiring.length,
      communityInteractions: community.length,
    },
    facts: { requests, jobs, conversations, proposals, invoices, emergencies },
  };
}

export function selectCurrentEngagement(records = [], workflow = {}) {
  const priority = { emergency: 100, perform_work: 90, schedule_work: 80, schedule: 70, customer_approval: 60, proposal: 55, evaluation: 50, relationship: 40, communication: 40, invoice_receipt: 30, job_history: 10 };
  const candidates = records.map((entry, index) => {
    const currentStage = stage(entry.record);
    const emergencyScore = entry.kind === "emergency" && isActive(entry) ? 100 : 0;
    return { entry, index, stage: currentStage, score: emergencyScore || priority[currentStage] || 0 };
  }).sort((a, b) => b.score - a.score || a.index - b.index);
  if (workflow.workflowId && (candidates[0]?.score || 0) < 100) {
    return {
      workflowId: workflow.workflowId,
      workflowType: workflow.workflowType,
      source: workflow.source,
      status: workflow.currentStage,
      conversationId: "",
      projectId: "",
      requestId: "",
    };
  }
  const selected = candidates[0]?.entry;
  if (!selected) return {};
  const record = selected.record;
  return {
    workflowId: text(record.jobId || record.projectId || record.emergencyRequestId || record.requestId),
    workflowType: selected.kind === "emergency" ? "emergency_job" : selected.kind === "conversation" ? "conversation_workflow" : "standard_job",
    source: selected.source,
    status: status(record),
    conversationId: text(record.conversationId || (selected.kind === "conversation" ? record.id : "")),
    projectId: text(record.projectId),
    requestId: text(record.requestId || record.emergencyRequestId),
  };
}
