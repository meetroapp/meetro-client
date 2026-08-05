import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CONVERSATION_THREAD_TYPES,
  buildCanonicalConversationReadSnapshot,
  createCanonicalConversationReadCoordinator,
  getCanonicalConversationReadCandidate,
  getCanonicalVisibleMessageBoundary,
  getCanonicalVisibleMessageWatermark,
  isSupportedLegacyConversationThread,
} from "../src/utils/canonicalConversationMessaging.js";

const threadSource = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);
const canonicalLoadBlock = threadSource.slice(
  threadSource.indexOf("const loadMessages = async () =>"),
  threadSource.indexOf(
    "const selectedQuoteRequestId =",
    threadSource.indexOf("const loadMessages = async () =>")
  )
);
const canonicalReadEffect = threadSource.slice(
  threadSource.indexOf("const candidate = getCanonicalConversationReadCandidate"),
  threadSource.indexOf(
    "const registry = getConversationRegistry()",
    threadSource.indexOf("const candidate = getCanonicalConversationReadCandidate")
  )
);
const canonicalReplyBlock = threadSource.slice(
  threadSource.indexOf("const sendCanonicalMessage = async"),
  threadSource.indexOf(
    "const sendMessage =",
    threadSource.indexOf("const sendCanonicalMessage = async")
  )
);

function visibleMessage(backendId) {
  return {
    id: `canonical-message-${backendId}`,
    backendId,
    text: `Message ${backendId}`,
  };
}

const completePagination = Object.freeze({
  limit: 50,
  hasMore: false,
  nextCursor: null,
});

function snapshot({
  conversationId = 91,
  messageConversationId = conversationId,
  routeGeneration = 1,
  hydrationGeneration = 1,
  messages = [visibleMessage(401)],
  pagination = completePagination,
  threadType = CONVERSATION_THREAD_TYPES.CANONICAL,
} = {}) {
  return buildCanonicalConversationReadSnapshot({
    threadType,
    routeConversationId: conversationId,
    messageConversationId,
    routeGeneration,
    hydrationGeneration,
    messages,
    pagination,
  });
}

function candidate({
  conversationId = 91,
  detailConversationId = conversationId,
  routeGeneration = 1,
  hydrationGeneration = 1,
  messagesPhase = "ready",
  visibleMessages = [visibleMessage(401)],
  readSnapshot = snapshot({
    conversationId,
    routeGeneration,
    hydrationGeneration,
    messages: visibleMessages,
  }),
  threadType = CONVERSATION_THREAD_TYPES.CANONICAL,
} = {}) {
  return getCanonicalConversationReadCandidate({
    threadType,
    routeConversationId: conversationId,
    detailConversationId,
    routeGeneration,
    hydrationGeneration,
    messagesPhase,
    visibleMessages,
    snapshot: readSnapshot,
  });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function coordinatorHarness({ markRead } = {}) {
  let nextFrameId = 0;
  let routeGeneration = 1;
  let hydrationGeneration = 1;
  let conversationId = 91;
  let mounted = true;
  let markReadCalls = 0;
  let refreshCalls = 0;
  const frames = new Map();
  const cancelledFrames = [];
  const transport =
    markRead ||
    (async (readConversationId, lastVisibleMessageId) => ({
      conversationId: readConversationId,
      acknowledgedMessageId: lastVisibleMessageId,
    }));

  const coordinator = createCanonicalConversationReadCoordinator({
    scheduleFrame(callback) {
      nextFrameId += 1;
      frames.set(nextFrameId, callback);
      return nextFrameId;
    },
    cancelFrame(frameId) {
      cancelledFrames.push(frameId);
      frames.delete(frameId);
    },
    async markRead(readConversationId, lastVisibleMessageId) {
      markReadCalls += 1;
      return transport(readConversationId, lastVisibleMessageId);
    },
    async refreshCounts() {
      refreshCalls += 1;
    },
    isCurrent(readCandidate) {
      return (
        mounted &&
        readCandidate.routeGeneration === routeGeneration &&
        readCandidate.hydrationGeneration === hydrationGeneration &&
        readCandidate.conversationId === conversationId
      );
    },
  });
  coordinator.reset(routeGeneration, hydrationGeneration);

  return {
    cancelledFrames,
    coordinator,
    frameCount: () => frames.size,
    markReadCalls: () => markReadCalls,
    refreshCalls: () => refreshCalls,
    async runNextFrame() {
      const next = frames.entries().next().value;
      assert.ok(next, "an animation frame must be pending");
      const [frameId, callback] = next;
      frames.delete(frameId);
      await callback();
    },
    setConversationId(value) {
      conversationId = value;
    },
    setMounted(value) {
      mounted = value;
    },
    setRouteGeneration(value, { reset = false } = {}) {
      routeGeneration = value;
      if (reset) coordinator.reset(value, hydrationGeneration);
    },
    setHydrationGeneration(value, { invalidate = false } = {}) {
      hydrationGeneration = value;
      if (invalidate) {
        coordinator.invalidateHydration(routeGeneration, value);
      }
    },
  };
}

test("canonical read eligibility requires matching canonical route, detail, and ready state", () => {
  assert.deepEqual(candidate(), {
    conversationId: 91,
    routeGeneration: 1,
    hydrationGeneration: 1,
    lastVisibleMessageId: 401,
    watermark: "91:401",
  });

  assert.equal(candidate({ detailConversationId: 92 }), null);
  assert.equal(candidate({ messagesPhase: "loading" }), null);
  assert.equal(candidate({ conversationId: "invalid-91" }), null);
  assert.equal(snapshot({ messageConversationId: 92 }), null);
  assert.equal(
    candidate({ threadType: CONVERSATION_THREAD_TYPES.LEGACY_QUOTE_REQUEST }),
    null
  );
  assert.equal(candidate({ threadType: "unknown" }), null);
});

test("only a complete and valid pagination contract permits read eligibility", () => {
  assert.ok(snapshot({ pagination: completePagination }));
  assert.equal(snapshot({ pagination: { hasMore: true } }), null);
  assert.equal(
    buildCanonicalConversationReadSnapshot({
      threadType: CONVERSATION_THREAD_TYPES.CANONICAL,
      routeConversationId: 91,
      messageConversationId: 91,
      routeGeneration: 1,
      hydrationGeneration: 1,
      messages: [visibleMessage(401)],
    }),
    null
  );
  assert.equal(snapshot({ pagination: null }), null);
  assert.equal(snapshot({ pagination: {} }), null);
  assert.equal(snapshot({ pagination: { hasMore: "false" } }), null);
  assert.equal(snapshot({ pagination: [] }), null);
  assert.equal(
    snapshot({ messages: [], pagination: { hasMore: true } }),
    null,
    "an empty partial page remains incomplete"
  );
  assert.equal(
    snapshot({ messages: [], pagination: { hasMore: false } }),
    null
  );
});

test("watermark is the maximum unique backend ID without mutating message order", () => {
  const unsorted = [visibleMessage(101), visibleMessage(103), visibleMessage(102)];
  const before = structuredClone(unsorted);

  assert.equal(getCanonicalVisibleMessageWatermark(91, unsorted), "91:103");
  assert.deepEqual(getCanonicalVisibleMessageBoundary(91, unsorted), {
    conversationId: 91,
    lastVisibleMessageId: 103,
    watermark: "91:103",
  });
  assert.deepEqual(unsorted, before);
  assert.equal(
    getCanonicalVisibleMessageWatermark(91, [visibleMessage(101), visibleMessage(102)]),
    "91:102"
  );
  assert.equal(getCanonicalVisibleMessageWatermark(91, []), null);
  assert.equal(getCanonicalVisibleMessageBoundary(91, []), null);
});

test("duplicate, invalid, unsafe, and optimistic message IDs fail closed", () => {
  assert.equal(
    getCanonicalVisibleMessageWatermark(91, [visibleMessage(101), visibleMessage(101)]),
    null
  );
  assert.equal(
    getCanonicalVisibleMessageWatermark(91, [visibleMessage(101), { id: "local" }]),
    null
  );
  assert.equal(
    getCanonicalVisibleMessageWatermark(91, [visibleMessage(Number.MAX_SAFE_INTEGER + 1)]),
    null
  );
  assert.equal(
    candidate({
      visibleMessages: [visibleMessage(401), visibleMessage(401)],
      readSnapshot: {
        conversationId: 91,
        routeGeneration: 1,
        hydrationGeneration: 1,
        lastVisibleMessageId: 401,
        watermark: "91:401",
        pagination: { hasMore: false },
      },
    }),
    null
  );
});

test("legacy read eligibility requires matching explicit supported registry provenance", () => {
  const legacyRecord = {
    id: "legacy-91",
    conversation_type: "standard",
  };

  assert.equal(
    isSupportedLegacyConversationThread({
      conversationId: "legacy-91",
      threadType: "standard",
      record: legacyRecord,
    }),
    true
  );
  assert.equal(
    isSupportedLegacyConversationThread({
      conversationId: "hiring-1",
      threadType: "hiring_application",
      record: { id: "hiring-1", conversation_type: "hiring_application" },
    }),
    true
  );

  for (const [threadType, record] of [
    [CONVERSATION_THREAD_TYPES.CANONICAL, legacyRecord],
    [CONVERSATION_THREAD_TYPES.REQUEST_OPPORTUNITY, legacyRecord],
    ["unknown", legacyRecord],
    ["", legacyRecord],
    [undefined, legacyRecord],
    ["arbitrary", { id: "legacy-91", conversation_type: "arbitrary" }],
    ["standard", null],
    ["standard", { id: "different", conversation_type: "standard" }],
  ]) {
    assert.equal(
      isSupportedLegacyConversationThread({
        conversationId: "legacy-91",
        threadType,
        record,
      }),
      false
    );
  }
});

test("coordinator schedules one frame per eligible watermark and deduplicates rerenders", () => {
  const harness = coordinatorHarness();
  const first = candidate();

  assert.equal(harness.coordinator.schedule(first), true);
  assert.equal(harness.coordinator.schedule(first), false);
  assert.equal(harness.frameCount(), 1);
  assert.equal(harness.coordinator.getState().scheduledWatermark, "91:401");
  assert.equal(harness.coordinator.getState().attemptedWatermark, null);
});

test("cleanup cancels only its pending frame and cancelled work sends no request", async () => {
  const harness = coordinatorHarness();
  const first = candidate();
  const newer = candidate({
    visibleMessages: [visibleMessage(401), visibleMessage(402)],
  });

  assert.equal(harness.coordinator.schedule(first), true);
  assert.equal(harness.coordinator.cancelScheduled(newer), false);
  assert.equal(harness.coordinator.cancelScheduled(first), true);
  assert.deepEqual(harness.cancelledFrames, [1]);
  assert.equal(harness.frameCount(), 0);
  assert.equal(harness.markReadCalls(), 0);
  assert.equal(harness.coordinator.getState().scheduledWatermark, null);
});

test("Strict Mode-style setup cleanup setup produces one POST", async () => {
  const harness = coordinatorHarness();
  const first = candidate();

  assert.equal(harness.coordinator.schedule(first), true);
  assert.equal(harness.coordinator.cancelScheduled(first), true);
  assert.equal(harness.coordinator.schedule(first), true);
  assert.equal(harness.frameCount(), 1);
  await harness.runNextFrame();

  assert.equal(harness.markReadCalls(), 1);
  assert.equal(harness.refreshCalls(), 1);
});

test("frame execution performs one read request and success refreshes counts once", async () => {
  const harness = coordinatorHarness();
  const first = candidate();

  assert.equal(harness.coordinator.schedule(first), true);
  await harness.runNextFrame();

  assert.equal(harness.markReadCalls(), 1);
  assert.equal(harness.refreshCalls(), 1);
  assert.equal(harness.coordinator.getState().confirmedWatermark, "91:401");
  assert.equal(harness.coordinator.schedule(first), false);
});

test("transport failure and malformed success never refresh or retry the same watermark", async () => {
  for (const markRead of [
    async () => {
      throw new Error("offline");
    },
    async () => ({ conversationId: "wrong", acknowledgedMessageId: 401 }),
    async () => ({ conversationId: 91, acknowledgedMessageId: 402 }),
    async () => null,
  ]) {
    const harness = coordinatorHarness({ markRead });
    const first = candidate();

    assert.equal(harness.coordinator.schedule(first), true);
    await harness.runNextFrame();
    assert.equal(harness.markReadCalls(), 1);
    assert.equal(harness.refreshCalls(), 0);
    assert.equal(harness.coordinator.getState().confirmedWatermark, null);
    assert.equal(harness.coordinator.schedule(first), false);
  }
});

test("a new coordinator instance may retry a failed watermark", async () => {
  const failing = coordinatorHarness({
    markRead: async () => {
      throw new Error("offline");
    },
  });
  const first = candidate();
  failing.coordinator.schedule(first);
  await failing.runNextFrame();

  const remounted = coordinatorHarness();
  assert.equal(remounted.coordinator.schedule(first), true);
  await remounted.runNextFrame();
  assert.equal(remounted.markReadCalls(), 1);
  assert.equal(remounted.refreshCalls(), 1);
});

test("a newer watermark schedules after settlement while no requests overlap", async () => {
  const pending = deferred();
  const harness = coordinatorHarness({ markRead: () => pending.promise });
  const first = candidate();
  const newer = candidate({
    visibleMessages: [visibleMessage(401), visibleMessage(402)],
  });

  harness.coordinator.schedule(first);
  const firstRequest = harness.runNextFrame();
  await Promise.resolve();
  assert.equal(harness.markReadCalls(), 1);
  assert.equal(harness.coordinator.schedule(newer), false);

  pending.resolve({ conversationId: 91, acknowledgedMessageId: 401 });
  await firstRequest;
  assert.equal(harness.coordinator.schedule(newer), true);
  await harness.runNextFrame();
  assert.equal(harness.markReadCalls(), 2);
});

test("hydration invalidation cancels eligibility while preserving dedupe state", async () => {
  const harness = coordinatorHarness();
  const first = candidate();
  const nextHydration = candidate({ hydrationGeneration: 2 });

  assert.equal(harness.coordinator.schedule(first), true);
  harness.setHydrationGeneration(2, { invalidate: true });
  assert.equal(harness.frameCount(), 0);
  assert.deepEqual(harness.cancelledFrames, [1]);
  assert.equal(harness.coordinator.schedule(first), false);
  assert.equal(harness.coordinator.schedule(nextHydration), true);
  await harness.runNextFrame();

  assert.equal(harness.markReadCalls(), 1);
  assert.equal(harness.refreshCalls(), 1);
});

test("stale hydration success clears in-flight work without confirming or refreshing", async () => {
  const pending = deferred();
  const harness = coordinatorHarness({ markRead: () => pending.promise });
  const first = candidate();
  const nextHydration = candidate({ hydrationGeneration: 2 });

  harness.coordinator.schedule(first);
  const oldRequest = harness.runNextFrame();
  await Promise.resolve();
  harness.setHydrationGeneration(2, { invalidate: true });
  assert.equal(harness.coordinator.schedule(nextHydration), false);
  pending.resolve({ conversationId: 91, acknowledgedMessageId: 401 });
  await oldRequest;

  assert.equal(harness.refreshCalls(), 0);
  assert.equal(harness.coordinator.getState().inFlightWatermark, null);
  assert.equal(harness.coordinator.getState().confirmedWatermark, null);
  assert.equal(harness.coordinator.schedule(nextHydration), false);
});

test("route changes before a pending frame prevent the transport call", async () => {
  const harness = coordinatorHarness();
  harness.coordinator.schedule(candidate());
  harness.setRouteGeneration(2);
  harness.setConversationId(92);
  await harness.runNextFrame();

  assert.equal(harness.markReadCalls(), 0);
  assert.equal(harness.refreshCalls(), 0);
});

test("route invalidation during an in-flight request prevents stale confirmation and refresh", async () => {
  const pending = deferred();
  const harness = coordinatorHarness({ markRead: () => pending.promise });
  harness.coordinator.schedule(candidate());
  const oldRequest = harness.runNextFrame();
  await Promise.resolve();

  harness.setConversationId(92);
  harness.setRouteGeneration(2, { reset: true });
  pending.resolve({ conversationId: 91 });
  await oldRequest;

  assert.equal(harness.refreshCalls(), 0);
  assert.deepEqual(harness.coordinator.getState(), {
    routeGeneration: 2,
    hydrationGeneration: 1,
    attemptedWatermark: null,
    inFlightWatermark: null,
    inFlightHydrationGeneration: null,
    confirmedWatermark: null,
    scheduledWatermark: null,
  });
});

test("partial pagination and duplicate IDs never reach coordinator scheduling", () => {
  const harness = coordinatorHarness();
  const partialSnapshot = snapshot({ pagination: { hasMore: true } });
  const duplicateMessages = [visibleMessage(401), visibleMessage(401)];

  assert.equal(
    harness.coordinator.schedule(
      candidate({ readSnapshot: partialSnapshot })
    ),
    false
  );
  assert.equal(
    harness.coordinator.schedule(
      candidate({
        visibleMessages: duplicateMessages,
        readSnapshot: snapshot({ messages: duplicateMessages }),
      })
    ),
    false
  );
  assert.equal(harness.frameCount(), 0);
});

test("ConversationThread wires complete pagination and the narrow frame coordinator", () => {
  assert.match(
    canonicalLoadBlock,
    /pagination: messageResult\.data\.pagination/
  );
  assert.match(canonicalLoadBlock, /const hydrationGeneration =/);
  assert.match(
    canonicalLoadBlock,
    /canonicalReadCoordinatorRef\.current\?\.invalidateHydration\([\s\S]*hydrationGeneration[\s\S]*\)/
  );
  assert.match(
    canonicalLoadBlock,
    /hydrationGeneration !==[\s\S]*canonicalReadHydrationGenerationRef\.current[\s\S]*return;/
  );
  assert.match(canonicalLoadBlock, /setCanonicalReadSnapshot\(null\)/);
  assert.match(
    canonicalLoadBlock,
    /hydrationGeneration,[\s\S]*messages: visibleCanonicalMessages/
  );
  assert.match(
    canonicalLoadBlock,
    /setMessages\(visibleCanonicalMessages\);[\s\S]*setCanonicalReadSnapshot\(readSnapshot\);[\s\S]*setCanonicalMessagesPhase\("ready"\)/
  );
  assert.match(
    canonicalReadEffect,
    /canonicalReadCoordinatorRef\.current\?\.schedule\(candidate\)/
  );
  assert.match(
    canonicalReadEffect,
    /canonicalReadCoordinatorRef\.current\?\.cancelScheduled\(candidate\)/
  );
  assert.match(
    threadSource,
    /const hydrationGeneration = canonicalReadHydrationGenerationRef\.current;[\s\S]*const candidate = getCanonicalConversationReadCandidate/
  );
  assert.match(canonicalReadEffect, /hydrationGeneration,/);
  assert.doesNotMatch(canonicalReadEffect, /requestAnimationFrame|setInterval|setTimeout/);
});

test("ConversationThread production wiring binds exact transport and predicates", () => {
  assert.match(
    threadSource,
    /scheduleFrame: \(callback\) => window\.requestAnimationFrame\(callback\)/
  );
  assert.match(
    threadSource,
    /cancelFrame: \(frameId\) => window\.cancelAnimationFrame\(frameId\)/
  );
  assert.match(
    threadSource,
    /markRead: \(conversationId, lastVisibleMessageId\) =>[\s\S]{0,120}markCanonicalConversationRead\(conversationId, lastVisibleMessageId\)/
  );
  assert.match(threadSource, /refreshCounts: \(\) => refreshAlertCounts\(\)/);
  assert.match(
    threadSource,
    /canonicalReadRouteGenerationRef\.current ===[\s\S]{0,80}candidate\.routeGeneration/
  );
  assert.match(
    threadSource,
    /canonicalReadHydrationGenerationRef\.current ===[\s\S]{0,80}candidate\.hydrationGeneration/
  );
  assert.doesNotMatch(threadSource, /markCanonicalConversationRead\(conversationId\)/);
});

test("component legacy containment requires the explicit provenance predicate", () => {
  const localReadCalls = [
    ...threadSource.matchAll(/markConversationRead\(([^;]+)\);/g),
  ];

  assert.doesNotMatch(canonicalLoadBlock, /markConversationRead\(/);
  assert.equal(localReadCalls.length, 4);
  for (const call of localReadCalls) {
    assert.doesNotMatch(call[1], /\{\}/);
  }
  assert.match(
    threadSource,
    /function resolveSupportedLegacyConversationRecord\([\s\S]*isSupportedLegacyConversationThread\(\{[\s\S]*threadType,[\s\S]*record: selectedItem/
  );
  assert.match(
    threadSource,
    /const selectedItem = resolveSupportedLegacyConversationRecord\(\{[\s\S]*threadType: rawStoredConversationType,[\s\S]*markConversationRead\(conversationId, selectedItem, currentViewerRole\)/
  );
  assert.doesNotMatch(
    threadSource,
    /if \(isCanonicalThread\) return;[\s\S]{0,300}markConversationRead\(conversationId, selectedItem \|\| \{\}/
  );
  assert.match(
    threadSource,
    /const supportedLegacyRecord =[\s\S]{0,120}resolveSupportedLegacyConversationRecord\(\{[\s\S]{0,220}if \(supportedLegacyRecord\) \{[\s\S]{0,180}markConversationRead\(/
  );
});

test("canonical reply remains separate from read acknowledgment and Alert resolution", () => {
  assert.doesNotMatch(
    canonicalReplyBlock,
    /markCanonicalConversationRead|refreshAlertCounts|markAlert|dismissAlert/
  );
  assert.match(
    canonicalReplyBlock,
    /`\/conversations\/\$\{canonicalConversationId\}\/messages`/
  );
  assert.match(canonicalReplyBlock, /CONVERSATION_MESSAGE_CREATED/);
});

test("routing and embedded or standalone ConversationThread contracts remain untouched", () => {
  assert.match(
    threadSource,
    /parseCanonicalConversationRoute\([\s\S]*window\.location\.hash/
  );
  assert.match(
    threadSource,
    /canonicalConversationId: canonicalConversationIdOverride/
  );
  assert.match(threadSource, /canonicalRouteContext\.returnPage/);
  assert.doesNotMatch(canonicalReadEffect, /returnPage|communicationCenter|setPage/);
});
