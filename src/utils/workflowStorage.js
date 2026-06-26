export const WORKFLOW_PERSIST_KEYS = [
  "homeownerRequests",
  "completedProjects",
  "selectedActiveProject",
  "lastCompletedProject",
  "lastSavedJobRecord",
  "lastJobUpdate",
  "jobUpdates",
  "projectOutcome",
  "projectOutcomeDate",
  "projectWorkflowStatus",
  "workflowSource",
  "meetro_business_schedule",
  "workCenterQuoteHistory",
  "meetroQuoteHistory",
  "quoteHistory",
  "activeWorkService",
  "activeWorkLocation",
  "activeWorkStatus",
  "activeWorkType",
  "activeWorkSource",
  "activeWorkRequestId",
  "activeWorkConversationId",
  "activeWorkQuoteId",
  "activeWorkScheduleId",
  "activeWorkStage",
  "activeWorkPauseReason",
  "activeJobService",
  "activeJobLocation",
  "activeJobStatus",
  "activeJobId",
  "activeJobCustomer",
  "activeJobEta",
  "activeInvoiceConversationId",
  "invoiceConversationId",
  "invoiceCustomerLocation",
  "homeownerNeedsReview",
  "conversationArchivedAt",
  "conversationSavedToHistory",
  "lastManualQuoteNumber",
];

export function preserveWorkflowSnapshot() {
  const snapshot = {};

  WORKFLOW_PERSIST_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      snapshot[key] = value;
    }
  });

  Object.keys(localStorage).forEach((key) => {
    if (
      key.startsWith("meetro_conversation_") ||
      key.startsWith("meetro_job_record_") ||
      key.startsWith("meetro_conversation_read_") ||
      key.startsWith("meetro_conversation_meta_") ||
      key.startsWith("meetro_notifications")
    ) {
      snapshot[key] = localStorage.getItem(key);
    }
  });

  return snapshot;
}

export function restoreWorkflowSnapshot(snapshot = {}) {
  Object.entries(snapshot).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      localStorage.setItem(key, value);
    }
  });
}

export function safeClearSessionOnly() {
  const snapshot = preserveWorkflowSnapshot();

  const language = localStorage.getItem("language");
  const activeAccountMode = localStorage.getItem("activeAccountMode");

  localStorage.clear();

  restoreWorkflowSnapshot(snapshot);

  if (language) localStorage.setItem("language", language);
  if (activeAccountMode) {
    localStorage.setItem("activeAccountMode", activeAccountMode);
  }
}
