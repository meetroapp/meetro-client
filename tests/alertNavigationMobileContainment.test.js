import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bottomNavSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const cssSource = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);
const alertCss = cssSource.slice(
  cssSource.indexOf("/* Canonical Alert count badge"),
  cssSource.indexOf("/* R1-05B")
);

function mobileBlock(start, end) {
  return bottomNavSource.slice(
    bottomNavSource.indexOf(start),
    bottomNavSource.indexOf(end)
  );
}

const personalMobile = mobileBlock(
  "const personalMobileNavItems = [",
  "const businessMobileNavItems = ["
);
const businessMobile = mobileBlock(
  "const businessMobileNavItems = [",
  "const personalDesktopNavItems = ["
);

test("both mobile roles contain five direct destinations without standalone Alerts", () => {
  assert.equal((personalMobile.match(/page: "/g) || []).length, 5);
  assert.equal((businessMobile.match(/page: "/g) || []).length, 5);
  assert.equal((personalMobile.match(/page: "notifications"/g) || []).length, 0);
  assert.equal((businessMobile.match(/page: "notifications"/g) || []).length, 0);
  assert.doesNotMatch(personalMobile, /navigationAlerts/);
  assert.doesNotMatch(businessMobile, /navigationAlerts/);
});

test("five items retain bounded practical width at 320px and 390px", () => {
  const horizontalDockPadding = 8;
  for (const viewportWidth of [320, 390]) {
    const itemWidth = (viewportWidth - horizontalDockPadding) / 5;
    assert.ok(itemWidth >= 44, `${viewportWidth}px leaves ${itemWidth}px per item`);
  }

  assert.match(bottomNavSource, /flex: 1/);
});

test("compact labels, touch targets, landscape rules, and safe area remain intact", () => {
  assert.match(bottomNavSource, /minHeight: "50px"/);
  assert.match(bottomNavSource, /const navButtonLandscape = \{\s*minHeight: "40px"/);
  assert.match(bottomNavSource, /const label = \{\s*fontSize: "11px"/);
  assert.match(bottomNavSource, /const labelLandscape = \{\s*fontSize: "10px"/);
  assert.match(bottomNavSource, /env\(safe-area-inset-bottom\)/);
  assert.match(bottomNavSource, /const navDock = \{[\s\S]*width: "auto"/);
  assert.match(cssSource, /\.bottom-nav-dock \{[\s\S]*left: env\(safe-area-inset-left\)/);
  assert.match(cssSource, /\.bottom-nav-dock \{[\s\S]*right: env\(safe-area-inset-right\)/);
});

test("badge dimensions contain 99+ without shifting or blocking navigation", () => {
  assert.match(alertCss, /position: absolute/);
  assert.match(alertCss, /min-width: 20px/);
  assert.match(alertCss, /height: 20px/);
  assert.match(alertCss, /padding: 0 5px/);
  assert.match(alertCss, /box-sizing: border-box/);
  assert.match(alertCss, /white-space: nowrap/);
  assert.match(alertCss, /pointer-events: none/);
  assert.match(alertCss, /right: -7px/);
});

test("005D badge styles introduce no viewport width or overflow masking", () => {
  assert.doesNotMatch(alertCss, /100vw|100dvw/);
  assert.doesNotMatch(alertCss, /overflow-x\s*:\s*hidden|overflow\s*:\s*hidden/);
  assert.doesNotMatch(alertCss, /width\s*:\s*100%/);
});
