export const MANUAL_CUSTOMER_TYPES = Object.freeze([
  "manual",
  "external",
]);

export const MANUAL_CUSTOMER_ACCOUNT_LINK_STATUSES = Object.freeze([
  "unlinked",
  "invited",
  "linked",
  "revoked",
]);

export const MANUAL_CUSTOMER_CONSENT_STATUSES = Object.freeze([
  "unknown",
  "granted",
  "denied",
  "revoked",
]);

export const MANUAL_CUSTOMER_CONTACT_TYPES = Object.freeze([
  "phone",
  "email",
  "sms",
  "in_person",
  "other",
]);

export const MANUAL_CUSTOMER_REQUIRED_FIELDS = Object.freeze([
  "manualCustomerId",
  "customerType",
  "displayName",
  "owningBusinessId",
  "createdByUserId",
  "source",
  "createdAt",
  "accountLinkStatus",
]);

export const MANUAL_PROJECT_REQUIRED_FIELDS = Object.freeze([
  "projectId",
  "manualCustomerId",
  "professionalUserId",
  "participantRole",
  "workflowType",
  "projectSource",
  "createdAt",
  "status",
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      cloneValue(nestedValue),
    ])
  );
}

function stringValue(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

// These constructors shape caller-supplied context only. They never generate
// production identity, timestamps, links, consent, or persistence records.
export function createManualCustomerContext(input = {}) {
  const source = isRecord(input) ? input : {};

  return {
    manualCustomerId: stringValue(source.manualCustomerId),
    customerType: stringValue(source.customerType),
    displayName: stringValue(source.displayName),
    owningBusinessId: stringValue(source.owningBusinessId),
    createdByUserId: stringValue(source.createdByUserId),
    source: stringValue(source.source),
    createdAt: stringValue(source.createdAt),
    contactMethods: Array.isArray(source.contactMethods)
      ? cloneValue(source.contactMethods)
      : [],
    consent: isRecord(source.consent) ? cloneValue(source.consent) : {},
    accountLinkStatus: stringValue(source.accountLinkStatus),
    linkedUserId: stringValue(source.linkedUserId),
    metadata: isRecord(source.metadata) ? cloneValue(source.metadata) : {},
  };
}

export function createManualProjectContext(input = {}) {
  const source = isRecord(input) ? input : {};

  return {
    projectId: stringValue(source.projectId),
    manualCustomerId: stringValue(source.manualCustomerId),
    professionalUserId: stringValue(source.professionalUserId),
    participantRole: stringValue(source.participantRole),
    workflowType: stringValue(source.workflowType),
    projectSource: stringValue(source.projectSource),
    createdAt: stringValue(source.createdAt),
    status: stringValue(source.status),
    metadata: isRecord(source.metadata) ? cloneValue(source.metadata) : {},
  };
}

