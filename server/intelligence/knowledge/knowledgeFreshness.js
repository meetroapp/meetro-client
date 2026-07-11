const DAY = 86_400_000;

export function classifyKnowledgeFreshness(source = {}, now = Date.now()) {
  const expires = Date.parse(source.expiresAt || "");
  if (Number.isFinite(expires) && expires <= now) return "expired";
  const updated = Date.parse(source.updatedAt || source.effectiveAt || "");
  if (!Number.isFinite(updated)) return "unknown";
  const age = now - updated;
  if (age <= 365 * DAY) return "current";
  if (age <= 730 * DAY) return "aging";
  return "stale";
}

export function sourceIsActive(source = {}, { historical = false, now = Date.now() } = {}) {
  if (source.status === "expired" || classifyKnowledgeFreshness(source, now) === "expired") return false;
  if (source.status === "superseded") return historical === true;
  return source.status === "active";
}
