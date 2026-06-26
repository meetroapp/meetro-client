const WORKFLOW_ORDER = [
  "lead",
  "visit_scheduled",
  "evaluation_complete",
  "quote_created",
  "proposal_sent",
  "approved",
  "payment_received",
  "work_scheduled",
  "en_route",
  "arrived",
  "working",
  "completed",
  "receipt_created",
  "receipt_sent",
  "closed",
];

const WORKFLOW_ALIASES = {
  evaluation_completed: "evaluation_complete",
  evaluation_recorded: "evaluation_complete",
  proposal_created: "quote_created",
  quote_created: "quote_created",
  proposal_sent: "proposal_sent",
  quote_sent: "proposal_sent",
  awaiting_approval: "proposal_sent",
};

function normalizeWorkflowState(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return WORKFLOW_ALIASES[normalized] || normalized;
}

function hasReachedWorkflowState(currentState = "", targetState = "") {
  const currentIndex = WORKFLOW_ORDER.indexOf(normalizeWorkflowState(currentState));
  const targetIndex = WORKFLOW_ORDER.indexOf(normalizeWorkflowState(targetState));
  return currentIndex >= 0 && targetIndex >= 0 && currentIndex >= targetIndex;
}

export function getEvaluationPanelMode({
  workflowState = "",
  hasEvaluation = false,
  isEditing = false,
} = {}) {
  const shouldDefaultReadOnly =
    Boolean(hasEvaluation) && hasReachedWorkflowState(workflowState, "quote_created");

  return {
    readOnly: shouldDefaultReadOnly && !isEditing,
    canEdit: shouldDefaultReadOnly,
    shouldDefaultReadOnly,
  };
}
