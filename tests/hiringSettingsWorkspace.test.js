import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { t } from "../src/utils/language.js";

const centerSource = readFileSync("src/pages/HiringCenter.jsx", "utf8");
const workspaceSource = readFileSync("src/components/HiringSettingsWorkspace.jsx", "utf8");
const positionEditorSource = readFileSync("src/components/HiringPositionEditor.jsx", "utf8");
const settingsSource = readFileSync("src/utils/hiringSettings.js", "utf8");
const cssSource = readFileSync("src/index.css", "utf8");

test("production Hiring Center does not present local settings as business truth", () => {
  assert.doesNotMatch(centerSource, /<HiringSettingsWorkspace|readHiringSettings|saveHiringSettings/);
  assert.doesNotMatch(centerSource, /localStorage|sessionStorage/);
  assert.match(centerSource, /HiringUnavailableState/);
});

test("Manage Hiring Settings renders safely for missing and malformed settings", async () => {
  const vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true, hmr: false },
  });

  try {
    const { default: HiringSettingsWorkspace } = await vite.ssrLoadModule(
      "/src/components/HiringSettingsWorkspace.jsx"
    );
    const renderWorkspace = (settings) => renderToStaticMarkup(React.createElement(
      HiringSettingsWorkspace,
      {
        settings,
        language: "en",
        onSave: () => ({ ok: false }),
        onClose: () => {},
      }
    ));

    for (const settings of [null, undefined, [], "stale", 7, {}, { applicationRequirements: null }]) {
      const markup = renderWorkspace(settings);
      assert.match(markup, /role="dialog"/);
      assert.match(markup, /Hiring Settings are unavailable/);
      assert.doesNotMatch(markup, /Save Changes/);
    }

    const validMarkup = renderWorkspace({ businessId: "business-1" });
    assert.match(validMarkup, /Application Requirements/);
    assert.match(validMarkup, /Save Changes/);
    assert.doesNotMatch(validMarkup, /Hiring Settings are unavailable/);
  } finally {
    await vite.close();
  }
});

test("legacy settings registry remains centralized but is disconnected from production Hiring", () => {
  assert.doesNotMatch(centerSource, /readHiringSettings|saveHiringSettings/);
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
  assert.doesNotMatch(centerSource, /isHiringNotificationEnabled|upsertNotification/);
});

test("position and application projections remain guidance-only", () => {
  assert.match(positionEditorSource, /hiringSettingsPositionDefaultsHelp/);
  assert.doesNotMatch(centerSource, /hiringSettingsReviewGuidance/);
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
    "hiringSettingsUnavailable",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    keys.forEach((key) => {
      assert.notEqual(t(key, language), key, `${key} missing for ${language}`);
      assert.ok(t(key, language).trim());
    });
  }
});
