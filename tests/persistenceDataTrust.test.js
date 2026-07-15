import test from "node:test";
import assert from "node:assert/strict";

import { clearAccountWorkflowData } from "../src/utils/accountStorage.js";

function createLocalStorageMock(seed = {}) {
  const store = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index) {
      return Array.from(store.keys())[index] || null;
    },
    get length() {
      return store.size;
    },
    keys() {
      return Array.from(store.keys());
    },
  };
}

function installBrowserMocks(seed = {}) {
  const storage = createLocalStorageMock(seed);

  globalThis.localStorage = storage;
  globalThis.window = {
    dispatchEvent() {},
  };

  return storage;
}

test("account workflow cleanup removes durable workflow records and preserves preferences", () => {
  installBrowserMocks({
    language: "fr",
    meetroLanguage: "fr",
    homeownerRequests: "[{\"id\":\"request-1\"}]",
    meetro_business_schedule:
      "[{\"id\":\"visit-1\",\"evaluation\":{\"notes\":\"checked site\"},\"workItems\":[{\"title\":\"Door\"}]}]",
    workCenterQuoteHistory: "[{\"quoteId\":\"quote-1\",\"scheduleId\":\"visit-1\"}]",
    meetroQuoteHistory: "[{\"quoteId\":\"quote-1\"}]",
    quoteHistory: "[{\"quoteId\":\"quote-1\"}]",
    "meetro_conversation_visit-1": "[{\"text\":\"hello\"}]",
    "meetro_job_record_visit-1": "[{\"type\":\"completion\"}]",
    activeWorkRequestId: "request-1",
    activeWorkQuoteId: "quote-1",
    activeWorkScheduleId: "visit-1",
    activeWorkStatus: "working",
    activeJobStatus: "arrived",
    completedProjects: "[{\"id\":\"completed-1\"}]",
    lastCompletedProject: "{\"id\":\"completed-1\"}",
    selectedQuoteRequest: "{\"id\":\"transient-request\"}",
    activeConversationId: "transient-conversation",
    selectedConversation: "{\"id\":\"stale-conversation\"}",
    activeEmergencyRecord: "{\"id\":\"stale-emergency\"}",
    activeEmergencyRequestId: "stale-emergency",
    emergencyDispatchStatus: "accepted",
    selectedEmergencyService_plumbing: "Plumbing",
  });

  clearAccountWorkflowData();

  assert.equal(localStorage.getItem("homeownerRequests"), null);
  assert.equal(localStorage.getItem("meetro_business_schedule"), null);
  assert.equal(localStorage.getItem("workCenterQuoteHistory"), null);
  assert.equal(localStorage.getItem("meetroQuoteHistory"), null);
  assert.equal(localStorage.getItem("quoteHistory"), null);
  assert.equal(localStorage.getItem("meetro_conversation_visit-1"), null);
  assert.equal(localStorage.getItem("meetro_job_record_visit-1"), null);
  assert.equal(localStorage.getItem("activeWorkRequestId"), null);
  assert.equal(localStorage.getItem("activeWorkQuoteId"), null);
  assert.equal(localStorage.getItem("activeWorkScheduleId"), null);
  assert.equal(localStorage.getItem("activeWorkStatus"), null);
  assert.equal(localStorage.getItem("activeJobStatus"), null);
  assert.equal(localStorage.getItem("completedProjects"), null);
  assert.equal(localStorage.getItem("lastCompletedProject"), null);

  assert.equal(localStorage.getItem("selectedQuoteRequest"), null);
  assert.equal(localStorage.getItem("activeConversationId"), null);
  assert.equal(localStorage.getItem("selectedConversation"), null);
  assert.equal(localStorage.getItem("activeEmergencyRecord"), null);
  assert.equal(localStorage.getItem("activeEmergencyRequestId"), null);
  assert.equal(localStorage.getItem("emergencyDispatchStatus"), null);
  assert.equal(localStorage.getItem("selectedEmergencyService_plumbing"), null);
  assert.equal(localStorage.getItem("language"), "fr");
  assert.equal(localStorage.getItem("meetroLanguage"), "fr");
});
