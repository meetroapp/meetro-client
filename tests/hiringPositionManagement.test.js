import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { t } from "../src/utils/language.js";
import { getBusinessToolById } from "../src/utils/businessToolsRegistry.js";
import {
  getRuntimeHiringQaOptions,
  isHiringQaFixtureEnabled,
} from "../src/utils/hiringFixtureGate.js";

const center = fs.readFileSync("src/pages/HiringCenter.jsx", "utf8");
const editor = fs.readFileSync("src/components/HiringPositionEditor.jsx", "utf8");
const registry = fs.readFileSync("src/utils/hiringCenterRegistry.js", "utf8");
const interviews = fs.readFileSync("src/utils/hiringInterviews.js", "utf8");
const css = fs.readFileSync("src/index.css", "utf8");

test("completed position actions no longer use Preview or Coming Soon handlers", () => {
  assert.doesNotMatch(center, /Create Position · \{copy\.preview\}/);
  assert.doesNotMatch(center, /Position management actions are preview-only/);
  for (const action of ["publishHiringPosition", "pauseHiringPosition", "reopenHiringPosition", "closeHiringPosition"]) {
    assert.match(center, new RegExp(action));
  }
  assert.match(center, /setPositionApplicantView\(true\)/);
  assert.equal(getBusinessToolById("hiringCenter").status, "ready");
});

test("one viewport-owned editor supports create and edit with required position fields", () => {
  assert.match(editor, /role="dialog"/);
  assert.match(editor, /aria-modal="true"/);
  assert.match(editor, /event\.key === "Escape"/);
  for (const field of [
    "title", "description", "serviceArea", "employmentType", "payMin", "payMax",
    "payUnit", "experience", "skillsNeeded", "requirements", "schedule",
    "contactPreference", "vehicleRequired", "backgroundCheckRequired",
  ]) {
    assert.match(editor, new RegExp(`draft\\.${field}`));
  }
  assert.match(editor, /onSaveDraft/);
  assert.match(editor, /onPublish/);
  assert.match(editor, /onSaveChanges/);
  assert.doesNotMatch(editor, /input type="file"/);
});

test("status actions are explicit and closure warnings preserve interviews", () => {
  assert.match(center, /selectedPosition\.status === "Draft"/);
  assert.match(center, /selectedPosition\.status === "Open"/);
  assert.match(center, /selectedPosition\.status === "Paused"/);
  assert.match(center, /selectedPosition\.status !== "Closed"/);
  assert.match(center, /hiringPositionInterviewWarning/);
  assert.match(registry, /closed_position_immutable/);
  assert.doesNotMatch(registry, /deleteHiringPosition|removeHiringPosition/);
});

test("position applicant workspace stays scoped to stable IDs and hiring actions", () => {
  assert.match(center, /getHiringApplicantsForPosition\(selectedPosition\.id, hiringOptions\)/);
  assert.match(center, /applicant\.id/);
  assert.match(center, /positionId: selectedPosition\.id/);
  assert.match(center, /viewApplicant/);
  assert.match(center, /scheduleInterview/);
  assert.doesNotMatch(center, /Create Project|Create Quote|Create Invoice|Schedule Visit/);
});

test("incomplete interview copy cannot render pending invented values", () => {
  assert.match(interviews, /Scheduling details required/);
  assert.doesNotMatch(interviews, /Date pending|Time pending/);
  assert.match(interviews, /scheduling_required/);
  assert.match(interviews, /getUpcomingHiringInterviews/);
});

test("production QA mode fails closed even with a stale storage flag", () => {
  const stale = { getItem: () => "true" };
  assert.deepEqual(getRuntimeHiringQaOptions(stale, { DEV: false }), {
    environment: "production",
    qaMode: false,
  });
  assert.equal(isHiringQaFixtureEnabled({ environment: "production", qaMode: true, businessId: "local-business" }), false);
  assert.equal(isHiringQaFixtureEnabled({ environment: "development", qaMode: true, businessId: "local-business" }), true);
  assert.equal(isHiringQaFixtureEnabled({ environment: "development", qaMode: true, businessId: "real-business" }), false);
});

test("editor is bounded and stacks safely on phones and narrow iPad", () => {
  assert.match(css, /\.hiring-position-editor[\s\S]*width: min\(760px, 100%\)/);
  assert.match(css, /max-height: min\(860px/);
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*\.hiring-position-form-grid/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.hiring-position-overlay/);
  assert.match(css, /\.hiring-position-editor-actions button[\s\S]*min-height: 44px/);
  assert.match(css, /env\(safe-area-inset-bottom/);
});

test("position-management labels exist in all supported languages", () => {
  const keys = [
    "hiringPositionCreate", "hiringPositionEdit", "hiringPositionDetails",
    "hiringPositionTitle", "hiringPositionServiceArea", "hiringPositionEmploymentType",
    "hiringPositionMinimumPay", "hiringPositionMaximumPay", "hiringPositionPayUnit",
    "hiringPositionExperience", "hiringPositionSkillsNeeded", "hiringPositionRequirements",
    "hiringPositionSchedule", "hiringPositionContactPreference", "hiringPositionVehicleRequired",
    "hiringPositionBackgroundCheckRequired", "hiringPositionSaveDraft", "hiringPositionPublish",
    "hiringPositionPause", "hiringPositionReopen", "hiringPositionClose",
    "hiringPositionViewApplicants", "hiringPositionNoApplicants", "hiringPositionNoPositions",
    "hiringPositionInvalidPayRange", "hiringPositionInterviewWarning",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of keys) assert.notEqual(t(key, language), key, `${language}:${key}`);
  }
});
