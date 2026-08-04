import {
  DEFAULT_ALERT_CENTER_VIEW,
  buildAlertCenterQuery,
  getAlertCenterView,
  getAlertErrorKey,
} from "./alertPresentation.js";

export function createAlertCenterInitialState(
  viewId = DEFAULT_ALERT_CENTER_VIEW
) {
  const view = getAlertCenterView(viewId);
  return {
    viewId: view.id,
    snapshot: null,
    phase: "loading",
    initialErrorKey: "",
    refreshErrorKey: "",
    loadMoreErrorKey: "",
    loadingMore: false,
  };
}

export function isCurrentAlertMutationCompletion({
  currentToken,
  currentViewId,
  isMounted,
  originToken,
  originViewId,
}) {
  return Boolean(
    isMounted &&
    currentToken === originToken &&
    currentViewId === originViewId
  );
}

export function createAlertCenterController({
  fetchPage,
  initialViewId = DEFAULT_ALERT_CENTER_VIEW,
  onStateChange = () => {},
} = {}) {
  if (typeof fetchPage !== "function") {
    throw new TypeError("Alert Center fetchPage must be a function.");
  }
  if (typeof onStateChange !== "function") {
    throw new TypeError("Alert Center onStateChange must be a function.");
  }

  const initialState = createAlertCenterInitialState(initialViewId);
  let active = false;
  let viewId = initialState.viewId;
  let snapshot = null;
  let phase = initialState.phase;
  let initialErrorKey = "";
  let refreshErrorKey = "";
  let loadMoreErrorKey = "";
  let loadingMore = false;
  let generation = 0;
  let viewOwner = null;
  let loadMoreOwner = null;
  let pendingViewLoad = false;
  let refreshQueued = false;
  let requestedCursors = new Set();

  function getState() {
    return {
      viewId,
      snapshot,
      phase,
      initialErrorKey,
      refreshErrorKey,
      loadMoreErrorKey,
      loadingMore,
    };
  }

  function emit() {
    if (active) onStateChange(getState());
  }

  function ownsViewRequest(owner) {
    return Boolean(
      active &&
      viewOwner === owner &&
      owner.generation === generation &&
      owner.viewId === viewId
    );
  }

  function ownsLoadMoreRequest(owner) {
    return Boolean(
      active &&
      loadMoreOwner === owner &&
      owner.generation === generation &&
      owner.viewId === viewId &&
      snapshot?.viewId === viewId &&
      snapshot.pagination?.nextCursor === owner.cursor
    );
  }

  function startQueuedRequest() {
    if (!active || viewOwner || loadMoreOwner) return;
    if (pendingViewLoad) {
      pendingViewLoad = false;
      refreshQueued = false;
      void startViewLoad({ preserveConfirmed: false });
      return;
    }
    if (refreshQueued) {
      refreshQueued = false;
      void startViewLoad({ preserveConfirmed: true });
    }
  }

  async function waitForIdle() {
    while (viewOwner || loadMoreOwner || pendingViewLoad || refreshQueued) {
      const owner = viewOwner || loadMoreOwner;
      if (!owner) {
        startQueuedRequest();
        continue;
      }
      await owner.promise;
    }
  }

  function startViewLoad({ preserveConfirmed }) {
    if (!active) return Promise.resolve();
    if (viewOwner || loadMoreOwner) {
      refreshQueued = true;
      return waitForIdle();
    }

    const targetViewId = viewId;
    const requestGeneration = ++generation;
    const mayPreserve = Boolean(
      preserveConfirmed && snapshot?.viewId === targetViewId
    );

    requestedCursors = new Set();
    loadingMore = false;
    loadMoreErrorKey = "";
    initialErrorKey = "";
    refreshErrorKey = "";
    if (mayPreserve) {
      phase = "refreshing";
    } else {
      snapshot = null;
      phase = "loading";
    }
    emit();

    const owner = {
      generation: requestGeneration,
      viewId: targetViewId,
      promise: null,
    };
    viewOwner = owner;

    owner.promise = (async () => {
      try {
        const response = await fetchPage(buildAlertCenterQuery(targetViewId));
        if (!ownsViewRequest(owner)) return;
        snapshot = {
          viewId: targetViewId,
          alerts: response.alerts,
          pagination: response.pagination,
        };
        phase = "ready";
        emit();
      } catch (error) {
        if (!ownsViewRequest(owner)) return;
        if (mayPreserve && snapshot?.viewId === targetViewId) {
          refreshErrorKey = getAlertErrorKey(error, "refresh");
          phase = "ready";
        } else {
          initialErrorKey = getAlertErrorKey(error, "load");
          phase = "error";
        }
        emit();
      } finally {
        if (viewOwner === owner) viewOwner = null;
        startQueuedRequest();
      }
    })();

    return owner.promise;
  }

  function mount() {
    if (active) return waitForIdle();
    active = true;
    if (viewOwner || loadMoreOwner) {
      emit();
      return waitForIdle();
    }
    return startViewLoad({ preserveConfirmed: Boolean(snapshot) });
  }

  function deactivate() {
    active = false;
    pendingViewLoad = false;
    refreshQueued = false;
  }

  function selectView(nextViewId) {
    if (!active) return Promise.resolve();
    const nextView = getAlertCenterView(nextViewId);
    if (nextView.id === viewId) return waitForIdle();

    viewId = nextView.id;
    generation += 1;
    snapshot = null;
    phase = "loading";
    initialErrorKey = "";
    refreshErrorKey = "";
    loadMoreErrorKey = "";
    loadingMore = false;
    requestedCursors = new Set();
    pendingViewLoad = true;
    refreshQueued = false;
    emit();

    if (!viewOwner && !loadMoreOwner) startQueuedRequest();
    return waitForIdle();
  }

  function requestRefresh() {
    if (!active) return Promise.resolve();
    if (pendingViewLoad) return waitForIdle();
    if (viewOwner || loadMoreOwner) {
      refreshQueued = true;
      return waitForIdle();
    }
    void startViewLoad({ preserveConfirmed: Boolean(snapshot) });
    return waitForIdle();
  }

  function retry() {
    return requestRefresh();
  }

  function loadMore() {
    const cursor = snapshot?.pagination?.nextCursor;
    if (
      !active ||
      snapshot?.viewId !== viewId ||
      snapshot.pagination?.hasMore !== true ||
      typeof cursor !== "string"
    ) {
      return Promise.resolve();
    }
    if (viewOwner) return waitForIdle();
    if (loadMoreOwner) return loadMoreOwner.promise;
    if (requestedCursors.has(cursor)) {
      loadMoreErrorKey = "alertCenterLoadMoreError";
      emit();
      return Promise.resolve();
    }

    const owner = {
      cursor,
      generation,
      viewId,
      promise: null,
    };
    loadMoreOwner = owner;
    requestedCursors.add(cursor);
    loadingMore = true;
    loadMoreErrorKey = "";
    emit();

    owner.promise = (async () => {
      try {
        const response = await fetchPage(buildAlertCenterQuery(owner.viewId, cursor));
        if (!ownsLoadMoreRequest(owner)) return;
        snapshot = {
          viewId: owner.viewId,
          alerts: [...snapshot.alerts, ...response.alerts],
          pagination: response.pagination,
        };
        emit();
      } catch (error) {
        if (!ownsLoadMoreRequest(owner)) return;
        requestedCursors.delete(cursor);
        loadMoreErrorKey = getAlertErrorKey(error, "load_more");
        emit();
      } finally {
        if (loadMoreOwner === owner) {
          loadMoreOwner = null;
          loadingMore = false;
          emit();
        }
        startQueuedRequest();
      }
    })();

    return owner.promise;
  }

  return Object.freeze({
    deactivate,
    getState,
    loadMore,
    mount,
    refresh: requestRefresh,
    retry,
    selectView,
    waitForIdle,
  });
}
