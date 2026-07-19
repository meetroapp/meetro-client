import { authFetch } from "./authFetch.js";
import API_URL from "../api.js";
import {
  PERSONAL_PROFILE_IMAGE_MAX_BYTES,
  PERSONAL_PROFILE_IMAGE_TYPES,
  STAGING_MEDIA_API_ORIGIN,
  normalizeCloudinaryUploadResponse,
  uploadPersonalProfileImageToCloudinary,
} from "./personalProfilePhoto.js";

export const BUSINESS_LOGO_PURPOSE = "business-logo";
export const BUSINESS_LOGO_PRODUCTION_API_ORIGIN =
  "https://athletic-rebirth-production-0a28.up.railway.app";

function apiOrigin(apiUrl) {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return "";
  }
}

export function isBusinessLogoUploadEnabled({
  apiUrl = API_URL,
  env = import.meta.env,
} = {}) {
  const explicit = String(
    env?.VITE_ENABLE_BUSINESS_LOGO_MEDIA || ""
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

export function validateBusinessLogoFile(file) {
  if (!file || typeof file !== "object") return failure("BUSINESS_LOGO_REQUIRED");
  if (!PERSONAL_PROFILE_IMAGE_TYPES.includes(String(file.type || "").toLowerCase())) {
    return failure("BUSINESS_LOGO_FORMAT_INVALID");
  }
  if (!Number.isInteger(file.size) || file.size <= 0) {
    return failure("BUSINESS_LOGO_INVALID");
  }
  if (file.size > PERSONAL_PROFILE_IMAGE_MAX_BYTES) {
    return failure("BUSINESS_LOGO_TOO_LARGE");
  }
  return { ok: true, file };
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

export async function requestBusinessLogoUploadSignature({
  file,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  const result = await authFetchImpl(
    "/media/upload-signature",
    {
      method: "POST",
      body: JSON.stringify({
        purpose: BUSINESS_LOGO_PURPOSE,
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

export async function persistBusinessLogo({
  media,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  const result = await authFetchImpl(
    "/contractor-profile/logo",
    {
      method: "PUT",
      body: JSON.stringify({
        purpose: BUSINESS_LOGO_PURPOSE,
        media,
      }),
    },
    setPage
  );
  const data = getSuccessfulData(result, "BUSINESS_LOGO_UPDATED");
  return data?.profile || null;
}

export async function uploadBusinessProfileLogo({
  file,
  authFetchImpl = authFetch,
  fetchImpl = globalThis.fetch,
  setPage,
} = {}) {
  const validation = validateBusinessLogoFile(file);
  if (!validation.ok) return validation;

  try {
    const signature = await requestBusinessLogoUploadSignature({
      file,
      authFetchImpl,
      setPage,
    });
    if (!signature) return failure("BUSINESS_LOGO_UPLOAD_FAILED");

    const media = await uploadPersonalProfileImageToCloudinary({
      file,
      signature,
      fetchImpl,
    });
    const normalizedMedia = normalizeCloudinaryUploadResponse(media);
    if (!normalizedMedia) return failure("BUSINESS_LOGO_UPLOAD_FAILED");

    const profile = await persistBusinessLogo({
      media: normalizedMedia,
      authFetchImpl,
      setPage,
    });
    if (!profile?.image_url) return failure("BUSINESS_LOGO_SAVE_FAILED");

    const refreshed = await authFetchImpl(
      "/my-contractor-profile",
      { cache: "no-store" },
      setPage
    );
    const canonicalProfile = refreshed?.response?.ok && refreshed?.data?.profile
      ? refreshed.data.profile
      : profile;

    return {
      ok: true,
      code: "BUSINESS_LOGO_UPDATED",
      profile: canonicalProfile,
      media: normalizedMedia,
    };
  } catch {
    return failure("BUSINESS_LOGO_UPLOAD_FAILED");
  }
}
