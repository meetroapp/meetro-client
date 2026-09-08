import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createServer } from "vite";

const CONTACT = "11111111-1111-4111-8111-111111111111";
const RELATIONSHIP = "22222222-2222-4222-8222-222222222222";
const contact = { id: CONTACT, displayName: "Bob Hamel", email: "bob@example.test", phone: "555-0101", address: "12 Oak Street", status: "ACTIVE", roles: [{ role: "CUSTOMER", active: true }], version: 1 };
const relationship = { id: RELATIONSHIP, businessContactId: CONTACT, contractorProfileId: 7, version: 1 };

function savedFile(documentType, projectTitle) {
  return {
    id: randomUUID(), documentType, status: "WORKING_DRAFT", reference: "WDR-ABCDEF12",
    documentNumber: documentType === "DEPOSIT_REQUEST" ? null : `${documentType === "QUOTE" ? "Q" : "INV"}-0000100`,
    jobId: null, version: 1, createdAt: "2026-09-07T12:00:00Z", updatedAt: "2026-09-07T12:00:00Z",
    content: { projectTitle, customerName: "Saved customer" }, customerParty: null,
    customerDisplayName: "Saved customer", photos: [],
    workspace: { activeDocument: documentType, instructions: [], manualOverrides: {}, privateReminders: [] },
  };
}

function savedDeposit() {
  const jobId = randomUUID(), paymentRequirementId = randomUUID();
  return { ...savedFile("DEPOSIT_REQUEST", "Deposit must not appear"), jobId, paymentRequirementId,
    depositRequestAuthority: {
      jobId, paymentRequirementId, relationshipId: 341, quoteId: randomUUID(), issuedQuoteVersion: 13,
      customerDecisionId: randomUUID(), state: "DUE", currency: "USD", quoteTotalMinor: 68000,
      requiredMinor: 51000, appliedMinor: 0, remainingMinor: 51000, latestVersion: 1,
      quoteReference: "Q-0000001", depositRule: { type: "PERCENT", percentBasisPoints: 7500, fixedMinor: null },
    },
  };
}

let dom, vite, createRoot;
const savedGlobals = new Map();
const pause = () => new Promise((resolve) => setTimeout(resolve, 25));

test.before(async () => {
  dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "http://localhost/#quoteBuilder?new=1", pretendToBeVisual: true });
  for (const name of ["window", "document", "localStorage", "navigator", "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "Element", "Node", "Event", "CustomEvent", "MouseEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    savedGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: typeof dom.window[name] === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(name) ? dom.window[name].bind(dom.window) : dom.window[name] });
  }
  savedGlobals.set("fetch", Object.getOwnPropertyDescriptor(globalThis, "fetch"));
  globalThis.fetch = async () => { throw new Error("Integration tests must not access a live service"); };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  ({ createRoot } = await import("react-dom/client"));
  vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true, hmr: false }, plugins: [{
    name: "quote-entry-test-ports", enforce: "pre",
    resolveId(id) {
      if (/\/authFetch(?:\.js)?$/.test(id)) return "\0quote-test-http";
      if (/\/BottomNav(?:\.jsx)?$/.test(id)) return "\0quote-test-nav";
    },
    load(id) {
      if (id === "\0quote-test-http") return 'export const authFetch = (...args) => globalThis.__quoteEntryHttp(...args); export const clearMeetroSession = () => {}; export const announceAccountConnectionIssue = () => {}; export const handleAuthExpired = () => {};';
      if (id === "\0quote-test-nav") return 'export default function BottomNav() { return null; }';
    },
    transform(code, id) {
      if (id.endsWith("/src/pages/QuoteBuilder.jsx")) return code.replace("const unifiedWorkspaceEnabled = true;", "globalThis.__quoteEntrySnapshot = { quote: unifiedQuoteDraft, canonicalJobId, request }; const unifiedWorkspaceEnabled = true;");
      if (id.endsWith("/src/components/UnifiedBusinessDocumentWorkspace.jsx")) return code.replace("const activeDirty = dirty[activeDocument];", "globalThis.__quoteWorkspaceSnapshot = { invoice, invoiceBaseline, dirty, workingDocumentIntent, savedDocuments, invoiceCreateState, savedDocumentsRef, pendingInvoiceProposal, privateReminders, customerParties, documentJobIds }; const activeDirty = dirty[activeDocument];");
    },
  }] });
});

test.after(async () => {
  await vite?.close();
  dom?.window.close();
  for (const [name, descriptor] of savedGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  delete globalThis.__quoteEntrySnapshot;
  delete globalThis.__quoteEntryHttp;
  delete globalThis.__quoteWorkspaceSnapshot;
});

async function mount(t, { route = "quoteBuilder?new=1", stored = {}, initialDocument = "quote", listExtras = [], workspaceProps = null } = {}) {
  window.history.replaceState({}, "", `#${route}`);
  localStorage.clear();
  localStorage.setItem("activeAccountMode", "business");
  localStorage.setItem("language", "en");
  for (const [key, value] of Object.entries(stored)) localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  const calls = [], documents = [], navigations = [];
  let numberAllocations = 0;
  globalThis.__quoteEntryHttp = async (endpoint, options = {}) => {
    const method = options.method || "GET";
    const url = new URL(endpoint, "http://localhost");
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ method, path: url.pathname, type: url.searchParams.get("type"), search: url.searchParams.get("search"), body });
    let data;
    if (url.pathname === "/my-contractor-profile") data = { profile: { id: 7 } };
    else if (url.pathname === "/business-contacts") data = { contacts: [contact] };
    else if (url.pathname.startsWith("/business-contacts/")) data = { contact };
    else if (url.pathname.startsWith("/business-customer-relationships")) data = { relationships: [relationship], relationship };
    else if (url.pathname === "/business-document-drafts" && method === "POST") {
      numberAllocations++;
      const document = { ...body, id: randomUUID(), status: "WORKING_DRAFT", reference: "INTERNAL-ONLY", documentNumber: `${body.documentType === "QUOTE" ? "Q" : "INV"}-${String(numberAllocations).padStart(7, "0")}`, version: 1, createdAt: "2026-09-07T12:00:00Z", updatedAt: "2026-09-07T12:00:00Z" };
      documents.push(document); data = { document };
    } else if (url.pathname === "/business-document-drafts") data = { documents: [...documents.filter((doc) => doc.status === "WORKING_DRAFT" && (!url.searchParams.get("type") || doc.documentType === url.searchParams.get("type"))), ...listExtras] };
    else if (url.pathname.startsWith("/business-document-drafts/") && method === "DELETE") {
      const document = documents.find((doc) => url.pathname.endsWith(`/${doc.id}`));
      assert.ok(document);
      assert.deepEqual(body, { expectedVersion: document.version });
      document.status = "ARCHIVED";
      data = { deletedDraftId: document.id };
    }
    else if (/^\/business-document-drafts\/[^/]+$/.test(url.pathname) && method === "GET") {
      const found = [...documents, ...listExtras].find((doc) => url.pathname.endsWith(`/${doc.id}`));
      if (!found) return { response: { ok: false, status: 404 }, data: { success: false } };
      data = { document: found };
    }
    else if (url.pathname.endsWith("/deliveries")) data = { deliveries: [] };
    else return { response: { ok: false, status: 404 }, data: { success: false, message: `Test has no authority for ${endpoint}` } };
    return { response: { ok: true, status: 200 }, data: { success: true, ...data } };
  };
  const { default: QuoteBuilder } = await vite.ssrLoadModule(workspaceProps ? "/src/components/UnifiedBusinessDocumentWorkspace.jsx" : initialDocument === "invoice" ? "/src/pages/InvoiceBuilder.jsx" : "/src/pages/QuoteBuilder.jsx");
  const root = createRoot(document.getElementById("root"));
  t.after(async () => { await act(async () => root.unmount()); });
  await act(async () => { root.render(React.createElement(QuoteBuilder, { ...(workspaceProps ? { quote: {}, onApplyQuotePatch() {}, ...workspaceProps } : {}), initialDocument, setPage: (page) => navigations.push(page) })); await pause(); });
  const text = () => document.body.textContent;
  async function click(label) {
    const buttons = [...document.querySelectorAll("button")];
    const button = buttons.find((button) => button.textContent.trim() === label || button.querySelector("strong")?.textContent === label || button.getAttribute("aria-label") === label);
    assert.ok(button, `button ${label}: ${buttons.map((button) => button.textContent.trim()).join(" | ")}`);
    assert.equal(button.disabled, false, `${label} enabled`);
    await act(async () => { button.click(); await pause(); });
    // Saved Files resolves after an effect; wait for its observable loading state.
    for (let attempt = 0; attempt < 40 && text().includes("Loading saved documents…"); attempt++) {
      await act(async () => { await pause(); });
    }
    assert.doesNotMatch(text(), /Loading saved documents…/, "Saved Files finished loading");
  }
  async function selectCustomer() {
    await click("External Customer");
    await click("Choose Existing Customer");
    const option = [...document.querySelectorAll("button")].find((button) => button.textContent.includes(contact.displayName));
    assert.ok(option, text());
    await act(async () => { option.click(); await pause(); });
  }
  async function edit(fields) {
    await click("Fill the form manually");
    for (const [name, value] of Object.entries(fields)) {
      const input = document.querySelector(`[data-quote-safety-field="${name}"] input, [data-quote-safety-field="${name}"] textarea`);
      assert.ok(input, `editable ${name}`);
      const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      await act(async () => {
        Object.getOwnPropertyDescriptor(prototype, "value").set.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    await click("Apply changes");
  }
  async function instruct(value) {
    const input = document.querySelector(".business-document-composer textarea");
    assert.ok(input, "composer exists");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click("Send message");
  }
  async function followNavigation() {
    const page = navigations.at(-1);
    assert.ok(page, "a destination was requested");
    window.history.replaceState({}, "", `#${page}`);
    const { default: Target } = await vite.ssrLoadModule(page.startsWith("invoiceBuilder") ? "/src/pages/InvoiceBuilder.jsx" : "/src/pages/QuoteBuilder.jsx");
    await act(async () => { root.render(React.createElement(Target, { key: page, setPage: (next) => navigations.push(next) })); await pause(); });
  }
  return { calls, documents, navigations, click, edit, instruct, followNavigation, selectCustomer, text, allocations: () => numberAllocations, snapshot: () => globalThis.__quoteEntrySnapshot, workspace: () => globalThis.__quoteWorkspaceSnapshot };
}

test("real generic QuoteBuilder ignores stale request/revision/active Job state and starts unnumbered", async (t) => {
  const w = await mount(t, { stored: {
    selectedQuoteRequest: { quoteNumber: "Q-OLD", title: "Stale Quote", customerName: "Wrong customer" },
    selectedWorkCenterRequest: { title: "Stale work", customerName: "Wrong customer" },
    selectedHomeownerRequest: { title: "Stale homeowner" },
    meetroRevisedQuoteContext: { source: "workflow_change_request", projectTitle: "Stale revision" },
    activeJobService: "Scheduled Estimate Visit", activeJobCustomer: "Wrong customer",
  } });
  assert.equal(w.snapshot().quote.quoteNumber, "");
  assert.equal(w.snapshot().canonicalJobId, "");
  assert.equal(w.snapshot().quote.projectTitle, "");
  assert.deepEqual(w.snapshot().request, {});
  assert.doesNotMatch(w.text(), /Scheduled Estimate Visit|Wrong customer|Q-OLD/);
  assert.equal(localStorage.getItem("selectedQuoteRequest"), null);
  assert.equal(localStorage.getItem("meetroRevisedQuoteContext"), null);
  assert.equal(w.documents.length, 0);
  assert.equal(w.allocations(), 0);
});

test("real External selection populates QuoteBuilder snapshot and creates no document until deliberate Quote Save", async (t) => {
  const w = await mount(t);
  await w.selectCustomer();
  assert.equal(w.snapshot().quote.customerName, contact.displayName);
  assert.equal(w.snapshot().quote.customerEmail, contact.email);
  assert.equal(w.snapshot().quote.customerPhone, contact.phone);
  assert.equal(w.snapshot().quote.customerAddress, contact.address);
  assert.equal(w.snapshot().quote.customerLocation, contact.address);
  assert.equal(w.snapshot().quote.quoteNumber, "");
  assert.equal(w.documents.length, 0);
  assert.equal(w.allocations(), 0);
  assert.doesNotMatch(w.text(), /Saved ·|Scheduled Estimate Visit/);
  await w.click("Saved Files");
  assert.match(w.text(), /No saved documents match/);
  assert.deepEqual(w.calls.filter((call) => call.path === "/business-document-drafts").map((call) => call.type).sort(), ["INVOICE", "QUOTE"]);
  await w.click("Close Saved Files");
  await w.edit({ projectTitle: "Repair fence", projectDescription: "Replace damaged panels" });
  assert.equal(w.snapshot().quote.projectTitle, "Repair fence");
  assert.equal(w.snapshot().quote.quoteNumber, "");
  assert.equal(w.documents.length, 0);
  assert.equal(w.allocations(), 0);
  assert.equal(w.calls.filter((call) => /numbering/.test(call.path)).length, 0);
  await w.click("Save Draft");
  assert.equal(w.documents.length, 1, w.text());
  assert.equal(w.documents[0].documentType, "QUOTE");
  assert.equal(w.documents[0].content.customerName, contact.displayName);
  assert.equal(w.documents[0].content.projectTitle, "Repair fence");
  assert.equal(w.documents[0].customerParty.businessContactId, CONTACT);
  assert.equal(w.allocations(), 1);
  assert.equal(w.calls.filter((call) => call.method === "POST" && call.path === "/business-document-drafts" && call.body.documentType === "INVOICE").length, 0);
});

test("Quote-only Save Draft & Exit creates one Quote and never the hidden Invoice", async (t) => {
  const w = await mount(t);
  await w.selectCustomer();
  await w.edit({ projectTitle: "Kitchen repair" });
  assert.deepEqual(w.workspace().workingDocumentIntent, { quote: true, invoice: false });
  assert.equal(w.workspace().dirty.invoice, false);
  await w.click("Leave Quote and Invoice workspace");
  await w.click("Save Draft & Exit");
  assert.deepEqual(w.documents.map((doc) => doc.documentType), ["QUOTE"]);
  assert.equal(w.allocations(), 1);
  assert.equal(w.navigations.length, 1);
  assert.doesNotMatch(JSON.stringify(w.documents), /Scheduled Estimate Visit/);
});

test("schedule-origin synthetic Invoice baseline cannot trigger the staging double CREATE on Quote-only exit", async (t) => {
  const w = await mount(t, { route: "quoteBuilder", stored: {
    selectedQuoteRequest: { source: "schedule_evaluation", scheduleId: "visit-90455", customerName: "Scheduled customer" },
  } });
  assert.equal(w.snapshot().quote.projectTitle, "Scheduled Estimate Visit");
  assert.equal(w.snapshot().request.scheduleId, "visit-90455");
  assert.equal(w.workspace().invoice.projectTitle, "Scheduled Estimate Visit");
  assert.equal(w.workspace().dirty.invoice, false);
  await w.click("Leave Quote and Invoice workspace");
  await w.click("Save Draft & Exit");
  assert.deepEqual(w.documents.map((doc) => doc.documentType), ["QUOTE"]);
  assert.equal(w.documents[0].content.projectTitle, "Scheduled Estimate Visit");
  assert.equal(w.allocations(), 1);
});

test("explicitly authoring Invoice preserves two-document Save Draft & Exit", async (t) => {
  const w = await mount(t);
  await w.selectCustomer();
  await w.edit({ projectTitle: "Quote scope" });
  await w.click("Invoice");
  await w.edit({ projectTitle: "Invoice scope", workPerformed: "Work completed" });
  assert.deepEqual(w.workspace().workingDocumentIntent, { quote: true, invoice: true });
  assert.equal(w.workspace().invoice.workPerformed, "Work completed");
  assert.equal(w.documents.length, 0);
  await w.click("Leave Quote and Invoice workspace");
  await w.click("Save Draft & Exit");
  assert.deepEqual(w.documents.map((doc) => doc.documentType), ["QUOTE", "INVOICE"]);
  assert.equal(w.documents[1].content.workPerformed, "Work completed");
  assert.equal(w.allocations(), 2);
});

test("Invoice entry grants Invoice intent without creating a hidden Quote", async (t) => {
  const w = await mount(t, { route: "invoiceBuilder", initialDocument: "invoice" });
  await w.edit({ projectTitle: "Standalone Invoice", workPerformed: "Repair completed" });
  assert.deepEqual(w.workspace().workingDocumentIntent, { quote: false, invoice: true });
  await w.click("Leave Quote and Invoice workspace");
  await w.click("Save Draft & Exit");
  assert.deepEqual(w.documents.map((doc) => doc.documentType), ["INVOICE"]);
});

test("discarding a never-saved authored Quote consumes no official number", async (t) => {
  const w = await mount(t);
  await w.selectCustomer();
  await w.edit({ projectTitle: "Abandoned quote" });
  await w.click("Leave Quote and Invoice workspace");
  await w.click("Discard Changes");
  assert.equal(w.documents.length, 0);
  assert.equal(w.allocations(), 0);
  assert.equal(w.snapshot().quote.quoteNumber, "");
  assert.equal(w.navigations.length, 1);
});

test("discarding edits to a numbered Quote restores its saved content and number", async (t) => {
  const w = await mount(t);
  await w.selectCustomer();
  await w.edit({ projectTitle: "Saved scope" });
  await w.click("Save Draft");
  const number = w.documents[0].documentNumber;
  await w.edit({ projectTitle: "Unsaved replacement" });
  await w.click("Leave Quote and Invoice workspace");
  await w.click("Discard Changes");
  assert.equal(w.snapshot().quote.projectTitle, "Saved scope");
  // Official identity belongs to the governed saved document, outside editable content.
  assert.equal(w.workspace().savedDocuments.quote.documentNumber, number);
  assert.ok(w.text().includes(number));
  assert.equal(w.documents.length, 1);
  assert.equal(w.allocations(), 1);
});

test("real Saved Files All Types renders exact Quote/Invoice labels and hides an accidental Deposit Request", async (t) => {
  const w = await mount(t, { listExtras: [savedFile("QUOTE", "Saved Quote scope"), savedFile("INVOICE", "Saved Invoice work"), savedDeposit()] });
  await w.selectCustomer();
  await w.click("Saved Files");
  const drawer = document.querySelector(".business-saved-drawer");
  assert.ok(drawer);
  const rows = [...drawer.querySelectorAll(".business-saved-results article")];
  assert.equal(rows.length, 2, drawer.textContent);
  const quote = rows.find((row) => row.textContent.includes("Saved Quote scope"));
  const invoice = rows.find((row) => row.textContent.includes("Saved Invoice work"));
  assert.match(quote.querySelector("small").textContent, /^Quote ·/);
  assert.match(invoice.querySelector("small").textContent, /^Invoice ·/);
  assert.doesNotMatch(drawer.textContent, /Deposit must not appear|DEPOSIT_REQUEST/);
  assert.equal(drawer.querySelectorAll(".business-saved-delete").length, 2);
  assert.deepEqual(w.calls.filter((call) => call.path === "/business-document-drafts").map((call) => call.type).sort(), ["INVOICE", "QUOTE"]);
  assert.equal(w.documents.length, 0);
});

test("archiving a numbered Quote retains its identity and a later save requests a fresh document", async (t) => {
  const w = await mount(t);
  await w.selectCustomer();
  await w.edit({ projectTitle: "Original numbered scope" });
  await w.click("Save Draft");
  const original = { ...w.documents[0] };
  await w.click("Saved Files");
  await w.click("Archive Draft");
  const dialog = document.querySelector('[aria-labelledby="business-document-delete-title"]');
  const confirm = [...dialog.querySelectorAll("button")].find((button) => button.textContent === "Archive Draft");
  assert.ok(confirm);
  await act(async () => { confirm.click(); await pause(); });
  assert.match(w.text(), /Draft archived/);
  assert.equal(w.documents[0].id, original.id);
  assert.equal(w.documents[0].documentNumber, original.documentNumber);
  assert.equal(w.documents[0].status, "ARCHIVED");
  assert.equal(w.allocations(), 1);
  await w.click("Close Saved Files");
  await w.click("Save Draft");
  assert.equal(w.documents.length, 2);
  assert.notEqual(w.documents[1].id, original.id);
  assert.notEqual(w.documents[1].documentNumber, original.documentNumber);
  assert.equal(w.allocations(), 2);
  assert.equal(w.calls.filter((call) => /numbering|sequence/.test(call.path)).length, 0);
});

test("R3 Start New Quote detaches prior saved Invoice authority before its first Invoice visit", async (t) => {
  const w = await mount(t);
  await w.selectCustomer();
  await w.click("Invoice");
  await w.click("Save Draft");
  assert.equal(w.documents[0].documentType, "INVOICE");
  await w.click("Quote");
  await w.click("+ Start New Quote");
  await w.click("Discard Changes");
  await w.selectCustomer();
  const before = w.calls.length;
  await w.click("Invoice");
  assert.equal(w.workspace().savedDocuments.invoice, null);
  assert.equal(w.workspace().invoiceCreateState.invoice, null);
  assert.equal(w.workspace().invoice.invoiceNumber, "");
  assert.equal(w.calls.slice(before).filter((call) => call.method !== "GET").length, 0);
});


test("R3 fresh Quote to Invoice visit is unnumbered and leaving consumes no number", async (t) => {
  const w = await mount(t);
  await w.selectCustomer();
  const before = w.calls.length;
  await w.click("Invoice");
  assert.equal(w.workspace().invoice.customerName, "Bob Hamel");
  assert.equal(w.workspace().invoice.invoiceNumber, "");
  assert.equal(w.workspace().savedDocuments.invoice, null);
  assert.equal(w.workspace().savedDocumentsRef.current.invoice, null);
  assert.equal(w.workspace().invoiceCreateState.invoice, null);
  assert.match(document.querySelector('[aria-label="Live Invoice Preview"]').textContent, /Assigned on first save/);
  assert.equal(w.calls.slice(before).filter((call) => call.method !== "GET").length, 0);
  await w.click("Leave Quote and Invoice workspace");
  if (w.text().includes("Discard Changes")) await w.click("Discard Changes");
  assert.equal(w.documents.length, 0);
  assert.equal(w.allocations(), 0);
});

test("R3 deliberate Invoice Save allocates once; exact Saved Files reopen restores its number", async (t) => {
  const w = await mount(t);
  await w.selectCustomer();
  await w.click("Invoice");
  await w.click("Save Draft");
  assert.equal(w.documents.length, 1);
  assert.equal(w.documents[0].documentType, "INVOICE");
  const saved = w.documents[0];
  assert.equal(w.allocations(), 1);
  await w.click("Saved Files");
  const open = [...document.querySelectorAll("button")].find((button) => button.textContent.includes(saved.documentNumber));
  assert.ok(open, w.text());
  await act(async () => { open.click(); await pause(); });
  assert.equal(w.workspace().savedDocuments.invoice.id, saved.id);
  assert.match(document.querySelector('[aria-label="Live Invoice Preview"]').textContent, new RegExp(saved.documentNumber));
  assert.equal(w.allocations(), 1);
});

function sourceQuote() {
  return { ...savedFile("QUOTE", "Window repair"), documentNumber: "Q-0000049", customerDisplayName: "Bob Hamel",
    customerParty: { businessContactId: CONTACT, customerRelationshipId: RELATIONSHIP },
    content: { customerName: "Bob Hamel", customerEmail: "bob@example.test", projectTitle: "Window repair", notes: "Do not copy Quote notes", totalOverride: "9999" } };
}

test("R3 exact source route opens a local Invoice with no stale context or historical Invoice lookup", async (t) => {
  const quote = sourceQuote();
  const route = `invoiceBuilder?sourceQuoteDraftId=${quote.id}&sourceQuoteVersion=1&sourceQuoteNumber=Q-0000049`;
  const w = await mount(t, { initialDocument: "invoice", route, listExtras: [quote], stored: { activeJobCustomer: "Wrong customer", selectedQuoteRequest: { customerName: "Wrong customer" }, meetroRevisedQuoteContext: { source: "workflow_change_request", projectTitle: "Stale title" } } });
  assert.match(w.text(), /Live|Window repair/, w.text());
  assert.equal(w.workspace().invoice.customerName, "Bob Hamel");
  assert.equal(w.workspace().invoice.quoteReference, "Q-0000049");
  assert.equal(w.workspace().invoice.invoiceNumber, "");
  assert.equal(w.workspace().invoice.totalOverride, "");
  assert.equal(w.workspace().invoice.notes, "");
  assert.equal(w.workspace().savedDocuments.invoice, null);
  assert.equal(w.calls.filter((call) => call.method !== "GET").length, 0);
  assert.equal(w.calls.filter((call) => call.type === "INVOICE").length, 0);
  assert.equal(w.allocations(), 0);
});

test("R3 actual composer proposes separate fields, Apply stays local, preview excludes private reminder", async (t) => {
  const w = await mount(t);
  await w.selectCustomer();
  await w.click("Invoice");
  const instruction = "We completed the window repair, replaced damaged trim for an extra $75, payment is due Friday, remind me privately to call him next week.";
  await w.instruct(instruction);
  assert.ok(w.workspace().pendingInvoiceProposal);
  assert.equal(w.workspace().invoice.workPerformed, "");
  assert.match(w.text(), /Proposed Invoice changes/);
  await w.click("Apply");
  assert.equal(w.workspace().invoice.workPerformed, "window repair completed");
  assert.equal(w.workspace().invoice.lineItems[0].unitPrice, "75");
  assert.equal(w.workspace().privateReminders[0].text, "call him next week");
  assert.doesNotMatch(document.querySelector('[aria-label="Live Invoice Preview"]').textContent, /call him|privately/);
  assert.equal(w.calls.filter((call) => call.method !== "GET").length, 0);
  await w.click("Save Draft");
  assert.doesNotMatch(JSON.stringify(w.documents[0].content), /call him|privately/);
  assert.equal(w.documents[0].workspace.privateReminders[0].text, "call him next week");
});


test("R3 real Ask composer lookup → guarded navigation → exact Invoice hydration retains an unapplied proposal", async (t) => {
  const quote = sourceQuote();
  const w = await mount(t, { listExtras: [quote] });
  await w.selectCustomer();
  await w.instruct("Create invoice for Bob Hamel job quote number Q0000049. We completed the window repair, replaced damaged trim for an extra $75, payment is due Friday, remind me privately to call him next week.");
  await w.click("Discard Changes");
  assert.match(w.navigations.at(-1), /sourceQuoteDraftId=/);
  await w.followNavigation();
  assert.equal(w.workspace().invoice.quoteReference, "Q-0000049");
  assert.equal(w.workspace().invoice.invoiceNumber, "");
  assert.equal(w.workspace().invoice.workPerformed, "");
  assert.ok(w.workspace().pendingInvoiceProposal);
  assert.equal(w.workspace().pendingInvoiceProposal.patch.lineItems[0].unitPrice, "75");
  assert.equal(w.workspace().pendingInvoiceProposal.patch.privateReminder, "call him next week");
  assert.deepEqual(w.calls.filter((call) => call.path === "/business-document-drafts").map(({ method, type, search }) => ({ method, type, search })), [{ method: "GET", type: "QUOTE", search: "Q-0000049" }]);
  assert.equal(w.calls.filter((call) => call.method !== "GET").length, 0);
  assert.equal(w.allocations(), 0);
});

test("R3 a changed exact source is blocked before showing an Invoice editor", async (t) => {
  const quote = sourceQuote();
  const w = await mount(t, { initialDocument: "invoice", route: `invoiceBuilder?sourceQuoteDraftId=${quote.id}&sourceQuoteVersion=2&sourceQuoteNumber=Q-0000049`, listExtras: [quote] });
  assert.match(w.text(), /source Quote changed/);
  assert.equal(document.querySelector('[aria-label="Live Invoice Preview"]'), null);
  assert.equal(w.calls.filter((call) => call.method !== "GET").length, 0);
});

test("R3 Start New Invoice creates only a local session after the leave choice", async (t) => {
  const w = await mount(t);
  await w.selectCustomer();
  await w.click("Invoice");
  await w.click("Save Draft");
  await w.click("+ Start New Invoice");
  if (w.text().includes("Discard Changes")) await w.click("Discard Changes");
  assert.equal(w.workspace().savedDocuments.invoice, null);
  assert.equal(w.workspace().invoiceCreateState.invoice, null);
  assert.equal(w.workspace().invoice.invoiceNumber, "");
  assert.equal(w.allocations(), 1);
  assert.equal(w.documents.length, 1);
});


test("R3 approved scope stays separate from Work Completed until an explicit proposal is applied", async (t) => {
  const quote = { ...sourceQuote(), jobId: randomUUID() };
  quote.content.recommendedSolution = "Repair the windows";
  const authority = { canonicalQuote: { id: randomUUID(), jobId: quote.jobId, status: "ISSUED", decisionState: "APPROVED", totalMinor: 68000, currency: "USD", decisionVersion: 4,
    sourceBusinessDocument: { documentId: quote.id, documentVersion: 1, currentDocumentVersion: 1, currentSnapshotMatchesSource: true } } };
  // Mount the actual workspace at the parent's already-hydrated source boundary.
  const w = await mount(t, { route: "invoiceBuilder", initialDocument: "invoice", workspaceProps: { sourceQuoteDocument: quote, sourceQuoteAuthority: authority } });
  const preview = () => document.querySelector('[aria-label="Live Invoice Preview"]');
  const completedSection = () => [...preview().querySelectorAll("section")].find((section) => section.querySelector("h3")?.textContent === "Work Completed");
  assert.equal(w.workspace().invoice.workPerformed, "");
  assert.equal(w.workspace().invoice.lineItems[0].description, "Repair the windows");
  assert.equal(w.workspace().invoice.lineItems[0].quantity, "1");
  assert.equal(w.workspace().invoice.lineItems[0].unitPrice, "680");
  assert.match(completedSection().textContent, /Completion details have not been confirmed\./);
  assert.doesNotMatch(completedSection().textContent, /Repair the windows/);
  await w.instruct("We completed the window repair");
  assert.equal(w.workspace().pendingInvoiceProposal.patch.workPerformed, "window repair completed");
  assert.equal(w.workspace().invoice.workPerformed, "");
  assert.match(completedSection().textContent, /Completion details have not been confirmed\./);
  await w.click("Apply");
  assert.equal(w.workspace().invoice.workPerformed, "window repair completed");
  assert.match(completedSection().textContent, /window repair completed/);
  assert.equal(w.workspace().invoice.lineItems[0].unitPrice, "680");
  assert.equal(w.workspace().invoice.invoiceNumber, "");
  assert.equal(w.workspace().savedDocuments.invoice, null);
  assert.equal(w.workspace().invoiceCreateState.invoice, null);
  assert.match(preview().textContent, /Assigned on first save/);
  assert.equal(w.allocations(), 0);
  assert.equal(w.documents.length, 0);
  assert.equal(w.calls.filter((call) => call.method !== "GET").length, 0);
});

test("R3 separate completed-Job Invoice preparation retains its completion-backed presentation", async (t) => {
  const preparation = { jobId: randomUUID(), customerName: "Bob Hamel", serviceTitle: "Window repair", completedAt: "2026-09-07T12:00:00Z", completionVersion: 1,
    approvedWork: [{ description: "Repair the windows", quantity: 1, unitAmountMinor: 68000, lineTotalMinor: 68000 }],
    approvedAmount: { totalMinor: 68000, currency: "USD" }, paymentsReceivedMinor: 51000, amountStillDueMinor: 17000, quoteReference: "Q-0000049", paymentTerms: "Due on receipt" };
  const w = await mount(t, { route: "invoiceBuilder", initialDocument: "invoice", workspaceProps: { invoicePreparation: preparation } });
  const preview = document.querySelector('[aria-label="Live Invoice Preview"]');
  assert.equal(w.workspace().invoice.workPerformed, "Repair the windows");
  assert.equal(w.workspace().invoice.paidAmount, "510");
  assert.equal(w.workspace().invoice.balanceDue, "170");
  assert.match(preview.textContent, /Work CompletedRepair the windows/);
  assert.doesNotMatch(preview.textContent, /Completion details have not been confirmed/);
  assert.equal(w.allocations(), 0);
  assert.equal(w.calls.filter((call) => call.method !== "GET").length, 0);
});
