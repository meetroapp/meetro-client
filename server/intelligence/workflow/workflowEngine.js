import { detectWorkflowBlockers } from "./workflowBlockers.js";
import { evaluateWorkflowConfidence } from "./workflowConfidence.js";
import { emptyWorkflowContext, WORKFLOW_STAGES } from "./workflowContracts.js";
import { inferWorkflowNextAction } from "./workflowNextAction.js";
import { normalizeWorkflowResolution } from "./workflowNormalizer.js";
import { evaluateWorkflowObligations } from "./workflowObligations.js";
import { resolveWorkflowSource } from "./workflowSourceResolver.js";

const STAGE_LABELS = Object.freeze({
  relationship: "Relationship Established",
  communication: "Communication in Progress",
  schedule: "Evaluation Visit",
  evaluation: "Evaluation",
  proposal: "Proposal Preparation",
  customer_approval: "Waiting for Customer Approval",
  payment_deposit: "Payment or Deposit",
  schedule_work: "Work Scheduling",
  perform_work: "Work in Progress",
  completion: "Completion",
  invoice_receipt: "Invoice and Receipt",
  closure: "Closure",
  job_history: "Job History",
});

function contradictionWarnings(model = {}) {
  const record = model.record || {};
  const statuses = model.explicitStatuses || [];
  const warnings = [];
  const active = statuses.some((status) => ["active", "in_progress", "working", "started", "on_the_way", "arrived"].includes(status));
  const closed = statuses.some((status) => ["closed", "closure_completed"].includes(status)) || Boolean(record.closedAt || record.closureRecord);
  const history = Boolean(record.readOnlyHistory || record.savedToHistory || record.historyRecordId) || statuses.some((status) => ["history", "archived"].includes(status));
  if (closed && !record.completionRecord && !record.completionId && !record.completedAt) warnings.push("Closure exists but no completion record is present");
  if (active && history) warnings.push("Job History exists while the source workflow remains active");
  if ((record.proposalApproved || record.quoteApproved) && !record.proposal && !record.quote && !record.proposalId && !record.quoteId) warnings.push("Proposal approval exists without a proposal record");
  if (closed && record.permitRequired && !["approved", "closed", "complete", "completed", "not_required"].includes(String(record.permitStatus || "").toLowerCase())) warnings.push("Closure exists while a required permit remains unresolved");
  if (model.ambiguous) warnings.push("Workflow identifiers conflict across supplied records");
  return warnings;
}

function safeEvidence(model = {}) {
  const record = model.record || {};
  const evidence = [];
  if (model.explicitStatuses[0]) evidence.push({ type: "status", value: model.explicitStatuses[0] });
  if (record.proposal || record.quote || record.proposalId || record.quoteId) evidence.push({ type: "proposal", exists: true, approved: Boolean(record.proposalApproved || record.quoteApproved || ["approved", "accepted", "quote_approved"].includes(String(record.proposalStatus || record.quoteStatus || "").toLowerCase())) });
  if (record.completionRecord || record.completionId || record.completedAt) evidence.push({ type: "completion", exists: true });
  if (record.closureRecord || record.closureRecordId || record.closedAt) evidence.push({ type: "closure", exists: true });
  if (record.readOnlyHistory || record.savedToHistory || record.historyRecordId) evidence.push({ type: "history", normalized: true, readOnly: true });
  return evidence.slice(0, 6);
}

function missingRequirements(blockers = []) {
  return blockers.map((item) => item.code);
}

export async function collectWorkflowIntelligence({ request = {}, context = {} } = {}) {
  const resolution = await resolveWorkflowSource({
    request,
    context,
    backendContext: request.backendContext,
    repositories: request.repositories,
  });
  const model = normalizeWorkflowResolution(resolution);
  if (!model) return emptyWorkflowContext();

  const obligations = evaluateWorkflowObligations(model.record, model.currentStage);
  const warnings = contradictionWarnings(model);
  const blockers = detectWorkflowBlockers(model, obligations, warnings);
  const next = inferWorkflowNextAction(model, obligations);
  const inferredRequirements = [
    ...(model.currentStage === "evaluation" && next.nextAction.action === "create_proposal"
      ? ["evaluation findings"]
      : []),
    ...missingRequirements(blockers),
  ];
  const confidence = evaluateWorkflowConfidence(model.matchedBy ? { ...model, warnings } : { warnings: [...warnings, "Workflow source was not strongly identified"] });
  const completionRecorded = Boolean(model.record.completionRecord || model.record.completionId || model.record.completedAt);
  const closureRecorded = Boolean(model.record.closureRecord || model.record.closureRecordId || model.record.closedAt || ["closed", "closure_completed"].includes(String(model.record.closureStatus || model.record.status || "").toLowerCase()));
  const historyNormalized = Boolean(model.record.readOnlyHistory || model.record.savedToHistory || model.record.historyRecordId);

  return {
    workflowType: model.workflowType,
    workflowId: model.workflowId,
    source: model.source,
    currentStage: model.currentStage,
    currentStageLabel: STAGE_LABELS[model.currentStage],
    completedStages: model.completedStages,
    nextExpectedStage: next.nextExpectedStage,
    nextAction: next.nextAction,
    nextSafeAction: next.nextAction.label,
    waitingOn: next.waitingOn,
    blocked: blockers.length > 0,
    blockers,
    missingRequirements: inferredRequirements,
    missingPrerequisites: inferredRequirements,
    obligations,
    completion: {
      workCompleted: ["completion", "invoice_receipt", "closure", "job_history"].includes(model.currentStage),
      completionRecorded,
      closureRecorded,
      historyEligible: closureRecorded && blockers.every((item) => item.code === "history_normalization_missing"),
      historyNormalized,
      finished: model.currentStage === "job_history" && historyNormalized,
    },
    confidence: confidence.score,
    confidenceLevel: confidence.level,
    evidence: safeEvidence(model),
    warnings,
    guidanceCategory:
      model.currentStage === "evaluation" && next.nextAction.action === "create_proposal"
        ? "evaluation_before_quote"
        : model.currentStage === "schedule"
          ? "schedule_before_evaluation"
          : `${model.currentStage}_guidance`,
    workflowSummary: `The verified workflow is currently at ${STAGE_LABELS[model.currentStage]}.`,
  };
}

export function workflowEngineSupports(request = {}) {
  const feature = String(request.feature || "").toLowerCase();
  const source = `${request.source?.page || ""} ${request.source?.surface || ""}`.toLowerCase();
  return /ask_meetro|emergency|quote|evaluation|work_center|current_jobs|schedule|active_work|completion|closure|job_history|conversation|business_intelligence/.test(`${feature} ${source}`) || Boolean(request.projectId || request.body?.jobId || request.body?.requestId || request.body?.emergencyRequestId || request.conversationId);
}

export { WORKFLOW_STAGES };
