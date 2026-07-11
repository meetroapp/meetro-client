import { MEMORY_CONTEXT_SECTION, MEMORY_ENGINE_ID, MEMORY_ENGINE_PRIORITY, emptyPersistentMemoryContext } from "./memoryContracts.js";
import { validateMemoryRepository } from "./memoryRepositoryContracts.js";
import { retrievePersistentMemories } from "./memoryRetrieval.js";
import { requestedMemoryScope } from "./memoryScope.js";
import { resolveMemorySource } from "./memorySourceResolver.js";

export function persistentMemoryEngineSupports(request = {}) {
  return Boolean(request.userId) && request.feature !== "community";
}

export async function collectPersistentMemoryContext({ request = {}, collected = {}, logger = null } = {}) {
  const scope = requestedMemoryScope(request, collected);
  const source = resolveMemorySource(request);
  if (!source || !validateMemoryRepository(source.repository).ok) return emptyPersistentMemoryContext([]);
  const startedAt = Date.now();
  try {
    const result = await retrievePersistentMemories({
      repository: source.repository, requestedScope: scope,
      query: { requestId: request.requestId, feature: request.feature, capability: request.capability },
    });
    logger?.info?.("intelligence.memory.retrieved", {
      requestId: request.requestId, userId: scope.userId, businessId: scope.businessId,
      requestedScopes: result.retrieval.requestedScopes, matchedCount: result.retrieval.matchedCount,
      omittedCount: result.retrieval.omittedCount, truncated: result.retrieval.truncated,
      elapsedMs: Date.now() - startedAt,
    });
    return result;
  } catch {
    logger?.warn?.("intelligence.memory.retrieval_failed", { requestId: request.requestId, userId: scope.userId, elapsedMs: Date.now() - startedAt });
    return { ...emptyPersistentMemoryContext([]), warnings: ["persistent_memory_unavailable"] };
  }
}

export const persistentMemoryEngine = Object.freeze({
  id: MEMORY_ENGINE_ID, priority: MEMORY_ENGINE_PRIORITY,
  supports: persistentMemoryEngineSupports,
  async collectContext(request, collected = {}) {
    return { section: MEMORY_CONTEXT_SECTION, priority: MEMORY_ENGINE_PRIORITY, data: await collectPersistentMemoryContext({ request, collected }) };
  },
});
