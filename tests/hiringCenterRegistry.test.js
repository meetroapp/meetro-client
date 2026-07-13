import assert from "node:assert/strict";
import test from "node:test";

import {
  getHiringApplicants,
  getHiringApplicantById,
  getHiringApplicantsForPosition,
  getHiringInterviews,
  getHiringJobById,
  getHiringJobCategories,
  getHiringLocalJobOpenings,
  getHiringOpenPositions,
  getHiringPositionById,
  getStoredHiringPositions,
  HIRING_POSITIONS_STORAGE_KEY,
  getHiringTeamMembers,
  HIRING_APPLICANT_STATUSES,
  HIRING_EMPLOYMENT_TYPES,
  HIRING_POSITION_STATUSES,
  saveHiringPosition,
  validateHiringPositionDraft,
} from "../src/utils/hiringCenterRegistry.js";

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

test("Hiring Center registry exposes MVP positions with required fields", () => {
  const positions = getHiringOpenPositions();

  assert.ok(positions.length >= 1);

  positions.forEach((position) => {
    assert.ok(position.id);
    assert.ok(position.title);
    assert.ok(position.description);
    assert.ok(position.payRange);
    assert.ok(position.serviceArea);
    assert.ok(HIRING_EMPLOYMENT_TYPES.includes(position.employmentType));
    assert.ok(position.experienceRequired);
    assert.equal(typeof position.vehicleRequired, "boolean");
    assert.equal(typeof position.backgroundCheckRequired, "boolean");
    assert.ok(HIRING_POSITION_STATUSES.includes(position.status));
  });
});

test("Hiring Center registry exposes applicant previews with valid statuses", () => {
  const applicants = getHiringApplicants();

  assert.ok(applicants.length >= 1);

  applicants.forEach((applicant) => {
    assert.ok(applicant.id);
    assert.ok(applicant.name);
    assert.ok(applicant.positionId);
    assert.ok(applicant.positionAppliedFor);
    assert.ok(applicant.experienceSummary);
    assert.ok(applicant.applicationDate);
    assert.ok(HIRING_APPLICANT_STATUSES.includes(applicant.status));
  });
});

test("Hiring Center exposes interviews and team members from shared data", () => {
  const interviews = getHiringInterviews();
  const teamMembers = getHiringTeamMembers();

  assert.ok(Array.isArray(interviews));
  assert.ok(Array.isArray(teamMembers));

  interviews.forEach((interview) => {
    assert.ok(interview.id);
    assert.ok(interview.applicantId);
    assert.ok(interview.positionId);
    assert.ok(interview.status);
  });
});

test("Jobs & Hiring registry exposes searchable local openings", () => {
  const categories = getHiringJobCategories();
  const openings = getHiringLocalJobOpenings();

  assert.ok(categories.includes("Handyman"));
  assert.ok(categories.includes("General Labor"));
  assert.ok(openings.length >= 1);

  openings.forEach((job) => {
    assert.ok(job.id);
    assert.ok(job.title);
    assert.ok(job.businessName);
    assert.ok(job.category);
    assert.ok(job.description);
    assert.ok(Array.isArray(job.requirements));
    assert.ok(job.requirements.length >= 1);
    assert.ok(job.payRange);
    assert.ok(job.location);
    assert.ok(HIRING_EMPLOYMENT_TYPES.includes(job.employmentType));
  });
});

test("Jobs & Hiring openings are derived from open Hiring Center positions", () => {
  const positions = getHiringOpenPositions();
  const openings = getHiringLocalJobOpenings();
  const openPositionIds = positions
    .filter((position) => position.status === "Open")
    .map((position) => position.id)
    .sort();
  const openingSourceIds = openings
    .map((job) => job.sourcePositionId)
    .sort();

  assert.deepEqual(openingSourceIds, openPositionIds);
  assert.equal(getHiringPositionById(openingSourceIds[0])?.id, openingSourceIds[0]);
});

test("position detail helpers return scoped applicants", () => {
  const position = getHiringOpenPositions().find((item) => item.id === "field-handyman-helper");
  const applicants = getHiringApplicantsForPosition(position.id);

  assert.ok(applicants.length >= 1);
  applicants.forEach((applicant) => assert.equal(applicant.positionId, position.id));
});

test("hiring conversation applicants project by stable IDs without name matching", () => {
  const storage = createMemoryStorage();
  storage.setItem("meetro_conversation_registry", JSON.stringify([{
    id: "hiring-conversation-1",
    conversation_type: "hiring_application",
    applicantId: "applicant-conversation-1",
    applicantName: "Same Name",
    positionId: "field-handyman-helper",
    positionTitle: "Field Handyman Helper",
    businessId: "local-business",
  }]));
  const applicant = getHiringApplicantById("applicant-conversation-1", storage);
  assert.equal(applicant.id, "applicant-conversation-1");
  assert.equal(applicant.positionId, "field-handyman-helper");
  assert.equal(applicant.businessId, "local-business");
  assert.equal(getHiringApplicantById("Same Name", storage), null);
});

test("Hiring registry helpers return defensive copies", () => {
  const positions = getHiringOpenPositions();
  const firstTitle = positions[0].title;

  positions[0].title = "Changed";

  assert.equal(getHiringOpenPositions()[0].title, firstTitle);

  const job = getHiringLocalJobOpenings()[0];
  const originalRequirement = job.requirements[0];

  job.requirements[0] = "Changed";

  assert.equal(getHiringJobById(job.id).requirements[0], originalRequirement);
});

test("hiring position validation requires title, description, and service area", () => {
  const validation = validateHiringPositionDraft({
    title: "",
    description: "",
    serviceArea: "",
  });

  assert.equal(validation.valid, false);
  assert.deepEqual(validation.missingFields, [
    "title",
    "description",
    "serviceArea",
  ]);
});

test("saveHiringPosition persists draft positions with normalized fields", () => {
  const storage = createMemoryStorage();
  const result = saveHiringPosition(
    {
      title: "Weekend Field Assistant",
      description: "Help with Saturday maintenance and cleanup work.",
      serviceArea: "Lee County, FL",
      skillsNeeded: "Hand tools, customer communication",
      employmentType: "Part Time",
      status: "Draft",
    },
    {
      storage,
      createdAt: "2026-06-23T12:00:00.000Z",
      updatedAt: "2026-06-23T12:00:00.000Z",
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.position.status, "Draft");
  assert.deepEqual(result.position.skillsNeeded, [
    "Hand tools",
    "customer communication",
  ]);

  const stored = getStoredHiringPositions(storage);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].title, "Weekend Field Assistant");
  assert.ok(storage.getItem(HIRING_POSITIONS_STORAGE_KEY));
});

test("created draft and open positions appear in Hiring Center position list", () => {
  const storage = createMemoryStorage();

  const draft = saveHiringPosition(
    {
      title: "Draft Helper",
      description: "A saved draft role.",
      serviceArea: "Fort Myers, FL",
      status: "Draft",
    },
    { storage, createdAt: "2026-06-23T13:00:00.000Z" }
  );
  const open = saveHiringPosition(
    {
      title: "Published Helper",
      description: "A published local role.",
      serviceArea: "Fort Myers, FL",
      status: "Open",
    },
    { storage, createdAt: "2026-06-23T14:00:00.000Z" }
  );

  const positions = getHiringOpenPositions(storage);
  assert.ok(positions.some((position) => position.id === draft.position.id));
  assert.ok(positions.some((position) => position.id === open.position.id));
  assert.equal(getHiringPositionById(draft.position.id, storage)?.status, "Draft");
  assert.equal(getHiringPositionById(open.position.id, storage)?.status, "Open");
});

test("published positions appear in Jobs & Hiring while drafts stay internal", () => {
  const storage = createMemoryStorage();
  const draft = saveHiringPosition(
    {
      title: "Internal Draft Role",
      description: "A draft role that should not appear as a job opening.",
      serviceArea: "Fort Myers, FL",
      status: "Draft",
    },
    { storage, createdAt: "2026-06-23T15:00:00.000Z" }
  );
  const open = saveHiringPosition(
    {
      title: "Open Local Role",
      description: "An open role that should appear in Jobs & Hiring.",
      serviceArea: "Fort Myers, FL",
      status: "Open",
      payRange: "$20-$25/hr",
      scheduleAvailability: "Weekdays",
      contactPreference: "Text first",
    },
    { storage, createdAt: "2026-06-23T16:00:00.000Z" }
  );

  const openings = getHiringLocalJobOpenings(storage);

  assert.equal(openings.some((job) => job.sourcePositionId === draft.position.id), false);
  assert.equal(openings.some((job) => job.sourcePositionId === open.position.id), true);
  assert.equal(getHiringJobById(open.position.id, storage)?.title, "Open Local Role");
});
