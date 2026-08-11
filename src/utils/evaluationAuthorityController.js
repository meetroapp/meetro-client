import {
  buildCanonicalEvaluationContent,
  buildOrdinaryCanonicalEvaluationContent,
  getCanonicalEvaluationSourceContext,
} from "./canonicalEvaluation.js";
import {
  EvaluationApiError,
  completeEvaluation,
  createEvaluation,
  createOrdinaryJobEvaluation,
  createEvaluationIdempotencyKey,
  listEvaluationsForEmergencyRequest,
  listEvaluationsForJob,
  updateEvaluationDraft,
} from "./evaluationApi.js";

function hasBrowserMedia(form = {}) {
  if (Array.isArray(form.photos) && form.photos.length > 0) return true;
  return (Array.isArray(form.workItems) ? form.workItems : []).some(
    (item) => Array.isArray(item?.photos) && item.photos.length > 0
  );
}

function requireCanonicalContext(record) {
  const sourceContext = getCanonicalEvaluationSourceContext(record);
  if (!sourceContext) {
    throw new EvaluationApiError({
      status: 409,
      code: "EVALUATION_SOURCE_UNAVAILABLE",
      message: "Canonical Evaluation authority is unavailable for this work record.",
    });
  }
  return sourceContext;
}

export async function loadCanonicalEvaluationForRecord({ record, setPage }) {
  const sourceContext = requireCanonicalContext(record);
  const evaluations =
    sourceContext.type === "ordinary_job"
      ? await listEvaluationsForJob({
          jobId: sourceContext.jobId,
          setPage,
        })
      : await listEvaluationsForEmergencyRequest({
          emergencyRequestId: sourceContext.emergencyRequestId,
          setPage,
        });
  return evaluations[0] || null;
}

export async function saveCanonicalEvaluationDraft({
  record,
  form,
  currentEvaluation = null,
  setPage,
  createIdempotencyKey = createEvaluationIdempotencyKey,
}) {
  const sourceContext = requireCanonicalContext(record);
  if (hasBrowserMedia(form)) {
    throw new EvaluationApiError({
      status: 409,
      code: "EVALUATION_MEDIA_UNSUPPORTED",
      message: "Supporting Evaluation media is not available for canonical saving yet.",
    });
  }
  const confirmed =
    currentEvaluation ||
    (await loadCanonicalEvaluationForRecord({ record, setPage }));
  const content =
    sourceContext.type === "ordinary_job"
      ? buildOrdinaryCanonicalEvaluationContent(
          form,
          confirmed?.evaluation?.content
        )
      : buildCanonicalEvaluationContent(form);
  if (!confirmed) {
    const idempotencyKey = createIdempotencyKey("create");
    return sourceContext.type === "ordinary_job"
      ? createOrdinaryJobEvaluation({
          jobId: sourceContext.jobId,
          content,
          idempotencyKey,
          setPage,
        })
      : createEvaluation({
          sourceContext,
          content,
          idempotencyKey,
          setPage,
        });
  }
  if (confirmed.evaluation.status !== "draft") {
    throw new EvaluationApiError({
      status: 409,
      code: "EVALUATION_COMPLETED",
      message: "A completed Evaluation cannot be edited or reopened.",
    });
  }
  return updateEvaluationDraft({
    evaluationId: confirmed.evaluation.id,
    expectedVersion: confirmed.aggregate.version,
    content,
    idempotencyKey: createIdempotencyKey("update"),
    setPage,
  });
}

export async function completeCanonicalEvaluationDraft({
  record,
  form,
  currentEvaluation = null,
  setPage,
  createIdempotencyKey = createEvaluationIdempotencyKey,
}) {
  const saved = await saveCanonicalEvaluationDraft({
    record,
    form,
    currentEvaluation,
    setPage,
    createIdempotencyKey,
  });
  return completeEvaluation({
    evaluationId: saved.evaluation.id,
    expectedVersion: saved.aggregate.version,
    idempotencyKey: createIdempotencyKey("complete"),
    setPage,
  });
}

export function isCanonicalQuoteCreationAvailable() {
  return false;
}
