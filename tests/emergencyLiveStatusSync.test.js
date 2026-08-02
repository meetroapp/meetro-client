import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EMERGENCY_REFRESH_INTERVAL_MS,
  createEmergencyRefreshCoordinator,
} from "../src/utils/emergencyRefreshCoordinator.js";

function createScheduler() {
  let nextId = 1;
  const tasks = new Map();

  return {
    schedule(callback, delay) {
      const id = nextId;
      nextId += 1;
      tasks.set(id, { callback, delay });
      return id;
    },
    cancel(id) {
      tasks.delete(id);
    },
    runNext() {
      const entry = tasks.entries().next().value;
      if (!entry) return false;
      const [id, task] = entry;
      tasks.delete(id);
      task.callback();
      return true;
    },
    size() {
      return tasks.size;
    },
    delays() {
      return [...tasks.values()].map((task) => task.delay);
    },
  };
}

function createDeferred() {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test("successful Emergency dispatch stages refresh the visible canonical lifecycle", async () => {
  const scheduler = createScheduler();
  let backendStatus = "assigned";
  const visibleStatuses = [];
  const coordinator = createEmergencyRefreshCoordinator({
    load: async () => ({ id: 10, status: backendStatus }),
    onSuccess: (request) => visibleStatuses.push(request.status),
    schedule: scheduler.schedule,
    cancelSchedule: scheduler.cancel,
  });

  await coordinator.start();
  assert.equal(visibleStatuses.at(-1), "assigned");

  const transitions = [
    ["On the Way", "professional_en_route"],
    ["Arrived", "professional_arrived"],
    ["Work Started", "in_service"],
    ["Completed", "completed"],
  ];

  for (const [label, status] of transitions) {
    backendStatus = status;
    const result = await coordinator.refresh({
      invalidate: true,
      trigger: `mutation:${label}`,
    });
    assert.equal(result.status, "applied", label);
    assert.equal(visibleStatuses.at(-1), status, label);
  }

  coordinator.stop();
});

test("bounded foreground refresh publishes an externally changed backend status", async () => {
  const scheduler = createScheduler();
  let backendStatus = "assigned";
  let visibleStatus = "";
  const coordinator = createEmergencyRefreshCoordinator({
    load: async () => ({ id: 10, status: backendStatus }),
    onSuccess: (request) => {
      visibleStatus = request.status;
    },
    schedule: scheduler.schedule,
    cancelSchedule: scheduler.cancel,
  });

  await coordinator.start();
  assert.deepEqual(scheduler.delays(), [EMERGENCY_REFRESH_INTERVAL_MS]);

  backendStatus = "professional_en_route";
  assert.equal(scheduler.runNext(), true);
  await flushMicrotasks();

  assert.equal(visibleStatus, "professional_en_route");
  assert.equal(coordinator.getMetrics().networkRequestCount, 2);
  coordinator.stop();
});

test("an invalidated earlier response cannot overwrite newer Emergency truth", async () => {
  const scheduler = createScheduler();
  const firstRequest = createDeferred();
  let calls = 0;
  const visibleStatuses = [];
  const coordinator = createEmergencyRefreshCoordinator({
    load: () => {
      calls += 1;
      return calls === 1
        ? firstRequest.promise
        : Promise.resolve({ id: 10, status: "completed" });
    },
    onSuccess: (request) => visibleStatuses.push(request.status),
    schedule: scheduler.schedule,
    cancelSchedule: scheduler.cancel,
  });

  const initialLoad = coordinator.start();
  const mutationRefresh = coordinator.refresh({
    invalidate: true,
    trigger: "mutation",
  });

  firstRequest.resolve({ id: 10, status: "assigned" });
  await initialLoad;
  const result = await mutationRefresh;

  assert.equal(result.status, "applied");
  assert.deepEqual(visibleStatuses, ["completed"]);
  assert.equal(
    coordinator.getMetrics().maximumConcurrentRequests,
    1
  );
  coordinator.stop();
});

test("polling pauses while hidden, resumes when visible, and stops on unmount", async () => {
  const scheduler = createScheduler();
  let visible = true;
  let loads = 0;
  const coordinator = createEmergencyRefreshCoordinator({
    load: async () => {
      loads += 1;
      return { id: 10, status: "assigned" };
    },
    isVisible: () => visible,
    schedule: scheduler.schedule,
    cancelSchedule: scheduler.cancel,
  });

  await coordinator.start();
  assert.equal(loads, 1);
  assert.equal(scheduler.size(), 1);

  visible = false;
  assert.equal(
    (await coordinator.handleVisibilityChange()).status,
    "hidden"
  );
  assert.equal(scheduler.size(), 0);

  visible = true;
  await coordinator.handleVisibilityChange();
  assert.equal(loads, 2);
  assert.equal(scheduler.size(), 1);

  coordinator.stop();
  assert.equal(scheduler.size(), 0);
  assert.equal(coordinator.getMetrics().running, false);
});

test("transient refresh failure preserves the last confirmed canonical state", async () => {
  const scheduler = createScheduler();
  let shouldFail = false;
  let visibleStatus = "";
  const errors = [];
  const coordinator = createEmergencyRefreshCoordinator({
    load: async () => {
      if (shouldFail) throw new Error("temporary network failure");
      return { id: 10, status: "professional_arrived" };
    },
    onSuccess: (request) => {
      visibleStatus = request.status;
    },
    onError: (error, metadata) => {
      errors.push({ error, metadata });
    },
    schedule: scheduler.schedule,
    cancelSchedule: scheduler.cancel,
  });

  await coordinator.start();
  shouldFail = true;
  const result = await coordinator.refresh({
    invalidate: true,
    trigger: "poll",
  });

  assert.equal(result.status, "error");
  assert.equal(visibleStatus, "professional_arrived");
  assert.equal(errors[0].metadata.hasConfirmedData, true);
  coordinator.stop();
});

test("ConversationThread preserves confirmed canonical messages on refresh failure", () => {
  const conversationSource = readFileSync(
    new URL("../src/pages/ConversationThread.jsx", import.meta.url),
    "utf8"
  );
  const canonicalLoadSource = conversationSource.slice(
    conversationSource.indexOf("const loadMessages = async () =>"),
    conversationSource.indexOf("const initializeConversationLoad = () =>")
  );

  assert.match(
    canonicalLoadSource,
    /setCanonicalMessagesPhase\(\s*canonicalConfirmedMessagesRef\.current\s*\? "ready"\s*: "error"\s*\)/
  );
  assert.match(
    canonicalLoadSource,
    /canonicalConfirmedMessagesRef\.current = true;[\s\S]*setMessages\([\s\S]*setCanonicalMessagesPhase\("ready"\)/
  );
});

test("canonical detail publication cannot restart embedded message hydration", () => {
  const messagesSource = readFileSync(
    new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
    "utf8"
  );
  const callbackSource = messagesSource.slice(
    messagesSource.indexOf("const handleCanonicalEmergencyContextChange"),
    messagesSource.indexOf("function getCanonicalEmergencyConversationId")
  );

  assert.match(
    callbackSource,
    /const handleCanonicalEmergencyContextChange = useCallback\([\s\S]*?, \[\]\);/
  );
  assert.match(
    callbackSource,
    /const handleSplitThreadPageChange = useCallback\([\s\S]*?\[routedConversationId, setPage\]/
  );
  assert.doesNotMatch(
    callbackSource,
    /\[activeEmergencyContext|\[activeSplitConversation|\[quotes/
  );
});

test("Emergency refresh coordination creates no browser lifecycle authority", () => {
  const source = readFileSync(
    new URL("../src/utils/emergencyRefreshCoordinator.js", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(
    source,
    /professional_en_route|professional_arrived|in_service|completed/
  );
});

test("canonical Emergency surfaces share bounded refresh without a second conversation loop", () => {
  const myRequestsSource = readFileSync(
    new URL("../src/pages/MyRequests.jsx", import.meta.url),
    "utf8"
  );
  const emergencyRequestSource = readFileSync(
    new URL("../src/pages/EmergencyRequest.jsx", import.meta.url),
    "utf8"
  );
  const businessLeadsSource = readFileSync(
    new URL("../src/pages/BusinessLeads.jsx", import.meta.url),
    "utf8"
  );
  const conversationSource = readFileSync(
    new URL("../src/pages/ConversationThread.jsx", import.meta.url),
    "utf8"
  );

  for (const source of [
    myRequestsSource,
    emergencyRequestSource,
    businessLeadsSource,
  ]) {
    assert.match(source, /createEmergencyRefreshCoordinator/);
    assert.match(source, /visibilitychange/);
  }

  assert.match(
    emergencyRequestSource,
    /refreshCanonicalRequestAfterMutation\(\)/
  );
  assert.match(
    conversationSource,
    /if \(isCanonicalEmergencyThread\)[\s\S]*createEmergencyRefreshCoordinator/
  );
  assert.match(
    conversationSource,
    /setCanonicalReloadKey\(\(value\) => value \+ 1\)/
  );
});

test("the coordinator maintains one scheduled poll and one in-flight request", async () => {
  const scheduler = createScheduler();
  const pending = createDeferred();
  const coordinator = createEmergencyRefreshCoordinator({
    load: () => pending.promise,
    schedule: scheduler.schedule,
    cancelSchedule: scheduler.cancel,
  });

  const first = coordinator.start();
  const second = coordinator.refresh({ trigger: "manual" });
  const third = coordinator.refresh({ trigger: "manual" });

  assert.equal(first, second);
  assert.equal(second, third);
  assert.equal(coordinator.getMetrics().networkRequestCount, 1);
  assert.equal(coordinator.getMetrics().maximumConcurrentRequests, 1);
  assert.equal(scheduler.size(), 0);

  pending.resolve({ id: 10, status: "assigned" });
  await first;
  assert.equal(scheduler.size(), 1);
  coordinator.stop();
});
