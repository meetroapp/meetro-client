import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.jsx", "utf8");
const bottomNavSource = readFileSync(
  "src/components/BottomNav.jsx",
  "utf8"
);

function assistantPages() {
  const match = appSource.match(
    /const assistantEnabledPages = new Set\(\[([\s\S]*?)\]\);/
  );

  assert.ok(match, "assistantEnabledPages must exist");

  return new Set(
    [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1])
  );
}

function routeBlock(page) {
  const marker = `if (page === "${page}")`;
  const start = appSource.indexOf(marker);

  assert.notEqual(start, -1, `route ${page} must exist`);

  const next = appSource.indexOf("\nif (page === ", start + marker.length);

  return appSource.slice(
    start,
    next === -1 ? appSource.length : next
  );
}

test("Universal Ask inventory contains first-rollout authenticated surfaces", () => {
  const pages = assistantPages();

  for (const page of [
    "home",
    "myRequests",
    "homeownerRequestDetails",
    "discover",
    "profile",
    "projectDetails",
    "conversationThread",
    "messagesInbox",
    "businessDashboard",
    "businessLeads",
    "quoteBuilder",
    "depositRequestBuilder",
    "invoiceBuilder",
    "contractorDashboard",
    "workCenter",
    "customerRelationshipsCenter",
    "contractorProfile",
    "contractors",
    "contractorDetails",
    "businessAnalytics",
    "changeOrderRequest",
    "businessCommandCenter",
    "businessAvailability",
    "hiringCenter",
    "teamMembers",
    "assetCenter",
    "serviceTypesEvaluations",
    "materialsLibrary",
    "pricingLibrary",
    "contractTemplates",
    "reportsCenter",
    "permitCenter",
    "complianceCenter",
    "businessIntelligence",
    "jobUpdate",
    "favorites",
    "emergency",
    "emergencyRequest",
    "contractorJobAccepted",
  ]) {
    assert.equal(pages.has(page), true, page);
  }
});

test("first rollout excludes auth, onboarding, subscription, tutorial, and Field surfaces", () => {
  const pages = assistantPages();

  for (const page of [
    "login",
    "resetPassword",
    "welcome",
    "welcomeIntro",
    "meetroStory",
    "legal",
    "assistant",
    "meetroJourney",
    "tips",
    "learn-meetro",
    "professionalSubscription",
    "professionalOnboarding",
    "employeeJobs",
    "employeeHome",
    "employeeSchedule",
    "employeeTime",
    "employeeMessages",
    "employeeProfile",
    "employeeAlerts",
    "teamOperations",
    "bookkeeperProfile",
  ]) {
    assert.equal(pages.has(page), false, page);
  }
});

test("new access-only routes actually mount AskMeetroHost", () => {
  for (const page of [
    "contractorProfile",
    "contractors",
    "contractorDetails",
    "businessAnalytics",
    "changeOrderRequest",
    "businessAvailability",
    "customerRelationshipsCenter",
    "hiringCenter",
    "teamMembers",
    "assetCenter",
    "serviceTypesEvaluations",
    "materialsLibrary",
    "pricingLibrary",
    "contractTemplates",
    "reportsCenter",
    "permitCenter",
    "complianceCenter",
    "businessIntelligence",
    "jobUpdate",
    "favorites",
    "emergencyRequest",
    "contractorJobAccepted",
  ]) {
    assert.match(
      routeBlock(page),
      /withAssistantAccessOnly\(/,
      page
    );
  }
});

test("Business Command Center and Invoice preserve Guide and Insight through withAssistantLayer", () => {
  assert.match(
    routeBlock("businessCommandCenter"),
    /withAssistantLayer\(/
  );

  assert.doesNotMatch(
    routeBlock("businessCommandCenter"),
    /withGuideLayer\(/
  );

  assert.match(
    routeBlock("invoiceBuilder"),
    /withAssistantLayer\(/
  );

  assert.doesNotMatch(
    routeBlock("invoiceBuilder"),
    /withGuideLayer\(/
  );
});

test("mobile navigation gains no Ask Meetro sixth tab", () => {
  const personal = bottomNavSource.match(
    /const personalMobileNavItems = \[([\s\S]*?)\n\s*\];/
  );

  const business = bottomNavSource.match(
    /const businessMobileNavItems = \[([\s\S]*?)\n\s*\];/
  );

  assert.ok(personal);
  assert.ok(business);

  for (const source of [personal[1], business[1]]) {
    assert.doesNotMatch(source, /page:\s*"assistant"/);
    assert.doesNotMatch(source, /Ask Meetro/);
  }
});
