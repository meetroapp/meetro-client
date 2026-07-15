function normalizeIdentityValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isRequestOwnedByAuthenticatedUser(
  request = {},
  authenticatedUser = {}
) {
  const activeUserId = normalizeIdentityValue(authenticatedUser.id);
  const requestUserId = normalizeIdentityValue(
    request.user_id ||
      request.userId ||
      request.ownerUserId ||
      request.createdByUserId
  );

  if (activeUserId) {
    return Boolean(requestUserId && requestUserId === activeUserId);
  }

  const activeEmail = normalizeIdentityValue(authenticatedUser.email);
  const requestEmail = normalizeIdentityValue(
    request.email || request.user_email || request.ownerEmail || request.createdByEmail
  );

  return Boolean(activeEmail && requestEmail && requestEmail === activeEmail);
}
