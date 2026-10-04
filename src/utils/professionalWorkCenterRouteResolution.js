import { parseProfessionalWorkCenterRoute } from "./professionalWorkCenterRoute.js";
import { findCanonicalWorkCenterEntryByJobId } from "./workCenterCanonicalHydration.js";
import { resolveWorkCenterLifecyclePresentation } from "./workCenterLifecyclePresentation.js";

// Discovery supplies active cards, not the authority for an exact History read.
export function resolveProfessionalWorkCenterRoute({ route = "", sourceState = {} } = {}) {
  const location = String(route).replace(/^#/, "");
  if (!location.startsWith("workCenter?")) return { kind: "list", target: null };
  const target = parseProfessionalWorkCenterRoute(location);
  if (!target) return { kind: "unavailable", target: null };
  if (sourceState.status === "loading") return { kind: "loading", target };
  const entry = findCanonicalWorkCenterEntryByJobId(sourceState.entries, target.jobId);
  const completed = entry && resolveWorkCenterLifecyclePresentation({
    liveJob: entry.liveJob,
    sourceType: entry.sourceType,
  }).canonicalJobCompleted;
  if (entry && !completed && sourceState.status === "ready") {
    return { kind: "active", target, entry };
  }
  // The authenticated, exact-ID History reader must confirm completion/ownership.
  // Missing discovery entries never select another card or a cached reference.
  return { kind: "history", target };
}
