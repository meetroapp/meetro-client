import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { cwd } from "node:process";
import { t } from "../src/utils/language.js";
import { getJobCompletionCopy } from "../src/utils/jobCompletionLanguage.js";

const JOB_A = "11111111-1111-4111-8111-111111111111";
const JOB_B = "22222222-2222-4222-8222-222222222222";
const jobs = [
  { jobId: JOB_A, requestId: null, relationshipId: 101, conversationId: 201, sourceType: "emergency_request", sourceLabel: "Emergency", serviceTitle: "First Emergency Job", professionalName: "Fixture Pro", completedAt: "2026-09-28T12:00:00Z", approvedQuote: null },
  { jobId: JOB_B, requestId: 22, relationshipId: 102, conversationId: 202, sourceType: "ordinary_request", sourceLabel: "Job Request", serviceTitle: "Second Ordinary Job", professionalName: "Fixture Pro", completedAt: "2026-09-27T12:00:00Z", approvedQuote: null },
];

test("actual Home History controls open a responsive exact-Job workspace and return in both branches", async () => {
  const vite = await createServer({ root: cwd(), configFile: false, cacheDir: "/tmp/task63j4a-home-vite", optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, plugins: [{
    name: "mock-home-history-reads", enforce: "pre",
    transform(source, id) {
      if (id.endsWith("/Home.jsx")) return source
        .replace('import { fetchCustomerJobHistoryList } from "../utils/jobCompletionApi.js";', 'const fetchCustomerJobHistoryList = globalThis.__j4HomeListRead;')
        .replace('import useLanguage from "../hooks/useLanguage";', 'const useLanguage = () => globalThis.__j4Language || "en";')
        .replace('useState("landing")', 'useState(globalThis.__j4HomeInitialView || "landing")');
      if (id.endsWith("/CustomerCompletionHistory.jsx")) return source.replace('import { fetchCustomerJobHistory } from "../utils/jobCompletionApi.js";', 'const fetchCustomerJobHistory = globalThis.__j4CompletionRead;');
      if (id.endsWith("/CustomerInvoicePanel.jsx")) return source.replace('import { fetchCustomerJobInvoice } from "../utils/invoicePaymentApi.js";', 'const fetchCustomerJobInvoice = globalThis.__j4InvoicePanelRead;');
      if (id.endsWith("/clientWorkflowStoragePolicy.js")) return source.replace('return !isProductionClientRuntime(options);', 'return false;');
      return null;
    },
  }] });
  globalThis.__j4HomeListRead = async () => ({ contractVersion: 1, totalCount: 2, jobs, pagination: { limit: 50, nextCursor: null } });
  globalThis.__j4CompletionRead = async ({ jobId }) => {
    globalThis.__j4CompletionCalls.push(jobId);
    if (jobId === JOB_B) throw new Error("completion unavailable");
    return { jobId, serviceTitle: "First Emergency Job", professionalName: "Fixture Pro", completedAt: "2026-09-28T12:00:00Z", sourceType: "emergency_request", completionSummary: { workstreamCount: 1, workItemCount: 1, customerUpdateCount: 0 }, approvedQuote: null, customerName: "Fixture Homeowner", status: "COMPLETED", historyRecords: { deposits: [], media: [], visits: [], emergencyAssessment: null }, originalRequest: null, actions: { canMessageProfessional: false } };
  };
  globalThis.__j4InvoicePanelRead = async () => { throw new Error("billing unavailable"); };
  const { default: Home } = await vite.ssrLoadModule("/src/pages/Home.jsx");
  try {
    for (const branch of ["landing", "serviceHistory"]) for (const locale of ["en", "es", "fr", "pt-BR"]) {
      const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost/#home", pretendToBeVisual: true });
      const previous = { window: globalThis.window, document: globalThis.document, localStorage: globalThis.localStorage, fetch: globalThis.fetch, Event: globalThis.Event, CustomEvent: globalThis.CustomEvent, HTMLElement: globalThis.HTMLElement, navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator") };
      Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, Event: dom.window.Event, CustomEvent: dom.window.CustomEvent, HTMLElement: dom.window.HTMLElement });
      Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      localStorage.setItem("token", "local-fixture-token");
      dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      dom.window.HTMLElement.prototype.scrollIntoView = () => {};
      globalThis.fetch = async () => new Response(JSON.stringify({ success: false, code: "FIXTURE_ROUTE_UNAVAILABLE" }), { status: 404, headers: { "Content-Type": "application/json" } });
      globalThis.__j4HomeInitialView = branch;
      globalThis.__j4Language = locale;
      globalThis.__j4CompletionCalls = [];
      const root = createRoot(document.getElementById("root"));
      try {
        await act(async () => root.render(React.createElement(Home, { setPage() {} })));
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
        if (branch === "landing") {
          const historyTab = [...document.querySelectorAll(".home-my-projects-tabs button")].find(button => button.textContent === t("homeMyProjectsHistory", locale));
          await act(async () => historyTab.click());
        }
        const cards = [...document.querySelectorAll("[data-history-open-job]")];
        assert.equal(cards.length, 2, `${branch}: one card for each canonical Job`);
        cards[0].focus();
        await act(async () => cards[0].click());
        const workspace = document.querySelector('[data-homeowner-history-workspace]');
        assert.ok(workspace, `${branch}: main workspace mounted`);
        assert.equal(workspace.dataset.homeownerHistoryWorkspace, JOB_A);
        assert.equal(document.querySelector('[aria-modal="true"]'), null);
        assert.match(workspace.textContent, /First Emergency Job/);
        assert.ok(workspace.textContent.includes(getJobCompletionCopy(locale).emergencyPreservedRecordBody));
        const back = workspace.querySelector("button");
        assert.equal(document.activeElement, back);
        assert.ok(back.textContent.includes(getJobCompletionCopy(locale).homeownerBackToHistory));
        await act(async () => back.click());
        assert.equal(document.querySelector('[data-homeowner-history-workspace]'), null);
        const restored = document.querySelector(`[data-history-open-job="${JOB_A}"]`);
        assert.equal(document.activeElement, restored);
        await act(async () => restored.click());
        assert.ok(document.querySelector('[data-homeowner-history-workspace]'));
        await act(async () => document.querySelector('[data-homeowner-history-workspace]').dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
        assert.equal(document.querySelector('[data-homeowner-history-workspace]'), null);
        await act(async () => document.querySelector(`[data-history-open-job="${JOB_B}"]`).click());
        assert.match(document.querySelector('[data-homeowner-history-workspace]').textContent, new RegExp(getJobCompletionCopy(locale).historyUnavailable, "i"));
        assert.deepEqual(globalThis.__j4CompletionCalls.slice(-1), [JOB_B]);
      } finally {
        await act(async () => root.unmount());
        dom.window.close();
        Object.assign(globalThis, { window: previous.window, document: previous.document, localStorage: previous.localStorage, fetch: previous.fetch, Event: previous.Event, CustomEvent: previous.CustomEvent, HTMLElement: previous.HTMLElement });
        if (previous.navigator) Object.defineProperty(globalThis, "navigator", previous.navigator);
        else delete globalThis.navigator;
        delete globalThis.IS_REACT_ACT_ENVIRONMENT;
      }
    }
  } finally {
    await vite.close();
    delete globalThis.__j4HomeInitialView;
    delete globalThis.__j4HomeListRead;
    delete globalThis.__j4CompletionRead;
    delete globalThis.__j4InvoicePanelRead;
    delete globalThis.__j4CompletionCalls;
    delete globalThis.__j4Language;
  }
});
