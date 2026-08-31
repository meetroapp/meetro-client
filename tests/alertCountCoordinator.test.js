import assert from "node:assert/strict";
import test from "node:test";

import {
  ALERT_COUNT_PHASE,
  ALERT_COUNT_POLL_INTERVAL_MS,
  createAlertCountCoordinator,
} from "../src/utils/alertCountCoordinator.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function countResponse(unread, {
  active = unread,
  byCategory = {},
  communication = {
    unread: 0,
    customerUnread: 0,
    teamUnread: 0,
    byJob: [],
    byConversation: [],
  },
} = {}) {
  return {
    success: true,
    code: "ALERT_COUNTS_RETRIEVED",
    counts: { active, unread, byCategory, communication },
  };
}

function createFocusSource() {
  const listeners = new Set();
  return {
    addEventListener(type, listener) {
      if (type === "focus") listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "focus") listeners.delete(listener);
    },
    focus() {
      listeners.forEach((listener) => listener());
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

function createControlledTransport() {
  const calls = [];
  let active = 0;
  let maximum = 0;
  return {
    calls,
    request() {
      const operation = deferred();
      active += 1;
      maximum = Math.max(maximum, active);
      const promise = operation.promise.then(
        (value) => {
          active -= 1;
          return value;
        },
        (error) => {
          active -= 1;
          throw error;
        }
      );
      calls.push({ ...operation, promise });
      return promise;
    },
    get active() {
      return active;
    },
    get maximum() {
      return maximum;
    },
  };
}

function createControlledScheduler() {
  const timers = new Map();
  const delays = [];
  let nextId = 1;
  return {
    cancel(timer) {
      timers.delete(timer);
    },
    get delays() {
      return [...delays];
    },
    get size() {
      return timers.size;
    },
    runNext() {
      const first = timers.entries().next().value;
      if (!first) return false;
      const [id, callback] = first;
      timers.delete(id);
      callback();
      return true;
    },
    schedule(callback, delay) {
      const id = nextId;
      nextId += 1;
      timers.set(id, callback);
      delays.push(delay);
      return id;
    },
  };
}

function createVisibilitySource(initiallyHidden = false) {
  const listeners = new Set();
  return {
    hidden: initiallyHidden,
    addEventListener(type, listener) {
      if (type === "visibilitychange") listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "visibilitychange") listeners.delete(listener);
    },
    setHidden(hidden) {
      this.hidden = hidden;
      listeners.forEach((listener) => listener());
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

function createHarness({ initiallyHidden = false } = {}) {
  const transport = createControlledTransport();
  const scheduler = createControlledScheduler();
  const visibility = createVisibilitySource(initiallyHidden);
  const focus = createFocusSource();
  const coordinator = createAlertCountCoordinator({
    request: () => transport.request(),
    schedule: (callback, delay) => scheduler.schedule(callback, delay),
    cancelSchedule: (timer) => scheduler.cancel(timer),
    visibilitySource: visibility,
    focusSource: focus,
  });
  return { coordinator, focus, scheduler, transport, visibility };
}

async function settleTurn() {
  await Promise.resolve();
  await Promise.resolve();
}

test("initial subscription starts one canonical request shared by every subscriber", async () => {
  const { coordinator, scheduler, transport, visibility } = createHarness();
  coordinator.setIdentity("id:homeowner-1");
  const firstPublications = [];
  const secondPublications = [];
  const unsubscribeFirst = coordinator.subscribe((snapshot) => {
    firstPublications.push(snapshot);
  });
  const unsubscribeSecond = coordinator.subscribe((snapshot) => {
    secondPublications.push(snapshot);
  });

  assert.equal(transport.calls.length, 1);
  assert.equal(visibility.listenerCount, 1);
  assert.equal(coordinator.getMetrics().subscriberCount, 2);
  transport.calls[0].resolve(countResponse(4));
  await coordinator.waitForIdle();

  assert.equal(coordinator.getSnapshot().response.counts.unread, 4);
  assert.equal(transport.maximum, 1);
  assert.equal(scheduler.size, 1);
  assert.equal(scheduler.delays[0], ALERT_COUNT_POLL_INTERVAL_MS);
  assert.ok(firstPublications.length >= 2);
  assert.ok(secondPublications.length >= 2);

  unsubscribeFirst();
  assert.equal(coordinator.getMetrics().subscriberCount, 1);
  assert.equal(scheduler.size, 1);
  assert.equal(visibility.listenerCount, 1);
  unsubscribeSecond();
  assert.equal(scheduler.size, 0);
  assert.equal(visibility.listenerCount, 0);
});

test("identity change clears prior truth synchronously and rejects the stale response", async () => {
  const { coordinator, transport } = createHarness();
  const publications = [];
  coordinator.setIdentity("id:user-a");
  const unsubscribe = coordinator.subscribe((snapshot) => publications.push(snapshot));
  assert.equal(transport.calls.length, 1);

  coordinator.setIdentity("id:user-b");
  assert.equal(coordinator.getSnapshot().identity, "id:user-b");
  assert.equal(coordinator.getSnapshot().response, null);
  assert.equal(coordinator.getSnapshot().phase, ALERT_COUNT_PHASE.LOADING);
  assert.equal(transport.calls.length, 1);

  transport.calls[0].resolve(countResponse(88));
  await settleTurn();
  assert.equal(transport.calls.length, 2);
  assert.equal(
    publications.some((snapshot) => (
      snapshot.identity === "id:user-b" && snapshot.response?.counts?.unread === 88
    )),
    false
  );

  transport.calls[1].resolve(countResponse(3));
  await coordinator.waitForIdle();
  assert.equal(coordinator.getSnapshot().identity, "id:user-b");
  assert.equal(coordinator.getSnapshot().response.counts.unread, 3);
  assert.equal(transport.maximum, 1);
  unsubscribe();
});

test("logout clears the confirmed badge immediately without persisting identity", async () => {
  const { coordinator, scheduler, transport } = createHarness();
  coordinator.setIdentity("id:user-a");
  const unsubscribe = coordinator.subscribe(() => {});
  transport.calls[0].resolve(countResponse(7));
  await coordinator.waitForIdle();
  assert.equal(scheduler.size, 1);

  coordinator.setIdentity("");
  assert.deepEqual(coordinator.getSnapshot(), {
    identity: "",
    phase: ALERT_COUNT_PHASE.IDLE,
    response: null,
    errorKind: "",
  });
  assert.equal(scheduler.size, 0);
  unsubscribe();
});

test("refresh invalidations coalesce after success with one request active", async () => {
  const { coordinator, transport } = createHarness();
  coordinator.setIdentity("id:user-a");
  const unsubscribe = coordinator.subscribe(() => {});
  transport.calls[0].resolve(countResponse(6));
  await coordinator.waitForIdle();

  const first = coordinator.refresh();
  const second = coordinator.refresh();
  const third = coordinator.refresh();
  assert.equal(transport.calls.length, 2);
  transport.calls[1].resolve(countResponse(5));
  await settleTurn();
  assert.equal(transport.calls.length, 3);
  transport.calls[2].resolve(countResponse(4));
  await Promise.all([first, second, third]);

  assert.equal(transport.calls.length, 3);
  assert.equal(transport.maximum, 1);
  assert.equal(coordinator.getSnapshot().response.counts.unread, 4);
  unsubscribe();
});

test("refresh invalidations coalesce after failure and release ownership", async () => {
  const { coordinator, transport } = createHarness();
  coordinator.setIdentity("id:user-a");
  const unsubscribe = coordinator.subscribe(() => {});
  transport.calls[0].resolve(countResponse(6));
  await coordinator.waitForIdle();

  const first = coordinator.refresh();
  const second = coordinator.refresh();
  const third = coordinator.refresh();
  transport.calls[1].reject({ kind: "network" });
  await settleTurn();
  assert.equal(transport.calls.length, 3);
  assert.equal(coordinator.getSnapshot().response.counts.unread, 6);
  transport.calls[2].resolve(countResponse(2));
  await Promise.all([first, second, third]);

  assert.equal(coordinator.getSnapshot().phase, ALERT_COUNT_PHASE.READY);
  assert.equal(coordinator.getSnapshot().response.counts.unread, 2);
  assert.equal(transport.maximum, 1);
  unsubscribe();
});

test("initial failure has no confirmed count and later polling recovers", async () => {
  const { coordinator, scheduler, transport } = createHarness();
  coordinator.setIdentity("id:user-a");
  const unsubscribe = coordinator.subscribe(() => {});
  transport.calls[0].reject({ kind: "network" });
  await coordinator.waitForIdle();

  assert.equal(coordinator.getSnapshot().phase, ALERT_COUNT_PHASE.INITIAL_ERROR);
  assert.equal(coordinator.getSnapshot().response, null);
  assert.equal(coordinator.getSnapshot().errorKind, "network");
  assert.equal(scheduler.size, 1);
  scheduler.runNext();
  assert.equal(transport.calls.length, 2);
  transport.calls[1].resolve(countResponse(5));
  await coordinator.waitForIdle();
  assert.equal(coordinator.getSnapshot().response.counts.unread, 5);
  unsubscribe();
});

test("transient refresh failure preserves last confirmed count", async () => {
  const { coordinator, transport } = createHarness();
  coordinator.setIdentity("id:user-a");
  const unsubscribe = coordinator.subscribe(() => {});
  transport.calls[0].resolve(countResponse(9));
  await coordinator.waitForIdle();

  const refresh = coordinator.refresh();
  assert.equal(coordinator.getSnapshot().phase, ALERT_COUNT_PHASE.REFRESHING);
  assert.equal(coordinator.getSnapshot().response.counts.unread, 9);
  transport.calls[1].reject({ kind: "server" });
  await refresh;

  assert.equal(coordinator.getSnapshot().phase, ALERT_COUNT_PHASE.REFRESH_ERROR);
  assert.equal(coordinator.getSnapshot().response.counts.unread, 9);
  assert.equal(coordinator.getSnapshot().errorKind, "server");
  unsubscribe();
});

test("confirmed zero replaces nonzero canonical truth", async () => {
  const { coordinator, transport } = createHarness();
  coordinator.setIdentity("id:user-a");
  const unsubscribe = coordinator.subscribe(() => {});
  transport.calls[0].resolve(countResponse(11));
  await coordinator.waitForIdle();
  const refresh = coordinator.refresh();
  transport.calls[1].resolve(countResponse(0));
  await refresh;

  assert.equal(coordinator.getSnapshot().phase, ALERT_COUNT_PHASE.READY);
  assert.equal(coordinator.getSnapshot().response.counts.unread, 0);
  unsubscribe();
});

test("hidden documents stop polling and visibility resume performs one refresh", async () => {
  const { coordinator, scheduler, transport, visibility } = createHarness();
  coordinator.setIdentity("id:user-a");
  const unsubscribe = coordinator.subscribe(() => {});
  transport.calls[0].resolve(countResponse(3));
  await coordinator.waitForIdle();
  assert.equal(scheduler.size, 1);

  visibility.setHidden(true);
  assert.equal(scheduler.size, 0);
  assert.equal(coordinator.getSnapshot().response.counts.unread, 3);
  visibility.setHidden(true);
  assert.equal(transport.calls.length, 1);

  visibility.setHidden(false);
  assert.equal(transport.calls.length, 2);
  visibility.setHidden(false);
  assert.equal(transport.calls.length, 2);
  transport.calls[1].resolve(countResponse(2));
  await coordinator.waitForIdle();
  assert.equal(scheduler.size, 1);
  assert.equal(coordinator.getSnapshot().response.counts.unread, 2);
  unsubscribe();
});

test("window focus refreshes immediately through the same bounded coordinator", async () => {
  const { coordinator, focus, transport } = createHarness();
  coordinator.setIdentity("id:user-a");
  const unsubscribe = coordinator.subscribe(() => {});
  transport.calls[0].resolve(countResponse(1));
  await coordinator.waitForIdle();
  assert.equal(focus.listenerCount, 1);

  focus.focus();
  assert.equal(transport.calls.length, 2);
  transport.calls[1].resolve(countResponse(2));
  await coordinator.waitForIdle();
  assert.equal(coordinator.getSnapshot().response.counts.unread, 2);

  unsubscribe();
  assert.equal(focus.listenerCount, 0);
});

test("polling is bounded, single-flight, and fully cleaned after final unsubscribe", async () => {
  const { coordinator, scheduler, transport, visibility } = createHarness();
  coordinator.setIdentity("id:user-a");
  const unsubscribe = coordinator.subscribe(() => {});
  transport.calls[0].resolve(countResponse(1));
  await coordinator.waitForIdle();

  assert.equal(scheduler.runNext(), true);
  assert.equal(transport.calls.length, 2);
  assert.equal(scheduler.size, 0);
  const queued = coordinator.refresh();
  assert.equal(transport.calls.length, 2);
  transport.calls[1].resolve(countResponse(2));
  await settleTurn();
  assert.equal(transport.calls.length, 3);
  transport.calls[2].resolve(countResponse(3));
  await queued;
  assert.equal(transport.maximum, 1);
  assert.equal(scheduler.size, 1);

  unsubscribe();
  unsubscribe();
  assert.equal(scheduler.size, 0);
  assert.equal(visibility.listenerCount, 0);
  assert.equal(coordinator.getMetrics().subscriberCount, 0);
});

test("reset is idempotent and cancels scheduling without fabricated truth", async () => {
  const { coordinator, scheduler, transport } = createHarness();
  coordinator.setIdentity("id:user-a");
  const publications = [];
  const unsubscribe = coordinator.subscribe((snapshot) => publications.push(snapshot));
  transport.calls[0].resolve(countResponse(5));
  await coordinator.waitForIdle();
  const beforeReset = publications.length;

  coordinator.reset();
  const afterFirstReset = publications.length;
  coordinator.reset();
  assert.equal(afterFirstReset, beforeReset + 1);
  assert.equal(publications.length, afterFirstReset);
  assert.equal(coordinator.getSnapshot().response, null);
  assert.equal(coordinator.getSnapshot().identity, "");
  assert.equal(scheduler.size, 0);
  unsubscribe();
});

test("malformed counts fail closed and category totals are never substituted", async () => {
  const { coordinator, transport } = createHarness();
  coordinator.setIdentity("id:user-a");
  const unsubscribe = coordinator.subscribe(() => {});
  transport.calls[0].resolve({
    success: true,
    code: "ALERT_COUNTS_RETRIEVED",
    counts: {
      active: 8,
      byCategory: {
        communication: { active: 8, unread: 8 },
      },
    },
    alerts: Array.from({ length: 8 }, (_, index) => ({ id: index + 1 })),
  });
  await coordinator.waitForIdle();
  assert.equal(coordinator.getSnapshot().phase, ALERT_COUNT_PHASE.INITIAL_ERROR);
  assert.equal(coordinator.getSnapshot().response, null);

  const retry = coordinator.refresh();
  transport.calls[1].resolve(countResponse(1, {
    active: 40,
    byCategory: {
      communication: { active: 20, unread: 20 },
      emergency: { active: 20, unread: 20 },
    },
  }));
  await retry;
  assert.equal(coordinator.getSnapshot().response.counts.unread, 1);
  unsubscribe();
});
