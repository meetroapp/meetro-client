export function getConversationVisitReadFailureCopy(error = {}) {
  if (Number(error?.status) === 403) {
    return "Evaluation Visit scheduling is not available for this project yet. You can continue messaging.";
  }

  if (Number(error?.status) >= 500 || !error?.status) {
    return "Evaluation Visit scheduling is temporarily unavailable. You can continue messaging.";
  }

  return error?.message ||
    "Evaluation Visit scheduling is temporarily unavailable. You can continue messaging.";
}
