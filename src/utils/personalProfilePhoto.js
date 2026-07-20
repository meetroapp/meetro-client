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
