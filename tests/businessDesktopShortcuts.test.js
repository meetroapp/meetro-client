import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const bottomNav = read("src/components/BottomNav.jsx");
const quoteBuilder = read("src/pages/QuoteBuilder.jsx");
const invoiceBuilder = read("src/pages/InvoiceBuilder.jsx");

function block(start, end) {
  const startIndex = bottomNav.indexOf(start);
  const endIndex = bottomNav.indexOf(end, startIndex);

  return bottomNav.slice(startIndex, endIndex);
}

test("all four primary navigation modes remove standalone Alerts", () => {
  for (const navigationBlock of [
    block("const personalMobileNavItems = [", "const businessMobileNavItems = ["),
    block("const businessMobileNavItems = [", "const personalDesktopNavItems = ["),
    block("const personalDesktopNavItems = [", "const businessDesktopNavItems = ["),
    block("const businessDesktopNavItems = [", "const businessDesktopShortcutItems = ["),
  ]) {
    assert.doesNotMatch(navigationBlock, /page: "notifications"/);
  }
});

test("business desktop sidebar owns the three persistent shortcuts and personal/mobile navigation does not", () => {
  const shortcutBlock = block(
    "const businessDesktopShortcutItems = [",
    "useEffect(() => {"
  );
  assert.match(shortcutBlock, /page: "quoteBuilder"[\s\S]*shortcut: "quickQuote"/);
  assert.match(shortcutBlock, /page: "invoiceBuilder"[\s\S]*shortcut: "quickInvoice"/);
  assert.match(shortcutBlock, /page: "businessLeads"[\s\S]*shortcut: "businessLeads"/);
  assert.match(bottomNav, /activeMode === "business" && \([\s\S]*businessDesktopShortcutItems\.map/);
  assert.match(bottomNav, /prepareBusinessShortcut\(item\)/);
  assert.doesNotMatch(
    block("const personalMobileNavItems = [", "const businessDesktopShortcutItems = ["),
    /quickQuote|quickInvoice|businessLeads/
  );
  assert.match(bottomNav, /<div style=\{sidebarScrollArea\}>/);
  assert.match(bottomNav, /style=\{sidebarProfileGroup\}/);
});

test("shortcut destinations reuse standalone builders and route Leads directly", () => {
  assert.match(bottomNav, /setPage\(item\.page\)/);
  assert.match(bottomNav, /localStorage\.setItem\("quoteBuilderSource", "desktop_sidebar_quick_quote"\)/);
  assert.match(bottomNav, /localStorage\.setItem\("invoiceBuilderSource", "desktop_sidebar_quick_invoice"\)/);
  assert.match(quoteBuilder, /quoteBuilderSource === "desktop_sidebar_quick_quote"/);
  assert.match(invoiceBuilder, /invoiceBuilderSource === "desktop_sidebar_quick_invoice"/);
  assert.match(quoteBuilder, /isUniversalQuickQuote/);
  assert.match(bottomNav, /page: "businessLeads"/);
});

test("shortcut return context preserves communication, Work Center, and Business Tools origins", () => {
  assert.match(bottomNav, /shortcutReturnPage = \[/);
  assert.match(bottomNav, /\? "workCenter"/);
  assert.match(bottomNav, /quoteBuilderReturnPage", shortcutReturnPage/);
  assert.match(bottomNav, /invoiceBuilderReturnPage", shortcutReturnPage/);
  assert.match(quoteBuilder, /isDesktopSidebarQuickQuote && quoteBuilderReturnPage/);
  assert.match(quoteBuilder, /setPage\(quoteBuilderReturnPage\)/);
  assert.match(invoiceBuilder, /isDesktopSidebarInvoice && returnPage/);
  assert.match(
    invoiceBuilder,
    /isDesktopSidebarInvoice && returnPage[\s\S]*\? returnPage/
  );
  assert.match(quoteBuilder, /setPage\("businessCommandCenter"\)/);
  assert.match(
    invoiceBuilder,
    /isBusinessToolsInvoice[\s\S]*\? "businessCommandCenter"/
  );
});

test("canonical attention is projected to owning sections without browser unread authority", () => {
  assert.match(bottomNav, /canonicalCategoryUnreadCount\("communication"\)/);
  assert.match(bottomNav, /canonicalCategoryUnreadCount\("emergency"\)/);
  assert.match(bottomNav, /canonicalCategoryUnreadCount\("request"\)/);
  assert.match(bottomNav, /canonicalCategoryUnreadCount\("schedule"\)/);
  assert.match(
    bottomNav,
    /canonicalCategoryUnreadCount\("business_verification"\)/
  );
  assert.match(
    bottomNav,
    /activeMode === "business"[\s\S]*canonicalCategoryUnreadCount\("business_verification"\)/
  );
  assert.doesNotMatch(
    bottomNav,
    /canonicalCategoryUnreadCount\("system"\)/
  );
  assert.doesNotMatch(bottomNav, /getUnreadNotificationCount/);
});
