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

export const QUOTE_DRAFT_PHOTO_PURPOSE = "quote-draft-photo";
export const QUOTE_DRAFT_PHOTO_MAX_COUNT = 5;

function apiOrigin(apiUrl) {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return "";
  }
}

export function isQuickQuoteDraftPhotoUploadEnabled({
  apiUrl = API_URL,
  env = import.meta.env,
} = {}) {
  const explicit = String(
    env?.VITE_ENABLE_QUICK_QUOTE_DRAFT_MEDIA || ""
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

export function validateQuoteDraftPhotoFile(file) {
  if (!file || typeof file !== "object") {
    return failure("QUOTE_DRAFT_PHOTO_REQUIRED");
  }

  if (
    !PERSONAL_PROFILE_IMAGE_TYPES.includes(
      String(file.type || "").toLowerCase()
    )
  ) {
    return failure("QUOTE_DRAFT_PHOTO_FORMAT_INVALID");
  }

  if (!Number.isInteger(file.size) || file.size <= 0) {
    return failure("QUOTE_DRAFT_PHOTO_INVALID");
  }

  if (file.size > PERSONAL_PROFILE_IMAGE_MAX_BYTES) {
    return failure("QUOTE_DRAFT_PHOTO_TOO_LARGE");
  }

  return { ok: true, file };
}

export function validateQuoteDraftPhotoFiles(
  files = [],
  { existingCount = 0 } = {}
) {
  const source = Array.from(files || []);

  if (source.length === 0) {
    return failure("QUOTE_DRAFT_PHOTO_REQUIRED");
  }

  if (
    source.length + existingCount >
    QUOTE_DRAFT_PHOTO_MAX_COUNT
  ) {
    return failure("QUOTE_DRAFT_PHOTO_COUNT_EXCEEDED");
  }

  for (const file of source) {
    const result = validateQuoteDraftPhotoFile(file);
    if (!result.ok) return result;
  }

  return { ok: true, files: source };
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

export async function requestQuoteDraftPhotoUploadSignature({
  file,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  const result = await authFetchImpl(
    "/media/upload-signature",
    {
      method: "POST",
      body: JSON.stringify({
        purpose: QUOTE_DRAFT_PHOTO_PURPOSE,
        fileName: file.name,
        contentType: file.type,
        fileSizeBytes: file.size,
      }),
    },
    setPage
  );

  const data = getSuccessfulData(
    result,
    "MEDIA_UPLOAD_SIGNATURE_CREATED"
  );

  return data?.upload || null;
}

export async function uploadQuoteDraftPhotoToCloudinary({
  file,
  signature,
  fetchImpl = globalThis.fetch,
} = {}) {
  const media = await uploadPersonalProfileImageToCloudinary({
    file,
    signature,
    fetchImpl,
    purpose: QUOTE_DRAFT_PHOTO_PURPOSE,
  });

  return normalizeCloudinaryUploadResponse(media);
}

export async function cleanupQuoteDraftPhoto({
  media,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  if (!media?.public_id) return false;

  const result = await authFetchImpl(
    "/media/quote-draft-photo/cleanup",
    {
      method: "POST",
      body: JSON.stringify({
        purpose: QUOTE_DRAFT_PHOTO_PURPOSE,
        media,
      }),
    },
    setPage
  );

  return Boolean(
    result?.response?.ok &&
      result?.data?.success === true &&
      result?.data?.code === "QUOTE_DRAFT_PHOTO_CLEANED"
  );
}

export async function uploadQuoteDraftPhotos({
  files = [],
  existingCount = 0,
  authFetchImpl = authFetch,
  fetchImpl = globalThis.fetch,
  setPage,
} = {}) {
  const validation = validateQuoteDraftPhotoFiles(files, {
    existingCount,
  });

  if (!validation.ok) return validation;

  const uploaded = [];

  try {
    for (const file of validation.files) {
      const signature =
        await requestQuoteDraftPhotoUploadSignature({
          file,
          authFetchImpl,
          setPage,
        });

      if (!signature) {
        throw new Error("signature_failed");
      }

      const media = await uploadQuoteDraftPhotoToCloudinary({
        file,
        signature,
        fetchImpl,
      });

      if (!media) {
        throw new Error("upload_failed");
      }

      uploaded.push(media);
    }

    return {
      ok: true,
      code: "QUOTE_DRAFT_PHOTOS_UPLOADED",
      photos: uploaded,
    };
  } catch {
    await Promise.all(
      uploaded.map((media) =>
        cleanupQuoteDraftPhoto({
          media,
          authFetchImpl,
          setPage,
        })
      )
    );

    return failure("QUOTE_DRAFT_PHOTO_UPLOAD_FAILED");
  }
}
