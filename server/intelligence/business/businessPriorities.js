const RULES = Object.freeze([
  ["emergency_overload", "respond_to_active_emergency", 100], ["schedule_conflict", "resolve_schedule_conflict", 98],
  ["overdue_work", "address_overdue_work", 95], ["completion_backlog", "record_missing_completion", 90],
  ["closure_backlog", "close_completed_jobs", 88], ["invoice_receipt_backlog", "resolve_invoice_receipt_workflow", 82],
  ["history_reconciliation_backlog", "reconcile_closed_history", 78], ["scheduling_backlog", "schedule_approved_work", 76],
  ["professional_response_backlog", "respond_to_customer", 80], ["evaluation_backlog", "complete_evaluations", 75],
  ["proposal_preparation_backlog", "prepare_proposals", 70], ["proposal_approval_backlog", "review_proposal_backlog", 55],
]);
export function buildBusinessPriorities(bottlenecks = []) {
  const byCode = new Map();
  for (const bottleneck of bottlenecks) {
    const rule = RULES.find(([code]) => code === bottleneck.code); if (!rule) continue;
    byCode.set(rule[1], { code: rule[1], priority: rule[2], severity: bottleneck.severity, actor: bottleneck.actor, count: bottleneck.count, label: bottleneck.label });
  }
  return [...byCode.values()].sort((a, b) => b.priority - a.priority || a.code.localeCompare(b.code)).slice(0, 8);
}
