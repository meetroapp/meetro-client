import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { t, translations } from "../src/utils/language.js";

const homeSource = readFileSync(
  new URL("../src/pages/Home.jsx", import.meta.url),
  "utf8"
);
const assistantSource = readFileSync(
  new URL("../src/components/MeetroAssistant.jsx", import.meta.url),
  "utf8"
);

const languages = ["en", "es", "fr", "pt-BR"];
const renamedHomeKeys = [
  "aiHelp",
  "assistantCompanionAskMeetro",
  "manageEmergency",
  "activeEmergency",
  "homeEmergencyRequestActive",
  "homeEmergencyServiceActive",
  "viewEmergencyProgress",
  "continueConversation",
  "viewVisit",
  "reviewProposal",
  "continueWork",
  "reviewCompletion",
  "viewHistory",
];

test("Home uses Meetro-first assistant language instead of AI-first labels", () => {
  assert.doesNotMatch(homeSource, /t\("aiHelp"/);
  assert.match(homeSource, /t\("assistantCompanionAskMeetro", language\)/);
  assert.equal(t("aiHelp", "en"), "Ask Meetro");
  assert.notEqual(t("guideAiAssistantTitle", "en"), "AI Assistant");
  assert.doesNotMatch(t("guideAiAssistantDescription", "en"), /Meetro AI|AI answers|AI Recommendation/i);
});

test("Home project cards route truthfully to conversation labels", () => {
  assert.doesNotMatch(homeSource, /t\("openProject"/);
  assert.match(homeSource, /function getHomeProjectActionLabel/);
  assert.match(homeSource, /return t\("continueConversation", language\)/);
  assert.match(homeSource, /return t\("reviewProposal", language\)/);
  assert.match(homeSource, /return t\("continueWork", language\)/);
});

test("Home prioritizes active emergency state over duplicate emergency shortcut", () => {
  assert.match(homeSource, /const activeEmergencyInfo = getHomeActiveEmergencyInfo\(language\)/);
  assert.match(
    homeSource,
    /<TopBar \/>\s*\{activeEmergencyInfo && \(/
  );
  assert.doesNotMatch(homeSource, /toggleLanguage/);
  assert.match(homeSource, /activeEmergencyInfo[\s\S]*t\("manageEmergency", language\)[\s\S]*t\("emergencyHelp", language\)/);
});

test("Home homeowner emergency copy avoids the homeowner's own name", () => {
  assert.match(homeSource, /homeEmergencyRequestActive/);
  assert.match(homeSource, /homeEmergencyServiceActive/);
  assert.doesNotMatch(homeSource, /emergencyCustomerName/);
});

test("professional emergency orb copy can include customer name when role appropriate", () => {
  assert.match(assistantSource, /wakeEmergencySummary\.customer/);
  assert.match(assistantSource, /wakeObservationType === "emergency"/);
});

test("renamed Home labels exist in all supported languages", () => {
  for (const key of renamedHomeKeys) {
    for (const language of languages) {
      assert.equal(
        typeof translations[language][key],
        "string",
        `Missing ${language} translation for ${key}`
      );
      assert.ok(translations[language][key].trim(), `Empty ${language} translation for ${key}`);
      assert.notEqual(t(key, language), key, `${language} returned raw key ${key}`);
    }
  }
});

test("homeowner labels stay next-step oriented", () => {
  assert.equal(t("homeOpenRequest", "en"), "Review Request");
  assert.equal(t("viewVisit", "en"), "Review Visit");
  assert.equal(t("homeViewRecord", "en"), "Review Record");
  assert.equal(t("homeViewProfile", "en"), "Meet the Professional");
  assert.equal(t("viewEmergencyProgress", "en"), "View Progress");
  assert.equal(t("manageEmergency", "en"), "View Progress");
  assert.doesNotMatch(t("homeOpenRequest", "en"), /^(Open|Manage)\b/);
  assert.doesNotMatch(t("homeViewRecord", "en"), /^(Open|Manage)\b/);
  assert.doesNotMatch(t("manageEmergency", "en"), /^(Open|Manage)\b/);

  for (const language of languages) {
    assert.notEqual(t("homeOpenRequest", language), "homeOpenRequest");
    assert.notEqual(t("viewVisit", language), "viewVisit");
    assert.notEqual(t("homeViewRecord", language), "homeViewRecord");
    assert.notEqual(t("manageEmergency", language), "manageEmergency");
  }
});
