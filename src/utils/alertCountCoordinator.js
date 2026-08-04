import { fetchAlertCounts } from "./alertApi.js";
import { normalizeAlertCountsResponse } from "./canonicalAlert.js";

export const ALERT_COUNT_PHASE = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  REFRESHING: "refreshing",
  INITIAL_ERROR: "initial_error",
  REFRESH_ERROR: "refresh_error",
});

export const ALERT_COUNT_POLL_INTERVAL_MS = 5_000;

function normalizeIdentity(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readVisibility(source) {
  if (!source) return true;
  if (typeof source.hidden === "boolean") return !source.hidden;
  return source.visibilityState !== "hidden";
}

function safeErrorKind(error) {
  const kind = typeof error?.kind === "string" ? error.kind : "unavailable";
  return [
    "authentication",
    "validation",
    "not_found",
    "conflict",
    "server",
    "network",
    "malformed_response",
  ].includes(kind)
    ? kind
    : "unavailable";
}

function createSnapshot({
  errorKind = "",
  identity = "",
  phase = ALERT_COUNT_PHASE.IDLE,
  response = null,
} = {}) {
  return Object.freeze({
    identity,
    phase,
    response,
    errorKind,
  });
}

export function createAlertCountCoordinator({
  request,
  schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
  cancelSchedule = (timer) => globalThis.clearTimeout(timer),
  visibilitySource = globalThis.document,
  pollIntervalMs = ALERT_COUNT_POLL_INTERVAL_MS,
} = {}) {
  if (typeof request !== "function") {
    throw new TypeError("Alert count request must be a function.");
  }
  if (typeof schedule !== "function" || typeof cancelSchedule !== "function") {
    throw new TypeError("Alert count scheduling functions are required.");
  }
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < ALERT_COUNT_POLL_INTERVAL_MS) {
    throw new TypeError("Alert count polling must be at least five seconds.");
  }

  const subscribers = new Set();
  let identity = "";
  let snapshot = createSnapshot();
  let generation = 0;
  let inFlight = null;
  let refreshQueued = false;
  let pollTimer = null;
  let visibilityListenerAttached = false;
  let visible = readVisibility(visibilitySource);
  let requestCount = 0;
  let activeRequestCount = 0;
  let maximumConcurrentRequests = 0;

  const canRequest = () => Boolean(
    identity && subscribers.size > 0 && visible
  );

  const publish = (nextSnapshot) => {
    snapshot = nextSnapshot;
    subscribers.forEach((subscriber) => subscriber(snapshot));
  };

  const cancelPolling = () => {
    if (pollTimer === null) return;
    cancelSchedule(pollTimer);
    pollTimer = null;
  };

  const schedulePolling = () => {
    if (!canRequest() || inFlight || refreshQueued || pollTimer !== null) return;
    pollTimer = schedule(() => {
      pollTimer = null;
      if (canRequest()) void requestRefresh();
    }, pollIntervalMs);
  };

  const ownsRequest = (owner) => Boolean(
    inFlight === owner &&
    owner.generation === generation &&
    owner.identity === identity
  );

  const startRequest = () => {
    if (!canRequest()) return Promise.resolve(snapshot);
    if (inFlight) {
      refreshQueued = true;
      return waitForIdle();
    }

    cancelPolling();
    const hasConfirmedResponse = Boolean(snapshot.response);
    const nextPhase = hasConfirmedResponse
      ? ALERT_COUNT_PHASE.REFRESHING
      : ALERT_COUNT_PHASE.LOADING;
    if (snapshot.phase !== nextPhase || snapshot.errorKind) {
      publish(createSnapshot({
        identity,
        phase: nextPhase,
        response: snapshot.response,
      }));
    }

    const owner = {
      generation,
      identity,
      promise: null,
    };
    inFlight = owner;
    requestCount += 1;
    activeRequestCount += 1;
    maximumConcurrentRequests = Math.max(
      maximumConcurrentRequests,
      activeRequestCount
    );

    owner.promise = (async () => {
      try {
        const result = await request();
        const canonical = normalizeAlertCountsResponse(result);
        if (!canonical) {
          throw Object.assign(new Error("Invalid canonical Alert count response."), {
            kind: "malformed_response",
          });
        }
        if (!ownsRequest(owner)) return snapshot;
        publish(createSnapshot({
          identity,
          phase: ALERT_COUNT_PHASE.READY,
          response: canonical,
        }));
      } catch (error) {
        if (!ownsRequest(owner)) return snapshot;
        publish(createSnapshot({
          errorKind: safeErrorKind(error),
          identity,
          phase: hasConfirmedResponse
            ? ALERT_COUNT_PHASE.REFRESH_ERROR
            : ALERT_COUNT_PHASE.INITIAL_ERROR,
          response: hasConfirmedResponse ? snapshot.response : null,
        }));
      } finally {
        activeRequestCount = Math.max(0, activeRequestCount - 1);
        if (inFlight === owner) inFlight = null;

        if (canRequest() && refreshQueued) {
          refreshQueued = false;
          void startRequest();
        } else {
          refreshQueued = false;
          schedulePolling();
        }
      }
      return snapshot;
    })();

    return owner.promise;
  };

  async function waitForIdle() {
    while (inFlight || refreshQueued) {
      if (!inFlight) {
        if (!canRequest()) {
          refreshQueued = false;
          break;
        }
        refreshQueued = false;
        void startRequest();
      }
      const owner = inFlight;
      if (owner) await owner.promise;
    }
    return snapshot;
  }

  function requestRefresh() {
    if (!canRequest()) return Promise.resolve(snapshot);
    cancelPolling();
    if (inFlight) {
      refreshQueued = true;
      return waitForIdle();
    }
    return startRequest();
  }

  const handleVisibilityChange = () => {
    const nextVisible = readVisibility(visibilitySource);
    if (nextVisible === visible) return;
    visible = nextVisible;
    if (!visible) {
      cancelPolling();
      return;
    }
    if (identity && subscribers.size > 0) void requestRefresh();
  };

  const attachVisibilityListener = () => {
    if (visibilityListenerAttached || !visibilitySource?.addEventListener) return;
    visible = readVisibility(visibilitySource);
    visibilitySource.addEventListener("visibilitychange", handleVisibilityChange);
    visibilityListenerAttached = true;
  };

  const detachVisibilityListener = () => {
    if (!visibilityListenerAttached) return;
    visibilitySource?.removeEventListener?.(
      "visibilitychange",
      handleVisibilityChange
    );
    visibilityListenerAttached = false;
  };

  function setIdentity(nextIdentity) {
    const normalized = normalizeIdentity(nextIdentity);
    if (normalized === identity) return snapshot;

    generation += 1;
    cancelPolling();
    refreshQueued = false;
    identity = normalized;
    publish(createSnapshot({
      identity,
      phase: identity ? ALERT_COUNT_PHASE.LOADING : ALERT_COUNT_PHASE.IDLE,
    }));

    if (canRequest()) {
      if (inFlight) refreshQueued = true;
      else void startRequest();
    }
    return snapshot;
  }

  function reset() {
    const alreadyReset = !identity &&
      !snapshot.response &&
      snapshot.phase === ALERT_COUNT_PHASE.IDLE &&
      !snapshot.errorKind;
    cancelPolling();
    refreshQueued = false;
    if (alreadyReset) return snapshot;

    generation += 1;
    identity = "";
    publish(createSnapshot());
    return snapshot;
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== "function") {
      throw new TypeError("Alert count subscriber must be a function.");
    }
    const wasEmpty = subscribers.size === 0;
    subscribers.add(subscriber);
    subscriber(snapshot);

    if (wasEmpty) {
      attachVisibilityListener();
      if (canRequest()) {
        if (inFlight) refreshQueued = true;
        else void startRequest();
      }
    }

    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      subscribers.delete(subscriber);
      if (subscribers.size > 0) return;

      generation += 1;
      refreshQueued = false;
      cancelPolling();
      detachVisibilityListener();
    };
  }

  return Object.freeze({
    getMetrics() {
      return Object.freeze({
        activeRequestCount,
        hasPollTimer: pollTimer !== null,
        maximumConcurrentRequests,
        requestCount,
        subscriberCount: subscribers.size,
        visibilityListenerAttached,
      });
    },
    getSnapshot() {
      return snapshot;
    },
    refresh: requestRefresh,
    reset,
    setIdentity,
    subscribe,
    waitForIdle,
  });
}

const alertCountCoordinator = createAlertCountCoordinator({
  request: () => fetchAlertCounts(),
});

export function subscribeAlertCounts(subscriber) {
  return alertCountCoordinator.subscribe(subscriber);
}

export function getAlertCountSnapshot() {
  return alertCountCoordinator.getSnapshot();
}

export function refreshAlertCounts() {
  return alertCountCoordinator.refresh();
}

export function setAlertCountIdentity(identity) {
  return alertCountCoordinator.setIdentity(identity);
}

export function resetAlertCounts() {
  return alertCountCoordinator.reset();
}
