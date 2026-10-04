export const EVALUATION_VISIT_HANDOFF_EVENT =
  "meetro-open-started-evaluation-workspace";

const EVALUATION_VISIT_HANDOFF_STORAGE_KEY =
  "meetroPendingStartedEvaluationWorkspace";

const ALLOWED_SOURCES = new Set([
  "conversation",
  "job-overview",
  "professional-schedule",
]);

function nonEmpty(value) {
  return String(value || "").trim();
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function getWindow(candidate) {
  if (candidate) return candidate;
  return typeof window === "undefined" ? null : window;
}

function getSessionStorage(candidateWindow) {
  try {
    return candidateWindow?.sessionStorage || null;
  } catch {
    return null;
  }
}

export function createEvaluationVisitHandoff({ jobId, visit, source }) {
  const canonicalJobId = nonEmpty(jobId);
  const visitId = nonEmpty(visit?.id);
  const currentVersion = positiveInteger(visit?.currentVersion);
  const canonicalSource = nonEmpty(source);
  if (
    !canonicalJobId ||
    !visitId ||
    !currentVersion ||
    visit?.state !== "STARTED" ||
    visit?.purpose !== "EVALUATION" ||
    !ALLOWED_SOURCES.has(canonicalSource)
  ) {
    return null;
  }

  return Object.freeze({
    jobId: canonicalJobId,
    visitId,
    currentVersion,
    state: "STARTED",
    purpose: "EVALUATION",
    source: canonicalSource,
    token: `${canonicalJobId}:${visitId}:${currentVersion}`,
  });
}

export function normalizeEvaluationVisitHandoff(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return createEvaluationVisitHandoff({
    jobId: value.jobId,
    visit: {
      id: value.visitId,
      currentVersion: value.currentVersion,
      state: value.state,
      purpose: value.purpose,
    },
    source: value.source,
  });
}

export function requestEvaluationVisitHandoff(
  input,
  { windowObject } = {}
) {
  const intent = createEvaluationVisitHandoff(input);
  const targetWindow = getWindow(windowObject);
  if (!intent || !targetWindow) return null;

  const storage = getSessionStorage(targetWindow);
  try {
    storage?.setItem(
      EVALUATION_VISIT_HANDOFF_STORAGE_KEY,
      JSON.stringify(intent)
    );
  } catch {
    // The same-page event still provides a safe handoff when storage is blocked.
  }

  targetWindow.dispatchEvent(
    new targetWindow.CustomEvent(EVALUATION_VISIT_HANDOFF_EVENT, {
      detail: intent,
    })
  );
  return intent;
}

export function readPendingEvaluationVisitHandoff({ windowObject } = {}) {
  const targetWindow = getWindow(windowObject);
  const storage = getSessionStorage(targetWindow);
  if (!storage) return null;
  try {
    return normalizeEvaluationVisitHandoff(
      JSON.parse(storage.getItem(EVALUATION_VISIT_HANDOFF_STORAGE_KEY) || "null")
    );
  } catch {
    return null;
  }
}

export function clearPendingEvaluationVisitHandoff({ windowObject } = {}) {
  const targetWindow = getWindow(windowObject);
  const storage = getSessionStorage(targetWindow);
  try {
    storage?.removeItem(EVALUATION_VISIT_HANDOFF_STORAGE_KEY);
  } catch {
    // Nothing else is required after an in-memory handoff has been consumed.
  }
}
