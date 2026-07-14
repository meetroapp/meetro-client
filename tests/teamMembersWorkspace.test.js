import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getBusinessToolById } from "../src/utils/businessToolsRegistry.js";
import { t } from "../src/utils/language.js";

const appSource = readFileSync("src/App.jsx", "utf8");
const pageSource = readFileSync("src/pages/TeamMembers.jsx", "utf8");
const componentSource = readFileSync("src/components/HiringUnavailableState.jsx", "utf8");
const businessToolsSource = readFileSync("src/pages/BusinessCommandCenter.jsx", "utf8");
const profileSource = readFileSync("src/pages/ContractorProfile.jsx", "utf8");
const cssSource = readFileSync("src/index.css", "utf8");

test("Team Members remains professional-only and reachable through Business Tools", () => {
  assert.match(appSource, /page === "teamMembers"/);
  assert.match(appSource, /<TeamMembers setPage=\{setPage\}/);
  assert.match(businessToolsSource, /setPage\("teamMembers"\)/);
  const tool = getBusinessToolById("teamMembers");
  assert.equal(tool.route, "teamMembers");
  assert.equal(tool.status, "read_only");
});

test("Team Members does not read, render, or mutate device-local personnel records", () => {
  assert.doesNotMatch(pageSource, /utils\/teamMembers|hiringCenterRegistry|meetroNotifications/);
  assert.doesNotMatch(pageSource, /localStorage|sessionStorage/);
  assert.doesNotMatch(pageSource, /createTeamMember|updateTeamMember|archiveTeamMember|reactivateTeamMember/);
  assert.match(pageSource, /scope="team"/);
  assert.match(componentSource, /teamMembersUnavailableText/);
});

test("Business Profile omits the browser-derived personnel count", () => {
  assert.doesNotMatch(profileSource, /getActiveTeamMemberCount|activeTeamMemberCount/);
  assert.doesNotMatch(profileSource, /teamMemberInternalCount/);
});

test("Team Members unavailable workspace remains mobile-safe", () => {
  assert.match(cssSource, /\.hiring-truth-page[\s\S]*safe-area-inset-bottom/);
  assert.match(cssSource, /\.hiring-truth-workspace[\s\S]*max-width: 760px/);
  assert.match(cssSource, /\.hiring-truth-card button[\s\S]*min-height: 48px/);
});

test("Team Members unavailable copy exists in every supported language", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of [
      "teamMembersTruthDescription",
      "teamMembersUnavailable",
      "teamMembersUnavailableText",
    ]) {
      assert.notEqual(t(key, language), key, `${language}:${key}`);
    }
  }
});
