import { authorizeMemoryScope } from "./memoryAuthorization.js";

export async function deletePersistentMemory({ repository, request, memoryId, reason = "user_request", now = () => new Date().toISOString() } = {}) {
  const memory = await repository.getMemoryById(memoryId);
  if (!memory) return { ok: false, code: "memory_not_found" };
  const authorization = authorizeMemoryScope({ request, ownerType: memory.ownerType, ownerId: memory.ownerId, scope: memory.scope });
  if (!authorization.ok) return authorization;
  const deletedAt = now();
  return { ok: true, memory: await repository.deleteMemory(memoryId, { deletedAt, deletedBy: request.userId, reason: String(reason).slice(0, 120) }) };
}

export async function deletePersistentMemoriesInScope({ repository, request, scope, now = () => new Date().toISOString() } = {}) {
  const authorization = authorizeMemoryScope({ request, ownerType: "user", ownerId: request.userId, scope });
  if (!authorization.ok) return authorization;
  const deletedAt = now();
  const records = await repository.deleteMemories(
    (memory) => memory.ownerId === request.userId && memory.scope?.type === scope.type && Object.entries(scope).every(([key, value]) => !value || memory.scope?.[key] === value),
    { deletedAt, deletedBy: request.userId, reason: "scope_deletion" }
  );
  return { ok: true, deletedCount: records.length };
}
