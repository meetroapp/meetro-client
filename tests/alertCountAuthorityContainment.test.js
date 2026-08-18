import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const coordinatorSource = readFileSync(
  new URL("../src/utils/alertCountCoordinator.js", import.meta.url),
  "utf8"
);
const bottomNavSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const notificationsSource = readFileSync(
  new URL("../src/pages/Notifications.jsx", import.meta.url),
  "utf8"
);

test("coordinator consumes only the approved Alert count API and canonical adapter", () => {
  assert.match(coordinatorSource, /import \{ fetchAlertCounts \} from "\.\/alertApi\.js"/);
  assert.match(coordinatorSource, /normalizeAlertCountsResponse\(result\)/);
  assert.equal((coordinatorSource.match(/fetchAlertCounts\(/g) || []).length, 1);
  assert.doesNotMatch(coordinatorSource, /authFetch|fetchAlerts|markAlert|dismissAlert/);
});

test("coordinator owns no durable storage, routing, recipient, or Alert lifecycle authority", () => {
  assert.doesNotMatch(
    coordinatorSource,
    /localStorage|sessionStorage|indexedDB|recipient|setPage|window\.location|location\.hash/
  );
  assert.doesNotMatch(
    coordinatorSource,
    /createCanonicalAlert|resolveCanonicalAlert|dismissAlert\(|markAlert(?:Read|Unread)\(|markConversation|conversation.*read/i
  );
});

test("coordinator never calculates counts from arrays, categories, or local mutations", () => {
  assert.doesNotMatch(coordinatorSource, /alerts?\.length|byCategory|reduce\(|counts?\s*[-+]=/);
  assert.doesNotMatch(coordinatorSource, /unread\s*[-+]|unread\s*=|active\s*[-+]/);
  assert.doesNotMatch(coordinatorSource, /Math\.(?:min|max)\([^)]*unread/);
});

test("one module-level coordinator owns scheduling and page components own no timers", () => {
  assert.equal((coordinatorSource.match(/const alertCountCoordinator = createAlertCountCoordinator\(\{/g) || []).length, 1);
  assert.equal((coordinatorSource.match(/addEventListener\("visibilitychange"/g) || []).length, 1);
  const integrationBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("useEffect(() => {\n    setAlertCountIdentity"),
    bottomNavSource.indexOf("useEffect(() => {\n    let showListener")
  );
  assert.doesNotMatch(integrationBlock, /setInterval\(|setTimeout\(/);
  assert.doesNotMatch(notificationsSource, /setInterval\(|setTimeout\(/);
  assert.equal((bottomNavSource.match(/subscribeAlertCounts\(/g) || []).length, 1);
});

test("navigation Alert count identity comes from authenticated session identity", () => {
  assert.match(bottomNavSource, /getAuthenticatedIdentitySnapshot/);
  assert.match(bottomNavSource, /subscribeAuthenticatedIdentity/);
  assert.match(bottomNavSource, /snapshot\?\.status === "authenticated"/);
  assert.match(bottomNavSource, /typeof snapshot\.userId === "string"/);
  assert.doesNotMatch(bottomNavSource, /getAccountStorageIdentity/);

  const identityBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("function getAuthenticatedAlertCountIdentity"),
    bottomNavSource.indexOf("function getUnreadMessageCount")
  );
  assert.doesNotMatch(
    identityBlock,
    /localStorage|sessionStorage|getItem\(|JSON\.parse|email|token|role|accountType/
  );
});

test("Alert Center mutation integration only requests canonical invalidation", () => {
  assert.match(notificationsSource, /refreshAlertCounts/);
  assert.doesNotMatch(notificationsSource, /setAlertCountIdentity|subscribeAlertCounts|resetAlertCounts/);
  assert.doesNotMatch(notificationsSource, /counts?\.(?:unread|active)\s*=/);
});

test("navigation projects canonical category counts without a local unread authority", () => {
  const unreadBranch = bottomNavSource.slice(
    bottomNavSource.indexOf("const getItemUnreadCount"),
    bottomNavSource.indexOf("const getItemAccessibleLabel")
  );
  assert.match(bottomNavSource, /counts\?\.byCategory\?\./);
  assert.match(bottomNavSource, /canonicalCategoryUnreadCount\("communication"\)/);
  assert.match(bottomNavSource, /canonicalCategoryUnreadCount\("request"\)/);
  assert.match(unreadBranch, /item\.shortcut === "businessLeads"/);
  assert.match(unreadBranch, /item\.page === "contractorDashboard"/);
  assert.doesNotMatch(bottomNavSource, /getUnreadNotificationCount/);
  assert.doesNotMatch(bottomNavSource, /canonicalAlertUnreadCount/);
});
