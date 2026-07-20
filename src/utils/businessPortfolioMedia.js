import API_URL from "../api.js";
import { authFetch } from "./authFetch.js";
import {
  PERSONAL_PROFILE_IMAGE_MAX_BYTES,
  PERSONAL_PROFILE_IMAGE_TYPES,
  STAGING_MEDIA_API_ORIGIN,
  normalizeCloudinaryUploadResponse,
  uploadPersonalProfileImageToCloudinary,
} from "./personalProfilePhoto.js";
import { BUSINESS_LOGO_PRODUCTION_API_ORIGIN } from "./businessProfileLogo.js";

export const BUSINESS_PORTFOLIO_PURPOSE = "business-portfolio";
export const BUSINESS_PORTFOLIO_MAX_COUNT = 12;

function apiOrigin(apiUrl) {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return "";
  }
}

export function isBusinessPortfolioMediaEnabled({
  apiUrl = API_URL,
  env = import.meta.env,
} = {}) {
  const explicit = String(
    env?.VITE_ENABLE_BUSINESS_PORTFOLIO_MEDIA || ""
  ).trim().toLowerCase();
  const origin = apiOrigin(apiUrl);
  if (origin === BUSINESS_LOGO_PRODUCTION_API_ORIGIN) return explicit === "true";
  if (origin === STAGING_MEDIA_API_ORIGIN) return explicit !== "false";
  return explicit === "true" && env?.DEV === true;
}

function failure(code) {
  return { ok: false, code };
}

export function validateBusinessPortfolioFiles(files = [], { existingCount = 0 } = {}) {
  const source = Array.from(files || []);
  if (!source.length) return failure("BUSINESS_PORTFOLIO_MEDIA_REQUIRED");
  if (source.length + existingCount > BUSINESS_PORTFOLIO_MAX_COUNT) {
    return failure("BUSINESS_PORTFOLIO_MEDIA_COUNT_EXCEEDED");
  }
  for (const file of source) {
    if (!PERSONAL_PROFILE_IMAGE_TYPES.includes(String(file?.type || "").toLowerCase())) {
      return failure("BUSINESS_PORTFOLIO_MEDIA_FORMAT_INVALID");
    }
    if (!Number.isInteger(file?.size) || file.size <= 0) {
      return failure("BUSINESS_PORTFOLIO_MEDIA_INVALID");
    }
    if (file.size > PERSONAL_PROFILE_IMAGE_MAX_BYTES) {
      return failure("BUSINESS_PORTFOLIO_MEDIA_TOO_LARGE");
    }
  }
  return { ok: true, files: source };
}

export function reorderBusinessPortfolioMedia(items = [], fromIndex, toIndex) {
  const next = Array.from(items || []);
  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= next.length ||
    toIndex >= next.length ||
    fromIndex === toIndex
  ) {
    return next;
  }
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function createBusinessPortfolioPreview(file, urlApi = globalThis.URL) {
  const url = typeof urlApi?.createObjectURL === "function"
    ? urlApi.createObjectURL(file)
    : "";
  let revoked = false;
  return {
    key: `${file?.name || "portfolio"}-${file?.size || 0}-${url || Date.now()}`,
    file,
    url,
    pending: true,
    revoke() {
      if (revoked) return;
      revoked = true;
      if (url) urlApi?.revokeObjectURL?.(url);
    },
  };
}

export function getBusinessPortfolioEditorMedia(project = {}) {
  const canonical = Array.isArray(project.portfolio_media)
    ? project.portfolio_media
    : [];
  if (canonical.length) {
    return canonical.map((media, index) => ({
      key: media.public_id || media.legacy_url || `portfolio-${index}`,
      url: media.secure_url || media.legacy_url || "",
      media: media.public_id ? { ...media } : null,
      legacyUrl: media.legacy_url || "",
      pending: false,
      revoke() {},
    })).filter((item) => item.url);
  }
  const urls = Array.isArray(project.image_urls)
    ? project.image_urls
    : project.image_url
    ? [project.image_url]
    : [];
  return urls.filter(Boolean).map((url, index) => ({
    key: `legacy-${index}-${url}`,
    url,
    media: null,
    legacyUrl: url,
    pending: false,
    revoke() {},
  }));
}

function successfulData(result, code) {
  if (!result?.response?.ok || result?.data?.success !== true || result?.data?.code !== code) {
    return null;
  }
  return result.data;
}

export async function requestBusinessPortfolioSignature({
  file,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  const result = await authFetchImpl(
    "/media/upload-signature",
    {
      method: "POST",
      body: JSON.stringify({
        purpose: BUSINESS_PORTFOLIO_PURPOSE,
        fileName: file.name,
        contentType: file.type,
        fileSizeBytes: file.size,
      }),
    },
    setPage
  );
  return successfulData(result, "MEDIA_UPLOAD_SIGNATURE_CREATED")?.upload || null;
}

export async function cleanupBusinessPortfolioMedia({
  media,
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  if (!media?.public_id) return false;
  const result = await authFetchImpl(
    "/media/business-portfolio/cleanup",
    {
      method: "POST",
      body: JSON.stringify({ purpose: BUSINESS_PORTFOLIO_PURPOSE, media }),
    },
    setPage
  );
  return Boolean(successfulData(result, "BUSINESS_PORTFOLIO_MEDIA_CLEANED"));
}

export async function uploadBusinessPortfolioFiles({
  files = [],
  authFetchImpl = authFetch,
  fetchImpl = globalThis.fetch,
  setPage,
} = {}) {
  const validation = validateBusinessPortfolioFiles(files);
  if (!validation.ok) return validation;
  const uploaded = [];
  try {
    for (const file of validation.files) {
      const signature = await requestBusinessPortfolioSignature({
        file,
        authFetchImpl,
        setPage,
      });
      if (!signature) throw new Error("signature_failed");
      const response = await uploadPersonalProfileImageToCloudinary({
        file,
        signature,
        fetchImpl,
        purpose: BUSINESS_PORTFOLIO_PURPOSE,
      });
      const media = normalizeCloudinaryUploadResponse(response);
      if (!media) throw new Error("upload_failed");
      uploaded.push(media);
    }
    return { ok: true, code: "BUSINESS_PORTFOLIO_MEDIA_UPLOADED", media: uploaded };
  } catch {
    await Promise.all(uploaded.map((media) => cleanupBusinessPortfolioMedia({
      media,
      authFetchImpl,
      setPage,
    })));
    return failure("BUSINESS_PORTFOLIO_MEDIA_UPLOAD_FAILED");
  }
}

export function toBusinessPortfolioPersistenceItem(item, uploadedMedia) {
  if (item?.pending) return uploadedMedia;
  if (item?.media?.public_id) return item.media;
  if (item?.legacyUrl) return { legacy_url: item.legacyUrl };
  return null;
}
