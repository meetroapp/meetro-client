function normalizedText(value) {
  return String(value ?? "").trim();
}

export function getEmployeeWorkspaceAuthorityKey(membership = {}) {
  const permissions = Array.isArray(membership?.permissions)
    ? membership.permissions.map(normalizedText).filter(Boolean).sort()
    : [];
  return JSON.stringify([
    normalizedText(membership?.id),
    normalizedText(membership?.userId),
    normalizedText(membership?.businessId),
    normalizedText(membership?.role),
    normalizedText(membership?.status),
    permissions,
  ]);
}

export function shouldReloadEmployeeWorkspace(
  previousAuthorityKey,
  nextAuthorityKey
) {
  const next = normalizedText(nextAuthorityKey);
  return Boolean(next && normalizedText(previousAuthorityKey) !== next);
}

export function shouldBlockForEmployeeWorkspaceLoad(
  loadedAuthorityKey,
  requestedAuthorityKey
) {
  return shouldReloadEmployeeWorkspace(
    loadedAuthorityKey,
    requestedAuthorityKey
  );
}
