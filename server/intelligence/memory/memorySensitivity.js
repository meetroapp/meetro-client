const PROHIBITED_KEYS = /(?:password|passcode|api[_-]?key|credential|secret|token|payment|card|bank|routing|medical|diagnosis|religion|race|ethnicity|sexual|immigration|political|precise.*location|address|private.*message|message.*body|private.*note|photo|prompt)/i;
const CREDENTIAL_VALUE = /(?:bearer\s+[a-z0-9._-]+|sk-[a-z0-9_-]{12,}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/i;

function inspect(value, key = "", depth = 0) {
  if (depth > 5) return false;
  if (PROHIBITED_KEYS.test(key)) return false;
  if (typeof value === "string") return value.length <= 500 && !CREDENTIAL_VALUE.test(value);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return true;
  if (Array.isArray(value)) return value.length <= 20 && value.every((item) => inspect(item, key, depth + 1));
  if (!value || typeof value !== "object") return false;
  const entries = Object.entries(value);
  return entries.length <= 20 && entries.every(([childKey, child]) => inspect(child, childKey, depth + 1));
}

export function evaluateMemorySensitivity({ sensitivity = "standard", value = {}, summary = "" } = {}) {
  if (sensitivity === "prohibited") return { ok: false, code: "prohibited_memory" };
  if (!inspect(value) || !inspect(summary, "summary")) return { ok: false, code: "prohibited_content" };
  return { ok: true, sensitivity: sensitivity === "restricted" ? "restricted" : "standard" };
}
