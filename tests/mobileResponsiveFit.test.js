import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexCssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const bottomNavSource = readFileSync(new URL("../src/components/BottomNav.jsx", import.meta.url), "utf8");
const loginSource = readFileSync(new URL("../src/pages/Login.jsx", import.meta.url), "utf8");
const discoverSource = readFileSync(new URL("../src/pages/Discover.jsx", import.meta.url), "utf8");
const profileSource = readFileSync(new URL("../src/pages/Profile.jsx", import.meta.url), "utf8");
const contractorProfileSource = readFileSync(
  new URL("../src/pages/ContractorProfile.jsx", import.meta.url),
  "utf8"
);
const assistantSource = readFileSync(new URL("../src/components/MeetroAssistant.jsx", import.meta.url), "utf8");
const aiButtonPositionSource = readFileSync(new URL("../src/utils/aiButtonPosition.js", import.meta.url), "utf8");

test("mobile app shell prevents page-level horizontal overflow", () => {
  assert.match(indexCssSource, /html,\s*body,\s*#root[\s\S]*overflow-x: hidden;/);
  assert.match(indexCssSource, /body[\s\S]*-webkit-text-size-adjust: 100%;/);
  assert.match(indexCssSource, /@media \(max-width: 768px\)/);
  assert.match(indexCssSource, /--meetro-mobile-bottom-nav-clearance: calc\(96px \+ env\(safe-area-inset-bottom, 0px\)\);/);
  assert.match(indexCssSource, /\.app-page,[\s\S]*\.meetro-mobile-fit-page[\s\S]*width: 100% !important;[\s\S]*max-width: 100% !important;[\s\S]*min-width: 0 !important;[\s\S]*overflow-x: hidden !important;/);
  assert.match(indexCssSource, /\.app-page \*,[\s\S]*\.meetro-mobile-fit-page \*[\s\S]*min-width: 0;/);
});

test("mobile BottomNav stays compact and desktop sidebar does not activate early", () => {
  assert.match(bottomNavSource, /@media \(min-width: 1180px\) and \(hover: hover\) and \(pointer: fine\)/);
  assert.match(bottomNavSource, /\.bottom-nav-dock \{\n\s+display: none !important;/);
  assert.match(bottomNavSource, /width: "100%"/);
  assert.match(bottomNavSource, /maxWidth: "100%"/);
  assert.match(bottomNavSource, /minWidth: 0/);
  assert.match(bottomNavSource, /overflowX: "hidden"/);
  assert.match(indexCssSource, /\.bottom-nav-dock,[\s\S]*\.bottom-nav-container[\s\S]*max-width: 100% !important;/);
  assert.match(indexCssSource, /\.bottom-nav-item[\s\S]*min-height: 44px !important;/);
});

test("Login signup arrival screen opts into mobile fit containment", () => {
  assert.match(loginSource, /className="meetro-visual-page meetro-mobile-fit-page meetro-auth-arrival-page"/);
  assert.match(loginSource, /width: "100%"/);
  assert.match(loginSource, /overflowX: "hidden"/);
  assert.match(loginSource, /minHeight: "100dvh"/);
  assert.match(indexCssSource, /\.meetro-mobile-fit-page input,[\s\S]*\.meetro-mobile-fit-page textarea[\s\S]*min-height: 44px;/);
});

test("Community Discovery sticky bar is mobile-safe and intentionally scrolls chips only", () => {
  assert.match(discoverSource, /const communityDiscoveryBar = \{/);
  assert.match(discoverSource, /position: "sticky"/);
  assert.match(discoverSource, /top: "calc\(env\(safe-area-inset-top, 0px\) \+ 10px\)"/);
  assert.match(discoverSource, /width: "100%"/);
  assert.match(discoverSource, /maxWidth: "100%"/);
  assert.match(discoverSource, /minWidth: 0/);
  assert.match(discoverSource, /overflowX: "auto"/);
  assert.match(discoverSource, /flexWrap: "nowrap"/);
  assert.match(discoverSource, /padding: "calc\(env\(safe-area-inset-top, 0px\) \+ 64px\) 18px calc\(120px \+ env\(safe-area-inset-bottom, 0px\)\)"/);
  assert.match(discoverSource, /overflowX: "hidden"/);
});

test("Profile and Business Profile use mobile-contained page shells", () => {
  assert.match(profileSource, /: "app-page meetro-readable-page meetro-visual-page"/);
  assert.match(contractorProfileSource, /className="app-page business-profile-page meetro-readable-page"/);
  assert.match(indexCssSource, /\.meetro-readable-page,/);
  assert.match(indexCssSource, /\.business-profile-page,/);
  assert.match(indexCssSource, /\.business-profile-card,[\s\S]*max-width: 100% !important;/);
});

test("Ask Meetro launcher remains clamped inside mobile viewport", () => {
  assert.match(aiButtonPositionSource, /export function clampAiButtonPosition/);
  assert.match(aiButtonPositionSource, /safeAreaLeft/);
  assert.match(aiButtonPositionSource, /safeAreaRight/);
  assert.match(aiButtonPositionSource, /safeAreaTop/);
  assert.match(aiButtonPositionSource, /maxX: Math\.max\(horizontalLeftInset, width - horizontalRightInset - buttonSize\)/);
  assert.match(assistantSource, /const launcherPositionOptions = \{/);
  assert.match(assistantSource, /edgeMargin: ASSISTANT_LAUNCHER_EDGE_MARGIN/);
  assert.match(assistantSource, /writeStoredAiButtonPosition\(position/);
  assert.match(assistantSource, /window\.addEventListener\("resize", handleViewportChange\)/);
  assert.match(assistantSource, /window\.addEventListener\("orientationchange", handleViewportChange\)/);
});
