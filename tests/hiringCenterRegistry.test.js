import assert from "node:assert/strict";
import test from "node:test";

import {
  canPositionAcceptApplications,
  closeHiringPosition,
  getHiringApplicants,
  getHiringApplicantsForPosition,
  getHiringJobById,
  getHiringLocalJobOpenings,
  getHiringOpenPositions,
  getHiringPositionById,
  getStoredHiringPositions,
  normalizeHiringPosition,
  pauseHiringPosition,
  publishHiringPosition,
  readHiringPositions,
  reopenHiringPosition,
  resolveHiringPositionApplicants,
  saveHiringPosition,
  validateHiringPositionDraft,
} from "../src/utils/hiringCenterRegistry.js";

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function options(overrides = {}) {
  const businessId = overrides.businessId || "business-1";
  return {
    storage: overrides.storage || storage({ activeAccountMode: "business", businessId }),
    businessId,
    activeBusinessId: overrides.activeBusinessId || businessId,
    accountMode: overrides.accountMode ?? "business",
    businessName: overrides.businessName || "Same Name Business",
    now: overrides.now || "2026-07-13T12:00:00.000Z",
    idFactory: overrides.idFactory || (() => "position-1"),
    ...overrides,
  };
}

function draft(overrides = {}) {
  return {
    title: "Field Assistant",
    description: "Support local field work and customer-ready cleanup.",
    serviceArea: "Lee County, FL",
    employmentType: "Part Time",
    payMin: 20,
    payMax: 28,
    payUnit: "hour",
    skillsNeeded: "Hand tools, communication",
    requirements: "Reliable transportation\nRespectful communication",
    status: "Draft",
    ...overrides,
  };
}

const qa = Object.freeze({
  businessId: "local-business",
  environment: "development",
  qaMode: true,
});

test("production and new real businesses start with truthful empty hiring collections", () => {
  const store = storage({ activeAccountMode: "business", businessId: "business-new" });
  assert.deepEqual(getHiringOpenPositions({ storage: store, businessId: "business-new" }), []);
  assert.deepEqual(getHiringApplicants({ storage: store, businessId: "business-new" }), []);
  assert.deepEqual(getHiringLocalJobOpenings({ storage: store, publicProjection: true }), []);
});

test("fixtures require explicit development QA mode and remain scoped", () => {
  assert.deepEqual(getHiringOpenPositions({ ...qa, environment: "production" }), []);
  assert.deepEqual(getHiringOpenPositions({ ...qa, qaMode: false }), []);
  assert.ok(getHiringOpenPositions(qa).some((record) => record.id === "field-handyman-helper"));
  assert.ok(getHiringApplicants(qa).some((record) => record.id === "applicant-maya-torres"));
  assert.equal(getHiringOpenPositions({ ...qa, businessId: "business-2" }).length, 0);
});

test("validation requires complete content and a valid pay range", () => {
  const config = options();
  const missing = validateHiringPositionDraft({}, config);
  assert.deepEqual(missing.missingFields, ["title", "description", "serviceArea", "employmentType"]);
  assert.equal(validateHiringPositionDraft(draft({ payMin: -1 }), config).errors.payMin, "invalid_pay");
  assert.equal(validateHiringPositionDraft(draft({ payMin: 30, payMax: 20 }), config).errors.payMax, "invalid_pay_range");
  assert.equal(validateHiringPositionDraft(draft(), config).valid, true);
});

test("business creates one stable draft without mutating caller input", () => {
  const config = options();
  const input = draft();
  const before = structuredClone(input);
  const result = saveHiringPosition(input, config);
  assert.equal(result.ok, true);
  assert.equal(result.position.id, "position-1");
  assert.equal(result.position.businessId, "business-1");
  assert.equal(result.position.status, "Draft");
  assert.deepEqual(result.position.skillsNeeded, ["Hand tools", "communication"]);
  assert.deepEqual(input, before);
  assert.equal(readHiringPositions(config).length, 1);
});

test("personal, forged, cross-business, and same-name ownership fail closed", () => {
  const shared = storage({ activeAccountMode: "business", businessId: "business-1" });
  assert.equal(saveHiringPosition(draft(), options({ storage: shared, accountMode: "personal" })).ok, false);
  assert.equal(saveHiringPosition(draft({ businessId: "business-2" }), options({ storage: shared })).ok, false);
  const created = saveHiringPosition(draft(), options({ storage: shared }));
  assert.equal(created.ok, true);
  assert.equal(readHiringPositions(options({ storage: shared, businessId: "business-2", activeBusinessId: "business-2" })).length, 0);
  assert.equal(getHiringPositionById(created.position.id, { storage: shared, businessId: "business-2" }), null);
});

test("publish is idempotent, preserves ID, and projects one public opening", () => {
  const config = options();
  const created = saveHiringPosition(draft(), config).position;
  const published = publishHiringPosition(created.id, config);
  const repeated = publishHiringPosition(created.id, config);
  const openings = getHiringLocalJobOpenings({ storage: config.storage, publicProjection: true });
  assert.equal(published.position.status, "Open");
  assert.equal(published.position.id, created.id);
  assert.ok(published.position.publishedAt);
  assert.equal(repeated.ok, true);
  assert.equal(openings.filter((record) => record.id === created.id).length, 1);
  assert.equal(getHiringJobById(created.id, { storage: config.storage, publicProjection: true }).title, created.title);
});

test("editing preserves identity and updates the same public listing", () => {
  const config = options();
  const created = saveHiringPosition(draft({ status: "Open" }), config).position;
  const edited = saveHiringPosition({ ...created, title: "Senior Field Assistant" }, config);
  const openings = getHiringLocalJobOpenings({ storage: config.storage, publicProjection: true });
  assert.equal(edited.position.id, created.id);
  assert.equal(openings.filter((record) => record.id === created.id).length, 1);
  assert.equal(openings[0].title, "Senior Field Assistant");
});

test("pause hides public listing while preserving linked hiring records", () => {
  const store = storage({ activeAccountMode: "business", businessId: "business-1" });
  const config = options({ storage: store });
  const position = saveHiringPosition(draft({ status: "Open" }), config).position;
  const conversations = [{ id: "conversation-1", conversation_type: "hiring_application", businessId: "business-1", positionId: position.id, applicantId: "applicant-1", applicantName: "Same Name" }];
  const interviews = [{ id: "interview-1", businessId: "business-1", positionId: position.id, applicantId: "applicant-1", status: "scheduled" }];
  store.setItem("meetro_conversation_registry", JSON.stringify(conversations));
  store.setItem("meetroHiringInterviews:business-1", JSON.stringify(interviews));
  const result = pauseHiringPosition(position.id, config);
  assert.equal(result.position.status, "Paused");
  assert.equal(canPositionAcceptApplications(result.position), false);
  assert.equal(getHiringLocalJobOpenings({ storage: store, publicProjection: true }).length, 0);
  assert.deepEqual(JSON.parse(store.getItem("meetro_conversation_registry")), conversations);
  assert.deepEqual(JSON.parse(store.getItem("meetroHiringInterviews:business-1")), interviews);
});

test("reopen restores one listing and preserves stable identity", () => {
  const config = options();
  const position = saveHiringPosition(draft({ status: "Open" }), config).position;
  pauseHiringPosition(position.id, config);
  const reopened = reopenHiringPosition(position.id, config);
  assert.equal(reopened.position.status, "Open");
  assert.equal(reopened.position.id, position.id);
  assert.equal(reopened.position.pausedAt, "");
  assert.equal(getHiringLocalJobOpenings({ storage: config.storage, publicProjection: true }).length, 1);
});

test("open and paused positions close without deleting history or creating side effects", () => {
  for (const startingStatus of ["Open", "Paused"]) {
    const config = options({ storage: storage({ activeAccountMode: "business", businessId: "business-1" }) });
    const created = saveHiringPosition(draft({ status: "Open" }), config).position;
    const position = startingStatus === "Paused"
      ? pauseHiringPosition(created.id, config).position
      : created;
    const closed = closeHiringPosition(position.id, config);
    assert.equal(closed.position.status, "Closed");
    assert.ok(closed.position.closedAt);
    assert.equal(getHiringPositionById(position.id, { storage: config.storage }).status, "Closed");
    assert.equal(getHiringLocalJobOpenings({ storage: config.storage, publicProjection: true }).length, 0);
  }
});

test("closed positions remain readable and cannot be silently edited or reopened", () => {
  const config = options();
  const position = saveHiringPosition(draft({ status: "Open" }), config).position;
  closeHiringPosition(position.id, config);
  assert.equal(saveHiringPosition({ ...position, title: "Changed" }, config).ok, false);
  assert.equal(reopenHiringPosition(position.id, config).ok, false);
  assert.equal(getStoredHiringPositions(config).length, 1);
});

test("position applicant resolution uses stable position and business IDs", () => {
  const store = storage({ activeAccountMode: "business", businessId: "business-1" });
  const config = options({ storage: store });
  const position = saveHiringPosition(draft(), config).position;
  store.setItem("meetro_conversation_registry", JSON.stringify([
    { id: "conversation-1", conversation_type: "hiring_application", businessId: "business-1", positionId: position.id, applicantId: "applicant-1", applicantName: "Same Name" },
    { id: "conversation-2", conversation_type: "hiring_application", businessId: "business-1", positionId: "position-2", applicantId: "applicant-2", applicantName: "Same Name" },
    { id: "conversation-3", conversation_type: "hiring_application", businessId: "business-2", positionId: position.id, applicantId: "applicant-3", applicantName: "Same Name" },
  ]));
  assert.deepEqual(resolveHiringPositionApplicants(position.id, config).map((record) => record.id), ["applicant-1"]);
  assert.deepEqual(getHiringApplicantsForPosition(position.id, { storage: store, businessId: "business-1" }).map((record) => record.id), ["applicant-1"]);
});

test("legacy normalization preserves stable IDs and is idempotent", () => {
  const legacy = { position_id: "legacy-1", business_id: "business-1", positionTitle: "Painter", description: "Paint homes", location: "Lee County", employment_type: "Contract", status: "open" };
  const before = structuredClone(legacy);
  const first = normalizeHiringPosition(legacy, { now: "2026-07-13T12:00:00.000Z" });
  const second = normalizeHiringPosition(first, { now: "2026-07-13T12:00:00.000Z" });
  assert.equal(first.id, "legacy-1");
  assert.equal(first.status, "Open");
  assert.deepEqual(second, first);
  assert.deepEqual(legacy, before);
});

test("malformed and unavailable storage fail safely", () => {
  const malformed = storage({ meetroHiringPositions: "not-json", activeAccountMode: "business", businessId: "business-1" });
  assert.deepEqual(getStoredHiringPositions(malformed), []);
  const unavailable = { getItem() { throw new Error("unavailable"); }, setItem() { throw new Error("unavailable"); } };
  const result = saveHiringPosition(draft(), options({ storage: unavailable }));
  assert.equal(result.ok, false);
  assert.deepEqual(getStoredHiringPositions(unavailable), []);
});

test("registry results are defensive copies", () => {
  const config = options();
  saveHiringPosition(draft(), config);
  const positions = getHiringOpenPositions({ storage: config.storage });
  positions[0].title = "Changed";
  positions[0].requirements.push("Changed");
  assert.equal(getHiringOpenPositions({ storage: config.storage })[0].title, "Field Assistant");
  assert.equal(getHiringOpenPositions({ storage: config.storage })[0].requirements.includes("Changed"), false);
});
