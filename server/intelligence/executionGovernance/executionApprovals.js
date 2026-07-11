function parseTime(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : null;
}

export function evaluateExecutionApprovals({ plan = null, governance = {} } = {}) {
  const required = (plan?.requiredApprovals || []).map((item) => ({
    approvalId: item.approvalId,
    capabilityId: item.capabilityId,
    targetId: plan.planId,
    status: "required",
  }));
  if (!required.length) return { status: "not_required", requiredApprovals: [] };

  const approvals = Array.isArray(governance.approvals) ? governance.approvals : [];
  const evaluatedAt = parseTime(governance.evaluatedAt);
  let overall = "verified";
  const verified = required.map((item) => {
    const supplied = approvals.find((approval) => approval.approvalId === item.approvalId && approval.targetId === item.targetId);
    if (!supplied || supplied.status !== "approved") {
      overall = "missing";
      return item;
    }
    if (!governance.materialStateVersion || supplied.materialStateVersion !== governance.materialStateVersion) {
      overall = "invalidated";
      return { ...item, status: "invalidated" };
    }
    const expiresAt = parseTime(supplied.expiresAt);
    if (!evaluatedAt || !expiresAt || expiresAt <= evaluatedAt) {
      overall = "expired";
      return { ...item, status: "expired" };
    }
    return { ...item, status: "verified" };
  });
  return { status: overall, requiredApprovals: verified };
}
