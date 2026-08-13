import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getDesktopContentMetrics } from "../src/utils/appLayout.js";
import { getCanonicalCurrentJobIdentityKey } from "../src/utils/workCenterCurrentJobListHydration.js";

const appLayoutSource = readFileSync(
  new URL("../src/utils/appLayout.js", import.meta.url),
  "utf8"
);
const navigationSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const assistantSource = readFileSync(
  new URL("../src/components/MeetroAssistant.jsx", import.meta.url),
  "utf8"
);
const dashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);
const cssSource = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);
const portfolioSource = readFileSync(
  new URL("../src/components/PortfolioProjectPresentation.jsx", import.meta.url),
  "utf8"
);
const spotlightSource = readFileSync(
  new URL("../src/pages/Home.jsx", import.meta.url),
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

function metricsAt(width, height) {
  return getDesktopContentMetrics({
    windowObject: {
      innerWidth: width,
      innerHeight: height,
      visualViewport: { width, height, offsetLeft: 0, offsetTop: 0 },
    },
    documentObject: {
      documentElement: { clientWidth: width, clientHeight: height },
    },
    capacitor: {
      isNativePlatform: () => false,
      getPlatform: () => "web",
    },
  });
}

test("responsive capability matrix assigns the intended navigation shell", () => {
  const matrix = [
    { name: "phone portrait", width: 390, height: 844, mode: "mobile" },
    { name: "phone landscape", width: 844, height: 390, mode: "tablet" },
    { name: "tablet portrait", width: 768, height: 1024, mode: "tablet" },
    { name: "tablet landscape", width: 1024, height: 768, mode: "tablet" },
    { name: "wide tablet landscape", width: 1366, height: 1024, mode: "desktop" },
    { name: "desktop", width: 1440, height: 900, mode: "desktop" },
  ];

  for (const viewport of matrix) {
    const metrics = metricsAt(viewport.width, viewport.height);
    assert.equal(metrics.layoutMode, viewport.mode, viewport.name);
    assert.ok(metrics.contentWidth > 0, `${viewport.name} content width`);
    assert.ok(
      metrics.contentWidth <= viewport.width,
      `${viewport.name} bounded content width`
    );
    assert.equal(
      metrics.sidebarWidth > 0,
      viewport.mode !== "mobile",
      `${viewport.name} workspace navigation`
    );
  }
});

test("tablet navigation is capability-based and phone-only bottom navigation is contained", () => {
  assert.match(
    navigationSource,
    /#root\[data-app-layout="tablet"\] \.desktop-sidebar,[\s\S]*display: flex;/
  );
  assert.match(
    navigationSource,
    /#root\[data-app-layout="tablet"\] \.bottom-nav-dock,[\s\S]*display: none !important;/
  );
  assert.match(cssSource, /\.bottom-nav-item \{[\s\S]*min-height: 44px !important;/);
  assert.doesNotMatch(
    appLayoutSource + navigationSource,
    /iPad|iPhone|Android|navigator\.userAgent|maxTouchPoints/
  );
});

test("portrait landscape portrait reflow preserves canonical Job identity without reload", () => {
  const canonicalJob = {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    requestId: 21,
    postId: 21,
    relationshipId: 77,
    jobId: 77,
  };
  const identityBefore = getCanonicalCurrentJobIdentityKey(canonicalJob);
  const portraitBefore = metricsAt(768, 1024);
  const landscape = metricsAt(1024, 768);
  const portraitAfter = metricsAt(768, 1024);

  assert.equal(identityBefore, "request:21:relationship:77");
  assert.equal(getCanonicalCurrentJobIdentityKey(canonicalJob), identityBefore);
  assert.equal(portraitBefore.layoutMode, "tablet");
  assert.equal(landscape.layoutMode, "tablet");
  assert.equal(portraitAfter.layoutMode, "tablet");
  assert.notEqual(portraitBefore.contentWidth, landscape.contentWidth);
  assert.equal(portraitBefore.contentWidth, portraitAfter.contentWidth);
  assert.match(appLayoutSource, /addEventListener\?\.\("orientationchange", schedule\)/);
  assert.doesNotMatch(appLayoutSource, /(?:reload|location\.(?:assign|replace))/);
});

test("Current Job truth and Ask Meetro remain separated at compact breakpoints", () => {
  const tabletAssistantCss = extractCssBlock(
    cssSource,
    "@media (min-width: 768px) and (max-width: 1179px)"
  );
  for (const label of ["Next step", "Who acts next"]) {
    assert.match(dashboardSource, new RegExp(label, "i"));
  }
  assert.match(dashboardSource, /jobDisplayStatus/);
  assert.match(dashboardSource, /jobDisplayBlocker/);
  assert.match(
    assistantSource,
    /!appLayoutMetrics\.desktopMode && currentPage === "contractorDashboard"/
  );
  assert.doesNotMatch(
    tabletAssistantCss,
    /\.meetro-assistant-presence \{[^}]*width: 100% !important/
  );
  assert.match(
    cssSource,
    /@media \(max-width: 1099px\)[\s\S]*\.meetro-job-persistent-context,[\s\S]*\.meetro-current-job-list-card[\s\S]*padding-right: calc\(164px/
  );
});

test("Portfolio and Spotlight keep their shared bounded responsive presentation", () => {
  assert.match(portfolioSource, /export function PortfolioProjectGrid/);
  assert.match(portfolioSource, /aspectRatio: "16 \/ 9"/);
  assert.match(portfolioSource, /width: "100%"/);
  assert.match(spotlightSource, /spotlight/i);
  assert.doesNotMatch(
    portfolioSource + spotlightSource,
    /navigator\.(?:userAgent|maxTouchPoints)|iPad|iPhone|Android/
  );
});
