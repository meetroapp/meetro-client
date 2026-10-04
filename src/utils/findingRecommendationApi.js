import { authFetch } from "./authFetch.js";
import {
  validateCanonicalFindingProjection,
  validateCanonicalFindings,
  validateCanonicalRecommendationProjection,
  validateCanonicalRecommendations,
} from "./canonicalFindingRecommendation.js";

export class CanonicalLifecycleReadError extends Error {
  constructor({
    status = 500,
    code = "CANONICAL_LIFECYCLE_READ_FAILED",
    message = "Canonical lifecycle detail could not be loaded.",
  } = {}) {
    super(message);
    this.name = "CanonicalLifecycleReadError";
    this.status = status;
    this.code = code;
  }
}

export class CanonicalLifecycleCommandError extends Error {
  constructor({
    status = 500,
    code = "CANONICAL_LIFECYCLE_COMMAND_FAILED",
    message = "The project assessment could not be updated.",
  } = {}) {
    super(message);
    this.name = "CanonicalLifecycleCommandError";
    this.status = status;
    this.code = code;
  }
}

export function createLifecycleCommandKey(command, cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider || typeof cryptoProvider.randomUUID !== "function") {
    throw new CanonicalLifecycleCommandError({
      code: "LIFECYCLE_IDEMPOTENCY_UNAVAILABLE",
      message: "Project assessment updates are unavailable on this device.",
    });
  }
  return `efr:${command}:${cryptoProvider.randomUUID()}`;
}

async function requestCanonicalList({ endpoint, field, validate, setPage }) {
  const { response, data } = await authFetch(endpoint, { method: "GET" }, setPage);
  if (!response.ok || data?.success !== true || !Array.isArray(data[field])) {
    throw new CanonicalLifecycleReadError({
      status: response.status,
      code: data?.code,
      message: data?.message,
    });
  }
  const projection = validate(data[field]);
  if (!projection) {
    throw new CanonicalLifecycleReadError({
      status: 502,
      code: "INVALID_CANONICAL_LIFECYCLE_RESPONSE",
      message: "The server returned invalid canonical lifecycle detail.",
    });
  }
  return projection;
}

async function requestCanonicalCommand({
  endpoint,
  method,
  body,
  field,
  validate,
  idempotencyKey,
  setPage,
}) {
  if (
    typeof idempotencyKey !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(idempotencyKey.trim())
  ) {
    throw new CanonicalLifecycleCommandError({
      status: 400,
      code: "INVALID_LIFECYCLE_IDEMPOTENCY_KEY",
      message: "A valid project assessment retry key is required.",
    });
  }
  const { response, data } = await authFetch(
    endpoint,
    {
      method,
      headers: { "Idempotency-Key": idempotencyKey.trim() },
      body: JSON.stringify(body),
    },
    setPage
  );
  if (!response.ok || data?.success !== true) {
    throw new CanonicalLifecycleCommandError({
      status: response.status,
      code: data?.code,
      message: data?.message,
    });
  }
  const projection = validate(data?.[field]);
  if (!projection) {
    throw new CanonicalLifecycleCommandError({
      status: 502,
      code: "INVALID_CANONICAL_LIFECYCLE_RESPONSE",
      message: "The server returned invalid project assessment detail.",
    });
  }
  return projection;
}

export function listCanonicalFindingsForEvaluation({
  evaluationId,
  setPage,
}) {
  return requestCanonicalList({
    endpoint: `/evaluations/${encodeURIComponent(evaluationId)}/findings`,
    field: "findings",
    validate: (findings) =>
      validateCanonicalFindings(findings, { evaluationId }),
    setPage,
  });
}

export function listCanonicalRecommendationsForFinding({ finding, setPage }) {
  return requestCanonicalList({
    endpoint: `/findings/${encodeURIComponent(finding.id)}/recommendations`,
    field: "recommendations",
    validate: (recommendations) =>
      validateCanonicalRecommendations(recommendations, { finding }),
    setPage,
  });
}

export function submitCanonicalFinding({
  evaluationId,
  statement,
  customerVisible,
  idempotencyKey,
  setPage,
}) {
  return requestCanonicalCommand({
    endpoint: `/evaluations/${encodeURIComponent(evaluationId)}/findings`,
    method: "POST",
    body: { statement, customerVisible },
    field: "finding",
    validate: validateCanonicalFindingProjection,
    idempotencyKey,
    setPage,
  });
}

export function updateCanonicalFinding({
  findingId,
  expectedVersion,
  statement,
  customerVisible,
  idempotencyKey,
  setPage,
}) {
  return requestCanonicalCommand({
    endpoint: `/findings/${encodeURIComponent(findingId)}`,
    method: "PATCH",
    body: { expectedVersion, statement, customerVisible },
    field: "finding",
    validate: validateCanonicalFindingProjection,
    idempotencyKey,
    setPage,
  });
}

export function confirmCanonicalFinding({
  findingId,
  expectedVersion,
  idempotencyKey,
  setPage,
}) {
  return requestCanonicalCommand({
    endpoint: `/findings/${encodeURIComponent(findingId)}/confirm`,
    method: "POST",
    body: { expectedVersion },
    field: "finding",
    validate: validateCanonicalFindingProjection,
    idempotencyKey,
    setPage,
  });
}

export function createCanonicalRecommendation({
  findingId,
  statement,
  customerVisible,
  idempotencyKey,
  setPage,
}) {
  return requestCanonicalCommand({
    endpoint: `/findings/${encodeURIComponent(findingId)}/recommendations`,
    method: "POST",
    body: { kind: "PRIMARY", statement, customerVisible },
    field: "recommendation",
    validate: validateCanonicalRecommendationProjection,
    idempotencyKey,
    setPage,
  });
}

export function updateCanonicalRecommendation({
  recommendationId,
  expectedVersion,
  statement,
  customerVisible,
  idempotencyKey,
  setPage,
}) {
  return requestCanonicalCommand({
    endpoint: `/recommendations/${encodeURIComponent(recommendationId)}`,
    method: "PATCH",
    body: { expectedVersion, statement, customerVisible },
    field: "recommendation",
    validate: validateCanonicalRecommendationProjection,
    idempotencyKey,
    setPage,
  });
}
