function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sameUuid(left, right) {
  const a = text(left).toLowerCase();
  const b = text(right).toLowerCase();
  return Boolean(a && b && a === b);
}

function uniqueText(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const candidate = text(value);
    const identity = candidate.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!candidate || !identity || seen.has(identity)) continue;
    seen.add(identity);
    result.push(candidate);
  }
  return result;
}

function linkedContactName(customerParty, linkedContact) {
  if (
    !customerParty ||
    !linkedContact ||
    !sameUuid(customerParty.businessContactId, linkedContact.id)
  ) return "";
  return text(linkedContact.displayName) || text(linkedContact.companyName);
}

function jobScope(job = {}) {
  const recommendations = Array.isArray(job.recommendations)
    ? job.recommendations
        .filter((item) => ["ACTIVE", "ACCEPTED"].includes(item?.status))
        .map((item) => item?.statement)
    : [];
  const evaluationScope = Array.isArray(job.evaluation?.scopeRecommendations)
    ? job.evaluation.scopeRecommendations
    : [];
  return uniqueText([
    ...recommendations,
    job.evaluation?.diagnosisSummary,
    ...evaluationScope,
    job.evaluation?.observations,
    job.customerConcern,
  ]).join("\n");
}

export function hydrateSavedJobLinkedQuotePresentation({
  content = {},
  documentJobId = "",
  customerParty = null,
  linkedContact = null,
  job = {},
} = {}) {
  const exactJob = Boolean(
    job?.customerLinkedFromJob && sameUuid(documentJobId, job.id)
  );
  if (!exactJob) return Object.freeze({ ...content });

  const durableCustomerName = linkedContactName(customerParty, linkedContact);
  const customerName = durableCustomerName || text(job.customerName) || text(content.customerName);
  const projectTitle = text(content.projectTitle) || text(job.title);
  const projectDescription = text(content.projectDescription) || text(job.customerConcern);
  const recommendedSolution = text(content.recommendedSolution) || jobScope(job);

  return Object.freeze({
    ...content,
    customerName,
    projectTitle,
    projectDescription,
    recommendedSolution,
  });
}

export const savedJobLinkedQuoteHydrationInternals = Object.freeze({
  jobScope,
  linkedContactName,
  sameUuid,
});
