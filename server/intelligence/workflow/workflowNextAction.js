const LABELS = Object.freeze({
  schedule_visit: "Schedule the evaluation visit",
  wait_for_visit_confirmation: "Customer must confirm the evaluation visit",
  save_evaluation: "Save the evaluation findings",
  create_proposal: "Create a proposal from the evaluation",
  revise_proposal: "Review the requested proposal changes",
  wait_for_customer_approval: "Customer must approve the proposal",
  collect_deposit: "Record the required deposit before work",
  schedule_work: "Schedule the work date",
  wait_for_work_date_confirmation: "Customer must confirm the work date",
  mark_on_the_way: "Update the job when travel begins",
  continue_work: "Continue and document the active work",
  record_completion: "Record the completed work",
  create_invoice_or_receipt: "Create the required invoice or receipt",
  resolve_closure_obligations: "Resolve remaining obligations before Closure",
  close_job: "Close the job after obligations are satisfied",
  reconcile_job_history: "Reconcile the closed record into Job History",
  no_action: "No operational action is required",
  continue_communication: "Continue the conversation and clarify the work",
});

function action(action, actor) {
  return { action, actor, label: LABELS[action] };
}

function pending(obligations, keys) {
  return keys.some((key) => ["pending", "missing", "blocked"].includes(obligations[key]));
}

export function inferWorkflowNextAction(model = {}, obligations = {}) {
  const record = model.record || {};
  const stage = model.currentStage;
  if (stage === "job_history") return { nextExpectedStage: "job_history", nextAction: action("no_action", "none"), waitingOn: "none" };
  if (stage === "closure") {
    if (record.readOnlyHistory || record.savedToHistory) return { nextExpectedStage: "job_history", nextAction: action("no_action", "none"), waitingOn: "none" };
    return { nextExpectedStage: "job_history", nextAction: action("reconcile_job_history", "system"), waitingOn: "system" };
  }
  if (stage === "invoice_receipt" || stage === "completion") {
    if (!record.completionRecord && !record.completionId && !record.completedAt) return { nextExpectedStage: "completion", nextAction: action("record_completion", "professional"), waitingOn: "professional" };
    if (pending(obligations, ["invoice", "receipt"])) return { nextExpectedStage: "invoice_receipt", nextAction: action("create_invoice_or_receipt", "professional"), waitingOn: "professional" };
    if (pending(obligations, ["payment", "permits", "inspection", "documents", "customerConfirmation"])) return { nextExpectedStage: "closure", nextAction: action("resolve_closure_obligations", "professional"), waitingOn: obligations.customerConfirmation === "pending" ? "customer" : obligations.permits === "pending" || obligations.inspection === "pending" ? "third_party" : "professional" };
    return { nextExpectedStage: "closure", nextAction: action("close_job", "professional"), waitingOn: "professional" };
  }
  if (stage === "perform_work") {
    if (["completed", "work_completed"].includes(String(record.workStatus || record.status || "").toLowerCase())) return { nextExpectedStage: "completion", nextAction: action("record_completion", "professional"), waitingOn: "professional" };
    return { nextExpectedStage: "completion", nextAction: action("continue_work", "professional"), waitingOn: "professional" };
  }
  if (stage === "schedule_work") {
    if (record.workDateConfirmationPending || record.workScheduleStatus === "pending_customer_confirmation") return { nextExpectedStage: "perform_work", nextAction: action("wait_for_work_date_confirmation", "customer"), waitingOn: "customer" };
    return { nextExpectedStage: "perform_work", nextAction: action("mark_on_the_way", "professional"), waitingOn: "professional" };
  }
  if (stage === "payment_deposit") {
    if (["pending", "missing", "blocked"].includes(obligations.deposit)) return { nextExpectedStage: "payment_deposit", nextAction: action("collect_deposit", "customer"), waitingOn: "customer" };
    return { nextExpectedStage: "schedule_work", nextAction: action("schedule_work", "professional"), waitingOn: "professional" };
  }
  if (stage === "customer_approval") {
    const proposalStatus = String(record.proposalStatus || record.quoteStatus || "").toLowerCase();
    if (["revision_requested", "change_requested", "changes_requested"].includes(proposalStatus)) return { nextExpectedStage: "proposal", nextAction: action("revise_proposal", "professional"), waitingOn: "professional" };
    return { nextExpectedStage: "customer_approval", nextAction: action("wait_for_customer_approval", "customer"), waitingOn: "customer" };
  }
  if (stage === "proposal") return { nextExpectedStage: "customer_approval", nextAction: action("wait_for_customer_approval", "customer"), waitingOn: "customer" };
  if (stage === "evaluation") return { nextExpectedStage: "proposal", nextAction: action(record.evaluationStatus === "pending" ? "save_evaluation" : "create_proposal", "professional"), waitingOn: "professional" };
  if (stage === "schedule") {
    if (record.visitConfirmationPending || record.scheduleConfirmationStatus === "pending") return { nextExpectedStage: "evaluation", nextAction: action("wait_for_visit_confirmation", "customer"), waitingOn: "customer" };
    return { nextExpectedStage: "evaluation", nextAction: action("save_evaluation", "professional"), waitingOn: "professional" };
  }
  if (stage === "relationship" || stage === "communication") return { nextExpectedStage: "schedule", nextAction: action(record.conversationId ? "schedule_visit" : "continue_communication", "professional"), waitingOn: "professional" };
  return { nextExpectedStage: "", nextAction: action("no_action", "unknown"), waitingOn: "unknown" };
}
