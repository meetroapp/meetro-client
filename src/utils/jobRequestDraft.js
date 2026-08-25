import { buildCanonicalJobRequestPayload as buildSubmissionPayload } from "./jobRequestSubmissionIntent.js";
import { buildRequestMatchingFields } from "./requestMatchingFields.js";
import { isCanonicalRequestServiceLocationComplete } from "./requestHelpSubmission.js";

export const JOB_REQUEST_DRAFT_KEY = "meetroJobRequestDraft";
export const JOB_REQUEST_DRAFT_VERSION = 2;

export const JOB_REQUEST_LOCATION_INTAKE_MODE = Object.freeze({
  EXACT_ON_FILE: "exact_on_file",
  ADDRESS_AFTER_SELECTION: "address_after_selection",
});

export const JOB_REQUEST_DRAFT_STAGE = Object.freeze({
  EMPTY: "empty",
  IN_PROGRESS: "in_progress",
  READY_FOR_REVIEW: "ready_for_review",
  REVIEWING: "reviewing",
  SUBMISSION_PENDING: "submission_pending",
});

export const JOB_REQUEST_DRAFT_SOURCE = Object.freeze({
  HOMEOWNER: "user_entered",
  USER_ENTERED: "user_entered",
  ASSISTANT: "assistant_suggested",
  ASSISTANT_SUGGESTED: "assistant_suggested",
  ASSISTANT_INFERRED: "assistant_inferred",
  SYSTEM: "system_derived",
  SYSTEM_DERIVED: "system_derived",
  LEGACY_PREFILL: "legacy_migrated",
  LEGACY_MIGRATED: "legacy_migrated",
});

export const JOB_REQUEST_DRAFT_UNCERTAINTY = Object.freeze({
  KNOWN: "known",
  APPROXIMATE: "approximate",
  UNCERTAIN: "uncertain",
  ASSISTANT_SUGGESTED: "assistant_suggested",
});

function nowIso() {
  return new Date().toISOString();
}

function createLocalDraftId({ cryptoImpl = globalThis.crypto } = {}) {
  if (cryptoImpl?.randomUUID) return `draft_${cryptoImpl.randomUUID()}`;
  if (cryptoImpl?.getRandomValues) {
    const bytes = new Uint8Array(8);
    cryptoImpl.getRandomValues(bytes);
    return `draft_${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
  }
  return `draft_${Date.now().toString(36)}`;
}

function cleanText(value = "") {
  return String(value || "").trim();
}

function normalizeCountryCode(value = "") {
  return cleanText(value).toUpperCase() || "US";
}

function normalizeLocationIntakeMode(value = "") {
  return Object.values(JOB_REQUEST_LOCATION_INTAKE_MODE).includes(cleanText(value))
    ? cleanText(value)
    : JOB_REQUEST_LOCATION_INTAKE_MODE.EXACT_ON_FILE;
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cloneDraft(draft) {
  const copy = JSON.parse(JSON.stringify({ ...draft, media: { photos: [] } }));
  copy.media = {
    ...(copy.media || {}),
    photos: (draft.media?.photos || []).map((photo) => ({ ...photo })),
  };
  return copy;
}

function fieldMeta(source = JOB_REQUEST_DRAFT_SOURCE.SYSTEM, confirmed = false, uncertainty = JOB_REQUEST_DRAFT_UNCERTAINTY.KNOWN) {
  return {
    source,
    provenance: source,
    confirmed,
    uncertainty,
    updatedAt: nowIso(),
  };
}

function hasMeaningfulDraftContent(draft = {}) {
  return Boolean(
    cleanText(draft.job?.title) ||
    cleanText(draft.job?.description) ||
    cleanText(draft.service?.category) ||
    cleanText(draft.service?.specialty) ||
    cleanText(draft.location?.serviceAddress) ||
    cleanText(draft.location?.city) ||
    cleanText(draft.location?.region) ||
    cleanText(draft.location?.postalCode) ||
    cleanText(draft.location?.unitNumber) ||
    cleanText(draft.location?.accessNotes) ||
    cleanText(draft.location?.affectedArea) ||
    cleanText(draft.timing?.urgency) ||
    cleanText(draft.timing?.desiredTiming) ||
    cleanText(draft.timing?.availability) ||
    cleanText(draft.details?.measurements) ||
    cleanText(draft.details?.expectations) ||
    cleanText(draft.details?.additionalNotes) ||
    (draft.media?.photos || []).length > 0
  );
}

export function createJobRequestDraft({
  draftId,
  createdAt = nowIso(),
  updatedAt = createdAt,
  initialLocation = "",
  initialCity = "",
  initialRegion = "",
  initialPostalCode = "",
  initialCountryCode = "US",
} = {}) {
  const draft = {
    version: JOB_REQUEST_DRAFT_VERSION,
    localDraftId: draftId || createLocalDraftId(),
    createdAt,
    updatedAt,
    stage: JOB_REQUEST_DRAFT_STAGE.EMPTY,
    job: {
      title: "",
      description: "",
    },
    service: {
      category: "",
      customCategory: "",
      requestCategory: "",
      domain: "",
      specialty: "",
      selectedServiceOptionId: "",
      displayLabel: "",
    },
    location: {
      intakeMode: JOB_REQUEST_LOCATION_INTAKE_MODE.EXACT_ON_FILE,
      serviceAddress: cleanText(initialLocation),
      city: cleanText(initialCity),
      region: cleanText(initialRegion),
      postalCode: cleanText(initialPostalCode),
      countryCode: normalizeCountryCode(initialCountryCode),
      affectedArea: "",
      unitNumber: "",
      accessNotes: "",
    },
    timing: {
      urgency: "",
      desiredTiming: "",
      availability: "",
    },
    details: {
      measurements: "",
      expectations: "",
      additionalNotes: "",
    },
    media: {
      photos: [],
    },
    provenance: {
      sources: [],
      assistantDraft: null,
    },
    fieldMeta: {},
    uncertainty: {},
    readiness: {
      ready: false,
      missing: ["title", "service", "location"],
    },
    submission: {
      intentKey: "",
      snapshot: null,
      status: "idle",
    },
  };
  draft.readiness = getJobRequestDraftReadiness(draft);
  return draft;
}

function setPath(target, path, value) {
  const keys = Array.isArray(path) ? path : String(path).split(".");
  let cursor = target;
  keys.slice(0, -1).forEach((key) => {
    if (!isPlainObject(cursor[key])) cursor[key] = {};
    cursor = cursor[key];
  });
  cursor[keys.at(-1)] = value;
}

function getPath(target, path) {
  return String(path).split(".").reduce((cursor, key) => cursor?.[key], target);
}

function markMeta(draft, path, meta) {
  setPath(draft.fieldMeta, path, {
    ...fieldMeta(),
    ...getPath(draft.fieldMeta, path),
    ...meta,
    provenance: meta.provenance || meta.source,
    updatedAt: nowIso(),
  });
}

function getFieldMeta(draft = {}, path = "") {
  return getPath(draft.fieldMeta, path) || fieldMeta();
}

function isRequiredFieldUncertain(draft, path) {
  const meta = getFieldMeta(draft, path);
  return meta.uncertainty === JOB_REQUEST_DRAFT_UNCERTAINTY.UNCERTAIN;
}

function isFieldUnconfirmed(draft, path) {
  const meta = getFieldMeta(draft, path);
  return Boolean(cleanText(getPath(draft, path)) && meta.confirmed === false);
}

function deriveStage(draft) {
  if (draft.submission?.status === "pending" || draft.submission?.snapshot) {
    return JOB_REQUEST_DRAFT_STAGE.SUBMISSION_PENDING;
  }
  const readiness = getJobRequestDraftReadiness(draft);
  if (draft.stage === JOB_REQUEST_DRAFT_STAGE.REVIEWING && readiness.ready) {
    return JOB_REQUEST_DRAFT_STAGE.REVIEWING;
  }
  if (readiness.ready) return JOB_REQUEST_DRAFT_STAGE.READY_FOR_REVIEW;
  return hasMeaningfulDraftContent(draft)
    ? JOB_REQUEST_DRAFT_STAGE.IN_PROGRESS
    : JOB_REQUEST_DRAFT_STAGE.EMPTY;
}

function finalizeDraft(draft) {
  draft.updatedAt = nowIso();
  draft.readiness = getJobRequestDraftReadiness(draft);
  draft.stage = deriveStage(draft);
  return draft;
}

export function updateDraftField(
  draft,
  path,
  value,
  {
    source = JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER,
    confirmed = source === JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER,
    uncertainty = JOB_REQUEST_DRAFT_UNCERTAINTY.KNOWN,
  } = {}
) {
  const next = cloneDraft(draft);
  setPath(next, path, value);
  markMeta(next, path, { source, confirmed, uncertainty });
  return finalizeDraft(next);
}

export function applyHomeownerInput(draft, fields = {}) {
  return Object.entries(fields).reduce(
    (current, [path, value]) =>
      updateDraftField(current, path, value, {
        source: JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER,
        confirmed: true,
        uncertainty: JOB_REQUEST_DRAFT_UNCERTAINTY.KNOWN,
      }),
    draft
  );
}

export function setJobRequestLocationIntakeMode(draft, intakeMode) {
  const mode = normalizeLocationIntakeMode(intakeMode);
  let next = updateDraftField(draft, "location.intakeMode", mode, {
    source: JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER,
    confirmed: true,
    uncertainty: JOB_REQUEST_DRAFT_UNCERTAINTY.KNOWN,
  });

  if (mode === JOB_REQUEST_LOCATION_INTAKE_MODE.ADDRESS_AFTER_SELECTION) {
    next = applyHomeownerInput(next, {
      "location.serviceAddress": "",
      "location.unitNumber": "",
    });
  }

  return next;
}

export function applyAssistantSuggestion(draft, fields = {}) {
  return Object.entries(fields).reduce((current, [path, value]) => {
    const meta = getPath(current.fieldMeta, path);
    const existing = cleanText(getPath(current, path));
    if (meta?.confirmed || existing) return current;
    return updateDraftField(current, path, value, {
      source: JOB_REQUEST_DRAFT_SOURCE.ASSISTANT,
      confirmed: false,
      uncertainty: JOB_REQUEST_DRAFT_UNCERTAINTY.ASSISTANT_SUGGESTED,
    });
  }, draft);
}

export function applyAssistantInference(draft, fields = {}) {
  return Object.entries(fields).reduce((current, [path, value]) => {
    const meta = getPath(current.fieldMeta, path);
    if (meta?.confirmed) return current;
    return updateDraftField(current, path, value, {
      source: JOB_REQUEST_DRAFT_SOURCE.ASSISTANT_INFERRED,
      confirmed: false,
      uncertainty: JOB_REQUEST_DRAFT_UNCERTAINTY.APPROXIMATE,
    });
  }, draft);
}

export function confirmDraftField(draft, path) {
  const next = cloneDraft(draft);
  markMeta(next, path, {
    source: JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER,
    confirmed: true,
    uncertainty: JOB_REQUEST_DRAFT_UNCERTAINTY.KNOWN,
  });
  return finalizeDraft(next);
}

export function setServiceClassification(
  draft,
  {
    category = "",
    customCategory = "",
    requestCategory = "",
    domain = "",
    specialty = "",
    selectedServiceOptionId = "",
    displayLabel = "",
  } = {},
  {
    source = JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER,
    confirmed = source === JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER,
  } = {}
) {
  let next = cloneDraft(draft);
  next.service = {
    ...next.service,
    category,
    customCategory,
    requestCategory,
    domain,
    specialty,
    selectedServiceOptionId,
    displayLabel,
  };
  ["category", "customCategory", "requestCategory", "domain", "specialty", "selectedServiceOptionId"].forEach(
    (field) => markMeta(next, `service.${field}`, {
      source,
      confirmed,
      uncertainty: confirmed
        ? JOB_REQUEST_DRAFT_UNCERTAINTY.KNOWN
        : JOB_REQUEST_DRAFT_UNCERTAINTY.ASSISTANT_SUGGESTED,
    })
  );
  return finalizeDraft(next);
}

export function setBroadRequestCategory(draft, requestCategory = "") {
  const nextCategory = cleanText(requestCategory);
  const categoryChanged = nextCategory !== cleanText(draft.service?.requestCategory);
  let next = draft;

  if (categoryChanged && cleanText(draft.service?.specialty)) {
    next = setServiceClassification(
      draft,
      {
        category: nextCategory,
        requestCategory: nextCategory,
      },
      {
        source: JOB_REQUEST_DRAFT_SOURCE.SYSTEM_DERIVED,
        confirmed: false,
      }
    );
  }

  return applyHomeownerInput(next, {
    "service.category": nextCategory,
    "service.requestCategory": nextCategory,
  });
}

export function addDraftPhotos(draft, photos = [], source = JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER) {
  const next = cloneDraft(draft);
  const existing = next.media?.photos || [];
  next.media = {
    ...next.media,
    photos: [
      ...existing,
      ...photos.map((photo, index) => ({
        localPhotoId: photo.localPhotoId || createLocalDraftId(),
        previewUrl: photo.previewUrl || photo.url || "",
        file: photo.file,
        revoke: photo.revoke,
        uploadState: photo.uploadState || "local",
        uploadedMedia: photo.uploadedMedia || null,
        order: existing.length + index,
        source,
      })),
    ],
  };
  return finalizeDraft(next);
}

export function removeDraftPhoto(draft, indexToRemove) {
  const next = cloneDraft(draft);
  next.media.photos = (next.media?.photos || [])
    .filter((_, index) => index !== indexToRemove)
    .map((photo, index) => ({ ...photo, order: index }));
  return finalizeDraft(next);
}

export function reorderDraftPhotos(draft, fromIndex, toIndex) {
  const photos = [...(draft.media?.photos || [])];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= photos.length ||
    toIndex >= photos.length
  ) {
    return draft;
  }
  const [moved] = photos.splice(fromIndex, 1);
  photos.splice(toIndex, 0, moved);
  const next = cloneDraft(draft);
  next.media.photos = photos.map((photo, index) => ({ ...photo, order: index }));
  return finalizeDraft(next);
}

export function setDraftUploadedMedia(draft, uploadedMedia = []) {
  const next = cloneDraft(draft);
  next.media.photos = (next.media?.photos || []).map((photo, index) => ({
    ...photo,
    uploadState: uploadedMedia[index] ? "uploaded" : photo.uploadState,
    uploadedMedia: uploadedMedia[index] || photo.uploadedMedia || null,
  }));
  return finalizeDraft(next);
}

export function setDraftSubmissionIntent(draft, intentKey) {
  const next = cloneDraft(draft);
  next.submission = {
    ...next.submission,
    intentKey,
    status: intentKey ? "pending" : "idle",
  };
  return finalizeDraft(next);
}

export function setDraftSubmissionSnapshot(draft, snapshot) {
  const next = cloneDraft(draft);
  next.submission = {
    ...next.submission,
    snapshot,
    status: snapshot ? "pending" : next.submission?.status || "idle",
  };
  return finalizeDraft(next);
}

export function clearDraftSubmission(draft) {
  const next = cloneDraft(draft);
  next.submission = {
    intentKey: "",
    snapshot: null,
    status: "idle",
  };
  return finalizeDraft(next);
}

export function resetJobRequestDraft(options = {}) {
  return createJobRequestDraft(options);
}

function contextLine(label, value) {
  const text = cleanText(value);
  return text ? `${label}: ${text}` : "";
}

export function assembleDraftDescription(draft = {}) {
  const description = cleanText(draft.job?.description);
  const context = [
    contextLine("Affected area", draft.location?.affectedArea),
    contextLine("Urgency", draft.timing?.urgency),
    contextLine("Desired timing", draft.timing?.desiredTiming),
    contextLine("Availability", draft.timing?.availability),
    contextLine("Measurements", draft.details?.measurements),
    contextLine("Expectations", draft.details?.expectations),
    contextLine("Additional notes", draft.details?.additionalNotes),
  ].filter((line) => {
    if (!description) return true;
    return !description.toLowerCase().includes(line.split(":").slice(1).join(":").trim().toLowerCase());
  });

  if (context.length === 0) return description;
  return [description, "Additional request context:", ...context].filter(Boolean).join("\n");
}

export function getJobRequestDraftReadiness(draft = {}) {
  const selectedCategory = cleanText(
    draft.service?.category === "other"
      ? draft.service?.customCategory || "other"
      : draft.service?.category
  );
  const matchingFields = {
    serviceDomain: cleanText(draft.service?.domain),
    serviceSpecialty: cleanText(draft.service?.specialty),
  };
  const missing = [];
  if (!cleanText(draft.job?.title)) missing.push("title");
  if (!selectedCategory || !matchingFields.serviceDomain || !matchingFields.serviceSpecialty) {
    missing.push("service");
  }
  const intakeMode = cleanText(draft.location?.intakeMode);
  const exactAddressRequired =
    intakeMode === JOB_REQUEST_LOCATION_INTAKE_MODE.EXACT_ON_FILE;
  const locationComplete = isCanonicalRequestServiceLocationComplete({
    intakeMode,
    addressLine1: draft.location?.serviceAddress,
    city: draft.location?.city,
    region: draft.location?.region,
    postalCode: draft.location?.postalCode,
    countryCode: draft.location?.countryCode,
    unitNumber: draft.location?.unitNumber,
  });
  if (!locationComplete) missing.push("location");
  const uncertainRequiredFields = [];
  if (isRequiredFieldUncertain(draft, "job.title")) uncertainRequiredFields.push("title");
  if (
    isRequiredFieldUncertain(draft, "service.category") ||
    isRequiredFieldUncertain(draft, "service.domain") ||
    isRequiredFieldUncertain(draft, "service.specialty") ||
    isFieldUnconfirmed(draft, "service.specialty")
  ) {
    uncertainRequiredFields.push("service");
  }
  if (
    (exactAddressRequired &&
      isRequiredFieldUncertain(draft, "location.serviceAddress")) ||
    ["city", "region", "postalCode", "countryCode"].some((field) =>
      isRequiredFieldUncertain(draft, `location.${field}`)
    )
  ) {
    uncertainRequiredFields.push("location");
  }
  const warnings = [];
  if (isFieldUnconfirmed(draft, "service.specialty")) {
    warnings.push({
      code: "service_unconfirmed",
      field: "service",
      messageKey: "jobRequestDraftWarningServiceUnconfirmed",
    });
  }
  if (!cleanText(draft.job?.description)) {
    warnings.push({
      code: "description_missing",
      field: "description",
      messageKey: "jobRequestDraftWarningDescriptionMissing",
    });
  }
  if (
    !cleanText(draft.timing?.desiredTiming) &&
    !cleanText(draft.timing?.urgency) &&
    !cleanText(draft.timing?.availability)
  ) {
    warnings.push({
      code: "timing_missing",
      field: "timing",
      messageKey: "jobRequestDraftWarningTimingMissing",
    });
  }
  if ((draft.media?.photos || []).length === 0) {
    warnings.push({
      code: "photos_optional",
      field: "photos",
      messageKey: "jobRequestDraftWarningPhotosHelpful",
    });
  }
  const nextRecommendedPrompt = getJobRequestDraftGuidance({
    draft,
    missingRequiredFields: missing,
    uncertainRequiredFields,
    warnings,
  });
  const isReady = missing.length === 0 && uncertainRequiredFields.length === 0;
  return {
    isReady,
    ready: isReady,
    readyForReview: isReady,
    readyForSubmit: isReady,
    missingRequiredFields: missing,
    missing,
    uncertainRequiredFields,
    warnings,
    nextRecommendedPrompt,
  };
}

export function getJobRequestDraftGuidance({
  draft = {},
  missingRequiredFields,
  uncertainRequiredFields,
  warnings,
} = {}) {
  const computedReadiness =
    missingRequiredFields && uncertainRequiredFields && warnings
      ? null
      : getJobRequestDraftReadiness(draft);
  const missing = missingRequiredFields || computedReadiness.missingRequiredFields;
  const uncertain = uncertainRequiredFields || computedReadiness.uncertainRequiredFields;
  const draftWarnings = warnings || computedReadiness.warnings;
  if (missing.includes("service")) {
    return {
      code: "clarify_service",
      field: "service",
      priority: "required",
      messageKey: "jobRequestDraftGuidanceService",
    };
  }
  if (missing.includes("title")) {
    return {
      code: "add_title",
      field: "title",
      priority: "required",
      messageKey: "jobRequestDraftGuidanceJobTitle",
    };
  }
  if (missing.includes("location")) {
    return {
      code: "add_location",
      field: "location",
      priority: "required",
      messageKey: "jobRequestDraftGuidanceLocation",
    };
  }
  if (uncertain.includes("service")) {
    return {
      code: "confirm_service",
      field: "service",
      priority: "required",
      messageKey: "jobRequestDraftGuidanceConfirmService",
    };
  }
  if (!cleanText(draft.job?.description)) {
    return {
      code: "add_description",
      field: "description",
      priority: "recommended",
      messageKey: "jobRequestDraftGuidanceDescription",
    };
  }
  if (!cleanText(draft.timing?.desiredTiming) && !cleanText(draft.timing?.urgency)) {
    return {
      code: "add_timing",
      field: "timing",
      priority: "recommended",
      messageKey: "jobRequestDraftGuidanceTiming",
    };
  }
  if (draftWarnings.some((warning) => warning.code === "photos_optional")) {
    return {
      code: "add_photos",
      field: "photos",
      priority: "optional",
      messageKey: "jobRequestDraftGuidancePhotos",
    };
  }
  return {
    code: "ready_for_review",
    field: "review",
    priority: "ready",
    messageKey: "jobRequestDraftGuidanceReady",
  };
}

export function buildJobRequestDraftCanonicalPayload(draft = {}, { requestPhotoPayload } = {}) {
  const selectedCategory =
    draft.service?.category === "other"
      ? cleanText(draft.service?.customCategory) || "other"
      : cleanText(draft.service?.category);
  const inferred = buildRequestMatchingFields({
    title: draft.job?.title,
    description: assembleDraftDescription(draft),
    category: selectedCategory,
    location: formatJobRequestDraftServiceLocation(draft),
  });
  const requestMatchingFields = {
    ...inferred,
    requestCategory: cleanText(draft.service?.requestCategory) || inferred.requestCategory,
    service_domain: cleanText(draft.service?.domain) || inferred.service_domain,
    service_specialty: cleanText(draft.service?.specialty) || inferred.service_specialty,
  };

  return buildSubmissionPayload({
    title: draft.job?.title,
    description: assembleDraftDescription(draft),
    category: selectedCategory,
    requestMatchingFields,
    serviceLocation: {
      intakeMode: draft.location?.intakeMode,
      addressLine1: draft.location?.serviceAddress,
      city: draft.location?.city,
      region: draft.location?.region,
      postalCode: draft.location?.postalCode,
      countryCode: draft.location?.countryCode,
      unitNumber: draft.location?.unitNumber,
      accessNotes: draft.location?.accessNotes,
    },
    requestPhotoPayload: requestPhotoPayload || [],
  });
}

export function formatJobRequestDraftServiceLocation(draft = {}) {
  const location = draft.location || {};
  const locality = formatJobRequestDraftServiceArea(draft);
  return [cleanText(location.serviceAddress), locality]
    .filter(Boolean)
    .join(", ");
}

export function formatJobRequestDraftServiceArea(draft = {}) {
  const location = draft.location || {};
  return [
    [cleanText(location.city), cleanText(location.region)].filter(Boolean).join(", "),
    cleanText(location.postalCode),
  ].filter(Boolean).join(" ");
}

export function buildJobRequestReviewModel(draft = {}) {
  const readiness = getJobRequestDraftReadiness(draft);
  const locationIntakeMode = normalizeLocationIntakeMode(draft.location?.intakeMode);
  const locationValue = locationIntakeMode === JOB_REQUEST_LOCATION_INTAKE_MODE.EXACT_ON_FILE
    ? formatJobRequestDraftServiceLocation(draft)
    : formatJobRequestDraftServiceArea(draft);
  const item = ({ id, labelKey, value, valueKey = "", fieldPath, required = false }) => {
    const meta = getFieldMeta(draft, fieldPath);
    return {
      id,
      labelKey,
      value: cleanText(value),
      valueKey,
      required,
      missing: required && !cleanText(value),
      confirmed: meta.confirmed === true,
      provenance: meta.provenance || meta.source,
      uncertainty: meta.uncertainty,
      editTarget: id,
    };
  };
  return {
    localDraftId: draft.localDraftId,
    stage: draft.stage,
    title: cleanText(draft.job?.title),
    description: assembleDraftDescription(draft),
    service: {
      category: cleanText(draft.service?.category),
      requestCategory: cleanText(draft.service?.requestCategory),
      domain: cleanText(draft.service?.domain),
      specialty: cleanText(draft.service?.specialty),
      label: cleanText(draft.service?.displayLabel),
    },
    location: {
      serviceAddress: cleanText(draft.location?.serviceAddress),
      formattedAddress: locationValue,
      serviceArea: formatJobRequestDraftServiceArea(draft),
      intakeMode: locationIntakeMode,
      city: cleanText(draft.location?.city),
      region: cleanText(draft.location?.region),
      postalCode: cleanText(draft.location?.postalCode),
      countryCode: cleanText(draft.location?.countryCode),
      affectedArea: cleanText(draft.location?.affectedArea),
      unitNumber: cleanText(draft.location?.unitNumber),
      accessNotes: cleanText(draft.location?.accessNotes),
    },
    timing: { ...draft.timing },
    details: { ...draft.details },
    photos: (draft.media?.photos || []).map((photo) => {
      const safePhoto = { ...photo };
      delete safePhoto.file;
      delete safePhoto.revoke;
      return safePhoto;
    }),
    readiness,
    guidance: readiness.nextRecommendedPrompt,
    sections: [
      {
        id: "work",
        labelKey: "jobRequestDraftReviewWork",
        items: [
          item({
            id: "title",
            labelKey: "projectTitle",
            value: draft.job?.title,
            fieldPath: "job.title",
            required: true,
          }),
          item({
            id: "description",
            labelKey: "projectDescription",
            value: assembleDraftDescription(draft),
            fieldPath: "job.description",
          }),
        ],
      },
      {
        id: "service",
        labelKey: "jobRequestDraftReviewService",
        items: [
          item({
            id: "service",
            labelKey: "requestMatchLabel",
            value: draft.service?.displayLabel || draft.service?.specialty,
            fieldPath: "service.specialty",
            required: true,
          }),
        ],
      },
      {
        id: "location",
        labelKey: "jobRequestDraftReviewLocation",
        items: [
          item({
            id: "location",
            labelKey:
              locationIntakeMode === JOB_REQUEST_LOCATION_INTAKE_MODE.EXACT_ON_FILE
                ? "jobRequestReviewServiceLocation"
                : "jobRequestReviewServiceArea",
            value: locationValue,
            fieldPath:
              locationIntakeMode === JOB_REQUEST_LOCATION_INTAKE_MODE.EXACT_ON_FILE
                ? "location.serviceAddress"
                : "location.city",
            required: true,
          }),
          ...(locationIntakeMode === JOB_REQUEST_LOCATION_INTAKE_MODE.ADDRESS_AFTER_SELECTION
            ? [
                item({
                  id: "address_after_selection",
                  labelKey: "jobRequestReviewAddressAfterSelection",
                  valueKey: "jobRequestReviewAddressAfterSelection",
                  fieldPath: "location.intakeMode",
                }),
              ]
            : []),
          ...(locationIntakeMode === JOB_REQUEST_LOCATION_INTAKE_MODE.EXACT_ON_FILE &&
          cleanText(draft.location?.unitNumber)
            ? [
                item({
                  id: "unit",
                  labelKey: "unitNumber",
                  value: draft.location?.unitNumber,
                  fieldPath: "location.unitNumber",
                }),
              ]
            : []),
          item({
            id: "access",
            labelKey: "accessNotes",
            value: draft.location?.accessNotes,
            fieldPath: "location.accessNotes",
          }),
        ],
      },
      {
        id: "timing",
        labelKey: "jobRequestDraftReviewTiming",
        items: [
          item({
            id: "timing",
            labelKey: "jobRequestDraftReviewTiming",
            value: draft.timing?.desiredTiming || draft.timing?.urgency,
            fieldPath: draft.timing?.desiredTiming ? "timing.desiredTiming" : "timing.urgency",
          }),
        ],
      },
      {
        id: "photos",
        labelKey: "jobRequestDraftReviewPhotos",
        items: [
          {
            id: "photos",
            labelKey: "jobRequestDraftReviewPhotos",
            value: String((draft.media?.photos || []).length),
            required: false,
            missing: false,
            confirmed: (draft.media?.photos || []).length > 0,
            provenance: (draft.media?.photos || []).length > 0
              ? JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER
              : JOB_REQUEST_DRAFT_SOURCE.SYSTEM,
            uncertainty: JOB_REQUEST_DRAFT_UNCERTAINTY.KNOWN,
            editTarget: "photos",
          },
        ],
      },
    ],
  };
}

export function createJobRequestDraftFromAssistantDraft(assistantDraft = {}, options = {}) {
  const base = createJobRequestDraft(options);
  let next = applyAssistantSuggestion(base, {
    "job.title": assistantDraft.title || "",
    "job.description": assistantDraft.description || "",
  });
  next = setServiceClassification(
    next,
    {
      category: assistantDraft.category || "",
      requestCategory: assistantDraft.requestCategory || assistantDraft.category || "",
      domain: assistantDraft.service_domain || assistantDraft.serviceDomain || "",
      specialty: assistantDraft.service_specialty || assistantDraft.serviceSpecialty || "",
      selectedServiceOptionId: assistantDraft.service_specialty
        ? `service:${assistantDraft.service_specialty}`
        : "",
      displayLabel: assistantDraft.suggestedServiceLabel || assistantDraft.suggestedProjectType || "",
    },
    {
      source: JOB_REQUEST_DRAFT_SOURCE.LEGACY_PREFILL,
      confirmed: false,
    }
  );
  next.provenance = {
    ...next.provenance,
    sources: Array.from(new Set([...(next.provenance.sources || []), JOB_REQUEST_DRAFT_SOURCE.LEGACY_PREFILL])),
    assistantDraft: {
      source: assistantDraft.source || "askMeetro",
      suggestedProjectType: assistantDraft.suggestedProjectType || "",
      suggestedServiceLabel: assistantDraft.suggestedServiceLabel || "",
      confidence: assistantDraft.confidence || "",
      intentReason: assistantDraft.intentReason || "",
      originalPrompt: assistantDraft.originalPrompt || "",
      mode: assistantDraft.mode || "",
      createdAt: assistantDraft.createdAt || "",
    },
  };
  return finalizeDraft(next);
}

export function serializeJobRequestDraftForRecovery(draft = {}) {
  const normalized = normalizeJobRequestDraft(draft);
  if (!normalized) return null;
  return {
    ...normalized,
    media: {
      photos: (normalized.media?.photos || []).map((photo) => {
        const safePhoto = { ...photo, previewUrl: "" };
        delete safePhoto.file;
        delete safePhoto.revoke;
        return safePhoto;
      }),
    },
  };
}

export function normalizeJobRequestDraft(value = {}) {
  if (!isPlainObject(value) || Number(value.version) !== JOB_REQUEST_DRAFT_VERSION) {
    return null;
  }
  const base = createJobRequestDraft({
    draftId: cleanText(value.localDraftId) || undefined,
    createdAt: cleanText(value.createdAt) || nowIso(),
    updatedAt: cleanText(value.updatedAt) || nowIso(),
  });
  const next = {
    ...base,
    ...value,
    version: JOB_REQUEST_DRAFT_VERSION,
    job: { ...base.job, ...(isPlainObject(value.job) ? value.job : {}) },
    service: { ...base.service, ...(isPlainObject(value.service) ? value.service : {}) },
    location: { ...base.location, ...(isPlainObject(value.location) ? value.location : {}) },
    timing: { ...base.timing, ...(isPlainObject(value.timing) ? value.timing : {}) },
    details: { ...base.details, ...(isPlainObject(value.details) ? value.details : {}) },
    media: {
      photos: Array.isArray(value.media?.photos)
        ? value.media.photos.map((photo, index) => {
            const safePhoto = {
              ...photo,
              file: undefined,
              previewUrl: "",
              order: index,
            };
            delete safePhoto.revoke;
            return safePhoto;
          })
        : [],
    },
    provenance: {
      ...base.provenance,
      ...(isPlainObject(value.provenance) ? value.provenance : {}),
    },
    fieldMeta: isPlainObject(value.fieldMeta) ? value.fieldMeta : {},
    uncertainty: isPlainObject(value.uncertainty) ? value.uncertainty : {},
    submission: {
      ...base.submission,
      ...(isPlainObject(value.submission) ? value.submission : {}),
    },
  };
  next.location = {
    ...next.location,
    intakeMode: normalizeLocationIntakeMode(next.location?.intakeMode),
    countryCode: normalizeCountryCode(next.location?.countryCode),
  };
  if (next.location.intakeMode === JOB_REQUEST_LOCATION_INTAKE_MODE.ADDRESS_AFTER_SELECTION) {
    next.location.serviceAddress = "";
    next.location.unitNumber = "";
  }
  return finalizeDraft(next);
}

export function readJobRequestDraft(storage = globalThis.localStorage, options = {}) {
  if (!storage) return createJobRequestDraft(options);
  try {
    const parsed = JSON.parse(storage.getItem(JOB_REQUEST_DRAFT_KEY) || "null");
    const normalized = normalizeJobRequestDraft(parsed);
    if (normalized) return normalized;
    if (parsed) storage.removeItem(JOB_REQUEST_DRAFT_KEY);
  } catch {
    storage.removeItem(JOB_REQUEST_DRAFT_KEY);
  }
  return createJobRequestDraft(options);
}

export function saveJobRequestDraft(storage = globalThis.localStorage, draft = {}) {
  const serializable = serializeJobRequestDraftForRecovery(draft);
  if (!storage || !serializable) return null;
  storage.setItem(JOB_REQUEST_DRAFT_KEY, JSON.stringify(serializable));
  return serializable;
}

export function clearJobRequestDraft(storage = globalThis.localStorage) {
  storage?.removeItem(JOB_REQUEST_DRAFT_KEY);
}
