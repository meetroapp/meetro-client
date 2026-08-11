import { authFetch } from "./authFetch.js";
import {
  validateCanonicalActivities,
  validateCanonicalCompletionEligibility,
  validateCanonicalObligations,
  validateCanonicalWorkstreams,
} from "./canonicalOperationalRead.js";

export class CanonicalOperationalReadError extends Error {
  constructor({
    status = 500,
    code = "CANONICAL_OPERATIONAL_READ_FAILED",
    message = "Canonical operational detail could not be loaded.",
  } = {}) {
    super(message);
    this.name = "CanonicalOperationalReadError";
    this.status = status;
    this.code = code;
  }
}

function invalidResponse() {
  return new CanonicalOperationalReadError({
    status: 502,
    code: "INVALID_CANONICAL_OPERATIONAL_RESPONSE",
    message: "The server returned invalid canonical operational detail.",
  });
}

async function requestCanonicalProjection({
  endpoint,
  field,
  validate,
  setPage,
}) {
  const { response, data } = await authFetch(endpoint, { method: "GET" }, setPage);
  if (!response.ok || data?.success !== true || !(field in data)) {
    throw new CanonicalOperationalReadError({
      status: response.status,
      code: data?.code,
      message: data?.message,
    });
  }
  const projection = validate(data[field]);
  if (!projection) throw invalidResponse();
  return projection;
}

export function listCanonicalWorkstreamsForJob({ jobId, setPage }) {
  return requestCanonicalProjection({
    endpoint: `/jobs/${encodeURIComponent(jobId)}/workstreams`,
    field: "workstreams",
    validate: (workstreams) => validateCanonicalWorkstreams(workstreams, { jobId }),
    setPage,
  });
}

export function listCanonicalActivitiesForWorkstream({
  jobId,
  workstreamId,
  setPage,
}) {
  return requestCanonicalProjection({
    endpoint: `/jobs/${encodeURIComponent(jobId)}/workstreams/${encodeURIComponent(workstreamId)}/activities`,
    field: "activities",
    validate: (activities) =>
      validateCanonicalActivities(activities, { jobId, workstreamId }),
    setPage,
  });
}

export function listCanonicalObligationsForWorkstream({
  jobId,
  workstreamId,
  setPage,
}) {
  return requestCanonicalProjection({
    endpoint: `/jobs/${encodeURIComponent(jobId)}/workstreams/${encodeURIComponent(workstreamId)}/obligations`,
    field: "obligations",
    validate: (obligations) =>
      validateCanonicalObligations(obligations, { jobId, workstreamId }),
    setPage,
  });
}

export function getCanonicalWorkstreamCompletionEligibility({
  jobId,
  workstream,
  setPage,
}) {
  return requestCanonicalProjection({
    endpoint: `/jobs/${encodeURIComponent(jobId)}/workstreams/${encodeURIComponent(workstream.id)}/completion-eligibility`,
    field: "eligibility",
    validate: (eligibility) =>
      validateCanonicalCompletionEligibility(eligibility, {
        jobId,
        workstream,
      }),
    setPage,
  });
}
