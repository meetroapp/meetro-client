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
async function mount(t, { host = false, context = { page: "workCenter", jobId: JOB }, completionApi, resolveActions } = {}) {
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
  const props = { currentPage: "workCenter", role: "business", context, ...(resolveActions ? { resolveActions } : {}), ...(completionApi ? { completionApi } : {}), setPage: (route) => routes.push(route), onClose() {} };
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
  await w.send("Record customer approval of the kitchen quote and record the $1,500 deposit paid today. Schedule the job for next Friday morning.");
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

test("unavailable voice is a calm status and preserves typed input and action authority", async (t) => {
  const w = await mount(t);
  const before = w.calls.length;
  await w.click("Voice");
  const notice = document.querySelector(".ask-meetro-notice");
  assert.ok(notice);
  assert.equal(notice.getAttribute("role"), "status");
  assert.equal(notice.textContent, "Voice is unavailable in this browser. You can type your message.");
  assert.equal(document.querySelector(".ask-meetro-error"), null);
  assert.equal(document.querySelector(".ask-meetro-principle").textContent, "Ask Meetro talks. Meetro records.");
  assert.equal(w.calls.length, before); assert.deepEqual(w.routes, []);
  await w.send("Create a new quote");
  assert.ok(document.querySelector(".ask-meetro-actions"));
  assert.equal(document.querySelector(".ask-meetro-receipts"), null);
  assert.ok(w.calls.every((call) => !call.method || call.method === "GET"));
  assert.deepEqual(w.routes, []);
});

for (const question of [
  "Need help resolving a non working outlet",
  "Help me troubleshoot an outlet that stopped working",
  "Why might this outlet have no power?",
  "Explain what I should check first",
  "How do I schedule a visit?",
  "Explain this Quote.",
  "Help me troubleshoot this outlet.",
]) test(`real composer keeps help conversational with no Review: ${question}`, async (t) => {
  const w = await mount(t, { context: { page: "businessDashboard" } });
  await w.send(question);
  assert.match(w.text(), /Conversational help is not connected yet/);
  assert.doesNotMatch(w.text(), /Review this record|Choose the exact record|action to review/);
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.equal(document.querySelector(".ask-meetro-composer textarea").disabled, false);
  assert.deepEqual(w.calls, []); assert.deepEqual(w.routes, []);
});
for (const instruction of [
  "Update this invoice with what the customer paid.",
  "Schedule this job how we discussed.",
  "Record what the customer paid on this exact Invoice.",
]) test(`real composer proposes exact review for embedded question words: ${instruction}`, async (t) => {
  const w = await mount(t);
  await w.send(instruction);
  assert.equal(document.querySelectorAll(".ask-meetro-actions article").length, 1);
  assert.match(w.text(), /I found 1 action to review/);
  assert.doesNotMatch(w.text(), /Conversational help is not connected/);
  assert.deepEqual(w.calls, []); assert.deepEqual(w.routes, []);
  await w.click("Review");
  assert.ok(document.querySelector(".ask-meetro-review"));
  assert.equal(document.querySelector(".ask-meetro-receipts"), null);
  assert.deepEqual(w.calls, []); assert.deepEqual(w.routes, []);
});
for (const instruction of [
  "Explain this Quote. Update this invoice with what the customer paid.",
  "Update this invoice and explain what the customer paid.",
  "Schedule this job, then explain how to prepare.",
  "Create invoice from Quote Q0000049 and explain the work.",
]) test(`real composer holds mixed intent and clears previous actions: ${instruction}`, async (t) => {
  const w = await mount(t);
  await w.send("Schedule this job Friday");
  assert.ok(document.querySelector(".ask-meetro-actions"));
  await w.send(instruction);
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.equal(document.querySelector(".ask-meetro-review"), null);
  assert.equal(document.querySelector(".ask-meetro-receipts"), null);
  assert.match(w.text(), /have not answered the question or proposed the change/);
  assert.equal(document.querySelector(".ask-meetro-composer textarea").disabled, false);
  assert.deepEqual(w.calls, []); assert.deepEqual(w.routes, []);
});
test("context-free conversation and existing Customer context do not invent record actions", async (t) => {
  const w = await mount(t, { context: { page: "customerRelationshipsCenter", relationshipId: EVIDENCE } });
  await w.send("Hello, can you compare the options for me?");
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.match(document.querySelector(".ask-meetro-context").textContent, new RegExp(EVIDENCE));
  assert.deepEqual(w.calls, []); assert.deepEqual(w.routes, []);
});
test("a failed proposal lookup preserves typed text and never asks an informational user to choose a record", async (t) => {
  const w = await mount(t);
  globalThis.__dashboardHttp = async () => { throw new Error("lookup unavailable"); };
  await w.send("Create invoice from Quote Q0000049");
  assert.match(w.text(), /The Quote could not be verified/);
  assert.equal(document.querySelector(".ask-meetro-composer textarea").value, "Create invoice from Quote Q0000049");
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  await w.send("Why might an outlet have no power?");
  assert.equal(document.querySelector(".ask-meetro-error"), null);
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.deepEqual(w.routes, []);
});
test("actual completion review failure remains an alert and cannot Apply", async (t) => {
  const w = await mount(t, { completionApi: { review: async () => { throw new Error("This Job cannot be completed."); }, apply: () => assert.fail("must not Apply") } });
  await w.send("Complete this job"); await w.click("Review");
  assert.match(document.querySelector('[role="alert"]').textContent, /cannot be completed/);
  assert.ok(![...document.querySelectorAll("button")].some((button) => button.textContent === "Confirm & Apply"));
  assert.equal(document.querySelector(".ask-meetro-receipts"), null);
});
test("browser transcription fills the editable composer without submitting or applying", async (t) => {
  let recognition;
  window.SpeechRecognition = class { constructor() { recognition = this; } start() { this.onstart(); } abort() {} };
  t.after(() => { delete window.SpeechRecognition; });
  const w = await mount(t);
  await w.click("Voice");
  assert.match(w.text(), /Listening/);
  const result = [{ transcript: "Complete this job" }]; result.isFinal = true;
  await act(async () => { recognition.onresult({ results: [result] }); await pause(); });
  assert.equal(document.querySelector(".ask-meetro-composer textarea").value, "Complete this job");
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.equal(document.querySelector(".ask-meetro-receipts"), null);
  assert.deepEqual(w.calls, []); assert.deepEqual(w.routes, []);
});

 test("parser rejection fails closed without losing the typed request", async (t) => {
  const w = await mount(t, { resolveActions: async () => { throw new Error("parser failure"); } });
  await w.send("Need help resolving an outlet");
  assert.match(document.querySelector('[role="alert"]').textContent, /I could not process that request/);
  assert.equal(document.querySelector(".ask-meetro-composer textarea").value, "Need help resolving an outlet");
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.deepEqual(w.calls, []); assert.deepEqual(w.routes, []);
});
