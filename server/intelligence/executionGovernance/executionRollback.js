export function classifyRollbackPolicy(plan = null) {
  const codes = new Set((plan?.rollbackConsiderations || []).map((item) => item.code));
  if (codes.has("irreversible")) return "irreversible";
  if (codes.has("compensating_action")) return "compensating_action";
  if (codes.has("reversible")) return "reversible";
  if (codes.has("manual_review")) return "manual_review";
  return "not_supported";
}
