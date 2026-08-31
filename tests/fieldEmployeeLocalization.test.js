import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { fieldEmployeeLanguage } from "../src/utils/fieldEmployeeLanguage.js";
import {
  LANGUAGE_STORAGE_KEY,
  resolveTranslation,
  SUPPORTED_LANGUAGES,
  t,
} from "../src/utils/language.js";

const shellSource = readFileSync("src/components/EmployeeShell.jsx", "utf8");
const portalSource = readFileSync("src/pages/EmployeePortal.jsx", "utf8");
const jobsSource = readFileSync("src/pages/EmployeeJobs.jsx", "utf8");
const appSource = readFileSync("src/App.jsx", "utf8");
const languageSource = readFileSync("src/utils/language.js", "utf8");
const modeSource = readFileSync("src/utils/teamExperienceMode.js", "utf8");

const navigation = [
  ["employeeHome", "fieldNavHome"],
  ["employeeJobs", "fieldNavMyJobs"],
  ["employeeSchedule", "fieldNavSchedule"],
  ["employeeTime", "fieldNavTime"],
  ["employeeMessages", "fieldNavMessages"],
  ["employeeAlerts", "fieldNavAlerts"],
  ["employeeProfile", "fieldNavProfile"],
];

test("EmployeeShell localizes the seven canonical Field routes and reacts to language changes", () => {
  for (const [route, labelKey] of navigation) {
    assert.match(shellSource, new RegExp(`route: "${route}", labelKey: "${labelKey}"`));
  }
  assert.match(shellSource, /useLanguage\(\)/);
  assert.match(shellSource, /t\(item\.labelKey, language\)/);
  assert.doesNotMatch(shellSource, /label: "(?:Home|My Jobs|Schedule|Time|Messages|Alerts|Profile)"/);
});

test("Field Profile exposes the shared Meetro language choices and setter", () => {
  assert.deepEqual(
    SUPPORTED_LANGUAGES.map(({ code, label }) => [code, label]),
    [
      ["en", "English"],
      ["es", "Español"],
      ["fr", "Français"],
      ["pt-BR", "Português"],
    ]
  );
  assert.match(portalSource, /SUPPORTED_LANGUAGES\.map/);
  assert.match(portalSource, /onClick=\{\(\) => setLanguage\(option\.code\)\}/);
  assert.match(portalSource, /option\.code === language/);
  assert.equal(LANGUAGE_STORAGE_KEY, "meetroLanguage");
});

test("Field pages consume the shared language hook and translation function", () => {
  for (const source of [shellSource, portalSource, jobsSource]) {
    assert.match(source, /useLanguage/);
    assert.match(source, /\bt\(/);
  }
  assert.match(languageSource, /import \{ fieldEmployeeLanguage \}/);
  assert.match(languageSource, /Object\.entries\(fieldEmployeeLanguage\)/);
});

test("Field presentation translation leaves canonical status and time-category payloads unchanged", () => {
  for (const status of ["ASSIGNED", "ON_MY_WAY", "ARRIVED", "WORKING", "FIELD_WORK_COMPLETED"]) {
    assert.match(jobsSource, new RegExp(`${status}: "fieldStatus`));
  }
  for (const category of ["JOB_WORK", "DRIVING", "OFFICE", "SUPPLIES", "BREAK", "GENERAL"]) {
    assert.match(jobsSource, new RegExp(`${category}: "fieldTime`));
  }
  assert.match(jobsSource, /toStatus: operations\.nextStatus/);
  assert.match(jobsSource, /category,/);
  assert.match(jobsSource, /jobId: category === "JOB_WORK"/);
  assert.match(jobsSource, /assignmentId: category === "JOB_WORK"/);
});

test("Personal and Work switching creates no second Field language authority", () => {
  assert.doesNotMatch(portalSource, /localStorage|sessionStorage/);
  assert.doesNotMatch(jobsSource, /localStorage|sessionStorage/);
  assert.doesNotMatch(shellSource, /localStorage|sessionStorage/);
  assert.doesNotMatch(modeSource, /meetroLanguage|LANGUAGE_STORAGE_KEY/);
  assert.match(modeSource, /meetroTeamExperienceMode:/);
  assert.match(portalSource, /requestTeamExperienceMode/);
  assert.match(portalSource, /setLanguage\(option\.code\)/);
});

test("every Field Employee translation key is populated in all four supported languages", () => {
  const languages = SUPPORTED_LANGUAGES.map(({ code }) => code);
  assert.deepEqual(Object.keys(fieldEmployeeLanguage), languages);
  const englishKeys = Object.keys(fieldEmployeeLanguage.en).sort();
  assert.ok(englishKeys.length >= 120);
  const identityVariables = {
    businessName: "{businessName}",
    category: "{category}",
    count: "{count}",
    language: "{language}",
    quantity: "{quantity}",
    seconds: "{seconds}",
    status: "{status}",
    time: "{time}",
    timeZone: "{timeZone}",
    version: "{version}",
  };

  for (const language of languages) {
    assert.deepEqual(Object.keys(fieldEmployeeLanguage[language]).sort(), englishKeys);
    for (const key of englishKeys) {
      const value = fieldEmployeeLanguage[language][key];
      assert.equal(typeof value, "string", `${language}:${key} must be a string`);
      assert.ok(value.trim(), `${language}:${key} must be populated`);
      assert.equal(t(key, language, identityVariables), value);
      assert.equal(resolveTranslation(key, language, identityVariables).source, "selected");
    }
  }
});

test("Field Alerts shell uses translation keys while canonical Notifications remain unchanged", () => {
  const alertBranch = appSource.slice(appSource.indexOf('if (page === "employeeAlerts")'));
  assert.match(alertBranch, /title=\{t\("fieldNavAlerts", language\)\}/);
  assert.match(alertBranch, /description=\{t\("fieldAlertsDescription", language\)\}/);
  assert.match(alertBranch, /<Notifications setPage=\{setPage\} employeeMode/);
  assert.doesNotMatch(alertBranch, /title="Alerts"|description="Alerts delivered/);
});
