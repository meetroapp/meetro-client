export function evaluateExecutionIdempotency(governance = {}) {
  const idempotency = governance.idempotency || {};
  if (idempotency.status === "duplicate") return { required: true, status: "duplicate", keyPresent: Boolean(idempotency.key), duplicate: true };
  if (idempotency.status === "verified" && idempotency.key) return { required: true, status: "verified", keyPresent: true, duplicate: false };
  return { required: true, status: "missing", keyPresent: false, duplicate: false };
}
