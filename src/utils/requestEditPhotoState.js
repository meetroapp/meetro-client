import {
  REQUEST_PHOTO_PURPOSE,
  reorderRequestPhotos,
} from "./requestPhotoMedia.js";

export const REQUEST_EDIT_PHOTO_KIND = Object.freeze({
  EXISTING: "existing",
  LOCAL: "local",
  DISPLAY_ONLY: "display-only",
});

export const REQUEST_EDIT_LEGACY_PHOTO_RESOLUTION_REQUIRED =
  "REQUEST_EDIT_LEGACY_PHOTO_RESOLUTION_REQUIRED";

export function isCanonicalRequestPhoto(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      String(value.public_id || "").trim() &&
      String(value.secure_url || "").trim()
  );
}

export function cloneCanonicalRequestPhoto(photo = {}) {
  return {
    ...photo,
    purpose: photo.purpose || REQUEST_PHOTO_PURPOSE,
  };
}

export function getRequestPhotoPreviewUrl(photo = {}) {
  if (typeof photo === "string") return photo;
  return String(photo.previewUrl || photo.secure_url || photo.url || "").trim();
}

function createExistingRequestPhotoItem(photo, index = 0) {
  const media = cloneCanonicalRequestPhoto(photo);
  return {
    id: `existing:${media.public_id}:${index}`,
    kind: REQUEST_EDIT_PHOTO_KIND.EXISTING,
    media,
    previewUrl: media.secure_url,
    displayOnly: false,
  };
}

function createDisplayOnlyRequestPhotoItem(url, index = 0) {
  return {
    id: `display:${index}:${url}`,
    kind: REQUEST_EDIT_PHOTO_KIND.DISPLAY_ONLY,
    previewUrl: url,
    displayOnly: true,
  };
}

export function createLocalRequestPhotoItem(preview = {}) {
  return {
    id: `local:${preview.id || `${preview.file?.name || "photo"}:${Date.now()}`}`,
    kind: REQUEST_EDIT_PHOTO_KIND.LOCAL,
    file: preview.file,
    previewUrl: preview.url || "",
    revoke: typeof preview.revoke === "function" ? preview.revoke : () => {},
    displayOnly: false,
  };
}

export function hydrateRequestEditPhotos(request = {}) {
  const canonicalPhotos = Array.isArray(request.request_photos)
    ? request.request_photos.filter(isCanonicalRequestPhoto)
    : [];

  if (canonicalPhotos.length > 0) {
    return canonicalPhotos.map(createExistingRequestPhotoItem);
  }

  const fallbackUrls = [
    ...(Array.isArray(request.photos) ? request.photos : []),
    request.image_url,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return [...new Set(fallbackUrls)].map(createDisplayOnlyRequestPhotoItem);
}

export function removeRequestEditPhotoAt(photos = [], indexToRemove) {
  if (!Number.isInteger(indexToRemove)) return Array.from(photos || []);
  return Array.from(photos || []).filter((_, index) => index !== indexToRemove);
}

export function reorderRequestEditPhotos(photos = [], index, direction) {
  return reorderRequestPhotos(photos, index, index + direction);
}

export function getPendingLocalRequestPhotoItems(photos = []) {
  return Array.from(photos || []).filter(
    (photo) => photo?.kind === REQUEST_EDIT_PHOTO_KIND.LOCAL
  );
}

export function buildRequestPhotoReplacementPayload(
  photos = [],
  { uploadedMediaByItemId = new Map() } = {}
) {
  const uploadedMediaLookup =
    uploadedMediaByItemId instanceof Map
      ? uploadedMediaByItemId
      : new Map(Object.entries(uploadedMediaByItemId || {}));
  const replacement = [];

  for (const photo of Array.from(photos || [])) {
    if (photo?.displayOnly) {
      return {
        ok: false,
        code: REQUEST_EDIT_LEGACY_PHOTO_RESOLUTION_REQUIRED,
      };
    }

    let media = photo?.media;
    if (photo?.kind === REQUEST_EDIT_PHOTO_KIND.LOCAL) {
      media = uploadedMediaLookup.get(photo.id);
    }

    if (!isCanonicalRequestPhoto(media)) {
      return {
        ok: false,
        code: "REQUEST_EDIT_PHOTO_METADATA_REQUIRED",
      };
    }

    replacement.push({
      purpose: REQUEST_PHOTO_PURPOSE,
      media: cloneCanonicalRequestPhoto(media),
      display_order: replacement.length,
    });
  }

  return {
    ok: true,
    request_photos: replacement,
  };
}

export function revokeLocalRequestEditPhotoPreviews(photos = []) {
  for (const photo of Array.from(photos || [])) {
    if (photo?.kind === REQUEST_EDIT_PHOTO_KIND.LOCAL) {
      photo.revoke?.();
    }
  }
}
