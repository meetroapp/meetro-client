import { purgeLegacyWorkflowStorage } from "./clientWorkflowStoragePolicy.js";

const ACCOUNT_TRANSIENT_CONTEXT_KEYS = [
  "activeConversationId",
  "activeConversationName",
  "conversationBusinessName",
  "conversationReturnPage",
  "meetroConversationType",
  "meetroMessageView",
  "selectedConversation",
  "mockUnreadMessages",
  "mockStandardUnreadMessages",
  "selectedHomeownerRequestId",
  "selectedMessageReceiverId",
  "selectedPostId",
  "selectedQuoteForEdit",
  "selectedQuoteRequest",
  "selectedQuoteRequestId",
  "selectedWorkCenterRequest",
  "leadWorkflowIntent",
  "leadWorkflowStage",
  "quoteStatusFilter",
  "activeWorkCenterQuoteRequestId",
  "activeWorkCenterTab",
  "meetroWorkCenterTab",
  "meetroCommandTool",
  "activeInvoiceConversationId",
  "invoiceConversationId",
  "invoiceCustomerLocation",
  "completionLocation",
  "completionReturnPage",
  "completionService",
  "completionSource",
  "dispatchReturnPage",
  "previousPage",
  "projectDetailsReturnPage",
  "projectGalleryReturnPage",
  "quoteBuilderReturnPage",
  "returnPage",
  "selectedContractor",
  "selectedEmergencyBusiness",
  "selectedEmergencyCategory",
  "selectedEmergencyService",
  "activeEmergencyRecord",
  "activeEmergencyRequestId",
  "emergencyDispatchStatus",
  "meetroDispatchReady",
];

const ACCOUNT_TRANSIENT_CONTEXT_PREFIXES = [
  "selectedEmergencyService_",
];

export function getAccountStorageIdentity(user = {}, fallbackEmail = "") {
  const userId = user.id || user.user_id || user.userId || "";
  const email = String(user.email || fallbackEmail || "")
    .trim()
    .toLowerCase();

  if (userId !== "") return `id:${userId}`;
  if (email) return `email:${email}`;
  return "";
}

export function clearAccountWorkflowData() {
  ACCOUNT_TRANSIENT_CONTEXT_KEYS.forEach((key) => localStorage.removeItem(key));

  const localStorageKeys = [
    ...Object.keys(localStorage),
    ...Array.from({ length: localStorage.length || 0 }, (_, index) =>
      localStorage.key(index)
    ),
  ].filter(Boolean);

  Array.from(new Set(localStorageKeys)).forEach((key) => {
    if (ACCOUNT_TRANSIENT_CONTEXT_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  });

  purgeLegacyWorkflowStorage(localStorage);

  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("meetro-messages-updated"));
  window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
}
