import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profileSource = readFileSync(
  new URL("../src/pages/Profile.jsx", import.meta.url),
  "utf8"
);

test("Profile Account section uses existing Team Members workspace route", () => {
  assert.match(profileSource, /fetchMyTeamAuthority/);
  assert.match(profileSource, /window\.addEventListener\("meetroTeamAuthorityChanged", refreshTeamMembersAuthority\)/);
  assert.match(profileSource, /setPage\("teamMembers"\)/);
  assert.match(profileSource, /label=\{t\("teamMembers"\)\}/);
});

test("Team Members visibility is based on governed TEAM_VIEW or Owner authority", () => {
  assert.match(profileSource, /function hasTeamMembersReadAuthority\(membership = \{\}\)/);
  assert.match(profileSource, /membership\.status/);
  assert.match(profileSource, /membership\.role === "OWNER"/);
  assert.match(profileSource, /TEAM_VIEW/);
  assert.match(profileSource, /\{canShowTeamMembers && \([\s\S]*label=\{t\("teamMembers"\)[\s\S]*onClick=\{\(\) => setPage\("teamMembers"\)\}/);
});

test("Team Members entry is independent from Hiring navigation", () => {
  assert.doesNotMatch(profileSource, /label=\{t\("teamMembers"\)\}[\s\S]*setPage\("hiring/);
});
