import { authFetch } from "./authFetch.js";
import { validateCanonicalEvaluationProjection } from "./canonicalEvaluation.js";

export class EvaluationApiError extends Error {
  constructor({ status = 500, code = "EVALUATION_FAILED", message = "The Evaluation could not be completed." } = {}) {
    super(message);
    this.name = "EvaluationApiError";
    this.status = status;
    this.code = code;
  }
}

function validIdempotencyKey(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(value.trim());
}

export function createEvaluationIdempotencyKey(command, cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider || typeof cryptoProvider.randomUUID !== "function") {
    throw new EvaluationApiError({
      status: 500,
      code: "EVALUATION_IDEMPOTENCY_UNAVAILABLE",
      message: "Evaluation saving is unavailable on this device.",
    });
  }
  return `evaluation:${command}:${cryptoProvider.randomUUID()}`;
}

async function requestEvaluation(endpoint, options, setPage) {
  const { response, data } = await authFetch(endpoint, options, setPage);
  if (!response.ok || data?.success !== true) {
    throw new EvaluationApiError({
      status: response.status,
      code: data?.code,
      message: data?.message,
    });
  }
  const evaluation = validateCanonicalEvaluationProjection(data);
  if (!evaluation) {
    throw new EvaluationApiError({
      status: 502,
      code: "INVALID_EVALUATION_RESPONSE",
      message: "The server returned an invalid Evaluation response.",
    });
  }
  return evaluation;
}

function mutationHeaders(idempotencyKey) {
  if (!validIdempotencyKey(idempotencyKey)) {
    throw new EvaluationApiError({
      status: 400,
      code: "INVALID_EVALUATION_IDEMPOTENCY_KEY",
      message: "A valid Evaluation retry key is required.",
    });
  }
  return { "Idempotency-Key": idempotencyKey.trim() };
}

export function createEvaluation({ sourceContext, content, idempotencyKey, setPage }) {
  return requestEvaluation(
    "/evaluations",
    {
      method: "POST",
      headers: mutationHeaders(idempotencyKey),
      body: JSON.stringify({ sourceContext, content, expectedVersion: 0 }),
    },
    setPage
  );
}

export function createOrdinaryJobEvaluation({
  jobId,
  content,
  idempotencyKey,
  setPage,
}) {
  return requestEvaluation(
    `/jobs/${encodeURIComponent(jobId)}/evaluations`,
    {
      method: "POST",
      headers: mutationHeaders(idempotencyKey),
      body: JSON.stringify({ content, expectedVersion: 0 }),
    },
    setPage
  );
}

export function updateEvaluationDraft({ evaluationId, expectedVersion, content, idempotencyKey, setPage }) {
  return requestEvaluation(
    `/evaluations/${encodeURIComponent(evaluationId)}`,
    {
      method: "PATCH",
      headers: mutationHeaders(idempotencyKey),
      body: JSON.stringify({ expectedVersion, content }),
    },
    setPage
  );
}

export function completeEvaluation({ evaluationId, expectedVersion, idempotencyKey, setPage }) {
  return requestEvaluation(
    `/evaluations/${encodeURIComponent(evaluationId)}/complete`,
    {
      method: "POST",
      headers: mutationHeaders(idempotencyKey),
      body: JSON.stringify({ expectedVersion }),
    },
    setPage
  );
}

export function getEvaluation({ evaluationId, setPage }) {
  return requestEvaluation(
    `/evaluations/${encodeURIComponent(evaluationId)}`,
    { method: "GET" },
    setPage
  );
}

export async function listEvaluationsForEmergencyRequest({ emergencyRequestId, setPage }) {
  return listEvaluations(
    `/emergency-requests/${encodeURIComponent(emergencyRequestId)}/evaluations`,
    setPage
  );
}

async function listEvaluations(endpoint, setPage) {
  const { response, data } = await authFetch(endpoint, { method: "GET" }, setPage);
  if (!response.ok || data?.success !== true || !Array.isArray(data.evaluations)) {
    throw new EvaluationApiError({
      status: response.status,
      code: data?.code,
      message: data?.message,
    });
  }
  const evaluations = data.evaluations.map(validateCanonicalEvaluationProjection);
  if (evaluations.some((evaluation) => !evaluation)) {
    throw new EvaluationApiError({
      status: 502,
      code: "INVALID_EVALUATION_RESPONSE",
      message: "The server returned an invalid Evaluation response.",
    });
  }
  return evaluations;
}

export async function listEvaluationsForJob({ jobId, setPage }) {
  return listEvaluations(
    `/jobs/${encodeURIComponent(jobId)}/evaluations`,
    setPage
  );
}
