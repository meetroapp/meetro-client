import { MEMORY_CONSENT_STATES } from "./memoryContracts.js";

export function validateMemoryConsent(consent = {}, { category = "" } = {}) {
  const status = String(consent.status || "unknown");
  if (!MEMORY_CONSENT_STATES.includes(status)) return { ok: false, code: "unsupported_consent" };
  if (["unknown", "withdrawn"].includes(status)) return { ok: false, code: "consent_not_retrievable" };
  if (category === "workflow_reference" || category === "unfinished_work") {
    return ["explicit", "user_confirmed", "system_required"].includes(status)
      ? { ok: true, status }
      : { ok: false, code: "consent_required" };
  }
  return ["explicit", "user_confirmed"].includes(status)
    ? { ok: true, status }
    : { ok: false, code: "consent_required" };
}
