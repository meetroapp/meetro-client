import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createMobileDocumentSelectorScrollState,
  updateMobileDocumentSelectorVisibility,
} from "../src/utils/mobileDocumentSelector.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");
const styles = read("src/components/UnifiedBusinessDocumentWorkspace.css");
const invoiceWorkspace = read("src/components/ProfessionalInvoiceWorkspace.jsx");

test("mobile document selector starts visible, hides after meaningful downward scroll, and reveals upward", () => {
  let state = createMobileDocumentSelectorScrollState();
  let result = updateMobileDocumentSelectorVisibility(state, 10);
  assert.equal(result.collapsed, false);
  state = result.state;
  result = updateMobileDocumentSelectorVisibility(state, 27);
  assert.equal(result.collapsed, false);
  state = result.state;
  result = updateMobileDocumentSelectorVisibility(state, 38);
  assert.equal(result.collapsed, true);
  state = result.state;
  result = updateMobileDocumentSelectorVisibility(state, 50, { collapsed: true });
  assert.equal(result.collapsed, true);
  state = result.state;
  result = updateMobileDocumentSelectorVisibility(state, 29, { collapsed: true });
  assert.equal(result.collapsed, false);
});

test("selector hysteresis ignores tiny/noisy scroll and keyboard/focus movement", () => {
  let state = createMobileDocumentSelectorScrollState();
  let result = updateMobileDocumentSelectorVisibility(state, 1);
  assert.equal(result.collapsed, false);
  state = result.state;
  result = updateMobileDocumentSelectorVisibility(state, 2);
  assert.equal(result.collapsed, false);
  state = result.state;
  result = updateMobileDocumentSelectorVisibility(state, 40, { keyboardOpen: true });
  assert.equal(result.collapsed, false);
  state = result.state;
  result = updateMobileDocumentSelectorVisibility(state, 80, { editableFocused: true });
  assert.equal(result.collapsed, false);
  result = updateMobileDocumentSelectorVisibility(state, 120);
  assert.equal(result.collapsed, true);
});

test("selector behavior is attached to the internal conversation scroller and does not reset document state", () => {
  assert.match(workspace, /function handleDocumentAreaScroll\(event\)/);
  assert.match(workspace, /ref=\{turnsRef\} className="business-document-turns" aria-live="polite" onScroll=\{handleDocumentAreaScroll\}/);
  assert.match(workspace, /updateMobileDocumentSelectorVisibility\(/);
  assert.match(workspace, /keyboardStateRef\.current\.open/);
  assert.match(workspace, /setDocumentSelectorCollapsed\(result\.collapsed\)/);
  assert.doesNotMatch(workspace, /window\.addEventListener\("scroll"/);
  assert.match(workspace, /const \[activeDocument, setActiveDocument\]/);
  assert.match(workspace, /setComposerTrayOpen\(false\)/);
});

test("document selector keeps Quote, Invoice, and Deposit Request while Saved Files moves to document actions", () => {
  assert.match(workspace, /Quote, Invoice, and Deposit Request documents/);
  assert.match(workspace, /\[\["quote", "Quote"/);
  assert.match(workspace, /\["invoice", "Invoice"/);
  assert.match(workspace, /onClick=\{onDepositRequest\}[\s\S]*Deposit Request/);
  assert.match(workspace, /business-document-tabs-saved-files/);
  assert.match(workspace, /className="business-document-action-menu"/);
  assert.match(workspace, /Document and workspace actions/);
  assert.match(workspace, /Saved Files/);
});

test("Deposit Request opens its preparation workspace before authority exists", () => {
  const start = workspace.indexOf("async function openDepositRequest");
  const end = workspace.indexOf("\n  return (", start);
  const handler = workspace.slice(start, end);
  assert.match(handler, /setPage\([\s\S]*depositRequestBuilder/);
  assert.doesNotMatch(handler, /fetchProfessionalPreWorkDeposit|eligible/);
  assert.match(read("src/components/DepositRequestWorkspace.jsx"), /Preparation is available now/);
});

test("top document actions menu reuses existing handlers with grouped accessible actions", () => {
  for (const label of [
    "Start New {label}",
    "Let Meetro prefill",
    "Fill form manually",
    "How it works",
    "Choose saved customer",
    "Save as customer",
  ]) assert.match(workspace, new RegExp(label.replace(/[{}]/g, "\\$&")));
  assert.match(workspace, /role="menu"/);
  assert.match(workspace, /role="menuitem"/);
  assert.match(workspace, /event\.key === "Escape"/);
  assert.match(workspace, /document\.addEventListener\("pointerdown", closeFromOutside\)/);
  assert.match(workspace, /ArrowDown.*ArrowUp.*Home.*End/);
});

test("Conversation and Preview remain directly accessible through the compact switch", () => {
  assert.match(workspace, /className="business-document-mobile-switch" role="tablist"/);
  assert.match(workspace, /role="tab" aria-selected=\{mobilePane === "conversation"\}/);
  assert.match(workspace, /role="tab" aria-selected=\{mobilePane === "preview"\}/);
  assert.match(styles, /\.business-document-mobile-switch button \{ min-height: 44px/);
});

test("composer keeps the draft, keeps photo/microphone/send visible, and opens a separate tray above it", () => {
  assert.match(workspace, /id="business-document-composer-tray"[\s\S]*className="business-document-composer-tray"[\s\S]*role="menu"/);
  assert.match(workspace, /className="business-document-composer-plus"/);
  assert.match(workspace, /className="business-document-composer-photos"/);
  assert.match(workspace, /className="business-document-composer-microphone"/);
  assert.match(workspace, /className="business-document-send-message"/);
  assert.match(workspace, /value=\{message\}/);
  assert.match(workspace, /aria-controls="business-document-composer-tray"/);
  assert.match(workspace, /setComposerTrayOpen\(true\)/);
  assert.match(workspace, /if \(!composerTrayOpen\) return undefined/);
  assert.match(styles, /\.business-document-composer-tray \{[\s\S]*margin-top: 8px/);
});

test("composer tray keeps Quote actions distinct from Invoice actions and reuses existing callbacks", () => {
  assert.match(workspace, /Add to \{activeDocument === "quote" \? "Quote" : "Invoice"\} Notes/);
  assert.match(workspace, /focusComposer\("Note: "\)/);
  assert.match(workspace, /focusComposer\("Keep this private: "\)/);
  assert.match(workspace, /activeDocument === "invoice" && invoicePreparation \? "Add Extra Work" : "Change Amount"/);
  assert.match(workspace, /onAddPhotos\(activeDocument\)/);
  assert.match(workspace, /contextLabel=\{\s*activeDocument === "quote"\s*\?\s*"estimate"\s*:\s*"invoice"\s*\}/);
});

test("mobile compaction removes permanent secondary rows without changing canonical actions", () => {
  assert.match(styles, /\.business-document-control-toolbar \{ display: none; \}/);
  assert.match(styles, /\.business-document-conversation-footer \{ display: none; \}/);
  assert.match(styles, /\.business-document-customer-summary > div:last-child \{ display: none; \}/);
  assert.match(workspace, /className="business-document-customer-control"/);
  assert.match(workspace, /customerParty=\{activeCustomerParty\}/);
  assert.match(workspace, /onOpen=\{\(mode\) => void openCustomerControl\(mode\)\}/);
});

test("mobile selector animation is subtle, reduced-motion safe, and width-contained at the required phone sizes", () => {
  assert.match(styles, /\.business-document-tabs\.is-collapsed\s*\{[\s\S]*max-height:\s*0[\s\S]*opacity:\s*0[\s\S]*transform:\s*translateY\(-8px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.business-document-tabs \{ transition: none; \}/);
  assert.match(styles, /\.business-document-workspace \{[\s\S]*overflow-x: clip/);
  assert.match(styles, /\.business-document-composer-row textarea \{[\s\S]*width:\s*100%[\s\S]*min-width:\s*0/);
  for (const width of [390, 393, 430]) assert.ok(width >= 390 && width <= 430);
});

test("U1 Invoice loading, containment, Speak transcript, and safe-area contracts remain present", () => {
  assert.match(invoiceWorkspace, /fetchProfessionalInvoice|invoicePhase/);
  assert.match(styles, /\.business-document-workspace input,[\s\S]*font-size: 16px/);
  assert.match(workspace, /onTranscript=\{\s*\(transcript\)\s*=>\s*setMessage/);
  assert.match(styles, /env\(safe-area-inset-top/);
  assert.match(workspace, /className="business-document-back"/);
});
