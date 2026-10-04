import { buildProfessionalWorkCenterRoute } from "./professionalWorkCenterRoute.js";
import { fetchJobCompletionReview, completeCanonicalJob, createJobCompletionIdempotencyKey } from "./jobCompletionApi.js";

// Reuse the existing completion review, optimistic version and command contract.
// Quote approval, deposit, Invoice and scheduling keep their native review flows.
export async function reviewAskMeetroCompletion(action, options = {}) {
  if (options.role !== "business" || action?.kind !== "COMPLETE_JOB" || !action.context?.jobId || action.context?.blocked) throw new Error("Open the exact Job in Work Center to review completion.");
  const review = await fetchJobCompletionReview({ setPage: options.setPage, authFetchImpl: options.authFetchImpl, jobId: action.context.jobId });
  if (!review.eligible || !review.canComplete || review.state !== "ACTIVE") throw new Error(review.reasons?.join(" · ") || "This Job is not eligible for completion.");
  return Object.freeze({ action, review, idempotencyKey: createJobCompletionIdempotencyKey() });
}
export async function applyAskMeetroCompletion(prepared, options = {}) {
  if (options.confirmed !== true || options.role !== "business" || !prepared?.review || prepared.action?.kind !== "COMPLETE_JOB" || prepared.review.jobId !== prepared.action.context.jobId) throw new Error("Review and confirmation are required.");
  const current = await fetchJobCompletionReview({ setPage: options.setPage, authFetchImpl: options.authFetchImpl, jobId: prepared.review.jobId });
  if (current.currentVersion !== prepared.review.currentVersion || !current.canComplete || !current.eligible || current.state !== "ACTIVE") throw new Error("This Job changed or is no longer eligible. Review its current state before applying.");
  const result = await completeCanonicalJob({ setPage: options.setPage, authFetchImpl: options.authFetchImpl, jobId: current.jobId, expectedVersion: current.currentVersion, idempotencyKey: prepared.idempotencyKey });
  return Object.freeze({ title: "Job completed", detail: "Work completion recorded in Job history", recordId: result.jobId, version: result.currentVersion, evidenceId: result.id, route: buildProfessionalWorkCenterRoute({ jobId: result.jobId, stage: "completion" }), completedAt: result.completedAt });
}
