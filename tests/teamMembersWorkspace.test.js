import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getBusinessToolById } from "../src/utils/businessToolsRegistry.js";

const appSource = readFileSync("src/App.jsx", "utf8");
const pageSource = readFileSync("src/pages/TeamMembers.jsx", "utf8");
const apiSource = readFileSync("src/utils/teamApi.js", "utf8");
const businessToolsSource = readFileSync(
  "src/pages/BusinessCommandCenter.jsx",
  "utf8"
);
const profileSource = readFileSync("src/pages/ContractorProfile.jsx", "utf8");
const loginSource = readFileSync("src/pages/Login.jsx", "utf8");

test("Team Members is an authenticated invitation and business administration route", () => {
  assert.match(appSource, /page === "teamMembers"/);
  assert.match(appSource, /<TeamMembers setPage=\{setPage\}/);
  assert.doesNotMatch(
    appSource,
    /professionalOnlyPages[\s\S]{0,700}"teamMembers"/
  );
  assert.match(businessToolsSource, /setPage\("teamMembers"\)/);
  const tool = getBusinessToolById("teamMembers");
  assert.equal(tool.route, "teamMembers");
  assert.equal(tool.status, "ready");
});

test("Team workspace uses canonical authenticated APIs instead of device-local personnel records", () => {
  assert.match(pageSource, /fetchMyTeamAuthority/);
  assert.match(pageSource, /fetchBusinessTeam/);
  assert.match(pageSource, /createBusinessTeamInvitation/);
  assert.match(pageSource, /acceptBusinessTeamInvitation/);
  assert.match(pageSource, /deactivateBusinessTeamMember/);
  assert.doesNotMatch(
    pageSource,
    /utils\/teamMembers|createTeamMember|archiveTeamMember|qa_fixture/
  );
  assert.match(apiSource, /authFetch/);
  assert.match(apiSource, /\/team\/invitations\/accept/);
});

test("pending invitation survives login and returns to exact acceptance route", () => {
  assert.match(loginSource, /pendingTeamInvitationToken/);
  assert.match(loginSource, /setPage\(`teamMembers\?invitation=/);
  assert.match(
    pageSource,
    /Sign in with|authenticated email|exact business Team/i
  );
});

test("preset roles and seat reservation truth are presented without custom permissions", () => {
  assert.match(pageSource, /MANAGER/);
  assert.match(pageSource, /BOOKKEEPER_FINANCE/);
  assert.match(pageSource, /FIELD_EMPLOYEE/);
  assert.match(pageSource, /pending invitation immediately reserves one seat/i);
  assert.match(pageSource, /reservedSeats/);
  assert.doesNotMatch(pageSource, /custom permission/i);
});

test("Business Profile still omits browser-derived personnel counts", () => {
  assert.doesNotMatch(
    profileSource,
    /getActiveTeamMemberCount|activeTeamMemberCount/
  );
  assert.doesNotMatch(profileSource, /teamMemberInternalCount/);
});
