function text(value) { return value === undefined || value === null ? "" : String(value).trim(); }

export function detectRelationshipFollowUps(records = [], communication = {}, workflow = {}) {
  const followUps = [];
  if (communication.responseState === "awaiting_professional_response") followUps.push({ code: "incoming_message_unanswered", actor: "professional", status: "pending", dueAt: null, sourceId: communication.conversationId });
  for (const { record = {} } of records) {
    const sourceId = text(record.conversationId || record.jobId || record.projectId || record.requestId || record.id);
    if (record.followUpPending === true) followUps.push({ code: "explicit_follow_up_pending", actor: text(record.followUpActor || "professional"), status: "pending", dueAt: text(record.followUpDueAt) || null, sourceId });
    if (record.completionFollowUpPending === true) followUps.push({ code: "completion_follow_up_pending", actor: "professional", status: "pending", dueAt: text(record.completionFollowUpDueAt) || null, sourceId });
    if (record.invoiceDeliveryPending === true || record.receiptDeliveryPending === true) followUps.push({ code: "financial_document_delivery_pending", actor: "professional", status: "pending", dueAt: null, sourceId });
  }
  if (workflow.nextAction?.action === "revise_proposal") followUps.push({ code: "proposal_revision_pending", actor: "professional", status: "pending", dueAt: null, sourceId: workflow.workflowId || "" });
  const seen = new Set();
  return followUps.filter((item) => { const key = `${item.code}:${item.sourceId}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
