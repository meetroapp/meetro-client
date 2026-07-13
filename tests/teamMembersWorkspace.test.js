import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getBusinessToolById } from "../src/utils/businessToolsRegistry.js";
import { getNotificationCategory, getNotificationRoute } from "../src/utils/notificationCenter.js";
import { t } from "../src/utils/language.js";

const appSource = readFileSync("src/App.jsx", "utf8");
const pageSource = readFileSync("src/pages/TeamMembers.jsx", "utf8");
const hiringSource = readFileSync("src/pages/HiringCenter.jsx", "utf8");
const businessToolsSource = readFileSync("src/pages/BusinessCommandCenter.jsx", "utf8");
const profileSource = readFileSync("src/pages/ContractorProfile.jsx", "utf8");
const utilitySource = readFileSync("src/utils/teamMembers.js", "utf8");
const cssSource = readFileSync("src/index.css", "utf8");

test("Team Members is a professional-only route reachable from Business Tools and Hiring Center", () => {
  assert.match(appSource, /"teamMembers"/);
  assert.match(appSource, /page === "teamMembers"/);
  assert.match(appSource, /<TeamMembers setPage=\{setPage\}/);
  assert.match(businessToolsSource, /teamMembers:[\s\S]*title: t\("teamMembers"\)/);
  assert.match(businessToolsSource, /toolId === "teamMembers"[\s\S]*setPage\("teamMembers"\)/);
  assert.match(hiringSource, /teamMemberManage/);
  assert.doesNotMatch(readFileSync("src/pages/Home.jsx", "utf8"), /setPage\("teamMembers"\)/);

  const tool = getBusinessToolById("teamMembers");
  assert.equal(tool.route, "teamMembers");
  assert.equal(tool.status, "ready");
});

test("completed interview handoff creates a Team Member while preserving applicant history", () => {
  assert.match(hiringSource, /latestInterview\?\.status === "completed"/);
  assert.match(hiringSource, /hiringDecision: "offer_accepted"/);
  assert.match(hiringSource, /sourceApplicantId: applicant\.id/);
  assert.match(hiringSource, /sourceInterviewId: interview\?\.id/);
  assert.match(hiringSource, /createTeamMember\(/);
  assert.match(hiringSource, /setPage\("teamMembers"\)/);
  assert.doesNotMatch(hiringSource, /deleteHiringApplicant|removeHiringApplicant/);
});

test("workspace renders required list, detail, editor, and non-destructive lifecycle actions", () => {
  for (const token of [
    "displayName",
    "positionTitle",
    "status",
    "hireDate",
    "teamMemberView",
    "teamMemberEdit",
    "teamMemberDeactivate",
    "teamMemberReactivate",
    "teamMemberArchive",
    "teamMemberIdentity",
    "teamMemberRole",
    "teamMemberPosition",
    "teamMemberContact",
    "teamMemberEmployment",
    "teamMemberNotes",
  ]) {
    assert.match(pageSource, new RegExp(token));
  }
  assert.doesNotMatch(pageSource, /deleteTeamMember|Delete Team Member|teamMemberDelete/);
  assert.doesNotMatch(utilitySource, /removeItem\([^)]*team|deleteTeamMember/i);
});

test("Business Profile shows only the internal active Team Member count", () => {
  assert.match(profileSource, /getActiveTeamMemberCount/);
  assert.match(profileSource, /teamMemberInternalCount/);
  assert.match(profileSource, /value=\{String\(activeTeamMemberCount\)\}/);
  assert.doesNotMatch(profileSource, /teamMembers\.map|listTeamMembers\(/);
});

test("Team Member notifications are professional-only and route only in business mode", () => {
  const notification = {
    type: "team_member_created",
    role: "professional",
    metadata: { memberId: "team-member-1", businessId: "business-1" },
  };
  assert.equal(getNotificationCategory(notification), "hiring");
  assert.deepEqual(getNotificationRoute(notification, "business"), {
    page: "teamMembers",
    context: { selectedTeamMemberId: "team-member-1" },
  });
  assert.deepEqual(getNotificationRoute(notification, "personal"), {
    page: "home",
    context: { selectedTeamMemberId: "" },
  });
});

test("Team Members workspace is viewport-contained and mobile-safe", () => {
  assert.match(cssSource, /\.team-members-page[\s\S]*safe-area-inset-bottom/);
  assert.match(cssSource, /\.team-member-editor-overlay[\s\S]*safe-area-inset-top/);
  assert.match(cssSource, /\.team-member-editor[\s\S]*width: min\(100%, 720px\)/);
  assert.match(cssSource, /\.team-member-editor-content[\s\S]*overflow-y: auto/);
  assert.match(cssSource, /\.team-member-field[\s\S]*min-height: 44px/);
  assert.match(cssSource, /@media \(max-width: 700px\)/);
  assert.match(cssSource, /\.team-member-form-grid[\s\S]*grid-template-columns: 1fr/);
});

test("required Team Member labels exist in English, Spanish, French, and Portuguese", () => {
  const keys = [
    "teamMembers",
    "teamMemberAdd",
    "teamMemberEdit",
    "teamMemberArchive",
    "teamMemberDeactivate",
    "teamMemberReactivate",
    "teamMemberStatusPending",
    "teamMemberStatusActive",
    "teamMemberStatusInactive",
    "teamMemberStatusArchived",
    "teamMemberHireDate",
    "teamMemberPosition",
    "teamMemberRole",
    "teamMemberNotes",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    keys.forEach((key) => {
      assert.notEqual(t(key, language), key);
      assert.ok(t(key, language).trim());
    });
  }
});
