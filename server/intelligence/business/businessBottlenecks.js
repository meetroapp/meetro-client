export function buildBusinessBottlenecks({ workload, pipeline, responsibility, workflowHealth, financialSignals, scheduling }) {
  const items = [];
  const add = (condition, code, severity, count, actor, label, source = "workflow") => { if (condition) items.push({ code, severity, count, actor, source, label }); };
  add(workload.activeEmergencyJobs > 1, "emergency_overload", "high", workload.activeEmergencyJobs, "professional", "Multiple emergency jobs are active");
  add(workload.overdueItems > 0, "overdue_work", "high", workload.overdueItems, "professional", "Scheduled or due work requires attention");
  add(workflowHealth.closureBacklog > 0, "closure_backlog", "high", workflowHealth.closureBacklog, "professional", "Completed work remains open");
  add(workflowHealth.completionBacklog > 0, "completion_backlog", "high", workflowHealth.completionBacklog, "professional", "Finished work is missing completion records");
  add(workflowHealth.historyReconciliationBacklog > 0, "history_reconciliation_backlog", "medium", workflowHealth.historyReconciliationBacklog, "system", "Closed work requires history reconciliation");
  add(pipeline.approvedNotScheduled > 0, "scheduling_backlog", "medium", pipeline.approvedNotScheduled, "professional", "Approved work still needs scheduling", "schedule");
  add(pipeline.pendingEvaluations >= 3, "evaluation_backlog", "medium", pipeline.pendingEvaluations, "professional", "Evaluations remain unfinished");
  add(pipeline.proposalsDraft >= 3, "proposal_preparation_backlog", "medium", pipeline.proposalsDraft, "professional", "Proposal drafts require review");
  add(pipeline.awaitingCustomerApproval >= 3, "proposal_approval_backlog", "medium", pipeline.awaitingCustomerApproval, "customer", "Proposals are waiting for customer approval");
  add(financialSignals.unresolvedInvoiceCount > 0 || financialSignals.unresolvedReceiptCount > 0, "invoice_receipt_backlog", "medium", financialSignals.unresolvedInvoiceCount + financialSignals.unresolvedReceiptCount, "professional", "Invoice or receipt workflow remains unresolved", "financial_workflow");
  add(responsibility.waitingOnProfessional >= 3, "professional_response_backlog", "medium", responsibility.waitingOnProfessional, "professional", "Professional-owned responses require attention");
  add(scheduling.conflicts > 0, "schedule_conflict", "high", scheduling.conflicts, "professional", "Confirmed schedule items overlap", "schedule");
  return items.slice(0, 8);
}
