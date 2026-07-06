import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const verificationPath = join(
  repoRoot,
  "docs",
  "KnowledgeBase",
  "BACKEND_STAGING_TRUST_VERIFICATION.md"
);

test("backend staging trust verification documents the final decision and sections", () => {
  const contents = readFileSync(verificationPath, "utf8");

  assert.match(contents, /# Backend Staging Trust Verification/);
  assert.match(contents, /✅ READY FOR FRIENDS & FAMILY TESTFLIGHT WITH MEDIA DEFERRED/);
  assert.match(contents, /## Executive Summary/);
  assert.match(contents, /## Verification Environment/);
  assert.match(contents, /## Accounts Used/);
  assert.match(contents, /## Deployment Parity Findings/);
  assert.match(contents, /## Database Findings/);
  assert.match(contents, /## Authentication Findings/);
  assert.match(contents, /## Identity Findings/);
  assert.match(contents, /## Ownership Findings/);
  assert.match(contents, /## Media Findings/);
  assert.match(contents, /## Persistence Findings/);
  assert.match(contents, /## Security Findings/);
  assert.match(contents, /## Operations Findings/);
  assert.match(contents, /## Founder\/Admin Verification Needed/);
});

test("backend staging trust verification records Phase 4I media deferral decision", () => {
  const contents = readFileSync(verificationPath, "utf8");

  assert.match(contents, /Phase 4I Update: Friends & Family Media Deferral Safety/);
  assert.match(contents, /Friends & Family real-user builds no longer start unsafe media persistence flows/);
  assert.match(contents, /Direct unsigned Cloudinary flows are guarded/);
  assert.match(contents, /Base64 and object URL flows are guarded/);
  assert.match(contents, /No real user media enters Meetro until the backend proves media trust/);
});

test("backend staging trust verification records Phase 4H media blockers", () => {
  const contents = readFileSync(verificationPath, "utf8");

  assert.match(contents, /Phase 4H Update: Media Storage Trust/);
  assert.match(contents, /Phase\s+4G ownership failures remain fixed/);
  assert.match(contents, /No server-side upload endpoint is implemented/);
  assert.match(contents, /No Railway filesystem media write path/);
  assert.match(contents, /direct unsigned Cloudinary uploads/);
  assert.match(contents, /base64 data URLs or local object URLs/);
  assert.match(contents, /Media matrix/);
  assert.match(contents, /delete behavior is not implemented/);
  assert.match(contents, /file size\/type limits are not enforced/);
  assert.match(contents, /Media verifier decision: DEFERRED_NOT_IMPLEMENTED/);
  assert.match(contents, /Release interpretation: FAIL/);
  assert.match(contents, /Phase 4I release interpretation/);
  assert.match(contents, /Friends & Family real-user upload controls are disabled/);
  assert.match(contents, /Backend can proceed to Friends & Family TestFlight with media deferred/);
});
