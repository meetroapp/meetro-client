import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createServer } from "vite";

let dom, vite, createRoot;
const globals = new Map();
const pause = () => new Promise((resolve) => setTimeout(resolve, 25));
test.before(async () => {
  dom = new JSDOM('<div id="root"></div>', { url: "http://localhost/#home", pretendToBeVisual: true });
  for (const key of ["window", "document", "navigator", "localStorage", "sessionStorage", "HTMLElement", "HTMLTextAreaElement", "Element", "Node", "Event", "CustomEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? dom.window[key].bind(dom.window) : dom.window[key] });
  }
  globals.set("fetch", Object.getOwnPropertyDescriptor(globalThis, "fetch"));
  globalThis.fetch = async () => { throw new Error("No live network in dashboard tests"); };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  ({ createRoot } = await import("react-dom/client"));
  vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true, hmr: false }, plugins: [{
    name: "dashboard-test-ports", enforce: "pre",
    resolveId(id) {
      if (/\/authFetch(?:\.js)?$/.test(id)) return "\0dashboard-http";

    },
    load(id) {
      if (id === "\0dashboard-http") return 'export const authFetch = (...args) => globalThis.__dashboardHttp(...args); export const clearMeetroSession = () => {}; export const announceAccountConnectionIssue = () => {}; export const handleAuthExpired = () => {};';

    },
  }] });
});
test.after(async () => {
  await vite?.close(); dom?.window.close();
  for (const [key, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  delete globalThis.IS_REACT_ACT_ENVIRONMENT; delete globalThis.__dashboardHttp;
});
const JOB = "7e742dc1-e2a2-49c6-a493-11e351c80d54", EVIDENCE = "7a02ee20-7f32-48eb-96dc-a3217bc5dcda";
async function mount(t, { host = false } = {}) {
  localStorage.clear(); localStorage.setItem("activeAccountMode", "business"); localStorage.setItem("language", "en");
  window.history.replaceState({}, "", `#workCenter?jobId=${JOB}&stage=work`);
  const calls = [], routes = [];
  globalThis.__dashboardHttp = async (path, options = {}) => {
    calls.push({ path, ...options });
    if (path.endsWith("/completion-review")) return { response: { ok: true }, data: { success: true, completionReview: { contractVersion: 1, jobId: JOB, requestId: 14, relationshipId: 22, currentVersion: 0, state: "ACTIVE", eligible: true, canComplete: true, reasons: [], work: { workstreamCount: 1, completedWorkstreamCount: 1, workItemCount: 1, completedWorkItemCount: 1 }, outstanding: { workstreams: 0, workItems: 0, obligations: 0, findings: 0 }, customerUpdates: { count: 1, status: "UP_TO_DATE" }, completedAt: null } } };
    if (path.endsWith("/complete")) return { response: { ok: true }, data: { success: true, completion: { contractVersion: 1, id: EVIDENCE, jobId: JOB, requestId: 14, relationshipId: 22, currentVersion: 1, status: "COMPLETED", completedAt: "2026-09-08T12:00:00Z", summary: { workstreamCount: 1, workItemCount: 1, customerUpdateCount: 1 }, nextAction: { code: "READY_TO_INVOICE", label: "Ready to Invoice" } } } };
    return { response: { ok: false, status: 503 }, data: { success: false } };
  };
  const { default: Component } = await vite.ssrLoadModule(`/src/components/${host ? "AskMeetroHost" : "AskMeetroWorkspace"}.jsx`);
  const root = createRoot(document.getElementById("root"));
  t.after(async () => { await act(async () => root.unmount()); });
  const props = { currentPage: "workCenter", role: "business", context: { page: "workCenter", jobId: JOB }, setPage: (route) => routes.push(route), onClose() {} };
  await act(async () => { root.render(React.createElement(Component, props, host ? React.createElement("input", { "aria-label": "Existing unsaved Quote", defaultValue: "Unsaved scope" }) : null)); await pause(); });
  async function click(label) {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent.trim() === label || item.getAttribute("aria-label") === label);
    assert.ok(button, label); assert.equal(button.disabled, false);
    await act(async () => { button.click(); await pause(); });
  }
  async function send(text) {
    const input = document.querySelector(".ask-meetro-composer textarea");
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(input, text); input.dispatchEvent(new Event("input", { bubbles: true })); });
    await click("Send");
  }
  return { calls, routes, click, send, text: () => document.body.textContent };
}
test("Ask welcome has role-specific suggestions and functional composer controls", async (t) => {
  const w = await mount(t);
  assert.match(w.text(), /Your assistant for real work/); assert.doesNotMatch(w.text(), /AI assistant/);
  for (const label of ["Attach", "Photo", "Voice", "Send"]) assert.ok(document.querySelector(`[aria-label="${label}"]`));
  assert.equal(document.querySelector('input[capture="environment"]').accept, "image/*");
  await w.send("Customer approved the kitchen quote and paid the $1,500 deposit today. Schedule the job for next Friday morning.");
  assert.equal(document.querySelector(".ask-meetro-welcome"), null);
  assert.equal(document.querySelectorAll(".ask-meetro-actions article").length, 3);
  await w.click("Review all");
  assert.match(w.text(), /Review 3 actions/); assert.match(w.text(), /only update information with your confirmation/);
  assert.equal(document.querySelector(".ask-meetro-receipts"), null);
  assert.ok(w.calls.every((call) => !call.method || call.method === "GET"));
  await w.click("Cancel"); assert.equal(document.querySelector(".ask-meetro-review"), null);
});
test("real parser → canonical review → confirmed Apply → authoritative receipt, with no Quote or payment mutation", async (t) => {
  const w = await mount(t);
  await w.send("Mark this job as completed."); await w.click("Review");
  assert.match(w.text(), /Reviewed Job version/); assert.ok(w.calls.every((call) => !call.method || call.method === "GET"));
  assert.equal(document.querySelector(".ask-meetro-receipts"), null);
  await w.click("Confirm & Apply");
  assert.match(document.querySelector(".ask-meetro-receipts").textContent, /Job completed.*Work completion recorded/s);
  assert.deepEqual(w.calls.filter((call) => call.method === "POST").map((call) => call.path), [`/professional/jobs/${JOB}/complete`]);
  await w.click("View"); assert.equal(w.routes.at(-1), `workCenter?jobId=${JOB}&stage=completion`);
});
test("persistent launcher opens a dedicated workspace and closes without unmounting an unsaved page", async (t) => {
  const w = await mount(t, { host: true });
  const original = document.querySelector('[aria-label="Existing unsaved Quote"]');
  const launcher = document.querySelector(".meetro-assistant-launcher"); assert.ok(launcher);
  await act(async () => { launcher.click(); await pause(); });
  assert.ok(document.querySelector(".ask-meetro-workspace"));
  assert.equal(document.querySelector('[aria-label="Existing unsaved Quote"]'), original);
  assert.match(document.querySelector(".ask-meetro-context").textContent, new RegExp(JOB));
  await w.click("Close Ask Meetro");
  assert.equal(document.querySelector('[aria-label="Existing unsaved Quote"]').value, "Unsaved scope");
  assert.equal(w.routes.length, 0);
  await act(async () => { window.dispatchEvent(new CustomEvent("meetro:assistant:open", { detail: { initialQuestion: "Help with this job" } })); await pause(); });
  assert.equal(document.querySelector(".ask-meetro-composer textarea").value, "Help with this job");
});
test("keyboard-responsive workspace reserves mobile nav space and a reachable composer", () => {
  const css = readFileSync("src/components/AskMeetroWorkspace.css", "utf8");
  assert.match(css, /height: 100dvh/); assert.match(css, /\.is-keyboard-open/);
  assert.match(css, /min-height: 56px/); assert.match(css, /border-radius: 28px/);
  assert.match(css, /#root\[data-app-layout="tablet"\]/); assert.match(css, /#root\[data-app-layout="desktop"\]/);
});

test("Ask standalone New Quote clears stale hints only on explicit native review navigation", async (t) => {
  const w = await mount(t);
  localStorage.setItem("selectedQuoteRequest", JSON.stringify({ id: 999 }));
  await w.send("New Quote");
  assert.ok(localStorage.getItem("selectedQuoteRequest"));
  await w.click("Review"); await w.click("Open record to review");
  assert.equal(localStorage.getItem("selectedQuoteRequest"), null);
  assert.deepEqual(w.routes, ["quoteBuilder?new=1"]);
  assert.ok(w.calls.every((call) => !call.method || call.method === "GET"));
});
test("account changes dismiss Ask and clear its prior conversation", async (t) => {
  const w = await mount(t, { host: true });
  await act(async () => { document.querySelector(".meetro-assistant-launcher").click(); await pause(); });
  await w.send("Schedule this job Friday");
  await act(async () => { window.dispatchEvent(new CustomEvent("accountModeChanged")); await pause(); });
  assert.equal(document.querySelector(".ask-meetro-workspace"), null);
  await act(async () => { document.querySelector(".meetro-assistant-launcher").click(); await pause(); });
  assert.ok(document.querySelector(".ask-meetro-welcome"));
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
});
