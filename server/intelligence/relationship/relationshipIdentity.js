function text(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

export function getRelationshipParties(record = {}, user = {}) {
  const accountType = text(user.accountType || user.role).toLowerCase();
  const professionalId = text(record.professionalId || record.providerId || record.contractorId || (accountType === "professional" ? user.id || user.userId : ""));
  const customerId = text(record.customerId || record.homeownerId || record.customerAccountId || (accountType !== "professional" ? user.id || user.userId : ""));
  const businessId = text(record.businessId || record.companyId || user.businessId || user.activeBusinessId);
  return { professionalId, customerId, businessId };
}

export function partiesAgree(left = {}, right = {}) {
  return ["professionalId", "customerId", "businessId"].every(
    (field) => !left[field] || !right[field] || left[field] === right[field]
  );
}

export function hasStableParty(parties = {}) {
  return Boolean(parties.customerId && (parties.businessId || parties.professionalId));
}
