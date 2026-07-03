import { Capacitor, registerPlugin } from "@capacitor/core";

export const CONTACTS_ACCESS_OFF_MESSAGE =
  "Contacts access is off. You can enable it in iPhone Settings or import a file instead.";

const NativeContacts = registerPlugin("NativeContacts");

export function isNativeContactsAvailable() {
  try {
    return Boolean(Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

function normalizeNativeContact(contact = {}, index = 0) {
  return {
    id: contact.id || `native-contact-${index}`,
    name: contact.name || "",
    givenName: contact.givenName || "",
    familyName: contact.familyName || "",
    company: contact.company || "",
    phone: contact.phone || "",
    phones: Array.isArray(contact.phones) ? contact.phones : [],
    email: contact.email || "",
    emails: Array.isArray(contact.emails) ? contact.emails : [],
    address: contact.address || "",
    source: "phone",
  };
}

export async function getNativePhoneContacts() {
  if (!isNativeContactsAvailable()) {
    return {
      available: false,
      permission: "unavailable",
      contacts: [],
    };
  }

  try {
    const result = await NativeContacts.getContacts();
    const contacts = Array.isArray(result?.contacts)
      ? result.contacts.map(normalizeNativeContact)
      : [];

    return {
      available: true,
      permission: result?.permission || "granted",
      contacts,
    };
  } catch (error) {
    return {
      available: false,
      permission: "unavailable",
      contacts: [],
      error,
    };
  }
}
