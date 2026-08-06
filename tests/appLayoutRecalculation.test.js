import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getCurrentAppLayoutMetrics,
  startAppLayoutCoordinator,
  subscribeAppLayoutMetrics,
} from "../src/utils/appLayout.js";
import { getCommunicationLayout } from "../src/utils/communicationLayout.js";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const messagesSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);
const assistantSource = readFileSync(
  new URL("../src/components/MeetroAssistant.jsx", import.meta.url),
  "utf8"
);
const conversationSource = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);
const navigationSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const appLayoutSource = readFileSync(
  new URL("../src/utils/appLayout.js", import.meta.url),
  "utf8"
);

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    emit(type) {
      for (const listener of [...(listeners.get(type) || [])]) listener();
    },
  };
}

function createCoordinatorEnvironment(width = 768, height = 1024) {
  const windowEvents = createEventTarget();
  const visualEvents = createEventTarget();
  const frames = new Map();
  let nextFrame = 1;
  let sidebarRight = width >= 1180 ? 266 : Math.max(202, width * 0.27 - 18);
  const safeArea = { top: 0, right: 0, bottom: 0, left: 0 };
  const rootProperties = new Map();
  const root = {
    dataset: {},
    style: { setProperty: (name, value) => rootProperties.set(name, value) },
  };
  const documentElement = { clientWidth: width, clientHeight: height };
  const sidebar = {
    getBoundingClientRect: () => ({ width: Math.max(0, sidebarRight - 18), right: sidebarRight }),
  };
  const documentObject = {
    documentElement,
    body: { appendChild() {} },
    createElement() {
      return {
        ownerDocument: documentObject,
        style: {},
        setAttribute() {},
      };
    },
    querySelector(selector) {
      return selector === ".desktop-sidebar" ? sidebar : null;
    },
  };
  const visualViewport = {
    ...visualEvents,
    width,
    height,
    offsetLeft: 0,
    offsetTop: 0,
  };
  class TestCustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  }
  const windowObject = {
    ...windowEvents,
    innerWidth: width,
    innerHeight: height,
    visualViewport,
    CustomEvent: TestCustomEvent,
    getComputedStyle() {
      return {
        paddingTop: `${safeArea.top}px`,
        paddingRight: `${safeArea.right}px`,
        paddingBottom: `${safeArea.bottom}px`,
        paddingLeft: `${safeArea.left}px`,
      };
    },
    requestAnimationFrame(callback) {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    dispatchEvent(event) {
      windowEvents.emit(event.type);
    },
  };
  let resizeObserver;
  class TestResizeObserver {
    constructor(callback) {
      this.callback = callback;
      resizeObserver = this;
    }
    observe() {}
    disconnect() {}
    trigger() {
      this.callback();
    }
  }

  function flushFrames() {
    while (frames.size) {
      const pending = [...frames.entries()];
      frames.clear();
      for (const [, callback] of pending) callback();
    }
  }

  function resize(nextWidth, nextHeight = height) {
    width = nextWidth;
    height = nextHeight;
    documentElement.clientWidth = nextWidth;
    documentElement.clientHeight = nextHeight;
    windowObject.innerWidth = nextWidth;
    windowObject.innerHeight = nextHeight;
    visualViewport.width = nextWidth;
    visualViewport.height = nextHeight;
    sidebarRight = nextWidth >= 1180 ? 266 : Math.max(202, nextWidth * 0.27 - 18);
  }

  return {
    root,
    rootProperties,
    windowObject,
    documentObject,
    TestResizeObserver,
    safeArea,
    flushFrames,
    resize,
    setSidebarRight(value) {
      sidebarRight = value;
    },
    triggerResizeObserver() {
      resizeObserver.trigger();
    },
  };
}

test("central coordinator recomputes portrait landscape and repeated rotations", () => {
  const environment = createCoordinatorEnvironment(768, 1024);
  const observed = [];
  const unsubscribeMetrics = subscribeAppLayoutMetrics(() => {
    observed.push(getCurrentAppLayoutMetrics());
  });
  const stop = startAppLayoutCoordinator({
    root: environment.root,
    windowObject: environment.windowObject,
    documentObject: environment.documentObject,
    capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
    ResizeObserverClass: environment.TestResizeObserver,
  });

  environment.flushFrames();
  assert.equal(getCurrentAppLayoutMetrics().layoutWidth, 768);
  assert.equal(getCurrentAppLayoutMetrics().layoutMode, "mobile");
  assert.equal(getCurrentAppLayoutMetrics().sidebarWidth, 0);
  assert.equal(getCommunicationLayout(getCurrentAppLayoutMetrics()).columns, 1);
  assert.equal(environment.root.dataset.appLayout, "mobile");

  environment.resize(1180, 820);
  environment.windowObject.emit("orientationchange");
  environment.flushFrames();
  assert.equal(getCurrentAppLayoutMetrics().contentWidth, 896);
  assert.equal(getCommunicationLayout(getCurrentAppLayoutMetrics()).columns, 2);

  environment.resize(1440, 900);
  environment.windowObject.emit("resize");
  environment.flushFrames();
  assert.equal(getCommunicationLayout(getCurrentAppLayoutMetrics()).columns, 3);

  environment.resize(768, 1024);
  environment.windowObject.emit("orientationchange");
  environment.flushFrames();
  assert.equal(getCurrentAppLayoutMetrics().layoutWidth, 768);
  assert.equal(getCurrentAppLayoutMetrics().layoutMode, "mobile");
  assert.equal(getCommunicationLayout(getCurrentAppLayoutMetrics()).columns, 1);
  assert.ok(observed.length >= 4);

  stop();
  unsubscribeMetrics();
});

test("Stage Manager Split View visual viewport safe area and sidebar changes republish metrics", () => {
  const environment = createCoordinatorEnvironment(1180, 820);
  const stop = startAppLayoutCoordinator({
    root: environment.root,
    windowObject: environment.windowObject,
    documentObject: environment.documentObject,
    capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
    ResizeObserverClass: environment.TestResizeObserver,
  });
  environment.flushFrames();

  environment.resize(900, 820);
  environment.windowObject.emit("resize");
  environment.flushFrames();
  assert.equal(getCurrentAppLayoutMetrics().layoutMode, "mobile");
  assert.equal(getCurrentAppLayoutMetrics().tabletMode, false);
  assert.equal(getCurrentAppLayoutMetrics().sidebarWidth, 0);

  environment.windowObject.visualViewport.width = 760;
  environment.windowObject.visualViewport.emit("resize");
  environment.flushFrames();
  assert.equal(getCurrentAppLayoutMetrics().contentWidth, 760);

  environment.safeArea.left = 12;
  environment.safeArea.right = 8;
  environment.windowObject.visualViewport.offsetLeft = 4;
  environment.windowObject.visualViewport.offsetTop = 6;
  environment.windowObject.visualViewport.emit("scroll");
  environment.flushFrames();
  assert.equal(getCurrentAppLayoutMetrics().safeAreaLeft, 12);
  assert.equal(getCurrentAppLayoutMetrics().safeAreaRight, 8);
  assert.equal(getCurrentAppLayoutMetrics().visualOffsetLeft, 4);
  assert.equal(getCurrentAppLayoutMetrics().visualOffsetTop, 6);
  assert.equal(getCurrentAppLayoutMetrics().layoutMode, "mobile");

  environment.resize(1180, 820);
  environment.windowObject.emit("resize");
  environment.flushFrames();
  const previousContentWidth = getCurrentAppLayoutMetrics().contentWidth;
  environment.setSidebarRight(182);
  environment.triggerResizeObserver();
  environment.flushFrames();
  assert.ok(getCurrentAppLayoutMetrics().contentWidth > previousContentWidth);
  assert.equal(environment.root.dataset.appLayout, "desktop");

  stop();
});

test("app-wide desktop surfaces consume the shared coordinator and CSS shell", () => {
  assert.match(appSource, /startAppLayoutCoordinator/);
  assert.match(messagesSource, /useAppLayoutMetrics\(\)/);
  assert.doesNotMatch(messagesSource, /addEventListener\("orientationchange"/);
  assert.match(assistantSource, /useAppLayoutMetrics\(\)/);
  assert.match(conversationSource, /const appLayoutMetrics = useAppLayoutMetrics\(\)/);
  assert.match(conversationSource, /appLayoutMetrics\.layoutWidth > appLayoutMetrics\.layoutHeight/);
  assert.doesNotMatch(conversationSource, /matchMedia\("\(orientation: landscape\)"\)/);
  assert.match(messagesSource, /useReducer\(\s*communicationWorkspaceReducer/);
  assert.match(
    messagesSource,
    /const messageSection =\s*routeDerivedWorkspace \|\| communicationWorkspaceState\.activeWorkspace/
  );
  assert.match(messagesSource, /const \[activeSplitConversationId, setActiveSplitConversationId\] = useState/);
  assert.doesNotMatch(appLayoutSource, /(?:reload|location\.(?:assign|replace))/);
  assert.doesNotMatch(appLayoutSource, /localStorage\.(?:clear|removeItem)/);
  assert.match(navigationSource, /#root\[data-app-layout="desktop"\] \.app-page/);
  assert.match(navigationSource, /var\(--meetro-sidebar-width\)/);
});
