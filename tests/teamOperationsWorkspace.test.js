import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync("src/App.jsx", "utf8");
const pageSource = readFileSync("src/pages/TeamOperations.jsx", "utf8");
const apiSource = readFileSync("src/utils/timeEvidenceApi.js", "utf8");
const teamSource = readFileSync("src/pages/TeamMembers.jsx", "utf8");

test("Team workspace registers Members, Today, and Timesheets navigation", () => {
  assert.match(appSource, /import TeamOperations from "\.\/pages\/TeamOperations"/);
  assert.match(appSource, /page === "teamOperations"/);
  assert.match(pageSource, />Members</);
  assert.match(pageSource, />Today</);
  assert.match(pageSource, />Timesheets</);
  assert.match(teamSource, /Team Today & Timesheets/);
});

test("Business time setup is explicit, Owner-governed, and never auto-persists device timezone", () => {
  assert.match(pageSource, /Set Your Business Time Settings/);
  assert.match(pageSource, /resolvedOptions\(\)\.timeZone/);
  assert.match(pageSource, /only a suggestion/);
  assert.match(pageSource, /settings\?\.canManage/);
  assert.match(pageSource, /Save & Continue/);
  assert.match(pageSource, /updateBusinessTimeSettings\(\{ businessId, \.\.\.draft \}/);
  assert.doesNotMatch(pageSource, /localStorage|sessionStorage/);
  assert.match(pageSource, /async function save\(event\)[\s\S]*updateBusinessTimeSettings\(\{ businessId, \.\.\.draft \}/);
});

test("client uses authenticated governed settings and projection endpoints", () => {
  for (const route of [
    "/team/time-settings",
    "/team/today",
    "/team/timesheets",
  ]) {
    assert.match(apiSource, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(apiSource, /method: "PUT"/);
  assert.match(pageSource, /fetchBusinessTimeSettings/);
  assert.match(pageSource, /fetchTeamToday/);
  assert.match(pageSource, /fetchTimesheets/);
});

test("Team Today presents server timers, field status, exact Jobs, and provisional live elapsed", () => {
  assert.match(pageSource, /member\.activeTimer/);
  assert.match(pageSource, /member\.fieldStatus/);
  assert.match(pageSource, /timer\.startedAt/);
  assert.match(pageSource, /setInterval\(\(\) => setNow\(Date\.now\(\)\), 1000\)/);
  assert.match(pageSource, /workCenter\?jobId=/);
  assert.match(pageSource, /encodeURIComponent\(job\.jobId\)/);
  assert.match(pageSource, /Location at Clock In/);
  assert.doesNotMatch(pageSource, /latitude|longitude|live map|GPS trail/i);
});

test("Timesheets distinguish completed totals from active provisional elapsed", () => {
  assert.match(pageSource, /completedTotalSeconds/);
  assert.match(pageSource, /categoryTotals/);
  assert.match(pageSource, /session\.active \?/);
  assert.match(pageSource, /Current elapsed:/);
  assert.match(pageSource, /provisional/);
  assert.match(pageSource, /No Job required/);
  assert.match(pageSource, /Business timezone/);
  assert.match(pageSource, /timeZone,/);
});

test("workspace adds no time editing, payroll, billing, or surveillance authority", () => {
  assert.doesNotMatch(pageSource, /Edit Clock|Delete Session|Approve Time|Reject Time|Clock In for|Clock Out for/i);
  assert.doesNotMatch(apiSource, /timesheets\/(?:edit|delete|approve|reject)/i);
  assert.match(pageSource, /This is not payroll, wages, overtime, or customer billing/);
  assert.doesNotMatch(pageSource, /pay rate|hourly wage|job costing|customer invoice/i);
});
