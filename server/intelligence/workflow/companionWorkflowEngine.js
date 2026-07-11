import { MEETRO_WORKFLOW_STAGES, WORKFLOW_LIFECYCLE_RULES } from "./workflowLifecycleRules.js";

function normalize(value = "") {
  return String(value || "").toLowerCase();
}

function includesAny(text = "", terms = []) {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(term));
}

function getWorkflowText({ intent = "", context = {}, capabilities = {} } = {}) {
  const workflow = context.workflow || {};
  return [
    intent,
    context.source?.page,
    context.source?.surface,
    workflow.status,
    workflow.nextAction,
    workflow.serviceType,
    workflow.quoteStatus,
    workflow.scheduleStatus,
    workflow.evaluationStatus,
    workflow.findingsStatus,
    workflow.approvalStatus,
    workflow.workStatus,
    workflow.completionStatus,
    workflow.closureStatus,
    ...(Array.isArray(capabilities.primaryCapabilities) ? capabilities.primaryCapabilities : []),
    ...(Array.isArray(capabilities.supportingCapabilities) ? capabilities.supportingCapabilities : []),
    ...(Array.isArray(capabilities.capabilityFamilies) ? capabilities.capabilityFamilies : []),
  ]
    .filter(Boolean)
    .join(" ");
}

function isComplete(value = "") {
  return includesAny(value, [
    "complete",
    "completed",
    "collected",
    "done",
    "approved",
    "accepted",
    "confirmed",
    "paid",
    "resolved",
    "satisfied",
  ]);
}

function isPending(value = "") {
  return includesAny(value, ["pending", "waiting", "needed", "missing", "open", "unresolved", "required"]);
}

function hasEvaluation(workflow = {}) {
  return (
    isComplete(workflow.evaluationStatus) ||
    isComplete(workflow.findingsStatus) ||
    includesAny(workflow.status, ["evaluated", "findings collected", "inspection complete"])
  );
}

function hasSchedule(workflow = {}) {
  return (
    isComplete(workflow.scheduleStatus) ||
    includesAny(workflow.status, ["scheduled", "appointment", "visit confirmed", "inspection scheduled"])
  );
}

function needsPhysicalEvaluation(capabilities = {}, workflowText = "") {
  return (
    includesAny(workflowText, ["repair", "replace", "install", "damage", "remodel", "leak", "inspection", "visit"]) ||
    (capabilities.capabilityFamilies || []).some((family) =>
      ["home repair", "restoration", "remodeling", "plumbing", "tile", "carpentry"].includes(normalize(family))
    )
  );
}

function closureMissingPrerequisites(workflow = {}) {
  const checks = [
    ["payment", workflow.paymentStatus],
    ["receipt", workflow.receiptStatus],
    ["warranty", workflow.warrantyStatus],
    ["permit", workflow.permitStatus],
    ["inspection", workflow.inspectionStatus],
    ["documentation", workflow.documentationStatus],
    ["unresolved issues", workflow.unresolvedIssueStatus],
  ];

  return checks
    .filter(([, value]) => {
      if (!value || includesAny(value, ["not required", "n/a"])) return false;
      return !isComplete(value) && (isPending(value) || !includesAny(value, ["not required", "n/a"]));
    })
    .map(([label]) => label);
}

function stagePacket(currentStage, options = {}) {
  const rule = WORKFLOW_LIFECYCLE_RULES[currentStage] || WORKFLOW_LIFECYCLE_RULES.communication;
  return {
    currentStage,
    nextSafeAction: options.nextSafeAction || rule.nextSafeAction,
    missingPrerequisites: options.missingPrerequisites || [],
    guidanceCategory: options.guidanceCategory || `${currentStage}_guidance`,
    confidence: options.confidence || 0.72,
    workflowSummary: options.workflowSummary || rule.summary,
  };
}

export function buildCompanionWorkflow({
  intent = "reasoning",
  context = {},
  knowledge = {},
  capabilities = {},
} = {}) {
  const workflow = context.workflow || {};
  const workflowText = getWorkflowText({ intent, context, knowledge, capabilities });
  const quoteRelated = includesAny(workflowText, ["quote", "proposal", "estimate", "price"]);
  const evaluationComplete = hasEvaluation(workflow);
  const scheduleComplete = hasSchedule(workflow);
  const physicalEvaluationNeeded = needsPhysicalEvaluation(capabilities, workflowText);

  if (includesAny(workflow.closureStatus, ["closed", "complete"]) || includesAny(workflow.status, ["archived", "history"])) {
    return stagePacket("history", {
      guidanceCategory: "history_preservation",
      confidence: 0.86,
    });
  }

  if (includesAny(workflow.status, ["complete", "completed"]) || isComplete(workflow.completionStatus)) {
    const missingPrerequisites = closureMissingPrerequisites(workflow);
    if (missingPrerequisites.length) {
      return stagePacket("closure", {
        missingPrerequisites,
        guidanceCategory: "closure_readiness",
        confidence: 0.88,
      });
    }

    return stagePacket("completion", {
      guidanceCategory: "completion_documentation",
      confidence: 0.82,
    });
  }

  if (includesAny(workflow.status, ["in progress", "started", "working"]) || includesAny(workflow.workStatus, ["started", "in progress"])) {
    return stagePacket("work", { confidence: 0.84 });
  }

  if (isPending(workflow.approvalStatus) || includesAny(workflow.quoteStatus, ["sent", "pending approval", "awaiting approval"])) {
    return stagePacket("approval", { confidence: 0.84 });
  }

  if (quoteRelated || workflow.quoteStatus) {
    if (!evaluationComplete) {
      return stagePacket("evaluation", {
        missingPrerequisites: ["evaluation findings"],
        guidanceCategory: "evaluation_before_quote",
        confidence: 0.86,
      });
    }

    return stagePacket("quote", {
      guidanceCategory: "quote_from_evaluation",
      confidence: 0.86,
    });
  }

  if (physicalEvaluationNeeded && !scheduleComplete) {
    return stagePacket("schedule", {
      missingPrerequisites: ["visit or appointment"],
      guidanceCategory: "schedule_before_evaluation",
      confidence: 0.82,
    });
  }

  if (scheduleComplete && !evaluationComplete) {
    return stagePacket("evaluation", {
      missingPrerequisites: ["evaluation findings"],
      guidanceCategory: "evaluation_guidance",
      confidence: 0.82,
    });
  }

  if (!context.relationship?.knownRelationshipType && !workflow.activeRequestId && !workflow.activeJobId) {
    return stagePacket("relationship", { confidence: 0.62 });
  }

  return stagePacket("communication", {
    guidanceCategory: "clarify_next_step",
    confidence: 0.68,
  });
}

export { MEETRO_WORKFLOW_STAGES, WORKFLOW_LIFECYCLE_RULES };
