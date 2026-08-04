import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { t } from "../src/utils/language.js";

const bottomNavSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8"
);
const notificationsSource = readFileSync(
  new URL("../src/pages/Notifications.jsx", import.meta.url),
  "utf8"
);

function sourceBlock(start, end) {
  return bottomNavSource.slice(
    bottomNavSource.indexOf(start),
    bottomNavSource.indexOf(end)
  );
}

const navigationBlocks = [
  sourceBlock("const personalMobileNavItems = [", "const businessMobileNavItems = ["),
  sourceBlock("const businessMobileNavItems = [", "const personalDesktopNavItems = ["),
  sourceBlock("const personalDesktopNavItems = [", "const businessDesktopNavItems = ["),
  sourceBlock("const businessDesktopNavItems = [", "useEffect(() => {\n    setKeyboardOpen"),
];

test("homeowner and professional mobile and desktop navigation expose one localized Alerts destination", () => {
  for (const block of navigationBlocks) {
    assert.equal((block.match(/page: "notifications"/g) || []).length, 1);
    assert.match(block, /aliases: \["notifications"\]/);
    assert.match(block, /icon: "notifications"/);
    assert.match(block, /label: t\("navigationAlerts", language\)/);
  }
});

test("Alerts uses the existing route and selected-state architecture without adding a competing route", () => {
  assert.equal((appSource.match(/page === "notifications"/g) || []).length, 1);
  assert.match(appSource, /page === "notifications"[\s\S]*<Notifications/);
  assert.match(bottomNavSource, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(bottomNavSource, /item\.aliases\?\.includes\(normalizedPage\)/);
  assert.match(notificationsSource, /currentPage="notifications"/);
});

test("badge presentation consumes only the canonical global unread field", () => {
  assert.match(
    bottomNavSource,
    /alertCountSnapshot\.response\.counts\.unread >= 0[\s\S]*alertCountSnapshot\.response\.counts\.unread/
  );
  assert.doesNotMatch(bottomNavSource, /alertCountSnapshot[\s\S]{0,160}byCategory/);
  assert.doesNotMatch(bottomNavSource, /alertCountSnapshot[\s\S]{0,160}\.alerts\.length/);
  assert.match(bottomNavSource, /canonicalAlertUnreadCount[\s\S]*item\.page === "notifications"/);
});

test("zero hides the badge, 1-99 is exact, and 100+ is shortened only visually", () => {
  assert.match(bottomNavSource, /\{unread > 0 && \(/);
  assert.match(bottomNavSource, /item\.page === "notifications" && unread > 99 \? "99\+" : String\(unread\)/);
  assert.doesNotMatch(bottomNavSource, /Math\.min\([^)]*unread/);
});

test("localized accessible names preserve singular, plural, and overflow meaning", () => {
  const expected = {
    en: ["Alerts, 1 unread", "Alerts, 12 unread", "Alerts, more than 99 unread"],
    es: ["Alertas, 1 sin leer", "Alertas, 12 sin leer", "Alertas, más de 99 sin leer"],
    fr: ["Alertes, 1 non lue", "Alertes, 12 non lues", "Alertes, plus de 99 non lues"],
    "pt-BR": ["Alertas, 1 não lido", "Alertas, 12 não lidos", "Alertas, mais de 99 não lidos"],
  };

  for (const [language, labels] of Object.entries(expected)) {
    assert.equal(t("navigationAlertsUnreadSingular", language, { count: 1 }), labels[0]);
    assert.equal(t("navigationAlertsUnreadPlural", language, { count: 12 }), labels[1]);
    assert.equal(t("navigationAlertsUnreadOverflow", language), labels[2]);
    assert.notEqual(t("navigationAlerts", language), "navigationAlerts");
  }

  assert.match(bottomNavSource, /aria-label=\{getItemAccessibleLabel\(item, unread\)\}/);
  assert.match(bottomNavSource, /aria-hidden="true"/);
});

test("the shared shell owns one subscription for both render branches", () => {
  assert.equal((bottomNavSource.match(/subscribeAlertCounts\(/g) || []).length, 1);
  assert.equal((bottomNavSource.match(/setAlertCountIdentity\(/g) || []).length, 1);
  assert.match(bottomNavSource, /renderNavItem\(item, "sidebar"\)/);
  assert.match(bottomNavSource, /renderNavItem\(item, "bottom"\)/);
});

test("successful Alert mutations invalidate canonical counts without local count edits", () => {
  assert.equal((notificationsSource.match(/refreshAlertCounts\(\)/g) || []).length, 2);
  assert.match(
    notificationsSource,
    /await markAlertRead\(alert\.id, \{ setPage \}\)[\s\S]*await dismissAlert\(alert\.id, \{ setPage \}\)[\s\S]*void refreshAlertCounts\(\)/
  );
  assert.match(
    notificationsSource,
    /await markAllAlertsRead\(\{ setPage \}\);[\s\S]*void refreshAlertCounts\(\)/
  );
  assert.doesNotMatch(notificationsSource, /unread\s*[-+]=|unread\s*=\s*0/);
  assert.doesNotMatch(notificationsSource, /setAlertCount|setUnreadCount/);

  const individualCatch = notificationsSource.slice(
    notificationsSource.indexOf("} catch (error) {", notificationsSource.indexOf("const runAlertMutation")),
    notificationsSource.indexOf("} finally {", notificationsSource.indexOf("const runAlertMutation"))
  );
  const readAllCatch = notificationsSource.slice(
    notificationsSource.indexOf("} catch (error) {", notificationsSource.indexOf("const handleReadAll")),
    notificationsSource.indexOf("} finally {", notificationsSource.indexOf("const handleReadAll"))
  );
  assert.doesNotMatch(individualCatch, /refreshAlertCounts/);
  assert.doesNotMatch(readAllCatch, /refreshAlertCounts/);
});
