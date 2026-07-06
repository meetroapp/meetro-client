import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const finalAuditPath = new URL(
  "../docs/KnowledgeBase/PHASE_3_FINAL_SURFACE_AUDIT.md",
  import.meta.url
);
const surfaceRegistryPath = new URL(
  "../docs/KnowledgeBase/MEETRO_SURFACE_REGISTRY.md",
  import.meta.url
);
const companionPresencePath = new URL(
  "../docs/KnowledgeBase/COMPANION_PRESENCE_SYSTEM.md",
  import.meta.url
);
const adaptiveLayoutPath = new URL(
  "../docs/KnowledgeBase/ADAPTIVE_LAYOUT_STANDARD.md",
  import.meta.url
);
const desktopConsistencyPath = new URL(
  "../docs/KnowledgeBase/DESKTOP_CONSISTENCY_AUDIT_PHASE_3.md",
  import.meta.url
);
const communicationCenterPath = new URL(
  "../docs/KnowledgeBase/COMMUNICATION_CENTER_ARCHITECTURE_AUDIT_PHASE_1.md",
  import.meta.url
);

test("Phase 3 final surface audit document exists and reaches an architecture decision", () => {
  assert.ok(fs.existsSync(finalAuditPath), "final surface audit should exist");
  const audit = fs.readFileSync(finalAuditPath, "utf8");

  assert.match(audit, /# Phase 3 Final Surface Audit/);
  assert.match(audit, /Executive Summary/);
  assert.match(audit, /Surfaces Audited/);
  assert.match(audit, /Constitution Validation/);
  assert.match(audit, /Home Base Validation/);
  assert.match(audit, /Ownership Validation/);
  assert.match(audit, /Desktop Validation/);
  assert.match(audit, /Mobile Validation/);
  assert.match(audit, /Companion Validation/);
  assert.match(audit, /Architecture Readiness Decision/);
  assert.match(audit, /Architecture Complete/);
});

test("Phase 3 final audit protects core architecture documents", () => {
  [
    surfaceRegistryPath,
    companionPresencePath,
    adaptiveLayoutPath,
    desktopConsistencyPath,
    communicationCenterPath,
  ].forEach((docPath) => {
    assert.ok(fs.existsSync(docPath), `${docPath.pathname} should exist`);
  });

  const audit = fs.readFileSync(finalAuditPath, "utf8");
  assert.match(audit, /Meetro Surface Registry/);
  assert.match(audit, /Companion Presence System/);
  assert.match(audit, /Communication Center Architecture/);
  assert.match(audit, /Adaptive Layout Standard/);
  assert.match(audit, /Desktop Consistency Audit/);
});

test("Surface Registry covers final audited access and legal support surfaces", () => {
  const registry = fs.readFileSync(surfaceRegistryPath, "utf8");

  assert.match(registry, /### Authentication/);
  assert.match(registry, /Official Page \/ Surface Name: Authentication/);
  assert.match(registry, /src\/pages\/Login\.jsx/);
  assert.match(registry, /2FA verification handoff/);
  assert.match(registry, /### Legal \/ Public Policies/);
  assert.match(registry, /Official Page \/ Surface Name: Legal \/ Public Policies/);
  assert.match(registry, /src\/public\/PublicSite\.jsx/);
  assert.match(registry, /Public routes stay public/);
});

test("Final surface audit preserves Companion and adaptive ownership boundaries", () => {
  const audit = fs.readFileSync(finalAuditPath, "utf8");

  assert.match(audit, /Presence -> Workspace Guidance -> Conversation/);
  assert.match(audit, /Context model is read-only/);
  assert.match(audit, /Companion complements every workspace but never replaces it/);
  assert.match(audit, /Desktop reveals context/);
  assert.match(audit, /Mobile remains the canonical experience/);
  assert.match(audit, /No runtime code, UI behavior, routing, storage, backend API, projection, or workflow logic was changed/);
});
