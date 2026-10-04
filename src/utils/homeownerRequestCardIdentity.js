export function normalizeHomeownerRequestCardId(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function getHomeownerRequestCardId(request = {}) {
  return normalizeHomeownerRequestCardId(request.requestId ?? request.id);
}

export function resolveHomeownerRequestById(requests = [], requestId = "") {
  const normalizedId = normalizeHomeownerRequestCardId(requestId);
  if (!normalizedId || !Array.isArray(requests)) return null;

  return (
    requests.find(
      (request) => getHomeownerRequestCardId(request) === normalizedId
    ) || null
  );
}

export function toggleExpandedHomeownerRequestId(currentId, requestId) {
  const normalizedCurrentId = normalizeHomeownerRequestCardId(currentId);
  const normalizedRequestId = normalizeHomeownerRequestCardId(requestId);
  if (!normalizedRequestId) return null;
  return normalizedCurrentId === normalizedRequestId ? null : normalizedRequestId;
}

export function reconcileExpandedHomeownerRequestId(requests, requestId) {
  const normalizedId = normalizeHomeownerRequestCardId(requestId);
  return resolveHomeownerRequestById(requests, normalizedId)
    ? normalizedId
    : null;
}
