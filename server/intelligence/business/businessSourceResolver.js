const SOURCE_NAMES = Object.freeze([
  "workflowRecords", "serviceRequests", "visits", "evaluations", "proposals", "quotes",
  "approvals", "payments", "deposits", "scheduleRecords", "scheduledWork", "activeWork",
  "emergencyJobs", "emergencyRequests", "completions", "closures", "jobHistory",
  "invoices", "receipts", "conversations", "relationshipRecords",
]);

const REPOSITORY_METHODS = Object.freeze([
  "getBusinessRecords", "getWorkflowRecords", "getScheduleRecords", "getProposalRecords",
  "getFinancialWorkflowRecords", "getRelationshipRecords",
]);

function text(value) { return value === undefined || value === null ? "" : String(value).trim(); }
function array(value) { return Array.isArray(value) ? value : []; }

function authorizedIds(request = {}) {
  const user = request.user || {};
  return [...new Set([
    ...array(request.backendContext?.authorizedBusinessIds),
    ...array(user.authorizedBusinessIds),
    user.businessId,
    request.backendContext?.businessId,
    request.backendContext?.businessProfile?.businessId,
  ].map(text).filter(Boolean))];
}

function recordBusinessId(record = {}) {
  return text(record.businessId || record.business_id || record.professionalBusinessId || record.providerBusinessId);
}

function flattenRepositoryResult(result, source) {
  if (Array.isArray(result)) return result.map((record) => ({ source, record }));
  if (!result || typeof result !== "object") return [];
  return Object.entries(result).flatMap(([name, records]) => array(records).map((record) => ({ source: name, record })));
}

export async function resolveBusinessSource({ request = {} } = {}) {
  const ids = authorizedIds(request);
  if (!ids.length) return null;
  const trustedRequested = text(request.backendContext?.businessId || request.backendContext?.businessProfile?.businessId);
  const businessId = trustedRequested && ids.includes(trustedRequested) ? trustedRequested : ids.length === 1 ? ids[0] : "";
  if (!businessId) return null;

  const candidates = SOURCE_NAMES.flatMap((source) =>
    array(request.backendContext?.[source]).map((record) => ({ source, record }))
  );
  for (const method of REPOSITORY_METHODS) {
    if (typeof request.repositories?.[method] !== "function") continue;
    const result = await request.repositories[method]({ user: request.user, businessId });
    candidates.push(...flattenRepositoryResult(result, method));
  }
  const scoped = candidates.filter(({ record }) => recordBusinessId(record) === businessId);
  return { businessId, source: trustedRequested ? "authenticated_business" : "authorized_business", records: scoped };
}

export { SOURCE_NAMES as BUSINESS_SOURCE_NAMES, recordBusinessId };
