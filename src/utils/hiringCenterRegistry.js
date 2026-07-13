import {
  HIRING_APPLICANT_STATUSES,
  HIRING_APPLICANTS,
  HIRING_EMPLOYMENT_TYPES,
  HIRING_INTERVIEWS,
  HIRING_JOB_CATEGORIES,
  HIRING_POSITION_STATUSES,
  HIRING_POSITIONS,
  HIRING_TEAM_MEMBERS,
} from "../data/hiringData.js";
import { isHiringQaFixtureEnabled } from "./hiringFixtureGate.js";
import {
  normalizeApplicationRequirements,
  projectSettingsIntoPosition,
} from "./hiringSettings.js";

export const HIRING_POSITIONS_STORAGE_KEY = "meetroHiringPositions";

export {
  HIRING_APPLICANT_STATUSES,
  HIRING_EMPLOYMENT_TYPES,
  HIRING_POSITION_STATUSES,
};

function text(value) {
  return String(value ?? "").trim();
}

function safeStorage(options = {}) {
  if (options?.storage) return options.storage;
  if (options?.getItem) return options;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function toOptions(storageOrOptions = {}) {
  return storageOrOptions?.getItem
    ? { storage: storageOrOptions }
    : storageOrOptions || {};
}

function readArray(storage, key) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray(storage, key, records) {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

function cloneTranslationMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value).map(([language, translation]) => [
      language,
      Array.isArray(translation) ? [...translation] : translation,
    ])
  );
}

function cloneRecord(record) {
  if (!record) return null;
  return {
    ...record,
    applicationRequirements: record.applicationRequirements
      ? normalizeApplicationRequirements(record.applicationRequirements)
      : undefined,
    requirements: Array.isArray(record.requirements) ? [...record.requirements] : [],
    skillsNeeded: Array.isArray(record.skillsNeeded) ? [...record.skillsNeeded] : [],
    titleTranslations: cloneTranslationMap(record.titleTranslations),
    categoryTranslations: cloneTranslationMap(record.categoryTranslations),
    descriptionTranslations: cloneTranslationMap(record.descriptionTranslations),
    requirementTranslations: cloneTranslationMap(record.requirementTranslations),
    requirementsTranslations: cloneTranslationMap(record.requirementsTranslations),
    scheduleTranslations: cloneTranslationMap(record.scheduleTranslations),
    experienceTranslations: cloneTranslationMap(record.experienceTranslations),
    experienceRequiredTranslations: cloneTranslationMap(record.experienceRequiredTranslations),
  };
}

function normalizeList(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[,\n]/);
  return [...new Set(values.map(text).filter(Boolean))];
}

function normalizeStatus(value) {
  const match = HIRING_POSITION_STATUSES.find(
    (status) => status.toLowerCase() === text(value).toLowerCase()
  );
  return match || "Draft";
}

function numberOrEmpty(value) {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function resolveBusinessScope(options = {}) {
  const storage = safeStorage(options);
  let storedBusinessId = "";
  let storedAccountMode = "";
  try {
    storedBusinessId = text(storage?.getItem?.("businessId") || storage?.getItem?.("contractorId"));
    storedAccountMode = text(storage?.getItem?.("activeAccountMode"));
  } catch {
    // Restricted storage fails closed below.
  }
  const activeBusinessId = text(options.activeBusinessId || storedBusinessId);
  const businessId = text(options.businessId || activeBusinessId);
  const accountMode = text(options.accountMode || storedAccountMode);
  const errors = {};
  if (accountMode !== "business") errors.accountMode = "business_account_required";
  if (!activeBusinessId || !businessId) errors.businessId = "business_required";
  if (businessId && activeBusinessId && businessId !== activeBusinessId) {
    errors.businessId = "cross_business_position";
  }
  return { valid: Object.keys(errors).length === 0, errors, businessId, storage };
}

function generatedId(options = {}) {
  if (typeof options.idFactory === "function") return text(options.idFactory());
  if (globalThis.crypto?.randomUUID) return `hiring-position-${globalThis.crypto.randomUUID()}`;
  return `hiring-position-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function fixturePositions(options = {}) {
  if (!isHiringQaFixtureEnabled(options)) return [];
  return HIRING_POSITIONS
    .filter((record) => text(record.businessId) === text(options.businessId))
    .map((record) => normalizeHiringPosition(record, { now: record.updatedAt || record.createdAt }));
}

function fixtureApplicants(options = {}) {
  if (!isHiringQaFixtureEnabled(options)) return [];
  return HIRING_APPLICANTS
    .filter((record) => text(record.businessId) === text(options.businessId))
    .map(cloneRecord);
}

function conversationApplicants(options = {}) {
  const storage = safeStorage(options);
  return readArray(storage, "meetro_conversation_registry")
    .filter((record) =>
      ["hiring", "hiring_application", "job_inquiry", "applicant_message"].includes(
        text(record.conversation_type || record.type)
      ) &&
      record.applicantId &&
      record.positionId &&
      record.businessId &&
      (!options.businessId || text(record.businessId) === text(options.businessId))
    )
    .map((record) => ({
      id: text(record.applicantId),
      businessId: text(record.businessId),
      name: text(record.applicantName || record.participantName) || "Applicant",
      positionId: text(record.positionId),
      positionAppliedFor: text(record.positionTitle) || "Position",
      experienceSummary: text(record.experienceSummary) || "Hiring conversation applicant",
      applicationDate: text(record.createdAt || record.savedAt),
      status: HIRING_APPLICANT_STATUSES.includes(record.status) ? record.status : "New",
      contactPreference: text(record.contactPreference) || "Hiring conversation",
      notes: text(record.notes),
      conversationId: record.id,
      source: "hiring_conversation",
    }));
}

export function normalizeHiringPosition(record = {}, options = {}) {
  const now = text(options.now) || new Date().toISOString();
  const createdAt = text(record.createdAt || record.created_at) || now;
  const payMin = numberOrEmpty(record.payMin ?? record.pay_min);
  const payMax = numberOrEmpty(record.payMax ?? record.pay_max);
  const payUnit = text(record.payUnit || record.pay_unit) || "hour";
  const payRange = text(record.payRange) ||
    (payMin !== "" || payMax !== ""
      ? `${payMin !== "" ? payMin : ""}${payMin !== "" && payMax !== "" ? "–" : ""}${payMax !== "" ? payMax : ""} / ${payUnit}`
      : "Pay range not listed");
  const requirements = normalizeList(record.requirements);
  const skillsNeeded = normalizeList(record.skillsNeeded || record.skills_needed);
  const experience = text(record.experience || record.experienceRequired) || "Experience not listed";

  return {
    ...record,
    id: text(record.id || record.positionId || record.position_id),
    businessId: text(record.businessId || record.business_id || record.contractorId),
    businessName: text(record.businessName || record.business_name) || "Local Business",
    title: text(record.title || record.positionTitle),
    description: text(record.description),
    serviceArea: text(record.serviceArea || record.service_area || record.location),
    employmentType: HIRING_EMPLOYMENT_TYPES.includes(record.employmentType)
      ? record.employmentType
      : HIRING_EMPLOYMENT_TYPES.includes(record.employment_type)
      ? record.employment_type
      : "Contract",
    status: normalizeStatus(record.status),
    payMin,
    payMax,
    payUnit,
    payRange,
    experience,
    experienceRequired: experience,
    skillsNeeded,
    requirements,
    schedule: text(record.schedule || record.scheduleAvailability),
    scheduleAvailability: text(record.scheduleAvailability || record.schedule),
    contactPreference: text(record.contactPreference),
    vehicleRequired: Boolean(record.vehicleRequired),
    backgroundCheckRequired: Boolean(record.backgroundCheckRequired),
    applicationRequirements: record.applicationRequirements
      ? normalizeApplicationRequirements(record.applicationRequirements)
      : undefined,
    category: text(record.category) || "Other",
    distance: text(record.distance) || "Any distance",
    publishedAt: text(record.publishedAt),
    pausedAt: text(record.pausedAt),
    closedAt: text(record.closedAt),
    createdBy: text(record.createdBy),
    createdAt,
    updatedAt: text(record.updatedAt || record.updated_at) || now,
    source: text(record.source) || "local_hiring_position",
    titleTranslations: cloneTranslationMap(record.titleTranslations),
    categoryTranslations: cloneTranslationMap(record.categoryTranslations),
    descriptionTranslations: cloneTranslationMap(record.descriptionTranslations),
    requirementTranslations: cloneTranslationMap(record.requirementTranslations),
    requirementsTranslations: cloneTranslationMap(record.requirementsTranslations),
    scheduleTranslations: cloneTranslationMap(record.scheduleTranslations),
    experienceTranslations: cloneTranslationMap(record.experienceTranslations),
    experienceRequiredTranslations: cloneTranslationMap(record.experienceRequiredTranslations),
  };
}

export function getStoredHiringPositions(storageOrOptions = {}) {
  const options = toOptions(storageOrOptions);
  return readArray(safeStorage(options), HIRING_POSITIONS_STORAGE_KEY)
    .map((record) => normalizeHiringPosition(record, options))
    .filter((record) => record.id && record.businessId)
    .map(cloneRecord);
}

export function getHiringOpenPositions(storageOrOptions = {}) {
  const options = toOptions(storageOrOptions);
  const persisted = getStoredHiringPositions(options).filter(
    (record) => options.publicProjection || !options.businessId || record.businessId === text(options.businessId)
  );
  const byId = new Map(persisted.map((record) => [record.id, record]));
  fixturePositions(options).forEach((record) => {
    if (!byId.has(record.id)) byId.set(record.id, record);
  });
  return [...byId.values()].map(cloneRecord);
}

export function readHiringPositions(options = {}) {
  const scope = resolveBusinessScope(options);
  if (!scope.valid) return [];
  return getHiringOpenPositions({ ...options, businessId: scope.businessId });
}

export function getHiringApplicants(storageOrOptions = {}) {
  const options = toOptions(storageOrOptions);
  const byId = new Map(fixtureApplicants(options).map((record) => [record.id, record]));
  conversationApplicants(options).forEach((record) => {
    if (!byId.has(record.id)) byId.set(record.id, record);
  });
  return [...byId.values()].map(cloneRecord);
}

export function getHiringPositionById(positionId, storageOrOptions = {}) {
  const options = toOptions(storageOrOptions);
  return getHiringOpenPositions(options).find((record) => record.id === text(positionId)) || null;
}

export function getHiringApplicantById(applicantId, storageOrOptions = {}) {
  const options = toOptions(storageOrOptions);
  return getHiringApplicants(options).find((record) => record.id === text(applicantId)) || null;
}

export function getHiringApplicantsForPosition(positionId, storageOrOptions = {}) {
  const options = toOptions(storageOrOptions);
  return getHiringApplicants(options).filter((record) => record.positionId === text(positionId));
}

export function resolveHiringPositionApplicants(positionId, options = {}) {
  const scope = resolveBusinessScope(options);
  if (!scope.valid) return [];
  const position = getHiringPositionById(positionId, { ...options, businessId: scope.businessId });
  if (!position || position.businessId !== scope.businessId) return [];
  return getHiringApplicantsForPosition(position.id, { ...options, businessId: scope.businessId });
}

export function getHiringInterviews(options = {}) {
  return isHiringQaFixtureEnabled(options)
    ? HIRING_INTERVIEWS.filter((record) => record.businessId === options.businessId).map(cloneRecord)
    : [];
}

export function getHiringTeamMembers(options = {}) {
  return isHiringQaFixtureEnabled(options)
    ? HIRING_TEAM_MEMBERS.filter((record) => record.businessId === options.businessId).map(cloneRecord)
    : [];
}

export function getHiringJobCategories() {
  return [...HIRING_JOB_CATEGORIES];
}

export function getHiringLocalJobOpenings(storageOrOptions = {}) {
  const options = toOptions(storageOrOptions);
  return getHiringOpenPositions(options)
    .filter((position) => position.status === "Open")
    .map((position) => ({
      ...cloneRecord(position),
      id: position.id,
      location: position.serviceArea,
      sourcePositionId: position.id,
    }));
}

export function getHiringJobById(jobId, storageOrOptions = {}) {
  return getHiringLocalJobOpenings(storageOrOptions)
    .find((record) => record.id === text(jobId)) || null;
}

export function validateHiringPositionDraft(draft = {}, options = {}) {
  const errors = {};
  if (!text(draft.title)) errors.title = "required";
  if (!text(draft.description)) errors.description = "required";
  if (!text(draft.serviceArea)) errors.serviceArea = "required";
  if (!HIRING_EMPLOYMENT_TYPES.includes(draft.employmentType)) errors.employmentType = "required";
  const payMin = numberOrEmpty(draft.payMin);
  const payMax = numberOrEmpty(draft.payMax);
  if (payMin !== "" && (typeof payMin !== "number" || payMin < 0)) errors.payMin = "invalid_pay";
  if (payMax !== "" && (typeof payMax !== "number" || payMax < 0)) errors.payMax = "invalid_pay";
  if (typeof payMin === "number" && typeof payMax === "number" && payMax < payMin) {
    errors.payMax = "invalid_pay_range";
  }
  const scope = options.requireOwnership === false ? null : resolveBusinessScope(options);
  if (scope && !scope.valid) Object.assign(errors, scope.errors);
  if (text(draft.businessId) && scope?.businessId && text(draft.businessId) !== scope.businessId) {
    errors.businessId = "cross_business_position";
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    missingFields: Object.entries(errors)
      .filter(([, value]) => value === "required")
      .map(([field]) => field),
    businessId: scope?.businessId || text(draft.businessId),
  };
}

export function normalizeHiringPositionDraft(draft = {}, options = {}) {
  const now = text(options.now || options.updatedAt) || new Date().toISOString();
  const applicationRequirements = draft.applicationRequirements
    ? normalizeApplicationRequirements(draft.applicationRequirements)
    : options.hiringSettings
    ? projectSettingsIntoPosition(options.hiringSettings, draft).requirements
    : undefined;
  return normalizeHiringPosition({
    ...draft,
    id: text(draft.id) || generatedId(options),
    businessId: text(draft.businessId || options.businessId),
    businessName: text(draft.businessName || options.businessName) || "Local Business",
    status: normalizeStatus(draft.status),
    applicationRequirements,
    createdAt: text(options.createdAt || draft.createdAt) || now,
    updatedAt: now,
  }, { now });
}

function persistPosition(position, options = {}) {
  const existing = getStoredHiringPositions(options);
  const next = [position, ...existing.filter((record) => record.id !== position.id)];
  return writeArray(safeStorage(options), HIRING_POSITIONS_STORAGE_KEY, next);
}

export function saveHiringPosition(draft = {}, options = {}) {
  const scope = resolveBusinessScope(options);
  const validation = validateHiringPositionDraft(draft, options);
  if (!scope.valid || !validation.valid) return { ok: false, validation, position: null };
  const existing = getStoredHiringPositions(options);
  const current = existing.find((record) => record.id === text(draft.id));
  if (current && current.businessId !== scope.businessId) {
    return { ok: false, validation: { valid: false, errors: { businessId: "cross_business_position" }, missingFields: [] }, position: null };
  }
  if (current?.status === "Closed") {
    return { ok: false, validation: { valid: false, errors: { status: "closed_position_immutable" }, missingFields: [] }, position: cloneRecord(current) };
  }
  const requestedStatus = normalizeStatus(draft.status || current?.status || "Draft");
  if (!current && !["Draft", "Open"].includes(requestedStatus)) {
    return { ok: false, validation: { valid: false, errors: { status: "invalid_transition" }, missingFields: [] }, position: null };
  }
  if (!["Draft", "Open", "Paused"].includes(requestedStatus)) {
    return { ok: false, validation: { valid: false, errors: { status: "invalid_transition" }, missingFields: [] }, position: current || null };
  }
  const now = text(options.now || options.updatedAt) || new Date().toISOString();
  const position = normalizeHiringPositionDraft({
    ...current,
    ...draft,
    id: current?.id || draft.id,
    businessId: scope.businessId,
    status: requestedStatus,
    applicationRequirements:
      draft.applicationRequirements || current?.applicationRequirements,
    publishedAt: requestedStatus === "Open" ? current?.publishedAt || now : current?.publishedAt,
  }, { ...options, businessId: scope.businessId, createdAt: current?.createdAt, now });
  if (!persistPosition(position, options)) {
    return { ok: false, validation: { valid: false, errors: { storage: "unavailable" }, missingFields: [] }, position: null };
  }
  return { ok: true, validation, position: cloneRecord(position), created: !current };
}

function transitionPosition(positionId, targetStatus, options = {}) {
  const scope = resolveBusinessScope(options);
  if (!scope.valid) return { ok: false, errors: scope.errors, position: null };
  const current = getStoredHiringPositions(options).find((record) => record.id === text(positionId));
  if (!current) return { ok: false, errors: { positionId: "not_found" }, position: null };
  if (current.businessId !== scope.businessId) {
    return { ok: false, errors: { businessId: "cross_business_position" }, position: null };
  }
  if (current.status === targetStatus) {
    return { ok: true, errors: {}, position: cloneRecord(current), unchanged: true };
  }
  const allowed = {
    Open: { Paused: true, Closed: true },
    Paused: { Open: true, Closed: true },
    Draft: { Open: true },
  };
  if (!allowed[current.status]?.[targetStatus]) {
    return { ok: false, errors: { status: "invalid_transition" }, position: cloneRecord(current) };
  }
  const now = text(options.now) || new Date().toISOString();
  const timestamps = {
    Open: { publishedAt: current.publishedAt || now, pausedAt: "" },
    Paused: { pausedAt: now },
    Closed: { closedAt: now },
  };
  const position = normalizeHiringPosition({
    ...current,
    ...timestamps[targetStatus],
    status: targetStatus,
    updatedAt: now,
  }, { now });
  if (!persistPosition(position, options)) return { ok: false, errors: { storage: "unavailable" }, position: null };
  return { ok: true, errors: {}, position: cloneRecord(position) };
}

export function publishHiringPosition(positionId, options = {}) {
  return transitionPosition(positionId, "Open", options);
}

export function pauseHiringPosition(positionId, options = {}) {
  return transitionPosition(positionId, "Paused", options);
}

export function reopenHiringPosition(positionId, options = {}) {
  return transitionPosition(positionId, "Open", options);
}

export function closeHiringPosition(positionId, options = {}) {
  return transitionPosition(positionId, "Closed", options);
}

export function canPositionAcceptApplications(position = {}) {
  return normalizeStatus(position.status) === "Open";
}
