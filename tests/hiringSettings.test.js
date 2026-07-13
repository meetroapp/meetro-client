import assert from "node:assert/strict";
import test from "node:test";

import {
  SUPPORTED_HIRING_NOTIFICATION_EVENTS,
  addHiringCustomQuestion,
  applyHiringSettingsToPositionDraft,
  getDefaultHiringSettings,
  getHiringSettingsStorageKey,
  isHiringNotificationEnabled,
  normalizeHiringSettings,
  projectSettingsIntoApplicationReview,
  projectSettingsIntoPosition,
  readHiringSettings,
  removeHiringCustomQuestion,
  saveHiringSettings,
  updateHiringCustomQuestion,
  updateHiringSettingsSection,
} from "../src/utils/hiringSettings.js";
import {
  closeHiringPosition,
  getStoredHiringPositions,
  saveHiringPosition,
} from "../src/utils/hiringCenterRegistry.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    snapshot: () => Object.fromEntries(values),
  };
}

function options(overrides = {}) {
  const storage = overrides.storage || memoryStorage({
    activeAccountMode: "business",
    businessId: "business-1",
  });
  return {
    storage,
    businessId: "business-1",
    activeBusinessId: "business-1",
    accountMode: "business",
    now: "2026-07-13T15:00:00.000Z",
    ...overrides,
  };
}

test("new business receives deterministic conservative defaults without persistence", () => {
  const storage = memoryStorage({ activeAccountMode: "business", businessId: "business-1" });
  const config = options({ storage });
  const first = readHiringSettings(config);
  const second = readHiringSettings(config);

  assert.equal(first.ok, true);
  assert.equal(first.persisted, false);
  assert.deepEqual(first, second);
  assert.equal(first.settings.applicationRequirements.emailRequired, true);
  assert.equal(first.settings.applicationRequirements.phoneRequired, true);
  assert.equal(first.settings.applicationRequirements.resumeRequired, false);
  assert.ok(Object.values(first.settings.backgroundCheckPreferences).every((value) => value === false || value === ""));
  assert.ok(Object.values(first.settings.workEligibilityRequirements).every((value) => value === false || value === ""));
  assert.deepEqual(Object.keys(first.settings.notificationPreferences), [...SUPPORTED_HIRING_NOTIFICATION_EVENTS]);
  assert.equal(storage.getItem(getHiringSettingsStorageKey(config)), null);
});

test("business saves one scoped settings record without mutating caller input", () => {
  const config = options();
  const draft = getDefaultHiringSettings("business-1");
  draft.applicationRequirements.resumeRequired = true;
  const before = structuredClone(draft);
  const result = saveHiringSettings(draft, config);

  assert.equal(result.ok, true);
  assert.equal(result.settings.businessId, "business-1");
  assert.equal(result.settings.applicationRequirements.resumeRequired, true);
  assert.deepEqual(draft, before);
  assert.equal(readHiringSettings(config).persisted, true);
});

test("personal, missing-mode, and cross-business reads and writes fail closed", () => {
  const storage = memoryStorage({ activeAccountMode: "business", businessId: "business-1" });
  const personal = options({ storage, accountMode: "personal" });
  const missingMode = options({ storage: memoryStorage({ businessId: "business-1" }), accountMode: "" });
  const crossBusiness = options({ storage, businessId: "business-2", activeBusinessId: "business-1" });

  assert.equal(readHiringSettings(personal).ok, false);
  assert.equal(saveHiringSettings(getDefaultHiringSettings("business-1"), personal).ok, false);
  assert.equal(readHiringSettings(missingMode).ok, false);
  assert.equal(readHiringSettings(crossBusiness).ok, false);
  assert.equal(saveHiringSettings(getDefaultHiringSettings("business-2"), crossBusiness).ok, false);
});

test("business scopes and same visible business names never merge", () => {
  const storage = memoryStorage();
  const first = options({ storage, businessId: "business-1", activeBusinessId: "business-1" });
  const second = options({ storage, businessId: "business-2", activeBusinessId: "business-2" });
  saveHiringSettings({
    ...getDefaultHiringSettings("business-1"),
    businessName: "Shared Name",
    applicationRequirements: { emailRequired: true, phoneRequired: true, resumeRequired: true },
  }, first);
  saveHiringSettings({
    ...getDefaultHiringSettings("business-2"),
    businessName: "Shared Name",
    applicationRequirements: { emailRequired: true, phoneRequired: true, resumeRequired: false },
  }, second);

  assert.equal(readHiringSettings(first).settings.applicationRequirements.resumeRequired, true);
  assert.equal(readHiringSettings(second).settings.applicationRequirements.resumeRequired, false);
  assert.notEqual(getHiringSettingsStorageKey(first), getHiringSettingsStorageKey(second));
});

test("application requirements and section updates preserve optional defaults", () => {
  const config = options();
  const result = updateHiringSettingsSection("applicationRequirements", {
    emailRequired: true,
    phoneRequired: true,
    resumeRequired: true,
  }, config);

  assert.equal(result.ok, true);
  assert.equal(result.settings.applicationRequirements.resumeRequired, true);
  assert.equal(result.settings.applicationRequirements.addressRequired, false);
  assert.equal(result.settings.applicationRequirements.portfolioRequired, false);
});

test("custom questions reject blanks and duplicates while preserving stable identity and order", () => {
  const base = getDefaultHiringSettings("business-1").applicationRequirements;
  const blank = addHiringCustomQuestion(base, { prompt: "  " }, options());
  const added = addHiringCustomQuestion(base, { prompt: "Tell us about similar work", required: true }, options({ idFactory: () => "question-1" }));
  const duplicate = addHiringCustomQuestion(added.requirements, { prompt: "tell us about similar work" }, options());
  const second = addHiringCustomQuestion(added.requirements, { prompt: "When can you start?" }, options({ idFactory: () => "question-2" }));
  const edited = updateHiringCustomQuestion(second.requirements, "question-1", { prompt: "Describe similar work" }, options({ now: "2026-07-14T10:00:00.000Z" }));
  const removed = removeHiringCustomQuestion(edited.requirements, "question-1", options());

  assert.equal(blank.ok, false);
  assert.equal(duplicate.ok, false);
  assert.equal(edited.question.id, "question-1");
  assert.deepEqual(second.requirements.customQuestions.map((question) => question.id), ["question-1", "question-2"]);
  assert.deepEqual(removed.requirements.customQuestions.map((question) => question.id), ["question-2"]);
});

test("saving rejects edited blank or duplicate custom questions", () => {
  const settings = getDefaultHiringSettings("business-1");
  settings.applicationRequirements.customQuestions = [
    { id: "question-1", prompt: "", required: false },
  ];
  const blank = saveHiringSettings(settings, options());
  settings.applicationRequirements.customQuestions = [
    { id: "question-1", prompt: "Available weekends?", required: false },
    { id: "question-2", prompt: "available weekends?", required: true },
  ];
  const duplicate = saveHiringSettings(settings, options());

  assert.equal(blank.ok, false);
  assert.equal(blank.errors.customQuestions, "blank_question");
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.errors.customQuestions, "duplicate_question");
});

test("position projection inherits defaults but preserves overrides and closed records", () => {
  const settings = getDefaultHiringSettings("business-1");
  settings.applicationRequirements.resumeRequired = true;
  const inherited = applyHiringSettingsToPositionDraft({ id: "position-1", status: "Draft" }, settings);
  const override = { emailRequired: true, phoneRequired: false, customQuestions: [] };
  const explicit = projectSettingsIntoPosition(settings, {
    id: "position-2",
    status: "Open",
    applicationRequirements: override,
  });
  const closed = { id: "position-3", status: "Closed" };

  assert.equal(inherited.applicationRequirements.resumeRequired, true);
  assert.equal(explicit.source, "position_override");
  assert.equal(explicit.requirements.phoneRequired, false);
  assert.deepEqual(applyHiringSettingsToPositionDraft(closed, settings), closed);
});

test("saved positions inherit defaults while explicit overrides remain stronger", () => {
  const storage = memoryStorage({ activeAccountMode: "business", businessId: "business-1" });
  const ownership = { storage, businessId: "business-1", activeBusinessId: "business-1", accountMode: "business", employmentType: "Contract" };
  const settings = getDefaultHiringSettings("business-1");
  settings.applicationRequirements.resumeRequired = true;
  const inherited = saveHiringPosition({
    id: "position-inherited",
    title: "Field Assistant",
    description: "Support field work.",
    serviceArea: "Lee County",
    employmentType: "Contract",
    status: "Draft",
  }, { ...ownership, hiringSettings: settings, createdAt: "2026-07-13T15:00:00.000Z" });
  const override = { emailRequired: true, phoneRequired: false, customQuestions: [] };
  const explicit = saveHiringPosition({
    id: "position-explicit",
    title: "Office Assistant",
    description: "Support office work.",
    serviceArea: "Lee County",
    employmentType: "Contract",
    status: "Open",
    applicationRequirements: override,
  }, { ...ownership, hiringSettings: settings, createdAt: "2026-07-13T15:00:00.000Z" });
  const edited = saveHiringPosition({
    id: "position-explicit",
    title: "Office Assistant",
    description: "Updated office support.",
    serviceArea: "Lee County",
    employmentType: "Contract",
    status: "Open",
  }, { ...ownership, hiringSettings: settings, updatedAt: "2026-07-14T15:00:00.000Z" });

  assert.equal(inherited.position.applicationRequirements.resumeRequired, true);
  assert.equal(explicit.position.applicationRequirements.phoneRequired, false);
  assert.equal(edited.position.applicationRequirements.phoneRequired, false);
  assert.equal(getStoredHiringPositions(storage).length, 2);
});

test("closed stored positions are never silently changed", () => {
  const storage = memoryStorage({ activeAccountMode: "business", businessId: "business-1" });
  const ownership = { storage, businessId: "business-1", activeBusinessId: "business-1", accountMode: "business" };
  const original = saveHiringPosition({
    id: "position-closed",
    title: "Closed Role",
    description: "Historical role.",
    serviceArea: "Lee County",
    employmentType: "Contract",
    status: "Open",
    applicationRequirements: { emailRequired: true, phoneRequired: false },
  }, { ...ownership, createdAt: "2026-07-13T15:00:00.000Z" });
  closeHiringPosition("position-closed", ownership);
  const attempted = saveHiringPosition({
    id: "position-closed",
    title: "Changed Role",
    description: "Should not save.",
    serviceArea: "Elsewhere",
    employmentType: "Contract",
    status: "Open",
  }, { ...ownership, hiringSettings: getDefaultHiringSettings("business-1") });

  assert.equal(original.ok, true);
  assert.equal(attempted.ok, false);
  assert.equal(attempted.validation.errors.status, "closed_position_immutable");
  assert.equal(getStoredHiringPositions(storage)[0].title, "Closed Role");
});

test("application review projection never rejects or retroactively invalidates history", () => {
  const projection = projectSettingsIntoApplicationReview(
    getDefaultHiringSettings("business-1"),
    { id: "position-1" },
    { id: "historical-application-1", status: "Reviewing" }
  );

  assert.equal(projection.applicationId, "historical-application-1");
  assert.equal(projection.historicalApplicationUnaffected, true);
  assert.equal(projection.automaticDecision, null);
  assert.equal("rejected" in projection, false);
  assert.equal("score" in projection, false);
});

test("notification preferences gate supported future events without changing history", () => {
  const storage = memoryStorage({ activeAccountMode: "business", businessId: "business-1" });
  const config = options({ storage });
  const history = [{ id: "existing-notification" }];
  const settings = getDefaultHiringSettings("business-1");
  settings.notificationPreferences.interviewScheduled = false;
  saveHiringSettings(settings, config);

  assert.equal(isHiringNotificationEnabled("interviewScheduled", config), false);
  assert.equal(isHiringNotificationEnabled({ type: "team_member_created" }, config), true);
  assert.equal(isHiringNotificationEnabled("positionClosingSoon", config), false);
  assert.deepEqual(history, [{ id: "existing-notification" }]);
});

test("legacy and malformed settings normalize safely and idempotently", () => {
  const legacy = {
    business_id: "business-1",
    requirements: {
      emailRequired: true,
      questions: [{ question: "Available weekends?", required: true }],
    },
    notifications: { interviewScheduled: false, unsupportedEvent: true },
    backgroundChecks: { backgroundCheckRequested: true, result: "passed" },
    workEligibility: { authorizedToWorkRequired: true, ssn: "not-allowed" },
  };
  const before = structuredClone(legacy);
  const first = normalizeHiringSettings(legacy, { businessId: "business-1", now: "2026-07-13T15:00:00.000Z" });
  const second = normalizeHiringSettings(first, { businessId: "business-1", now: "2026-07-13T15:00:00.000Z" });
  const malformedStorage = memoryStorage({
    activeAccountMode: "business",
    businessId: "business-1",
    [getHiringSettingsStorageKey(options())]: "{bad-json",
  });

  assert.deepEqual(first, second);
  assert.deepEqual(legacy, before);
  assert.equal(first.applicationRequirements.customQuestions.length, 1);
  assert.equal("unsupportedEvent" in first.notificationPreferences, false);
  assert.equal("result" in first.backgroundCheckPreferences, false);
  assert.equal("ssn" in first.workEligibilityRequirements, false);
  assert.equal(readHiringSettings(options({ storage: malformedStorage })).ok, true);
});

test("unavailable storage fails safely on save", () => {
  const unavailable = {
    getItem() { throw new Error("unavailable"); },
    setItem() { throw new Error("unavailable"); },
  };
  const result = saveHiringSettings(
    getDefaultHiringSettings("business-1"),
    options({ storage: unavailable })
  );
  assert.equal(result.ok, false);
  assert.equal(result.errors.storage, "unavailable");
});

test("seed settings require explicit development QA mode and never persist", () => {
  const storage = memoryStorage({ activeAccountMode: "business", businessId: "qa-hiring-settings-business" });
  const base = options({
    storage,
    businessId: "qa-hiring-settings-business",
    activeBusinessId: "qa-hiring-settings-business",
  });
  const production = readHiringSettings({ ...base, environment: "production", qaMode: true });
  const staleFlag = readHiringSettings({ ...base, environment: "production", qaMode: true });
  const development = readHiringSettings({ ...base, environment: "development", qaMode: true });

  assert.equal(production.settings.applicationRequirements.resumeRequired, false);
  assert.equal(staleFlag.settings.applicationRequirements.resumeRequired, false);
  assert.equal(development.settings.applicationRequirements.resumeRequired, true);
  assert.equal(development.persisted, false);
  assert.equal(storage.getItem(getHiringSettingsStorageKey(base)), null);
});

test("settings contract contains no sensitive documents, results, rankings, or decisions", () => {
  const source = JSON.stringify(getDefaultHiringSettings("business-1")).toLowerCase();
  for (const prohibited of ["ssn", "socialsecurity", "passport", "workpermit", "photoid", "passfail", "score", "ranking", "backgroundcheckresult"]) {
    assert.equal(source.includes(prohibited), false, prohibited);
  }
});
