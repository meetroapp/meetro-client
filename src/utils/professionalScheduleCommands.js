function sameOpportunity(candidate, opportunity) {
  if (
    candidate?.jobId !== opportunity?.jobId ||
    candidate?.purpose !== opportunity?.purpose
  ) return false;
  return opportunity.purpose === "EVALUATION"
    ? candidate.jobId === opportunity.jobId
    : opportunity.quoteApprovalId
      ? candidate.quoteApprovalId === opportunity.quoteApprovalId
      : candidate.approvedQuoteDecisionId === opportunity.approvedQuoteDecisionId;
}

export async function prepareProfessionalSchedulingOpportunity({
  opportunity,
  activate,
  readActive,
} = {}) {
  if (!opportunity || typeof activate !== "function" || typeof readActive !== "function") {
    return null;
  }
  if (opportunity.authority?.state === "ACTIVE") return opportunity;
  if (opportunity.authority?.state !== "AVAILABLE") return null;

  await activate(opportunity);
  const refreshed = await readActive();
  const active = refreshed?.opportunities?.find((candidate) =>
    sameOpportunity(candidate, opportunity)
  );
  return active?.authority?.state === "ACTIVE" ? active : null;
}
