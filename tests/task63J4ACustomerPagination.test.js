import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { cwd } from "node:process";
import { getCustomerRelationshipsCopy } from "../src/utils/customerRelationshipsLanguage.js";
import { getJobCompletionCopy } from "../src/utils/jobCompletionLanguage.js";

const JOB_A = "11111111-1111-4111-8111-111111111111";
const JOB_B = "22222222-2222-4222-8222-222222222222";
const JOB_C = "33333333-3333-4333-8333-333333333333";
const row = (jobId, name) => ({ jobId, customerName: name, serviceTitle: "Fixture Job", completedAt: "2026-09-28T12:00:00Z", approvedQuote: null, sourceType: "ordinary_request" });
const page = (jobs, nextCursor) => ({ contractVersion: 1, totalCount: 3, jobs, pagination: { limit: 20, nextCursor } });

test("Customers history preserves failed page, retries the exact cursor, and ignores obsolete pagination", async () => {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost/#customerRelationshipsCenter" });
  const previous = { window: globalThis.window, document: globalThis.document, localStorage: globalThis.localStorage, fetch: globalThis.fetch, Event: globalThis.Event, CustomEvent: globalThis.CustomEvent, HTMLElement: globalThis.HTMLElement, navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator") };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, Event: dom.window.Event, CustomEvent: dom.window.CustomEvent, HTMLElement: dom.window.HTMLElement });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  localStorage.setItem("token", "fixture-token");
  globalThis.fetch = async (input) => {
    const path = new URL(String(input), dom.window.location.href).pathname;
    if (path === "/my-contractor-profile") return new Response(JSON.stringify({ profile: { id: 10 } }), { status: 200 });
    if (path === "/business-customer-relationships") return new Response(JSON.stringify({ success: true, relationships: [] }), { status: 200 });
    throw new Error(`Live network forbidden: ${path}`);
  };
  let identity = { status: "authenticated", userId: "64", sessionGeneration: 1 };
  const listeners = new Set();
  globalThis.__j4HistorySession = { get: () => identity, subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); } };
  const pending = [];
  globalThis.__j4HistoryRead = ({ cursor = "" }) => new Promise((resolve, reject) => pending.push({ cursor, resolve, reject }));
  globalThis.__j4HistoryLanguage = "en";
  const vite = await createServer({ root: cwd(), configFile: false, cacheDir: "/tmp/task63j4a-customers-vite", optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, plugins: [{
    name: "mock-customers-history", enforce: "pre",
    transform(source, id) {
      if (!id.endsWith("/CustomerRelationshipsCenter.jsx")) return null;
      return source
        .replace('import { fetchProfessionalJobHistory, fetchNativeCustomers, fetchNativeCustomerHistory } from "../utils/jobCompletionApi.js";',
          'const fetchProfessionalJobHistory = globalThis.__j4HistoryRead; const fetchNativeCustomers = async () => ({ customers: [], pagination: { limit: 20, nextCursor: null } }); const fetchNativeCustomerHistory = async () => ({ jobs: [], pagination: { limit: 20, nextCursor: null } });')
        .replace('import { getLanguage } from "../utils/language";', 'const getLanguage = () => globalThis.__j4HistoryLanguage;')
        .replace('import { getAuthenticatedIdentitySnapshot, subscribeAuthenticatedIdentity } from "../utils/session.js";', 'const getAuthenticatedIdentitySnapshot = globalThis.__j4HistorySession.get; const subscribeAuthenticatedIdentity = globalThis.__j4HistorySession.subscribe;');
    },
  }] });
  const root = createRoot(document.getElementById("root"));
  let unmounted = false;
  try {
    const { default: Customers } = await vite.ssrLoadModule("/src/pages/CustomerRelationshipsCenter.jsx");
    await act(async () => root.render(React.createElement(Customers, { setPage() {} })));
    assert.equal(pending.length, 1);
    await act(async () => pending.shift().resolve(page([row(JOB_A, "First Customer")], "cursor-1")));
    assert.match(document.body.textContent, /First Customer/);
    const loadMore = [...document.querySelectorAll("button")].find((button) => button.textContent.includes("Load More"));
    assert.ok(loadMore);
    await act(async () => { loadMore.click(); loadMore.click(); });
    assert.equal(pending.length, 1);
    assert.equal(pending[0].cursor, "cursor-1");
    await act(async () => pending.shift().reject(new Error("page failed")));
    assert.match(document.body.textContent, /First Customer/);
    assert.ok(document.querySelector('[role="alert"]'));
    for (const locale of ["en", "es", "fr", "pt-BR"]) {
      globalThis.__j4HistoryLanguage = locale;
      await act(async () => root.render(React.createElement(Customers, { setPage() {} })));
      assert.equal(document.querySelector('[data-customer-history-authority]')?.getAttribute("aria-label"), getCustomerRelationshipsCopy(locale).completedWorkDirectory);
      assert.ok(document.querySelector('[role="alert"]')?.textContent.includes(getJobCompletionCopy(locale).pageUnavailable));
    }
    globalThis.__j4HistoryLanguage = "en";
    await act(async () => root.render(React.createElement(Customers, { setPage() {} })));
    const retry = [...document.querySelectorAll("button")].find((button) => button.textContent === "Retry");
    assert.ok(retry);
    await act(async () => retry.click());
    assert.equal(pending.length, 1);
    assert.equal(pending[0].cursor, "cursor-1");
    await act(async () => pending.shift().resolve(page([row(JOB_B, "Second Customer")], "cursor-2")));
    assert.equal(document.body.textContent.match(/First Customer/g)?.length, 1);
    assert.equal(document.body.textContent.match(/Second Customer/g)?.length, 1);

    const next = [...document.querySelectorAll("button")].find((button) => button.textContent.includes("Load More"));
    await act(async () => next.click());
    assert.equal(pending[0].cursor, "cursor-2");
    await act(async () => { identity = { status: "authenticated", userId: "65", sessionGeneration: 2 }; listeners.forEach((listener) => listener()); });
    assert.doesNotMatch(document.body.textContent, /First Customer|Second Customer/);
    assert.equal(pending.length, 2);
    const obsolete = pending.shift();
    const fresh = pending.shift();
    await act(async () => obsolete.resolve(page([row(JOB_C, "Obsolete Customer")], null)));
    assert.doesNotMatch(document.body.textContent, /Obsolete Customer/);
    await act(async () => fresh.resolve(page([row(JOB_C, "New Account Customer")], null)));
    assert.match(document.body.textContent, /New Account Customer/);
    assert.doesNotMatch(document.body.textContent, /First Customer|Second Customer/);

    await act(async () => { identity = { status: "authenticated", userId: "66", sessionGeneration: 3 }; listeners.forEach((listener) => listener()); });
    assert.equal(pending.length, 1);
    await act(async () => pending.shift().reject(new Error("initial page failed")));
    assert.ok(document.querySelector('[data-professional-job-history-status="error"] [role="alert"]'));
    assert.doesNotMatch(document.body.textContent, /New Account Customer/);
    const initialRetry = [...document.querySelectorAll("button")].find((button) => button.textContent === "Retry");
    await act(async () => initialRetry.click());
    assert.equal(pending.length, 1);
    assert.equal(pending[0].cursor, "");
    await act(async () => pending.shift().resolve(page([], null)));
    assert.equal(document.querySelector('[data-professional-job-history-status="ready"] [role="alert"]'), null);
    assert.equal(document.querySelector('[data-professional-job-history-status="ready"]')?.textContent.includes("New Account Customer"), false);

    await act(async () => { identity = { status: "authenticated", userId: "67", sessionGeneration: 4 }; listeners.forEach((listener) => listener()); });
    assert.equal(pending.length, 1);
    await act(async () => root.unmount());
    unmounted = true;
    await act(async () => pending.shift().resolve(page([row(JOB_A, "After Unmount")], null)));
    assert.equal(document.getElementById("root")?.textContent, "");
  } finally {
    if (!unmounted) await act(async () => root.unmount());
    await vite.close();
    dom.window.close();
    Object.assign(globalThis, { window: previous.window, document: previous.document, localStorage: previous.localStorage, fetch: previous.fetch, Event: previous.Event, CustomEvent: previous.CustomEvent, HTMLElement: previous.HTMLElement });
    if (previous.navigator) Object.defineProperty(globalThis, "navigator", previous.navigator);
    else delete globalThis.navigator;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    delete globalThis.__j4HistoryRead;
    delete globalThis.__j4HistorySession;
    delete globalThis.__j4HistoryLanguage;
  }
});
