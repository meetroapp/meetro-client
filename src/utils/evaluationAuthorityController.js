import {
  buildCanonicalEvaluationContent,
  getCanonicalEvaluationSourceContext,
} from "./canonicalEvaluation.js";
import {
  EvaluationApiError,
  completeEvaluation,
  createEvaluation,
  createEvaluationIdempotencyKey,
  listEvaluationsForEmergencyRequest,
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
  const evaluations = await listEvaluationsForEmergencyRequest({
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
  const content = buildCanonicalEvaluationContent(form);
  const confirmed =
    currentEvaluation ||
    (await loadCanonicalEvaluationForRecord({ record, setPage }));
  if (!confirmed) {
    return createEvaluation({
      sourceContext,
      content,
      idempotencyKey: createIdempotencyKey("create"),
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
