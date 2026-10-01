import { authFetch } from "./authFetch.js";
import API_URL from "../api.js";

export const PERSONAL_PROFILE_IMAGE_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export const PERSONAL_PROFILE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const STAGING_MEDIA_API_ORIGIN =
  "https://athletic-rebirth-staging.up.railway.app";

export const PROFILE_PHOTO_DISPLAY_VERSION = 1;
export const PROFILE_PHOTO_DISPLAY_MAX_ZOOM = 4;

export const PROFILE_PHOTO_DISPLAY_DEFAULT = Object.freeze({
  version: PROFILE_PHOTO_DISPLAY_VERSION,
  focus_x: 0.5,
  focus_y: 0.5,
  zoom: 1,
});

const PROFILE_PHOTO_DISPLAY_FIELDS = Object.freeze([
  "version",
  "focus_x",
  "focus_y",
  "zoom",
]);

function isPlainDisplayRecord(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

export function validatePersonalProfilePhotoDisplay(value) {
  if (!isPlainDisplayRecord(value)) {
    return failure("PROFILE_DISPLAY_INVALID");
  }

  const keys = Object.keys(value).sort();
  const expected = [...PROFILE_PHOTO_DISPLAY_FIELDS].sort();

  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    return failure("PROFILE_DISPLAY_INVALID");
  }

  if (value.version !== PROFILE_PHOTO_DISPLAY_VERSION) {
    return failure("PROFILE_DISPLAY_VERSION_INVALID");
  }

  for (const key of ["focus_x", "focus_y", "zoom"]) {
    if (typeof value[key] !== "number" || !Number.isFinite(value[key])) {
      return failure("PROFILE_DISPLAY_INVALID");
    }
  }

  if (
    value.focus_x < 0 ||
    value.focus_x > 1 ||
    value.focus_y < 0 ||
    value.focus_y > 1 ||
    value.zoom < 1 ||
    value.zoom > PROFILE_PHOTO_DISPLAY_MAX_ZOOM
  ) {
    return failure("PROFILE_DISPLAY_RANGE_INVALID");
  }

  return {
    ok: true,
    display: {
      version: PROFILE_PHOTO_DISPLAY_VERSION,
      focus_x: value.focus_x,
      focus_y: value.focus_y,
      zoom: value.zoom,
    },
  };
}

export function normalizePersonalProfilePhotoDisplay(value) {
  const validated = validatePersonalProfilePhotoDisplay(value);
  return validated.ok
    ? validated.display
    : { ...PROFILE_PHOTO_DISPLAY_DEFAULT };
}

export function getPersonalProfilePhotoFocusBounds(zoom = 1) {
  const numericZoom =
    typeof zoom === "number" && Number.isFinite(zoom)
      ? zoom
      : 1;

  const safeZoom = Math.min(
    PROFILE_PHOTO_DISPLAY_MAX_ZOOM,
    Math.max(1, numericZoom)
  );

  const radius =
    (safeZoom - 1) /
    (2 * safeZoom);

  return {
    min: 0.5 - radius,
    max: 0.5 + radius,
  };
}

export function constrainPersonalProfilePhotoDisplay(value) {
  const display =
    normalizePersonalProfilePhotoDisplay(value);

  const bounds =
    getPersonalProfilePhotoFocusBounds(
      display.zoom
    );

  const clamp = (coordinate) =>
    Math.min(
      bounds.max,
      Math.max(bounds.min, coordinate)
    );

  return {
    ...display,
    focus_x: clamp(display.focus_x),
    focus_y: clamp(display.focus_y),
  };
}

function formatProfilePhotoPercent(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return "0";

  const rounded = Number(
    numeric.toFixed(9)
  );

  return String(
    Object.is(rounded, -0) ? 0 : rounded
  );
}

export function getPersonalProfilePhotoDisplayStyle(value) {
  const display =
    constrainPersonalProfilePhotoDisplay(value);

  const zoomPercent =
    display.zoom * 100;

  /*
   * Canonical avatar geometry:
   *
   * 1. The image element itself is zoomed by enlarging its
   *    width and height.
   * 2. Its anchor is the exact center of the circular viewport.
   * 3. translate percentages are relative to the image itself.
   * 4. Moving by -focus_x / -focus_y therefore places the
   *    selected normalized focal point exactly at viewport center.
   *
   * This is independent of the rendered avatar size, so the
   * same saved focal point produces the same crop at 42px,
   * 76px, or any other square Meetro avatar.
   */
  return {
    position: "absolute",
    width: `${zoomPercent.toFixed(3)}%`,
    height: `${zoomPercent.toFixed(3)}%`,
    maxWidth: "none",
    maxHeight: "none",
    left: "50%",
    top: "50%",
    objectPosition: "50% 50%",
    transform:
      `translate(${formatProfilePhotoPercent(
        -display.focus_x * 100
      )}%, ${formatProfilePhotoPercent(
        -display.focus_y * 100
      )}%)`,
    transformOrigin: "0 0",
  };
}

export function isPersonalProfilePhotoUploadEnabled({
  apiUrl = API_URL,
  env = import.meta.env,
} = {}) {
  const explicit = String(
    env?.VITE_ENABLE_PERSONAL_PROFILE_MEDIA || ""
  ).trim().toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;

  try {
    return new URL(apiUrl).origin === STAGING_MEDIA_API_ORIGIN;
  } catch {
    return false;
  }
}

function failure(code) {
  return { ok: false, code };
}

export function reportProfileMediaDiagnostic(detail = {}) {
  const safe = {
    purpose: String(detail.purpose || "unknown"),
    stage: String(detail.stage || "unknown"),
    endpoint: String(detail.endpoint || "unknown"),
    status: Number.isInteger(detail.status) ? detail.status : 0,
    code: String(detail.code || "MEDIA_TRANSACTION_FAILED"),
  };
  console.error("Meetro governed media transaction failed", safe);
}

function reportFailure(onDiagnostic, detail) {
  if (typeof onDiagnostic === "function") onDiagnostic(detail);
}

export function validatePersonalProfileImageFile(file) {
  if (!file || typeof file !== "object") return failure("PROFILE_IMAGE_REQUIRED");
  if (!PERSONAL_PROFILE_IMAGE_TYPES.includes(String(file.type || "").toLowerCase())) {
    return failure("PROFILE_IMAGE_FORMAT_INVALID");
  }
  if (!Number.isInteger(file.size) || file.size <= 0) {
    return failure("PROFILE_IMAGE_INVALID");
  }
  if (file.size > PERSONAL_PROFILE_IMAGE_MAX_BYTES) {
    return failure("PROFILE_IMAGE_TOO_LARGE");
  }
  return { ok: true, file };
}

export function createTemporaryProfilePhotoPreview(
  file,
  urlApi = globalThis.URL
) {
  if (typeof urlApi?.createObjectURL !== "function") {
    return { url: "", revoke() {} };
  }
  const url = urlApi.createObjectURL(file);
  let revoked = false;
  return {
    url,
    revoke() {
      if (revoked) return;
      revoked = true;
      urlApi.revokeObjectURL?.(url);
    },
  };
}

function getSuccessfulData(result, expectedCode) {
  if (
    !result?.response?.ok ||
    result?.data?.success !== true ||
    result?.data?.code !== expectedCode
  ) {
    return null;
  }
  return result.data;
}

export async function requestPersonalProfileUploadSignature({
  file,
  authFetchImpl = authFetch,
  setPage,
  purpose = "personal_profile",
  onDiagnostic,
} = {}) {
  let result;
  try {
    result = await authFetchImpl(
      "/media/upload-signature",
      {
        method: "POST",
        body: JSON.stringify({
          purpose,
          fileName: file.name,
          contentType: file.type,
          fileSizeBytes: file.size,
        }),
      },
      setPage
    );
  } catch {
    reportFailure(onDiagnostic, {
      purpose,
      stage: "signature",
      endpoint: "/media/upload-signature",
      status: 0,
      code: "MEDIA_SIGNATURE_NETWORK_FAILED",
    });
    return null;
  }
  const data = getSuccessfulData(result, "MEDIA_UPLOAD_SIGNATURE_CREATED");
  if (!data?.upload) {
    reportFailure(onDiagnostic, {
      purpose,
      stage: "signature",
      endpoint: "/media/upload-signature",
      status: Number(result?.response?.status || 0),
      code: result?.data?.code || "MEDIA_SIGNATURE_REJECTED",
    });
  }
  return data?.upload || null;
}

export function normalizeCloudinaryUploadResponse(value) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  const required = [
    "secure_url",
    "public_id",
    "resource_type",
    "format",
    "bytes",
    "width",
    "height",
    "version",
  ];
  if (required.some((field) => source[field] === undefined || source[field] === null || source[field] === "")) {
    return null;
  }
  if (
    source.resource_type !== "image" ||
    !["jpg", "jpeg", "png", "webp"].includes(String(source.format).toLowerCase()) ||
    !String(source.secure_url).startsWith("https://")
  ) {
    return null;
  }
  return {
    secure_url: String(source.secure_url),
    public_id: String(source.public_id),
    resource_type: "image",
    format: String(source.format).toLowerCase(),
    bytes: Number(source.bytes),
    width: Number(source.width),
    height: Number(source.height),
    version: Number(source.version),
    uploaded_at: String(source.created_at || source.uploaded_at || ""),
  };
}

export async function uploadPersonalProfileImageToCloudinary({
  file,
  signature,
  fetchImpl = globalThis.fetch,
  purpose = "personal_profile",
  onDiagnostic,
} = {}) {
  if (!signature?.cloudName || !signature?.apiKey || !signature?.signature) {
    reportFailure(onDiagnostic, {
      purpose,
      stage: "provider-upload",
      endpoint: "cloudinary-image-upload",
      status: 0,
      code: "MEDIA_SIGNATURE_INCOMPLETE",
    });
    return null;
  }
  const signed = signature.allowedParameters?.signed || {};
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", signature.apiKey);
  body.append("timestamp", String(signature.timestamp));
  body.append("signature", signature.signature);
  body.append("folder", signature.folder);
  if (signed.allowed_formats) {
    body.append("allowed_formats", signed.allowed_formats);
  }
  try {
    const response = await fetchImpl(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`,
      { method: "POST", body }
    );
    if (!response.ok) {
      reportFailure(onDiagnostic, {
        purpose,
        stage: "provider-upload",
        endpoint: "cloudinary-image-upload",
        status: Number(response.status || 0),
        code: response.status === 400
          ? "MEDIA_PROVIDER_REQUEST_REJECTED"
          : "MEDIA_PROVIDER_UNAVAILABLE",
      });
      return null;
    }
    const media = normalizeCloudinaryUploadResponse(await response.json());
    if (!media) {
      reportFailure(onDiagnostic, {
        purpose,
        stage: "provider-upload",
        endpoint: "cloudinary-image-upload",
        status: Number(response.status || 0),
        code: "MEDIA_PROVIDER_RESPONSE_INVALID",
      });
    }
    return media;
  } catch {
    reportFailure(onDiagnostic, {
      purpose,
      stage: "provider-upload",
      endpoint: "cloudinary-image-upload",
      status: 0,
      code: "MEDIA_PROVIDER_NETWORK_FAILED",
    });
    return null;
  }
}

export async function persistPersonalProfileImage({
  media,
  authFetchImpl = authFetch,
  setPage,
  onDiagnostic,
} = {}) {
  let result;
  try {
    result = await authFetchImpl(
      "/auth/profile-photo",
      {
        method: "PUT",
        body: JSON.stringify({
          purpose: "personal_profile",
          media,
        }),
      },
      setPage
    );
  } catch {
    reportFailure(onDiagnostic, {
      purpose: "personal_profile",
      stage: "canonical-persistence",
      endpoint: "/auth/profile-photo",
      status: 0,
      code: "PROFILE_IMAGE_PERSISTENCE_NETWORK_FAILED",
    });
    return null;
  }
  const data = getSuccessfulData(result, "PROFILE_IMAGE_UPDATED");
  if (!data?.user) {
    reportFailure(onDiagnostic, {
      purpose: "personal_profile",
      stage: "canonical-persistence",
      endpoint: "/auth/profile-photo",
      status: Number(result?.response?.status || 0),
      code: result?.data?.code || "PROFILE_IMAGE_PERSISTENCE_REJECTED",
    });
  }
  return data?.user || null;
}

export async function savePersonalProfilePhotoDisplay({
  display,
  authFetchImpl = authFetch,
  setPage,
  onDiagnostic = reportProfileMediaDiagnostic,
} = {}) {
  const validated = validatePersonalProfilePhotoDisplay(display);

  if (!validated.ok) return validated;

  let result;

  try {
    result = await authFetchImpl(
      "/auth/profile-photo/display",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "personal_profile",
          display: validated.display,
        }),
      },
      setPage
    );
  } catch {
    reportFailure(onDiagnostic, {
      purpose: "personal_profile",
      stage: "display-persistence",
      endpoint: "/auth/profile-photo/display",
      status: 0,
      code: "PROFILE_DISPLAY_PERSISTENCE_NETWORK_FAILED",
    });

    return failure("PROFILE_DISPLAY_SAVE_FAILED");
  }

  const data = getSuccessfulData(
    result,
    "PROFILE_DISPLAY_UPDATED"
  );

  if (!data) {
    reportFailure(onDiagnostic, {
      purpose: "personal_profile",
      stage: "display-persistence",
      endpoint: "/auth/profile-photo/display",
      status: Number(result?.response?.status || 0),
      code:
        result?.data?.code ||
        "PROFILE_DISPLAY_PERSISTENCE_REJECTED",
    });

    return failure("PROFILE_DISPLAY_SAVE_FAILED");
  }

  const savedDisplay = normalizePersonalProfilePhotoDisplay(
    data.profile_photo_display ||
      data.user?.profile_photo_display ||
      validated.display
  );

  return {
    ok: true,
    code: "PROFILE_DISPLAY_UPDATED",
    display: savedDisplay,
    user: data.user || null,
  };
}

export async function uploadPersonalProfilePhoto({
  file,
  authFetchImpl = authFetch,
  fetchImpl = globalThis.fetch,
  setPage,
  onDiagnostic = reportProfileMediaDiagnostic,
} = {}) {
  const validation = validatePersonalProfileImageFile(file);
  if (!validation.ok) return validation;

  try {
    const signature = await requestPersonalProfileUploadSignature({
      file,
      authFetchImpl,
      setPage,
      onDiagnostic,
    });
    if (!signature) return failure("PROFILE_IMAGE_UPLOAD_FAILED");

    const media = await uploadPersonalProfileImageToCloudinary({
      file,
      signature,
      fetchImpl,
      onDiagnostic,
    });
    if (!media) return failure("PROFILE_IMAGE_UPLOAD_FAILED");

    const user = await persistPersonalProfileImage({
      media,
      authFetchImpl,
      setPage,
      onDiagnostic,
    });
    if (!user?.profile_photo_url) return failure("PROFILE_IMAGE_SAVE_FAILED");

    const refreshed = await authFetchImpl("/auth/me", {}, setPage);
    const canonicalUser = refreshed?.response?.ok && refreshed?.data?.user
      ? refreshed.data.user
      : user;
    return {
      ok: true,
      code: "PROFILE_IMAGE_UPDATED",
      user: canonicalUser,
      media,
    };
  } catch {
    return failure("PROFILE_IMAGE_UPLOAD_FAILED");
  }
}
