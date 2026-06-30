export const WORKFLOW_INSIGHT_EVENT = "meetro:workflow-insight:event";

export const WORKFLOW_INSIGHT_EVENT_TYPES = Object.freeze({
  EVALUATION_SAVED: "evaluation.saved",
  PROPOSAL_CREATED: "proposal.created",
  PROPOSAL_APPROVED: "proposal.approved",
  PAYMENT_RECORDED: "payment.recorded",
  SCHEDULE_CREATED: "schedule.created",
  VISIT_CONFIRMATION_PENDING: "visit.confirmation.pending",
  VISIT_CONFIRMED: "visit.confirmed",
  ON_THE_WAY: "onTheWay",
  ARRIVED: "arrived",
  WORK_STARTED: "work.started",
  WORK_COMPLETED: "work.completed",
  PROJECT_CLOSED: "project.closed",
  INVOICE_CREATED: "invoice.created",
  INVOICE_SENT: "invoice.sent",
});

export function dispatchWorkflowInsightEvent(type, {
  detail = {},
  win = typeof window !== "undefined" ? window : null,
} = {}) {
  if (!type || !win?.dispatchEvent || typeof CustomEvent === "undefined") return false;
  win.dispatchEvent(
    new CustomEvent(WORKFLOW_INSIGHT_EVENT, {
      detail: {
        type,
        ...detail,
      },
    })
  );
  return true;
}

export function isWorkflowInsightEventType(type) {
  return Object.values(WORKFLOW_INSIGHT_EVENT_TYPES).includes(type);
}
