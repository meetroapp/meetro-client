import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyAppLayoutDiagnostics,
  getAppLayoutSnapshot,
  getDesktopContentMetrics,
} from "../src/utils/appLayout.js";

const appLayoutSource = readFileSync(
  new URL("../src/utils/appLayout.js", import.meta.url),
  "utf8"
);
const cssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const navigationSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const assistantSource = readFileSync(
  new URL("../src/components/MeetroAssistant.jsx", import.meta.url),
  "utf8"
);
const conversationSource = readFileSync(
  new URL("../src/pages/Conversation.jsx", import.meta.url),
  "utf8"
);
const conversationThreadSource = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);

function safariEnvironment({ visualHeight, offsetTop = 0 }) {
  return {
    windowObject: {
      innerWidth: 390,
      innerHeight: 844,
      visualViewport: {
        width: 390,
        height: visualHeight,
        offsetLeft: 0,
        offsetTop,
      },
    },
    documentObject: {
      documentElement: { clientWidth: 390, clientHeight: 844 },
    },
  };
}

function diagnosticRoot() {
  const properties = new Map();
  return {
    dataset: {},
    style: {
      setProperty(name, value) {
        properties.set(name, value);
      },
    },
    properties,
  };
}

test("iPhone Safari chrome expansion and collapse publish the usable visual viewport", () => {
  const chromeVisible = safariEnvironment({ visualHeight: 690, offsetTop: 58 });
  const chromeCollapsed = safariEnvironment({ visualHeight: 790, offsetTop: 10 });
  const visibleSnapshot = getAppLayoutSnapshot(chromeVisible);
  const collapsedSnapshot = getAppLayoutSnapshot(chromeCollapsed);

  assert.equal(visibleSnapshot.layoutMode, "mobile");
  assert.equal(visibleSnapshot.visualHeight, 690);
  assert.equal(visibleSnapshot.visualBottomGap, 96);
  assert.equal(collapsedSnapshot.visualHeight, 790);
  assert.equal(collapsedSnapshot.visualBottomGap, 44);
  assert.equal(collapsedSnapshot.layoutMode, "mobile");

  const root = diagnosticRoot();
  applyAppLayoutDiagnostics(root, visibleSnapshot);
  assert.equal(root.dataset.appVisualHeight, "690");
  assert.equal(root.dataset.appVisualBottomGap, "96");
  assert.equal(root.properties.get("--meetro-safe-vh"), "690px");
  assert.equal(root.properties.get("--meetro-visual-viewport-offset-top"), "58px");
});

test("keyboard-sized visual viewport remains content-sized and safe-area aware", () => {
  const keyboard = safariEnvironment({ visualHeight: 390, offsetTop: 0 });
  const metrics = getDesktopContentMetrics({
    ...keyboard,
    safeAreaInsets: { top: 0, right: 0, bottom: 34, left: 0 },
  });

  assert.equal(metrics.layoutMode, "mobile");
  assert.equal(metrics.visualBottomGap, 454);
  assert.equal(metrics.availableContentHeight, 356);
  assert.equal(metrics.safeAreaBottom, 34);
});

test("persistent mobile controls reserve content space and retire for editable focus", () => {
  assert.match(navigationSource, /className="bottom-nav-content-spacer"/);
  assert.match(
    cssSource,
    /\.bottom-nav-content-spacer \{[\s\S]*height: var\(--meetro-mobile-persistent-control-clearance\)/
  );
  assert.match(
    cssSource,
    /--meetro-mobile-persistent-control-clearance: calc\(var\(--meetro-mobile-bottom-nav-clearance\) \+ 70px\)/
  );
  assert.match(
    navigationSource,
    /editableFocused && heightDifference > 80[\s\S]*else if \(!editableFocused\)[\s\S]*setKeyboardOpen\(false\)/
  );
  assert.match(navigationSource, /root\.dataset\.appKeyboard = keyboardOpen \? "open" : "closed"/);
  assert.match(
    navigationSource,
    /keyboardOpen[\s\S]*\? "0px"[\s\S]*calc\(74px \+ env\(safe-area-inset-bottom, 0px\)\)/
  );
});

test("Ask Meetro yields to external keyboard and composer focus", () => {
  assert.match(assistantSource, /const \[externalKeyboardOpen, setExternalKeyboardOpen\] = useState\(false\)/);
  assert.match(assistantSource, /activeElement\?\.closest\?\.\("\.meetro-assistant-presence"\)/);
  assert.match(assistantSource, /!externalKeyboardOpen && \([\s\S]*className="meetro-assistant-launcher"/);
  assert.match(assistantSource, /wakeOpen && !open && !externalKeyboardOpen/);
  assert.match(assistantSource, /window\.visualViewport\?\.addEventListener\([\s\S]*"resize"/);
});

test("chat and conversation surfaces consume dynamic viewport and bottom-nav authority", () => {
  assert.match(cssSource, /--meetro-visual-viewport-height: 100svh/);
  assert.match(cssSource, /@supports \(height: 100dvh\)[\s\S]*--meetro-visual-viewport-height: 100dvh/);
  assert.match(
    conversationThreadSource,
    /height: "var\(--meetro-safe-vh, 100dvh\)"[\s\S]*minHeight: "var\(--meetro-safe-vh, 100dvh\)"/
  );
  assert.match(conversationSource, /minHeight: "var\(--meetro-safe-vh, 100dvh\)"/);
  assert.match(conversationSource, /bottom: "var\(--meetro-bottom-nav-height, 72px\)"/);
  assert.match(cssSource, /safe-area-inset-bottom/);
});

test("responsive viewport behavior remains capability-based and reload-free", () => {
  const touchedSources = [
    appLayoutSource,
    navigationSource,
    assistantSource,
    conversationSource,
    conversationThreadSource,
  ].join("\n");
  assert.doesNotMatch(
    touchedSources,
    /navigator\.(?:userAgent|maxTouchPoints)|iPhone|iPad|Android/
  );
  assert.doesNotMatch(appLayoutSource, /(?:reload|location\.(?:assign|replace))/);
  assert.match(appLayoutSource, /visualViewport\?\.addEventListener\?\.\("scroll", schedule\)/);
  assert.match(appLayoutSource, /visualViewport\?\.addEventListener\?\.\("resize", schedule\)/);
});
