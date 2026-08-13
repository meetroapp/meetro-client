import { loadCanonicalEvaluationForRecord } from "./evaluationAuthorityController.js";
import { loadCanonicalQuotesForRecord } from "./quoteReadController.js";
import {
  fetchCanonicalVisitAuthority,
  fetchCanonicalVisitDetail,
  fetchCanonicalVisits,
} from "./canonicalVisitProjection.js";
import { getCanonicalQuoteJobContext } from "./canonicalQuoteRead.js";

function visitErrorMessage(error) {
  if (error?.status === 401) return "Sign in is required to read Visit scheduling.";
  if (error?.status === 403) {
    return "Visit authority is not available for this professional account.";
  }
  if (error?.status === 404) {
    return "Canonical Visit authority is not available for this Job subject.";
  }
  return error?.message || "Canonical Visit scheduling could not be loaded.";
}

async function loadVisitDetails({
  jobId,
  purpose,
  evaluationId,
  visits,
  setPage,
  fetchDetail,
}) {
  return Promise.all(
    visits.map((visit) =>
      fetchDetail({
        jobId,
        visitId: visit.id,
        purpose,
        evaluationId,
        setPage,
      })
    )
  );
}

async function loadSubject({
  jobId,
  purpose,
  subjectId,
  quote = null,
  setPage,
  fetchAuthority,
  fetchVisits,
  fetchDetail,
}) {
  try {
    const authority = await fetchAuthority({
      jobId,
      purpose,
      subjectId,
      setPage,
    });
    if (authority.state !== "ACTIVE") {
      return {
        status: "ready",
        purpose,
        subjectId,
        quote,
        authority,
        visits: [],
        error: "",
      };
    }
    const visits = await fetchVisits({
      jobId,
      purpose,
      evaluationId: purpose === "EVALUATION" ? subjectId : null,
      approvedQuoteDecisionId:
        purpose === "APPROVED_WORK"
          ? authority.approvedQuoteDecisionId
          : null,
      setPage,
    });
    const details = await loadVisitDetails({
      jobId,
      purpose,
      evaluationId: purpose === "EVALUATION" ? subjectId : null,
      visits,
      setPage,
      fetchDetail,
    });
    return {
      status: "ready",
      purpose,
      subjectId,
      quote,
      authority,
      visits: details,
      error: "",
    };
  } catch (error) {
    return {
      status: "error",
      purpose,
      subjectId,
      quote,
      authority: null,
      visits: [],
      error: visitErrorMessage(error),
      errorCode: error?.code || "CANONICAL_VISIT_LOAD_FAILED",
    };
  }
}

export async function loadCanonicalVisitWorkspace({
  record,
  setPage,
  dependencies = {},
} = {}) {
  const context = getCanonicalQuoteJobContext(record);
  if (!context) {
    return {
      status: "unavailable",
      jobId: null,
      evaluation: null,
      approvedWork: [],
      quoteDecisionSummary: { pending: 0, declined: 0 },
      error: "Canonical Visit scheduling is unavailable for this Job.",
    };
  }
  const loadEvaluation =
    dependencies.loadEvaluation || loadCanonicalEvaluationForRecord;
  const loadQuotes = dependencies.loadQuotes || loadCanonicalQuotesForRecord;
  const fetchAuthority =
    dependencies.fetchAuthority || fetchCanonicalVisitAuthority;
  const fetchVisits = dependencies.fetchVisits || fetchCanonicalVisits;
  const fetchDetail = dependencies.fetchDetail || fetchCanonicalVisitDetail;

  try {
    const [evaluationResult, quoteResult] = await Promise.allSettled([
      loadEvaluation({ record, setPage }),
      loadQuotes({ record, setPage }),
    ]);
    if (evaluationResult.status === "rejected" && quoteResult.status === "rejected") {
      throw evaluationResult.reason;
    }
    const evaluation =
      evaluationResult.status === "fulfilled" ? evaluationResult.value : null;
    const quotes =
      quoteResult.status === "fulfilled" && Array.isArray(quoteResult.value)
        ? quoteResult.value
        : [];
    const approvedQuotes = quotes.filter(
      (quote) => quote.status === "ISSUED" && quote.decisionState === "APPROVED"
    );
    const quoteDecisionSummary = {
      pending: quotes.filter(
        (quote) => quote.status === "ISSUED" && quote.decisionState == null
      ).length,
      declined: quotes.filter(
        (quote) => quote.status === "ISSUED" && quote.decisionState === "DECLINED"
      ).length,
    };

    const [evaluationSubject, approvedWork] = await Promise.all([
      evaluation?.evaluation?.id
        ? loadSubject({
            jobId: context.jobId,
            purpose: "EVALUATION",
            subjectId: evaluation.evaluation.id,
            setPage,
            fetchAuthority,
            fetchVisits,
            fetchDetail,
          })
        : Promise.resolve(null),
      Promise.all(
        approvedQuotes.map((quote) =>
          loadSubject({
            jobId: context.jobId,
            purpose: "APPROVED_WORK",
            subjectId: quote.id,
            quote,
            setPage,
            fetchAuthority,
            fetchVisits,
            fetchDetail,
          })
        )
      ),
    ]);

    return {
      status: "ready",
      jobId: context.jobId,
      evaluation: evaluationSubject,
      approvedWork,
      quoteDecisionSummary,
      error:
        evaluationResult.status === "rejected" || quoteResult.status === "rejected"
          ? "Some canonical Visit subjects could not be loaded."
          : "",
    };
  } catch (error) {
    return {
      status: "error",
      jobId: context.jobId,
      evaluation: null,
      approvedWork: [],
      quoteDecisionSummary: { pending: 0, declined: 0 },
      error: visitErrorMessage(error),
    };
  }
}

export { visitErrorMessage as getCanonicalVisitErrorMessage };
