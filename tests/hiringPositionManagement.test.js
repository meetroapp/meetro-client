import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { t } from "../src/utils/language.js";
import { getBusinessToolById } from "../src/utils/businessToolsRegistry.js";
import { getRuntimeHiringQaOptions } from "../src/utils/hiringFixtureGate.js";

const center = readFileSync("src/pages/HiringCenter.jsx", "utf8");
const unavailable = readFileSync("src/components/HiringUnavailableState.jsx", "utf8");
const registry = readFileSync("src/utils/hiringCenterRegistry.js", "utf8");
const css = readFileSync("src/index.css", "utf8");

test("Hiring Center remains routed but is no longer marked ready for local mutations", () => {
  const tool = getBusinessToolById("hiringCenter");
  assert.equal(tool.route, "hiringCenter");
  assert.equal(tool.status, "read_only");
  assert.match(center, /<HiringUnavailableState/);
});

test("production Hiring Center does not read or mutate local personnel registries", () => {
  assert.doesNotMatch(center, /hiringCenterRegistry|hiringInterviews|teamMembers|hiringConversations/);
  assert.doesNotMatch(center, /localStorage|sessionStorage/);
  assert.doesNotMatch(center, /saveHiringPosition|publishHiringPosition|createHiringInterview|createTeamMember/);
  assert.doesNotMatch(center, /createNotification|upsertNotification/);
});

test("truthful unavailable state preserves navigation and safe semantics", () => {
  assert.match(unavailable, /role="status"/);
  assert.match(unavailable, /hiringOperationsUnavailable/);
  assert.match(unavailable, /hiringOperationsUnavailableText/);
  assert.match(center, /setPage\("businessCommandCenter"\)/);
  assert.match(center, /currentPage="hiringCenter"/);
});

test("legacy QA fixtures remain impossible to enable in production", () => {
  assert.deepEqual(getRuntimeHiringQaOptions({ getItem: () => "true" }, { DEV: false }), {
    environment: "production",
    qaMode: false,
  });
  assert.match(registry, /isHiringQaFixtureEnabled/);
});

test("unavailable Hiring layout is viewport and safe-area contained", () => {
  assert.match(css, /\.hiring-truth-page[\s\S]*safe-area-inset-bottom/);
  assert.match(css, /\.hiring-truth-workspace[\s\S]*max-width: 760px/);
  assert.match(css, /\.hiring-truth-card button[\s\S]*min-height: 48px/);
});

test("truthful Hiring copy exists in every supported language", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of [
      "hiringOperationsDescription",
      "hiringOperationsUnavailable",
      "hiringOperationsUnavailableText",
      "hiringOpportunitiesTruthDescription",
    ]) {
      assert.notEqual(t(key, language), key, `${language}:${key}`);
    }
  }
});
