import assert from "node:assert/strict";
import test from "node:test";

import {
  PROFESSIONAL_OPPORTUNITY_PHASE,
  createProfessionalOpportunityCoordinator,
} from "../src/utils/professionalOpportunityCoordinator.js";

const opportunity = (id, title = `Request ${id}`) => ({
  id,
  request_id: id,
  title,
  description: "Authoritative request",
  status: "open",
});

const success = (...records) => ({
  response: { ok: true, status: 200 },
  data: { opportunities: records },
});

const failure = (status = 503) => ({
  response: { ok: false, status },
  data: { code: "OPPORTUNITIES_TEMPORARILY_UNAVAILABLE" },
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function coordinator(options = {}) {
  let identity = options.identity || "id:professional-1";
  let timestamp = options.timestamp || 1_000;
  const instance = createProfessionalOpportunityCoordinator({
    request: options.request,
    getIdentity: () => identity,
    now: () => timestamp,
    freshnessMs: options.freshnessMs ?? 5_000,
    retryDelaysMs: options.retryDelaysMs ?? [],
    schedule: options.schedule,
    cancelSchedule: options.cancelSchedule,
  });
  return {
    instance,
    setIdentity(value) {
      identity = value;
    },
    advance(ms) {
      timestamp += ms;
    },
  };
}

test("concurrent consumers reuse one in-flight professional opportunity request", async () => {
  const pending = deferred();
  let calls = 0;
  const { instance } = coordinator({
    request: () => {
      calls += 1;
      return pending.promise;
    },
  });
  const unsubscribe = instance.subscribe(() => {});

  const first = instance.request({ caller: "MessagesInbox" });
  const second = instance.request({ caller: "BusinessDashboard" });

  assert.equal(first, second);
  assert.equal(calls, 1);
  pending.resolve(success(opportunity(1)));
  await Promise.all([first, second]);
  assert.equal(instance.getMetrics().maximumConcurrentRequests, 1);
  unsubscribe();
});

test("a second consumer within the freshness window reuses cached data", async () => {
  let calls = 0;
  const { instance } = coordinator({
    request: async () => {
      calls += 1;
      return success(opportunity(2));
    },
  });
  const unsubscribe = instance.subscribe(() => {});

  await instance.request({ caller: "MessagesInbox" });
  const cached = await instance.request({ caller: "BusinessLeads" });

  assert.equal(calls, 1);
  assert.equal(cached.records[0].request_id, 2);
  unsubscribe();
});

test("stale-while-revalidate preserves confirmed records during refresh", async () => {
  const refresh = deferred();
  let calls = 0;
  const { instance, advance } = coordinator({
    request: async () => {
      calls += 1;
      return calls === 1 ? success(opportunity(3)) : refresh.promise;
    },
  });
  const unsubscribe = instance.subscribe(() => {});

  await instance.request();
  advance(5_001);
  const refreshing = instance.request({ trigger: "focus" });

  assert.equal(instance.getSnapshot().phase, PROFESSIONAL_OPPORTUNITY_PHASE.REFRESHING);
  assert.equal(instance.getSnapshot().records[0].request_id, 3);
  refresh.resolve(success(opportunity(4)));
  await refreshing;
  assert.equal(instance.getSnapshot().records[0].request_id, 4);
  unsubscribe();
});

test("transient refresh failure preserves the last-good collection", async () => {
  let calls = 0;
  const { instance, advance } = coordinator({
    request: async () => {
      calls += 1;
      return calls === 1 ? success(opportunity(5)) : failure();
    },
  });
  const unsubscribe = instance.subscribe(() => {});

  await instance.request();
  advance(5_001);
  await instance.request({ trigger: "focus" });

  assert.equal(instance.getSnapshot().phase, PROFESSIONAL_OPPORTUNITY_PHASE.REFRESH_ERROR);
  assert.equal(instance.getSnapshot().records[0].request_id, 5);
  unsubscribe();
});

test("initial failure emits a truthful unavailable state", async () => {
  const { instance } = coordinator({ request: async () => failure() });
  const unsubscribe = instance.subscribe(() => {});

  await instance.request();

  assert.equal(instance.getSnapshot().phase, PROFESSIONAL_OPPORTUNITY_PHASE.INITIAL_ERROR);
  assert.deepEqual(instance.getSnapshot().records, []);
  unsubscribe();
});

test("automatic retry attempts are strictly bounded", async () => {
  let calls = 0;
  const { instance } = coordinator({
    request: async () => {
      calls += 1;
      return failure();
    },
    retryDelaysMs: [10, 20],
    schedule: (callback) => {
      queueMicrotask(callback);
      return calls;
    },
    cancelSchedule: () => {},
  });
  const unsubscribe = instance.subscribe(() => {});

  await instance.request();

  assert.equal(calls, 3);
  assert.equal(instance.getMetrics().maximumConcurrentRequests, 1);
  unsubscribe();
});

test("a stale response cannot overwrite a newer authenticated identity", async () => {
  const first = deferred();
  const second = deferred();
  let calls = 0;
  const { instance, setIdentity } = coordinator({
    request: () => {
      calls += 1;
      return calls === 1 ? first.promise : second.promise;
    },
  });
  const unsubscribe = instance.subscribe(() => {});

  const oldRequest = instance.request();
  setIdentity("id:professional-2");
  const newRequest = instance.request();
  second.resolve(success(opportunity(8, "New identity")));
  await newRequest;
  first.resolve(success(opportunity(7, "Old identity")));
  await oldRequest;

  assert.equal(instance.getSnapshot().identity, "id:professional-2");
  assert.equal(instance.getSnapshot().records[0].request_id, 8);
  unsubscribe();
});

test("identity removal clears cached opportunity data", async () => {
  const { instance, setIdentity } = coordinator({
    request: async () => success(opportunity(9)),
  });
  const unsubscribe = instance.subscribe(() => {});
  await instance.request();

  setIdentity("");

  assert.deepEqual(instance.getSnapshot().records, []);
  assert.equal(instance.getSnapshot().identity, "");
  unsubscribe();
});

test("multiple subscribers share state and unsubscribe cleanly", async () => {
  const { instance } = coordinator({
    request: async () => success(opportunity(10)),
  });
  const firstStates = [];
  const secondStates = [];
  const unsubscribeFirst = instance.subscribe((state) => firstStates.push(state.phase));
  const unsubscribeSecond = instance.subscribe((state) => secondStates.push(state.phase));

  await instance.request();
  unsubscribeFirst();
  unsubscribeSecond();

  assert.ok(firstStates.includes(PROFESSIONAL_OPPORTUNITY_PHASE.READY));
  assert.ok(secondStates.includes(PROFESSIONAL_OPPORTUNITY_PHASE.READY));
  assert.equal(instance.getMetrics().subscriberCount, 0);
});

test("unmounting the final subscriber cancels pending automatic retries", async () => {
  const retry = deferred();
  let calls = 0;
  let cancelCalls = 0;
  const { instance } = coordinator({
    request: async () => {
      calls += 1;
      return failure();
    },
    retryDelaysMs: [500, 1_000],
    schedule: (callback) => {
      retry.promise.then(callback);
      return "retry-timer";
    },
    cancelSchedule: () => {
      cancelCalls += 1;
    },
  });
  const unsubscribe = instance.subscribe(() => {});
  const request = instance.request();
  await Promise.resolve();
  await Promise.resolve();
  unsubscribe();
  retry.resolve();
  await request;

  assert.equal(calls, 1);
  assert.equal(cancelCalls, 1);
});

test("a later legitimate refresh recovers once after a transient failure", async () => {
  let calls = 0;
  const { instance, advance } = coordinator({
    request: async () => {
      calls += 1;
      if (calls === 2) return failure();
      return success(opportunity(calls === 1 ? 11 : 12));
    },
  });
  const unsubscribe = instance.subscribe(() => {});

  await instance.request();
  advance(5_001);
  await instance.request({ trigger: "focus" });
  await instance.request({ trigger: "manual-retry", force: true });

  assert.equal(instance.getSnapshot().phase, PROFESSIONAL_OPPORTUNITY_PHASE.READY);
  assert.equal(instance.getSnapshot().records[0].request_id, 12);
  assert.equal(calls, 3);
  unsubscribe();
});
