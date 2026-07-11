const LABELS = Object.freeze({
  customer_approval_missing: "Customer approval is required before work can begin",
  required_deposit_unpaid: "Required deposit must be recorded before work begins",
  required_payment_unpaid: "Required payment remains unresolved",
  required_permit_unresolved: "A required permit remains unresolved",
  required_inspection_unresolved: "A required inspection remains unresolved",
  required_documents_missing: "Required completion documents are missing",
  required_invoice_missing: "A required invoice is missing",
  required_receipt_missing: "A required receipt is missing",
  customer_confirmation_missing: "Customer confirmation remains pending",
  workflow_status_conflict: "Persisted workflow records contain conflicting states",
  history_normalization_missing: "Closed work has not been normalized into Job History",
});

function blocker(code, actor = "professional") {
  return { code, severity: "blocking", actor, label: LABELS[code] };
}

export function detectWorkflowBlockers(model = {}, obligations = {}, warnings = []) {
  const blockers = [];
  const stage = model.currentStage;
  if (["schedule_work", "perform_work"].includes(stage) && ["pending", "missing", "blocked"].includes(obligations.customerApproval)) blockers.push(blocker("customer_approval_missing", "customer"));
  if (["schedule_work", "perform_work"].includes(stage) && ["pending", "missing", "blocked"].includes(obligations.deposit)) blockers.push(blocker("required_deposit_unpaid", "customer"));
  if (["completion", "invoice_receipt", "closure"].includes(stage)) {
    if (["pending", "missing", "blocked"].includes(obligations.payment)) blockers.push(blocker("required_payment_unpaid", "customer"));
    if (["pending", "missing", "blocked"].includes(obligations.permits)) blockers.push(blocker("required_permit_unresolved", "third_party"));
    if (["pending", "missing", "blocked"].includes(obligations.inspection)) blockers.push(blocker("required_inspection_unresolved", "third_party"));
    if (["pending", "missing", "blocked"].includes(obligations.documents)) blockers.push(blocker("required_documents_missing"));
    if (["pending", "missing", "blocked"].includes(obligations.invoice)) blockers.push(blocker("required_invoice_missing"));
    if (["pending", "missing", "blocked"].includes(obligations.receipt)) blockers.push(blocker("required_receipt_missing"));
    if (["pending", "missing", "blocked"].includes(obligations.customerConfirmation)) blockers.push(blocker("customer_confirmation_missing", "customer"));
  }
  if (warnings.length) blockers.push(blocker("workflow_status_conflict", "system"));
  if (stage === "closure" && !model.record.readOnlyHistory && !model.record.savedToHistory) blockers.push(blocker("history_normalization_missing", "system"));
  return blockers;
}
