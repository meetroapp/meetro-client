export const EMERGENCY_REFRESH_INTERVAL_MS = 5_000;

function defaultVisible() {
  return globalThis.document?.visibilityState !== "hidden";
}

export function createEmergencyRefreshCoordinator({
  load,
  onSuccess = () => {},
  onError = () => {},
  isVisible = defaultVisible,
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancelSchedule = (timer) => clearTimeout(timer),
  intervalMs = EMERGENCY_REFRESH_INTERVAL_MS,
} = {}) {
  if (typeof load !== "function") {
    throw new TypeError("An Emergency refresh loader is required.");
  }
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new TypeError("A positive Emergency refresh interval is required.");
  }

  let running = false;
  let generation = 0;
  let requestSequence = 0;
  let minimumValidSequence = 0;
  let timer = null;
  let inFlight = null;
  let queuedInvalidation = null;
  let hasConfirmedData = false;
  let networkRequestCount = 0;
  let activeRequestCount = 0;
  let maximumConcurrentRequests = 0;

  const clearTimer = () => {
    if (timer === null) return;
    cancelSchedule(timer);
    timer = null;
  };

  const scheduleNext = () => {
    clearTimer();
    if (!running || !isVisible()) return;

    timer = schedule(() => {
      timer = null;
      if (!running || !isVisible()) return;
      void refresh({ trigger: "poll" });
    }, intervalMs);
  };

  const execute = (trigger) => {
    const operationGeneration = generation;
    const sequence = ++requestSequence;
    networkRequestCount += 1;
    activeRequestCount += 1;
    maximumConcurrentRequests = Math.max(
      maximumConcurrentRequests,
      activeRequestCount
    );

    const promise = (async () => {
      try {
        const value = await load({ trigger, sequence });

        if (
          !running ||
          operationGeneration !== generation ||
          sequence < minimumValidSequence
        ) {
          return { status: "stale", value: null };
        }

        hasConfirmedData = true;
        onSuccess(value, { trigger, sequence });
        return { status: "applied", value };
      } catch (error) {
        if (
          !running ||
          operationGeneration !== generation ||
          sequence < minimumValidSequence
        ) {
          return { status: "stale", value: null };
        }

        onError(error, {
          trigger,
          sequence,
          hasConfirmedData,
        });
        return { status: "error", error };
      } finally {
        activeRequestCount = Math.max(0, activeRequestCount - 1);
      }
    })().finally(() => {
      if (inFlight?.sequence === sequence) {
        inFlight = null;
      }
      if (!queuedInvalidation) scheduleNext();
    });

    inFlight = { sequence, promise };
    return promise;
  };

  const queueInvalidatedRefresh = (trigger) => {
    if (queuedInvalidation) return queuedInvalidation;

    minimumValidSequence = requestSequence + 1;
    clearTimer();
    const activePromise = inFlight?.promise || Promise.resolve();

    queuedInvalidation = activePromise.then(() => {
      queuedInvalidation = null;
      if (!running) return { status: "stopped", value: null };
      return execute(trigger);
    });

    return queuedInvalidation;
  };

  function refresh({ invalidate = false, trigger = "manual" } = {}) {
    if (!running) {
      return Promise.resolve({ status: "stopped", value: null });
    }

    if (invalidate && inFlight) {
      return queueInvalidatedRefresh(trigger);
    }

    if (inFlight) return inFlight.promise;

    if (invalidate) {
      minimumValidSequence = requestSequence + 1;
    }

    clearTimer();
    return execute(trigger);
  }

  return {
    start({ immediate = true } = {}) {
      if (running) return inFlight?.promise || Promise.resolve();
      running = true;
      generation += 1;

      if (immediate && isVisible()) {
        return refresh({ trigger: "mount" });
      }

      scheduleNext();
      return Promise.resolve({ status: "scheduled", value: null });
    },
    refresh,
    handleVisibilityChange() {
      if (!running) return Promise.resolve({ status: "stopped", value: null });
      if (!isVisible()) {
        clearTimer();
        return Promise.resolve({ status: "hidden", value: null });
      }
      return refresh({ trigger: "visible" });
    },
    stop() {
      if (!running) return;
      running = false;
      generation += 1;
      minimumValidSequence = requestSequence + 1;
      clearTimer();
    },
    getMetrics() {
      return {
        running,
        hasConfirmedData,
        networkRequestCount,
        activeRequestCount,
        maximumConcurrentRequests,
        timerScheduled: timer !== null,
        refreshQueued: queuedInvalidation !== null,
      };
    },
  };
}
