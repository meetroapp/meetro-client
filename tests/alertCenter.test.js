import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createAlertCenterController,
  isCurrentAlertMutationCompletion,
} from "../src/utils/alertCenterController.js";
import {
  normalizeAlertListResponse,
} from "../src/utils/canonicalAlert.js";
import {
  ALERT_CENTER_PAGE_SIZE,
  ALERT_CENTER_VIEWS,
  DEFAULT_ALERT_CENTER_VIEW,
  buildAlertCenterQuery,
  canAttemptCanonicalAlertDismiss,
  canMarkCanonicalAlertRead,
  getAlertErrorKey,
  getAlertPresentation,
  getAlertPreview,
  getAlertUnreadCount,
  isSupportedAlertDestination,
  resolveAlertCopy,
} from "../src/utils/alertPresentation.js";

const notificationsSource = readFileSync(
  new URL("../src/pages/Notifications.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8"
);
const languageSource = readFileSync(
  new URL("../src/utils/language.js", import.meta.url),
  "utf8"
);

const NOW = "2026-08-04T12:00:00.000Z";

function alertFixture(overrides = {}) {
  return {
    id: "101",
    category: "communication",
    priority: "normal",
    titleKey: "alerts.communication.newMessage.title",
    messageKey: "alerts.communication.newMessage.message",
    payload: { shortPreview: "The confirmed message preview", unreadCount: 2 },
    destination: { type: "conversation", conversationId: 91 },
    state: {
      lifecycle: "active",
      isRead: false,
      isDismissed: false,
      isResolved: false,
      isExpired: false,
      isArchived: false,
    },
    availableAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    readAt: null,
    dismissedAt: null,
    resolvedAt: null,
    expiresAt: null,
    archivedAt: null,
    ...overrides,
  };
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

function alertPage(alerts, { hasMore = false, nextCursor = null } = {}) {
  return {
    alerts,
    pagination: { limit: 25, hasMore, nextCursor },
  };
}

function createControlledTransport() {
  const calls = [];
  let activeCalls = 0;
  let maximumConcurrency = 0;

  function fetchPage(query) {
    const operation = deferred();
    activeCalls += 1;
    maximumConcurrency = Math.max(maximumConcurrency, activeCalls);
    const promise = operation.promise.then(
      (value) => {
        activeCalls -= 1;
        return value;
      },
      (error) => {
        activeCalls -= 1;
        throw error;
      }
    );
    calls.push({ ...operation, promise, query });
    return promise;
  }

  return {
    calls,
    fetchPage,
    get maximumConcurrency() {
      return maximumConcurrency;
    },
  };
}

async function settleTurn() {
  await Promise.resolve();
  await Promise.resolve();
}

function captureControllerState(state) {
  return {
    initialErrorKey: state.initialErrorKey,
    loadMoreErrorKey: state.loadMoreErrorKey,
    loadingMore: state.loadingMore,
    phase: state.phase,
    refreshErrorKey: state.refreshErrorKey,
    snapshot: state.snapshot
      ? {
        alerts: state.snapshot.alerts.map(({ id }) => id),
        pagination: { ...state.snapshot.pagination },
        viewId: state.snapshot.viewId,
      }
      : null,
    viewId: state.viewId,
  };
}

test("the existing notifications route resolves to the governed Notifications page", () => {
  assert.match(appSource, /lazy\(\(\) => import\("\.\/pages\/Notifications"\)\)/);
  assert.match(appSource, /page === "notifications"/);
  assert.match(appSource, /<Notifications setPage=\{setPage\}/);
});

test("canonical views use exact independent server filters and attention is default", () => {
  assert.equal(DEFAULT_ALERT_CENTER_VIEW, "attention");
  assert.equal(ALERT_CENTER_PAGE_SIZE, 25);
  assert.deepEqual(ALERT_CENTER_VIEWS.map(({ id, query }) => ({ id, query })), [
    { id: "attention", query: { lifecycle: "active", unread: true } },
    { id: "read", query: { lifecycle: "active", unread: false } },
    { id: "resolved", query: { lifecycle: "resolved" } },
    { id: "dismissed", query: { lifecycle: "dismissed" } },
  ]);
  assert.deepEqual(buildAlertCenterQuery("attention"), {
    limit: 25,
    lifecycle: "active",
    unread: true,
  });
  assert.deepEqual(buildAlertCenterQuery("read"), {
    limit: 25,
    lifecycle: "active",
    unread: false,
  });
  assert.deepEqual(buildAlertCenterQuery("resolved"), {
    limit: 25,
    lifecycle: "resolved",
  });
  assert.deepEqual(buildAlertCenterQuery("dismissed"), {
    limit: 25,
    lifecycle: "dismissed",
  });
});

test("pagination preserves the exact opaque cursor without decoding or recreation", () => {
  const cursor = "opaque+/cursor==_do-not-decode";
  assert.deepEqual(buildAlertCenterQuery("attention", cursor), {
    limit: 25,
    lifecycle: "active",
    unread: true,
    cursor,
  });
});

test("alert presentation localizes known keys and never exposes unknown keys", () => {
  const presentation = getAlertPresentation(alertFixture(), "en");
  assert.equal(presentation.title, "New message");
  assert.equal(presentation.message, "You have a new conversation message.");
  assert.equal(presentation.category, "Communication");
  assert.equal(presentation.priority, "Normal priority");
  assert.equal(presentation.lifecycle, "Active");
  assert.equal(presentation.readState, "Unread");
  assert.equal(presentation.preview, "The confirmed message preview");
  assert.equal(presentation.unreadCount, 2);
  assert.equal(presentation.unreadCountText, "2 unread messages");
  assert.ok(presentation.timestamp);

  const unknown = getAlertPresentation(alertFixture({
    titleKey: "alerts.future.unknown.title",
    messageKey: "alerts.future.unknown.message",
  }), "en");
  assert.equal(unknown.title, "Update available");
  assert.equal(unknown.message, "Open this alert for more information.");
  assert.doesNotMatch(JSON.stringify(unknown), /alerts\.future\.unknown/);
  assert.equal(resolveAlertCopy("missing.key", "alertCenterFallbackTitle", "es"), "Actualización disponible");
});

test("safe communication fields remain optional, bounded, and plain text", () => {
  assert.equal(getAlertPreview({ shortPreview: "<strong>Plain text only</strong>" }), "<strong>Plain text only</strong>");
  assert.equal(getAlertPreview({ shortPreview: "x".repeat(161) }), null);
  assert.equal(getAlertPreview({ shortPreview: "unsafe\u0007preview" }), null);
  assert.equal(getAlertPreview({ preview: "legacy" }), null);
  assert.equal(getAlertUnreadCount({ unreadCount: 0 }), 0);
  assert.equal(getAlertUnreadCount({ unreadCount: 4 }), 4);
  assert.equal(getAlertUnreadCount({ unreadCount: -1 }), null);
  assert.equal(getAlertUnreadCount({ unreadCount: "4" }), null);
});

test("destination presentation validates canonical identity and production normalization fails closed", () => {
  assert.equal(isSupportedAlertDestination({ type: "conversation", conversationId: 91 }), true);
  assert.equal(isSupportedAlertDestination({ type: "notifications" }), true);
  assert.equal(isSupportedAlertDestination({ type: "conversation" }), false);
  assert.equal(isSupportedAlertDestination({ type: "unknown", id: 1 }), false);

  const response = normalizeAlertListResponse({
    success: true,
    code: "ALERTS_RETRIEVED",
    alerts: [
      alertFixture({ id: "100" }),
      alertFixture({ id: "101", destination: { type: "conversation" } }),
      alertFixture({ id: "102" }),
    ],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  });
  assert.ok(response);
  assert.deepEqual(response.alerts.map(({ id }) => id), ["100", "101", "102"]);
  assert.equal(response.alerts[1].destination, null);
  assert.equal(
    getAlertPresentation(response.alerts[1], "en").destinationKey,
    "alertCenterDestinationUnavailable"
  );
});

test("unread-count copy uses singular and plural grammar in all supported languages", () => {
  const expected = {
    en: ["1 unread message", "2 unread messages"],
    es: ["1 mensaje no leído", "2 mensajes no leídos"],
    fr: ["1 message non lu", "2 messages non lus"],
    "pt-BR": ["1 mensagem não lida", "2 mensagens não lidas"],
  };

  for (const [language, [singular, plural]] of Object.entries(expected)) {
    assert.equal(getAlertPresentation(alertFixture({
      payload: { unreadCount: 1 },
    }), language).unreadCountText, singular);
    assert.equal(getAlertPresentation(alertFixture({
      payload: { unreadCount: 2 },
    }), language).unreadCountText, plural);
  }
});

test("read and dismiss presentation follow the public canonical contract", () => {
  const unreadActive = alertFixture();
  assert.equal(canMarkCanonicalAlertRead(unreadActive), true);
  assert.equal(canAttemptCanonicalAlertDismiss(unreadActive), true);
  assert.equal(canAttemptCanonicalAlertDismiss(alertFixture({ priority: "critical" })), false);
  assert.equal(canAttemptCanonicalAlertDismiss(alertFixture({
    state: { ...unreadActive.state, lifecycle: "resolved", isResolved: true },
  })), false);
  assert.equal(canMarkCanonicalAlertRead(alertFixture({
    state: { ...unreadActive.state, isRead: true },
  })), false);
  assert.equal(canMarkCanonicalAlertRead(alertFixture({
    state: { ...unreadActive.state, lifecycle: "archived", isArchived: true },
  })), false);
});

test("classified page errors are safe and dismiss conflicts remain truthful", () => {
  assert.equal(getAlertErrorKey({ status: 409 }, "dismiss"), "alertCenterDismissConflict");
  assert.equal(getAlertErrorKey({ kind: "network" }, "load"), "alertCenterNetworkError");
  assert.equal(getAlertErrorKey({}, "refresh"), "alertCenterRefreshError");
  assert.equal(getAlertErrorKey({}, "load_more"), "alertCenterLoadMoreError");
  assert.equal(getAlertErrorKey({}, "mutation"), "alertCenterMutationError");
});

test("the page imports only approved alert mutations and presents all canonical phases", () => {
  assert.match(notificationsSource, /from "\.\.\/utils\/alertApi"/);
  for (const method of ["fetchAlerts", "markAlertRead", "markAllAlertsRead", "dismissAlert"]) {
    assert.match(notificationsSource, new RegExp(`\\b${method}\\b`));
  }
  for (const phase of [
    "alertCenterLoading",
    "alertCenterRefreshing",
    "alertCenterInitialErrorTitle",
    "alertCenterRetry",
    "emptyKey",
    "alertCenterLoadMore",
  ]) {
    assert.match(notificationsSource, new RegExp(phase));
  }
  assert.match(notificationsSource, /role="tablist"/);
  assert.match(notificationsSource, /role="tabpanel"/);
  assert.match(notificationsSource, /aria-live="polite"/);
  assert.match(notificationsSource, /role="alert"/);
});

test("mutations preserve canonical server ownership", () => {
  assert.match(notificationsSource, /mutationTokensRef\.current\.has\(alert\.id\)/);
  assert.match(notificationsSource, /response\.alert\.id !== alert\.id/);
  assert.match(notificationsSource, /await markAllAlertsRead\(\{ setPage \}\)/);
  assert.match(notificationsSource, /await controller\.refresh\(\)/);
  assert.doesNotMatch(notificationsSource, /\.sort\(|new Set\(snapshot|\.filter\(.*alert|readAt\s*:/s);
});

test("mount is idempotent and rerender-equivalent dependency changes do not refetch", async () => {
  const transport = createControlledTransport();
  const controller = createAlertCenterController({ fetchPage: transport.fetchPage });

  const firstMount = controller.mount();
  const repeatedMount = controller.mount();
  assert.equal(transport.calls.length, 1);
  transport.calls[0].resolve(alertPage([alertFixture()]));
  await Promise.all([firstMount, repeatedMount]);
  assert.equal(transport.calls.length, 1);
  assert.equal(controller.getState().snapshot.alerts[0].id, "101");
  assert.match(notificationsSource, /setPageRef\.current = setPage/);
  assert.match(notificationsSource, /\}, \[controller\]\);/);
  assert.doesNotMatch(notificationsSource, /\}, \[setPage\]\);/);
});

test("refreshes are single-flight and multiple invalidations coalesce to one follow-up", async () => {
  const transport = createControlledTransport();
  const controller = createAlertCenterController({ fetchPage: transport.fetchPage });

  const initial = controller.mount();
  transport.calls[0].resolve(alertPage([alertFixture({ id: "101" })]));
  await initial;

  const firstMutationRefresh = controller.refresh();
  const secondMutationRefresh = controller.refresh();
  const thirdMutationRefresh = controller.refresh();
  assert.equal(transport.calls.length, 2);
  assert.equal(controller.getState().phase, "refreshing");
  assert.equal(controller.getState().snapshot.alerts[0].id, "101");

  transport.calls[1].resolve(alertPage([alertFixture({ id: "102" })]));
  await settleTurn();
  assert.equal(transport.calls.length, 3);
  transport.calls[2].resolve(alertPage([alertFixture({ id: "103" })]));
  await Promise.all([firstMutationRefresh, secondMutationRefresh, thirdMutationRefresh]);

  assert.equal(transport.calls.length, 3);
  assert.equal(transport.maximumConcurrency, 1);
  assert.equal(controller.getState().snapshot.alerts[0].id, "103");
});

test("coalesced refresh survives active failure, preserves truth, and releases ownership", async () => {
  const transport = createControlledTransport();
  const publications = [];
  const controller = createAlertCenterController({
    fetchPage: transport.fetchPage,
    onStateChange: (state) => publications.push(captureControllerState(state)),
  });

  const initial = controller.mount();
  transport.calls[0].resolve(alertPage([alertFixture({ id: "180" })]));
  await initial;

  const firstRefresh = controller.refresh();
  const queuedRefresh = controller.refresh();
  const duplicateQueuedRefresh = controller.refresh();
  assert.equal(transport.calls.length, 2);
  assert.equal(transport.maximumConcurrency, 1);
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["180"]);

  transport.calls[1].reject({ kind: "network" });
  await settleTurn();
  assert.equal(transport.calls.length, 3);
  assert.ok(publications.some((state) => (
    state.phase === "ready" &&
    state.refreshErrorKey === "alertCenterNetworkError" &&
    state.snapshot?.alerts[0] === "180"
  )));
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["180"]);

  transport.calls[2].resolve(alertPage([alertFixture({ id: "181" })]));
  await Promise.all([firstRefresh, queuedRefresh, duplicateQueuedRefresh]);
  assert.equal(transport.calls.length, 3);
  assert.equal(controller.getState().phase, "ready");
  assert.equal(controller.getState().refreshErrorKey, "");
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["181"]);

  const laterRefresh = controller.refresh();
  assert.equal(transport.calls.length, 4);
  transport.calls[3].resolve(alertPage([alertFixture({ id: "182" })]));
  await laterRefresh;
  assert.equal(transport.maximumConcurrency, 1);
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["182"]);
  assert.deepEqual(publications.map(({ phase, snapshot }) => [
    phase,
    snapshot?.alerts[0] || null,
  ]), [
    ["loading", null],
    ["ready", "180"],
    ["refreshing", "180"],
    ["ready", "180"],
    ["refreshing", "180"],
    ["ready", "181"],
    ["refreshing", "181"],
    ["ready", "182"],
  ]);
});

test("initial failure releases ownership for retry and subsequent refresh", async () => {
  const transport = createControlledTransport();
  const publications = [];
  const controller = createAlertCenterController({
    fetchPage: transport.fetchPage,
    onStateChange: (state) => publications.push(captureControllerState(state)),
  });

  const initial = controller.mount();
  assert.equal(transport.calls.length, 1);
  transport.calls[0].reject({ kind: "network" });
  await initial;
  assert.equal(controller.getState().phase, "error");
  assert.equal(controller.getState().snapshot, null);
  assert.equal(controller.getState().initialErrorKey, "alertCenterNetworkError");

  const retry = controller.retry();
  assert.equal(transport.calls.length, 2);
  assert.deepEqual(transport.calls[1].query, {
    limit: 25,
    lifecycle: "active",
    unread: true,
  });
  transport.calls[1].resolve(alertPage([alertFixture({ id: "190" })]));
  await retry;
  assert.equal(controller.getState().phase, "ready");
  assert.equal(controller.getState().initialErrorKey, "");
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["190"]);

  const laterRefresh = controller.refresh();
  assert.equal(transport.calls.length, 3);
  transport.calls[2].resolve(alertPage([alertFixture({ id: "191" })]));
  await laterRefresh;
  assert.equal(transport.maximumConcurrency, 1);
  assert.equal(controller.getState().loadingMore, false);
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["191"]);
  assert.ok(publications.some((state) => state.phase === "error" && state.snapshot === null));
  assert.deepEqual(publications.map(({ phase, snapshot }) => [
    phase,
    snapshot?.alerts[0] || null,
  ]), [
    ["loading", null],
    ["error", null],
    ["loading", null],
    ["ready", "190"],
    ["refreshing", "190"],
    ["ready", "191"],
  ]);
});

test("confirmed empty refresh replaces prior items and backend pagination exactly", async () => {
  const transport = createControlledTransport();
  const controller = createAlertCenterController({ fetchPage: transport.fetchPage });
  const initial = controller.mount();
  transport.calls[0].resolve(alertPage(
    [alertFixture({ id: "200" })],
    { hasMore: true, nextCursor: "old-opaque-cursor" }
  ));
  await initial;

  const refresh = controller.refresh();
  assert.equal(controller.getState().phase, "refreshing");
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["200"]);
  transport.calls[1].resolve(alertPage([]));
  await refresh;

  assert.equal(transport.calls.length, 2);
  assert.equal(transport.maximumConcurrency, 1);
  assert.equal(controller.getState().phase, "ready");
  assert.deepEqual(controller.getState().snapshot.alerts, []);
  assert.deepEqual(controller.getState().snapshot.pagination, {
    limit: 25,
    hasMore: false,
    nextCursor: null,
  });
});

test("load-more failure preserves pagination and releases the opaque cursor for exact retry", async () => {
  const transport = createControlledTransport();
  const controller = createAlertCenterController({ fetchPage: transport.fetchPage });
  const cursor = "opaque+/retry==cursor";
  const initial = controller.mount();
  transport.calls[0].resolve(alertPage(
    [alertFixture({ id: "210" })],
    { hasMore: true, nextCursor: cursor }
  ));
  await initial;

  const failedMore = controller.loadMore();
  assert.equal(transport.calls.length, 2);
  assert.equal(transport.calls[1].query.cursor, cursor);
  transport.calls[1].reject({ kind: "network" });
  await failedMore;
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["210"]);
  assert.equal(controller.getState().snapshot.pagination.nextCursor, cursor);
  assert.equal(controller.getState().loadMoreErrorKey, "alertCenterNetworkError");
  assert.equal(controller.getState().loadingMore, false);

  const retryMore = controller.loadMore();
  assert.equal(transport.calls.length, 3);
  assert.equal(transport.calls[2].query.cursor, cursor);
  transport.calls[2].resolve(alertPage([
    alertFixture({ id: "211" }),
    alertFixture({ id: "211" }),
    alertFixture({ id: "212" }),
  ]));
  await retryMore;

  assert.equal(transport.maximumConcurrency, 1);
  assert.equal(controller.getState().loadMoreErrorKey, "");
  assert.equal(controller.getState().loadingMore, false);
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), [
    "210",
    "211",
    "211",
    "212",
  ]);
});

test("deactivation cancels queued refresh and publishes nothing after active refresh settles", async () => {
  const transport = createControlledTransport();
  const publications = [];
  const controller = createAlertCenterController({
    fetchPage: transport.fetchPage,
    onStateChange: (state) => publications.push(captureControllerState(state)),
  });
  const initial = controller.mount();
  transport.calls[0].resolve(alertPage([alertFixture({ id: "220" })]));
  await initial;

  const activeRefresh = controller.refresh();
  const queuedRefresh = controller.refresh();
  const duplicateQueue = controller.refresh();
  assert.equal(transport.calls.length, 2);
  const publicationCountAtUnmount = publications.length;
  controller.deactivate();
  controller.deactivate();
  transport.calls[1].resolve(alertPage([alertFixture({ id: "221" })]));
  await Promise.all([activeRefresh, queuedRefresh, duplicateQueue]);

  assert.equal(transport.calls.length, 2);
  assert.equal(transport.maximumConcurrency, 1);
  assert.equal(publications.length, publicationCountAtUnmount);
  assert.equal(publicationCountAtUnmount, 3);
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["220"]);
});

test("view change cancels queued old-view refresh and publishes only selected-view truth", async () => {
  const transport = createControlledTransport();
  const publications = [];
  const controller = createAlertCenterController({
    fetchPage: transport.fetchPage,
    onStateChange: (state) => publications.push(captureControllerState(state)),
  });
  const initial = controller.mount();
  transport.calls[0].resolve(alertPage([alertFixture({ id: "230" })]));
  await initial;

  const activeAttentionRefresh = controller.refresh();
  const queuedAttentionRefresh = controller.refresh();
  const readSelection = controller.selectView("read");
  assert.equal(transport.calls.length, 2);
  assert.equal(controller.getState().viewId, "read");
  assert.equal(controller.getState().snapshot, null);

  transport.calls[1].resolve(alertPage([alertFixture({ id: "232" })]));
  await settleTurn();
  assert.equal(transport.calls.length, 3);
  assert.deepEqual(transport.calls[2].query, {
    limit: 25,
    lifecycle: "active",
    unread: false,
  });
  transport.calls[2].resolve(alertPage([alertFixture({ id: "231" })]));
  await Promise.all([activeAttentionRefresh, queuedAttentionRefresh, readSelection]);

  assert.equal(transport.calls.length, 3);
  assert.equal(transport.maximumConcurrency, 1);
  assert.equal(controller.getState().viewId, "read");
  assert.equal(controller.getState().initialErrorKey, "");
  assert.equal(controller.getState().refreshErrorKey, "");
  assert.equal(controller.getState().loadMoreErrorKey, "");
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["231"]);
  assert.equal(publications.some((state) => (
    state.viewId === "read" && state.snapshot?.alerts.includes("232")
  )), false);
  assert.deepEqual(publications.map(({ phase, snapshot, viewId }) => [
    phase,
    viewId,
    snapshot?.alerts[0] || null,
  ]), [
    ["loading", "attention", null],
    ["ready", "attention", "230"],
    ["refreshing", "attention", "230"],
    ["loading", "read", null],
    ["loading", "read", null],
    ["ready", "read", "231"],
  ]);
});

test("stale mutation completion guard cannot refresh a newly selected view", async () => {
  const transport = createControlledTransport();
  const controller = createAlertCenterController({ fetchPage: transport.fetchPage });
  const initial = controller.mount();
  transport.calls[0].resolve(alertPage([alertFixture({ id: "240" })]));
  await initial;

  const mutation = deferred();
  const originToken = Symbol("attention-mutation");
  const originViewId = controller.getState().viewId;
  const readSelection = controller.selectView("read");
  assert.equal(transport.calls.length, 2);

  mutation.resolve({ alert: alertFixture({ id: "240" }) });
  await mutation.promise;
  const completionIsCurrent = isCurrentAlertMutationCompletion({
    currentToken: originToken,
    currentViewId: controller.getState().viewId,
    isMounted: true,
    originToken,
    originViewId,
  });
  assert.equal(completionIsCurrent, false);
  if (completionIsCurrent) await controller.refresh();
  assert.equal(transport.calls.length, 2);

  transport.calls[1].resolve(alertPage([alertFixture({ id: "241" })]));
  await readSelection;
  assert.equal(transport.maximumConcurrency, 1);
  assert.equal(controller.getState().viewId, "read");
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["241"]);
  assert.match(notificationsSource, /isCurrentAlertMutationCompletion/);
});

test("a selected view supersedes an older view without overlapping or reusing its data", async () => {
  const transport = createControlledTransport();
  const controller = createAlertCenterController({ fetchPage: transport.fetchPage });

  controller.mount();
  const selected = controller.selectView("read");
  assert.equal(transport.calls.length, 1);
  assert.equal(controller.getState().viewId, "read");
  assert.equal(controller.getState().snapshot, null);

  transport.calls[0].resolve(alertPage([alertFixture({ id: "110" })]));
  await settleTurn();
  assert.equal(transport.calls.length, 2);
  assert.deepEqual(transport.calls[1].query, {
    limit: 25,
    lifecycle: "active",
    unread: false,
  });
  assert.equal(controller.getState().snapshot, null);

  transport.calls[1].resolve(alertPage([alertFixture({ id: "120" })]));
  await selected;
  assert.equal(transport.maximumConcurrency, 1);
  assert.equal(controller.getState().viewId, "read");
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["120"]);
});

test("confirmed data survives refresh and transient refresh failure", async () => {
  const transport = createControlledTransport();
  const controller = createAlertCenterController({ fetchPage: transport.fetchPage });

  const initial = controller.mount();
  transport.calls[0].resolve(alertPage([alertFixture({ id: "130" })]));
  await initial;

  const refresh = controller.refresh();
  assert.equal(controller.getState().phase, "refreshing");
  assert.equal(controller.getState().snapshot.alerts[0].id, "130");
  transport.calls[1].reject({ kind: "network" });
  await refresh;

  assert.equal(controller.getState().phase, "ready");
  assert.equal(controller.getState().snapshot.alerts[0].id, "130");
  assert.equal(controller.getState().refreshErrorKey, "alertCenterNetworkError");
});

test("pagination prevents overlap, rejects stale append, and resets across views", async () => {
  const transport = createControlledTransport();
  const controller = createAlertCenterController({ fetchPage: transport.fetchPage });

  const initial = controller.mount();
  transport.calls[0].resolve(alertPage(
    [alertFixture({ id: "140" })],
    { hasMore: true, nextCursor: "opaque-page-2" }
  ));
  await initial;

  const firstMore = controller.loadMore();
  const duplicateMore = controller.loadMore();
  assert.equal(transport.calls.length, 2);
  const selected = controller.selectView("resolved");
  transport.calls[1].resolve(alertPage([alertFixture({ id: "141" })]));
  await Promise.all([firstMore, duplicateMore]);
  await settleTurn();

  assert.equal(transport.calls.length, 3);
  assert.equal(controller.getState().viewId, "resolved");
  assert.equal(controller.getState().snapshot, null);
  transport.calls[2].resolve(alertPage([alertFixture({ id: "150" })]));
  await selected;

  assert.equal(transport.maximumConcurrency, 1);
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), ["150"]);
  assert.equal(controller.getState().snapshot.pagination.nextCursor, null);
});

test("pagination appends exact server order once and blocks a repeated cursor", async () => {
  const transport = createControlledTransport();
  const controller = createAlertCenterController({ fetchPage: transport.fetchPage });
  const initial = controller.mount();
  transport.calls[0].resolve(alertPage(
    [alertFixture({ id: "160" })],
    { hasMore: true, nextCursor: "repeated-cursor" }
  ));
  await initial;

  const more = controller.loadMore();
  transport.calls[1].resolve(alertPage(
    [alertFixture({ id: "161" }), alertFixture({ id: "161" })],
    { hasMore: true, nextCursor: "repeated-cursor" }
  ));
  await more;
  assert.deepEqual(controller.getState().snapshot.alerts.map(({ id }) => id), [
    "160",
    "161",
    "161",
  ]);

  await controller.loadMore();
  assert.equal(transport.calls.length, 2);
  assert.equal(controller.getState().loadMoreErrorKey, "alertCenterLoadMoreError");
});

test("completion after unmount cannot publish current state", async () => {
  const transport = createControlledTransport();
  const published = [];
  const controller = createAlertCenterController({
    fetchPage: transport.fetchPage,
    onStateChange: (state) => published.push(state),
  });

  const initial = controller.mount();
  const publishedBeforeUnmount = published.length;
  controller.deactivate();
  transport.calls[0].resolve(alertPage([alertFixture({ id: "170" })]));
  await initial;

  assert.equal(published.length, publishedBeforeUnmount);
  assert.equal(controller.getState().snapshot, null);
});

test("all Alert Center visible strings and backend communication keys are localized", () => {
  for (const key of [
    "alertCenterTitle",
    "alertCenterViewAttention",
    "alertCenterEmptyAttention",
    "alertCenterInitialErrorText",
    "alertCenterDismissConflict",
    "alertCenterDestinationUnavailable",
    "alerts.communication.newMessage.title",
    "alerts.communication.newMessage.message",
  ]) {
    const occurrences = languageSource.match(new RegExp(`(?:${key.replaceAll(".", "\\.")})`, "g")) || [];
    assert.ok(occurrences.length >= 4, `${key} must be present for every supported language`);
  }
});
