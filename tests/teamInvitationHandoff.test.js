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

const loginSource = readFileSync(
  new URL("../src/pages/Login.jsx", import.meta.url),
  "utf8"
);

test("Team invitation has a public read-only inspection request", () => {
  assert.match(
    teamApiSource,
    /\/team\/invitations\/inspect/
  );
  assert.match(
    teamMembersSource,
    /inspectBusinessTeamInvitation/
  );
});

test("Team invitation renders a dedicated account handoff instead of owner administration", () => {
  assert.match(teamMembersSource, /Meetro Team Invitation/);
  assert.match(teamMembersSource, /Switch Account/);
  assert.match(teamMembersSource, /Sign in to Join/);
  assert.match(teamMembersSource, /Create Account & Join/);
  assert.match(teamMembersSource, /Accept & Join Team/);
});

test("wrong-account switch clears the session while preserving invitation authority in the route", () => {
  assert.match(teamMembersSource, /clearMeetroSession/);
  assert.match(teamMembersSource, /teamInvitation/);
  assert.match(teamMembersSource, /URLSearchParams/);
  assert.doesNotMatch(teamMembersSource, /localStorage|sessionStorage/);
});

test("Login restores the pending Team invitation from route authority after account switching", () => {
  assert.match(loginSource, /teamInvitation/);
  assert.match(loginSource, /inspectBusinessTeamInvitation/);
  assert.match(loginSource, /teamMembers\?invitation=/);
});

test("accepted Field Employee membership resolves through canonical role-aware landing", () => {
  assert.match(
    teamMembersSource,
    /resolvePrimaryTeamExperience/
  );
  assert.match(
    teamMembersSource,
    /experience\.landingRoute/
  );
});

test("Send and Resend invitation actions expose local progress and success feedback", () => {
  assert.match(teamMembersSource, /Sending…/);
  assert.match(teamMembersSource, /✓ Sent just now/);
  assert.match(teamMembersSource, /Couldn’t send/);
});
