import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const teamMembersSource = readFileSync(
  new URL("../src/pages/TeamMembers.jsx", import.meta.url),
  "utf8"
);
const teamApiSource = readFileSync(
  new URL("../src/utils/teamApi.js", import.meta.url),
  "utf8"
);

test("Team invitation UX uses governed resend endpoint", () => {
  assert.match(
    teamApiSource,
    /\/team\/invitations\/\$\{encodeURIComponent\(invitationId\)\}\/resend/
  );
  assert.match(teamMembersSource, /resendBusinessTeamInvitation/);
  assert.match(teamMembersSource, /Resend invitation/);
});

test("Team invitation links never use invitation UUID as secret token", () => {
  assert.match(
    teamMembersSource,
    /const token = firstTruthyText\(\s*invitation\.token,\s*invitation\.invitationToken\s*\)/
  );
  assert.doesNotMatch(
    teamMembersSource,
    /const token = firstTruthyText\([\s\S]{0,160}invitation\.id/
  );
});

test("Team invitation UX has truthful clipboard fallback", () => {
  assert.match(teamMembersSource, /navigator\?\.clipboard\?\.writeText/);
  assert.match(teamMembersSource, /Unable to copy automatically/);
  assert.match(teamMembersSource, /manualCopyLink/);
  assert.match(teamMembersSource, /onFocus=\{\(event\) => event\.currentTarget\.select\(\)\}/);
});

test("Team invitation primary action is Send Invitation", () => {
  assert.match(teamMembersSource, />\s*Send Invitation\s*</);
  assert.doesNotMatch(teamMembersSource, />\s*Create Invitation\s*</);
});
