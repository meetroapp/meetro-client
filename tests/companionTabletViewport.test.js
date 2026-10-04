import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  calculateExpandedPanelPlacement,
  getCompanionLayoutMode,
  getCompanionPreferredPanelWidth,
} from "../src/utils/companionPanelPlacement.js";

const assistantSource = readFileSync(
  new URL("../src/components/MeetroAssistant.jsx", import.meta.url),
  "utf8"
);
const stylesSource = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);

function extractCssBlock(source, marker) {
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `Missing CSS block: ${marker}`);
  const openingBrace = source.indexOf("{", start);
  let depth = 0;

  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] !== "}") continue;
    depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  assert.fail(`Unclosed CSS block: ${marker}`);
}

function assertContained(placement) {
  assert.ok(placement.left >= placement.bounds.left);
  assert.ok(placement.top >= placement.bounds.top);
  assert.ok(placement.left + placement.width <= placement.bounds.right);
  assert.ok(placement.top + placement.maxHeight <= placement.bounds.bottom);
}

test("iPad portrait shifts a right-edge launcher panel fully inward", () => {
  const placement = calculateExpandedPanelPlacement({
    viewport: { width: 768, height: 1024, offsetLeft: 0, offsetTop: 0 },
    launcherRect: { left: 622, top: 790, width: 126, height: 50 },
    safeInsets: { top: 24, right: 0, bottom: 20, left: 0 },
    bottomClearance: 94,
    edgeGap: 14,
    preferredHeight: 520,
    preferredWidth: getCompanionPreferredPanelWidth(768),
  });

  assert.equal(placement.layoutMode, "tablet");
  assert.equal(placement.horizontalPlacement, "left");
  assert.equal(placement.width, 520);
  assertContained(placement);
});

test("wide iPad landscape bounds conversation height and prevents stale portrait overflow", () => {
  const placement = calculateExpandedPanelPlacement({
    viewport: { width: 1100, height: 768, offsetLeft: 0, offsetTop: 0 },
    launcherRect: { left: 954, top: 548, width: 126, height: 50 },
    safeInsets: { top: 20, right: 0, bottom: 20, left: 0 },
    bottomClearance: 94,
    edgeGap: 14,
    preferredHeight: 720,
    preferredWidth: getCompanionPreferredPanelWidth(1100),
  });

  assert.equal(placement.layoutMode, "desktop");
  assert.ok(placement.maxHeight < 720);
  assertContained(placement);
});

test("left top and bottom launch positions choose safe inward placement", () => {
  const base = {
    viewport: { width: 834, height: 1112, offsetLeft: 0, offsetTop: 0 },
    safeInsets: { top: 24, right: 0, bottom: 20, left: 0 },
    bottomClearance: 94,
    edgeGap: 14,
    preferredHeight: 520,
  };
  const leftTop = calculateExpandedPanelPlacement({
    ...base,
    launcherRect: { left: 20, top: 60, width: 126, height: 50 },
  });
  const rightBottom = calculateExpandedPanelPlacement({
    ...base,
    launcherRect: { left: 688, top: 840, width: 126, height: 50 },
  });

  assert.equal(leftTop.horizontalPlacement, "right");
  assert.equal(leftTop.verticalPlacement, "below");
  assert.equal(rightBottom.horizontalPlacement, "left");
  assert.equal(rightBottom.verticalPlacement, "above");
  assertContained(leftTop);
  assertContained(rightBottom);
});

test("visualViewport dimensions and non-zero offsets define containment bounds", () => {
  const placement = calculateExpandedPanelPlacement({
    viewport: { width: 744, height: 900, offsetLeft: 12, offsetTop: 48 },
    launcherRect: { left: 610, top: 760, width: 126, height: 50 },
    safeInsets: { top: 12, right: 8, bottom: 16, left: 8 },
    bottomClearance: 94,
    edgeGap: 14,
    preferredHeight: 520,
  });

  assert.equal(placement.bounds.left, 34);
  assert.equal(placement.bounds.top, 74);
  assert.equal(placement.bounds.right, 734);
  assertContained(placement);
});

test("panel dimensions never exceed narrow mobile viewport", () => {
  const placement = calculateExpandedPanelPlacement({
    viewport: { width: 320, height: 568, offsetLeft: 0, offsetTop: 0 },
    launcherRect: { left: 174, top: 360, width: 126, height: 50 },
    safeInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    bottomClearance: 94,
    edgeGap: 14,
    preferredHeight: 720,
  });

  assert.equal(placement.layoutMode, "mobile");
  assert.equal(placement.width, 292);
  assertContained(placement);
});

test("layout mode uses usable width rather than touch or user agent", () => {
  assert.equal(getCompanionLayoutMode(390), "mobile");
  assert.equal(getCompanionLayoutMode(768), "tablet");
  assert.equal(getCompanionLayoutMode(1024), "tablet");
  assert.equal(getCompanionLayoutMode(1100), "desktop");
  assert.equal(getCompanionLayoutMode(1440), "desktop");
  assert.equal(getCompanionPreferredPanelWidth(390), 388);
  assert.equal(getCompanionPreferredPanelWidth(768), 520);
  assert.equal(getCompanionPreferredPanelWidth(1024), 520);
  assert.equal(getCompanionPreferredPanelWidth(1100), 720);
  assert.equal(getCompanionPreferredPanelWidth(1440), 388);
});

test("expanded placement leaves saved launcher coordinates untouched", () => {
  const launcherRect = Object.freeze({ left: 622, top: 790, width: 126, height: 50 });
  const before = structuredClone(launcherRect);
  calculateExpandedPanelPlacement({
    viewport: { width: 768, height: 1024 },
    launcherRect,
    bottomClearance: 94,
  });
  assert.deepEqual(launcherRect, before);
});

test("iPad CSS uses desktop-style floating hierarchy without pointer detection", () => {
  const tabletAssistantCss = extractCssBlock(
    stylesSource,
    "@media (min-width: 768px) and (max-width: 1179px)"
  );
  assert.match(tabletAssistantCss, /background: transparent !important/);
  assert.match(tabletAssistantCss, /\.meetro-assistant-sheet[\s\S]*border-radius: 28px !important/);
  assert.match(tabletAssistantCss, /overflow-y: auto !important/);
  assert.doesNotMatch(tabletAssistantCss, /data-companion-section[\s\S]*display:\s*none/);
  assert.doesNotMatch(
    tabletAssistantCss,
    /\.meetro-assistant-presence \{[^}]*width: 100% !important/
  );
  assert.doesNotMatch(stylesSource, /iPad|Macintosh|navigator\.userAgent/);
});

test("desktop-style section hierarchy remains shared on tablet", () => {
  const eyebrow = assistantSource.indexOf("assistantEyebrow");
  const title = assistantSource.indexOf("assistantCompanionPanelTitle");
  const guidance = assistantSource.indexOf("companionGuidancePanel");
  const suggestions = assistantSource.indexOf("companionSuggestionPanel");
  const input = assistantSource.indexOf("assistantCompanionInputPlaceholder");
  assert.ok(eyebrow >= 0 && title > eyebrow);
  assert.ok(guidance > title);
  assert.ok(suggestions > guidance);
  assert.ok(input > suggestions);
  assert.match(assistantSource, /lanternContext\.status/);
  assert.match(assistantSource, /assistantCompanionSuggestedActions/);
  assert.match(assistantSource, /data-companion-layout=\{companionLayoutMode\}/);
  assert.match(assistantSource, /data-companion-section="header"/);
  assert.match(assistantSource, /data-companion-section="todays-focus"/);
  assert.match(assistantSource, /data-companion-section="suggested-actions"/);
  assert.match(assistantSource, /data-companion-section="ask-anything"/);
  assert.equal(assistantSource.match(/className={`meetro-assistant-sheet/g)?.length, 1);
});

test("iPad and desktop share one desktop content path while iPhone stays mobile", () => {
  assert.match(assistantSource, /const companionLayoutMode = appLayoutMetrics\.layoutMode/);
  assert.match(assistantSource, /data-companion-viewport-width=\{Math\.round\(companionViewport\.width\)\}/);
  assert.match(assistantSource, /data-companion-panel-mode=\{companionMode\}/);
  assert.doesNotMatch(assistantSource, /navigator\.(?:userAgent|maxTouchPoints)/);
  assert.doesNotMatch(assistantSource, /isTablet|tabletLayout|compactDesktop|hybridMobile/);
});

test("visual viewport and orientation listeners recalculate and clean up", () => {
  assert.match(assistantSource, /visualViewport\?\.width/);
  assert.match(assistantSource, /visualViewport\?\.height/);
  assert.match(assistantSource, /visualViewport\?\.offsetLeft/);
  assert.match(assistantSource, /visualViewport\?\.offsetTop/);
  assert.match(assistantSource, /visualViewport\?\.addEventListener\("resize", handleViewportChange\)/);
  assert.match(assistantSource, /visualViewport\?\.addEventListener\("scroll", handleViewportChange\)/);
  assert.match(assistantSource, /addEventListener\("orientationchange", handleViewportChange\)/);
  assert.match(assistantSource, /visualViewport\?\.removeEventListener\("resize", handleViewportChange\)/);
  assert.match(assistantSource, /visualViewport\?\.removeEventListener\("scroll", handleViewportChange\)/);
  assert.match(assistantSource, /cancelAnimationFrame\(frame\)/);
});
