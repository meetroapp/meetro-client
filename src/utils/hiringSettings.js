const STORE_PREFIX = "meetroHiringSettings";
const SETTINGS_VERSION = 1;

export const APPLICATION_REQUIREMENT_KEYS = Object.freeze([
  "resumeRequired",
  "phoneRequired",
  "emailRequired",
  "addressRequired",
  "workHistoryRequired",
  "referencesRequired",
  "availabilityRequired",
  "licenseRequired",
  "portfolioRequired",
  "coverNoteRequired",
]);

export const SUPPORTED_HIRING_NOTIFICATION_EVENTS = Object.freeze([
  "newApplication",
  "applicantMessage",
  "interviewScheduled",
  "interviewRescheduled",
  "interviewCancelled",
  "interviewCompleted",
  "teamMemberCreated",
]);

export const BACKGROUND_CHECK_PREFERENCE_KEYS = Object.freeze([
  "backgroundCheckRequested",
  "criminalHistoryCheckPreferred",
  "drivingRecordCheckPreferred",
  "identityVerificationPreferred",
  "professionalLicenseVerificationPreferred",
  "consentRequired",
]);

export const WORK_ELIGIBILITY_BOOLEAN_KEYS = Object.freeze([
  "authorizedToWorkRequired",
  "validDriverLicenseRequired",
  "reliableTransportationRequired",
  "physicalRequirementsAcknowledgement",
  "scheduleAvailabilityRequired",
]);

const NOTIFICATION_TYPE_TO_EVENT = Object.freeze({
  hiring_application: "newApplication",
  applicant_message: "applicantMessage",
  hiring_interview_scheduled: "interviewScheduled",
  hiring_interview_rescheduled: "interviewRescheduled",
  hiring_interview_cancelled: "interviewCancelled",
  hiring_interview_completed: "interviewCompleted",
  team_member_created: "teamMemberCreated",
});

const QA_FIXTURE = Object.freeze({
  businessId: "qa-hiring-settings-business",
  applicationRequirements: Object.freeze({
    emailRequired: true,
    phoneRequired: true,
    resumeRequired: true,
    customQuestions: Object.freeze([]),
  }),
});

function text(value) {
  return String(value ?? "").trim();
}

function keyPart(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "unscoped";
}

function safeStorage(options = {}) {
  if (options.storage) return options.storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function safeGet(storage, key) {
  try {
    return storage?.getItem?.(key) || "";
  } catch {
    return "";
  }
}

function safeReadObject(storage, key) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(key) || "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function safeWriteObject(storage, key, value) {
  try {
    storage?.setItem?.(key, JSON.stringify(value));
    return Boolean(storage);
  } catch {
    return false;
  }
}

function resolveScope(options = {}) {
  const storage = safeStorage(options);
  const storedBusinessId = text(
    safeGet(storage, "businessId") || safeGet(storage, "contractorId")
  );
  const activeBusinessId = text(
    options.activeBusinessId || storedBusinessId || options.businessId
  );
  const businessId = text(options.businessId || activeBusinessId);
  const accountMode = text(
    options.accountMode || safeGet(storage, "activeAccountMode")
  );
  const errors = {};

  if (accountMode !== "business") errors.accountMode = "business_account_required";
  if (!activeBusinessId || !businessId) errors.businessId = "business_required";
  if (activeBusinessId && businessId && activeBusinessId !== businessId) {
    errors.businessId = "cross_business_settings";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    storage,
    businessId,
    activeBusinessId,
    accountMode,
  };
}

export function getHiringSettingsStorageKey(options = {}) {
  const scope = resolveScope({ ...options, accountMode: options.accountMode || "business" });
  return `${STORE_PREFIX}:${keyPart(scope.businessId)}`;
}

function defaultApplicationRequirements() {
  return {
    resumeRequired: false,
    phoneRequired: true,
    emailRequired: true,
    addressRequired: false,
    workHistoryRequired: false,
    referencesRequired: false,
    availabilityRequired: false,
    licenseRequired: false,
    portfolioRequired: false,
    coverNoteRequired: false,
    customQuestions: [],
  };
}

function defaultNotificationPreferences() {
  return Object.fromEntries(
    SUPPORTED_HIRING_NOTIFICATION_EVENTS.map((event) => [event, true])
  );
}

function defaultBackgroundCheckPreferences() {
  return {
    ...Object.fromEntries(BACKGROUND_CHECK_PREFERENCE_KEYS.map((key) => [key, false])),
    notes: "",
  };
}

function defaultWorkEligibilityRequirements() {
  return {
    minimumAgeRequirement: "",
    ...Object.fromEntries(WORK_ELIGIBILITY_BOOLEAN_KEYS.map((key) => [key, false])),
    locationRequirement: "",
    customEligibilityNotes: "",
  };
}

export function getDefaultHiringSettings(businessId) {
  return {
    businessId: text(businessId),
    applicationRequirements: defaultApplicationRequirements(),
    notificationPreferences: defaultNotificationPreferences(),
    backgroundCheckPreferences: defaultBackgroundCheckPreferences(),
    workEligibilityRequirements: defaultWorkEligibilityRequirements(),
    createdAt: "",
    updatedAt: "",
    version: SETTINGS_VERSION,
  };
}

function stableLegacyQuestionId(prompt) {
  const normalized = text(prompt).toLowerCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return `hiring-question-${hash.toString(36)}`;
}

function normalizeCustomQuestion(question = {}, options = {}) {
  const prompt = text(question.prompt || question.question || question.label);
  if (!prompt) return null;
  const now = text(options.now);
  return {
    id: text(question.id) || stableLegacyQuestionId(prompt),
    prompt,
    required: Boolean(question.required),
    createdAt: text(question.createdAt || question.created_at) || now,
    updatedAt: text(question.updatedAt || question.updated_at) || now,
  };
}

function normalizeQuestions(value, options = {}) {
  if (!Array.isArray(value)) return [];
  const prompts = new Set();
  const ids = new Set();
  return value.reduce((questions, question) => {
    const normalized = normalizeCustomQuestion(question, options);
    const promptKey = normalized?.prompt.toLowerCase();
    if (!normalized || prompts.has(promptKey) || ids.has(normalized.id)) return questions;
    prompts.add(promptKey);
    ids.add(normalized.id);
    questions.push(normalized);
    return questions;
  }, []);
}

export function normalizeApplicationRequirements(value = {}, options = {}) {
  const defaults = defaultApplicationRequirements();
  const normalized = { ...defaults };
  APPLICATION_REQUIREMENT_KEYS.forEach((key) => {
    normalized[key] = typeof value[key] === "boolean" ? value[key] : defaults[key];
  });
  normalized.customQuestions = normalizeQuestions(
    value.customQuestions || value.questions,
    options
  );
  return normalized;
}

export function normalizeHiringSettings(record = {}, options = {}) {
  const source = record && typeof record === "object" && !Array.isArray(record) ? record : {};
  const businessId = text(options.businessId || source.businessId || source.business_id);
  const defaults = getDefaultHiringSettings(businessId);
  const notificationSource =
    source.notificationPreferences || source.notifications || {};
  const notificationPreferences = {};
  SUPPORTED_HIRING_NOTIFICATION_EVENTS.forEach((event) => {
    notificationPreferences[event] =
      typeof notificationSource[event] === "boolean"
        ? notificationSource[event]
        : defaults.notificationPreferences[event];
  });

  const backgroundSource =
    source.backgroundCheckPreferences || source.backgroundChecks || {};
  const backgroundCheckPreferences = defaultBackgroundCheckPreferences();
  BACKGROUND_CHECK_PREFERENCE_KEYS.forEach((key) => {
    backgroundCheckPreferences[key] = Boolean(backgroundSource[key]);
  });
  backgroundCheckPreferences.notes = text(backgroundSource.notes);

  const eligibilitySource =
    source.workEligibilityRequirements || source.workEligibility || {};
  const workEligibilityRequirements = defaultWorkEligibilityRequirements();
  WORK_ELIGIBILITY_BOOLEAN_KEYS.forEach((key) => {
    workEligibilityRequirements[key] = Boolean(eligibilitySource[key]);
  });
  workEligibilityRequirements.minimumAgeRequirement = text(
    eligibilitySource.minimumAgeRequirement
  );
  workEligibilityRequirements.locationRequirement = text(
    eligibilitySource.locationRequirement
  );
  workEligibilityRequirements.customEligibilityNotes = text(
    eligibilitySource.customEligibilityNotes
  );

  return {
    businessId,
    applicationRequirements: normalizeApplicationRequirements(
      source.applicationRequirements || source.requirements,
      options
    ),
    notificationPreferences,
    backgroundCheckPreferences,
    workEligibilityRequirements,
    createdAt: text(source.createdAt || source.created_at),
    updatedAt: text(source.updatedAt || source.updated_at),
    version: SETTINGS_VERSION,
  };
}

function cloneSettings(settings) {
  return {
    ...settings,
    applicationRequirements: {
      ...settings.applicationRequirements,
      customQuestions: settings.applicationRequirements.customQuestions.map((question) => ({
        ...question,
      })),
    },
    notificationPreferences: { ...settings.notificationPreferences },
    backgroundCheckPreferences: { ...settings.backgroundCheckPreferences },
    workEligibilityRequirements: { ...settings.workEligibilityRequirements },
  };
}

function shouldUseQaFixture(options, businessId) {
  return (
    options.environment === "development" &&
    options.qaMode === true &&
    businessId === QA_FIXTURE.businessId
  );
}

export function readHiringSettings(options = {}) {
  const scope = resolveScope(options);
  if (!scope.ok) return { ok: false, persisted: false, settings: null, errors: scope.errors };

  const key = getHiringSettingsStorageKey({
    businessId: scope.businessId,
    activeBusinessId: scope.activeBusinessId,
    accountMode: "business",
    storage: scope.storage,
  });
  const stored = safeReadObject(scope.storage, key);
  if (stored && text(stored.businessId) === scope.businessId) {
    return {
      ok: true,
      persisted: true,
      settings: cloneSettings(normalizeHiringSettings(stored, { businessId: scope.businessId })),
      errors: {},
    };
  }

  const source = shouldUseQaFixture(options, scope.businessId) ? QA_FIXTURE : {};
  return {
    ok: true,
    persisted: false,
    settings: cloneSettings(normalizeHiringSettings(source, { businessId: scope.businessId })),
    errors: {},
  };
}

function validateSettings(settings) {
  const errors = {};
  const questions = settings.applicationRequirements.customQuestions;
  const promptKeys = questions.map((question) => text(question.prompt).toLowerCase());
  if (questions.some((question) => !text(question.prompt))) {
    errors.customQuestions = "blank_question";
  } else if (new Set(promptKeys).size !== promptKeys.length) {
    errors.customQuestions = "duplicate_question";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function saveHiringSettings(record = {}, options = {}) {
  const scope = resolveScope({ ...options, businessId: record.businessId || options.businessId });
  if (!scope.ok) return { ok: false, settings: null, errors: scope.errors };
  if (text(record.businessId) && text(record.businessId) !== scope.businessId) {
    return { ok: false, settings: null, errors: { businessId: "cross_business_settings" } };
  }
  const rawQuestions = record.applicationRequirements?.customQuestions;
  if (Array.isArray(rawQuestions)) {
    const prompts = rawQuestions.map((question) => text(question?.prompt).toLowerCase());
    if (prompts.some((prompt) => !prompt)) {
      return { ok: false, settings: null, errors: { customQuestions: "blank_question" } };
    }
    if (new Set(prompts).size !== prompts.length) {
      return { ok: false, settings: null, errors: { customQuestions: "duplicate_question" } };
    }
  }

  const existing = readHiringSettings({
    ...options,
    businessId: scope.businessId,
    activeBusinessId: scope.activeBusinessId,
    accountMode: "business",
  });
  const now = text(options.now) || new Date().toISOString();
  const settings = normalizeHiringSettings(
    {
      ...record,
      businessId: scope.businessId,
      createdAt: existing.settings?.createdAt || record.createdAt || now,
      updatedAt: now,
    },
    { businessId: scope.businessId, now }
  );
  const validation = validateSettings(settings);
  if (!validation.valid) return { ok: false, settings: null, errors: validation.errors };

  const key = getHiringSettingsStorageKey({
    businessId: scope.businessId,
    activeBusinessId: scope.activeBusinessId,
    accountMode: "business",
    storage: scope.storage,
  });
  if (!safeWriteObject(scope.storage, key, settings)) {
    return { ok: false, settings: null, errors: { storage: "unavailable" } };
  }
  return { ok: true, settings: cloneSettings(settings), errors: {} };
}

export function updateHiringSettingsSection(section, value, options = {}) {
  const current = readHiringSettings(options);
  if (!current.ok) return current;
  if (![
    "applicationRequirements",
    "notificationPreferences",
    "backgroundCheckPreferences",
    "workEligibilityRequirements",
  ].includes(section)) {
    return { ok: false, settings: null, errors: { section: "unsupported" } };
  }
  return saveHiringSettings(
    { ...current.settings, [section]: value },
    options
  );
}

function generatedQuestionId(options = {}) {
  if (typeof options.idFactory === "function") return text(options.idFactory());
  if (globalThis.crypto?.randomUUID) return `hiring-question-${globalThis.crypto.randomUUID()}`;
  return `hiring-question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addHiringCustomQuestion(requirements = {}, question = {}, options = {}) {
  const current = normalizeApplicationRequirements(requirements, options);
  const prompt = text(question.prompt || question);
  if (!prompt) return { ok: false, requirements: current, errors: { prompt: "required" } };
  if (current.customQuestions.some((item) => item.prompt.toLowerCase() === prompt.toLowerCase())) {
    return { ok: false, requirements: current, errors: { prompt: "duplicate" } };
  }
  const now = text(options.now) || new Date().toISOString();
  const next = {
    id: generatedQuestionId(options),
    prompt,
    required: Boolean(question.required),
    createdAt: now,
    updatedAt: now,
  };
  return {
    ok: true,
    requirements: { ...current, customQuestions: [...current.customQuestions, next] },
    question: { ...next },
    errors: {},
  };
}

export function updateHiringCustomQuestion(requirements = {}, questionId, changes = {}, options = {}) {
  const current = normalizeApplicationRequirements(requirements, options);
  const target = current.customQuestions.find((question) => question.id === text(questionId));
  if (!target) return { ok: false, requirements: current, errors: { questionId: "not_found" } };
  const prompt = text(changes.prompt ?? target.prompt);
  if (!prompt) return { ok: false, requirements: current, errors: { prompt: "required" } };
  if (current.customQuestions.some((question) => question.id !== target.id && question.prompt.toLowerCase() === prompt.toLowerCase())) {
    return { ok: false, requirements: current, errors: { prompt: "duplicate" } };
  }
  const updated = {
    ...target,
    prompt,
    required: typeof changes.required === "boolean" ? changes.required : target.required,
    updatedAt: text(options.now) || new Date().toISOString(),
  };
  return {
    ok: true,
    requirements: {
      ...current,
      customQuestions: current.customQuestions.map((question) =>
        question.id === target.id ? updated : question
      ),
    },
    question: { ...updated },
    errors: {},
  };
}

export function removeHiringCustomQuestion(requirements = {}, questionId, options = {}) {
  const current = normalizeApplicationRequirements(requirements, options);
  return {
    ok: true,
    requirements: {
      ...current,
      customQuestions: current.customQuestions.filter(
        (question) => question.id !== text(questionId)
      ),
    },
    errors: {},
  };
}

export function projectSettingsIntoPosition(settings, position = {}) {
  const normalizedSettings = normalizeHiringSettings(settings, {
    businessId: settings?.businessId,
  });
  const explicit = position.applicationRequirements;
  return {
    requirements: explicit
      ? normalizeApplicationRequirements(explicit)
      : normalizeApplicationRequirements(normalizedSettings.applicationRequirements),
    source: explicit ? "position_override" : "business_default",
    mutable: text(position.status).toLowerCase() !== "closed",
  };
}

export function applyHiringSettingsToPositionDraft(draft = {}, settings = {}) {
  if (text(draft.status).toLowerCase() === "closed") return { ...draft };
  if (draft.applicationRequirements) {
    return {
      ...draft,
      applicationRequirements: normalizeApplicationRequirements(draft.applicationRequirements),
    };
  }
  return {
    ...draft,
    applicationRequirements: projectSettingsIntoPosition(settings, draft).requirements,
  };
}

export function projectSettingsIntoApplicationReview(settings, position = {}, application = {}) {
  const projection = projectSettingsIntoPosition(settings, position);
  return {
    applicationId: text(application.id),
    requirements: projection.requirements,
    source: projection.source,
    historicalApplicationUnaffected: true,
    automaticDecision: null,
  };
}

export function projectHiringNotificationPreferences(settings = {}) {
  const normalized = normalizeHiringSettings(settings, { businessId: settings.businessId });
  return { ...normalized.notificationPreferences };
}

export function isHiringNotificationEnabled(eventOrNotification, options = {}) {
  const event = text(
    typeof eventOrNotification === "string"
      ? eventOrNotification
      : NOTIFICATION_TYPE_TO_EVENT[text(eventOrNotification?.type).toLowerCase()]
  );
  if (!SUPPORTED_HIRING_NOTIFICATION_EVENTS.includes(event)) return false;
  const result = readHiringSettings(options);
  return Boolean(result.ok && result.settings.notificationPreferences[event]);
}

export function getHiringSettingsSummary(settings = {}) {
  const normalized = normalizeHiringSettings(settings, { businessId: settings.businessId });
  return {
    requiredApplicationFieldCount: APPLICATION_REQUIREMENT_KEYS.filter(
      (key) => normalized.applicationRequirements[key]
    ).length,
    customQuestionCount: normalized.applicationRequirements.customQuestions.length,
    enabledNotificationCount: SUPPORTED_HIRING_NOTIFICATION_EVENTS.filter(
      (event) => normalized.notificationPreferences[event]
    ).length,
    backgroundPreferenceCount: BACKGROUND_CHECK_PREFERENCE_KEYS.filter(
      (key) => normalized.backgroundCheckPreferences[key]
    ).length,
    eligibilityPreferenceCount: WORK_ELIGIBILITY_BOOLEAN_KEYS.filter(
      (key) => normalized.workEligibilityRequirements[key]
    ).length,
  };
}
