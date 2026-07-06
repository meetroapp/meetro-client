import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const blockerFixesPath = join(
  repoRoot,
  "docs",
  "KnowledgeBase",
  "BACKEND_SECURITY_BLOCKER_FIXES.md"
);

test("backend security blocker fixes document exists with required sections", () => {
  const contents = readFileSync(blockerFixesPath, "utf8");

  assert.match(contents, /# Backend Security Blocker Fixes/);
  assert.match(contents, /## Executive Summary/);
  assert.match(contents, /## Fixes Applied/);
  assert.match(contents, /## Files Changed/);
  assert.match(contents, /## Security Behavior Before/);
  assert.match(contents, /## Security Behavior After/);
  assert.match(contents, /## Tests Added/);
  assert.match(contents, /## Verification Steps/);
  assert.match(contents, /## Remaining Founder\/Admin Items/);
  assert.match(contents, /## Remaining Blockers/);
  assert.match(contents, /## Final Decision/);
});

test("backend security blocker fixes preserve the blocked release decision", () => {
  const contents = readFileSync(blockerFixesPath, "utf8");

  assert.match(contents, /GET \/posts` now requires authentication/);
  assert.match(contents, /Production CORS no longer permits wildcard origins/);
  assert.match(contents, /Malformed `\/auth\/login` input is validated/);
  assert.match(contents, /\/health` now returns safe operational metadata/);
  assert.match(contents, /No true staging API\/database has been confirmed/);
  assert.match(contents, /❌ BACKEND STILL BLOCKED/);
});
