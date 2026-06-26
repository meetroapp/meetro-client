export function createWorkCenterJobListPresentation(workflowState = {}, fallback = {}) {
  return {
    statusLabel:
      workflowState.statusLabel ||
      fallback.statusLabel ||
      fallback.status ||
      "",
    nextStepLabel:
      workflowState.nextActionLabel ||
      workflowState.nextStepLabel ||
      fallback.nextStepLabel ||
      fallback.nextStep ||
      "",
  };
}
