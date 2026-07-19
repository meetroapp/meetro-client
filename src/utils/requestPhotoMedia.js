import { authFetch } from "./authFetch.js";
import API_URL from "../api.js";
import {
  PERSONAL_PROFILE_IMAGE_MAX_BYTES,
  PERSONAL_PROFILE_IMAGE_TYPES,
  STAGING_MEDIA_API_ORIGIN,
  normalizeCloudinaryUploadResponse,
  uploadPersonalProfileImageToCloudinary,
} from "./personalProfilePhoto.js";
import { BUSINESS_LOGO_PRODUCTION_API_ORIGIN } from "./businessProfileLogo.js";

export const REQUEST_PHOTO_PURPOSE = "request-photo";
export const REQUEST_PHOTO_MAX_COUNT = 5;

function apiOrigin(apiUrl) {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return "";
  }
}

export function isRequestPhotoUploadEnabled({
  apiUrl = API_URL,
  env = import.meta.env,
} = {}) {
  const explicit = String(
    env?.VITE_ENABLE_REQUEST_PHOTO_MEDIA || ""
  ).trim().toLowerCase();
  const origin = apiOrigin(apiUrl);

  if (origin === BUSINESS_LOGO_PRODUCTION_API_ORIGIN) {
    return explicit === "true";
  }
  if (origin === STAGING_MEDIA_API_ORIGIN) {
    return explicit !== "false";
  }
  return explicit === "true" && env?.DEV === true;
}

function failure(code) {
  return { ok: false, code };
}

export function validateRequestPhotoFile(file) {
  if (!file || typeof file !== "object") return failure("REQUEST_PHOTO_REQUIRED");
  if (!PERSONAL_PROFILE_IMAGE_TYPES.includes(String(file.type || "").toLowerCase())) {
    return failure("REQUEST_PHOTO_FORMAT_INVALID");
  }
  if (!Number.isInteger(file.size) || file.size <= 0) {
    return failure("REQUEST_PHOTO_INVALID");
  }
  if (file.size > PERSONAL_PROFILE_IMAGE_MAX_BYTES) {
    return failure("REQUEST_PHOTO_TOO_LARGE");
  }
  return { ok: true, file };
}

export function validateRequestPhotoFiles(files = [], { existingCount = 0 } = {}) {
  const source = Array.from(files || []);
  if (source.length === 0) return failure("REQUEST_PHOTO_REQUIRED");
  if (source.length + existingCount > REQUEST_PHOTO_MAX_COUNT) {
    return failure("REQUEST_PHOTO_COUNT_EXCEEDED");
  }
  for (const file of source) {
    const result = validateRequestPhotoFile(file);
    if (!result.ok) return result;
  }
  return { ok: true, files: source };
}

export function createTemporaryRequestPhotoPreview(
  file,
  urlApi = globalThis.URL
) {
  if (typeof urlApi?.createObjectURL !== "function") {
    return {
      id: `${file?.name || "request-photo"}-${file?.size || 0}-${Date.now()}`,
      file,
      url: "",
      revoke() {},
    };
  }
  const url = urlApi.createObjectURL(file);
  let revoked = false;
  return {
    id: `${file?.name || "request-photo"}-${file?.size || 0}-${url}`,
    file,
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

export async function requestRequestPhotoUploadSignature({
  file,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  const result = await authFetchImpl(
    "/media/upload-signature",
    {
      method: "POST",
      body: JSON.stringify({
        purpose: REQUEST_PHOTO_PURPOSE,
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

export async function uploadRequestPhotoToCloudinary({
  file,
  signature,
  fetchImpl = globalThis.fetch,
} = {}) {
  const media = await uploadPersonalProfileImageToCloudinary({
    file,
    signature,
    fetchImpl,
  });
  return normalizeCloudinaryUploadResponse(media);
}

export async function cleanupRequestPhoto({
  media,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  if (!media?.public_id) return false;
  const result = await authFetchImpl(
    "/media/request-photo/cleanup",
    {
      method: "POST",
      body: JSON.stringify({
        purpose: REQUEST_PHOTO_PURPOSE,
        media,
      }),
    },
    setPage
  );
  return Boolean(
    result?.response?.ok &&
      result?.data?.success === true &&
      result?.data?.code === "REQUEST_PHOTO_CLEANED"
  );
}

export async function uploadRequestPhotos({
  files = [],
  authFetchImpl = authFetch,
  fetchImpl = globalThis.fetch,
  setPage,
} = {}) {
  const validation = validateRequestPhotoFiles(files);
  if (!validation.ok) return validation;

  const uploaded = [];
  try {
    for (const file of validation.files) {
      const signature = await requestRequestPhotoUploadSignature({
        file,
        authFetchImpl,
        setPage,
      });
      if (!signature) throw new Error("signature_failed");

      const media = await uploadRequestPhotoToCloudinary({
        file,
        signature,
        fetchImpl,
      });
      if (!media) throw new Error("upload_failed");
      uploaded.push(media);
    }

    return {
      ok: true,
      code: "REQUEST_PHOTOS_UPLOADED",
      photos: uploaded,
    };
  } catch {
    await Promise.all(
      uploaded.map((media) =>
        cleanupRequestPhoto({ media, authFetchImpl, setPage })
      )
    );
    return failure("REQUEST_PHOTO_UPLOAD_FAILED");
  }
}
