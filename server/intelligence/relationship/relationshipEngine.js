import { buildRelationshipActivity, selectCurrentEngagement } from "./relationshipActivity.js";
import { buildRelationshipCommunication } from "./relationshipCommunication.js";
import { evaluateRelationshipConfidence } from "./relationshipConfidence.js";
import { classifyRelationshipContinuity } from "./relationshipContinuity.js";
import { emptyRelationshipContext } from "./relationshipContracts.js";
import { detectRelationshipFollowUps } from "./relationshipFollowUps.js";
import { inferRelationshipNextAction } from "./relationshipNextAction.js";
import { normalizeRelationshipResolution } from "./relationshipNormalizer.js";
import { resolveRelationshipSource } from "./relationshipSourceResolver.js";

function relationshipState({ continuity, workflow, communication, followUps, conflicts }) {
  if (conflicts.length) return "unknown";
  if (followUps.some((item) => item.actor === "professional")) return "follow_up_due";
  if (["awaiting_customer_response", "awaiting_professional_response"].includes(communication.responseState) || workflow.waitingOn === "customer") return "waiting";
  if (workflow.workflowId && !workflow.completion?.finished) return "active";
  if (["past_customer", "returning_customer"].includes(continuity.classification)) return "completed";
  if (["first_time_customer", "new_relationship", "conversation_only"].includes(continuity.classification)) return "new";
  return "unknown";
}

function contradictionWarnings(model = {}) {
  const warnings = [];
  for (const conflict of model.conflicts || []) {
    const record = conflict.record || {};
    if (record.conversationId || conflict.kind === "conversation") warnings.push("Conversation party identifiers conflict with the resolved relationship");
    else warnings.push("A related record has conflicting customer, professional, or business identity");
  }
  return [...new Set(warnings)];
}

function safeEvidence(activity = {}, communication = {}) {
  const evidence = [];
  if (activity.summary.closedJobs) evidence.push({ type: "closed_job_count", value: activity.summary.closedJobs });
  if (activity.summary.activeRequests) evidence.push({ type: "active_request_count", value: activity.summary.activeRequests });
  if (activity.summary.openProposals) evidence.push({ type: "proposal_count", value: activity.summary.openProposals });
  if (communication.activeConversationExists) evidence.push({ type: "active_conversation", exists: true });
  return evidence.slice(0, 6);
}

export async function collectRelationshipIntelligence({ request = {}, context = {}, workflow = {} } = {}) {
  const resolution = await resolveRelationshipSource({ request, context, backendContext: request.backendContext, repositories: request.repositories });
  const model = normalizeRelationshipResolution(resolution, request.user);
  if (!model) return emptyRelationshipContext();
  const activity = buildRelationshipActivity(model.records);
  const conversations = model.records.filter((entry) => entry.kind === "conversation" || entry.kind === "hiring");
  const communication = buildRelationshipCommunication(conversations, model.parties);
  const followUps = detectRelationshipFollowUps(model.records, communication, workflow);
  activity.summary.unresolvedFollowUps = followUps.length;
  const continuity = classifyRelationshipContinuity(model.records, activity, model.relationshipType);
  const currentEngagement = selectCurrentEngagement(model.records, workflow);
  if (!currentEngagement.conversationId && communication.conversationId) currentEngagement.conversationId = communication.conversationId;
  const warnings = contradictionWarnings(model);
  const confidence = evaluateRelationshipConfidence({ ...model, recordCount: model.records.length });
  const nextRelationshipAction = inferRelationshipNextAction({ workflow, communication, followUps, activity });
  const relationshipStateValue = relationshipState({ continuity, workflow, communication, followUps, conflicts: model.conflicts });

  return {
    relationshipId: model.relationshipId,
    relationshipType: model.relationshipType,
    source: model.source,
    parties: model.parties,
    relationshipState: relationshipStateValue,
    customerContinuity: continuity,
    activitySummary: activity.summary,
    currentEngagement,
    communication,
    relationshipSignals: {
      priorCompletedWork: activity.summary.completedJobs > 0,
      activeWorkExists: Boolean(workflow.workflowId && !workflow.completion?.finished),
      openProposalExists: activity.summary.openProposals > 0,
      approvalPending: workflow.waitingOn === "customer" && workflow.currentStage === "customer_approval",
      unresolvedFinancialObligation: activity.summary.unpaidInvoices > 0 || ["pending", "missing", "blocked"].includes(workflow.obligations?.payment),
      unresolvedFollowUpExists: followUps.length > 0,
      emergencyHistoryExists: activity.summary.emergencyJobs > activity.summary.activeEmergencies,
      multipleConversationsExist: communication.conversationCount > 1,
      closedWorkHistoryExists: activity.summary.closedJobs > 0,
    },
    nextRelationshipAction,
    followUps,
    confidence: confidence.score,
    confidenceLevel: confidence.level,
    evidence: safeEvidence(activity, communication),
    warnings,
  };
}

export function relationshipEngineSupports(request = {}) {
  const feature = String(request.feature || "").toLowerCase();
  const source = `${request.source?.page || ""} ${request.source?.surface || ""}`.toLowerCase();
  const evidence = request.body?.relationshipId || request.body?.conversationId || request.body?.customerId || request.body?.jobId || request.body?.projectId || request.body?.requestId || request.body?.emergencyRequestId;
  return Boolean(evidence) || /ask_meetro|conversation|messages|customer_relationships|work_center|current_jobs|emergency|quote_builder|completion|closure|job_history|business_intelligence|hiring|community_relationship/.test(`${feature} ${source}`);
}
