import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const readinessAuditPath = new URL(
  "../docs/KnowledgeBase/TESTFLIGHT_READINESS_AUDIT_PHASE_3.md",
  import.meta.url
);

const readinessAuditSource = fs.readFileSync(readinessAuditPath, "utf8");

test("Phase 3 TestFlight readiness audit document exists", () => {
  assert.ok(fs.existsSync(readinessAuditPath), "TestFlight readiness audit should exist");
  assert.match(readinessAuditSource, /# TestFlight Readiness Audit Phase 3/);
  assert.match(readinessAuditSource, /Status: Final release-gate validation/);
});

test("Phase 3 TestFlight readiness audit includes a readiness decision", () => {
  assert.match(readinessAuditSource, /## Readiness Decision/);
  assert.match(readinessAuditSource, /READY FOR FRIENDS & FAMILY TESTFLIGHT PREPARATION|NOT READY FOR TESTFLIGHT PREPARATION/);
  assert.match(readinessAuditSource, /Final Readiness Statement/);
});

test("Phase 3 TestFlight readiness audit preserves required release-gate sections", () => {
  [
    "Executive Summary",
    "Architecture Readiness",
    "Mobile Readiness",
    "Desktop Readiness",
    "Authentication Readiness",
    "Onboarding Readiness",
    "Legal Readiness",
    "Homeowner Workflow Readiness",
    "Professional Workflow Readiness",
    "Communication Readiness",
    "Business Readiness",
    "Companion Readiness",
    "Performance Readiness",
    "Accessibility Readiness",
    "Localization Readiness",
    "Error / Empty State Readiness",
    "Known Warnings",
    "Release Blockers",
    "Recommended Phase 4 Focus",
    "Founder Sign-Off Notes",
  ].forEach((section) => {
    assert.match(readinessAuditSource, new RegExp(`## .*${section}`));
  });
});

test("Phase 3 TestFlight readiness audit documents known warnings and blockers", () => {
  assert.match(readinessAuditSource, /Existing Vite large chunk warning/);
  assert.match(readinessAuditSource, /No release blocker is currently identified/);
  assert.match(readinessAuditSource, /Broken login/);
  assert.match(readinessAuditSource, /Critical crash/);
  assert.match(readinessAuditSource, /Data loss/);
});

test("Phase 3 TestFlight readiness audit protects Phase 4 recommendation", () => {
  assert.match(readinessAuditSource, /Phase 4 should become the Quality Manual System/);
  assert.match(readinessAuditSource, /Printable QA forms/);
  assert.match(readinessAuditSource, /iPhone QA checklist/);
  assert.match(readinessAuditSource, /Desktop QA checklist/);
  assert.match(readinessAuditSource, /Friends & Family tester guidance/);
});
