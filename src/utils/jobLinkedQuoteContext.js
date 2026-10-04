import { authFetch } from "./authFetch.js";
import { listBusinessDocumentDrafts } from "./businessDocumentDraftApi.js";
import { validateCanonicalQuotes } from "./canonicalQuoteRead.js";
import { fetchCanonicalLiveJobProjection } from "./canonicalLiveJobProjection.js";
import { listEvaluationsForJob } from "./evaluationApi.js";
import {
  listCanonicalFindingsForEvaluation,
  listCanonicalRecommendationsForFinding,
} from "./findingRecommendationApi.js";
import {
  fetchAuthorizedProfessionalJobs,
  findAuthorizedProfessionalJob,
} from "./professionalJobPicker.js";
import { normalizeRequestLifecycleFoundation } from "./requestLifecycleFoundation.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function canonicalUuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function cleanText(value, maximum = 5000) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized.slice(0, maximum) : "";
}

function textIdentity(value) {
  return cleanText(value)
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueTexts(values, maximum = 20) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = cleanText(value);
    const identity = textIdentity(text);
    if (!text || !identity || seen.has(identity)) continue;
    seen.add(identity);
    result.push(text);
    if (result.length >= maximum) break;
  }
  return result;
}

function exactEvaluationForJob(evaluations, identity) {
  return (Array.isArray(evaluations) ? evaluations : []).find((candidate) => {
    const source = candidate?.aggregate?.sourceContext;
    return (
      source?.type === "ordinary_job" &&
      canonicalUuid(source.jobId) === identity.jobId &&
      positiveInteger(source.requestId) === identity.requestId &&
      positiveInteger(source.relationshipId) === identity.relationshipId
    );
  }) || null;
}

function canonicalCustomer(lifecycle, fallbackName) {
  const participant = lifecycle.participants.find((candidate) =>
    candidate.roles.includes("CUSTOMER_REPRESENTATIVE")
  );
  const displayName = cleanText(participant?.displayName || fallbackName, 200);
  return participant && displayName
    ? Object.freeze({
        participantId: String(participant.id),
        displayName,
        email: null,
        phone: null,
      })
    : null;
}

export function normalizeJobLinkedQuoteRouteJobId(value) {
  return canonicalUuid(value);
}

export function buildJobLinkedQuoteContext({
  job,
  liveJob,
  lifecycle,
  evaluations = [],
  findings = [],
  recommendations = [],
  savedDocuments = [],
  canonicalQuotes = [],
} = {}) {
  const jobId = canonicalUuid(job?.jobId);
  const requestId = positiveInteger(liveJob?.requestId);
  const relationshipId = positiveInteger(liveJob?.relationshipId);
  if (
    !jobId ||
    canonicalUuid(liveJob?.jobId) !== jobId ||
    !requestId ||
    !relationshipId ||
    positiveInteger(lifecycle?.requestId) !== requestId ||
    lifecycle?.contractVersion !== 2 ||
    lifecycle?.legacy === true ||
    canonicalUuid(lifecycle?.job?.id) !== jobId ||
    positiveInteger(lifecycle?.job?.requestRelationshipId) !== relationshipId
  ) {
    return null;
  }

  const customer = canonicalCustomer(lifecycle, job.customerLabel);
  if (!customer) return null;

  const concern = lifecycle.reportedConcerns[0] || null;
  const evaluation = exactEvaluationForJob(evaluations, {
    jobId,
    requestId,
    relationshipId,
  });
  const evaluationId = canonicalUuid(evaluation?.evaluation?.id);
  const exactFindings = (Array.isArray(findings) ? findings : []).filter(
    (finding) =>
      canonicalUuid(finding?.jobId) === jobId &&
      canonicalUuid(finding?.evaluationId) === evaluationId &&
      positiveInteger(finding?.requestId) === requestId &&
      positiveInteger(finding?.relationshipId) === relationshipId
  );
  const findingIds = new Set(exactFindings.map((finding) => canonicalUuid(finding.id)));
  const exactRecommendations = (Array.isArray(recommendations) ? recommendations : []).filter(
    (recommendation) =>
      canonicalUuid(recommendation?.jobId) === jobId &&
      canonicalUuid(recommendation?.evaluationId) === evaluationId &&
      findingIds.has(canonicalUuid(recommendation?.findingId))
  );
  const existingWorkingQuote = (Array.isArray(savedDocuments) ? savedDocuments : []).find(
    (document) =>
      document?.documentType === "QUOTE" &&
      document?.status === "WORKING_DRAFT" &&
      canonicalUuid(document?.jobId) === jobId
  ) || null;

  return Object.freeze({
    authoritySource: "CANONICAL_JOB_LINKED_QUOTE_READ",
    job: Object.freeze({
      jobId,
      requestId,
      relationshipId,
      title: cleanText(job.title, 500),
      serviceDomain: cleanText(job.serviceDomain, 200),
      serviceSpecialty: cleanText(job.serviceSpecialty, 200),
      city: cleanText(job.city, 120),
      serviceArea: cleanText(job.serviceArea, 260),
    }),
    customer,
    project: Object.freeze({
      title: cleanText(job.title, 500),
      customerConcern: cleanText(concern?.originalText, 5000),
      concernId: concern?.id ? String(concern.id) : null,
    }),
    evaluation: evaluation
      ? Object.freeze({
          id: evaluationId,
          version: positiveInteger(evaluation.aggregate?.version),
          status: evaluation.evaluation.status,
          observations: cleanText(evaluation.evaluation.content?.observations, 5000),
          diagnosisSummary: cleanText(
            evaluation.evaluation.content?.diagnosisSummary,
            5000
          ),
          scopeRecommendations: uniqueTexts(
            evaluation.evaluation.content?.scopeRecommendations || []
          ),
        })
      : null,
    findings: Object.freeze(
      exactFindings.map((finding) =>
        Object.freeze({
          id: canonicalUuid(finding.id),
          statement: cleanText(finding.statement, 5000),
          confirmationState: finding.confirmationState,
        })
      )
    ),
    recommendations: Object.freeze(
      exactRecommendations.map((recommendation) =>
        Object.freeze({
          id: canonicalUuid(recommendation.id),
          findingId: canonicalUuid(recommendation.findingId),
          statement: cleanText(recommendation.statement, 5000),
          status: recommendation.status,
        })
      )
    ),
    existingQuote: Object.freeze({
      workingDocumentId: canonicalUuid(existingWorkingQuote?.id) || null,
      canonicalQuoteIds: Object.freeze(
        (Array.isArray(canonicalQuotes) ? canonicalQuotes : [])
          .filter((quote) => canonicalUuid(quote?.jobId) === jobId)
          .map((quote) => canonicalUuid(quote.id))
      ),
    }),
    privacy: Object.freeze({
      exactAddressIncluded: false,
      communicationIncluded: false,
      serviceAreaOnly: true,
    }),
  });
}

export function buildJobLinkedQuotePrefill(context) {
  if (context?.authoritySource !== "CANONICAL_JOB_LINKED_QUOTE_READ") {
    return null;
  }
  const structuredRecommendations = context.recommendations
    .filter((item) => ["ACTIVE", "ACCEPTED"].includes(item.status))
    .map((item) => item.statement);
  const confirmedFindings = context.findings
    .filter((item) => item.confirmationState === "CONFIRMED")
    .map((item) => item.statement);
  const assessment = uniqueTexts([
    context.evaluation?.observations,
    ...confirmedFindings,
  ]).join("\n");
  const recommendedScope = uniqueTexts([
    ...structuredRecommendations,
    context.evaluation?.diagnosisSummary,
    ...(context.evaluation?.scopeRecommendations || []),
  ]);
  const scope = (
    recommendedScope.length
      ? recommendedScope
      : uniqueTexts([context.evaluation?.observations])
  ).join("\n");

  return Object.freeze({
    customerName: context.customer.displayName,
    customerEmail: context.customer.email || "",
    customerPhone: context.customer.phone || "",
    customerLocation:
      context.job.serviceArea || context.job.city || "",
    projectTitle: context.project.title,
    projectDescription: context.project.customerConcern,
    recommendedSolution: scope,
    professionalAssessment: assessment,
  });
}

async function loadLifecycle({ requestId, setPage, authFetchImpl }) {
  const { response, data } = await authFetchImpl(
    `/posts/${encodeURIComponent(requestId)}/lifecycle`,
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (!response?.ok) return null;
  return normalizeRequestLifecycleFoundation(data);
}

async function loadCanonicalQuotes({ jobId, setPage, authFetchImpl }) {
  const { response, data } = await authFetchImpl(
    `/jobs/${encodeURIComponent(jobId)}/quotes`,
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (!response?.ok || data?.success !== true) return null;
  return validateCanonicalQuotes(data.quotes, { jobId });
}

export async function fetchJobLinkedQuoteContext({
  jobId,
  setPage,
  authFetchImpl = authFetch,
  fetchJobsImpl = fetchAuthorizedProfessionalJobs,
  fetchLiveJobImpl = fetchCanonicalLiveJobProjection,
  listEvaluationsImpl = listEvaluationsForJob,
  listFindingsImpl = listCanonicalFindingsForEvaluation,
  listRecommendationsImpl = listCanonicalRecommendationsForFinding,
  listSavedDocumentsImpl = listBusinessDocumentDrafts,
} = {}) {
  const normalizedJobId = canonicalUuid(jobId);
  if (!normalizedJobId) {
    return Object.freeze({ status: "unavailable", reason: "INVALID_JOB_ID", context: null });
  }

  try {
    const [jobs, liveJobResult] = await Promise.all([
      fetchJobsImpl({ setPage, authFetchImpl }),
      fetchLiveJobImpl({ jobId: normalizedJobId, setPage, authFetchImpl }),
    ]);
    const job = findAuthorizedProfessionalJob(jobs, normalizedJobId);
    const liveJob = liveJobResult?.status === "ready"
      ? liveJobResult.projection
      : null;
    if (!job || !liveJob || liveJob.jobId !== normalizedJobId) {
      return Object.freeze({
        status: "unavailable",
        reason: liveJobResult?.reason || "JOB_NOT_AUTHORIZED",
        context: null,
      });
    }

    const [lifecycle, evaluations, savedDocuments, canonicalQuotes] = await Promise.all([
      loadLifecycle({
        requestId: liveJob.requestId,
        setPage,
        authFetchImpl,
      }),
      listEvaluationsImpl({ jobId: normalizedJobId, setPage }),
      listSavedDocumentsImpl({ type: "QUOTE", setPage, authFetchImpl }),
      loadCanonicalQuotes({ jobId: normalizedJobId, setPage, authFetchImpl }),
    ]);
    if (!lifecycle || !Array.isArray(evaluations) || !Array.isArray(canonicalQuotes)) {
      return Object.freeze({ status: "unavailable", reason: "JOB_CONTEXT_INVALID", context: null });
    }

    const evaluation = exactEvaluationForJob(evaluations, {
      jobId: normalizedJobId,
      requestId: positiveInteger(liveJob.requestId),
      relationshipId: positiveInteger(liveJob.relationshipId),
    });
    let findings = [];
    let recommendations = [];
    if (evaluation) {
      findings = await listFindingsImpl({
        evaluationId: evaluation.evaluation.id,
        setPage,
      });
      const recommendationLists = await Promise.all(
        findings.map((finding) => listRecommendationsImpl({ finding, setPage }))
      );
      recommendations = recommendationLists.flat();
    }

    const context = buildJobLinkedQuoteContext({
      job,
      liveJob,
      lifecycle,
      evaluations,
      findings,
      recommendations,
      savedDocuments,
      canonicalQuotes,
    });
    return context
      ? Object.freeze({ status: "ready", reason: "", context })
      : Object.freeze({ status: "unavailable", reason: "JOB_CONTEXT_MISMATCH", context: null });
  } catch (error) {
    return Object.freeze({
      status: "error",
      reason: error?.code || "JOB_CONTEXT_FETCH_FAILED",
      context: null,
    });
  }
}

export function jobLinkedQuoteHasExistingContent(context) {
  return Boolean(
    context?.existingQuote?.workingDocumentId ||
      context?.existingQuote?.canonicalQuoteIds?.length
  );
}

export function resolveJobLinkedSavedQuoteResume(context) {
  if (context?.authoritySource !== "CANONICAL_JOB_LINKED_QUOTE_READ") {
    return null;
  }
  const jobId = canonicalUuid(context?.job?.jobId);
  const documentId = canonicalUuid(context?.existingQuote?.workingDocumentId);
  const customerName = cleanText(context?.customer?.displayName, 200);
  if (!jobId || !documentId || !customerName) return null;
  return Object.freeze({
    jobId,
    documentId,
    customerName,
  });
}
