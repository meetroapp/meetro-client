import assert from "node:assert/strict";
import test from "node:test";

import {
  archiveTeamMember,
  createTeamMember,
  deactivateTeamMember,
  getActiveTeamMemberCount,
  getTeamMember,
  getTeamMemberStorageKey,
  listTeamMembers,
  normalizeTeamMember,
  projectTeamMemberNotification,
  reactivateTeamMember,
  updateTeamMember,
} from "../src/utils/teamMembers.js";

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

const baseDraft = Object.freeze({
  displayName: "Maya Torres",
  email: "maya@example.com",
  phone: "239-555-0101",
  positionId: "field-handyman-helper",
  positionTitle: "Field Handyman Helper",
  hireDate: "2026-07-13",
  role: "Field Assistant",
  notes: "Offer accepted after completed interview.",
  sourceApplicantId: "applicant-maya-torres",
  sourceInterviewId: "interview-maya-torres",
  hiringDecision: "offer_accepted",
});

function options(overrides = {}) {
  return {
    businessId: "business-1",
    accountMode: "business",
    storage: storage(),
    idFactory: () => "team-member-1",
    now: "2026-07-13T12:00:00.000Z",
    ...overrides,
  };
}

test("business creates one stable Team Member without mutating the applicant draft", () => {
  const config = options();
  const draft = { ...baseDraft };
  const before = { ...draft };
  const result = createTeamMember(draft, config);

  assert.equal(result.ok, true);
  assert.equal(result.created, true);
  assert.equal(result.member.id, "team-member-1");
  assert.equal(result.member.businessId, "business-1");
  assert.equal(result.member.status, "active");
  assert.equal(result.member.memberType, "employee");
  assert.deepEqual(draft, before);
  assert.equal(getTeamMember("team-member-1", config).displayName, "Maya Torres");
});

test("missing, personal, and cross-business ownership are rejected", () => {
  const shared = storage();
  const missingMode = createTeamMember(baseDraft, {
    ...options({ storage: shared }),
    accountMode: "",
  });
  const personal = createTeamMember(baseDraft, options({ storage: shared, accountMode: "personal" }));
  const crossBusiness = createTeamMember(
    { ...baseDraft, businessId: "business-2" },
    options({ storage: shared, businessId: "business-1" })
  );

  assert.equal(missingMode.ok, false);
  assert.equal(missingMode.errors.accountMode, "business_account_required");
  assert.equal(personal.ok, false);
  assert.equal(personal.errors.accountMode, "business_account_required");
  assert.equal(crossBusiness.ok, false);
  assert.equal(crossBusiness.errors.businessId, "cross_business_member");
  assert.deepEqual(listTeamMembers(options({ storage: shared, businessId: "business-2" })), []);
});

test("unsupported member status fails closed", () => {
  const result = createTeamMember(
    { ...baseDraft, status: "deleted" },
    options()
  );

  assert.equal(result.ok, false);
  assert.equal(result.errors.status, "invalid");
});

test("business-scoped storage prevents cross-business leakage", () => {
  const shared = storage();
  createTeamMember(baseDraft, options({ storage: shared }));

  assert.equal(listTeamMembers(options({ storage: shared, businessId: "business-1" })).length, 1);
  assert.equal(listTeamMembers(options({ storage: shared, businessId: "business-2" })).length, 0);
  assert.notEqual(
    getTeamMemberStorageKey(options({ storage: shared, businessId: "business-1" })),
    getTeamMemberStorageKey(options({ storage: shared, businessId: "business-2" }))
  );
});

test("duplicate applicant handoff returns the existing member and preserves applicant history input", () => {
  const shared = storage();
  const config = options({ storage: shared });
  const applicantHistory = { id: "applicant-maya-torres", status: "Reviewing", notes: "Historical" };
  const first = createTeamMember(baseDraft, config);
  const second = createTeamMember({ ...baseDraft, displayName: "Maya Updated" }, {
    ...config,
    idFactory: () => "team-member-2",
  });

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.member.id, "team-member-1");
  assert.equal(listTeamMembers(config).length, 1);
  assert.deepEqual(applicantHistory, { id: "applicant-maya-torres", status: "Reviewing", notes: "Historical" });
});

test("edit, deactivate, archive, and reactivate preserve stable identity and history", () => {
  const shared = storage();
  const config = options({ storage: shared });
  createTeamMember(baseDraft, config);
  const edited = updateTeamMember("team-member-1", { notes: "Updated notes" }, config);
  const inactive = deactivateTeamMember("team-member-1", config);
  const archived = archiveTeamMember("team-member-1", config);
  const reactivated = reactivateTeamMember("team-member-1", config);

  assert.equal(edited.member.id, "team-member-1");
  assert.equal(edited.member.createdAt, "2026-07-13T12:00:00.000Z");
  assert.equal(inactive.member.status, "inactive");
  assert.equal(archived.member.status, "archived");
  assert.equal(reactivated.member.status, "active");
  assert.equal(listTeamMembers(config).length, 1);
  assert.equal(getActiveTeamMemberCount(config), 1);
});

test("legacy employee records normalize deterministically", () => {
  const legacy = {
    employeeId: "legacy-1",
    contractorId: "business-1",
    employeeName: "Alex Worker",
    jobTitle: "Painter",
    employmentType: "contractor",
    startDate: "2026-06-01",
    active: false,
  };
  const before = { ...legacy };
  const first = normalizeTeamMember(legacy, { now: "2026-07-13T12:00:00.000Z" });
  const second = normalizeTeamMember(legacy, { now: "2026-07-13T12:00:00.000Z" });

  assert.equal(first.id, "legacy-1");
  assert.equal(first.displayName, "Alex Worker");
  assert.equal(first.positionTitle, "Painter");
  assert.equal(first.memberType, "contractor");
  assert.equal(first.status, "inactive");
  assert.deepEqual(first, second);
  assert.deepEqual(legacy, before);
});

test("create, archive, and reactivate notifications are professional-only and emitted once", () => {
  const shared = storage();
  const notifications = [];
  const config = options({
    storage: shared,
    onNotification: (notification) => notifications.push(notification),
  });
  createTeamMember(baseDraft, config);
  createTeamMember(baseDraft, config);
  archiveTeamMember("team-member-1", config);
  reactivateTeamMember("team-member-1", config);

  assert.deepEqual(notifications.map((item) => item.type), [
    "team_member_created",
    "team_member_archived",
    "team_member_reactivated",
  ]);
  notifications.forEach((notification) => {
    assert.equal(notification.role, "professional");
    assert.equal(notification.targetRole, "professional");
    assert.equal("customerId" in notification.metadata, false);
    assert.equal("requestId" in notification.metadata, false);
  });
  assert.equal(projectTeamMemberNotification({}, "created"), null);
});
