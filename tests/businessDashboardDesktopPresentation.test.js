import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { t } from "../src/utils/language.js";

const source = fs.readFileSync("src/pages/BusinessDashboard.jsx", "utf8");

test("business dashboard desktop quick access routes to existing destinations only", () => {
  const quickAccessStart = source.indexOf("const dashboardQuickAccessItems");
  const quickAccessEnd = source.indexOf("return (", quickAccessStart);
  const quickAccessBlock = source.slice(quickAccessStart, quickAccessEnd);

  assert.match(quickAccessBlock, /setPage\("hiringCenter"\)/);
  assert.match(quickAccessBlock, /setPage\("messagesInbox"\)/);
  assert.match(quickAccessBlock, /setPage\("quoteBuilder"\)/);
  assert.match(quickAccessBlock, /setPage\("invoiceBuilder"\)/);
  assert.match(quickAccessBlock, /openWorkCenterSection\("schedule", \{ filter: "today" \}\)/);
  assert.match(quickAccessBlock, /onClick: openBusinessProfile/);
  assert.match(source, /const openBusinessProfile = \(\) => \{[\s\S]*setPage\("contractorProfile"\);/);
  assert.doesNotMatch(quickAccessBlock, /businessCommandCenter/);
});

test("business dashboard desktop presentation begins at the stable tablet breakpoint", () => {
  assert.match(source, /\.business-dashboard-quick-access \{\s*display: none;\s*\}/);
  assert.match(source, /\.business-dashboard-community-entry \{\s*display: block;\s*\}/);
  assert.match(source, /@media \(min-width: 1100px\)/);
  assert.match(source, /#root\[data-app-layout="desktop"\]/);
  assert.match(
    source,
    /\.app-page\.business-dashboard\.meetro-wide-page[\s\S]*--meetro-dashboard-workspace-max: min\(var\(--meetro-layout-wide-mid-max\), var\(--meetro-workspace-max-width\)\);/
  );
  assert.match(
    source,
    /\.app-page\.business-dashboard\.meetro-wide-page[\s\S]*width: min\(calc\(100vw - var\(--meetro-sidebar-width\)\), var\(--meetro-dashboard-workspace-max\)\) !important;/
  );
  assert.match(
    source,
    /\.app-page\.business-dashboard\.meetro-wide-page[\s\S]*margin-left: calc\(var\(--meetro-sidebar-width\) \+ var\(--meetro-dashboard-workspace-extra\)\) !important;/
  );
  assert.match(source, /\.business-dashboard-community-entry \{\s*display: none !important;/);
  assert.match(source, /\.business-dashboard-content-lane[\s\S]*max-width: 1180px;/);
  assert.match(source, /\.business-dashboard-content-lane[\s\S]*margin: 0;/);
  assert.match(source, /const dashboardContentLane = \{\s*display: "contents",\s*\}/);
  assert.match(source, /const dashboardDesktopFlow = \{\s*display: "contents",\s*\}/);
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

test("business dashboard hero keeps desktop orientation context separate from mobile", () => {
  assert.match(source, /\.business-dashboard-hero-context,[\s\S]*\.business-dashboard-primary-action \{\s*display: flex !important;/);
  assert.match(source, /const heroDesktopContext = \{\s*display: "none"/);
  assert.match(source, /const primaryActionPanel = \{\s*display: "none"/);
  assert.match(source, /dashboardNextAction/);
  assert.match(source, /text\.openNextAction/);
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
