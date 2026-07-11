export function activeMemoryLifecycle({ now = new Date().toISOString(), expiresAt = null } = {}) {
  return { status: "active", createdAt: now, updatedAt: now, lastUsedAt: null, expiresAt, deletedAt: null };
}

export function memoryIsActive(memory = {}) {
  return memory.lifecycle?.status === "active";
}
