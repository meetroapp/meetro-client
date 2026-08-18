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

test("homeowner and professional primary navigation expose no standalone Alerts destination", () => {
  for (const block of navigationBlocks) {
    assert.equal((block.match(/page: "notifications"/g) || []).length, 0);
    assert.doesNotMatch(block, /aliases: \["notifications"\]/);
    assert.doesNotMatch(block, /label: t\("navigationAlerts", language\)/);
  }
});

test("Alerts uses the existing route and selected-state architecture without adding a competing route", () => {
  assert.equal((appSource.match(/page === "notifications"/g) || []).length, 1);
  assert.match(appSource, /page === "notifications"[\s\S]*<Notifications/);
  assert.match(bottomNavSource, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(bottomNavSource, /item\.aliases\?\.includes\(normalizedPage\)/);
  assert.match(notificationsSource, /currentPage="notifications"/);
});

test("badge presentation consumes canonical category counts and preserved section metrics", () => {
  assert.match(
    bottomNavSource,
    /alertCountSnapshot\.response\?\.counts\?\.byCategory/
  );
  assert.doesNotMatch(bottomNavSource, /alertCountSnapshot[\s\S]{0,160}\.alerts\.length/);
  assert.match(bottomNavSource, /communicationAlertCount/);
  assert.match(bottomNavSource, /workCenterAlertCount/);
  assert.match(bottomNavSource, /leadsAlertCount/);
  assert.match(bottomNavSource, /profileAlertCount/);
  assert.match(
    bottomNavSource,
    /canonicalCategoryUnreadCount\("business_verification"\)/
  );
  assert.doesNotMatch(
    bottomNavSource,
    /canonicalCategoryUnreadCount\("system"\)/
  );
});

test("zero hides the badge, 1-99 is exact, and 100+ is shortened only visually", () => {
  assert.match(bottomNavSource, /\{unread > 0 && (?:\(|<)/);
  assert.match(bottomNavSource, /unread > 99 \? "99\+" : String\(unread\)/);
  assert.doesNotMatch(bottomNavSource, /Math\.min\([^)]*unread/);
});

test("localized business desktop shortcuts remain available only in the business sidebar", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of [
      "desktopBusinessShortcuts",
      "desktopQuickQuote",
      "desktopQuickQuoteNote",
      "desktopQuickInvoice",
      "desktopQuickInvoiceNote",
      "desktopBusinessLeads",
      "desktopBusinessLeadsNote",
    ]) {
      assert.notEqual(t(key, language), key);
    }
  }
  assert.match(bottomNavSource, /activeMode === "business" && \([\s\S]*businessDesktopShortcutItems/);
  assert.match(bottomNavSource, /mobileNavItems\.map\(\(item\) => renderNavItem\(item, "bottom"\)\)/);
  assert.doesNotMatch(bottomNavSource.slice(
    bottomNavSource.indexOf("const personalDesktopNavItems = ["),
    bottomNavSource.indexOf("const businessDesktopShortcutItems = [")
  ), /quickQuote|quickInvoice|businessLeads/);
  assert.match(bottomNavSource, /aria-label=\{getItemAccessibleLabel\(item\)\}/);
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
