export const WORKFLOW_TYPES = Object.freeze([
  "standard_job",
  "emergency_job",
  "service_request",
  "scheduled_visit",
  "evaluation",
  "quote_or_proposal",
  "active_work",
  "completion",
  "closure",
  "job_history",
  "conversation_workflow",
]);

export const WORKFLOW_STAGES = Object.freeze([
  "relationship",
  "communication",
  "schedule",
  "evaluation",
  "proposal",
  "customer_approval",
  "payment_deposit",
  "schedule_work",
  "perform_work",
  "completion",
  "invoice_receipt",
  "closure",
  "job_history",
]);

export const OBLIGATION_STATES = Object.freeze([
  "not_required",
  "not_due",
  "pending",
  "satisfied",
  "missing",
  "blocked",
  "unknown",
]);

export function emptyWorkflowContext() {
  return {};
}
