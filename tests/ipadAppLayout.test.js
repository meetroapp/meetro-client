import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  APP_DESKTOP_LAYOUT_MIN_WIDTH,
  APP_DESKTOP_SIDEBAR_MAX_WIDTH,
  APP_DESKTOP_SIDEBAR_MIN_WIDTH,
  APP_TABLET_LAYOUT_MIN_WIDTH,
  getAppLayoutOrientation,
  getAppLayoutSnapshot,
  getAppSidebarWidth,
} from "../src/utils/appLayout.js";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const appLayoutSource = readFileSync(new URL("../src/utils/appLayout.js", import.meta.url), "utf8");
const documentWorkspaceStyles = readFileSync(
  new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url),
  "utf8"
);
const quoteWorkspaceSource = readFileSync(
  new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
  "utf8"
);
const depositWorkspaceSource = readFileSync(
  new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
  "utf8"
);
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

function environment(width, visualWidth = width, native = false, overrides = {}) {
  const layoutHeight = overrides.layoutHeight ?? 1024;
  const visualHeight = overrides.visualHeight ?? 700;
  const windowObject = {
    innerWidth: width,
    innerHeight: layoutHeight,
    visualViewport: {
      width: visualWidth,
      height: visualHeight,
      offsetLeft: overrides.visualOffsetLeft ?? 0,
      offsetTop: overrides.visualOffsetTop ?? 0,
    },
  };

  if (overrides.orientationType) {
    windowObject.screen = {
      width: overrides.screenWidth ?? width,
      height: overrides.screenHeight ?? layoutHeight,
      orientation: { type: overrides.orientationType },
    };
  }
  if (overrides.legacyOrientation !== undefined) {
    windowObject.orientation = overrides.legacyOrientation;
  }

  return {
    windowObject,
    documentObject: {
      documentElement: { clientWidth: width, clientHeight: layoutHeight },
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

test("native tablet orientation follows physical orientation while the keyboard shrinks viewport height", () => {
  const portraitBeforeKeyboard = getAppLayoutSnapshot(environment(768, 768, true, {
    layoutHeight: 1024,
    visualHeight: 1024,
    orientationType: "portrait-primary",
    screenWidth: 768,
    screenHeight: 1024,
  }));
  const portraitWithKeyboard = getAppLayoutSnapshot(environment(768, 768, true, {
    layoutHeight: 430,
    visualHeight: 390,
    orientationType: "portrait-primary",
    screenWidth: 768,
    screenHeight: 1024,
  }));
  const landscapeWithKeyboard = getAppLayoutSnapshot(environment(1024, 1024, true, {
    layoutHeight: 420,
    visualHeight: 360,
    orientationType: "landscape-primary",
    screenWidth: 1024,
    screenHeight: 768,
  }));
  const portraitAfterKeyboard = getAppLayoutSnapshot(environment(768, 768, true, {
    layoutHeight: 1024,
    visualHeight: 1024,
    orientationType: "portrait-primary",
    screenWidth: 768,
    screenHeight: 1024,
  }));

  assert.equal(portraitBeforeKeyboard.orientation, "portrait");
  assert.equal(portraitWithKeyboard.layoutMode, "tablet");
  assert.equal(portraitWithKeyboard.orientation, "portrait");
  assert.equal(portraitAfterKeyboard.orientation, "portrait");
  assert.equal(landscapeWithKeyboard.layoutMode, "tablet");
  assert.equal(landscapeWithKeyboard.orientation, "landscape");
  assert.equal(getAppLayoutOrientation({
    windowObject: { orientation: 0 },
    layoutWidth: 768,
    layoutHeight: 430,
    isNative: true,
  }), "portrait");
  assert.equal(getAppLayoutOrientation({
    windowObject: { orientation: 90 },
    layoutWidth: 1024,
    layoutHeight: 420,
    isNative: true,
  }), "landscape");

  const orientationSource = appLayoutSource.slice(
    appLayoutSource.indexOf("export function getAppLayoutOrientation"),
    appLayoutSource.indexOf("function readSafeAreaInsets")
  );
  assert.doesNotMatch(orientationSource, /visualViewport|visualWidth|visualHeight/);
});

test("visual viewport keyboard geometry includes offsetTop without changing physical orientation", () => {
  const snapshot = getAppLayoutSnapshot(environment(768, 768, true, {
    layoutHeight: 1024,
    visualHeight: 420,
    visualOffsetTop: 60,
    orientationType: "portrait-primary",
    screenWidth: 768,
    screenHeight: 1024,
  }));

  assert.equal(snapshot.visualHeight, 420);
  assert.equal(snapshot.visualOffsetTop, 60);
  assert.equal(snapshot.visualHeight + snapshot.visualOffsetTop, 480);
  assert.equal(snapshot.visualBottomGap, 544);
  assert.equal(snapshot.orientation, "portrait");
  assert.equal(snapshot.layoutMode, "tablet");
});

test("app shell receives diagnostics before render and maintains them", () => {
  for (const attribute of [
    "appLayout",
    "appOrientation",
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

test("tablet document navigation and Deposit split consume keyboard-stable app orientation", () => {
  assert.match(
    documentWorkspaceStyles,
    /#root\[data-app-layout="tablet"\]\[data-app-orientation="portrait"\][^{]*\.desktop-sidebar\s*\{\s*display:\s*none !important;/
  );
  assert.match(
    documentWorkspaceStyles,
    /#root\[data-app-layout="tablet"\]\[data-app-orientation="portrait"\][^{]*\.deposit-request-panel\.mobile-active\s*\{\s*display:\s*grid !important;/
  );
  assert.match(
    documentWorkspaceStyles,
    /#root\[data-app-layout="tablet"\]\[data-app-orientation="landscape"\][^{]*\.deposit-request-main\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 2fr\) 1px minmax\(0, 3fr\)/
  );

  const depositRules = documentWorkspaceStyles.slice(
    documentWorkspaceStyles.indexOf("/* DEPOSIT REQUEST RESPONSIVE DOCUMENT WORKSPACE */")
  );
  assert.doesNotMatch(depositRules, /@media\s*\(orientation:\s*(?:portrait|landscape)\)/);
});

test("Quote and Deposit share one iPad keyboard visible-bottom boundary", () => {
  const sharedBoundaryStart = documentWorkspaceStyles.indexOf(
    '#root[data-app-layout="tablet"][data-app-keyboard="open"]\n  .deposit-request-workspace,'
  );
  const portraitQuoteStart = documentWorkspaceStyles.indexOf(
    '#root[data-app-layout="tablet"][data-app-orientation="portrait"][data-app-keyboard="open"]'
  );
  const sharedBoundary = documentWorkspaceStyles.slice(
    sharedBoundaryStart,
    portraitQuoteStart
  );

  assert.ok(sharedBoundaryStart >= 0);
  assert.ok(portraitQuoteStart > sharedBoundaryStart);
  assert.match(sharedBoundary, /\.deposit-request-workspace,/);
  assert.match(
    sharedBoundary,
    /\.business-document-workspace\[data-active-document="quote"\]/
  );
  assert.match(
    sharedBoundary,
    /block-size:[\s\S]*var\(--meetro-visual-viewport-height, 100dvh\)[\s\S]*var\(--meetro-visual-viewport-offset-top, 0px\)/
  );
  assert.match(sharedBoundary, /min-height:\s*0/);
  assert.match(sharedBoundary, /padding-bottom:\s*0/);
  assert.doesNotMatch(sharedBoundary, /safe-area-inset-bottom/);
  assert.doesNotMatch(sharedBoundary, /orientation/);
  assert.doesNotMatch(sharedBoundary, /\b(?:120|300|350|400)px\b/);

  assert.match(
    quoteWorkspaceSource,
    /data-active-document=\{activeDocument\}/
  );
  assert.match(
    quoteWorkspaceSource,
    /className="business-document-chat-shell"[\s\S]*className="business-document-composer"/
  );
  assert.match(
    quoteWorkspaceSource,
    /const nextHeight = Math\.min\(measuredHeight, 112\)[\s\S]*element\.style\.height = `\$\{nextHeight\}px`/
  );
});

test("Quote iPad portrait contains the composer while landscape keeps the existing split", () => {
  const portraitStart = documentWorkspaceStyles.indexOf(
    '#root[data-app-layout="tablet"][data-app-orientation="portrait"][data-app-keyboard="open"]'
  );
  const portraitEnd = documentWorkspaceStyles.indexOf(
    '#root[data-app-layout="tablet"]\n  .deposit-request-workspace',
    portraitStart
  );
  const portraitKeyboardRules = documentWorkspaceStyles.slice(
    portraitStart,
    portraitEnd
  );
  const wideStart = documentWorkspaceStyles.indexOf("@media (min-width: 901px)");
  const wideEnd = documentWorkspaceStyles.indexOf("@media (max-width: 900px)", wideStart);
  const wideRules = documentWorkspaceStyles.slice(wideStart, wideEnd);
  const keyboardEffect = quoteWorkspaceSource.slice(
    quoteWorkspaceSource.indexOf("keyboardStateRef.current.baselineHeight"),
    quoteWorkspaceSource.indexOf("}, []);", quoteWorkspaceSource.indexOf("keyboardStateRef.current.baselineHeight"))
  );

  assert.match(
    portraitKeyboardRules,
    /grid-template-rows:\s*auto auto auto minmax\(0, 1fr\)/
  );
  assert.match(
    portraitKeyboardRules,
    /\.business-document-main\s*\{[\s\S]*block-size:\s*100%[\s\S]*overflow:\s*hidden/
  );
  assert.match(
    portraitKeyboardRules,
    /\.business-document-conversation\.mobile-active\s*\{[\s\S]*display:\s*flex[\s\S]*overflow:\s*hidden/
  );
  assert.match(
    portraitKeyboardRules,
    /\.business-document-chat-shell\s*\{[\s\S]*block-size:\s*100%[\s\S]*min-height:\s*0/
  );
  assert.match(
    portraitKeyboardRules,
    /\.business-document-turns\s*\{[\s\S]*overflow-y:\s*auto/
  );
  assert.doesNotMatch(portraitKeyboardRules, /\.business-document-composer\s*\{[\s\S]*position:\s*(?:fixed|absolute|sticky)/);
  assert.match(
    documentWorkspaceStyles,
    /\.business-document-composer\s*\{\s*grid-row:\s*3;[\s\S]*position:\s*relative/
  );
  assert.match(
    wideRules,
    /\.business-document-main\.has-evidence\s*\{[\s\S]*grid-template-columns:/
  );
  assert.match(
    wideRules,
    /\.business-document-chat-shell\s*\{[\s\S]*grid-template-rows:\s*minmax\(0, 1fr\) auto auto/
  );
  assert.doesNotMatch(keyboardEffect, /setActiveDocument|setQuote|setInvoice/);
  assert.match(navSource, /root\.dataset\.appKeyboard = keyboardOpen \? "open" : "closed"/);
});

test("Deposit iPad composer is a viewport-owned row outside the independently scrolling editor content", () => {
  const editorStart = depositWorkspaceSource.indexOf(
    'className={`deposit-request-panel deposit-request-editor'
  );
  const editorEnd = depositWorkspaceSource.indexOf(
    'className={`deposit-request-panel deposit-request-preview',
    editorStart
  );
  const editor = depositWorkspaceSource.slice(editorStart, editorEnd);
  const scrollStart = editor.indexOf('className="deposit-request-editor-scroll"');
  const scrollEnd = editor.indexOf('className="deposit-request-composer"');
  const tabletEditorStart = documentWorkspaceStyles.indexOf(
    '#root[data-app-layout="tablet"] .deposit-request-editor {'
  );
  const keyboardBoundaryStart = documentWorkspaceStyles.indexOf(
    '/*\n * visualViewport.offsetTop',
    tabletEditorStart
  );
  const tabletEditorRules = documentWorkspaceStyles.slice(
    tabletEditorStart,
    keyboardBoundaryStart
  );
  const portraitDepositStart = documentWorkspaceStyles.indexOf(
    '#root[data-app-layout="tablet"][data-app-orientation="portrait"] .deposit-request-workspace {'
  );
  const landscapeDepositStart = documentWorkspaceStyles.indexOf(
    '#root[data-app-layout="tablet"][data-app-orientation="landscape"] .deposit-request-main',
    portraitDepositStart
  );
  const portraitDepositRules = documentWorkspaceStyles.slice(
    portraitDepositStart,
    landscapeDepositStart
  );

  assert.ok(editorStart >= 0);
  assert.ok(scrollStart >= 0);
  assert.ok(scrollEnd > scrollStart);
  assert.match(
    editor.slice(scrollStart, scrollEnd),
    /Customize request wording[\s\S]*role="alert"[\s\S]*role="status"/
  );
  assert.match(
    editor.slice(scrollEnd),
    /className="deposit-request-composer"[\s\S]*<textarea rows=\{4\}[\s\S]*>Propose Change</
  );
  assert.match(
    tabletEditorRules,
    /\.deposit-request-editor\s*\{[\s\S]*grid-template-rows:\s*minmax\(0, 1fr\) auto;[\s\S]*overflow:\s*hidden/
  );
  assert.match(
    tabletEditorRules,
    /\.deposit-request-editor-scroll\s*\{[\s\S]*min-height:\s*0;[\s\S]*overflow-y:\s*auto;/
  );
  assert.match(
    tabletEditorRules,
    /\.deposit-request-composer\s*\{[\s\S]*position:\s*relative;[\s\S]*bottom:\s*auto;/
  );
  assert.doesNotMatch(tabletEditorRules, /\.deposit-request-composer\s*\{[\s\S]*position:\s*sticky/);
  assert.match(documentWorkspaceStyles, /\.deposit-request-editor-scroll\s*\{\s*display:\s*contents;/);
  assert.match(documentWorkspaceStyles, /\.deposit-request-composer\s*\{\s*order:\s*1;/);
  assert.match(depositWorkspaceSource, /className="deposit-request-proposal"/);
  assert.match(
    portraitDepositRules,
    /\.deposit-request-workspace\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-rows:\s*auto auto auto minmax\(0, 1fr\);[\s\S]*overflow:\s*hidden;/
  );
  assert.match(
    portraitDepositRules,
    /\.deposit-request-main\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-rows:\s*minmax\(0, 1fr\);[\s\S]*block-size:\s*100%;[\s\S]*overflow:\s*hidden;/
  );
  assert.match(
    portraitDepositRules,
    /\.deposit-request-panel\.mobile-active\s*\{[\s\S]*display:\s*grid !important;[\s\S]*block-size:\s*100%;[\s\S]*min-height:\s*0;/
  );
});

test("Quote quick actions live in the plus menu without a duplicate Quote footer row", () => {
  const trayStart = quoteWorkspaceSource.indexOf(
    'id="business-document-composer-tray"'
  );
  const trayEnd = quoteWorkspaceSource.indexOf(
    '{activeDocument === "invoice" ? (',
    trayStart
  );
  const tray = quoteWorkspaceSource.slice(trayStart, trayEnd);
  const footer = quoteWorkspaceSource.slice(
    trayEnd,
    quoteWorkspaceSource.indexOf("\n        </section>", trayEnd)
  );

  assert.match(quoteWorkspaceSource, /className="business-document-composer-plus"/);
  assert.match(tray, /\? "Add to Quote Notes"/);
  assert.match(tray, /\? "Private Reminder"/);
  assert.match(tray, /: "Change Amount"/);
  assert.match(tray, /runComposerAction\(\(\) => focusComposer\("Note: "\)\)/);
  assert.match(tray, /runComposerAction\(\(\) =>\s*focusComposer\("Keep this private: "\)/);
  assert.match(tray, /runComposerAction\(\(\) =>\s*openManualEditor\("amount"\)/);
  assert.match(footer, /^\{activeDocument === "invoice" \? \(/);
  assert.equal(
    (quoteWorkspaceSource.match(/className="business-document-conversation-footer"/g) || []).length,
    1
  );
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

test("iPad navigation reserves a readable label lane while content yields", () => {
  const portraitSidebarWidth = getAppSidebarWidth(768);
  const landscapeSidebarWidth = getAppSidebarWidth(1024);
  const labelLaneWidth =
    portraitSidebarWidth - 36 - 32 - 20 - 38 - 10;

  assert.equal(APP_DESKTOP_SIDEBAR_MIN_WIDTH, 248);
  assert.equal(portraitSidebarWidth, APP_DESKTOP_SIDEBAR_MIN_WIDTH);
  assert.ok(labelLaneWidth >= 112);
  assert.ok(landscapeSidebarWidth > portraitSidebarWidth);
  assert.ok(1024 - landscapeSidebarWidth > 740);
  assert.equal(getAppSidebarWidth(767), 0);
  assert.equal(getAppSidebarWidth(1180), APP_DESKTOP_SIDEBAR_MAX_WIDTH);
});

test("iPad navigation labels and brand copy never split inside words", () => {
  for (const styleName of [
    "sidebarBrandTitle",
    "sidebarBrandSubtitle",
    "sidebarShortcutHeading",
    "sidebarLabel",
    "sidebarSubLabel",
  ]) {
    const start = navSource.indexOf(`const ${styleName} = {`);
    const block = navSource.slice(start, navSource.indexOf("};", start));

    assert.ok(start >= 0, `${styleName} should exist`);
    assert.match(block, /overflowWrap: "normal"/);
    assert.match(block, /wordBreak: "normal"/);
    assert.match(block, /hyphens: "none"/);
    assert.match(block, /WebkitHyphens: "none"/);
    assert.doesNotMatch(block, /overflowWrap: "(?:anywhere|break-word)"/);
    assert.doesNotMatch(block, /wordBreak: "(?:break-all|break-word)"/);
  }
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
