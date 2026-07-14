import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../src/pages/CustomerRelationshipsCenter.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const navSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const businessToolsSource = readFileSync(
  new URL("../src/pages/BusinessCommandCenter.jsx", import.meta.url),
  "utf8"
);

test("Customer Relationships production route has no fixture registry", () => {
  assert.equal(existsSync("src/utils/customerRelationshipsRegistry.js"), false);
  assert.doesNotMatch(pageSource, /customerRelationshipsRegistry/);
  assert.doesNotMatch(pageSource, /getCustomerRelationships/);
  assert.doesNotMatch(pageSource, /localStorage|sessionStorage|authFetch|fetch\(/);
});

test("Customer Relationships renders a truthful unavailable state", () => {
  assert.match(pageSource, /Customer relationships are not available yet\./);
  assert.match(pageSource, /connected to production data/);
  assert.doesNotMatch(pageSource, /No customers yet/i);
  assert.doesNotMatch(pageSource, /Active Jobs|Closed Jobs|Last Activity/);
  assert.doesNotMatch(pageSource, /Communication History|Work History|Relationship History/);
});

test("Customer Relationships source contains no former production fixtures", () => {
  assert.doesNotMatch(pageSource, /Sarah/);
  assert.doesNotMatch(pageSource, /William/);
  assert.doesNotMatch(pageSource, /Jack Lindstrom|jack_lindstrom/);
  assert.doesNotMatch(pageSource, /relationship\.timeline|communicationSummary|workSummary/);
});

test("Customer Relationships direct route and professional navigation remain safe", () => {
  assert.match(appSource, /if \(page === "customerRelationshipsCenter"\) \{/);
  assert.match(appSource, /"customerRelationshipsCenter"[\s\S]*"emergencyCompletionActions"/);
  assert.match(navSource, /page: "customerRelationshipsCenter"/);
  assert.match(businessToolsSource, /setPage\("customerRelationshipsCenter"\)/);
  assert.match(pageSource, /setPage\("businessCommandCenter"\)/);
  assert.match(
    pageSource,
    /<BottomNav setPage=\{setPage\} currentPage="customerRelationshipsCenter" \/>/
  );
});

test("Customer Relationships unavailable state remains viewport contained", () => {
  assert.match(pageSource, /className="app-page meetro-responsive-page"/);
  assert.match(pageSource, /maxWidth: "100%"/);
  assert.match(pageSource, /minWidth: 0/);
  assert.match(pageSource, /overflowX: "hidden"/);
  assert.match(pageSource, /env\(safe-area-inset-right/);
  assert.match(pageSource, /env\(safe-area-inset-bottom/);
  assert.match(pageSource, /minHeight: "48px"/);
});
