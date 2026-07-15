const COMPLETED_STATUSES = new Set(["completed", "closed", "history"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasStableRecordId(record) {
  return [
    record.requestId,
    record.jobId,
    record.projectId,
    record.id,
    record.historyId,
  ].some((value) => {
    if (typeof value === "number") return Number.isFinite(value);
    return typeof value === "string" && value.trim().length > 0;
  });
}

function hasCompletionEvidence(record) {
  const status = String(record.status || "").trim().toLowerCase();
  const closureStatus = String(
    record.closureStatus || record.closure_status || ""
  )
    .trim()
    .toLowerCase();

  return Boolean(
    COMPLETED_STATUSES.has(status) ||
      closureStatus === "closed" ||
      record.completedAt ||
      record.closedAt ||
      record.closureDecisionRef
  );
}

export function normalizeCompletedJobRecord(value) {
  if (!isPlainObject(value) || !hasStableRecordId(value) || !hasCompletionEvidence(value)) {
    return null;
  }

  return { ...value };
}

export function getDisplayPhotoUrl(photo) {
  if (typeof photo === "string") return photo.trim();
  if (!isPlainObject(photo)) return "";

  const value =
    photo.dataUrl || photo.url || photo.src || photo.previewUrl || photo.imageUrl;
  return typeof value === "string" ? value.trim() : "";
}

export function getMomentPreviewPhotos(moment, completionPhotos) {
  const safeMoment = isPlainObject(moment) ? moment : {};
  const safeCompletionPhotos = Array.isArray(completionPhotos)
    ? completionPhotos
    : [];
  const photos = [
    safeMoment.coverPhoto,
    ...(Array.isArray(safeMoment.afterPhotos) ? safeMoment.afterPhotos : []),
    ...(Array.isArray(safeMoment.beforePhotos) ? safeMoment.beforePhotos : []),
    ...safeCompletionPhotos,
  ];

  const seen = new Set();
  return photos.filter((photo) => {
    const identity = getDisplayPhotoUrl(photo);
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}
