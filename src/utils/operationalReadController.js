import {
  getCanonicalOperationalJobContext,
  validateCanonicalWorkstreamProjection,
} from "./canonicalOperationalRead.js";
import {
  getCanonicalWorkstreamCompletionEligibility,
  listCanonicalActivitiesForWorkstream,
  listCanonicalObligationsForWorkstream,
  listCanonicalWorkstreamsForJob,
} from "./operationalReadApi.js";

function canonicalScope({ record, workstream }) {
  const context = getCanonicalOperationalJobContext(record);
  const canonicalWorkstream = validateCanonicalWorkstreamProjection(workstream);
  if (!context || !canonicalWorkstream || canonicalWorkstream.jobId !== context.jobId) {
    return null;
  }
  return { context, workstream: canonicalWorkstream };
}

export async function loadCanonicalWorkstreamsForRecord({ record, setPage }) {
  const context = getCanonicalOperationalJobContext(record);
  if (!context) return null;
  return listCanonicalWorkstreamsForJob({ jobId: context.jobId, setPage });
}

export async function loadCanonicalActivitiesForWorkstream({
  record,
  workstream,
  setPage,
}) {
  const scope = canonicalScope({ record, workstream });
  if (!scope) return null;
  return listCanonicalActivitiesForWorkstream({
    jobId: scope.context.jobId,
    workstreamId: scope.workstream.id,
    setPage,
  });
}

export async function loadCanonicalObligationsForWorkstream({
  record,
  workstream,
  setPage,
}) {
  const scope = canonicalScope({ record, workstream });
  if (!scope) return null;
  return listCanonicalObligationsForWorkstream({
    jobId: scope.context.jobId,
    workstreamId: scope.workstream.id,
    setPage,
  });
}

export async function loadCanonicalWorkstreamCompletionEligibility({
  record,
  workstream,
  setPage,
}) {
  const scope = canonicalScope({ record, workstream });
  if (!scope) return null;
  return getCanonicalWorkstreamCompletionEligibility({
    jobId: scope.context.jobId,
    workstream: scope.workstream,
    setPage,
  });
}
