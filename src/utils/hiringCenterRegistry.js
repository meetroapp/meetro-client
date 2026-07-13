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

export const HIRING_POSITIONS_STORAGE_KEY = "meetroHiringPositions";

export {
  HIRING_APPLICANT_STATUSES,
  HIRING_EMPLOYMENT_TYPES,
  HIRING_POSITION_STATUSES,
};

function cloneRecord(item) {
  return {
    ...item,
    requirements: item.requirements ? [...item.requirements] : undefined,
    skillsNeeded: item.skillsNeeded ? [...item.skillsNeeded] : undefined,
    titleTranslations: cloneTranslationMap(item.titleTranslations),
    categoryTranslations: cloneTranslationMap(item.categoryTranslations),
    descriptionTranslations: cloneTranslationMap(item.descriptionTranslations),
    requirementTranslations: cloneTranslationMap(item.requirementTranslations),
    requirementsTranslations: cloneTranslationMap(item.requirementsTranslations),
    scheduleTranslations: cloneTranslationMap(item.scheduleTranslations),
    experienceTranslations: cloneTranslationMap(item.experienceTranslations),
    experienceRequiredTranslations: cloneTranslationMap(item.experienceRequiredTranslations),
  };
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

function cloneArray(items) {
  return items.map(cloneRecord);
}

export function getHiringOpenPositions(storage = safeStorage()) {
  return [
    ...cloneArray(HIRING_POSITIONS),
    ...getStoredHiringPositions(storage),
  ];
}

function getConversationApplicants(storage = safeStorage()) {
  return safeReadArray(storage, "meetro_conversation_registry")
    .filter((record) =>
      ["hiring", "hiring_application", "job_inquiry", "applicant_message"].includes(
        String(record.conversation_type || record.type || "")
      ) && record.applicantId && record.positionId && record.businessId
    )
    .map((record) => ({
      id: String(record.applicantId),
      businessId: String(record.businessId),
      name: record.applicantName || record.participantName || "Applicant",
      positionId: String(record.positionId),
      positionAppliedFor: record.positionTitle || "Position",
      experienceSummary: "Hiring conversation applicant",
      applicationDate: record.createdAt || record.savedAt || "",
      status: HIRING_APPLICANT_STATUSES.includes(record.status) ? record.status : "New",
      contactPreference: "Hiring conversation",
      notes: "",
      conversationId: record.id,
      source: "hiring_conversation",
    }));
}

export function getHiringApplicants(storage = safeStorage()) {
  const byId = new Map(cloneArray(HIRING_APPLICANTS).map((record) => [record.id, record]));
  getConversationApplicants(storage).forEach((record) => {
    if (!byId.has(record.id)) byId.set(record.id, record);
  });
  return [...byId.values()].map(cloneRecord);
}

export function getHiringInterviews() {
  return cloneArray(HIRING_INTERVIEWS);
}

export function getHiringTeamMembers() {
  return cloneArray(HIRING_TEAM_MEMBERS);
}

export function getHiringJobCategories() {
  return [...HIRING_JOB_CATEGORIES];
}

export function getHiringPositionById(positionId, storage = safeStorage()) {
  return getHiringOpenPositions(storage).find((position) => position.id === positionId) || null;
}

export function getHiringApplicantById(applicantId, storage = safeStorage()) {
  return getHiringApplicants(storage).find((applicant) => applicant.id === applicantId) || null;
}

export function getHiringApplicantsForPosition(positionId, storage = safeStorage()) {
  return getHiringApplicants(storage).filter((applicant) => applicant.positionId === positionId);
}

export function getHiringLocalJobOpenings(storage = safeStorage()) {
  return getHiringOpenPositions(storage)
    .filter((position) => position.status === "Open")
    .map((position) => ({
      id: position.id,
      title: position.title,
      titleTranslations: cloneTranslationMap(position.titleTranslations),
      businessName: position.businessName,
      category: position.category,
      categoryTranslations: cloneTranslationMap(position.categoryTranslations),
      description: position.description,
      descriptionTranslations: cloneTranslationMap(position.descriptionTranslations),
      requirements: [...(position.requirements || [])],
      requirementsTranslations: cloneTranslationMap(position.requirementsTranslations),
      requirementTranslations: cloneTranslationMap(position.requirementTranslations),
      payRange: position.payRange,
      location: position.serviceArea,
      serviceArea: position.serviceArea,
      distance: position.distance,
      employmentType: position.employmentType,
      experienceRequired: position.experienceRequired,
      experienceRequiredTranslations: cloneTranslationMap(position.experienceRequiredTranslations),
      experienceTranslations: cloneTranslationMap(position.experienceTranslations),
      skillsNeeded: [...(position.skillsNeeded || [])],
      scheduleAvailability: position.scheduleAvailability || "",
      scheduleTranslations: cloneTranslationMap(position.scheduleTranslations),
      contactPreference: position.contactPreference || "",
      status: position.status,
      sourcePositionId: position.id,
    }));
}

export function getHiringJobById(jobId, storage = safeStorage()) {
  return getHiringLocalJobOpenings(storage).find((job) => job.id === jobId) || null;
}

function safeStorage(storage = globalThis.localStorage) {
  return storage || null;
}

function safeReadArray(storage, key) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteArray(storage, key, value) {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean);
  }

  return String(value || "")
    .split(/[,\n]/)
    .map(normalizeText)
    .filter(Boolean);
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function getBusinessName() {
  try {
    return (
      globalThis.localStorage?.getItem("businessName") ||
      globalThis.localStorage?.getItem("companyName") ||
      "Local Business"
    );
  } catch {
    return "Local Business";
  }
}

function getBusinessId() {
  try {
    return (
      globalThis.localStorage?.getItem("businessId") ||
      globalThis.localStorage?.getItem("contractorId") ||
      "local-business"
    );
  } catch {
    return "local-business";
  }
}

export function validateHiringPositionDraft(draft = {}) {
  const missingFields = [];
  if (!normalizeText(draft.title)) missingFields.push("title");
  if (!normalizeText(draft.description)) missingFields.push("description");
  if (!normalizeText(draft.serviceArea)) missingFields.push("serviceArea");

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

export function normalizeHiringPositionDraft(draft = {}, options = {}) {
  const title = normalizeText(draft.title);
  const createdAt = options.createdAt || draft.createdAt || new Date().toISOString();
  const businessName = normalizeText(draft.businessName) || getBusinessName();
  const id =
    normalizeText(draft.id) ||
    `local-position-${slugify(businessName)}-${slugify(title)}-${createdAt.slice(0, 10)}`;
  const status = HIRING_POSITION_STATUSES.includes(draft.status)
    ? draft.status
    : "Draft";

  return {
    id,
    businessId: normalizeText(draft.businessId) || getBusinessId(),
    title,
    businessName,
    description: normalizeText(draft.description),
    payRange: normalizeText(draft.payRange) || "Pay range not listed",
    serviceArea: normalizeText(draft.serviceArea),
    employmentType: HIRING_EMPLOYMENT_TYPES.includes(draft.employmentType)
      ? draft.employmentType
      : "Contract",
    experienceRequired:
      normalizeText(draft.experienceRequired) || "Experience not listed",
    vehicleRequired: Boolean(draft.vehicleRequired),
    backgroundCheckRequired: Boolean(draft.backgroundCheckRequired),
    status,
    category: normalizeText(draft.category) || "Handyman",
    distance: normalizeText(draft.distance) || "Any distance",
    requirements: normalizeList(draft.requirements || draft.skillsNeeded),
    skillsNeeded: normalizeList(draft.skillsNeeded),
    scheduleAvailability: normalizeText(draft.scheduleAvailability),
    contactPreference: normalizeText(draft.contactPreference),
    source: "local_hiring_position",
    createdAt,
    updatedAt: options.updatedAt || new Date().toISOString(),
  };
}

export function getStoredHiringPositions(storage = safeStorage()) {
  return safeReadArray(storage, HIRING_POSITIONS_STORAGE_KEY).map(cloneRecord);
}

export function saveHiringPosition(draft = {}, options = {}) {
  const storage = safeStorage(options.storage);
  const validation = validateHiringPositionDraft(draft);
  if (!validation.valid) {
    return {
      ok: false,
      validation,
      position: null,
    };
  }

  const position = normalizeHiringPositionDraft(draft, options);
  const existing = getStoredHiringPositions(storage);
  const withoutDuplicate = existing.filter((item) => item.id !== position.id);
  safeWriteArray(storage, HIRING_POSITIONS_STORAGE_KEY, [
    position,
    ...withoutDuplicate,
  ]);

  return {
    ok: true,
    validation,
    position: cloneRecord(position),
  };
}
