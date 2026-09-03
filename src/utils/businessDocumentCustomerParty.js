const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value) {
  return String(value ?? "").trim();
}

function normalizedMatchText(value) {
  return text(value).toLocaleLowerCase().replace(/[^a-z0-9@+]+/g, " ").trim();
}

function normalizedPhone(value) {
  return text(value).replace(/\D+/g, "");
}

export const BUSINESS_DOCUMENT_CUSTOMER_STATES = Object.freeze({
  MEETRO: "MEETRO_CUSTOMER",
  EXTERNAL: "EXTERNAL_CUSTOMER",
  DOCUMENT_ONLY: "DOCUMENT_ONLY_CUSTOMER",
});

export function businessDocumentCustomerState({
  jobLinked = false,
  customerParty = null,
  linkedContact = null,
} = {}) {
  if (jobLinked) return BUSINESS_DOCUMENT_CUSTOMER_STATES.MEETRO;
  if (customerParty || linkedContact) return BUSINESS_DOCUMENT_CUSTOMER_STATES.EXTERNAL;
  return BUSINESS_DOCUMENT_CUSTOMER_STATES.DOCUMENT_ONLY;
}

export function normalizeBusinessDocumentCustomerParty(value) {
  if (!value) return null;
  const businessContactId = text(value.businessContactId).toLowerCase();
  const customerRelationshipId = text(value.customerRelationshipId).toLowerCase();
  if (!UUID_PATTERN.test(businessContactId) || !UUID_PATTERN.test(customerRelationshipId)) {
    return null;
  }
  return Object.freeze({ businessContactId, customerRelationshipId });
}

export function businessContactDisplayName(contact = {}) {
  return text(contact.displayName) || text(contact.companyName) || "Saved Contact";
}

export function businessContactSearchText(contact = {}) {
  return [
    contact.displayName,
    contact.companyName,
    contact.email,
    contact.phone,
  ].map(normalizedMatchText).filter(Boolean).join(" ");
}

export function filterBusinessDocumentCustomerContacts(contacts = [], search = "") {
  const query = normalizedMatchText(search);
  return (Array.isArray(contacts) ? contacts : [])
    .filter((contact) => contact?.status === "ACTIVE")
    .filter((contact) => !query || businessContactSearchText(contact).includes(query));
}

export function businessDocumentCustomerSnapshot(content = {}) {
  return Object.freeze({
    customerName: text(content.customerName),
    customerEmail: text(content.customerEmail),
    customerPhone: text(content.customerPhone),
    customerAddress: text(content.customerAddress),
    customerLocation: text(content.customerLocation || content.serviceLocation),
  });
}

export function hasBusinessDocumentCustomerSnapshot(content = {}) {
  return Object.values(businessDocumentCustomerSnapshot(content)).some(Boolean);
}

export function customerSnapshotFromBusinessContact(contact = {}) {
  const address = text(contact.address);
  return Object.freeze({
    customerName: businessContactDisplayName(contact),
    customerEmail: text(contact.email),
    customerPhone: text(contact.phone),
    customerAddress: address,
    customerLocation: address || text(contact.serviceArea),
    serviceLocation: address || text(contact.serviceArea),
  });
}

export function applyBusinessContactToDocumentSnapshot({
  content = {},
  contact,
  replace = false,
} = {}) {
  if (!contact) return Object.freeze({ ...content });
  const snapshot = customerSnapshotFromBusinessContact(contact);
  if (replace || !hasBusinessDocumentCustomerSnapshot(content)) {
    return Object.freeze({ ...content, ...snapshot });
  }
  return Object.freeze({ ...content });
}

export function findBusinessContactDuplicateCandidates(contacts = [], content = {}) {
  const snapshot = businessDocumentCustomerSnapshot(content);
  const name = normalizedMatchText(snapshot.customerName);
  const email = normalizedMatchText(snapshot.customerEmail);
  const phone = normalizedPhone(snapshot.customerPhone);
  if (!name && !email && !phone) return [];
  return (Array.isArray(contacts) ? contacts : []).filter((contact) => {
    if (contact?.status !== "ACTIVE") return false;
    const contactName = normalizedMatchText(contact.displayName || contact.companyName);
    const contactEmail = normalizedMatchText(contact.email);
    const contactPhone = normalizedPhone(contact.phone);
    return Boolean(
      (email && contactEmail && email === contactEmail) ||
      (phone && contactPhone && phone === contactPhone) ||
      (name && contactName && name === contactName)
    );
  });
}

export class BusinessDocumentCustomerWorkflowError extends Error {
  constructor(error, { phase, contact = null, relationship = null } = {}) {
    super(error?.message || "The customer workflow could not be completed.");
    this.name = "BusinessDocumentCustomerWorkflowError";
    this.code = error?.code || "BUSINESS_DOCUMENT_CUSTOMER_WORKFLOW_FAILED";
    this.cause = error;
    this.phase = phase;
    this.contact = contact;
    this.relationship = relationship;
  }
}

export async function completeBusinessDocumentCustomerWorkflow({
  contact = null,
  relationship = null,
  createContact,
  assignCustomerRole,
  resolveRelationship,
  linkDocument,
} = {}) {
  let currentContact = contact;
  let currentRelationship = relationship;
  try {
    if (!currentContact) currentContact = await createContact();
  } catch (error) {
    throw new BusinessDocumentCustomerWorkflowError(error, { phase: "CONTACT" });
  }
  try {
    currentContact = await assignCustomerRole(currentContact);
  } catch (error) {
    throw new BusinessDocumentCustomerWorkflowError(error, {
      phase: "ROLE",
      contact: currentContact,
    });
  }
  try {
    if (!currentRelationship) {
      currentRelationship = await resolveRelationship(currentContact);
    }
  } catch (error) {
    throw new BusinessDocumentCustomerWorkflowError(error, {
      phase: "RELATIONSHIP",
      contact: currentContact,
    });
  }
  try {
    const document = await linkDocument(currentContact, currentRelationship);
    if (!document) throw new Error("The working document link was not saved.");
    return Object.freeze({
      contact: currentContact,
      relationship: currentRelationship,
      document,
    });
  } catch (error) {
    throw new BusinessDocumentCustomerWorkflowError(error, {
      phase: "LINK",
      contact: currentContact,
      relationship: currentRelationship,
    });
  }
}
