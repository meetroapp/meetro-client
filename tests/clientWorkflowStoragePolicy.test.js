import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  canReadLegacyWorkflowStorage,
  isLegacyWorkflowStorageKey,
  purgeLegacyWorkflowStorage,
} from "../src/utils/clientWorkflowStoragePolicy.js";

function createStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
}

test("production rejects unscoped legacy workflow storage", () => {
  assert.equal(canReadLegacyWorkflowStorage({ production: true }), false);
  assert.equal(canReadLegacyWorkflowStorage({ production: false }), true);
  assert.equal(isLegacyWorkflowStorageKey("homeownerRequests"), true);
  assert.equal(isLegacyWorkflowStorageKey("meetro_conversation_42"), true);
  assert.equal(isLegacyWorkflowStorageKey("meetroTimelineMoments"), true);
  assert.equal(isLegacyWorkflowStorageKey("language"), false);
});

test("the audited workflow collections and generated record families are classified as legacy authority", () => {
  [
    "homeownerRequests",
    "meetro_business_schedule",
    "workCenterQuoteHistory",
    "meetroQuoteHistory",
    "quoteHistory",
    "completedProjects",
    "completedJobsCount",
    "totalJobRevenue",
    "meetro_conversation_registry",
    "meetro_conversation_account-a",
    "meetroTimelineMoments",
    "meetro_emergency_record_request-a",
    "activeCompletionJob",
    "completedJobPhotos",
    "emergencyPaymentStatus",
  ].forEach((key) => assert.equal(isLegacyWorkflowStorageKey(key), true, key));
});

test("legacy cleanup removes account workflow data without assigning it to another user", () => {
  const storage = createStorage({
    homeownerRequests: '[{"id":"account-a-request"}]',
    meetro_business_schedule: '[{"id":"account-a-visit"}]',
    meetro_conversation_registry: '[{"id":"account-a-thread"}]',
    meetro_conversation_42: '[{"text":"private"}]',
    meetroTimelineMoments: '[{"id":"account-a-moment"}]',
    meetroAssistantRequestDraft: '{"description":"private account-a draft"}',
    requestLocationDraft: "Account A private address",
    contractorProfile: '{"id":12}',
    language: "es",
    meetroCommunityDiscoveryInterests: '["marketing"]',
  });

  const removed = purgeLegacyWorkflowStorage(storage);

  assert.ok(removed.includes("homeownerRequests"));
  assert.ok(removed.includes("meetro_conversation_42"));
  assert.equal(storage.getItem("homeownerRequests"), null);
  assert.equal(storage.getItem("meetro_business_schedule"), null);
  assert.equal(storage.getItem("meetro_conversation_registry"), null);
  assert.equal(storage.getItem("meetroTimelineMoments"), null);
  assert.equal(storage.getItem("meetroAssistantRequestDraft"), null);
  assert.equal(storage.getItem("requestLocationDraft"), null);
  assert.equal(storage.getItem("contractorProfile"), null);
  assert.equal(storage.getItem("language"), "es");
  assert.equal(storage.getItem("meetroCommunityDiscoveryInterests"), '["marketing"]');
});

test("production modules use the centralized fail-closed storage policy", () => {
  const files = [
    "src/utils/workCenterSelectors.js",
    "src/utils/workflowTimeline.js",
    "src/utils/conversationUnread.js",
    "src/pages/Home.jsx",
    "src/pages/MessagesInbox.jsx",
    "src/pages/ConversationThread.jsx",
    "src/pages/ContractorDashboard.jsx",
    "src/pages/BusinessDashboard.jsx",
    "src/pages/Profile.jsx",
    "src/pages/CompletionSheet.jsx",
    "src/pages/EmergencyCompletionActions.jsx",
    "src/pages/ContractorDetails.jsx",
    "src/pages/QuoteRequests.jsx",
    "src/pages/ProjectDetails.jsx",
    "src/components/BottomNav.jsx",
    "src/components/MeetroAssistant.jsx",
    "src/components/workflows/WorkflowQuoteSentCard.jsx",
    "src/pages/MeetroMoments.jsx",
    "src/pages/MyRequests.jsx",
    "src/pages/Upload.jsx",
    "src/utils/meetroTimeline.js",
    "src/utils/projectLifecycleSync.js",
  ];

  files.forEach((file) => {
    const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /canReadLegacyWorkflowStorage/);
  });
});
