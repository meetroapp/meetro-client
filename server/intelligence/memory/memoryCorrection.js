import crypto from "node:crypto";
import { authorizeMemoryScope } from "./memoryAuthorization.js";
import { evaluateMemoryWritePolicy } from "./memoryWritePolicy.js";

export async function correctPersistentMemory({ repository, request, memoryId, correction = {}, now = () => new Date().toISOString() } = {}) {
  const current = await repository.getMemoryById(memoryId);
  if (!current) return { ok: false, code: "memory_not_found" };
  const authorization = authorizeMemoryScope({ request, ownerType: current.ownerType, ownerId: current.ownerId, scope: current.scope });
  if (!authorization.ok) return authorization;
  const correctedAt = now();
  const next = {
    ...current,
    ...correction,
    memoryId: `memory-${crypto.randomUUID()}`,
    previousMemoryId: current.memoryId,
    version: Number(current.version || 1) + 1,
    lifecycle: { ...current.lifecycle, status: "active", createdAt: correctedAt, updatedAt: correctedAt, deletedAt: null },
    correction: { correctedAt, correctedBy: request.userId, correctionReason: String(correction.correctionReason || "user_correction").slice(0, 120) },
  };
  const policy = evaluateMemoryWritePolicy(next); if (!policy.ok) return policy;
  return { ok: true, ...(await repository.correctMemory(memoryId, next)) };
}
