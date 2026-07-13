import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { t } from "../src/utils/language.js";

const centerSource = readFileSync("src/pages/HiringCenter.jsx", "utf8");
const workspaceSource = readFileSync("src/components/HiringSettingsWorkspace.jsx", "utf8");
const positionEditorSource = readFileSync("src/components/HiringPositionEditor.jsx", "utf8");
const settingsSource = readFileSync("src/utils/hiringSettings.js", "utf8");
const cssSource = readFileSync("src/index.css", "utf8");

test("four dead settings actions are replaced by one functional workspace", () => {
  assert.match(centerSource, /<HiringSettingsWorkspace/);
  assert.match(centerSource, /setIsHiringSettingsOpen\(true\)/);
  assert.match(centerSource, /persistHiringSettings/);
  assert.match(centerSource, /hiringSettingsApplicationRequirements/);
  assert.match(centerSource, /hiringSettingsNotifications/);
  assert.match(centerSource, /hiringSettingsBackgroundChecks/);
  assert.match(centerSource, /hiringSettingsWorkEligibility/);
  assert.doesNotMatch(centerSource, /Hiring Settings are coming soon/);
  assert.doesNotMatch(centerSource, /will be configurable in a future hiring release/);
});

test("Hiring Center delegates settings persistence and policy to the central registry", () => {
  assert.match(centerSource, /readHiringSettings/);
  assert.match(centerSource, /saveHiringSettings/);
  assert.match(centerSource, /applyHiringSettingsToPositionDraft/);
  assert.match(centerSource, /projectSettingsIntoApplicationReview/);
  assert.doesNotMatch(centerSource, /meetroHiringSettings/);
  assert.match(settingsSource, /const STORE_PREFIX = "meetroHiringSettings"/);
});

test("workspace saves explicitly while Cancel and Close never submit", () => {
  assert.match(workspaceSource, /onSubmit=\{submit\}/);
  assert.match(workspaceSource, /const result = onSave\(draft\)/);
  assert.match(workspaceSource, /type="button" onClick=\{onClose\}/);
  assert.match(workspaceSource, /type="submit" className="meetro-visual-primary-button"/);
  assert.match(workspaceSource, /aria-live="polite"/);
  assert.match(workspaceSource, /titleRef\.current\?\.focus\(\)/);
});

test("custom questions use stable IDs and accessible editable controls", () => {
  assert.match(workspaceSource, /key=\{question\.id\}/);
  assert.match(workspaceSource, /hiring-question-\$\{question\.id\}/);
  assert.match(workspaceSource, /aria-label=\{`\$\{t\("hiringSettingsRemoveQuestion"/);
  assert.match(workspaceSource, /aria-invalid=\{!question\.prompt\.trim\(\)\}/);
  assert.doesNotMatch(settingsSource, /customQuestions\.map\(\([^)]*index/);
});

test("background and eligibility settings remain preferences without sensitive result fields", () => {
  assert.match(workspaceSource, /hiringSettingsBackgroundDisclaimer/);
  assert.match(workspaceSource, /hiringSettingsEligibilityDisclaimer/);
  assert.doesNotMatch(workspaceSource, /type="file"/);
  for (const prohibited of [
    /social security/i,
    /passport number/i,
    /work-permit number/i,
    /background check result/i,
    /pass\/fail/i,
    /applicant score/i,
    /verification badge/i,
  ]) {
    assert.doesNotMatch(`${workspaceSource}\n${settingsSource}`, prohibited);
  }
});

test("only grounded hiring notification events are configurable", () => {
  for (const event of [
    "newApplication",
    "applicantMessage",
    "interviewScheduled",
    "interviewRescheduled",
    "interviewCancelled",
    "interviewCompleted",
    "teamMemberCreated",
  ]) {
    assert.match(settingsSource, new RegExp(`"${event}"`));
  }
  assert.doesNotMatch(settingsSource, /"offerAccepted",/);
  assert.doesNotMatch(settingsSource, /"positionClosingSoon",/);
  assert.match(centerSource, /isHiringNotificationEnabled/);
});

test("position and application projections remain guidance-only", () => {
  assert.match(positionEditorSource, /hiringSettingsPositionDefaultsHelp/);
  assert.match(centerSource, /hiringSettingsReviewGuidance/);
  assert.match(settingsSource, /historicalApplicationUnaffected: true/);
  assert.match(settingsSource, /automaticDecision: null/);
  assert.doesNotMatch(settingsSource, /autoReject|autoHire|rankApplicant/);
});

test("workspace is safe-area contained on phones, iPad, and desktop", () => {
  assert.match(cssSource, /\.hiring-settings-overlay[\s\S]*safe-area-inset-top/);
  assert.match(cssSource, /\.hiring-settings-workspace[\s\S]*width: min\(100%, 780px\)/);
  assert.match(cssSource, /\.hiring-settings-content[\s\S]*overflow-y: auto/);
  assert.match(cssSource, /\.hiring-settings-toggle[\s\S]*min-height: 44px/);
  assert.match(cssSource, /@media \(max-width: 820px\)[\s\S]*\.hiring-settings-question[\s\S]*grid-template-columns: 1fr/);
  assert.match(cssSource, /@media \(max-width: 600px\)[\s\S]*\.hiring-settings-overlay/);
  assert.match(cssSource, /overflow-wrap: anywhere/);
});

test("required Hiring Settings labels exist in all supported languages", () => {
  const keys = [
    "hiringSettings",
    "hiringSettingsApplicationRequirements",
    "hiringSettingsNotifications",
    "hiringSettingsBackgroundChecks",
    "hiringSettingsWorkEligibility",
    "hiringSettingsResumeRequired",
    "hiringSettingsPhoneRequired",
    "hiringSettingsEmailRequired",
    "hiringSettingsAddressRequired",
    "hiringSettingsWorkHistoryRequired",
    "hiringSettingsReferencesRequired",
    "hiringSettingsAvailabilityRequired",
    "hiringSettingsLicenseRequired",
    "hiringSettingsPortfolioRequired",
    "hiringSettingsCoverNoteRequired",
    "hiringSettingsCustomQuestions",
    "hiringSettingsAddQuestion",
    "hiringSettingsEditQuestion",
    "hiringSettingsRemoveQuestion",
    "hiringSettingsNewApplication",
    "hiringSettingsApplicantMessage",
    "hiringSettingsInterviewScheduled",
    "hiringSettingsInterviewRescheduled",
    "hiringSettingsInterviewCancelled",
    "hiringSettingsInterviewCompleted",
    "hiringSettingsOfferAccepted",
    "hiringSettingsTeamMemberCreated",
    "hiringSettingsPositionClosingSoon",
    "hiringSettingsBackgroundCheckRequested",
    "hiringSettingsCriminalHistoryPreferred",
    "hiringSettingsDrivingRecordPreferred",
    "hiringSettingsIdentityVerificationPreferred",
    "hiringSettingsProfessionalLicensePreferred",
    "hiringSettingsConsentRequired",
    "hiringSettingsMinimumAge",
    "hiringSettingsAuthorizedToWorkRequired",
    "hiringSettingsValidDriverLicenseRequired",
    "hiringSettingsReliableTransportationRequired",
    "hiringSettingsPhysicalRequirementsAcknowledgement",
    "hiringSettingsScheduleAvailabilityRequired",
    "hiringSettingsLocationRequirement",
    "hiringSettingsCustomEligibilityNotes",
    "hiringSettingsSaving",
    "hiringSettingsUpdated",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    keys.forEach((key) => {
      assert.notEqual(t(key, language), key, `${key} missing for ${language}`);
      assert.ok(t(key, language).trim());
    });
  }
});
