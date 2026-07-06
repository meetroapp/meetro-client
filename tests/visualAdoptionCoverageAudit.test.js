import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const auditSource = readFileSync(
  new URL("../docs/KnowledgeBase/VISUAL_ADOPTION_COVERAGE_AUDIT.md", import.meta.url),
  "utf8"
);

test("visual adoption coverage audit document exists and records product-wide certification scope", () => {
  assert.match(auditSource, /# Visual Adoption Coverage Audit/);
  assert.match(auditSource, /Meetro Community Product-Wide Visual Certification/);
  assert.match(auditSource, /Overall Visual Adoption completion: `72%`/);
  assert.match(auditSource, /`ADOPTED: 18`/);
  assert.match(auditSource, /`PARTIAL: 10`/);
  assert.match(auditSource, /`NOT ADOPTED: 4`/);
  assert.match(auditSource, /`DEFERRED: 6`/);
});

test("coverage audit lists core places community ecosystem companion ecosystem and utility surfaces", () => {
  for (const section of [
    "## Core Places",
    "## Community Ecosystem",
    "## Work Ecosystem",
    "## Profile Ecosystem",
    "## Companion Ecosystem",
    "## Utility Surfaces",
  ]) {
    assert.match(auditSource, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const page of [
    "Home",
    "Community",
    "Communication Center Inbox",
    "Conversation Thread",
    "Work Center (Homeowner)",
    "Work Center (Professional)",
    "Meetro Moments",
    "Profile",
    "Ask Meetro Companion",
    "Businesses Destination",
    "Professional Profile",
    "Business Portfolio / Gallery",
    "Request Service",
    "Hiring Destination",
    "Spotlight",
    "Notifications",
    "Authentication",
    "Business Tools / Command Center",
  ]) {
    assert.match(auditSource, new RegExp(page.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("coverage audit documents remaining priorities and final decision", () => {
  assert.match(auditSource, /## Highest Priority Remaining Pages/);
  assert.match(auditSource, /Authentication \/ Login/);
  assert.match(auditSource, /Business Dashboard/);
  assert.match(auditSource, /Business Profile/);
  assert.match(auditSource, /Companion expanded\/floating surfaces/);
  assert.match(auditSource, /Decision: `PASS`/);
});
