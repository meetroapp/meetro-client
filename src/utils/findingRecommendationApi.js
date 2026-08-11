import { authFetch } from "./authFetch.js";
import {
  validateCanonicalFindings,
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
