import { authFetch } from "./authFetch.js";
import { getAccountStorageIdentity } from "./accountStorage.js";
import {
  PROFESSIONAL_OPPORTUNITY_STATUS,
  resolveProfessionalOpportunityCollection,
} from "./professionalOpportunityState.js";

export const PROFESSIONAL_OPPORTUNITY_PHASE = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  REFRESHING: "refreshing",
  INITIAL_ERROR: "initial_error",
  REFRESH_ERROR: "refresh_error",
});

const DEFAULT_FRESHNESS_MS = 5_000;
const DEFAULT_RETRY_DELAYS_MS = Object.freeze([750, 2_000]);

function emptySnapshot(identity = "") {
  return {
    identity,
    phase: PROFESSIONAL_OPPORTUNITY_PHASE.IDLE,
    status: PROFESSIONAL_OPPORTUNITY_STATUS.LOADING,
    records: [],
    updatedAt: 0,
    error: null,
  };
}

function normalizeIdentity(storage = globalThis.localStorage) {
  if (!storage?.getItem) return "";

  let storedUser;
  try {
    storedUser = JSON.parse(storage.getItem("user") || "{}") || {};
  } catch {
    storedUser = {};
  }

  return getAccountStorageIdentity(
    {
      ...storedUser,
      id: storedUser.id || storage.getItem("userId") || "",
      email: storedUser.email || storage.getItem("userEmail") || "",
    },
    storage.getItem("userEmail") || ""
  );
}

export function createProfessionalOpportunityCoordinator({
  request,
  getIdentity = () => "",
  now = () => Date.now(),
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancelSchedule = (timer) => clearTimeout(timer),
  freshnessMs = DEFAULT_FRESHNESS_MS,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
} = {}) {
  if (typeof request !== "function") {
    throw new TypeError("A professional opportunity request function is required.");
  }

  let snapshot = emptySnapshot();
  let inFlight = null;
  let requestGeneration = 0;
  let requestSequence = 0;
  let inFlightCount = 0;
  let networkRequestCount = 0;
  let maximumConcurrentRequests = 0;
  const subscribers = new Set();
  const pendingRetryWaits = new Set();

  const waitForRetry = (delayMs) =>
    new Promise((resolve) => {
      const pending = {
        resolve,
        timer: null,
      };
      pending.timer = schedule(() => {
        pendingRetryWaits.delete(pending);
        resolve();
      }, delayMs);
      pendingRetryWaits.add(pending);
    });

  const cancelRetryWaits = () => {
    pendingRetryWaits.forEach((pending) => {
      cancelSchedule(pending.timer);
      pending.resolve();
    });
    pendingRetryWaits.clear();
  };

  const notify = () => {
    subscribers.forEach((subscriber) => subscriber(snapshot));
  };

  const replaceSnapshot = (nextSnapshot) => {
    snapshot = nextSnapshot;
    notify();
  };

  const reset = (identity = "") => {
    requestGeneration += 1;
    cancelRetryWaits();
    inFlight = null;
    inFlightCount = 0;
    snapshot = emptySnapshot(identity);
    notify();
  };

  const synchronizeIdentity = () => {
    const identity = String(getIdentity() || "");
    if (identity !== snapshot.identity) {
      reset(identity);
    }
    return identity;
  };

  const requestOpportunities = ({
    caller = "unknown",
    trigger = "load",
    force = false,
    setPage,
  } = {}) => {
    const identity = synchronizeIdentity();
    if (!identity) {
      const error = new Error("Authenticated opportunity identity is unavailable.");
      replaceSnapshot({
        ...emptySnapshot(),
        phase: PROFESSIONAL_OPPORTUNITY_PHASE.INITIAL_ERROR,
        status: PROFESSIONAL_OPPORTUNITY_STATUS.UNAVAILABLE,
        error,
      });
      return Promise.resolve(snapshot);
    }

    const hasConfirmedData = snapshot.updatedAt > 0;
    const isFresh = hasConfirmedData && now() - snapshot.updatedAt < freshnessMs;

    if (!force && isFresh) {
      return Promise.resolve(snapshot);
    }

    if (inFlight) {
      return inFlight;
    }

    const generation = ++requestGeneration;
    const sequence = ++requestSequence;
    replaceSnapshot({
      ...snapshot,
      phase: hasConfirmedData
        ? PROFESSIONAL_OPPORTUNITY_PHASE.REFRESHING
        : PROFESSIONAL_OPPORTUNITY_PHASE.LOADING,
      error: null,
    });

    inFlight = (async () => {
      let finalError = null;

      for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
        if (generation !== requestGeneration) return snapshot;

        if (attempt > 0) {
          if (subscribers.size === 0) break;
          const delay = retryDelaysMs[attempt - 1];
          await waitForRetry(delay);
          if (generation !== requestGeneration || subscribers.size === 0) {
            return snapshot;
          }
        }

        networkRequestCount += 1;
        inFlightCount += 1;
        maximumConcurrentRequests = Math.max(
          maximumConcurrentRequests,
          inFlightCount
        );

        try {
          const result = await request({ caller, trigger, attempt, setPage });
          const collection = resolveProfessionalOpportunityCollection(result);
          const successful =
            collection.status !== PROFESSIONAL_OPPORTUNITY_STATUS.UNAVAILABLE;

          if (!successful) {
            finalError = Object.assign(
              new Error("Professional opportunities are unavailable."),
              { code: collection.code, status: result?.response?.status }
            );
            continue;
          }

          if (generation !== requestGeneration) return snapshot;

          replaceSnapshot({
            identity,
            phase: PROFESSIONAL_OPPORTUNITY_PHASE.READY,
            status: collection.status,
            records: collection.records,
            updatedAt: now(),
            error: null,
          });
          return snapshot;
        } catch (error) {
          finalError = error;
        } finally {
          inFlightCount = Math.max(0, inFlightCount - 1);
        }
      }

      if (generation !== requestGeneration) return snapshot;

      replaceSnapshot(
        hasConfirmedData
          ? {
              ...snapshot,
              phase: PROFESSIONAL_OPPORTUNITY_PHASE.REFRESH_ERROR,
              error: finalError,
            }
          : {
              ...emptySnapshot(identity),
              phase: PROFESSIONAL_OPPORTUNITY_PHASE.INITIAL_ERROR,
              status: PROFESSIONAL_OPPORTUNITY_STATUS.UNAVAILABLE,
              error: finalError,
            }
      );
      return snapshot;
    })().finally(() => {
      if (sequence === requestSequence) {
        inFlight = null;
      }
    });

    return inFlight;
  };

  return {
    getSnapshot() {
      synchronizeIdentity();
      return snapshot;
    },
    getMetrics() {
      return {
        networkRequestCount,
        maximumConcurrentRequests,
        inFlightCount,
        subscriberCount: subscribers.size,
      };
    },
    request: requestOpportunities,
    reset,
    subscribe(subscriber) {
      synchronizeIdentity();
      subscribers.add(subscriber);
      subscriber(snapshot);
      return () => {
        subscribers.delete(subscriber);
        if (subscribers.size === 0) cancelRetryWaits();
      };
    },
  };
}

const professionalOpportunityCoordinator =
  createProfessionalOpportunityCoordinator({
    request: ({ setPage }) =>
      authFetch(
        "/professional-request-opportunities",
        { cache: "no-store" },
        setPage
      ),
    getIdentity: () => normalizeIdentity(),
  });

if (globalThis.window?.addEventListener) {
  window.addEventListener("meetroAuthExpired", () => {
    professionalOpportunityCoordinator.reset("");
  });
  window.addEventListener("storage", () => {
    professionalOpportunityCoordinator.getSnapshot();
  });
}

export function getProfessionalOpportunitySnapshot() {
  return professionalOpportunityCoordinator.getSnapshot();
}

export function requestProfessionalOpportunities(options = {}) {
  return professionalOpportunityCoordinator.request(options);
}

export function subscribeProfessionalOpportunities(subscriber) {
  return professionalOpportunityCoordinator.subscribe(subscriber);
}

export function resetProfessionalOpportunityCoordinator() {
  professionalOpportunityCoordinator.reset("");
}
