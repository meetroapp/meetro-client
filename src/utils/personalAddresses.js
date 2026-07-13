const ADDRESS_STORE_PREFIX = "meetroPersonalAddresses";
const LEGACY_OWNER_KEY = "meetroPersonalAddressLegacyOwner";

export const PERSONAL_ADDRESS_LABELS = Object.freeze(["home", "work", "rental", "other"]);

function text(value) {
  return String(value ?? "").trim();
}

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeStorage(options = {}) {
  return options.storage || globalThis.localStorage;
}

function storedUser(storage) {
  try {
    return safeParse(storage?.getItem("user"), {});
  } catch {
    return {};
  }
}

function identityPart(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9@._-]+/g, "-");
}

export function getPersonalAddressOwnerId(options = {}) {
  const storage = safeStorage(options);
  const user = options.user || storedUser(storage);
  const values = [
    options.userId,
    user.id,
    user.userId,
    user.user_id,
    user.accountId,
    user.account_id,
    storage?.getItem?.("userId"),
    storage?.getItem?.("currentUserId"),
    user.email,
    user.userEmail,
    storage?.getItem?.("userEmail"),
    storage?.getItem?.("email"),
  ];
  return identityPart(values.find((value) => text(value)) || "anonymous");
}

export function getPersonalAddressStorageKey(options = {}) {
  return `${ADDRESS_STORE_PREFIX}:${getPersonalAddressOwnerId(options)}`;
}

function stableAddressId(input = {}, options = {}) {
  const existing = text(input.id);
  if (existing) return existing;
  if (typeof options.idFactory === "function") return text(options.idFactory());
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `address-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizePersonalAddress(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const labelValue = text(input.label || input.addressLabel || "home").toLowerCase();
  return {
    ...input,
    id: stableAddressId(input, options),
    label: PERSONAL_ADDRESS_LABELS.includes(labelValue) ? labelValue : "other",
    street1: text(input.street1 || input.addressLine1 || input.address_line_1 || input.street || input.address),
    street2: text(input.street2 || input.addressLine2 || input.address_line_2 || input.unit || input.apartment),
    city: text(input.city),
    state: text(input.state || input.region),
    postalCode: text(input.postalCode || input.postal_code || input.zip || input.zipCode),
    country: text(input.country || "US"),
    isDefault: Boolean(input.isDefault ?? input.is_default),
    createdAt: text(input.createdAt || input.created_at) || now,
    updatedAt: text(input.updatedAt || input.updated_at) || now,
  };
}

export function isValidPersonalAddress(address = {}) {
  return [address.street1, address.city, address.state, address.postalCode, address.country]
    .every((value) => Boolean(text(value)));
}

function enforceDefaultInvariant(addresses = []) {
  const valid = addresses.filter(isValidPersonalAddress);
  if (!valid.length) return [];
  const selectedDefault = valid.find((address) => address.isDefault) || valid[0];
  return valid.map((address) => ({
    ...address,
    isDefault: address.id === selectedDefault.id,
  }));
}

function normalizeCollection(records = [], options = {}) {
  const seen = new Set();
  const normalized = [];
  for (const record of Array.isArray(records) ? records : []) {
    const address = normalizePersonalAddress(record, options);
    if (!isValidPersonalAddress(address) || seen.has(address.id)) continue;
    seen.add(address.id);
    normalized.push(address);
  }
  return enforceDefaultInvariant(normalized);
}

function legacyAddressFromStorage(storage, options = {}) {
  const formatted = text(
    storage?.getItem?.("primaryPropertyAddress") ||
      storage?.getItem?.("primaryServiceAddress") ||
      storage?.getItem?.("fullServiceAddress") ||
      storage?.getItem?.("userAddress")
  );
  const city = text(storage?.getItem?.("userCity") || storage?.getItem?.("homeownerCity") || storage?.getItem?.("city"));
  const state = text(storage?.getItem?.("userState") || storage?.getItem?.("homeownerState") || storage?.getItem?.("state"));
  const postalCode = text(storage?.getItem?.("userPostalCode") || storage?.getItem?.("homeownerZip") || storage?.getItem?.("zipCode"));
  const country = text(storage?.getItem?.("userCountry") || "US");
  if (!formatted || !city || !state || !postalCode) return null;
  return normalizePersonalAddress({
    id: `legacy-${getPersonalAddressOwnerId({ ...options, storage })}`,
    label: "home",
    street1: formatted,
    city,
    state,
    postalCode,
    country,
    isDefault: true,
  }, options);
}

function readLegacyRecords(storage, options = {}) {
  const ownerId = getPersonalAddressOwnerId({ ...options, storage });
  let legacyOwner;
  try {
    legacyOwner = text(storage?.getItem?.(LEGACY_OWNER_KEY));
    if (!legacyOwner && ownerId !== "anonymous") {
      storage?.setItem?.(LEGACY_OWNER_KEY, ownerId);
      legacyOwner = ownerId;
    }
  } catch {
    return [];
  }
  if (!legacyOwner || legacyOwner !== ownerId) return [];
  const arrays = ["meetroSavedAddresses", "savedAddresses"].flatMap((key) => {
    try {
      const value = safeParse(storage?.getItem?.(key), []);
      return Array.isArray(value)
        ? value.map((record, index) => ({
            ...record,
            id: text(record?.id) || `legacy-${ownerId}-${key}-${index}`,
          }))
        : [];
    } catch {
      return [];
    }
  });
  const single = legacyAddressFromStorage(storage, options);
  const unique = [];
  const fingerprints = new Set();
  for (const record of single ? [...arrays, single] : arrays) {
    const fingerprint = [
      record.street1 || record.addressLine1 || record.address,
      record.street2 || record.addressLine2 || record.unit,
      record.city,
      record.state || record.region,
      record.postalCode || record.zip || record.zipCode,
      record.country || "US",
    ].map((value) => text(value).toLowerCase()).join("|");
    if (!fingerprint.replaceAll("|", "") || fingerprints.has(fingerprint)) continue;
    fingerprints.add(fingerprint);
    unique.push(record);
  }
  return unique;
}

export function readPersonalAddresses(options = {}) {
  const storage = safeStorage(options);
  if (!storage) return [];
  let scoped;
  try {
    const parsed = safeParse(storage.getItem(getPersonalAddressStorageKey({ ...options, storage })), []);
    scoped = Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
  const records = scoped.length ? scoped : readLegacyRecords(storage, options);
  return normalizeCollection(records, options);
}

function writePersonalAddresses(addresses, options = {}) {
  const storage = safeStorage(options);
  const normalized = enforceDefaultInvariant(addresses.map((item) => ({ ...item })));
  if (!storage) return normalized;
  try {
    storage.setItem(getPersonalAddressStorageKey({ ...options, storage }), JSON.stringify(normalized));
  } catch {
    return normalized;
  }
  return normalized;
}

export function createPersonalAddress(input, options = {}) {
  const existing = readPersonalAddresses(options);
  const now = options.now || new Date().toISOString();
  const address = normalizePersonalAddress({ ...input, isDefault: existing.length === 0 || Boolean(input.isDefault), createdAt: now, updatedAt: now }, options);
  if (!isValidPersonalAddress(address)) return existing;
  return writePersonalAddresses([
    ...existing.map((item) => ({ ...item, isDefault: address.isDefault ? false : item.isDefault })),
    address,
  ], options);
}

export function updatePersonalAddress(addressId, input, options = {}) {
  const existing = readPersonalAddresses(options);
  const current = existing.find((item) => item.id === addressId);
  if (!current) return existing;
  const updated = normalizePersonalAddress({ ...current, ...input, id: current.id, createdAt: current.createdAt, isDefault: input.isDefault ?? current.isDefault, updatedAt: options.now || new Date().toISOString() }, options);
  if (!isValidPersonalAddress(updated)) return existing;
  return writePersonalAddresses(existing.map((item) => item.id === addressId ? updated : { ...item, isDefault: updated.isDefault ? false : item.isDefault }), options);
}

export function setDefaultPersonalAddress(addressId, options = {}) {
  const existing = readPersonalAddresses(options);
  if (!existing.some((item) => item.id === addressId)) return existing;
  return writePersonalAddresses(existing.map((item) => ({ ...item, isDefault: item.id === addressId })), options);
}

export function deletePersonalAddress(addressId, options = {}) {
  const existing = readPersonalAddresses(options);
  const removed = existing.find((item) => item.id === addressId);
  const remaining = existing.filter((item) => item.id !== addressId);
  if (!removed || !remaining.length) return writePersonalAddresses(remaining, options);
  if (!removed.isDefault) return writePersonalAddresses(remaining, options);
  const oldest = [...remaining].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id)))[0];
  return writePersonalAddresses(remaining.map((item) => ({ ...item, isDefault: item.id === oldest.id })), options);
}

export function resolveDefaultPersonalAddress(options = {}) {
  return readPersonalAddresses(options).find((address) => address.isDefault) || null;
}

export function formatPersonalAddress(address = {}, options = {}) {
  const street = [text(address.street1), text(address.street2)].filter(Boolean).join(", ");
  const locality = [text(address.city), text(address.state), text(address.postalCode)].filter(Boolean).join(" ");
  return [street, locality, text(address.country) && options.includeCountry ? text(address.country) : ""].filter(Boolean).join(", ");
}

export function projectPersonalAddressPrefill(address = resolveDefaultPersonalAddress()) {
  if (!address || !isValidPersonalAddress(address)) return null;
  return {
    addressId: address.id,
    label: address.label,
    street1: address.street1,
    street2: address.street2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    formattedAddress: formatPersonalAddress(address),
  };
}

export function resolveWorkflowAddress(sources = {}, options = {}) {
  const explicit = [sources.explicitAddress, sources.selectedPropertyAddress, sources.projectAddress, sources.requestAddress, sources.visitAddress]
    .map(text)
    .find(Boolean);
  if (explicit) return explicit;
  const personal = sources.personalAddress || resolveDefaultPersonalAddress(options);
  return formatPersonalAddress(personal || {});
}
