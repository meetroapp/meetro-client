import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const auditPath = join(
  repoRoot,
  "docs",
  "KnowledgeBase",
  "BACKEND_USER_READINESS_AUDIT.md"
);

test("backend user readiness audit exists with release decision and required sections", () => {
  const contents = readFileSync(auditPath, "utf8");

  assert.match(contents, /# Backend User Readiness Audit/);
  assert.match(contents, /BACKEND NOT READY FOR REAL USERS/);
  assert.match(contents, /## Executive Summary/);
  assert.match(contents, /## Backend Readiness Decision/);
  assert.match(contents, /## Authentication Findings/);
  assert.match(contents, /## Role \/ Account Findings/);
  assert.match(contents, /## Database Findings/);
  assert.match(contents, /## Data Separation Findings/);
  assert.match(contents, /## Demo \/ QA Safety Findings/);
  assert.match(contents, /## Core Persistence Findings/);
  assert.match(contents, /## Media \/ File Storage Findings/);
  assert.match(contents, /## Security Findings/);
  assert.match(contents, /## Production Readiness Findings/);
  assert.match(contents, /## Blockers/);
  assert.match(contents, /## Required Fixes Before Real Users/);
  assert.match(contents, /## Recommended Verification Checklist/);
});

test("backend user readiness audit records concrete release blockers", () => {
  const contents = readFileSync(auditPath, "utf8");

  assert.match(contents, /deployed Railway backend commit/i);
  assert.match(contents, /migration framework/i);
  assert.match(contents, /authorization/i);
  assert.match(contents, /Data Separation Findings/);
  assert.match(contents, /Media storage readiness is not approved/);
  assert.match(contents, /Railway ephemeral disk/);
  assert.match(contents, /Real users require real trust/);
});
