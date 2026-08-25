import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../src/pages/CustomerRelationshipsCenter.jsx", import.meta.url),
  "utf8"
);
const workspaceSource = readFileSync(
  new URL("../src/utils/customerRelationshipsWorkspace.js", import.meta.url),
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

test("Customer Relationships production route reads canonical server relationships without fixtures", () => {
  assert.equal(existsSync("src/utils/customerRelationshipsRegistry.js"), false);
  assert.match(pageSource, /loadCustomerRelationshipDirectory/);
  assert.match(workspaceSource, /listBusinessCustomerRelationships/);
  assert.match(workspaceSource, /getBusinessCustomerRelationshipByContact/);
  assert.doesNotMatch(pageSource, /Customer relationships are not available yet/);
  assert.doesNotMatch(pageSource, /Sarah|William|Jack Lindstrom|relationship\.timeline/);
});

test("Customer Relationships workspace is read-only and does not establish continuity while viewing", () => {
  assert.doesNotMatch(workspaceSource, /establishBusinessCustomerRelationship/);
  assert.doesNotMatch(workspaceSource, /createBusinessContact|assignBusinessContactRole/);
  assert.doesNotMatch(workspaceSource, /method:\s*["']POST["']/);
  assert.match(pageSource, /copy\.readOnly/);
  assert.match(pageSource, /copy\.noRelationshipText/);
});

test("Customer Relationships presents compact Contact authority with canonical activity and no CRM fields", () => {
  assert.match(workspaceSource, /getBusinessContact/);
  assert.match(pageSource, /copy\.relationshipActivity/);
  assert.doesNotMatch(pageSource, /<ContactFact|copy\.currentContact/);
  assert.doesNotMatch(pageSource, /relationshipScore|customerHealth|lifetimeValue|leadStage|salesStage|followUpUrgency|engagementLevel|projectCount/);
  assert.doesNotMatch(pageSource, /request_relationship/);
});

test("Customer Relationships direct route and professional navigation remain safe", () => {
  assert.match(appSource, /if \(page === "customerRelationshipsCenter"\) \{/);
  assert.match(appSource, /"customerRelationshipsCenter"[\s\S]*"invoiceBuilder"/);
  assert.match(navSource, /page: "customerRelationshipsCenter"/);
  assert.match(businessToolsSource, /setPage\("customerRelationshipsCenter"\)/);
  assert.match(pageSource, /setPage\(navigationContext\?\.returnPage \|\| "businessCommandCenter"\)/);
  assert.match(
    pageSource,
    /<BottomNav setPage=\{setPage\} currentPage="customerRelationshipsCenter" \/>/
  );
});

test("Customer Relationships loading, empty, error, archived, and external states remain accessible and contained", () => {
  assert.match(pageSource, /status === "loading"/);
  assert.match(pageSource, /status === "error"/);
  assert.match(pageSource, /relationships\.length === 0/);
  assert.match(pageSource, /contact\.status === "ARCHIVED"/);
  assert.match(pageSource, /copy\.externalContact/);
  assert.match(pageSource, /role="status"/);
  assert.match(pageSource, /role="alert"/);
  assert.match(pageSource, /aria-label=/);
  assert.match(pageSource, /className="app-page meetro-responsive-page"/);
  assert.match(pageSource, /maxWidth: "100%"/);
  assert.match(pageSource, /minWidth: 0/);
  assert.match(pageSource, /overflowX: "hidden"/);
  assert.match(pageSource, /env\(safe-area-inset-right/);
  assert.match(pageSource, /minHeight: "46px"/);
});
