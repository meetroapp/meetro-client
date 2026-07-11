import { getRelationshipParties, hasStableParty, partiesAgree } from "./relationshipIdentity.js";

const SOURCES = Object.freeze([
  ["relationships", "relationship"],
  ["conversations", "conversation"],
  ["workflowRecords", "workflow"],
  ["standardJobs", "workflow"],
  ["serviceRequests", "request"],
  ["emergencyJobs", "emergency"],
  ["emergencyRequests", "emergency"],
  ["proposals", "proposal"],
  ["quotes", "proposal"],
  ["invoices", "invoice"],
  ["completions", "completion"],
  ["closures", "closure"],
  ["jobHistory", "history"],
  ["completedProjects", "history"],
  ["hiringConversations", "hiring"],
  ["communityInteractions", "community"],
]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function ids(record = {}) {
  return {
    relationshipId: text(record.relationshipId || record.relationship_id),
    conversationId: text(
      record.conversationId ||
        (record.id && /conversation/i.test(String(record.type || record.category || ""))
          ? record.id
          : "")
    ),
    projectId: text(record.projectId || record.activeProjectId),
    jobId: text(record.jobId || record.activeJobId),
    requestId: text(record.requestId || record.activeRequestId),
    emergencyRequestId: text(record.emergencyRequestId),
    hiringId: text(record.hiringId || record.applicationId || record.positionId),
    communityId: text(record.communityId || record.communityInteractionId),
  };
}

function collect(backendContext = {}, repositoryData = {}) {
  const result = [];
  for (const [key, kind] of SOURCES) {
    for (const source of [backendContext[key], repositoryData[key]]) {
      if (Array.isArray(source)) {
        source.filter(isRecord).forEach((record) => {
          const normalizedRecord = ["conversation", "hiring"].includes(kind) && !record.conversationId && record.id
            ? { ...record, conversationId: record.id }
            : record;
          result.push({ record: normalizedRecord, kind, source: key });
        });
      }
    }
  }
  if (isRecord(backendContext.relationship)) result.unshift({ record: backendContext.relationship, kind: "relationship", source: "active_relationship" });
  if (isRecord(backendContext.activeWorkflow)) result.push({ record: backendContext.activeWorkflow, kind: "workflow", source: "active_workflow" });
  return result;
}

function visibleToAuthenticatedUser(entry, user = {}) {
  const parties = getRelationshipParties(entry.record, {});
  const userId = text(user.id || user.userId);
  const accountType = text(user.accountType || user.role).toLowerCase();
  const businessId = text(user.businessId || user.activeBusinessId);
  if (accountType === "professional") {
    if (businessId && parties.businessId && parties.businessId !== businessId) return false;
    if (!businessId && userId && parties.professionalId && parties.professionalId !== userId) return false;
    return true;
  }
  if (userId && parties.customerId && parties.customerId !== userId) return false;
  return true;
}

function requested(request = {}, context = {}) {
  const body = request.body || {};
  const workflow = context.workflow || {};
  const user = request.user || {};
  return {
    relationshipId: text(body.relationshipId),
    conversationId: text(body.conversationId || request.conversationId || workflow.conversationId),
    projectId: text(body.projectId || request.projectId || workflow.activeProjectId),
    jobId: text(body.jobId || workflow.activeJobId),
    requestId: text(body.requestId || workflow.activeRequestId),
    emergencyRequestId: text(body.emergencyRequestId),
    customerId: text(body.customerId),
    businessId: text(user.businessId || user.activeBusinessId || body.businessId),
    professionalId: text(user.accountType === "professional" ? user.id || user.userId : body.professionalId),
  };
}

function sharesStableIdentity(candidate, primary, user) {
  const candidateIds = ids(candidate.record);
  const primaryIds = ids(primary.record);
  if (Object.keys(primaryIds).some((field) => primaryIds[field] && candidateIds[field] === primaryIds[field])) return true;
  const candidateParties = getRelationshipParties(candidate.record, user);
  const primaryParties = getRelationshipParties(primary.record, user);
  return hasStableParty(primaryParties) && hasStableParty(candidateParties) && partiesAgree(candidateParties, primaryParties);
}

export async function resolveRelationshipSource({ request = {}, context = {}, backendContext = {}, repositories = {} } = {}) {
  const query = requested(request, context);
  const repositoryData = {
    ...(typeof repositories.getRelationshipRecords === "function" ? await repositories.getRelationshipRecords({ user: request.user, identifiers: query }) : {}),
    ...(typeof repositories.getConversationRecords === "function" ? { conversations: await repositories.getConversationRecords({ user: request.user, identifiers: query }) } : {}),
    ...(typeof repositories.getWorkflowRecords === "function" ? await repositories.getWorkflowRecords({ user: request.user, identifiers: query }) : {}),
  };
  const records = collect(backendContext, repositoryData).filter((entry) =>
    visibleToAuthenticatedUser(entry, request.user)
  );
  const precedence = ["relationshipId", "conversationId", "projectId", "jobId", "requestId", "emergencyRequestId"];
  let primary = null;
  let matchedBy = "";
  for (const field of precedence) {
    if (!query[field]) continue;
    primary = records.find((entry) => ids(entry.record)[field] === query[field]);
    if (primary) { matchedBy = field; break; }
  }
  if (!primary && query.customerId && query.businessId) {
    primary = records.find((entry) => {
      const parties = getRelationshipParties(entry.record, request.user);
      return parties.customerId === query.customerId && parties.businessId === query.businessId;
    });
    if (primary) matchedBy = "customer_business_scope";
  }
  if (!primary && records.length === 1 && records[0].source === "active_relationship") {
    primary = records[0];
    matchedBy = "active_backend_relationship";
  }
  if (!primary) return null;

  const related = records.filter((candidate) => sharesStableIdentity(candidate, primary, request.user));
  const primaryParties = getRelationshipParties(primary.record, request.user);
  const conflicts = related.filter((candidate) => !partiesAgree(getRelationshipParties(candidate.record, request.user), primaryParties));
  return { primary, related: related.filter((candidate) => !conflicts.includes(candidate)), conflicts, matchedBy, query };
}
