const MAX_METADATA_KEYS = 20;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function normalizeOrchestrationRequest(options = {}) {
  const body = cleanRecord(options.body);
  const user = cleanRecord(options.user);
  const source = cleanRecord(body.source);
  const metadata = Object.fromEntries(
    Object.entries(cleanRecord(body.metadata)).slice(0, MAX_METADATA_KEYS)
  );

  return Object.freeze({
    requestId: cleanText(options.requestId) || "companion-request",
    userId: cleanText(user.id || user.userId || user.sub || user.email),
    user,
    feature: cleanText(body.feature) || "ask_meetro",
    capability: cleanText(body.capability),
    source: Object.freeze({
      page: cleanText(body.page || body.pageContext || source.page || source.pageContext),
      surface: cleanText(body.surface || source.surface || source.source),
    }),
    message: cleanText(body.question || body.prompt || body.message),
    conversationId: cleanText(body.conversationId),
    projectId: cleanText(body.projectId),
    customerId: cleanText(body.customerId),
    businessId: cleanText(body.businessId),
    communityId: cleanText(body.communityId),
    metadata: Object.freeze(metadata),
    providerOptions: Object.freeze(cleanRecord(options.providerOptions)),
    body,
    backendContext: cleanRecord(options.backendContext),
    repositories: cleanRecord(options.repositories),
    memoryRepository: options.memoryRepository,
    persistentMemoryRepository: options.persistentMemoryRepository,
  });
}

export function createEngineContextResult({ section, priority = 100, data, metadata = {} } = {}) {
  return {
    section: cleanText(section),
    priority: Number.isFinite(priority) ? priority : 100,
    data,
    metadata: cleanRecord(metadata),
  };
}

export function createOrchestrationError(code = "orchestration_failure", message = "Intelligence orchestration failed.") {
  return Object.assign(new Error(message), { code });
}
