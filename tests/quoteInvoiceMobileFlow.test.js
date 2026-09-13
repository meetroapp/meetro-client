import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React, { act, useState } from "react";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { applyAppLayoutDiagnostics, getAppLayoutSnapshot } from "../src/utils/appLayout.js";
import { blankQuote, createQuoteMobileFixture, customers, DRAFT, JOB } from "./fixtures/quoteMobileFlow.js";

const MOBILE_VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 428, height: 926 },
];
let dom, vite, createRoot, Workspace;
const globals = new Map();
const pause = () => new Promise((resolve) => setTimeout(resolve, 25));
test.before(async () => {
  dom = new JSDOM('<div id="root"></div>', { url: "http://localhost/#quoteBuilder", pretendToBeVisual: true });
  for (const key of ["window", "document", "navigator", "localStorage", "sessionStorage", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "HTMLTextAreaElement", "Element", "Node", "Event", "CustomEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? dom.window[key].bind(dom.window) : dom.window[key] });
  }
  globals.set("fetch", Object.getOwnPropertyDescriptor(globalThis, "fetch"));
  globalThis.fetch = async () => { throw new Error("No live network in mobile UI tests"); };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  HTMLElement.prototype.scrollIntoView = () => {};
  ({ createRoot } = await import("react-dom/client"));
  vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true, hmr: false }, plugins: [{ name: "quote-mobile-network", enforce: "pre", resolveId(id) { if (/\/authFetch(?:\.js)?$/.test(id)) return "\0quote-mobile-http"; }, load(id) { if (id === "\0quote-mobile-http") return 'export const authFetch = (...args) => globalThis.__quoteMobileHttp(...args); export const clearMeetroSession = () => {}; export const announceAccountConnectionIssue = () => {}; export const handleAuthExpired = () => {};'; } }] });
  ({ default: Workspace } = await vite.ssrLoadModule("/src/components/UnifiedBusinessDocumentWorkspace.jsx"));
});
test.after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 350));
  await vite?.close(); dom?.window.close();
  for (const [key, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  delete globalThis.IS_REACT_ACT_ENVIRONMENT; delete globalThis.__quoteMobileHttp;
});

async function mount(t, { generic = false, quote = blankQuote(), viewport = MOBILE_VIEWPORTS[1] } = {}) {
  // Supply viewport inputs; jsdom does not calculate CSS layout or pixel bounds.
  Object.defineProperty(window, "innerWidth", { value: viewport.width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: viewport.height, configurable: true });
  Object.defineProperty(document.documentElement, "clientWidth", { value: viewport.width, configurable: true });
  Object.defineProperty(document.documentElement, "clientHeight", { value: viewport.height, configurable: true });
  const layout = getAppLayoutSnapshot({ windowObject: window, documentObject: document, capacitor: null });
  applyAppLayoutDiagnostics(document.getElementById("root"), layout);
  localStorage.clear(); localStorage.setItem("activeAccountMode", "business"); localStorage.setItem("language", "en");
  window.history.replaceState({}, "", `#quoteBuilder${generic ? "?new=1" : ""}`);
  const fixture = createQuoteMobileFixture(), routes = [], opened = [];
  globalThis.__quoteMobileHttp = fixture.fetch;
  const root = createRoot(document.getElementById("root"));
  function Harness() {
    const [content, setContent] = useState(quote);
    return React.createElement(Workspace, { quote: content, genericNewQuoteIntent: generic, job: {}, setPage: (route) => routes.push(route), onBack: () => routes.push("back"), onApplyQuotePatch: (patch) => setContent((current) => ({ ...current, ...patch })), onAddPhotos() {}, onDurableDocumentOpened: (document) => opened.push(document) });
  }
  await act(async () => { root.render(React.createElement(Harness)); await pause(); });
  t.after(async () => { await act(async () => { root.unmount(); await pause(); }); });
  async function click(label, scope = document) {
    const button = [...scope.querySelectorAll("button")].find((item) => item.textContent.trim() === label || item.getAttribute("aria-label") === label || item.querySelector("strong")?.textContent === label);
    assert.ok(button, `button ${label} exists`); assert.equal(button.disabled, false, `${label} is enabled`);
    await act(async () => { button.click(); await pause(); });
  }
  async function fill(selector, value) {
    const field = document.querySelector(selector); assert.ok(field, selector);
    await act(async () => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value").set.call(field, value); field.dispatchEvent(new Event(field.tagName === "SELECT" ? "change" : "input", { bubbles: true })); await pause(); });
  }
  async function send(text) { await fill("#business-document-message", text); await click("Send message"); }
  async function savedFiles() {
    await click("Document and workspace actions"); await click("Saved Files", document.querySelector('[role="menu"]'));
    for (let attempt = 0; attempt < 40 && !document.querySelector('.business-saved-results, .business-saved-empty'); attempt++) await act(async () => { await pause(); });
    assert.ok(document.querySelector('.business-saved-results, .business-saved-empty'), "Saved Files finishes its read");
  }
  return { ...fixture, layout, click, fill, send, savedFiles, routes, opened, text: () => document.body.textContent };
}

for (const viewport of MOBILE_VIEWPORTS) test(`mobile portrait ${viewport.width}px selects mobile presentation and renders all six governed states`, async (t) => {
  const w = await mount(t, { generic: true, viewport });
  const root = document.getElementById("root");
  assert.equal(w.layout.layoutWidth, viewport.width);
  assert.equal(w.layout.layoutHeight, viewport.height);
  assert.equal(w.layout.layoutMode, "mobile");
  assert.equal(w.layout.orientation, "portrait");
  assert.equal(root.dataset.appLayout, "mobile");
  assert.equal(root.dataset.appOrientation, "portrait");
  assert.equal(root.dataset.appLayoutWidth, String(viewport.width));
  assert.equal(root.style.getPropertyValue("--meetro-visual-viewport-height"), `${viewport.height}px`);

  // Reach each state through the existing handlers, without assuming CSS visibility.
  function customerSheet(step, title) {
    const dialog = document.querySelector('[role="dialog"][data-dialog-purpose="new-quote-customer-setup-title"]');
    assert.ok(dialog, `${step} dialog renders`);
    assert.equal(dialog.querySelector("h2").textContent, title);
    assert.equal(dialog.querySelector("[data-customer-step]").dataset.customerStep, step);
  }
  customerSheet("CUSTOMER_TYPE", "New Quote");
  assert.match(w.text(), /Who is this Quote for/);
  assert.ok(document.querySelector('.new-quote-dialog-icon .meetro-icon'));
  await w.click("External Customer");
  customerSheet("EXTERNAL_CHOICE", "External Customer");
  assert.match(w.text(), /Choose Existing Customer.*Add New Customer/);
  await w.click("Choose Existing Customer");
  customerSheet("EXTERNAL_EXISTING", "External Customer");
  assert.ok(document.querySelector('.new-quote-customer-search input[type="search"]'));
  assert.equal(document.querySelectorAll('.new-quote-external-list > button').length, customers.length);
  await w.click("Bob Hamel");
  assert.equal(document.querySelector('[data-dialog-purpose="new-quote-customer-setup-title"]'), null);
  assert.ok(document.querySelector('.business-document-conversation.mobile-active'));
  assert.equal(document.querySelector('[role="tab"][aria-selected="true"]').textContent, "Conversation");
  assert.ok(document.querySelector('[aria-label="Ask Meetro about this quote"]'));
  assert.match(document.querySelector('.business-document-header').textContent, /Bob Hamel/);
  await w.send("Window repair, labor 220, materials 60, 50% deposit");
  await w.click("Apply");
  assert.equal(document.querySelector('.business-document-save-status').textContent, "Unsaved changes");
  await w.click("Leave Quote and Invoice workspace");
  const leave = document.querySelector('[role="dialog"][data-dialog-purpose="business-document-exit-title"]');
  assert.ok(leave);
  assert.equal(leave.querySelector("h2").textContent, "Save changes before leaving?");
  assert.deepEqual([...leave.querySelectorAll("footer button")].map((button) => button.textContent), ["Keep Editing", "Discard Changes", "Save Draft & Exit"]);
  await w.click("Keep Editing", leave);
  await w.savedFiles();
  const saved = document.querySelector('.business-saved-drawer');
  assert.ok(saved);
  assert.match(saved.textContent, /Saved Quotes & Invoices/);
  assert.ok(saved.querySelector('.business-saved-search input'));
  assert.equal(saved.querySelectorAll('.business-saved-filters select').length, 3);
  assert.match(saved.querySelector('.business-saved-results').textContent, /Window repair.*Bob Hamel.*Q-0000049/);
  assert.deepEqual(w.routes, []);
  assert.ok(w.calls.every(({ method }) => method === "GET"), "rendering and proposal Apply never save or issue a document");
});

test("New Quote customer sheets support both paths and Back/Cancel without document writes", async (t) => {
  const w = await mount(t, { generic: true });
  assert.match(w.text(), /Who is this Quote for/);
  await w.click("External Customer"); assert.match(w.text(), /Use a saved customer/);
  await w.click("Add New Customer"); assert.ok(document.querySelector('.new-quote-customer-setup form input[required]'));
  await w.click("Back"); await w.click("Back");
  await w.click("Meetro Customer"); await w.click("Jordan Lee");
  await w.click("Kitchen repair"); assert.equal(w.routes.at(-1), `quoteBuilder?jobId=${JOB}`);
  assert.ok(w.calls.every(({ method }) => method === "GET"));
});
test("external search filters authorized rows and selects the exact durable customer without saving", async (t) => {
  const w = await mount(t, { generic: true });
  await w.click("External Customer"); await w.click("Choose Existing Customer");
  assert.equal(document.querySelectorAll('.new-quote-external-list > button').length, 8);
  const reads = w.calls.length;
  await w.fill('.new-quote-customer-search input', '  sarah  ');
  assert.equal(document.querySelectorAll('.new-quote-external-list > button').length, 1);
  assert.equal(w.calls.length, reads);
  await w.fill('.new-quote-customer-search input', 'missing'); assert.match(w.text(), /No customers match/);
  await w.fill('.new-quote-customer-search input', 'BOB'); await w.click("Bob Hamel");
  assert.equal(document.querySelector('[data-dialog-purpose="new-quote-customer-setup-title"]'), null);
  assert.match(document.querySelector('.business-document-header').textContent, /Bob Hamel/);
  assert.ok(w.calls.every(({ method }) => method === "GET"));
  assert.equal(w.opened.length, 0);
});
test("customer chooser Back resets only search and Cancel leaves the initial new flow cleanly", async (t) => {
  const w = await mount(t, { generic: true });
  await w.click("External Customer"); await w.click("Choose Existing Customer");
  await w.fill('.new-quote-customer-search input', 'Sarah'); await w.click("Back");
  await w.click("Choose Existing Customer"); assert.equal(document.querySelector('.new-quote-customer-search input').value, "");
  await w.click("Back"); await w.click("Back"); await w.click("Cancel");
  assert.deepEqual(w.routes, ["back"]); assert.ok(w.calls.every(({ method }) => method === "GET"));
});
test("real conversation proposal, Apply, Edit and revision history retain private working-draft semantics", async (t) => {
  const w = await mount(t);
  assert.equal(document.querySelector('.business-document-save-status').textContent, "Working draft");
  await w.send("Window repair, labor 220, materials 60, 50% deposit");
  await w.click("Apply");
  assert.match(w.text(), /Quote proposal applied to the unsaved working document. Nothing was saved or sent./);
  assert.equal(document.querySelector('.business-document-save-status').textContent, "Unsaved changes");
  await w.click("Edit", document.querySelector('article.you'));
  await w.fill('[aria-label="Edit prior instruction"]', 'Window repair, labor 220, materials 160, 50% deposit');
  await w.click("Save", document.querySelector('.business-document-turn-editor')); await w.click("Apply");
  const revision = document.querySelector('article.you details'); assert.ok(revision);
  assert.match(revision.textContent, /materials 60/); assert.match(document.querySelector('article.you').textContent, /Edited/);
  await w.click("Preview", document.querySelector('[aria-label="Workspace view"]'));
  assert.ok(document.querySelector('.business-document-preview.mobile-active'));
  await w.click("Conversation", document.querySelector('[aria-label="Workspace view"]'));
  assert.ok(document.querySelector('.business-document-conversation.mobile-active'));
  assert.ok(w.calls.every(({ method }) => method === "GET"));
});
test("Quote, Deposit Request and Invoice tabs retain their existing workspace selection", async (t) => {
  const w = await mount(t);
  for (const text of ["Quote", "Deposit Request", "Invoice"]) assert.ok([...document.querySelectorAll('.business-document-tabs button')].some((button) => button.textContent.trim() === text));
  await w.click("Invoice", document.querySelector('.business-document-tabs'));
  assert.equal(document.querySelector('.business-document-workspace').dataset.activeDocument, "invoice");
  assert.ok(document.querySelector('[aria-label="Ask Meetro about this invoice"]'));
  await w.click("Quote", document.querySelector('.business-document-tabs'));
  await w.click("Deposit Request", document.querySelector('.business-document-tabs'));
  assert.ok(document.querySelector('.deposit-request-workspace'));
  assert.ok(w.calls.every(({ method }) => method === "GET"));
});
for (const action of ["Keep Editing", "Discard Changes", "Save Draft & Exit"]) test(`leave guard: ${action} executes the existing handler`, async (t) => {
  const w = await mount(t, { quote: { ...blankQuote(), projectTitle: "Window repair", customerName: customers[0].displayName } });
  await w.click("Leave Quote and Invoice workspace");
  const dialog = document.querySelector('[data-dialog-purpose="business-document-exit-title"]'); assert.ok(dialog);
  assert.match(dialog.textContent, /does not send or issue anything/);
  await w.click(action, dialog);
  if (action === "Keep Editing") { assert.equal(w.routes.length, 0); assert.equal(document.querySelector('[data-dialog-purpose="business-document-exit-title"]'), null); }
  else assert.equal(w.routes.at(-1), "back");
  const writes = w.calls.filter(({ method }) => method !== "GET");
  assert.equal(writes.length, action === "Save Draft & Exit" ? 1 : 0);
  if (writes.length) { assert.equal(writes[0].path, "/business-document-drafts"); assert.equal(writes[0].method, "POST"); assert.equal(JSON.parse(writes[0].body).documentType, "QUOTE"); }
});
test("Saved Files preserves submitted search/type/time and opens the exact server draft", async (t) => {
  const w = await mount(t); await w.savedFiles();
  assert.match(document.querySelector('.business-saved-drawer').textContent, /Saved Quotes & Invoices/);
  await w.fill('.business-saved-search input', 'Bob');
  await w.fill('.business-saved-filters label:first-child select', 'QUOTE');
  await w.fill('.business-saved-filters label:last-child select', '30D');
  await w.click("Search", document.querySelector('.business-saved-drawer'));
  const request = w.calls.filter(({ path }) => path.startsWith('/business-document-drafts?')).at(-1);
  const parameters = new URLSearchParams(request.path.split('?')[1]);
  assert.equal(parameters.get('search'), 'Bob'); assert.equal(parameters.get('type'), 'QUOTE'); assert.equal(parameters.get('time'), '30D'); assert.equal(parameters.get('status'), 'WORKING_DRAFT');
  assert.equal(document.querySelector('.business-saved-filters select:disabled').value, 'WORKING_DRAFT');
  await w.click("Window repair", document.querySelector('.business-saved-results'));
  assert.equal(w.opened.at(-1)?.id, DRAFT);
  assert.ok(w.calls.every(({ method }) => method === "GET"));
});
test("Archive Draft keeps confirmation and exact version; cancel makes no mutation", async (t) => {
  const w = await mount(t); await w.savedFiles();
  await w.click("Archive Draft", document.querySelector('.business-saved-results'));
  await w.click("Cancel", document.querySelector('[data-dialog-purpose="business-document-delete-title"]'));
  assert.ok(w.calls.every(({ method }) => method === "GET"));
  await w.click("Archive Draft", document.querySelector('.business-saved-results'));
  await w.click("Archive Draft", document.querySelector('[data-dialog-purpose="business-document-delete-title"]'));
  const writes = w.calls.filter(({ method }) => method !== "GET");
  assert.equal(writes.length, 1); assert.equal(writes[0].method, "DELETE"); assert.equal(writes[0].path, `/business-document-drafts/${DRAFT}`);
  assert.deepEqual(JSON.parse(writes[0].body), { expectedVersion: 1 }); assert.equal(w.documents.has(DRAFT), false);
});
test("mobile redesign stays portrait-scoped and uses existing keyboard viewport authority", () => {
  const css = readFileSync('src/components/QuoteInvoiceMobileFlow.css', 'utf8');
  assert.match(css, /@media \(max-width: 767px\) and \(orientation: portrait\)/);
  assert.match(css, /#root\[data-app-layout="mobile"\]/);
  assert.match(css, /--meetro-visual-viewport-height/);
  assert.match(css, /min-height: 48px/); assert.match(css, /border-radius: 24px/);
  assert.match(css, /:has\(\[data-customer-step="EXTERNAL_EXISTING"\]\)/);
  assert.match(css, /height: var\(--meetro-visual-viewport-height, 100dvh\)/);
  assert.match(css, /business-saved-filters \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /business-document-composer-row textarea \{ min-height: 44px; height: 44px/);
});
