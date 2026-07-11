import crypto from "node:crypto";
import { activeMemoryLifecycle } from "./memoryLifecycle.js";
import { authorizeMemoryScope } from "./memoryAuthorization.js";
import { evaluateMemoryWritePolicy } from "./memoryWritePolicy.js";

function safeLog(logger, event, fields) {
  logger?.info?.(event, fields);
}

export async function createPersistentMemory({ repository, request, candidate = {}, logger = null, now = () => new Date().toISOString() } = {}) {
  const ownerType = candidate.ownerType || "user";
  const ownerId = candidate.ownerId;
  const authorization = authorizeMemoryScope({ request, ownerType, ownerId, scope: candidate.scope });
  if (!authorization.ok) return authorization;
  const createdAt = now();
  const memory = {
    ...candidate,
    memoryId: candidate.memoryId || `memory-${crypto.randomUUID()}`,
    ownerType,
    ownerId,
    scope: authorization.scope,
    lifecycle: candidate.lifecycle || activeMemoryLifecycle({ now: createdAt, expiresAt: candidate.expiresAt || null }),
    confidence: candidate.confidence || "confirmed",
    sensitivity: candidate.sensitivity || "standard",
    tags: [...new Set(candidate.tags || [])].slice(0, 12),
    version: Number(candidate.version || 1),
  };
  const policy = evaluateMemoryWritePolicy(memory);
  if (!policy.ok) return policy;
  const created = await repository.createMemory(memory);
  safeLog(logger, "intelligence.memory.created", {
    requestId: request.requestId,
    userId: request.userId,
    memoryId: created.memoryId,
    category: created.category,
    scopeType: created.scope.type,
  });
  return { ok: true, memory: created };
}
