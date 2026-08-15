import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getPrimaryNavigationOwner } from "../src/utils/primaryNavigationOwnership.js";

const bottomNavSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const projectDetailsSource = readFileSync(
  new URL("../src/pages/ProjectDetails.jsx", import.meta.url),
  "utf8"
);
const conversationThreadSource = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8"
);

test("Project Journey belongs to Work Center in personal and business navigation", () => {
  assert.equal(getPrimaryNavigationOwner("projectDetails", "personal"), "myRequests");
  assert.equal(
    getPrimaryNavigationOwner("projectDetails", "business"),
    "contractorDashboard"
  );
  assert.notEqual(getPrimaryNavigationOwner("projectDetails", "personal"), "discover");
});

test("Project Journey reports its destination instead of its return origin", () => {
  assert.match(
    projectDetailsSource,
    /<BottomNav setPage=\{setPage\} currentPage="projectDetails" \/>/
  );
  assert.doesNotMatch(
    projectDetailsSource,
    /currentPage=\{[\s\S]*projectDetailsReturnPageValue[\s\S]*"discover"/
  );
  assert.match(appSource, /if \(page === "projectDetails"\) \{/);
});

test("desktop and compact navigation share destination-owned active state", () => {
  assert.match(
    bottomNavSource,
    /const primaryNavigationOwner = getPrimaryNavigationOwner\([\s\S]*normalizedPage,[\s\S]*activeMode/
  );
  assert.match(bottomNavSource, /item\.page === primaryNavigationOwner/);
  assert.match(bottomNavSource, /renderNavItem\(item, "sidebar"\)/);
  assert.match(bottomNavSource, /renderNavItem\(item, "bottom"\)/);
});

test("Conversation Continue Project preserves canonical identity and return context", () => {
  assert.match(
    conversationThreadSource,
    /localStorage\.setItem\("activeConversationId", String\(conversationId\)\)/
  );
  assert.match(
    conversationThreadSource,
    /localStorage\.setItem\("selectedHomeownerRequestId", String\(requestId\)\)/
  );
  assert.match(
    conversationThreadSource,
    /localStorage\.setItem\("projectDetailsReturnPage", "conversationThread"\)/
  );
  assert.match(conversationThreadSource, /setPage\("projectDetails"\)/);
  assert.match(projectDetailsSource, /restoreConversationOriginContext\(setPage\)/);
});

test("direct and restored Project Journey routes retain Work Center ownership", () => {
  for (const mode of ["personal", "business"]) {
    const owner = getPrimaryNavigationOwner("projectDetails", mode);
    assert.ok(["myRequests", "contractorDashboard"].includes(owner));
    assert.notEqual(owner, "discover");
    assert.notEqual(owner, "messagesInbox");
  }
});
