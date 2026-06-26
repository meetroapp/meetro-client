import assert from "node:assert/strict";
import test from "node:test";
import {
  getMeetroIcon,
  getMeetroIconKeys,
  MEETRO_ICONS,
} from "../src/utils/meetroIconRegistry.js";

const requiredKeys = [
  "home",
  "discover",
  "request",
  "messages",
  "profile",
  "businessDashboard",
  "businessLeads",
  "workCenter",
  "businessTools",
  "opportunities",
  "currentJobs",
  "schedule",
  "revenue",
  "jobHistory",
  "evaluationNotes",
  "requestDetails",
  "materials",
  "quote",
  "proposal",
  "payment",
  "activeWork",
  "completion",
  "closure",
  "history",
  "businessProfile",
  "availability",
  "customerRelationships",
  "portfolio",
  "hiringCenter",
  "jobsHiring",
  "serviceTypes",
  "findingsLibrary",
  "knowledgeBase",
  "materialsLibrary",
  "priceBook",
  "quickQuote",
  "quickInvoice",
  "contractTemplates",
  "reportsCenter",
  "permitCenter",
  "complianceCenter",
  "businessIntelligence",
  "reviews",
  "settings",
  "legal",
  "subscription",
  "featuredSpotlight",
  "beforeAfter",
  "emergency",
  "dispatch",
  "verified",
  "selected",
  "warning",
];

test("Meetro icon registry includes required semantic workflow keys", () => {
  for (const key of requiredKeys) {
    assert.ok(MEETRO_ICONS[key], `Missing icon key: ${key}`);
  }
});

test("every Meetro icon has an SF Symbol name, fallback, and description", () => {
  for (const [key, icon] of Object.entries(MEETRO_ICONS)) {
    assert.equal(typeof icon.sfSymbol, "string", `${key} missing sfSymbol`);
    assert.ok(icon.sfSymbol.length > 0, `${key} has empty sfSymbol`);
    assert.equal(typeof icon.fallback, "string", `${key} missing fallback`);
    assert.ok(icon.fallback.length > 0, `${key} has empty fallback`);
    assert.equal(typeof icon.description, "string", `${key} missing description`);
    assert.ok(icon.description.length > 0, `${key} has empty description`);
  }
});

test("unknown Meetro icons fall back safely", () => {
  const icon = getMeetroIcon("not_a_real_icon");

  assert.equal(icon.sfSymbol, "questionmark.circle");
  assert.equal(icon.fallback, "?");
});

test("icon keys helper returns registry keys", () => {
  assert.deepEqual(getMeetroIconKeys().sort(), Object.keys(MEETRO_ICONS).sort());
});

test("primary navigation icons use stronger filled SF Symbol targets", () => {
  assert.equal(MEETRO_ICONS.home.sfSymbol, "house.circle.fill");
  assert.equal(MEETRO_ICONS.discover.sfSymbol, "magnifyingglass.circle.fill");
  assert.equal(MEETRO_ICONS.request.sfSymbol, "plus.circle.fill");
  assert.equal(MEETRO_ICONS.messages.sfSymbol, "bubble.left.and.bubble.right.fill");
  assert.equal(MEETRO_ICONS.profile.sfSymbol, "person.crop.circle.fill");
  assert.equal(MEETRO_ICONS.businessDashboard.sfSymbol, "rectangle.grid.2x2.fill");
  assert.equal(MEETRO_ICONS.businessLeads.sfSymbol, "person.crop.circle.badge.plus");
  assert.equal(MEETRO_ICONS.workCenter.sfSymbol, "clipboard.fill");
  assert.equal(MEETRO_ICONS.requestDetails.sfSymbol, "doc.text.fill");
});
