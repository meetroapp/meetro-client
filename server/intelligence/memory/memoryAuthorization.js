import { authenticatedMemoryIdentity, normalizeMemoryScope } from "./memoryScope.js";

export function authorizeMemoryScope({ request = {}, ownerType = "user", ownerId = "", scope = {} } = {}) {
  const identity = authenticatedMemoryIdentity(request);
  const normalized = normalizeMemoryScope(scope);
  if (!identity.userId || !normalized) return { ok: false, code: "invalid_memory_scope" };
  if (!["user", "business", "system"].includes(ownerType)) {
    return { ok: false, code: "unsupported_memory_owner" };
  }
  if (ownerType === "system") return identity.internal
    ? { ok: true, scope: normalized }
    : { ok: false, code: "system_scope_forbidden" };
  if (ownerType === "user" && ownerId !== identity.userId) return { ok: false, code: "memory_owner_forbidden" };
  if (ownerType === "business" && !identity.businessIds.includes(ownerId)) {
    return { ok: false, code: "memory_owner_forbidden" };
  }
  if (normalized.userId && normalized.userId !== identity.userId) return { ok: false, code: "cross_user_memory_forbidden" };
  if (normalized.businessId && !identity.businessIds.includes(normalized.businessId)) {
    return { ok: false, code: "cross_business_memory_forbidden" };
  }
  if (["relationship", "workflow", "conversation"].includes(normalized.type)) {
    const field = `${normalized.type}Id`;
    const trusted = request.backendContext?.authorizedMemoryScopes?.[field] || [];
    const active = request.backendContext?.[normalized.type]?.[field]
      || request.backendContext?.activeWorkflow?.[field]
      || request.backendContext?.activeWorkflow?.id;
    if (normalized[field] !== active && !trusted.includes(normalized[field])) {
      return { ok: false, code: "scoped_memory_forbidden" };
    }
  }
  return { ok: true, scope: normalized };
}
