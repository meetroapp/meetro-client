import { DEFAULT_MEMORY_CONTEXT_LIMIT, emptyPersistentMemoryContext } from "./memoryContracts.js";
import { validateMemoryConsent } from "./memoryConsent.js";
import { isMemoryExpired } from "./memoryRetention.js";
import { scoreMemoryRelevance } from "./memoryRelevance.js";
import { evaluateMemorySensitivity } from "./memorySensitivity.js";
import { memoryScopeMatches } from "./memoryScope.js";

function safeProviderMemory(memory) {
  return {
    memoryId: memory.memoryId, category: memory.category, key: memory.key,
    summary: memory.summary, value: structuredClone(memory.value), scope: memory.scope.type,
    confidence: memory.confidence, sourceType: memory.source.type,
    lastUpdatedAt: memory.lifecycle.updatedAt,
  };
}

function ownerMatches(memory, requestedScope) {
  if (memory.ownerType === "system") return memory.scope?.type === "system";
  if (memory.ownerType === "user") return Boolean(memory.ownerId && memory.ownerId === requestedScope.userId);
  if (memory.ownerType === "business") return Boolean(memory.ownerId && memory.ownerId === requestedScope.businessId);
  return false;
}

export async function retrievePersistentMemories({ repository, requestedScope = {}, query = {}, limit = DEFAULT_MEMORY_CONTEXT_LIMIT, now = Date.now() } = {}) {
  const requestedScopes = ["workflow", "relationship", "business", "user", "conversation", "community", "system"]
    .filter((type) => type === "system" || requestedScope[`${type}Id`] || (type === "user" && requestedScope.userId));
  if (!repository) return emptyPersistentMemoryContext(requestedScopes);
  const records = await repository.listMemories({ requestedScope, query });
  const eligible = [];
  let omittedCount = 0;
  for (const memory of records) {
    const consent = validateMemoryConsent(memory.consent, { category: memory.category });
    const sensitivity = evaluateMemorySensitivity(memory);
    if (memory.lifecycle?.status !== "active" || isMemoryExpired(memory, now) || !consent.ok || !sensitivity.ok || !ownerMatches(memory, requestedScope) || !memoryScopeMatches(memory.scope, requestedScope)) {
      omittedCount += 1; continue;
    }
    eligible.push({ memory, relevance: scoreMemoryRelevance(memory, query) });
  }
  eligible.sort((a, b) => b.relevance.relevanceScore - a.relevance.relevanceScore || String(b.memory.lifecycle?.updatedAt || "").localeCompare(String(a.memory.lifecycle?.updatedAt || "")) || a.memory.memoryId.localeCompare(b.memory.memoryId));
  const selected = eligible.slice(0, Math.max(0, limit));
  await Promise.all(selected.map(({ memory }) => repository.recordMemoryUsage?.(memory.memoryId, { usedAt: new Date(now).toISOString(), requestId: query.requestId || "" })));
  return {
    memories: selected.map(({ memory }) => safeProviderMemory(memory)),
    retrieval: { requestedScopes, matchedCount: selected.length, omittedCount, truncated: eligible.length > selected.length },
    warnings: [],
  };
}
