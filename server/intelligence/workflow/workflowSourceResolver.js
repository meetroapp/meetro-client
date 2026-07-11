const ID_FIELDS = Object.freeze([
  "projectId",
  "jobId",
  "emergencyRequestId",
  "requestId",
  "completionId",
  "conversationId",
]);

const COLLECTIONS = Object.freeze([
  ["standardJobs", "standard_job"],
  ["jobs", "standard_job"],
  ["emergencyJobs", "emergency_job"],
  ["emergencyRequests", "emergency_job"],
  ["serviceRequests", "service_request"],
  ["scheduledVisits", "scheduled_visit"],
  ["evaluations", "evaluation"],
  ["proposals", "quote_or_proposal"],
  ["quotes", "quote_or_proposal"],
  ["activeWork", "active_work"],
  ["completions", "completion"],
  ["closures", "closure"],
  ["jobHistory", "job_history"],
  ["completedProjects", "job_history"],
  ["conversations", "conversation_workflow"],
]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function recordIds(record = {}) {
  return Object.fromEntries(ID_FIELDS.map((field) => [field, text(record[field] || (field === "projectId" ? record.activeProjectId : field === "jobId" ? record.activeJobId : field === "requestId" ? record.activeRequestId : ""))]));
}

function typeFromRecord(record = {}, fallback = "standard_job") {
  if (record.emergencyRequestId || /emergency/i.test(`${record.source || ""} ${record.type || ""}`)) return "emergency_job";
  if (record.readOnlyHistory || record.savedToHistory || ["history", "archived"].includes(String(record.status || "").toLowerCase())) return "job_history";
  return fallback;
}

function collectRecords(backendContext = {}, repositoryRecords = {}) {
  const records = [];
  const active = backendContext.activeWorkflow || backendContext.activeJob || backendContext.activeRequest;
  if (isRecord(active)) records.push({ record: active, type: typeFromRecord(active), source: "active_workflow" });

  for (const [collection, type] of COLLECTIONS) {
    const values = [backendContext[collection], repositoryRecords[collection]];
    for (const value of values) {
      if (Array.isArray(value)) {
        value.filter(isRecord).forEach((record) => records.push({ record, type: typeFromRecord(record, type), source: collection }));
      }
    }
  }
  return records;
}

function requestedIds(request = {}, context = {}) {
  const workflow = context.workflow || {};
  return {
    projectId: text(workflow.activeProjectId || request.projectId || request.body?.projectId),
    jobId: text(workflow.activeJobId || request.body?.jobId),
    emergencyRequestId: text(request.body?.emergencyRequestId),
    requestId: text(workflow.activeRequestId || request.body?.requestId),
    completionId: text(request.body?.completionId),
    conversationId: text(workflow.conversationId || request.conversationId || request.body?.conversationId),
  };
}

export async function resolveWorkflowSource({ request = {}, context = {}, backendContext = {}, repositories = {} } = {}) {
  const repositoryRecords = typeof repositories.getWorkflowRecords === "function"
    ? (await repositories.getWorkflowRecords({ user: request.user, identifiers: requestedIds(request, context) })) || {}
    : {};
  const records = collectRecords(backendContext, repositoryRecords);
  const ids = requestedIds(request, context);
  const precedence = ["projectId", "jobId", "emergencyRequestId", "requestId", "completionId", "conversationId"];

  for (const field of precedence) {
    if (!ids[field]) continue;
    const matches = records.filter(({ record }) => recordIds(record)[field] === ids[field]);
    if (matches.length) {
      const linkedIds = matches.reduce((all, { record }) => {
        for (const [key, value] of Object.entries(recordIds(record))) {
          if (value) all.add(`${key}:${value}`);
        }
        return all;
      }, new Set());
      const related = records.filter(({ record }) =>
        Object.entries(recordIds(record)).some(([key, value]) => value && linkedIds.has(`${key}:${value}`))
      );
      return {
        primary: matches[0],
        related,
        matchedBy: field,
        ambiguous: matches.some(({ record }) => {
          const candidate = recordIds(record);
          return precedence.some((other) => ids[other] && candidate[other] && candidate[other] !== ids[other]);
        }),
      };
    }
  }

  if (records.length === 1 && isRecord(backendContext.activeWorkflow || backendContext.activeJob || backendContext.activeRequest)) {
    return { primary: records[0], related: records, matchedBy: "active_backend_workflow", ambiguous: false };
  }
  return null;
}

export { ID_FIELDS };
