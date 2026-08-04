import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productionFiles = [
  "src/utils/alertApi.js",
  "src/utils/canonicalAlert.js",
];
const source = productionFiles
  .map((file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8"))
  .join("\n");

test("alert foundation has no browser storage or legacy notification authority", () => {
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(source, /notifications\.js|meetroNotifications|notificationCenter/);
  assert.doesNotMatch(source, /conversationUnread|dashboardMetrics|workflowDependencyAlerts/);
});

test("alert foundation creates no browser alert identity, timestamp, count, or dedupe authority", () => {
  assert.doesNotMatch(source, /Date\.now\s*\(/);
  assert.doesNotMatch(source, /Math\.random|randomUUID|uuidv?4/i);
  assert.doesNotMatch(source, /dedupeKey|deduplicate|newAlert|createAlert|generateAlert/i);
  assert.doesNotMatch(source, /recipientUserId|recipientId|ownerUserId/);
  const localCountAuthorityPatterns = [
    /\balerts?\s*(?:\?\.|\.)\s*length\b/,
    /\balerts?\s*\.\s*filter\s*\([\s\S]{0,160}\)\s*\.\s*length\b/,
    /\balerts?\s*\.\s*reduce\s*\(/,
    /\b(?:alertCount|activeCount|unreadCount|totalAlerts|active|unread)\s*(?:\+\+|--|\+=|-=)/,
    /\b(?:active|unread)\s*=\s*[^;\n]*(?:byCategory|category)[^;\n]*\+/,
  ];
  for (const pattern of localCountAuthorityPatterns) {
    assert.doesNotMatch(source, pattern);
  }
});

test("alert foundation has no conversation-read mutation or presentation authority", () => {
  assert.doesNotMatch(source, /conversations\/.+\/read|markConversationRead/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(?:App|router|Notifications|MessagesInbox|ConversationThread)/);
  assert.doesNotMatch(source, /react|jsx|setPage\s*\(|window\.|document\./i);
});

test("alert foundation creates no polling, cache, listener, or frontend alert mutation", () => {
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /addEventListener|removeEventListener|dispatchEvent/);
  assert.doesNotMatch(source, /moduleCache|lastGood|snapshot|subscribers?/i);
  assert.doesNotMatch(source, /function\s+(?:create|resolve|archive|expire)Alert\b/);
});

test("alert transport imports only authenticated transport and canonical response authority", () => {
  const apiSource = readFileSync(
    new URL("../src/utils/alertApi.js", import.meta.url),
    "utf8"
  );
  const imports = [...apiSource.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((match) => match[1]);
  assert.deepEqual(imports.sort(), ["./authFetch.js", "./canonicalAlert.js"]);
  assert.doesNotMatch(apiSource, /Authorization|Bearer|token/);
});
