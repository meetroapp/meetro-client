import { buildProfessionalWorkCenterRoute } from "./professionalWorkCenterRoute.js";

const APPROVED_STAGE_CODES = new Set([
  "QUOTE_APPROVED_DEPOSIT_DUE",
  "QUOTE_APPROVED",
  "WORK_READY",
  "WORK_IN_PROGRESS",
  "WORK_BLOCKED",
  "WORK_REVIEW_NEEDED",
  "WORKSTREAMS_COMPLETE_PENDING_JOB_COMPLETION",
  "JOB_COMPLETED",
]);

export function projectProfessionalQuoteDecisionAttention({ quote, liveJob } = {}) {
  if (
    quote?.classification !== "APPROVED" ||
    quote?.customerDecision !== "APPROVED" ||
    !quote?.decidedAt ||
    liveJob?.authoritySource !== "CANONICAL_LIVE_JOB_READ" ||
    liveJob.jobId !== quote.jobId ||
    !APPROVED_STAGE_CODES.has(liveJob.stage?.code)
  ) return null;
  const route = buildProfessionalWorkCenterRoute({
    jobId: quote.jobId,
    quoteId: quote.id,
  });
  if (!route) return null;
  return Object.freeze({
    quoteId: quote.id,
    jobId: quote.jobId,
    customerLabel: quote.customer.displayName,
    projectTitle: quote.job.title,
    totalMinor: quote.totalMinor,
    currency: quote.currency,
    decidedAt: quote.decidedAt,
    stageCode: liveJob.stage.code,
    stageLabel: liveJob.stage.label,
    nextAction: liveJob.nextAction.description,
    depositDue: liveJob.stage.code === "QUOTE_APPROVED_DEPOSIT_DUE",
    route,
  });
}

export function projectProfessionalQuoteDecisionAttentionList({
  quotes = [],
  liveJobs = [],
  durableAlertQuoteIds = [],
} = {}) {
  const jobs = new Map(liveJobs.map((item) => [item?.jobId, item]));
  const durable = new Set(durableAlertQuoteIds);
  return quotes
    .filter((quote) => !durable.has(quote?.id))
    .map((quote) => projectProfessionalQuoteDecisionAttention({
      quote,
      liveJob: jobs.get(quote?.jobId),
    }))
    .filter(Boolean)
    .sort((first, second) => Date.parse(second.decidedAt) - Date.parse(first.decidedAt));
}
