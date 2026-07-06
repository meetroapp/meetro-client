import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const verificationPath = join(
  repoRoot,
  "docs",
  "KnowledgeBase",
  "RAILWAY_STAGING_TRUST_VERIFICATION.md"
);

test("railway staging trust verification document exists with required sections", () => {
  const contents = readFileSync(verificationPath, "utf8");

  assert.match(contents, /# Railway Staging Trust Verification/);
  assert.match(contents, /## Executive Summary/);
  assert.match(contents, /## Staging Readiness Decision/);
  assert.match(contents, /## Staging Service Details/);
  assert.match(contents, /## Staging Database Details/);
  assert.match(contents, /## Health Check Result/);
  assert.match(contents, /## Authentication Verification/);
  assert.match(contents, /## Two-Account Ownership Verification/);
  assert.match(contents, /## Posts Verification/);
  assert.match(contents, /## CORS Verification/);
  assert.match(contents, /## Media Storage Verification/);
  assert.match(contents, /## Database Verification/);
  assert.match(contents, /## Phase 4E Governed Schema Baseline/);
  assert.match(contents, /## Error Safety Verification/);
  assert.match(contents, /## Basic Load Readiness/);
  assert.match(contents, /## Blockers/);
  assert.match(contents, /## Final Backend Decision/);
});

test("railway staging trust verification records the media-deferred Friends and Family decision", () => {
  const contents = readFileSync(verificationPath, "utf8");

  assert.match(contents, /✅ READY FOR FRIENDS & FAMILY TESTFLIGHT WITH MEDIA DEFERRED/);
  assert.match(contents, /https:\/\/athletic-rebirth-staging\.up\.railway\.app/);
  assert.match(contents, /Core backend trust is now materially improved/);
  assert.match(contents, /signup\/login, posts ownership isolation/);
  assert.match(contents, /media upload deferred/i);
  assert.match(contents, /Do not enable real-user media upload until governed storage exists/);
});

test("railway staging trust verification documents required evidence areas", () => {
  const contents = readFileSync(verificationPath, "utf8");

  assert.match(contents, /Staging Readiness Decision/);
  assert.match(contents, /two-account ownership/i);
  assert.match(contents, /CORS/i);
  assert.match(contents, /media storage/i);
  assert.match(contents, /scripts\/verify-staging-trust\.js/);
  assert.match(contents, /Access-Control-Allow-Origin: \*/);
  assert.match(contents, /Founder\/Admin Required Checks/);
  assert.match(contents, /Source-level fixes are not user trust/);
  assert.match(contents, /Staging proof is user trust/);
});

test("railway staging trust verification documents the governed migration baseline", () => {
  const contents = readFileSync(verificationPath, "utf8");

  assert.match(contents, /scripts\/run-migrations\.js/);
  assert.match(contents, /202607050001_initial_schema_baseline\.sql/);
  assert.match(contents, /schema_migrations/);
  assert.match(contents, /db:migrate:staging/);
  assert.match(contents, /CONFIRM_STAGING_DATABASE=staging/);
  assert.match(contents, /Do not run this command against production/);
  assert.match(contents, /railway run` runs a local command/);
  assert.match(contents, /6c918a4bfce0aa1b99a0dd80b0b8bb702c26d715/);
  assert.match(contents, /railway ssh --environment staging --service athletic-rebirth/);
  assert.match(contents, /CONFIRM_PUBLIC_STAGING_DATABASE_URL=true/);
  assert.match(contents, /temporary Railway staging public TCP Postgres URL/);
  assert.match(contents, /users/);
  assert.match(contents, /posts/);
  assert.match(contents, /contractor_profiles/);
  assert.match(contents, /quote_requests/);
  assert.match(contents, /messages/);
});

test("railway staging trust verification documents Phase 4H media trust evidence", () => {
  const contents = readFileSync(verificationPath, "utf8");

  assert.match(contents, /Phase 4H Media Storage Trust Verification/);
  assert.match(contents, /No Railway filesystem media persistence path was found/);
  assert.match(contents, /Staging `\/media` is not implemented/);
  assert.match(contents, /DEFERRED_NOT_IMPLEMENTED/);
  assert.match(contents, /Direct unsigned Cloudinary upload/);
  assert.match(contents, /URL\.createObjectURL\(file\)/);
  assert.match(contents, /FileReader\.readAsDataURL/);
  assert.match(contents, /Media matrix/);
  assert.match(contents, /Release blocker for real homeowner media/);
  assert.match(contents, /URL references persist/);
  assert.match(contents, /file type, and file size rules|File size\/type/);
  assert.match(contents, /Evaluation photo/);
  assert.match(contents, /Completion photo/);
  assert.match(contents, /Phase 4G ownership enforcement passed/);
  assert.match(contents, /Phase 4I Friends & Family Media Deferral Safety/);
  assert.match(contents, /Business logo/);
  assert.match(contents, /Message attachments/);
  assert.match(contents, /Backend can proceed to Friends & Family TestFlight with media deferred/);
});
