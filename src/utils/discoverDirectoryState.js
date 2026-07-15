export const DISCOVER_DIRECTORY_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  RESULTS: "success-with-results",
  EMPTY: "success-empty",
  UNAUTHORIZED: "unauthorized",
  FAILED: "failed",
  UNAVAILABLE: "unavailable",
});

const PUBLIC_PROFILE_FIELDS = Object.freeze([
  "id",
  "business_name",
  "category",
  "phone",
  "location",
  "bio",
  "image_url",
  "service_area",
  "business_hours",
  "license_number",
  "license_state",
  "license_type",
  "license_expiration",
  "service_specialties",
  "available_now",
  "dispatch_ready",
  "show_business_address_public",
  "street_address",
  "address_line_2",
  "city",
  "state_province",
  "postal_code",
  "country",
  "username",
]);

function state(status, records = [], errorCode = "") {
  return Object.freeze({
    status,
    records: Object.freeze(records.map((record) => Object.freeze(record))),
    errorCode,
  });
}

function reportFailure(logger, errorCode, status) {
  if (!logger || typeof logger.error !== "function") return;
  logger.error("Discover directory request failed", {
    errorCode,
    ...(Number.isInteger(status) ? { status } : {}),
  });
}

export function createInitialDiscoverDirectoryState() {
  return state(DISCOVER_DIRECTORY_STATUS.IDLE);
}

export function createLoadingDiscoverDirectoryState() {
  return state(DISCOVER_DIRECTORY_STATUS.LOADING);
}

function normalizePublicProfile(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;
  if (
    (!Number.isInteger(Number(profile.id)) && typeof profile.id !== "string") ||
    typeof profile.business_name !== "string" ||
    !profile.business_name.trim()
  ) {
    return null;
  }

  const normalized = {};
  for (const field of PUBLIC_PROFILE_FIELDS) {
    if (!Object.hasOwn(profile, field)) continue;
    const value = profile[field];
    if (field === "service_specialties") {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
        return null;
      }
      normalized[field] = [...value];
    } else if (
      ["available_now", "dispatch_ready", "show_business_address_public"].includes(field)
    ) {
      if (typeof value !== "boolean") return null;
      normalized[field] = value;
    } else if (field === "id") {
      normalized[field] = value;
    } else {
      if (typeof value !== "string" && value !== null) return null;
      normalized[field] = typeof value === "string" ? value : "";
    }
  }

  normalized.business_name = profile.business_name.trim();
  return normalized;
}

export function parseDiscoverDirectoryPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return state(DISCOVER_DIRECTORY_STATUS.FAILED, [], "MALFORMED_RESPONSE");
  }
  if (!Array.isArray(payload.profiles)) {
    return state(DISCOVER_DIRECTORY_STATUS.FAILED, [], "MALFORMED_RESPONSE");
  }

  const records = payload.profiles.map(normalizePublicProfile);
  if (records.some((record) => record === null)) {
    return state(DISCOVER_DIRECTORY_STATUS.FAILED, [], "MALFORMED_RESPONSE");
  }
  return records.length > 0
    ? state(DISCOVER_DIRECTORY_STATUS.RESULTS, records)
    : state(DISCOVER_DIRECTORY_STATUS.EMPTY);
}

export async function fetchDiscoverDirectory({
  apiUrl,
  fetchImpl = fetch,
  signal,
  logger = console,
} = {}) {
  try {
    const response = await fetchImpl(`${String(apiUrl || "").replace(/\/+$/, "")}/contractor-profiles`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal,
    });
    if (response.status === 401 || response.status === 403) {
      return state(DISCOVER_DIRECTORY_STATUS.UNAUTHORIZED, [], "ACCESS_REQUIRED");
    }
    if (response.status === 404 || response.status === 501) {
      return state(DISCOVER_DIRECTORY_STATUS.UNAVAILABLE, [], "SOURCE_UNAVAILABLE");
    }
    if (!response.ok) {
      reportFailure(logger, "REQUEST_FAILED", response.status);
      return state(DISCOVER_DIRECTORY_STATUS.FAILED, [], "REQUEST_FAILED");
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      reportFailure(logger, "MALFORMED_RESPONSE", response.status);
      return state(DISCOVER_DIRECTORY_STATUS.FAILED, [], "MALFORMED_RESPONSE");
    }
    const parsed = parseDiscoverDirectoryPayload(payload);
    if (parsed.status === DISCOVER_DIRECTORY_STATUS.FAILED) {
      reportFailure(logger, parsed.errorCode, response.status);
    }
    return parsed;
  } catch (error) {
    if (error?.name === "AbortError") return null;
    reportFailure(logger, "NETWORK_FAILURE");
    return state(DISCOVER_DIRECTORY_STATUS.FAILED, [], "NETWORK_FAILURE");
  }
}
