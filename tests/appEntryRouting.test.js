import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  isRecognizedApplicationHash,
  PUBLIC_WEBSITE_FRAGMENTS,
  shouldRenderPublicSite,
} from "../src/utils/appEntryRouting.js";

const JOB_ID = "02c7ee78-daa7-4c10-b0c9-e76c8469629a";
const QUOTE_ID = "3377e972-f526-4fbf-8405-8d84b407dd1d";
const WORK_CENTER_HASH = `#workCenter?jobId=${JOB_ID}&quoteId=${QUOTE_ID}`;

function entry(pathname, hash = "", native = false) {
  return shouldRenderPublicSite({ pathname, hash, native });
}

test("public website paths and marketing fragments remain public", () => {
  assert.equal(entry("/"), true);
  assert.equal(entry("/", "#why"), true);
  assert.equal(entry("/", "#journey"), true);
  assert.equal(entry("/", "#resources"), true);
  assert.equal(entry("/privacy"), true);
  assert.equal(entry("/terms"), true);
  assert.equal(entry("/contact"), true);

  for (const fragment of PUBLIC_WEBSITE_FRAGMENTS) {
    assert.equal(entry("/", fragment ? `#${fragment}` : ""), true);
    assert.equal(isRecognizedApplicationHash(`#${fragment}`), false);
  }
});

test("login pathname and login hash enter the application", () => {
  assert.equal(entry("/login"), false);
  assert.equal(entry("/", "#login"), false);
});

test("recognized application hashes override only the public root", () => {
  assert.equal(entry("/", WORK_CENTER_HASH), false);
  assert.equal(entry("/", "#quoteBuilder?jobId=job-1"), false);
  assert.equal(entry("/", "#notifications"), false);
  assert.equal(entry("/privacy", WORK_CENTER_HASH), true);
});

test("unauthenticated professional deep links enter App and retain the login guard", () => {
  const app = readFileSync("src/App.jsx", "utf8");

  assert.equal(entry("/", WORK_CENTER_HASH), false);
  assert.match(app, /if \(!hasToken\) \{[\s\S]*?return "login";/);
});

test("authenticated professional deep links retain the guarded destination path", () => {
  const app = readFileSync("src/App.jsx", "utf8");

  assert.equal(entry("/", WORK_CENTER_HASH), false);
  assert.match(app, /return getGuardedPage\(routedHash\);/);
  assert.match(app, /restoreAuthenticatedSessionFromStorage\(hashPage\)/);
});

test("native Capacitor entry remains App-only", () => {
  assert.equal(entry("/", "", true), false);
  assert.equal(entry("/privacy", "#why", true), false);
});

test("unknown and malformed hashes fail safely on the public root", () => {
  assert.equal(entry("/", "#workCenterLookalike?jobId=unsafe"), true);
  assert.equal(entry("/", "#workCenter#notifications"), true);
  assert.equal(entry("/", "workCenter"), true);
  assert.equal(isRecognizedApplicationHash("#workCenter?jobId=not-a-uuid"), true);
});

test("hard refresh preserves the exact Work Center application entry", () => {
  assert.equal(entry("/", WORK_CENTER_HASH), false);
});
