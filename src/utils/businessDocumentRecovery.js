export const BUSINESS_DOCUMENT_RECOVERY_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const BUSINESS_DOCUMENT_RECOVERY_MAX_BYTES = 25 * 1024 * 1024;
const DATABASE_NAME = "meetro-business-document-recovery";
const STORE_NAME = "recovery-sessions";
const DATABASE_VERSION = 1;

function identity(value) {
  const normalized = String(value || "").trim();
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/.test(normalized) ? normalized : "";
}

function plain(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function approximateBytes(value, seen = new Set()) {
  if (value == null) return 0;
  if (typeof Blob !== "undefined" && value instanceof Blob) return value.size;
  if (typeof value === "string") return value.length * 2;
  if (typeof value === "number" || typeof value === "boolean") return 8;
  if (typeof value !== "object" || seen.has(value)) return 0;
  seen.add(value);
  const bytes = Array.isArray(value)
    ? value.reduce((sum, item) => sum + approximateBytes(item, seen), 0)
    : Object.entries(value).reduce((sum, [key, item]) => sum + key.length * 2 + approximateBytes(item, seen), 0);
  seen.delete(value);
  return bytes;
}

function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

async function openDatabase(indexedDBImpl = globalThis.indexedDB) {
  if (!indexedDBImpl?.open) throw new Error("IndexedDB is unavailable.");
  const request = indexedDBImpl.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "identityKey" });
  };
  return requestPromise(request);
}

async function transaction(mode, action, indexedDBImpl) {
  const database = await openDatabase(indexedDBImpl);
  try {
    const tx = database.transaction(STORE_NAME, mode);
    const result = await action(tx.objectStore(STORE_NAME));
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed."));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted."));
    });
    return result;
  } finally {
    database.close();
  }
}

export const indexedDbBusinessDocumentRecoveryRepository = Object.freeze({
  put(record, indexedDBImpl) {
    return transaction("readwrite", (store) => requestPromise(store.put(record)), indexedDBImpl);
  },
  get(identityKey, indexedDBImpl) {
    return transaction("readonly", (store) => requestPromise(store.get(identityKey)), indexedDBImpl);
  },
  delete(identityKey, indexedDBImpl) {
    return transaction("readwrite", (store) => requestPromise(store.delete(identityKey)), indexedDBImpl);
  },
});

export async function saveBusinessDocumentRecovery({
  identityKey,
  snapshot,
  now = Date.now(),
  repository = indexedDbBusinessDocumentRecoveryRepository,
  indexedDBImpl,
} = {}) {
  const owner = identity(identityKey);
  if (!owner || !plain(snapshot)) return { ok: false, code: "RECOVERY_INVALID" };
  if (approximateBytes(snapshot) > BUSINESS_DOCUMENT_RECOVERY_MAX_BYTES) {
    return { ok: false, code: "RECOVERY_TOO_LARGE" };
  }
  const record = {
    identityKey: owner,
    classification: "NONCANONICAL_LOCAL_RECOVERY",
    savedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + BUSINESS_DOCUMENT_RECOVERY_TTL_MS).toISOString(),
    snapshot,
  };
  try {
    await repository.put(record, indexedDBImpl);
    return { ok: true, record };
  } catch {
    return { ok: false, code: "RECOVERY_UNAVAILABLE" };
  }
}

export async function loadBusinessDocumentRecovery({
  identityKey,
  now = Date.now(),
  repository = indexedDbBusinessDocumentRecoveryRepository,
  indexedDBImpl,
} = {}) {
  const owner = identity(identityKey);
  if (!owner) return null;
  try {
    const record = await repository.get(owner, indexedDBImpl);
    if (!record || record.classification !== "NONCANONICAL_LOCAL_RECOVERY" || !plain(record.snapshot)) return null;
    if (Date.parse(record.expiresAt) <= now) {
      await repository.delete(owner, indexedDBImpl);
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

export async function deleteBusinessDocumentRecovery({
  identityKey,
  repository = indexedDbBusinessDocumentRecoveryRepository,
  indexedDBImpl,
} = {}) {
  const owner = identity(identityKey);
  if (!owner) return false;
  try {
    await repository.delete(owner, indexedDBImpl);
    return true;
  } catch {
    return false;
  }
}

export async function clearDeletedBusinessDocumentRecoveryIdentity({
  identityKey,
  draftId,
  repository = indexedDbBusinessDocumentRecoveryRepository,
  indexedDBImpl,
} = {}) {
  const owner = identity(identityKey);
  const target = identity(draftId);
  if (!owner || !target) return false;
  try {
    const record = await repository.get(owner, indexedDBImpl);
    if (!record || record.classification !== "NONCANONICAL_LOCAL_RECOVERY" || !plain(record.snapshot)) return false;
    const cleared = clearDeletedBusinessDocumentRecoverySnapshot(record.snapshot, target);
    if (!cleared.changed) return false;
    await repository.put({
      ...record,
      snapshot: cleared.snapshot,
    }, indexedDBImpl);
    return true;
  } catch {
    return false;
  }
}

export function clearDeletedBusinessDocumentRecoverySnapshot(snapshot, draftId) {
  if (!plain(snapshot)) return Object.freeze({ changed: false, snapshot });
  const target = identity(draftId);
  const savedDocuments = plain(snapshot.savedDocuments) ? { ...snapshot.savedDocuments } : {};
  const matchingTypes = Object.entries(savedDocuments)
    .filter(([, document]) => document?.id === target)
    .map(([documentType]) => documentType);
  if (!target || !matchingTypes.length) return Object.freeze({ changed: false, snapshot });
  const savedFingerprints = plain(snapshot.savedFingerprints)
    ? { ...snapshot.savedFingerprints }
    : {};
  for (const documentType of matchingTypes) {
    savedDocuments[documentType] = null;
    savedFingerprints[documentType] = "";
  }
  return Object.freeze({
    changed: true,
    snapshot: { ...snapshot, savedDocuments, savedFingerprints },
  });
}

export const businessDocumentRecoveryInternals = Object.freeze({ approximateBytes, identity });
