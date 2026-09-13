const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const positive = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
export function authorityKeys(value, keys) {
  return Object.hasOwn(value || {}, 'authority') ? [...keys, 'authority'] : keys;
}
export function validJobAuthority(value) {
  if (!Object.hasOwn(value || {}, 'authority')) return positive(value?.requestId) && positive(value?.relationshipId);
  const a=value.authority;
  return value.requestId === null && value.relationshipId === null && a &&
    Object.keys(a).length===4 && a.kind==='BUSINESS_CUSTOMER' && positive(a.contractorProfileId) &&
    UUID.test(a.businessContactId) && UUID.test(a.customerRelationshipId);
}
export function jobAuthorityFields(value) {
  return value.authority ? {authority:Object.freeze({...value.authority})} : {};
}
export function invoiceAuthorityMatchesParty(value) {
  if (!value.authority) return true;
  const a=value.authority,p=value.customerParty;
  return p && p.contractorProfileId===a.contractorProfileId &&
    p.businessContactId===a.businessContactId && p.customerRelationshipId===a.customerRelationshipId;
}
