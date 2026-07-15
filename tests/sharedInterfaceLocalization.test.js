import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { translations } from "../src/utils/language.js";
import {
  CANONICAL_LANGUAGE_CODES,
  SHARED_INTERFACE_KEYS,
  getDeferredTranslationKeys,
} from "../src/utils/localizationContract.js";
import { getFormattingLocale } from "../src/utils/localeFormat.js";

const read = (path) => fs.readFileSync(path, "utf8");

test("shared navigation and interface dictionaries are complete in EN ES FR PT", () => {
  for (const language of CANONICAL_LANGUAGE_CODES) {
    const dictionary = translations[language];
    const deferred = new Set(getDeferredTranslationKeys(language));
    for (const key of SHARED_INTERFACE_KEYS) {
      assert.ok(String(dictionary[key] || "").trim(), `${language}:${key}`);
      assert.equal(deferred.has(key), false, `${language}:${key} must not be deferred`);
    }
  }
});

test("bottom and desktop navigation use one localized semantic key set", () => {
  const source = read("src/components/BottomNav.jsx");
  for (const key of [
    "navigationHome",
    "navigationWorkCenter",
    "navigationChat",
    "navigationMoments",
    "navigationProfile",
    "navigationCommunity",
    "navigationPrimaryDesktop",
    "navigationPrimaryMobile",
    "navigationCloseProfileMenu",
  ]) {
    assert.match(source, new RegExp(`t\\(\\"${key}\\", language\\)`));
  }
  assert.match(source, /aria-label=\{`\$\{item\.label\}\. \$\{item\.sub\}`\}/);
  assert.match(source, /title=\{`\$\{item\.label\} — \$\{item\.sub\}`\}/);
  assert.doesNotMatch(source, /aria-label="Primary (desktop|mobile) navigation"/);
});

test("shared shell components subscribe to mounted language changes", () => {
  for (const path of [
    "src/components/BottomNav.jsx",
    "src/components/LoadingScreen.jsx",
    "src/components/SafeBackBar.jsx",
    "src/components/FloatingBackButton.jsx",
    "src/components/BusinessToolsPageHeader.jsx",
    "src/components/RouteErrorBoundary.jsx",
    "src/components/MeetroAssistant.jsx",
    "src/App.jsx",
  ]) {
    assert.match(read(path), /useLanguage/);
  }
  assert.match(read("src/components/MeetroAssistant.jsx"), /const language = useLanguage\(\)/);
  assert.doesNotMatch(
    read("src/components/BusinessToolsPageHeader.jsx"),
    /const language = getLanguage\(\)/
  );
});

test("global error and startup recovery chrome use semantic translation keys", () => {
  const boundary = read("src/components/RouteErrorBoundary.jsx");
  const app = read("src/App.jsx");
  for (const key of [
    "errorBoundaryTitle",
    "errorBoundaryBody",
    "errorBoundaryReturnHome",
    "actionTryAgain",
  ]) assert.match(boundary, new RegExp(key));
  assert.doesNotMatch(boundary, />Something went wrong\.</);

  for (const key of [
    "appLoadingMeetro",
    "appRestoringSession",
    "appUpdateAvailable",
    "appUpdateAvailableBody",
    "appUpdateNow",
    "appUpdateLater",
  ]) assert.match(app, new RegExp(key));
});

test("shared state translations preserve distinct production-truth meanings", () => {
  for (const language of CANONICAL_LANGUAGE_CODES) {
    const copy = translations[language];
    assert.notEqual(copy.stateEmpty, copy.stateUnavailable);
    assert.notEqual(copy.stateFailed, copy.stateEmpty);
    assert.notEqual(copy.stateUnauthorized, copy.stateEmpty);
    assert.notEqual(copy.stateSaved, copy.stateSaving);
    assert.notEqual(copy.stateSent, copy.stateSending);
  }
});

test("Companion shell localizes controls and uses shared locale mapping", () => {
  const source = read("src/components/MeetroAssistant.jsx");
  for (const key of [
    "companionLauncherLabel",
    "actionClose",
    "companionAskByVoice",
    "companionMicrophone",
  ]) assert.match(source, new RegExp(key));
  assert.match(source, /getFormattingLocale\(language\)/);
  assert.doesNotMatch(source, /recognition\.lang = language === "es"/);
  assert.deepEqual(
    CANONICAL_LANGUAGE_CODES.map((language) => getFormattingLocale(language)),
    ["en-US", "es-ES", "fr-FR", "pt-BR"]
  );
});

test("proper names and user content are not passed through translation lookup", () => {
  const nav = read("src/components/BottomNav.jsx");
  assert.match(nav, />Meetro</);
  assert.match(nav, /label: "Meetro Moments"/);
  assert.doesNotMatch(nav, /t\(item\.label/);
});

test("shared account-mode controls do not depend on deferred route keys", () => {
  const profile = read("src/pages/Profile.jsx");
  const home = read("src/pages/Home.jsx");
  assert.match(profile, /t\("accountModeBusiness", language\)/);
  assert.match(profile, /t\("accountModePersonal", language\)/);
  assert.match(home, /t\("accountModePersonal", language\)/);
  assert.doesNotMatch(profile, /t\("businessMode"\)/);
  assert.doesNotMatch(profile, /t\("personalMode"\)/);
  assert.doesNotMatch(home, /t\("personalMode"\)/);
});
