export const CONTACT_IMPORT_TYPE_OPTIONS = Object.freeze([
  {
    id: "customer",
    label: "Customer",
    relationshipType: "customer",
    identityField: "customerName",
  },
  {
    id: "tenant",
    label: "Tenant",
    relationshipType: "tenant",
    identityField: "tenantName",
  },
  {
    id: "vendor",
    label: "Vendor / Pro",
    relationshipType: "vendor",
    identityField: "vendorName",
  },
  {
    id: "employee",
    label: "Employee",
    relationshipType: "employee",
    identityField: "employeeName",
  },
  {
    id: "business",
    label: "Business",
    relationshipType: "business",
    identityField: "businessName",
  },
  {
    id: "property",
    label: "Property contact",
    relationshipType: "propertyManager",
    identityField: "propertyManagerName",
  },
]);

function firstValue(...values) {
  return (
    values
      .map((value) => String(value || "").trim())
      .find(Boolean) || ""
  );
}

function normalizeKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getImportType(type = "") {
  const normalized = normalizeKey(type);

  if (/property/.test(normalized)) {
    return CONTACT_IMPORT_TYPE_OPTIONS.find((option) => option.id === "property");
  }

  if (/vendor|pro|professional|contractor|supplier/.test(normalized)) {
    return CONTACT_IMPORT_TYPE_OPTIONS.find((option) => option.id === "vendor");
  }

  return (
    CONTACT_IMPORT_TYPE_OPTIONS.find(
      (option) =>
        normalizeKey(option.id) === normalized ||
        normalizeKey(option.label) === normalized
    ) ||
    CONTACT_IMPORT_TYPE_OPTIONS[0]
  );
}

function createImportedContactId(contact = {}, index = 0) {
  const seed = firstValue(contact.email, contact.phone, contact.name, `contact-${index}`);

  return `import-contact-${normalizeKey(seed) || index}`;
}

export function normalizeImportedContact(contact = {}, index = 0, defaultType = "customer") {
  const name = firstValue(
    Array.isArray(contact.name) ? contact.name[0] : contact.name,
    contact.displayName,
    contact.fullName,
    contact.givenName && contact.familyName
      ? `${contact.givenName} ${contact.familyName}`
      : "",
    contact.givenName,
    contact.familyName,
    contact.company,
    contact.organization
  );
  const email = firstValue(
    Array.isArray(contact.email) ? contact.email[0] : contact.email,
    contact.emailAddress,
    Array.isArray(contact.emails) ? contact.emails[0] : "",
    Array.isArray(contact.emailAddresses) ? contact.emailAddresses[0] : ""
  );
  const phone = firstValue(
    contact.phone,
    contact.phoneNumber,
    Array.isArray(contact.tel) ? contact.tel[0] : "",
    Array.isArray(contact.phones) ? contact.phones[0] : "",
    Array.isArray(contact.phoneNumbers) ? contact.phoneNumbers[0] : ""
  );
  const address = firstValue(
    contact.address,
    contact.location,
    Array.isArray(contact.addresses) ? contact.addresses[0] : ""
  );
  const type = getImportType(contact.type || contact.relationshipType || defaultType).id;

  return {
    id: contact.id || createImportedContactId({ name, email, phone }, index),
    name,
    email,
    phone,
    address,
    type,
    selected: contact.selected ?? true,
    source: contact.source || "manual",
  };
}

function parseDelimitedLine(line = "", delimiter = ",") {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function inferDelimiter(line = "") {
  if (line.includes("\t")) return "\t";
  if (line.includes(";") && !line.includes(",")) return ";";
  return ",";
}

function normalizeHeader(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function mapContactField(header = "") {
  const normalized = normalizeHeader(header);

  if (["name", "fullname", "displayname", "contact", "company"].includes(normalized)) {
    return "name";
  }
  if (["email", "emailaddress", "mail"].includes(normalized)) return "email";
  if (["phone", "phonenumber", "mobile", "tel", "telephone"].includes(normalized)) {
    return "phone";
  }
  if (["address", "location", "serviceaddress"].includes(normalized)) return "address";
  if (["type", "context", "relationshiptype", "role"].includes(normalized)) return "type";

  return "";
}

function parseCsvContacts(text = "", defaultType = "customer") {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delimiter = inferDelimiter(lines[0]);
  const firstRow = parseDelimitedLine(lines[0], delimiter);
  const mappedHeaders = firstRow.map(mapContactField);
  const hasHeader = mappedHeaders.some(Boolean);
  const headers = hasHeader ? mappedHeaders : ["name", "email", "phone", "address", "type"];
  const rows = hasHeader ? lines.slice(1) : lines;

  return rows
    .map((line, index) => {
      const values = parseDelimitedLine(line, delimiter);
      const contact = {};

      headers.forEach((field, valueIndex) => {
        if (field) contact[field] = values[valueIndex] || "";
      });

      return normalizeImportedContact(
        { ...contact, source: "file" },
        index,
        defaultType
      );
    })
    .filter((contact) => contact.name || contact.email || contact.phone);
}

function parseVcardValue(line = "") {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex < 0) return "";

  return line
    .slice(separatorIndex + 1)
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, " ")
    .replace(/;/g, " ")
    .trim();
}

function parseVcardContacts(text = "", defaultType = "customer") {
  const unfolded = String(text || "").replace(/\r?\n[ \t]/g, "");
  const cards = unfolded.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) || [];

  return cards
    .map((card, index) => {
      const lines = card.split(/\r?\n/);
      const getLine = (prefix) =>
        lines.find((line) => line.toUpperCase().startsWith(prefix));
      const name = parseVcardValue(getLine("FN") || getLine("N") || "");
      const email = parseVcardValue(getLine("EMAIL") || "");
      const phone = parseVcardValue(getLine("TEL") || "");
      const address = parseVcardValue(getLine("ADR") || "");

      return normalizeImportedContact(
        { name, email, phone, address, source: "file" },
        index,
        defaultType
      );
    })
    .filter((contact) => contact.name || contact.email || contact.phone);
}

export function parseImportedContactsFromText(text = "", defaultType = "customer") {
  if (/BEGIN:VCARD/i.test(text)) {
    return parseVcardContacts(text, defaultType);
  }

  return parseCsvContacts(text, defaultType);
}

export function buildImportedContactRelationship(contact = {}, options = {}) {
  const activeMode = options.activeMode === "business" ? "business" : "personal";
  const type = getImportType(contact.type || options.defaultType);
  const normalized = normalizeImportedContact(contact, options.index || 0, type.id);
  const name = firstValue(normalized.name, normalized.email, normalized.phone, "Imported contact");
  const idSeed = normalizeKey(
    [
      activeMode,
      type.relationshipType,
      normalized.email || normalized.phone || name,
    ].join("-")
  );
  const relationshipId = `imported-relationship-${idSeed}`;
  const createdAt = options.createdAt || new Date().toISOString();

  return {
    id: `${relationshipId}-thread`,
    relationshipId,
    relationshipType: type.relationshipType,
    relationshipScope: activeMode === "business" ? "business" : "personal",
    accountMode: activeMode === "business" ? "business" : "personal",
    [type.identityField]: name,
    participantName: name,
    displayName: name,
    project_title: name,
    project_description: "Imported contact. Invite to Meetro later.",
    homeowner_email: normalized.email || name,
    phone: normalized.phone,
    email: normalized.email,
    address: normalized.address,
    location: normalized.address,
    status: "Imported contact",
    contactImportType: type.id,
    contactImportLabel: type.label,
    contactImported: true,
    meetroAccountLinked: false,
    inviteStatus: "not_invited",
    conversation_type: "standard",
    createdAt,
    unread: false,
  };
}
