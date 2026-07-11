export const MEMORY_REPOSITORY_METHODS = Object.freeze([
  "createMemory", "getMemoryById", "listMemories", "updateMemory", "correctMemory",
  "deleteMemory", "deleteMemories", "purgeDeletedMemories", "expireMemory", "recordMemoryUsage",
  "createProposal", "getProposalById", "confirmProposal", "rejectProposal",
]);

export function validateMemoryRepository(repository, { writable = false } = {}) {
  if (!repository || typeof repository.listMemories !== "function") {
    return { ok: false, code: "persistent_memory_repository_unavailable" };
  }
  if (writable && typeof repository.createMemory !== "function") {
    return { ok: false, code: "persistent_memory_repository_read_only" };
  }
  return { ok: true };
}

export function resolvePersistentMemoryRepository(request = {}) {
  return request.persistentMemoryRepository
    || request.backendContext?.memoryRepository
    || request.repositories?.memory
    || null;
}
