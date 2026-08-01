export const LEGACY_WORKFLOW_STORAGE_KEYS = Object.freeze([
  "homeownerRequests",
  "meetroHomeownerRequestsBackup",
  "meetro_business_schedule",
  "workCenterQuoteHistory",
  "meetroQuoteHistory",
  "quoteHistory",
  "completedProjects",
  "lastCompletedProject",
  "completedJobsCount",
  "totalJobRevenue",
  "activeJobsCount",
  "meetro_conversation_registry",
  "meetroTimelineMoments",
  "meetroRequestCompanionContext",
  "meetroWorkflowTimeline",
  "projectTimeline",
  "activeWorkSnapshot",
  "selectedActiveProject",
  "selectedHomeownerRequest",
  "selectedHomeownerRequestId",
  "selectedQuoteRequest",
  "selectedQuoteRequestId",
  "selectedChangeOrderRequest",
  "meetroAssistantRequestDraft",
  "aiProjectDraft",
  "aiBusinessRecommendation",
  "aiProjectScope",
  "requestLocationDraft",
  "meetroScheduleEditId",
  "quoteBuilderReturnEvaluationScheduleId",
  "activeCompletionJob",
  "businessAcceptedEmergency",
  "activeEmergencyRecord",
  "activeEmergencyRequestId",
  "emergencyDispatchStatus",
  "emergencyRequestId",
  "emergencyIssue",
  "emergencyCustomerName",
  "mockUnreadMessages",
  "readConversationIds",
  "deletedConversationIds",
  "completedJobAmount",
  "completedJobMaterialCost",
  "completedJobPhotos",
  "completedJobNotes",
  "completedJobViewMode",
  "activeWorkRequestId",
  "activeWorkQuoteId",
  "activeWorkScheduleId",
  "activeWorkConversationId",
  "activeWorkService",
  "activeWorkStatus",
  "activeWorkStage",
  "activeWorkType",
  "activeWorkSource",
  "activeWorkCustomer",
  "activeWorkLocation",
  "activeWorkPauseReason",
  "activeJobId",
  "activeJobStatus",
  "activeJobService",
  "activeJobCustomer",
  "activeJobLocation",
  "activeJobEta",
  "contractorProfile",
  "activeBusinessId",
  "businessId",
  "contractorProfileId",
  "businessImageUrl",
  "meetroDispatchReady",
]);

export const LEGACY_WORKFLOW_STORAGE_PREFIXES = Object.freeze([
  "meetro_conversation_",
  "meetro_job_record_",
  "meetro_workflow_",
  "meetro_contacts_",
  "meetroHomeownerPrivatePhone:",
  "meetro_emergency_record_",
  "activeCompletion",
  "completedJob",
  "emergency",
]);

export const PROHIBITED_COMMERCIAL_AUTHORITY_STORAGE_KEYS = Object.freeze([
  "canonicalCommercialAuthority",
  "commercialAuthorityAggregates",
  "commercialAuthorityEvidence",
  "commercialCommandResults",
]);

export const PROHIBITED_COMMERCIAL_AUTHORITY_STORAGE_PREFIXES = Object.freeze([
  "meetro_commercial_authority_",
  "meetro_commercial_evidence_",
]);

export function isProductionClientRuntime(options = {}) {
  if (typeof options.production === "boolean") return options.production;
  return import.meta.env?.PROD === true;
}

export function canReadLegacyWorkflowStorage(options = {}) {
  return !isProductionClientRuntime(options);
}

export function isLegacyWorkflowStorageKey(key = "") {
  return (
    LEGACY_WORKFLOW_STORAGE_KEYS.includes(key) ||
    LEGACY_WORKFLOW_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
    isProhibitedCommercialAuthorityStorageKey(key)
  );
}

export function isProhibitedCommercialAuthorityStorageKey(key = "") {
  return (
    PROHIBITED_COMMERCIAL_AUTHORITY_STORAGE_KEYS.includes(key) ||
    PROHIBITED_COMMERCIAL_AUTHORITY_STORAGE_PREFIXES.some((prefix) =>
      key.startsWith(prefix)
    )
  );
}

export function purgeLegacyWorkflowStorage(storage = globalThis.localStorage) {
  if (!storage) return [];

  const keys = Array.from(
    new Set([
      ...LEGACY_WORKFLOW_STORAGE_KEYS,
      ...PROHIBITED_COMMERCIAL_AUTHORITY_STORAGE_KEYS,
      ...Array.from({ length: storage.length || 0 }, (_, index) => storage.key(index)),
      ...Object.keys(storage),
    ].filter(Boolean))
  ).filter(isLegacyWorkflowStorageKey);

  keys.forEach((key) => storage.removeItem(key));
  return keys;
}
