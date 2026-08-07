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

const navigationExpressionPattern =
  '(t\\("[^"]+"(?:,\\s*language)?\\)|"[^"]+")';

function readNavigationItems(source, start, end) {
  const block = source.slice(source.indexOf(start), source.indexOf(end));
  const itemPattern = new RegExp(
    `^\\s+\\{\\n\\s+page: "([^"]+)",[\\s\\S]*?` +
      `\\n\\s+label: ${navigationExpressionPattern},` +
      `\\n\\s+sub: ${navigationExpressionPattern},`,
    "gm"
  );

  const items = Object.fromEntries(
    [...block.matchAll(itemPattern)].map((match) => [
      match[1],
      { label: match[2], sub: match[3] },
    ])
  );

  assert.equal(
    Object.keys(items).length,
    (block.match(/^\s+page: /gm) || []).length,
    `${start} contains an unsupported navigation label shape`
  );

  return items;
}

function translationKey(expression) {
  return /^t\("([^"]+)"(?:,\s*language)?\)$/.exec(expression)?.[1] || null;
}

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
  const navigationSets = {
    personalMobile: readNavigationItems(
      source,
      "const personalMobileNavItems = [",
      "const businessMobileNavItems = ["
    ),
    businessMobile: readNavigationItems(
      source,
      "const businessMobileNavItems = [",
      "const personalDesktopNavItems = ["
    ),
    personalDesktop: readNavigationItems(
      source,
      "const personalDesktopNavItems = [",
      "const businessDesktopNavItems = ["
    ),
    businessDesktop: readNavigationItems(
      source,
      "const businessDesktopNavItems = [",
      "useEffect(() => {\n    setKeyboardOpen"
    ),
  };
  const semanticPairs = [
    ["personalMobile", "personalDesktop", "home", "navigationHome", "navigationHome"],
    ["personalMobile", "personalDesktop", "myRequests", "navigationWorkCenter", "navigationWorkCenter"],
    ["personalMobile", "personalDesktop", "messagesInbox", "navigationChat", "navigationCommunication"],
    ["personalMobile", "personalDesktop", "notifications", "navigationAlerts", "navigationAlerts"],
    ["personalMobile", "personalDesktop", "profile", "navigationProfile", "navigationProfileAccount"],
    ["businessMobile", "businessDesktop", "businessDashboard", "navigationHome", "navigationHome"],
    ["businessMobile", "businessDesktop", "contractorDashboard", "navigationWorkCenter", "navigationWorkCenter"],
    ["businessMobile", "businessDesktop", "messagesInbox", "navigationChat", "navigationCommunication"],
    ["businessMobile", "businessDesktop", "notifications", "navigationAlerts", "navigationAlerts"],
    ["businessMobile", "businessDesktop", "profile", "navigationProfile", "navigationProfileAccount"],
  ];

  for (const [mobileSet, desktopSet, page, mobileKey, desktopKey] of semanticPairs) {
    assert.equal(translationKey(navigationSets[mobileSet][page]?.label), mobileKey);
    assert.equal(translationKey(navigationSets[desktopSet][page]?.label), desktopKey);
  }

  for (const items of Object.values(navigationSets)) {
    for (const item of Object.values(items)) {
      for (const expression of [item.label, item.sub]) {
        const key = translationKey(expression);
        if (!key) {
          assert.equal(expression, '"Meetro Moments"');
          continue;
        }

        for (const language of CANONICAL_LANGUAGE_CODES) {
          assert.ok(
            String(translations[language][key] || "").trim(),
            `${language}:${key}`
          );
        }
      }
    }
  }

  assert.match(source, /const getItemAccessibleLabel = \(item, unread\) =>/);
  assert.match(source, /return `\$\{item\.label\}\. \$\{item\.sub\}`/);
  assert.equal(
    (source.match(/aria-label=\{getItemAccessibleLabel\(item, unread\)\}/g) || [])
      .length,
    2
  );
  assert.match(source, /desktopNavItems\.map\(\(item\) => renderNavItem\(item, "sidebar"\)\)/);
  assert.match(source, /mobileNavItems\.map\(\(item\) => renderNavItem\(item, "bottom"\)\)/);
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
