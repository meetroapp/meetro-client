import test from "node:test";
import assert from "node:assert/strict";
import {
  moveJobToHistory,
  updateProjectLifecycleState,
} from "../src/utils/projectLifecycleSync.js";

function createStorage(seed = {}) {
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
    dump() {
      return Object.fromEntries(store.entries());
    },
  };
}

function readArray(storage, key) {
  return JSON.parse(storage.getItem(key) || "[]");
}

test("active work lifecycle updates sync to homeowner, schedule, and conversation stores", () => {
  const storage = createStorage({
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-1",
        conversationId: "conversation-1",
        title: "Kitchen remodel",
        status: "work_scheduled",
      },
    ]),
    meetro_business_schedule: JSON.stringify([
      {
        id: "schedule-1",
        requestId: "request-1",
        conversationId: "conversation-1",
        status: "work_scheduled",
      },
    ]),
    meetro_conversation_registry: JSON.stringify([
      {
        id: "conversation-1",
        requestId: "request-1",
        project_title: "Kitchen remodel",
        conversation_type: "standard",
      },
    ]),
    activeWorkRequestId: "request-1",
    activeWorkConversationId: "conversation-1",
  });

  updateProjectLifecycleState(
    { requestId: "request-1", conversationId: "conversation-1" },
    "arrived",
    { statusLabel: "Arrived" },
    { storage }
  );

  assert.equal(readArray(storage, "homeownerRequests")[0].status, "arrived");
  assert.equal(readArray(storage, "homeownerRequests")[0].activeWorkStatus, "arrived");
  assert.equal(readArray(storage, "meetro_business_schedule")[0].jobStage, "arrived");
  assert.equal(readArray(storage, "meetro_conversation_registry")[0].workflowStatus, "arrived");
  assert.equal(storage.getItem("activeWorkStatus"), "arrived");
});

test("conversation-driven lifecycle updates sync back to active work records", () => {
  const storage = createStorage({
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-2",
        conversationId: "conversation-2",
        status: "arrived",
      },
    ]),
    meetro_business_schedule: JSON.stringify([
      {
        scheduleId: "schedule-2",
        requestId: "request-2",
        conversationId: "conversation-2",
        status: "arrived",
      },
    ]),
    meetro_conversation_registry: JSON.stringify([
      {
        id: "conversation-2",
        requestId: "request-2",
      },
    ]),
  });

  updateProjectLifecycleState(
    { conversationId: "conversation-2" },
    "in_progress",
    {
      requestId: "request-2",
      lastMessage: "Work started",
    },
    { storage }
  );

  assert.equal(readArray(storage, "homeownerRequests")[0].workStatus, "in_progress");
  assert.equal(readArray(storage, "meetro_business_schedule")[0].workflowStatus, "in_progress");
  assert.equal(readArray(storage, "meetro_conversation_registry")[0].lastMessage, "Work started");
  assert.equal(storage.getItem("activeWorkStatus"), "in_progress");
});

test("needs resolution keeps the project active and out of job history", () => {
  const storage = createStorage({
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-3",
        conversationId: "conversation-3",
        status: "awaiting_customer_confirmation",
      },
    ]),
    completedProjects: JSON.stringify([]),
    meetro_conversation_registry: JSON.stringify([
      {
        id: "conversation-3",
        requestId: "request-3",
      },
    ]),
  });

  updateProjectLifecycleState(
    { requestId: "request-3", conversationId: "conversation-3" },
    "needs_resolution",
    {
      resolutionStatus: "needs_resolution",
      lastMessage: "Customer concern submitted",
    },
    { storage }
  );

  assert.equal(readArray(storage, "homeownerRequests")[0].status, "needs_resolution");
  assert.equal(readArray(storage, "meetro_conversation_registry")[0].resolutionStatus, "needs_resolution");
  assert.deepEqual(readArray(storage, "completedProjects"), []);
});

test("closeout moves one record to history and clears matching active snapshots", () => {
  const storage = createStorage({
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-4",
        conversationId: "conversation-4",
        title: "Door repair",
        status: "completed",
      },
    ]),
    meetro_business_schedule: JSON.stringify([
      {
        scheduleId: "schedule-4",
        requestId: "request-4",
        conversationId: "conversation-4",
        status: "completed",
      },
    ]),
    completedProjects: JSON.stringify([]),
    activeWorkRequestId: "request-4",
    activeWorkConversationId: "conversation-4",
    activeWorkStatus: "completed",
  });

  moveJobToHistory(
    {
      requestId: "request-4",
      conversationId: "conversation-4",
      title: "Door repair",
    },
    { closedAt: "2026-06-25T12:00:00.000Z" },
    { storage }
  );
  moveJobToHistory(
    {
      requestId: "request-4",
      conversationId: "conversation-4",
      title: "Door repair",
    },
    { closedAt: "2026-06-25T12:00:00.000Z" },
    { storage }
  );

  const history = readArray(storage, "completedProjects");
  assert.equal(history.length, 1);
  assert.equal(history[0].status, "closed");
  assert.equal(history[0].lifecycleState, "history");
  assert.equal(readArray(storage, "homeownerRequests")[0].closureStatus, "closed");
  assert.equal(readArray(storage, "meetro_business_schedule")[0].status, "closed");
  assert.equal(storage.getItem("activeWorkStatus"), null);
});

test("closure-completed lifecycle state clears active snapshots", () => {
  const storage = createStorage({
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-closure-complete",
        conversationId: "conversation-closure-complete",
        title: "Finished repair",
        status: "completed",
      },
    ]),
    meetro_business_schedule: JSON.stringify([
      {
        scheduleId: "schedule-closure-complete",
        requestId: "request-closure-complete",
        conversationId: "conversation-closure-complete",
        status: "completed",
      },
    ]),
    meetro_conversation_registry: JSON.stringify([
      {
        id: "conversation-closure-complete",
        requestId: "request-closure-complete",
        status: "completed",
      },
    ]),
    activeWorkRequestId: "request-closure-complete",
    activeWorkConversationId: "conversation-closure-complete",
    activeWorkStatus: "completed",
  });

  updateProjectLifecycleState(
    {
      requestId: "request-closure-complete",
      conversationId: "conversation-closure-complete",
    },
    "closure_completed",
    { closureStatus: "closed" },
    { storage }
  );

  assert.equal(readArray(storage, "homeownerRequests")[0].status, "closure_completed");
  assert.equal(readArray(storage, "meetro_business_schedule")[0].status, "closure_completed");
  assert.equal(readArray(storage, "meetro_conversation_registry")[0].workflowStatus, "closure_completed");
  assert.equal(storage.getItem("activeWorkStatus"), null);
  assert.equal(storage.getItem("activeWorkRequestId"), null);
});
