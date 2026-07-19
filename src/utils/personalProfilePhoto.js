import { authFetch } from "./authFetch.js";

export const PERSONAL_PROFILE_IMAGE_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export const PERSONAL_PROFILE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

function failure(code) {
  return { ok: false, code };
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
} = {}) {
  const result = await authFetchImpl(
    "/media/upload-signature",
    {
      method: "POST",
      body: JSON.stringify({
        purpose: "personal_profile",
        fileName: file.name,
        contentType: file.type,
        fileSizeBytes: file.size,
      }),
    },
    setPage
  );
  const data = getSuccessfulData(result, "MEDIA_UPLOAD_SIGNATURE_CREATED");
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
} = {}) {
  if (!signature?.cloudName || !signature?.apiKey || !signature?.signature) {
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
  const response = await fetchImpl(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`,
    { method: "POST", body }
  );
  if (!response.ok) return null;
  return normalizeCloudinaryUploadResponse(await response.json());
}

export async function persistPersonalProfileImage({
  media,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  const result = await authFetchImpl(
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
  const data = getSuccessfulData(result, "PROFILE_IMAGE_UPDATED");
  return data?.user || null;
}

export async function uploadPersonalProfilePhoto({
  file,
  authFetchImpl = authFetch,
  fetchImpl = globalThis.fetch,
  setPage,
} = {}) {
  const validation = validatePersonalProfileImageFile(file);
  if (!validation.ok) return validation;

  try {
    const signature = await requestPersonalProfileUploadSignature({
      file,
      authFetchImpl,
      setPage,
    });
    if (!signature) return failure("PROFILE_IMAGE_UPLOAD_FAILED");

    const media = await uploadPersonalProfileImageToCloudinary({
      file,
      signature,
      fetchImpl,
    });
    if (!media) return failure("PROFILE_IMAGE_UPLOAD_FAILED");

    const user = await persistPersonalProfileImage({
      media,
      authFetchImpl,
      setPage,
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
