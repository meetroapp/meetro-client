export function recommendationIsBlocked(option = {}, collected = {}) {
  const validation = collected.validation || {}; const decision = collected.decision || {};
  return option.blocked || ["blocked", "conflicted", "unauthorized", "insufficient_evidence", "stale_only"].includes(validation.status) || ["blocked", "no_safe_option", "unsupported"].includes(decision.recommendationMode) || option.permissionStatus === "denied";
}

