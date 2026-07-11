export function isMemoryExpired(memory = {}, now = Date.now()) {
  const expiresAt = Date.parse(memory.lifecycle?.expiresAt || "");
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

export function validateRetention(memory = {}) {
  const expiresAt = memory.lifecycle?.expiresAt;
  if (!expiresAt) return { ok: true };
  return Number.isFinite(Date.parse(expiresAt))
    ? { ok: true }
    : { ok: false, code: "invalid_expiration" };
}

export const DEFAULT_MEMORY_RETENTION = Object.freeze({
  preference: "until_changed_or_deleted",
  workflow_reference: "explicit_expiration_or_workflow_policy",
  relationship_reference: "until_corrected_deleted_or_policy_expiration",
  conversation: "explicit_conversation_policy_only",
});
