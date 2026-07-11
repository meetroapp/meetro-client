import { MEMORY_CATEGORIES } from "./memoryContracts.js";
import { validateMemoryConsent } from "./memoryConsent.js";
import { validateRetention } from "./memoryRetention.js";
import { evaluateMemorySensitivity } from "./memorySensitivity.js";

export function evaluateMemoryWritePolicy(candidate = {}) {
  if (!MEMORY_CATEGORIES.includes(candidate.category)) return { ok: false, code: "unsupported_memory_category" };
  if (!candidate.ownerId || !candidate.scope?.type || !candidate.key) return { ok: false, code: "incomplete_memory_identity" };
  if (!candidate.source?.type || !candidate.source?.sourceId || !candidate.source?.recordedAt) {
    return { ok: false, code: "memory_source_required" };
  }
  const consent = validateMemoryConsent(candidate.consent, { category: candidate.category });
  if (!consent.ok) return consent;
  const sensitivity = evaluateMemorySensitivity(candidate);
  if (!sensitivity.ok) return sensitivity;
  const retention = validateRetention(candidate);
  if (!retention.ok) return retention;
  return { ok: true };
}
