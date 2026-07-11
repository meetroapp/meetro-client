const LABELS = Object.freeze({
  respond_to_customer: "Respond to the customer",
  wait_for_customer_response: "Customer response is pending",
  wait_for_customer_approval: "Customer approval is pending",
  wait_for_visit_confirmation: "Customer visit confirmation is pending",
  complete_follow_up: "Complete the recorded follow-up",
  resolve_invoice: "Resolve the outstanding invoice",
  continue_workflow: "Continue the current operational workflow",
  no_action: "No relationship follow-up is required",
});

function result(action, actor) { return { action, actor, label: LABELS[action] }; }

export function inferRelationshipNextAction({ workflow = {}, communication = {}, followUps = [], activity = {} } = {}) {
  if (communication.responseState === "awaiting_professional_response") return result("respond_to_customer", "professional");
  if (workflow.nextAction?.action === "wait_for_customer_approval") return result("wait_for_customer_approval", "customer");
  if (workflow.nextAction?.action === "wait_for_visit_confirmation") return result("wait_for_visit_confirmation", "customer");
  if (communication.responseState === "awaiting_customer_response") return result("wait_for_customer_response", "customer");
  if (followUps.length) return result("complete_follow_up", followUps[0].actor || "professional");
  if ((activity.summary?.unpaidInvoices || 0) > 0) return result("resolve_invoice", "professional");
  if (workflow.workflowId && workflow.nextAction?.action !== "no_action") return result("continue_workflow", workflow.nextAction?.actor || "professional");
  return result("no_action", "none");
}
