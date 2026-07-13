export const APP_DESKTOP_SIDEBAR_MAX_WIDTH = 284;
export const APP_DESKTOP_SIDEBAR_MIN_WIDTH = 220;
export const APP_DESKTOP_WORKSPACE_MIN_WIDTH = 740;
export const APP_DESKTOP_SHELL_GUTTER_BUDGET = 76;
export const APP_DESKTOP_LAYOUT_MIN_WIDTH =
  APP_DESKTOP_SIDEBAR_MAX_WIDTH +
  APP_DESKTOP_WORKSPACE_MIN_WIDTH +
  APP_DESKTOP_SHELL_GUTTER_BUDGET;

let currentAppLayoutMetrics = null;
const appLayoutSubscribers = new Set();
let safeAreaProbe = null;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cssPixels(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

export function getAppSidebarWidth(layoutWidth) {
  const width = Math.max(0, finite(layoutWidth));
  if (width < APP_DESKTOP_LAYOUT_MIN_WIDTH) return 0;
  if (width >= 1180) return APP_DESKTOP_SIDEBAR_MAX_WIDTH;

  return Math.min(
    APP_DESKTOP_SIDEBAR_MAX_WIDTH,
    Math.max(APP_DESKTOP_SIDEBAR_MIN_WIDTH, width * 0.27)
  );
}

function readSafeAreaInsets({ windowObject, documentObject } = {}) {
  const fallback = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
  if (!windowObject?.getComputedStyle || !documentObject?.body?.appendChild) {
    return fallback;
  }

  if (!safeAreaProbe || safeAreaProbe.ownerDocument !== documentObject) {
    safeAreaProbe = documentObject.createElement("div");
    safeAreaProbe.setAttribute("aria-hidden", "true");
    safeAreaProbe.style.cssText = [
      "position:fixed",
      "visibility:hidden",
      "pointer-events:none",
      "inset:0 auto auto 0",
      "padding-top:env(safe-area-inset-top, 0px)",
      "padding-right:env(safe-area-inset-right, 0px)",
      "padding-bottom:env(safe-area-inset-bottom, 0px)",
      "padding-left:env(safe-area-inset-left, 0px)",
    ].join(";");
    documentObject.body.appendChild(safeAreaProbe);
  }

  const styles = windowObject.getComputedStyle(safeAreaProbe);
  return Object.freeze({
    top: Math.max(0, cssPixels(styles.paddingTop)),
    right: Math.max(0, cssPixels(styles.paddingRight)),
    bottom: Math.max(0, cssPixels(styles.paddingBottom)),
    left: Math.max(0, cssPixels(styles.paddingLeft)),
  });
}

function readRenderedSidebarWidth(documentObject, fallback) {
  const sidebar = documentObject?.querySelector?.(".desktop-sidebar");
  const bounds = sidebar?.getBoundingClientRect?.();
  if (!bounds || bounds.width <= 0) return fallback;

  return Math.max(0, finite(bounds.right) + 18);
}

export function getAppLayoutSnapshot({
  windowObject = globalThis.window,
  documentObject = globalThis.document,
  capacitor = globalThis.Capacitor,
} = {}) {
  const documentElement = documentObject?.documentElement;
  const layoutWidth = Math.max(
    0,
    finite(documentElement?.clientWidth, finite(windowObject?.innerWidth))
  );
  const layoutHeight = Math.max(
    0,
    finite(documentElement?.clientHeight, finite(windowObject?.innerHeight))
  );
  const visualWidth = Math.max(
    0,
    finite(windowObject?.visualViewport?.width, layoutWidth)
  );
  const visualHeight = Math.max(
    0,
    finite(windowObject?.visualViewport?.height, layoutHeight)
  );
  const visualOffsetLeft = Math.max(
    0,
    finite(windowObject?.visualViewport?.offsetLeft)
  );
  const visualOffsetTop = Math.max(
    0,
    finite(windowObject?.visualViewport?.offsetTop)
  );
  const isNative = Boolean(capacitor?.isNativePlatform?.());
  const platform = String(capacitor?.getPlatform?.() || (isNative ? "native" : "web"));
  const sidebarWidth = getAppSidebarWidth(layoutWidth);

  return Object.freeze({
    layoutWidth,
    layoutHeight,
    windowWidth: Math.max(0, finite(windowObject?.innerWidth, layoutWidth)),
    clientWidth: layoutWidth,
    visualWidth,
    visualHeight,
    visualOffsetLeft,
    visualOffsetTop,
    isNative,
    platform,
    sidebarWidth,
    contentWidth: Math.max(0, layoutWidth - sidebarWidth),
    layoutMode: layoutWidth >= APP_DESKTOP_LAYOUT_MIN_WIDTH ? "desktop" : "mobile",
  });
}

export function getDesktopContentMetrics({
  windowObject = globalThis.window,
  documentObject = globalThis.document,
  capacitor = globalThis.Capacitor,
  safeAreaInsets,
  renderedSidebarWidth,
} = {}) {
  const snapshot = getAppLayoutSnapshot({
    windowObject,
    documentObject,
    capacitor,
  });
  const safeArea = safeAreaInsets || readSafeAreaInsets({ windowObject, documentObject });
  const sidebarWidth = snapshot.layoutMode === "desktop"
    ? Math.max(
        0,
        finite(
          renderedSidebarWidth,
          readRenderedSidebarWidth(documentObject, snapshot.sidebarWidth)
        )
      )
    : 0;
  const usableViewportWidth = Math.min(
    snapshot.layoutWidth,
    snapshot.visualWidth || snapshot.layoutWidth
  );
  const usableViewportHeight = Math.min(
    snapshot.layoutHeight,
    snapshot.visualHeight || snapshot.layoutHeight
  );
  const contentWidth = Math.max(
    0,
    usableViewportWidth - sidebarWidth - safeArea.left - safeArea.right
  );
  const contentHeight = Math.max(
    0,
    usableViewportHeight - safeArea.top - safeArea.bottom
  );

  return Object.freeze({
    ...snapshot,
    sidebarWidth,
    contentWidth,
    contentHeight,
    availableContentWidth: contentWidth,
    availableContentHeight: contentHeight,
    safeAreaTop: safeArea.top,
    safeAreaRight: safeArea.right,
    safeAreaBottom: safeArea.bottom,
    safeAreaLeft: safeArea.left,
    desktopMode: snapshot.layoutMode === "desktop",
    mobileMode: snapshot.layoutMode === "mobile",
    tabletMode:
      snapshot.layoutMode === "desktop" && snapshot.layoutWidth < 1180,
  });
}

function metricsSignature(metrics) {
  return [
    metrics.layoutWidth,
    metrics.layoutHeight,
    metrics.visualWidth,
    metrics.visualHeight,
    metrics.visualOffsetLeft,
    metrics.visualOffsetTop,
    metrics.sidebarWidth,
    metrics.contentWidth,
    metrics.contentHeight,
    metrics.safeAreaTop,
    metrics.safeAreaRight,
    metrics.safeAreaBottom,
    metrics.safeAreaLeft,
    metrics.layoutMode,
  ].map((value) => String(value)).join(":");
}

export function getCurrentAppLayoutMetrics() {
  if (!currentAppLayoutMetrics) {
    currentAppLayoutMetrics = getDesktopContentMetrics();
  }
  return currentAppLayoutMetrics;
}

export function subscribeAppLayoutMetrics(listener) {
  appLayoutSubscribers.add(listener);
  return () => appLayoutSubscribers.delete(listener);
}

export function publishAppLayoutMetrics(metrics) {
  if (!metrics) return false;
  if (
    currentAppLayoutMetrics &&
    metricsSignature(currentAppLayoutMetrics) === metricsSignature(metrics)
  ) {
    return false;
  }

  currentAppLayoutMetrics = metrics;
  for (const listener of appLayoutSubscribers) listener();
  return true;
}

export function applyAppLayoutDiagnostics(root, snapshot) {
  if (!root || !snapshot) return;
  root.dataset.appLayout = snapshot.layoutMode;
  root.dataset.appLayoutWidth = String(Math.round(snapshot.layoutWidth));
  root.dataset.appWindowWidth = String(Math.round(snapshot.windowWidth));
  root.dataset.appClientWidth = String(Math.round(snapshot.clientWidth));
  root.dataset.appVisualWidth = String(Math.round(snapshot.visualWidth));
  root.dataset.appVisualOffset = [
    snapshot.visualOffsetLeft || 0,
    snapshot.visualOffsetTop || 0,
  ].map((value) => Math.round(value)).join(" ");
  root.dataset.appPlatform = snapshot.platform;
  root.dataset.appNative = String(snapshot.isNative);
  root.dataset.appSidebarWidth = String(Math.round(snapshot.sidebarWidth));
  root.dataset.appContentWidth = String(Math.round(snapshot.contentWidth));
  root.dataset.appContentHeight = String(Math.round(snapshot.contentHeight || 0));
  root.dataset.appSafeArea = [
    snapshot.safeAreaTop || 0,
    snapshot.safeAreaRight || 0,
    snapshot.safeAreaBottom || 0,
    snapshot.safeAreaLeft || 0,
  ].map((value) => Math.round(value)).join(" ");
  root.style.setProperty(
    "--meetro-available-content-width",
    `${Math.max(0, snapshot.contentWidth)}px`
  );
  root.style.setProperty(
    "--meetro-available-content-height",
    `${Math.max(0, snapshot.contentHeight || 0)}px`
  );
}

export function startAppLayoutCoordinator({
  root,
  windowObject = globalThis.window,
  documentObject = globalThis.document,
  capacitor = globalThis.Capacitor,
  ResizeObserverClass = globalThis.ResizeObserver,
} = {}) {
  if (!root || !windowObject) return () => {};

  let frame = 0;
  let followupFrame = 0;
  let stopped = false;

  const commit = () => {
    if (stopped) return;
    const metrics = getDesktopContentMetrics({
      windowObject,
      documentObject,
      capacitor,
    });
    applyAppLayoutDiagnostics(root, metrics);
    if (publishAppLayoutMetrics(metrics)) {
      const LayoutEvent = windowObject.CustomEvent || globalThis.CustomEvent;
      if (LayoutEvent) {
        windowObject.dispatchEvent?.(
          new LayoutEvent("meetroAppLayoutChanged", { detail: metrics })
        );
      }
    }
  };

  const schedule = () => {
    if (frame) windowObject.cancelAnimationFrame?.(frame);
    frame = windowObject.requestAnimationFrame?.(() => {
      frame = 0;
      commit();
      followupFrame = windowObject.requestAnimationFrame?.(() => {
        followupFrame = 0;
        commit();
      }) || 0;
    }) || 0;
    if (!frame) commit();
  };

  const visualViewport = windowObject.visualViewport;
  windowObject.addEventListener?.("resize", schedule);
  windowObject.addEventListener?.("orientationchange", schedule);
  windowObject.addEventListener?.("meetroSidebarLayoutChanged", schedule);
  visualViewport?.addEventListener?.("resize", schedule);
  visualViewport?.addEventListener?.("scroll", schedule);

  const resizeObserver = ResizeObserverClass
    ? new ResizeObserverClass(schedule)
    : null;
  if (resizeObserver) {
    if (documentObject?.documentElement) resizeObserver.observe(documentObject.documentElement);
    resizeObserver.observe(root);
    const sidebar = documentObject?.querySelector?.(".desktop-sidebar");
    if (sidebar) resizeObserver.observe(sidebar);
  }

  schedule();

  return () => {
    stopped = true;
    if (frame) windowObject.cancelAnimationFrame?.(frame);
    if (followupFrame) windowObject.cancelAnimationFrame?.(followupFrame);
    windowObject.removeEventListener?.("resize", schedule);
    windowObject.removeEventListener?.("orientationchange", schedule);
    windowObject.removeEventListener?.("meetroSidebarLayoutChanged", schedule);
    visualViewport?.removeEventListener?.("resize", schedule);
    visualViewport?.removeEventListener?.("scroll", schedule);
    resizeObserver?.disconnect?.();
  };
}
