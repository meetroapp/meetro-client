const JOB_REQUEST_CREATE_CODES = new Set([
  "JOB_REQUEST_CREATED",
  "JOB_REQUEST_REPLAYED",
]);

export function createSubmissionIntentKey({ cryptoImpl = globalThis.crypto } = {}) {
  if (cryptoImpl?.randomUUID) {
    return cryptoImpl.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (!cryptoImpl?.getRandomValues) {
    throw new Error("Secure random values are required.");
  }
  cryptoImpl.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export function isCanonicalJobRequestCreateResponse(result) {
  const code = String(result?.data?.code || "");
  const post = result?.data?.post;
  const id = post?.id;

  return Boolean(
    result?.response?.ok &&
    result?.data?.success === true &&
    JOB_REQUEST_CREATE_CODES.has(code) &&
    post &&
    id !== undefined &&
    id !== null &&
    String(id).trim()
  );
}

export function getCanonicalJobRequestPost(result) {
  return isCanonicalJobRequestCreateResponse(result) ? result.data.post : null;
}

export function classifyJobRequestCreateFailure(errorOrResult) {
  if (errorOrResult instanceof Error) return "ambiguous";

  const status = Number(errorOrResult?.response?.status || 0);
  const code = String(errorOrResult?.data?.code || errorOrResult?.data?.error || "");

  if (code === "JOB_REQUEST_IDEMPOTENCY_CONFLICT") return "conflict";
  if (
    code === "JOB_REQUEST_IDEMPOTENCY_KEY_REQUIRED" ||
    code === "JOB_REQUEST_IDEMPOTENCY_KEY_INVALID"
  ) {
    return "key";
  }
  if (status === 400 || status === 401 || status === 403) return "definitive";
  if (errorOrResult?.response?.ok) return "ambiguous";
  return "definitive";
}

export function buildCanonicalJobRequestPayload({
  title = "",
  description = "",
  category = "",
  requestMatchingFields = {},
  serviceLocation = {},
  requestPhotoPayload = [],
} = {}) {
  const intakeMode = String(serviceLocation.intakeMode || "").trim();
  const payload = {
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    category,
    request_category: requestMatchingFields.requestCategory,
    service_domain: requestMatchingFields.service_domain,
    service_specialty: requestMatchingFields.service_specialty,
    location_intake_mode: intakeMode,
    service_city: String(serviceLocation.city || "").trim(),
    service_region: String(serviceLocation.region || "").trim(),
    service_postal_code: String(serviceLocation.postalCode || "").trim(),
    service_country_code: String(serviceLocation.countryCode || "")
      .trim()
      .toUpperCase(),
    access_notes: String(serviceLocation.accessNotes || "").trim(),
    request_photos: requestPhotoPayload,
  };

  if (intakeMode === "exact_on_file") {
    payload.service_address_line1 = String(serviceLocation.addressLine1 || "").trim();
    payload.unit_number = String(serviceLocation.unitNumber || "").trim();
  }

  return payload;
}
