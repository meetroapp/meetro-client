import { authFetch } from "./authFetch.js";

export const BUSINESS_CONTACT_PARTY_TYPES = Object.freeze([
  "PERSON",
  "ORGANIZATION",
]);

export const BUSINESS_CONTACT_ROLES = Object.freeze([
  "CUSTOMER",
  "PROFESSIONAL_VENDOR",
  "EMPLOYEE",
  "TENANT",
  "PROPERTY_MANAGER",
]);

export const BUSINESS_CONTACT_ROLE_BY_TYPE = Object.freeze({
  customer: "CUSTOMER",
  professional: "PROFESSIONAL_VENDOR",
  vendor: "PROFESSIONAL_VENDOR",
  business: "PROFESSIONAL_VENDOR",
  employee: "EMPLOYEE",
  tenant: "TENANT",
  property: "PROPERTY_MANAGER",
  propertyManager: "PROPERTY_MANAGER",
});

export const BUSINESS_CONTACT_TYPE_BY_ROLE = Object.freeze({
  CUSTOMER: "customer",
  PROFESSIONAL_VENDOR: "vendor",
  EMPLOYEE: "employee",
  TENANT: "tenant",
  PROPERTY_MANAGER: "propertyManager",
});

export const BUSINESS_CONTACT_ROLE_LABELS = Object.freeze({
  CUSTOMER: "Customer",
  PROFESSIONAL_VENDOR: "Professional / Vendor",
  EMPLOYEE: "Employee",
  TENANT: "Tenant",
  PROPERTY_MANAGER: "Property Manager",
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value) {
  return String(value ?? "").trim();
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function unique(values) {
  return [...new Set(values)];
}

function hashWords(value = "") {
  const source = text(value);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ code, 0x85ebca6b) >>> 0;
  }

  return [first, second];
}

export function createDeterministicBusinessContactKey(seed) {
  const normalized = text(seed);
  if (!normalized) throw new TypeError("A Contact retry identity seed is required.");
  const [first, second] = hashWords(normalized);
  const [third, fourth] = hashWords(`${normalized}:contact`);
  const bytes = new Uint8Array(16);
  const words = [first, second, third, fourth];

  words.forEach((word, wordIndex) => {
    for (let byteIndex = 0; byteIndex < 4; byteIndex += 1) {
      bytes[wordIndex * 4 + byteIndex] =
        (word >>> ((3 - byteIndex) * 8)) & 0xff;
    }
  });
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createBusinessContactCommandKey(cryptoProvider = globalThis.crypto) {
  const key = cryptoProvider?.randomUUID?.();
  if (!UUID_PATTERN.test(String(key || ""))) {
    throw new BusinessContactApiError({
      code: "BUSINESS_CONTACT_IDEMPOTENCY_UNAVAILABLE",
      message: "Contact saving is unavailable on this device.",
    });
  }
  return key;
}

export function getBusinessContactRoleForType(type) {
  return BUSINESS_CONTACT_ROLE_BY_TYPE[text(type)] || null;
}

export function getBusinessContactActiveRoles(contact = {}) {
  return Array.isArray(contact.roles)
    ? contact.roles
        .filter((role) => role?.active !== false && BUSINESS_CONTACT_ROLES.includes(role?.role))
        .map((role) => role.role)
    : [];
}

export function normalizeBusinessContactRoleSelection(values = []) {
  return unique(
    (Array.isArray(values) ? values : [])
      .map((value) => BUSINESS_CONTACT_ROLES.includes(value) ? value : getBusinessContactRoleForType(value))
      .filter(Boolean)
  );
}

export class BusinessContactApiError extends Error {
  constructor({
    status = 500,
    code = "BUSINESS_CONTACT_FAILED",
    message = "The Contact operation could not be completed.",
    currentVersion,
    duplicateCandidates = [],
  } = {}) {
    super(message);
    this.name = "BusinessContactApiError";
    this.status = status;
    this.code = code;
    this.currentVersion = currentVersion;
    this.duplicateCandidates = Array.isArray(duplicateCandidates)
      ? duplicateCandidates
      : [];
  }
}

async function requestBusinessContact(
  endpoint,
  options,
  { setPage, fetcher = authFetch } = {}
) {
  const result = await fetcher(endpoint, options, setPage);
  const response = result?.response || { ok: false, status: 500 };
  const data = result?.data || {};

  if (!response.ok || data.success !== true) {
    throw new BusinessContactApiError({
      status: response.status,
      code: data.code,
      message: data.message,
      currentVersion: data.currentVersion,
      duplicateCandidates: data.duplicateCandidates,
    });
  }

  return data;
}

function mutationOptions(method, payload, idempotencyKey) {
  if (!UUID_PATTERN.test(text(idempotencyKey))) {
    throw new BusinessContactApiError({
      status: 400,
      code: "BUSINESS_CONTACT_IDEMPOTENCY_REQUIRED",
      message: "A valid Contact retry identity is required.",
    });
  }

  return {
    method,
    headers: { "Idempotency-Key": text(idempotencyKey) },
    body: JSON.stringify(payload),
  };
}

export async function loadBusinessContactProfileId({ setPage, fetcher = authFetch } = {}) {
  const result = await fetcher(
    "/my-contractor-profile",
    { cache: "no-store" },
    setPage
  );
  const id = positiveInteger(result?.data?.profile?.id);

  if (!result?.response?.ok || !id) {
    throw new BusinessContactApiError({
      status: result?.response?.status || 404,
      code: "BUSINESS_CONTACT_BUSINESS_UNAVAILABLE",
      message: "Your business profile is required before saving Contacts.",
    });
  }

  return id;
}

export async function listBusinessContacts({
  contractorProfileId,
  search = "",
  status = "ALL",
  role = "",
  limit = 100,
  setPage,
  fetcher = authFetch,
} = {}) {
  const profileId = positiveInteger(contractorProfileId);
  if (!profileId) {
    throw new BusinessContactApiError({
      status: 400,
      code: "BUSINESS_CONTACT_BUSINESS_UNAVAILABLE",
      message: "Your business profile is required before loading Contacts.",
    });
  }
  const params = new URLSearchParams({
    contractorProfileId: String(profileId),
    status: text(status) || "ALL",
    limit: String(limit),
  });
  if (text(search)) params.set("search", text(search));
  if (text(role)) params.set("role", text(role));
  const data = await requestBusinessContact(
    `/business-contacts?${params.toString()}`,
    { method: "GET", cache: "no-store" },
    { setPage, fetcher }
  );

  return Array.isArray(data.contacts) ? data.contacts : [];
}

export async function createBusinessContact({
  contractorProfileId,
  partyType = "PERSON",
  displayName,
  companyName,
  email,
  phone,
  address,
  serviceArea,
  privateNote,
  idempotencyKey,
  setPage,
  fetcher = authFetch,
} = {}) {
  const payload = {
    contractorProfileId: positiveInteger(contractorProfileId),
    partyType: BUSINESS_CONTACT_PARTY_TYPES.includes(partyType) ? partyType : "PERSON",
    displayName: text(displayName),
  };
  for (const [key, value] of Object.entries({
    companyName,
    email,
    phone,
    address,
    serviceArea,
    privateNote,
  })) {
    if (value !== undefined) payload[key] = text(value) || null;
  }
  const data = await requestBusinessContact(
    "/business-contacts",
    mutationOptions("POST", payload, idempotencyKey),
    { setPage, fetcher }
  );

  return {
    contact: data.contact,
    duplicateCandidates: Array.isArray(data.duplicateCandidates)
      ? data.duplicateCandidates
      : [],
    replayed: data.replayed === true,
  };
}

export async function updateBusinessContact({
  contactId,
  expectedVersion,
  patch,
  idempotencyKey,
  setPage,
  fetcher = authFetch,
} = {}) {
  const data = await requestBusinessContact(
    `/business-contacts/${encodeURIComponent(text(contactId))}`,
    mutationOptions(
      "PATCH",
      { expectedVersion: positiveInteger(expectedVersion), ...(patch || {}) },
      idempotencyKey
    ),
    { setPage, fetcher }
  );
  return data.contact;
}

export async function assignBusinessContactRole({
  contactId,
  expectedVersion,
  role,
  idempotencyKey,
  setPage,
  fetcher = authFetch,
} = {}) {
  const data = await requestBusinessContact(
    `/business-contacts/${encodeURIComponent(text(contactId))}/roles`,
    mutationOptions(
      "POST",
      { expectedVersion: positiveInteger(expectedVersion), role },
      idempotencyKey
    ),
    { setPage, fetcher }
  );
  return data.contact;
}

export async function endBusinessContactRole({
  contactId,
  roleId,
  expectedVersion,
  idempotencyKey,
  setPage,
  fetcher = authFetch,
} = {}) {
  const data = await requestBusinessContact(
    `/business-contacts/${encodeURIComponent(text(contactId))}/roles/${encodeURIComponent(text(roleId))}/end`,
    mutationOptions(
      "POST",
      { expectedVersion: positiveInteger(expectedVersion) },
      idempotencyKey
    ),
    { setPage, fetcher }
  );
  return data.contact;
}

export async function archiveBusinessContact({
  contactId,
  expectedVersion,
  idempotencyKey,
  setPage,
  fetcher = authFetch,
} = {}) {
  const data = await requestBusinessContact(
    `/business-contacts/${encodeURIComponent(text(contactId))}/archive`,
    mutationOptions(
      "POST",
      { expectedVersion: positiveInteger(expectedVersion) },
      idempotencyKey
    ),
    { setPage, fetcher }
  );
  return data.contact;
}

export async function reconcileBusinessContactRoles({
  contact,
  desiredRoles,
  commandSeed,
  setPage,
  fetcher = authFetch,
} = {}) {
  let current = contact;
  const desired = normalizeBusinessContactRoleSelection(desiredRoles);
  const activeAssignments = Array.isArray(current?.roles)
    ? current.roles.filter((role) => role?.active !== false)
    : [];

  for (const assignment of activeAssignments) {
    if (desired.includes(assignment.role)) continue;
    current = await endBusinessContactRole({
      contactId: current.id,
      roleId: assignment.id,
      expectedVersion: current.version,
      idempotencyKey: createDeterministicBusinessContactKey(
        `${commandSeed}:end:${assignment.id}`
      ),
      setPage,
      fetcher,
    });
  }

  for (const role of desired) {
    if (getBusinessContactActiveRoles(current).includes(role)) continue;
    current = await assignBusinessContactRole({
      contactId: current.id,
      expectedVersion: current.version,
      role,
      idempotencyKey: createDeterministicBusinessContactKey(
        `${commandSeed}:assign:${role}`
      ),
      setPage,
      fetcher,
    });
  }

  return current;
}

export async function createBusinessContactWithRole({
  contact,
  role,
  idempotencyKey,
  setPage,
  fetcher = authFetch,
} = {}) {
  const created = await createBusinessContact({
    ...contact,
    idempotencyKey,
    setPage,
    fetcher,
  });
  let assigned;
  try {
    assigned = await assignBusinessContactRole({
      contactId: created.contact.id,
      expectedVersion: created.contact.version,
      role,
      idempotencyKey: createDeterministicBusinessContactKey(
        `${idempotencyKey}:assign:${role}`
      ),
      setPage,
      fetcher,
    });
  } catch (error) {
    error.createdContact = created.contact;
    error.contactSavePhase = "ROLE_ASSIGNMENT";
    throw error;
  }

  return { ...created, contact: assigned };
}

export async function importBusinessContacts({
  contractorProfileId,
  contacts,
  setPage,
  fetcher = authFetch,
} = {}) {
  const successes = [];
  const failures = [];

  for (const [index, source] of (Array.isArray(contacts) ? contacts : []).entries()) {
    const role = getBusinessContactRoleForType(source.type);
    const seed = [
      "business-contact-import",
      contractorProfileId,
      source.id || index,
      source.name,
      source.email,
      source.phone,
      source.address,
      source.type,
    ].map(text).join(":");
    const idempotencyKey = createDeterministicBusinessContactKey(seed);

    try {
      const result = await createBusinessContactWithRole({
        contact: {
          contractorProfileId,
          partyType: source.partyType === "ORGANIZATION" ? "ORGANIZATION" : "PERSON",
          displayName: text(source.name) || text(source.email) || text(source.phone),
          companyName: source.partyType === "ORGANIZATION" ? text(source.name) : undefined,
          email: source.email,
          phone: source.phone,
          address: source.address,
          privateNote: source.note,
        },
        role,
        idempotencyKey,
        setPage,
        fetcher,
      });
      successes.push({ source, ...result });
    } catch (error) {
      failures.push({
        source,
        code: error?.code || "BUSINESS_CONTACT_FAILED",
        message: error?.message || "The Contact could not be imported.",
        duplicateCandidates: error?.duplicateCandidates || [],
        createdContact: error?.createdContact || null,
        contactSavePhase: error?.contactSavePhase || "CREATE",
      });
    }
  }

  return { successes, failures };
}

export function projectBusinessContactRecord(contact = {}) {
  const activeRoles = getBusinessContactActiveRoles(contact);
  const primaryRole = activeRoles[0] || "CUSTOMER";
  const relationshipType = BUSINESS_CONTACT_TYPE_BY_ROLE[primaryRole] || "contact";
  const displayName = text(contact.displayName) || "Business Contact";
  const recordId = `business-contact-${text(contact.id)}`;

  return {
    id: recordId,
    relationshipId: recordId,
    businessContactId: text(contact.id),
    businessContactVersion: positiveInteger(contact.version),
    businessContactRoles: activeRoles,
    businessContactRoleAssignments: Array.isArray(contact.roles) ? contact.roles : [],
    businessContactPartyType: contact.partyType,
    durableBusinessContact: true,
    relationshipType,
    relationshipScope: "business",
    accountMode: "business",
    participantName: displayName,
    displayName,
    project_title: displayName,
    project_description: "Saved business Contact.",
    homeowner_email: text(contact.email),
    phone: text(contact.phone),
    email: text(contact.email),
    address: text(contact.address),
    location: text(contact.address) || text(contact.serviceArea),
    serviceArea: text(contact.serviceArea),
    privateNote: text(contact.privateNote),
    status: contact.status === "ARCHIVED" ? "Archived" : "Saved Contact",
    archived: contact.status === "ARCHIVED",
    contactImported: true,
    savedToContacts: true,
    meetroAccountLinked: false,
    inviteStatus: "not_invited",
    conversation_type: "standard",
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    unread: false,
  };
}
