import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  APP_DESKTOP_LAYOUT_MIN_WIDTH,
  APP_TABLET_LAYOUT_MIN_WIDTH,
  getAppLayoutSnapshot,
} from "../src/utils/appLayout.js";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const appLayoutSource = readFileSync(new URL("../src/utils/appLayout.js", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const navSource = readFileSync(new URL("../src/components/BottomNav.jsx", import.meta.url), "utf8");
const messagesSource = readFileSync(new URL("../src/pages/MessagesInbox.jsx", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("../src/pages/Home.jsx", import.meta.url), "utf8");
const dashboardSource = readFileSync(new URL("../src/pages/BusinessDashboard.jsx", import.meta.url), "utf8");
const profileSource = readFileSync(new URL("../src/pages/ContractorProfile.jsx", import.meta.url), "utf8");
const companionSource = readFileSync(new URL("../src/components/MeetroAssistant.jsx", import.meta.url), "utf8");
const viewportSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const projectSource = readFileSync(new URL("../ios/App/App.xcodeproj/project.pbxproj", import.meta.url), "utf8");
const plistSource = readFileSync(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8");

function environment(width, visualWidth = width, native = false) {
  return {
    windowObject: {
      innerWidth: width,
      innerHeight: 1024,
      visualViewport: { width: visualWidth, height: 700 },
    },
    documentObject: {
      documentElement: { clientWidth: width, clientHeight: 1024 },
    },
    capacitor: {
      isNativePlatform: () => native,
      getPlatform: () => (native ? "ios" : "web"),
    },
  };
}

test("stable app layout width selects phone tablet and desktop capability tiers", () => {
  assert.equal(APP_TABLET_LAYOUT_MIN_WIDTH, 768);
  assert.equal(APP_DESKTOP_LAYOUT_MIN_WIDTH, 1100);
  assert.equal(getAppLayoutSnapshot(environment(768)).layoutMode, "tablet");
  assert.equal(getAppLayoutSnapshot(environment(834)).layoutMode, "tablet");
  assert.equal(getAppLayoutSnapshot(environment(900)).layoutMode, "tablet");
  assert.equal(getAppLayoutSnapshot(environment(1023)).layoutMode, "tablet");
  assert.equal(getAppLayoutSnapshot(environment(1024)).layoutMode, "tablet");
  assert.equal(getAppLayoutSnapshot(environment(1099)).layoutMode, "tablet");
  assert.equal(getAppLayoutSnapshot(environment(1100)).layoutMode, "desktop");
  assert.equal(getAppLayoutSnapshot(environment(1440)).layoutMode, "desktop");
  assert.equal(getAppLayoutSnapshot(environment(390)).layoutMode, "mobile");
  assert.equal(getAppLayoutSnapshot(environment(700)).layoutMode, "mobile");
});

test("keyboard visual viewport and native touch platform do not force mobile", () => {
  const nativeTablet = getAppLayoutSnapshot(environment(1100, 560, true));
  assert.equal(nativeTablet.layoutWidth, 1100);
  assert.equal(nativeTablet.visualWidth, 560);
  assert.equal(nativeTablet.layoutMode, "desktop");
  assert.equal(nativeTablet.isNative, true);
  assert.equal(nativeTablet.platform, "ios");
});

test("app shell receives diagnostics before render and maintains them", () => {
  for (const attribute of [
    "appLayout",
    "appLayoutWidth",
    "appWindowWidth",
    "appClientWidth",
    "appVisualWidth",
    "appPlatform",
    "appNative",
    "appSidebarWidth",
    "appContentWidth",
  ]) {
    assert.match(mainSource + appSource + appLayoutSource, new RegExp(`dataset\\.${attribute}`));
  }
  assert.match(mainSource, /applyAppLayoutDiagnostics\([\s\S]*rootElement/);
  assert.match(appSource, /startAppLayoutCoordinator\(\{ root, capacitor: Capacitor \}\)/);
  assert.match(appLayoutSource, /addEventListener\?\.\("orientationchange", schedule\)/);
  assert.match(appLayoutSource, /visualViewport\?\.addEventListener\?\.\("resize", schedule\)/);
  assert.match(appLayoutSource, /visualViewport\?\.addEventListener\?\.\("scroll", schedule\)/);
});

test("workspace navigation replaces the phone dock at tablet and desktop widths", () => {
  assert.match(navSource, /\.desktop-sidebar \{\n\s+display: none;/);
  assert.match(navSource, /#root\[data-app-layout="tablet"\] \.desktop-sidebar/);
  assert.match(navSource, /#root\[data-app-layout="desktop"\] \.desktop-sidebar/);
  assert.match(navSource, /#root\[data-app-layout="tablet"\] \.bottom-nav-dock/);
  assert.match(navSource, /#root\[data-app-layout="desktop"\] \.bottom-nav-dock/);
  assert.match(navSource, /#root\[data-app-layout="desktop"\] \.bottom-nav-dock \{\n\s+display: none !important;/);
  assert.doesNotMatch(navSource, /min-width: 1180px\) and \(hover: hover\) and \(pointer: fine\)/);
  assert.match(cssSource, /#root\[data-app-layout="tablet"\],[\s\S]*--meetro-sidebar-width/);
  assert.match(cssSource, /@media \(max-width: 1099px\)/);
});

test("major application areas use desktop structure at iPad width", () => {
  assert.match(homeSource, /#root\[data-app-layout="desktop"\] \.home-community-entry/);
  assert.match(messagesSource, /const isSplitPane = communicationLayout\.mode === "desktop"/);
  assert.match(dashboardSource, /#root\[data-app-layout="desktop"\] \.app-page\.business-dashboard/);
  assert.match(profileSource, /#root\[data-app-layout="desktop"\] \.app-page\.business-profile-page/);
  assert.match(companionSource, /data-companion-layout=\{companionLayoutMode\}/);
  assert.doesNotMatch(messagesSource, /pointer: fine/);
});

test("layout selection never depends on a device family or user agent", () => {
  assert.doesNotMatch(appLayoutSource, /iPad|iPhone|Android|navigator\.userAgent|maxTouchPoints/);
  assert.equal(getAppLayoutSnapshot(environment(844, 844, true)).layoutMode, "tablet");
  assert.equal(getAppLayoutSnapshot(environment(844, 844, false)).layoutMode, "tablet");
});

test("iOS target and viewport support native iPad presentation", () => {
  assert.match(projectSource, /TARGETED_DEVICE_FAMILY = "1,2";/);
  assert.match(plistSource, /<key>UISupportedInterfaceOrientations~ipad<\/key>/);
  assert.match(viewportSource, /width=device-width, initial-scale=1, viewport-fit=cover/);
  assert.doesNotMatch(viewportSource, /width=\d{3}/);
});
