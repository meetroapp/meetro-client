import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cssSource = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);
const notificationsSource = readFileSync(
  new URL("../src/pages/Notifications.jsx", import.meta.url),
  "utf8"
);
const alertCss = cssSource.slice(cssSource.indexOf("/* Canonical Alert Center"));

test("Alert Center contains the authenticated shell at 320px and 390px", () => {
  assert.match(alertCss, /\.alert-center-page\s*\{[^}]*width:\s*100%/s);
  assert.match(alertCss, /\.alert-center-page\s*\{[^}]*max-width:\s*100%/s);
  assert.match(alertCss, /\.alert-center-page\s*\{[^}]*min-width:\s*0/s);
  assert.match(alertCss, /\.alert-center-page\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(alertCss, /@media \(max-width:\s*480px\)/);
  assert.doesNotMatch(alertCss, /100vw/);
  assert.doesNotMatch(alertCss, /width:\s*(?:320|390)px/);
});

test("cards and long canonical content cannot force horizontal overflow", () => {
  assert.match(alertCss, /\.alert-center-card,[\s\S]*?max-width:\s*100%/);
  assert.match(alertCss, /\.alert-center-card,[\s\S]*?min-width:\s*0/);
  assert.match(alertCss, /\.alert-center-card__message,[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(alertCss, /word-break:\s*break-word/);
  assert.match(alertCss, /white-space:\s*pre-wrap/);
  assert.match(alertCss, /\.alert-center-card__facts\s*>\s*\*\s*\{[^}]*max-width:\s*100%/s);
});

test("filters and action controls remain touch-safe and reflow on narrow screens", () => {
  assert.match(alertCss, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(alertCss, /@media \(min-width:\s*700px\)[\s\S]*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(alertCss, /\.alert-center-filters button,[\s\S]*?min-height:\s*48px/);
  assert.match(alertCss, /\.alert-center-card__actions\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(alertCss, /\.alert-center-card__actions \.alert-center-button,[\s\S]*?width:\s*100%/);
  assert.match(alertCss, /flex-wrap:\s*wrap/);
});

test("safe areas and BottomNav clearance remain explicit in portrait and landscape", () => {
  assert.match(alertCss, /env\(safe-area-inset-top/);
  assert.match(alertCss, /env\(safe-area-inset-right/);
  assert.match(alertCss, /env\(safe-area-inset-bottom/);
  assert.match(alertCss, /env\(safe-area-inset-left/);
  assert.match(alertCss, /safe-area-inset-bottom,\s*0px\) \+ 112px/);
  assert.match(alertCss, /orientation:\s*landscape/);
  assert.match(alertCss, /safe-area-inset-bottom,\s*0px\) \+ 96px/);
  assert.match(notificationsSource, /<BottomNav setPage=\{setPage\} currentPage="notifications" \/>/);
});

test("page controls are semantic and focus-visible without clickable containers", () => {
  assert.match(alertCss, /:focus-visible/);
  assert.match(notificationsSource, /role="tablist"/);
  assert.match(notificationsSource, /role="tab"/);
  assert.match(notificationsSource, /aria-selected=/);
  assert.match(notificationsSource, /aria-busy=/);
  assert.doesNotMatch(notificationsSource, /<div[^>]+onClick=/);
});
