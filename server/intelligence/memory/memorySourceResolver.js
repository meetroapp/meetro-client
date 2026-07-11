import { resolvePersistentMemoryRepository } from "./memoryRepositoryContracts.js";

export function resolveMemorySource(request = {}) {
  const repository = resolvePersistentMemoryRepository(request);
  return repository ? { repository, source: "trusted_repository" } : null;
}
