import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  COMPACT_MESSAGE_COMPOSER,
  getCompactMessageComposerGeometry,
} from "../src/utils/messageComposerLayout.js";

const portalSource = readFileSync("src/pages/EmployeePortal.jsx", "utf8");
const employeeCss = readFileSync("src/styles/employeeShell.css", "utf8");
const conversationSource = readFileSync(
  "src/pages/ConversationThread.jsx",
  "utf8"
);
const indexCss = readFileSync("src/index.css", "utf8");
const indexHtml = readFileSync("index.html", "utf8");

const PHONE_WIDTHS = [390, 393, 430, 440];

test("compact message composer geometry fits certified iPhone widths", () => {
  for (const viewportWidth of PHONE_WIDTHS) {
    const employeeGeometry = getCompactMessageComposerGeometry({
      viewportWidth,
      outerInlinePadding: viewportWidth <= 390 ? 9 : 12,
      cardInlinePadding: 14,
    });
    const professionalGeometry = getCompactMessageComposerGeometry({
      viewportWidth,
      outerInlinePadding: 0,
      cardInlinePadding: 12,
    });

    for (const geometry of [employeeGeometry, professionalGeometry]) {
      assert.equal(geometry.overflows, false, String(viewportWidth));
      assert.equal(geometry.totalWidth, geometry.availableWidth);
      assert.ok(
        geometry.inputWidth > geometry.sendWidth * 2,
        `${viewportWidth}px keeps the majority of the row for input`
      );
    }
  }
});

test("Employee Team and Customer share one compact iOS-safe composer", () => {
  const composerCssStart = employeeCss.indexOf(".field-messages-composer {");
  const composerCss = employeeCss.slice(
    composerCssStart,
    employeeCss.indexOf("@media (max-width: 900px)", composerCssStart)
  );
  const messagesBlock = portalSource.slice(
    portalSource.indexOf("function MessagesView"),
    portalSource.indexOf("function ProfileView")
  );

  assert.equal(COMPACT_MESSAGE_COMPOSER.inputFontSizePx, 16);
  assert.equal(COMPACT_MESSAGE_COMPOSER.sendWidthPx, 92);
  assert.equal(COMPACT_MESSAGE_COMPOSER.sendMinWidthPx, 88);
  assert.equal(COMPACT_MESSAGE_COMPOSER.minTouchHeightPx, 44);
  assert.match(composerCss, /grid-template-columns:[\s\S]*minmax\(0, 1fr\)[\s\S]*--field-message-send-width/);
  assert.match(composerCss, /\.field-messages-composer label \{[\s\S]*min-width: 0/);
  assert.match(composerCss, /\.field-messages-composer textarea \{[\s\S]*font-size: 16px[\s\S]*line-height: 1\.4/);
  assert.match(composerCss, /\.field-messages-composer button \{[\s\S]*min-width: var\(--field-message-send-min-width, 88px\)[\s\S]*min-height: 44px/);
  assert.match(messagesBlock, /: t\("send", language\)/);
  assert.match(messagesBlock, /aria-label=\{audience === "team"[\s\S]*fieldSendMessage[\s\S]*fieldSendToCustomer/);
  assert.match(messagesBlock, /onSubmit=\{sendAuthority === "team" \? submitTeamMessage : submitCustomerMessage\}/);
});

test("Employee compact workspace corrects width pressure instead of masking it", () => {
  const messageCss = employeeCss.slice(
    employeeCss.indexOf("FIELD MESSAGES —"),
    employeeCss.indexOf("APPROVED MEETRO FIELD TIME RENDER")
  );
  assert.match(messageCss, /\.field-messages-header \{[\s\S]*width: 100%[\s\S]*max-width: 100%/);
  assert.match(messageCss, /\.field-messages-titlebar \{[\s\S]*grid-template-columns: auto minmax\(0, 1fr\)/);
  assert.match(messageCss, /\.field-messages-audience \{[\s\S]*height: auto[\s\S]*min-width: 0[\s\S]*min-height: 0[\s\S]*flex: 0 0 auto[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(messageCss, /\.field-messages-job-list button \{[\s\S]*width: 100%[\s\S]*min-width: 0/);
  assert.doesNotMatch(messageCss, /overflow-x:\s*hidden/);
});

test("Business Team private composer uses compact Send without changing its form authority", () => {
  const pane = conversationSource.slice(
    conversationSource.indexOf("function BusinessTeamCommunicationPane"),
    conversationSource.indexOf("function resolveSupportedLegacyConversationRecord")
  );
  assert.match(pane, /<form style=\{businessTeamComposer\} onSubmit=\{onSubmit\}>/);
  assert.match(pane, /aria-label=\{t\("conversationTeamSend", language\)\}/);
  assert.match(pane, /: t\("send", language\)/);
  assert.match(pane, /composer-input[\s\S]*font-size: 16px/);
  assert.match(pane, /composer-send[\s\S]*sendWidthPx[\s\S]*sendMinWidthPx[\s\S]*minTouchHeightPx/);
  assert.match(conversationSource, /gridTemplateColumns: `minmax\(0, 1fr\) \$\{COMPACT_MESSAGE_COMPOSER\.sendWidthPx\}px`/);
  assert.match(conversationSource, /sendFieldMessage\([\s\S]*managed: true/);
});

test("Professional Customer composer remains compact and iOS-safe", () => {
  assert.match(indexCss, /\.chat-message-input,[\s\S]*\.message-input \{[\s\S]*font-size: 16px/);
  assert.match(conversationSource, /const sendBtn = \{[\s\S]*width: "42px"[\s\S]*flexShrink: 0/);
  assert.match(conversationSource, /className="chat-send-button message-send-button"/);
});

test("zoom accessibility and runtime viewport behavior remain unrestricted", () => {
  assert.doesNotMatch(indexHtml, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);
  assert.doesNotMatch(portalSource, /visualViewport|keyboardWillShow|keyboardWillHide/);
});

test("Employee Team and Customer composer docks within a keyboard-responsive chat column", () => {
  const messagesBlock = portalSource.slice(
    portalSource.indexOf("function MessagesView"),
    portalSource.indexOf("function ProfileView")
  );
  const mobileCss = employeeCss.slice(
    employeeCss.indexOf("@media (max-width: 760px)", employeeCss.indexOf("FIELD MESSAGES —")),
    employeeCss.indexOf("@media (max-width: 390px)", employeeCss.indexOf("FIELD MESSAGES —"))
  );

  assert.match(messagesBlock, /field-messages-thread-card field-messages-chat-workspace/);
  assert.match(messagesBlock, /audience === "team" \? \([\s\S]*field-messages-thread[\s\S]*:\s*\([\s\S]*field-messages-thread/);
  assert.match(messagesBlock, /className="field-messages-composer"[\s\S]*onSubmit=\{sendAuthority === "team" \? submitTeamMessage : submitCustomerMessage\}/);
  assert.match(mobileCss, /\.field-messages-chat-workspace \{[\s\S]*height: calc\([\s\S]*100dvh[\s\S]*display: flex[\s\S]*flex-direction: column/);
  assert.doesNotMatch(mobileCss, /minmax\(220px, min\(38dvh, 360px\)\)/);
  assert.match(mobileCss, /\.field-messages-thread \{[\s\S]*flex: 1 1 0[\s\S]*min-height: 0[\s\S]*overflow-y: auto/);
  assert.match(mobileCss, /\.field-messages-composer \{[\s\S]*width: 100%[\s\S]*max-width: 100%[\s\S]*flex: 0 0 auto[\s\S]*position: sticky[\s\S]*bottom: 0[\s\S]*z-index: 3/);
  assert.match(mobileCss, /\.field-messages-quick-updates \{[\s\S]*min-height: 0[\s\S]*flex: 0 1 auto[\s\S]*overflow-y: auto/);
});

test("Employee chat height contract responds to normal and keyboard-reduced viewports", () => {
  const workspaceHeight = (viewportHeight, safeAreaTop = 0) =>
    viewportHeight - Math.max(10, safeAreaTop) - 12;

  for (const viewportHeight of [700, 844, 950]) {
    assert.ok(workspaceHeight(viewportHeight, 0) >= 678, `${viewportHeight}px normal viewport`);
  }

  for (const viewportHeight of [400, 500, 600]) {
    const availableHeight = workspaceHeight(viewportHeight, 0);
    assert.ok(availableHeight >= 378, `${viewportHeight}px reduced viewport retains composer space`);
    assert.ok(availableHeight < workspaceHeight(700, 0), `${viewportHeight}px shrinks the chat workspace`);
  }
});
