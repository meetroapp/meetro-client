const STAGE_ALIASES = Object.freeze({
  relationship: ["new", "new_lead", "open", "requested", "request_submitted", "lead"],
  communication: ["contact_requested", "pending_customer_response", "messaged", "viewed", "accepted", "selected"],
  schedule: ["visit_requested", "visit_scheduled", "scheduled", "awaiting_visit_confirmation", "pending_customer_confirmation"],
  evaluation: ["evaluation_pending", "evaluation_scheduled", "evaluated", "evaluation_complete", "evaluation_completed", "findings_collected", "inspection_complete"],
  proposal: ["draft_quote", "draft", "proposal_ready", "ready", "ready_to_send", "quoted"],
  customer_approval: ["proposal_sent", "quote_sent", "sent", "waiting_approval", "pending_customer_approval", "revision_requested", "change_requested", "changes_requested"],
  payment_deposit: ["approved", "quote_approved", "deposit_due", "payment_due", "deposit_received", "payment_received", "paid"],
  schedule_work: ["work_scheduled", "scheduled_work", "pending_work_date", "pending_work_date_confirmation"],
  perform_work: ["on_the_way", "en_route", "enroute", "arrived", "active", "in_progress", "working", "started"],
  completion: ["completed", "work_completed", "completion_recorded", "awaiting_customer_confirmation"],
  invoice_receipt: ["invoice_due", "invoice_created", "invoice_sent", "receipt_ready", "receipt_created", "receipt_sent"],
  closure: ["closure_pending", "closure_blocked", "closed", "closure_completed"],
  job_history: ["history", "archived"],
});

const STATUS_TO_STAGE = new Map(
  Object.entries(STAGE_ALIASES).flatMap(([stage, aliases]) => aliases.map((alias) => [alias, stage]))
);

export function normalizeWorkflowStatus(value = "") {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function mapStatusToWorkflowStage(value = "") {
  return STATUS_TO_STAGE.get(normalizeWorkflowStatus(value)) || "";
}

export { STAGE_ALIASES };
