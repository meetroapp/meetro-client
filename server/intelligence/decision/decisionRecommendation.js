export function resolveDecisionRecommendation(collected = {}, options = []) {
  const validation = collected.validation || {}; const capability = collected.capabilities || {};
  if (!capability.selectedCapability) return { mode: capability.status === "unsupported" ? "unsupported" : "no_safe_option", selected: null };
  if (validation.responseConstraints?.clarificationRequired || capability.status === "ambiguous") return { mode: "clarification_required", selected: null };
  if (validation.status === "blocked" || validation.responseMode === "blocked") return { mode: "blocked", selected: null };
  if (["conflicted", "insufficient_evidence", "unauthorized", "stale_only", "unknown"].includes(validation.status) || validation.overallConfidence === "withheld") return { mode: "no_safe_option", selected: null };
  const safe = options.filter((item) => !item.blocked && item.permissionStatus === "allowed");
  if (!safe.length) return { mode: "no_safe_option", selected: null };
  if (safe.length > 1 || capability.alternatives?.length) return { mode: "alternative", selected: safe[0] };
  return { mode: "recommended", selected: safe[0] };
}

