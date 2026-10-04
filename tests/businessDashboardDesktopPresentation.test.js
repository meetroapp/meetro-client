import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { t } from "../src/utils/language.js";

const source = fs.readFileSync("src/pages/BusinessDashboard.jsx", "utf8");
const presentation = fs.readFileSync("src/styles/homeDashboard.css", "utf8");

test("business dashboard desktop quick access uses explicit generic-new Quote intent", () => {
  const quickAccessStart = source.indexOf("const dashboardQuickAccessItems");
  const quickAccessEnd = source.indexOf("return (", quickAccessStart);
  const quickAccessBlock = source.slice(quickAccessStart, quickAccessEnd);

  assert.match(quickAccessBlock, /setPage\("hiringCenter"\)/);
  assert.doesNotMatch(quickAccessBlock, /setPage\("messagesInbox"\)/);
  assert.match(quickAccessBlock, /setPage\("quoteBuilder\?new=1"\)/);
  assert.match(quickAccessBlock, /setPage\("invoiceBuilder"\)/);
  assert.doesNotMatch(quickAccessBlock, /key: "schedule"/);
  assert.doesNotMatch(quickAccessBlock, /onClick: openBusinessProfile/);
  assert.match(source, /const openBusinessProfile = \(\) => \{[\s\S]*setPage\("contractorProfile"\);/);
  assert.doesNotMatch(quickAccessBlock, /businessCommandCenter/);
});

test("business dashboard tablet and desktop presentation reflows the shared iPhone sections", () => {
  assert.match(source, /\.business-dashboard-quick-access \{\s*display: grid;\s*\}/);
  assert.match(source, /\.business-dashboard-community-entry \{\s*display: block;\s*\}/);
  assert.doesNotMatch(source, /@media \(min-width: 1100px\)/);
  assert.match(presentation, /Tablet and desktop are a reflow of the approved Professional iPhone Home/);
  assert.match(presentation, /#root\[data-app-layout="tablet"\] \.business-dashboard/);
  assert.match(presentation, /#root\[data-app-layout="desktop"\] \.business-dashboard/);
  assert.match(presentation, /business-dashboard-content-lane[\s\S]*max-width: 1120px/);
  assert.match(presentation, /business-dashboard-glance-grid[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(presentation, /business-dashboard-quick-access-grid[\s\S]*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(source, /const dashboardContentLane = \{\s*display: "contents",\s*\}/);
  assert.match(source, /const dashboardDesktopFlow = \{\s*display: "contents",\s*\}/);
});

test("business dashboard iPad glance cards use a readable two-column layout without splitting value words", () => {
  assert.match(
    presentation,
    /#root\[data-app-layout="tablet"\] \.business-dashboard \.business-dashboard-glance-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\) !important;/
  );

  assert.match(
    presentation,
    /#root\[data-app-layout="desktop"\] \.business-dashboard \.business-dashboard-glance-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\) !important;/
  );

  assert.match(
    presentation,
    /business-dashboard-glance-grid button > strong,[\s\S]*?white-space:\s*normal;[\s\S]*?overflow-wrap:\s*normal;[\s\S]*?word-break:\s*normal;[\s\S]*?hyphens:\s*none;/
  );

  assert.match(
    source,
    /value=\{t\("wc52viewRevenue", language\)\}/
  );
});

test("business dashboard Quick Access uses the four approved tools at every size", () => {
  const block = source.slice(source.indexOf("const dashboardQuickAccessItems"), source.indexOf("  return (", source.indexOf("const dashboardQuickAccessItems")));
  for (const key of ["hiring", "quote-builder", "invoice-builder", "timesheet"]) assert.ok(block.includes(`key: "${key}"`));
  for (const key of ["schedule", "messages", "business-profile"]) assert.ok(!block.includes(`key: "${key}"`));
  assert.doesNotMatch(block, /desktopDuplicate: true/);
  assert.match(block, /teamOperations\?view=timesheets/);
});

test("business dashboard renders a professional mobile Community entry to the shared destination", () => {
  assert.match(source, /className="business-dashboard-community-entry"/);
  assert.match(source, /t\("communityEntryTitle", language\)/);
  assert.match(source, /t\("communityEntryBusinessCopy", language\)/);
  assert.match(source, /t\("communityOpenAction", language\)/);
  assert.equal(t("communityEntryTitle", "en"), "Explore Community");
  assert.equal(
    t("communityEntryBusinessCopy", "en"),
    "Discover businesses, opportunities, and local stories happening around you."
  );
  assert.equal(t("communityOpenAction", "en"), "Open Community");
  assert.match(source, /onClick=\{\(\) => setPage\("discover"\)\}/);
  assert.doesNotMatch(source, /setActiveAccountMode\("personal"\)/);
});

test("business dashboard hero reuses the approved greeting and action hierarchy across breakpoints", () => {
  assert.match(presentation, /business-dashboard-desktop-intro[\s\S]*display: none !important/);
  assert.match(presentation, /business-dashboard-mobile-intro[\s\S]*display: block/);
  assert.match(presentation, /business-dashboard-hero-actions[\s\S]*display: grid/);
  assert.match(source, /const heroDesktopContext = \{\s*display: "none"/);
  assert.match(source, /const primaryActionPanel = \{\s*display: "none"/);
  assert.match(source, /dashboardNextAction/);
  assert.match(source, /onClick=\{dashboardNextAction\.onClick\}/);
});

test("business dashboard quick access language preserves supported locales", () => {
  const textBlock = source.slice(
    source.indexOf("const dashboardText"),
    source.indexOf("const text =")
  );
  const keys = [
    "todayFocus",
    "workTheSchedule",
    "reviewOpportunities",
    "nextAction",
    "reviewPendingQuotes",
    "continueWork",
    "quickAccessTitle",
    "quickAccessHiring",
    "quickAccessQuoteBuilder",
    "quickAccessInvoiceBuilder",
    "quickAccessSchedule",
    "quickAccessMessages",
    "quickAccessBusinessProfileNote",
    "respondToMessages",
    "reviewTodayVisit",
    "reviewBusinessReadiness",
    "openNextAction",
  ];

  keys.forEach((key) => {
    const matches = textBlock.match(new RegExp(`${key}:`, "g")) || [];
    assert.equal(matches.length, 4, `${key} should exist for EN/ES/FR/PT-BR`);
  });
});

test("business dashboard refreshes canonical profile truth without HTTP cache reuse", () => {
  assert.match(
    source,
    /"\/my-contractor-profile",\s*\{ cache: "no-store" \}/
  );
});

test("business dashboard prefers canonical identity and fails truthfully", () => {
  assert.match(
    source,
    /profile\?\.business_name\s*\|\|\s*localStorage\.getItem\("businessName"\)/
  );
  assert.match(source, /const \[profileLoadFailed, setProfileLoadFailed\]/);
  assert.match(source, /setProfileLoadFailed\(true\)/);
  assert.match(source, /Business profile unavailable/);
  assert.match(source, /onClick=\{fetchProfile\}/);
  assert.doesNotMatch(source, /catch \([^)]*\) \{\s*console\.error/);
});
