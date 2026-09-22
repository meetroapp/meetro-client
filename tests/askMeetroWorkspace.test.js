import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createServer } from "vite";

let dom, vite, createRoot, askMeetroIntentForTest;
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

  ({ askMeetroIntent: askMeetroIntentForTest } =
    await vite.ssrLoadModule("/src/utils/askMeetro.js"));
});
test.after(async () => {
  await vite?.close(); dom?.window.close();
  for (const [key, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  delete globalThis.IS_REACT_ACT_ENVIRONMENT; delete globalThis.__dashboardHttp;
});
const JOB = "7e742dc1-e2a2-49c6-a493-11e351c80d54", EVIDENCE = "7a02ee20-7f32-48eb-96dc-a3217bc5dcda";
async function mount(t, { host = false, context = { page: "workCenter", jobId: JOB }, completionApi, resolveActions, requestConversation, currentPage = "workCenter", role = "business", activeAccountMode = "business", route = `#workCenter?jobId=${JOB}&stage=work` } = {}) {
  localStorage.clear(); localStorage.setItem("activeAccountMode", activeAccountMode); localStorage.setItem("language", "en");
  window.history.replaceState({}, "", route);
  const calls = [], routes = [];
  globalThis.__dashboardHttp = async (path, options = {}) => {
    calls.push({ path, ...options });
    if (path === "/api/companion/ask") {
      const body = JSON.parse(options.body || "{}");
      const instruction = String(body?.input?.message || "");
      const intent = askMeetroIntentForTest(instruction);

      const result = {
        schemaVersion: 1,
        text:
          "Helpful provider fixture: review the available information before deciding.",
        authorityClassification: "CONVERSATIONAL_NON_CANONICAL",
        directMutationAllowed: false,
      };

      if (
        body?.context?.retrieval?.version === 1 &&
        intent.change &&
        !intent.information
      ) {
        result.text =
          "The current authorized Job was resolved. Continue through its governed Review.";
        result.resolution = workspaceResolution({
          reviewRequired: true,
        });
      }

      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          code: "INTELLIGENCE_OPERATION_COMPLETED",
          operation: "companion.converse",
          result,
        },
      };
    }
    if (path.endsWith("/completion-review")) return { response: { ok: true }, data: { success: true, completionReview: { contractVersion: 1, jobId: JOB, requestId: 14, relationshipId: 22, currentVersion: 0, state: "ACTIVE", eligible: true, canComplete: true, reasons: [], work: { workstreamCount: 1, completedWorkstreamCount: 1, workItemCount: 1, completedWorkItemCount: 1 }, outstanding: { workstreams: 0, workItems: 0, obligations: 0, findings: 0 }, customerUpdates: { count: 1, status: "UP_TO_DATE" }, completedAt: null } } };
    if (path.endsWith("/complete")) return { response: { ok: true }, data: { success: true, completion: { contractVersion: 1, id: EVIDENCE, jobId: JOB, requestId: 14, relationshipId: 22, currentVersion: 1, status: "COMPLETED", completedAt: "2026-09-08T12:00:00Z", summary: { workstreamCount: 1, workItemCount: 1, customerUpdateCount: 1 }, nextAction: { code: "READY_TO_INVOICE", label: "Ready to Invoice" } } } };
    return { response: { ok: false, status: 503 }, data: { success: false } };
  };
  const { default: Component } = await vite.ssrLoadModule(`/src/components/${host ? "AskMeetroHost" : "AskMeetroWorkspace"}.jsx`);
  const root = createRoot(document.getElementById("root"));
  t.after(async () => { await act(async () => root.unmount()); });
  const props = { currentPage, role, context, ...(resolveActions ? { resolveActions } : {}), ...(requestConversation ? { requestConversation } : {}), ...(completionApi ? { completionApi } : {}), setPage: (nextRoute) => routes.push(nextRoute), onClose() {} };
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
  assert.deepEqual(
    w.calls.filter(
      (call) =>
        call.method === "POST" &&
        call.path !== "/api/companion/ask"
    ),
    []
  );
  await w.click("Cancel"); assert.equal(document.querySelector(".ask-meetro-review"), null);
});
test("real parser → canonical review → confirmed Apply → authoritative receipt, with no Quote or payment mutation", async (t) => {
  const w = await mount(t);
  await w.send("Mark this job as completed."); await w.click("Review");
  assert.match(w.text(), /Reviewed Job version/);
  assert.deepEqual(
    w.calls.filter(
      (call) =>
        call.method === "POST" &&
        call.path !== "/api/companion/ask"
    ),
    []
  );
  assert.equal(document.querySelector(".ask-meetro-receipts"), null);
  await w.click("Confirm & Apply");
  assert.match(document.querySelector(".ask-meetro-receipts").textContent, /Job completed.*Work completion recorded/s);
  assert.deepEqual(
    w.calls
      .filter(
        (call) =>
          call.method === "POST" &&
          call.path !== "/api/companion/ask"
      )
      .map((call) => call.path),
    [`/professional/jobs/${JOB}/complete`]
  );
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

test("Emergency Ask uses personal advisory context and bounded help suggestions", async (t) => {
  const w = await mount(t, {
    host: true,
    currentPage: "emergencyRequest",
    role: "business",
    activeAccountMode: "business",
    route: "#emergencyRequest?requestId=41",
  });

  await act(async () => {
    window.dispatchEvent(new CustomEvent("meetro:assistant:open", {
      detail: {
        context: {
          page: "emergencyRequest",
          requestId: "41",
          label: "Emergency Help",
        },
      },
    }));
    await pause();
  });

  const banner = document.querySelector(".ask-meetro-context");
  assert.ok(banner);
  assert.match(banner.textContent, /Working with: Emergency Help/);
  assert.match(banner.textContent, /Emergency guidance · no record changes/);
  assert.doesNotMatch(banner.textContent, /Exact record context/);

  const cards = [...document.querySelectorAll(".ask-meetro-suggestions button")];
  assert.equal(cards.length, 3);
  assert.deepEqual(
    cards.map((card) => card.querySelector("strong")?.textContent),
    [
      "Help me describe what’s happening",
      "What details should I include?",
      "Explain a Safety Check question",
    ]
  );
  assert.doesNotMatch(
    document.querySelector(".ask-meetro-suggestions").textContent,
    /Update a job|Schedule a visit|Create a quote|Find new opportunities|Track my project|Request a service/
  );

  await act(async () => {
    cards[2].click();
    await pause();
  });
  assert.equal(
    document.querySelector(".ask-meetro-composer textarea").value,
    "Explain a Safety Check question without choosing an answer for me."
  );
  await w.click("Send");

  const askCall = w.calls.find((call) => call.path === "/api/companion/ask");
  assert.ok(askCall);
  assert.deepEqual(JSON.parse(askCall.body).context, {});
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.deepEqual(w.routes, []);
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
  assert.match(w.text(), /Helpful provider fixture/);
  assert.doesNotMatch(w.text(), /Review this record|Choose the exact record|action to review/);
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.equal(document.querySelector(".ask-meetro-composer textarea").disabled, false);
  assert.deepEqual(w.calls.map((call) => call.path), ["/api/companion/ask"]); assert.deepEqual(w.routes, []);
});
for (const instruction of [
  "Update this invoice with what the customer paid.",
  "Schedule this job how we discussed.",
  "Record what the customer paid on this exact Invoice.",
]) test(`real composer proposes exact review for embedded question words: ${instruction}`, async (t) => {
  const w = await mount(t);
  await w.send(instruction);
  assert.equal(document.querySelectorAll(".ask-meetro-actions article").length, 1);
  assert.match(w.text(), /1 action to review/);
  assert.doesNotMatch(w.text(), /Conversational help is not connected/);
  assert.deepEqual(
    w.calls.map((call) => call.path),
    ["/api/companion/ask"]
  );
  assert.deepEqual(w.routes, []);
  await w.click("Review");
  assert.ok(document.querySelector(".ask-meetro-review"));
  assert.equal(document.querySelector(".ask-meetro-receipts"), null);
  assert.deepEqual(
    w.calls.map((call) => call.path),
    ["/api/companion/ask"]
  );
  assert.deepEqual(w.routes, []);
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
  assert.match(w.text(), /No change has been proposed/);
  assert.equal(document.querySelector(".ask-meetro-composer textarea").disabled, false);
  assert.deepEqual(
    w.calls.map((call) => call.path),
    ["/api/companion/ask", "/api/companion/ask"]
  );
  assert.deepEqual(w.routes, []);
});
test("context-free conversation and existing Customer context do not invent record actions", async (t) => {
  const w = await mount(t, { context: { page: "customerRelationshipsCenter", relationshipId: EVIDENCE } });
  await w.send("Hello, can you compare the options for me?");
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.match(document.querySelector(".ask-meetro-context").textContent, new RegExp(EVIDENCE));
  assert.deepEqual(w.calls.map((call) => call.path), ["/api/companion/ask"]); assert.deepEqual(w.routes, []);
});
test("a failed proposal lookup preserves typed text and never asks an informational user to choose a record", async (t) => {
  const w = await mount(t, {
    requestConversation: async ({ instruction }) => {
      if (instruction === "Create invoice from Quote Q0000049") {
        return {
          text:
            "The authorized Job was resolved. Continue through its governed Quote lookup.",
          resolution: workspaceResolution({
            records: [
              {
                record: { type: "QUOTE", id: EVIDENCE },
                name: "Bob Hamel",
                title: "Kitchen Quote",
                number: "Q-0000049",
                label: "Bob Hamel — Q-0000049",
              },
            ],
            reviewRequired: true,
          }),
        };
      }

      return "Helpful provider fixture: review the available information before deciding.";
    },
  });
  const originalHttp = globalThis.__dashboardHttp;
  globalThis.__dashboardHttp = async () => { throw new Error("lookup unavailable"); };
  await w.send("Create invoice from Quote Q0000049");
  assert.match(w.text(), /The Quote could not be verified/);
  assert.equal(document.querySelector(".ask-meetro-composer textarea").value, "Create invoice from Quote Q0000049");
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  globalThis.__dashboardHttp = originalHttp;
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
  assert.match(document.querySelector('[role="alert"]').textContent, /parser failure/);
  assert.equal(document.querySelector(".ask-meetro-composer textarea").value, "Need help resolving an outlet");
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.deepEqual(w.calls, []); assert.deepEqual(w.routes, []);
});

test("uncertain conversation transport retry reuses its key and retains typed text", async (t) => {
  const w = await mount(t); const original = globalThis.__dashboardHttp; const keys = []; let offline = true;
  globalThis.__dashboardHttp = async (path, options) => { keys.push(options.headers["Idempotency-Key"]); if (offline) throw new Error("Connection interrupted"); return original(path, options); };
  await w.send("Explain the options");
  assert.equal(document.querySelector(".ask-meetro-composer textarea").value, "Explain the options");
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  offline = false; await w.click("Send"); assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
  assert.match(w.text(), /Helpful provider fixture/); assert.deepEqual(w.routes, []);
});
test("confirmed failed provider operation permits an explicit retry with a fresh key", async (t) => {
  const w = await mount(t); const original = globalThis.__dashboardHttp; const keys = []; let failed = true;
  globalThis.__dashboardHttp = async (path, options) => { keys.push(options.headers["Idempotency-Key"]); return failed ? { response: { ok: false }, data: { code: "INTELLIGENCE_PROVIDER_TIMEOUT" } } : original(path, options); };
  await w.send("Compare the options");
  assert.match(document.querySelector('[role="alert"]').textContent, /could not complete/);
  assert.equal(document.querySelector(".ask-meetro-composer textarea").value, "Compare the options");
  failed = false; await w.click("Send"); assert.notEqual(keys[0], keys[1]);
  assert.equal(document.querySelector(".ask-meetro-actions"), null); assert.deepEqual(w.routes, []);
});
test("background teardown cannot submit a late browser transcript", async (t) => {
  let recognition, aborted = false;
  window.SpeechRecognition = class { constructor() { recognition = this; } start() { this.onstart(); } abort() { aborted = true; } };
  t.after(() => { delete window.SpeechRecognition; delete document.hidden; });
  const w = await mount(t); await w.click("Voice");
  const callback = recognition.onresult;
  Object.defineProperty(document, "hidden", { configurable: true, value: true });
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); await pause(); });
  const result = [{ transcript: "Complete this job" }]; result.isFinal = true;
  await act(async () => { callback({ results: [result] }); await pause(); });
  assert.equal(aborted, true); assert.equal(document.querySelector(".ask-meetro-composer textarea").value, "");
  assert.deepEqual(w.calls, []); assert.deepEqual(w.routes, []);
});
test("local attachment selection is named, blocks unsupported transport, and never persists evidence", async (t) => {
  const w = await mount(t);
  const input = document.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", { configurable: true, value: [{ name: "notes.pdf", size: 8, type: "application/pdf" }] });
  await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); await pause(); });
  assert.match(document.querySelector(".ask-meetro-attachments").textContent, /notes.pdf/);
  await w.send("Summarize the notes");
  assert.match(document.querySelector('[role="alert"]').textContent, /attachments have not been sent/);
  assert.equal(document.querySelector(".ask-meetro-composer textarea").value, "Summarize the notes");
  assert.deepEqual(w.calls, []); assert.deepEqual(w.routes, []);
  await w.click("Remove notes.pdf"); await w.click("Send");
  assert.equal(w.calls.length, 1); assert.equal(w.calls[0].path, "/api/companion/ask");
  assert.doesNotMatch(w.calls[0].body, /notes.pdf|attachments|files/);
});


const SECOND_JOB = "4cc72db2-2f01-4dd7-96ef-92bc58cbc4d9";
const RETRIEVAL_OPERATION = "69c69a0a-e00f-46bb-87f2-944bf19de374";

function workspaceRecord(id, name, title) {
  return {
    record: { type: "JOB", id },
    name,
    title,
    number: "",
    label: `${name} — ${title}`,
  };
}

function workspaceResolution(overrides = {}) {
  return {
    version: 1,
    status: "RESOLVED",
    audience: "professional",
    records: [
      workspaceRecord(JOB, "Anthony Guzman", "Cabinet repair"),
    ],
    truncated: false,
    reviewRequired: false,
    continuation: {
      reference: RETRIEVAL_OPERATION,
      expiresAfterSeconds: 900,
    },
    answerSource: "DETERMINISTIC_RETRIEVAL",
    providerInvoked: false,
    ...overrides,
  };
}

test("Universal ambiguity shows every bounded choice and continues only the selected record", async (t) => {
  const first = workspaceRecord(JOB, "John Smith", "Bathroom");
  const second = workspaceRecord(SECOND_JOB, "John Rivera", "AC");
  const requests = [];

  const w = await mount(t, {
    context: { page: "businessDashboard" },
    resolveActions: async () => [],
    requestConversation: async (options) => {
      requests.push(options);

      if (!options.continuation) {
        return {
          text: "I found multiple possible records. Which one do you mean?",
          resolution: workspaceResolution({
            status: "AMBIGUOUS",
            records: [first, second],
            reviewRequired: false,
          }),
        };
      }

      assert.deepEqual(options.continuation, {
        reference: RETRIEVAL_OPERATION,
        index: 1,
      });

      return {
        text: "John Rivera's confirmed Job was selected.",
        resolution: workspaceResolution({
          records: [second],
        }),
      };
    },
  });

  await w.send("When is John's job?");

  const choices = [
    ...document.querySelectorAll(".ask-meetro-ambiguity button"),
  ];

  assert.equal(choices.length, 2);
  assert.equal(choices[0].textContent.trim(), "John Smith — Bathroom");
  assert.equal(choices[1].textContent.trim(), "John Rivera — AC");

  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.equal(document.querySelector(".ask-meetro-review"), null);

  await w.click("John Rivera — AC");

  assert.equal(requests.length, 2);
  assert.equal(document.querySelector(".ask-meetro-ambiguity"), null);
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.equal(document.querySelector(".ask-meetro-review"), null);
  assert.match(w.text(), /Use John Rivera — AC\./);
  assert.match(w.text(), /confirmed Job was selected/);
  assert.deepEqual(w.routes, []);
});

test("Universal ambiguity uncertain retry reuses the same continuation idempotency key", async (t) => {
  const first = workspaceRecord(JOB, "John Smith", "Bathroom");
  const second = workspaceRecord(SECOND_JOB, "John Rivera", "AC");
  const continuationKeys = [];
  let continuationAttempts = 0;

  const w = await mount(t, {
    context: { page: "businessDashboard" },
    resolveActions: async () => [],
    requestConversation: async (options) => {
      if (!options.continuation) {
        return {
          text: "I found multiple possible records. Which one do you mean?",
          resolution: workspaceResolution({
            status: "AMBIGUOUS",
            records: [first, second],
          }),
        };
      }

      continuationAttempts += 1;
      continuationKeys.push(options.idempotencyKey);

      assert.deepEqual(options.continuation, {
        reference: RETRIEVAL_OPERATION,
        index: 0,
      });

      if (continuationAttempts === 1) {
        throw Object.assign(
          new Error("Selection timed out. Try again."),
          { code: "ASK_CONVERSATION_TIMEOUT" }
        );
      }

      return {
        text: "John Smith's Job was verified.",
        resolution: workspaceResolution({
          records: [first],
        }),
      };
    },
  });

  await w.send("When is John's job?");

  await w.click("John Smith — Bathroom");

  assert.match(
    document.querySelector('[role="alert"]').textContent,
    /Selection timed out/
  );
  assert.ok(document.querySelector(".ask-meetro-ambiguity"));

  await w.click("John Smith — Bathroom");

  assert.equal(continuationKeys.length, 2);
  assert.ok(continuationKeys[0]);
  assert.equal(continuationKeys[0], continuationKeys[1]);
  assert.equal(document.querySelector(".ask-meetro-ambiguity"), null);
  assert.match(w.text(), /Job was verified/);
});

test("resolved operational retrieval is visibly not applied and enters only governed Review", async (t) => {
  const instruction = "Complete Anthony Guzman's job";

  const w = await mount(t, {
    context: { page: "businessDashboard" },

    resolveActions: async (_text, options) => {
      if (options.context?.jobId !== JOB) return [];

      return [
        {
          id: "resolved-completion-review",
          kind: "COMPLETE_JOB",
          title: "Review work completion",
          instruction,
          route: `workCenter?jobId=${JOB}&stage=work`,
          context: options.context,
          status: "PROPOSED",
          details: [],
        },
      ];
    },

    requestConversation: async () => ({
      text:
        "The target record is resolved. Continue through its existing governed operation and Review.",
      resolution: workspaceResolution({
        reviewRequired: true,
      }),
    }),
  });

  await w.send(instruction);

  const resolutionCard = document.querySelector(
    ".ask-meetro-resolution-review"
  );

  assert.ok(resolutionCard);
  assert.match(resolutionCard.textContent, /Resolved · not applied/);
  assert.match(resolutionCard.textContent, /Review required/);
  assert.match(resolutionCard.textContent, /Anthony Guzman/);

  assert.equal(
    document.querySelectorAll(".ask-meetro-actions article").length,
    1
  );

  assert.equal(document.querySelector(".ask-meetro-review"), null);
  assert.equal(document.querySelector(".ask-meetro-receipts"), null);

  assert.ok(
    ![...document.querySelectorAll("button")].some(
      (button) => button.textContent.trim() === "Confirm & Apply"
    )
  );

  await w.click("Review");

  assert.ok(document.querySelector(".ask-meetro-review"));

  assert.ok(
    ![...document.querySelectorAll("button")].some(
      (button) => button.textContent.trim() === "Confirm & Apply"
    )
  );

  await w.click("Open record to review");

  assert.deepEqual(w.routes, [
    `workCenter?jobId=${JOB}&stage=work`,
  ]);
  assert.equal(document.querySelector(".ask-meetro-receipts"), null);
});

test("Ask Meetro composer grows, caps at 144px, scrolls internally, and shrinks again", async (t) => {
  await mount(t);

  const input = document.querySelector(
    ".ask-meetro-composer textarea"
  );

  let measuredScrollHeight = 44;

  Object.defineProperty(input, "scrollHeight", {
    configurable: true,
    get: () => measuredScrollHeight,
  });

  async function setComposer(value, scrollHeight) {
    measuredScrollHeight = scrollHeight;

    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      ).set.call(input, value);

      input.dispatchEvent(
        new Event("input", { bubbles: true })
      );

      await pause();
    });
  }

  await setComposer("Short", 44);
  assert.equal(input.style.height, "44px");
  assert.equal(input.style.overflowY, "hidden");
  assert.equal(input.style.overflowX, "hidden");

  await setComposer("Line one\nLine two\nLine three", 96);
  assert.equal(input.style.height, "96px");
  assert.equal(input.style.overflowY, "hidden");

  await setComposer(
    "One\nTwo\nThree\nFour\nFive\nSix\nSeven\nEight",
    220
  );

  assert.equal(input.style.height, "144px");
  assert.equal(input.style.overflowY, "auto");
  assert.equal(input.style.overflowX, "hidden");

  await setComposer("Short again", 44);

  assert.equal(input.style.height, "44px");
  assert.equal(input.style.overflowY, "hidden");
});

test("voice transcript expands the editable composer but never sends or opens Review automatically", async (t) => {
  let recognition;

  window.SpeechRecognition = class {
    constructor() {
      recognition = this;
    }

    start() {
      this.onstart();
    }

    abort() {}
  };

  t.after(() => {
    delete window.SpeechRecognition;
  });

  const w = await mount(t);

  const input = document.querySelector(
    ".ask-meetro-composer textarea"
  );

  let measuredScrollHeight = 44;

  Object.defineProperty(input, "scrollHeight", {
    configurable: true,
    get: () => measuredScrollHeight,
  });

  await w.click("Voice");

  assert.equal(input.style.height, "44px");

  measuredScrollHeight = 120;

  const result = [{
    transcript:
      "Complete this job after reviewing all of the work that was documented today",
  }];

  result.isFinal = true;

  await act(async () => {
    recognition.onresult({ results: [result] });
    await pause();
  });

  assert.match(input.value, /Complete this job/);
  assert.equal(input.style.height, "120px");

  // Voice produces only an editable draft.
  assert.equal(w.calls.length, 0);
  assert.deepEqual(w.routes, []);
  assert.equal(document.querySelector(".ask-meetro-actions"), null);
  assert.equal(document.querySelector(".ask-meetro-review"), null);
  assert.equal(document.querySelector(".ask-meetro-receipts"), null);

  assert.equal(
    document.querySelector('[aria-label="Send"]').disabled,
    false
  );
});

test("resolved vague Quote update asks for the exact change instead of presenting Review without a governed route", async (t) => {
  const requestConversation = async () => ({
    text:
      "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
    resolution: {
      version: 1,
      status: "RESOLVED",
      audience: "professional",
      records: [{
        record: {
          type: "QUOTE",
          id: EVIDENCE,
        },
        name: "Bob Hamel",
        title: "Window repair",
        number: "Q0000049",
        label: "Bob Hamel — Window repair",
      }],
      truncated: false,
      reviewRequired: true,
      continuation: {
        reference: "22222222-2222-4222-8222-222222222222",
        expiresAfterSeconds: 900,
      },
      answerSource: "DETERMINISTIC_RETRIEVAL",
      providerInvoked: false,
    },
  });

  const w = await mount(t, {
    context: { page: "home" },
    requestConversation,
    resolveActions: async () => [],
  });

  await w.send("Update Quote Q0000049");

  assert.match(
    w.text(),
    /Bob Hamel — Window repair/
  );

  assert.equal(
    document.querySelector(".ask-meetro-resolution-review"),
    null
  );

  assert.doesNotMatch(
    w.text(),
    /No safe direct Review route/
  );

  assert.match(
    w.text(),
    /what would you like to change/i
  );

  assert.equal(
    document.querySelector(".ask-meetro-actions"),
    null
  );

  assert.equal(
    document.querySelector(".ask-meetro-review"),
    null
  );
});

test("specific Quote edit pulls the exact working form into Ask without leaving the current page", async (t) => {
  const CANONICAL_QUOTE_ID =
    "7e742dc1-e2a2-49c6-a493-11e351c80d54";
  const WORKING_DRAFT_ID =
    "8b4ba9b7-9c65-4a90-9c25-1d536b82b3ea";

  const sourceDocument = {
    id: WORKING_DRAFT_ID,
    version: 7,
    documentType: "QUOTE",
    status: "WORKING_DRAFT",
    reference: "quote-working",
    documentNumber: "Q-0000049",
    jobId: null,
    customerParty: null,
    customerDisplayName: "Bob Hamel",
    paymentRequirementId: null,
    depositRequestAuthority: null,
    content: {
      customerName: "Bob Hamel",
      customerEmail: "",
      customerPhone: "",
      customerAddress: "",
      customerLocation: "",
      serviceLocation: "",
      projectTitle: "Window repair",
      projectDescription: "Window repair",
      recommendedSolution: "Repair window",
      laborType: "flat",
      laborAmount: "250",
      materials: [],
      paymentTerms: "",
      notes: "",
      depositRequired: false,
    },
    workspace: {
      activeDocument: "QUOTE",
      instructions: [],
      manualOverrides: {},
      privateReminders: [],
    },
    photos: [],
    createdAt: "2026-09-10T10:00:00.000Z",
    updatedAt: "2026-09-10T10:00:00.000Z",
  };

  const w = await mount(t, {
    host: true,
    context: {},
  });

  const underlying =
    document.querySelector('[aria-label="Existing unsaved Quote"]');

  assert.ok(underlying);

  await act(async () => {
    document.querySelector(".meetro-assistant-launcher").click();
    await pause();
  });

  globalThis.__dashboardHttp = async (path) => {
    if (path === "/api/companion/ask") {
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          code: "INTELLIGENCE_OPERATION_COMPLETED",
          operation: "companion.converse",
          result: {
            schemaVersion: 1,
            text:
              "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
            authorityClassification: "CONVERSATIONAL_NON_CANONICAL",
            directMutationAllowed: false,
            resolution: {
              version: 1,
              status: "RESOLVED",
              audience: "professional",
              records: [{
                record: {
                  type: "DOCUMENT_DRAFT",
                  id: WORKING_DRAFT_ID,
                },
                name: "Bob Hamel",
                title: "Window repair",
                number: "Q-0000049",
                label: "Bob Hamel — Window repair",
              }],
              truncated: false,
              reviewRequired: true,
              continuation: {
                reference: CANONICAL_QUOTE_ID,
                expiresAfterSeconds: 900,
              },
              answerSource: "DETERMINISTIC_RETRIEVAL",
              providerInvoked: false,
            },
          },
        },
      };
    }

    if (path.startsWith("/business-document-drafts?")) {
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          documents: [sourceDocument],
        },
      };
    }

    return {
      response: { ok: false, status: 503 },
      data: { success: false },
    };
  };

  await w.send("Update Quote Q0000049 labor to $300");

  // Universal Ask must not navigate away.
  assert.deepEqual(w.routes, []);

  // The page underneath Ask remains mounted with its unsaved state.
  assert.equal(
    document.querySelector('[aria-label="Existing unsaved Quote"]'),
    underlying
  );
  assert.equal(underlying.value, "Unsaved scope");

  let inline = document.querySelector(
    '[data-ask-inline-document="QUOTE"]'
  );

  assert.ok(inline, "verified Quote form should appear inside Ask Meetro");
  assert.equal(
    inline.getAttribute("data-document-id"),
    WORKING_DRAFT_ID
  );

  assert.match(inline.textContent, /Bob Hamel/);
  assert.match(inline.textContent, /Q-0000049/);

  // This must be a real editable form surface, not another navigation card.
  assert.ok(
    inline.querySelector("input, textarea, select"),
    "embedded Quote must expose existing editable form controls"
  );

  // The existing editor is hosted here, not the entire Quote workspace.
  assert.equal(inline.querySelector(".business-document-header"), null);
  assert.equal(inline.querySelector(".business-document-tabs"), null);
  assert.equal(inline.querySelector(".business-document-chat-shell"), null);
  assert.equal(inline.querySelector(".business-document-composer"), null);
  assert.equal(inline.querySelector(".desktop-sidebar"), null);
  assert.equal(inline.querySelector(".bottom-nav-item"), null);

  assert.doesNotMatch(inline.textContent, /Saved Files/);
  assert.doesNotMatch(inline.textContent, /Start New Quote/);

  // Ask owns the one conversation/composer.
  assert.equal(
    document.querySelectorAll(".ask-meetro-composer").length,
    1
  );

  // Ask remains the host rather than replacing the page.
  assert.ok(document.querySelector(".ask-meetro-workspace"));
  assert.deepEqual(w.routes, []);

  // R4.2A:
  // Ask is only the conversational entry point. Once the exact Quote
  // is resolved, the original instruction must enter the existing
  // Quote proposal engine exactly as if the professional typed it in
  // the normal Quote workspace.
  let quoteProposal = inline.querySelector(
    ".business-document-proposal"
  );

  assert.ok(
    quoteProposal,
    "Ask instruction must enter the existing Quote proposal review"
  );

  assert.match(
    quoteProposal.textContent,
    /Proposed Quote changes/i
  );

  assert.match(
    quoteProposal.textContent,
    /labor/i
  );

  assert.match(
    quoteProposal.textContent,
    /300/,
    "the requested $300 labor value must be proposed before any manual edit"
  );

  // Nothing is applied merely because Ask resolved the command.
  assert.doesNotMatch(
    inline.textContent,
    /Unsaved working changes/i
  );

  // Hosted Quote must retain the real owning-workspace capabilities,
  // not a reduced Ask-only manual editor.
  for (const label of [
    "Preview PDF",
    "Download PDF",
    "Send Quote",
  ]) {
    assert.ok(
      [...inline.querySelectorAll("button")].some(
        (button) => button.textContent.trim().startsWith(label)
      ),
      `hosted Quote must retain ${label}`
    );
  }

  // R4.1 continuity:
  // Closing the entire Ask panel must preserve this same-context
  // verified working-Quote handoff. The conversation and form
  // must return together when Ask is reopened.
  await w.click("Close Ask Meetro");

  assert.equal(
    document.querySelector(".ask-meetro-workspace"),
    null
  );

  assert.equal(
    document.querySelector(
      '[aria-label="Existing unsaved Quote"]'
    ),
    underlying
  );

  for (let attempt = 0; attempt < 160 && !document.querySelector(".meetro-assistant-launcher"); attempt += 1) {
    await act(async () => { await pause(); });
  }
  await act(async () => {
    const launcher = document.querySelector(".meetro-assistant-launcher");
    assert.ok(launcher, "Ask launcher returns after the close transition");
    launcher.click();
    await pause();
  });

  assert.ok(
    document.querySelector(".ask-meetro-workspace"),
    "Ask Meetro should reopen"
  );

  assert.match(
    w.text(),
    /exact working Quote is ready here/i,
    "the resolved Ask conversation should remain"
  );

  inline = document.querySelector(
    '[data-ask-inline-document="QUOTE"]'
  );

  assert.ok(
    inline,
    "the verified working Quote form must return with the same Ask session"
  );

  assert.equal(
    inline.getAttribute("data-document-id"),
    WORKING_DRAFT_ID
  );

  assert.deepEqual(
    w.routes,
    [],
    "same-context Ask reopen must not navigate"
  );

  // The same held Ask instruction must rebuild the existing Quote
  // proposal after a normal Ask close/reopen.
  quoteProposal = inline.querySelector(
    ".business-document-proposal"
  );

  assert.ok(
    quoteProposal,
    "verified Quote proposal must return with the hosted workspace"
  );

  assert.match(quoteProposal.textContent, /labor/i);
  assert.match(quoteProposal.textContent, /300/);

  // Explicit professional Apply is still required.
  await w.click("Apply");

  assert.match(
    inline.textContent,
    /Unsaved working changes/
  );

  // R4.2A:
  // A hosted Quote must continue through the SAME governed delivery
  // workflow as the normal Quote panel. Ask must not create a shortcut
  // that silently saves, issues, or sends anything.
  const hostedSendQuote = [
    ...inline.querySelectorAll("button"),
  ].find((button) =>
    button.textContent.trim().startsWith("Send Quote")
  );

  assert.ok(
    hostedSendQuote,
    "hosted Quote must expose the owning workspace Send Quote action"
  );

  await act(async () => {
    hostedSendQuote.click();
    await pause();
  });

  await w.click("Email with Meetro");

  // Because the Quote has applied-but-unsaved changes, the owning
  // workspace must stop delivery and show either its exact save-before-send
  // gate or Quote Safety gate. No delivery may bypass those controls.
  const governedSendDialog =
    document.querySelector(
      '[data-dialog-purpose="business-document-delivery-save-title"]'
    ) ||
    document.querySelector(
      '[data-dialog-purpose="business-document-quote-safety-title"]'
    );

  assert.ok(
    governedSendDialog,
    "hosted Quote Send must render the existing governed save/safety dialog"
  );

  assert.match(
    governedSendDialog.textContent,
    /Save changes before sending|Review Quote before sending|Quote needs attention/i
  );

  // Cancel the send attempt so the existing leave-guard assertions below
  // continue testing the same applied-but-unsaved Quote.
  const cancelHostedSend = [
    ...governedSendDialog.querySelectorAll("button"),
  ].find((button) => button.textContent.trim() === "Cancel");

  assert.ok(
    cancelHostedSend,
    "governed hosted send dialog must remain cancellable"
  );

  await act(async () => {
    cancelHostedSend.click();
    await pause();
  });

  // Closing an applied-but-unsaved Quote must enter the existing leave guard.
  await w.click("Close form");

  const exitDialog = document.querySelector(
    '[data-dialog-purpose="business-document-exit-title"]'
  );

  assert.ok(
    exitDialog,
    "unsaved inline Quote must require Save / Discard / Keep Editing"
  );

  assert.match(
    exitDialog.textContent,
    /Save changes before leaving/
  );

  // The form must still be mounted while the decision is pending.
  assert.ok(
    document.querySelector('[data-ask-inline-document="QUOTE"]')
  );
  assert.ok(document.querySelector(".ask-meetro-workspace"));
  assert.deepEqual(w.routes, []);

  // Keep Editing must return to the exact same in-panel form.
  await w.click("Keep Editing");

  assert.equal(
    document.querySelector(
      '[data-dialog-purpose="business-document-exit-title"]'
    ),
    null
  );

  assert.ok(
    document.querySelector('[data-ask-inline-document="QUOTE"]')
  );

  // Discard is an explicit decision; only then may the form close.
  await w.click("Close form");
  await w.click("Discard Changes");

  assert.equal(
    document.querySelector('[data-ask-inline-document="QUOTE"]'),
    null
  );

  // Ask itself stays open with the original conversation.
  assert.ok(document.querySelector(".ask-meetro-workspace"));
  assert.match(
    document.querySelector(".ask-meetro-conversation").textContent,
    /Update Quote Q0000049 labor to \$300/
  );

  // Explicitly discarding the embedded form must also clear the
  // same-context Ask session handoff. Reopening Ask may restore
  // the conversation, but it must not resurrect a dismissed form.
  await w.click("Close Ask Meetro");

  assert.equal(
    document.querySelector(".ask-meetro-workspace"),
    null
  );

  for (let attempt = 0; attempt < 160 && !document.querySelector(".meetro-assistant-launcher"); attempt += 1) {
    await act(async () => { await pause(); });
  }
  await act(async () => {
    const launcher = document.querySelector(".meetro-assistant-launcher");
    assert.ok(launcher, "Ask launcher returns after the close transition");
    launcher.click();
    await pause();
  });

  assert.ok(
    document.querySelector(".ask-meetro-workspace"),
    "Ask Meetro should reopen after explicit form dismissal"
  );

  assert.match(
    document.querySelector(".ask-meetro-conversation").textContent,
    /Update Quote Q0000049 labor to \$300/,
    "the Ask conversation should remain"
  );

  assert.equal(
    document.querySelector(
      '[data-ask-inline-document="QUOTE"]'
    ),
    null,
    "a deliberately discarded embedded Quote form must not return"
  );

  // The page underneath Ask has never been navigated or unmounted.
  assert.equal(
    document.querySelector('[aria-label="Existing unsaved Quote"]'),
    underlying
  );
  assert.equal(underlying.value, "Unsaved scope");
  assert.deepEqual(w.routes, []);
});

test("vague resolved Quote holds its exact target for the next change without repeating the Quote number", async (t) => {
  const DRAFT_ID =
    "8b4ba9b7-9c65-4a90-9c25-1d536b82b3ea";
  const CONTINUATION_ID =
    "7e742dc1-e2a2-49c6-a493-11e351c80d54";

  const sourceDocument = {
    id: DRAFT_ID,
    version: 7,
    documentType: "QUOTE",
    status: "WORKING_DRAFT",
    reference: "quote-working",
    documentNumber: "Q-0000049",
    jobId: null,
    customerParty: null,
    customerDisplayName: "Bob Hamel",
    paymentRequirementId: null,
    depositRequestAuthority: null,
    content: {
      customerName: "Bob Hamel",
      customerEmail: "",
      customerPhone: "",
      customerAddress: "",
      customerLocation: "",
      serviceLocation: "",
      projectTitle: "Window repair",
      projectDescription: "Window repair",
      recommendedSolution: "Repair window",
      totalOverride: "250",
      lineItems: [],
      materialItems: [],
      laborItems: [],
      pricingDisplayMode: "TOTAL_ONLY",
      materialsDisplayMode: "INCLUDED_IN_TOTAL",
      depositMode: "NONE",
      depositPercent: "",
      depositFixedAmount: "",
      terms: "",
      paymentTerms: "",
      estimatedDuration: "",
      notes: "",
      agreement: { exclusions: [] },
    },
    workspace: {
      activeDocument: "QUOTE",
      instructions: [],
      manualOverrides: {},
      privateReminders: [],
    },
    photos: [],
    createdAt: "2026-09-10T10:00:00.000Z",
    updatedAt: "2026-09-10T10:00:00.000Z",
  };

  const conversationCalls = [];

  const requestConversation = async (options) => {
    conversationCalls.push({
      instruction: options.instruction,
      context: options.context,
    });

    return {
      text:
        "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
      resolution: {
        version: 1,
        status: "RESOLVED",
        audience: "professional",
        records: [{
          record: {
            type: "DOCUMENT_DRAFT",
            id: DRAFT_ID,
          },
          name: "Bob Hamel",
          title: "Window repair",
          number: "Q-0000049",
          label: "Bob Hamel — Window repair",
        }],
        truncated: false,
        reviewRequired: true,
        continuation: {
          reference: CONTINUATION_ID,
          expiresAfterSeconds: 900,
        },
        answerSource: "DETERMINISTIC_RETRIEVAL",
        providerInvoked: false,
      },
    };
  };

  const w = await mount(t, {
    context: {},
    requestConversation,
  });

  // mount() installs its own dashboard transport fixture, so install this
  // exact Saved Files response afterwards. The custom requestConversation
  // still owns /api/companion/ask for this characterization.
  globalThis.__dashboardHttp = async (path) => {
    if (path.startsWith("/business-document-drafts?")) {
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          documents: [sourceDocument],
        },
      };
    }

    return {
      response: { ok: false, status: 503 },
      data: { success: false },
    };
  };

  await w.send("Update Quote Q0000049");

  assert.equal(conversationCalls.length, 1);
  assert.match(
    w.text(),
    /What would you like to change on this Quote/i
  );

  assert.equal(
    document.querySelector('[data-ask-inline-document="QUOTE"]'),
    null
  );

  // Follow-up deliberately does NOT repeat Q-0000049.
  await w.send("Change labor to $300");

  assert.equal(conversationCalls.length, 2);

  // The visible/user instruction remains exactly what the user typed.
  assert.equal(
    conversationCalls[1].instruction,
    "Change labor to $300"
  );

  // Meetro must bind the already verified working Quote as exact context
  // instead of asking Universal Retrieval to infer the target again.
  assert.equal(
    conversationCalls[1].context?.page,
    "quoteBuilder"
  );

  assert.equal(
    conversationCalls[1].context?.draftId,
    DRAFT_ID
  );

  const inline = document.querySelector(
    '[data-ask-inline-document="QUOTE"]'
  );

  assert.ok(
    inline,
    "held exact Quote should open in-panel on the follow-up change"
  );

  assert.equal(
    inline.getAttribute("data-document-id"),
    DRAFT_ID
  );

  assert.match(inline.textContent, /Bob Hamel/);
  assert.match(inline.textContent, /Q-0000049/);

  // No navigation was required and no Quote number was inserted into
  // the user's visible follow-up message.
  assert.deepEqual(w.routes, []);

  const userMessages = [
    ...document.querySelectorAll(
      ".ask-meetro-message.is-user"
    ),
  ].map((node) => node.textContent);

  assert.ok(
    userMessages.some((text) =>
      text.includes("Change labor to $300")
    )
  );

  assert.ok(
    document.querySelector(".ask-meetro-workspace")
  );
});


test("embedded Ask Quote save preserves every existing saved photo in the exact draft PATCH", async (t) => {
  const DRAFT_ID =
    "8b4ba9b7-9c65-4a90-9c25-1d536b82b3ea";
  const CONTINUATION_ID =
    "7e742dc1-e2a2-49c6-a493-11e351c80d54";

  const SAVED_PHOTO = {
    id: "saved-photo-before-window",
    name: "Document photo",
    purpose: "quote-draft-photo",
    media: {
      public_id: "meetro/quotes/window-before",
      secure_url:
        "https://res.cloudinary.com/meetro/image/upload/window-before.jpg",
    },
    role: "BEFORE",
    visibility: "CUSTOMER_VISIBLE",
  };

  const sourceDocument = {
    id: DRAFT_ID,
    version: 7,
    documentType: "QUOTE",
    status: "WORKING_DRAFT",
    reference: "quote-working",
    documentNumber: "Q-0000049",
    jobId: null,
    customerParty: null,
    customerDisplayName: "Bob Hamel",
    paymentRequirementId: null,
    depositRequestAuthority: null,
    content: {
      customerName: "Bob Hamel",
      customerEmail: "",
      customerPhone: "",
      customerAddress: "",
      customerLocation: "",
      serviceLocation: "",
      projectTitle: "Window repair",
      projectDescription: "Window repair",
      recommendedSolution: "Repair window",
      laborType: "flat",
      laborAmount: "250",
      materials: [],
      paymentTerms: "",
      notes: "",
      depositRequired: false,
    },
    workspace: {
      activeDocument: "QUOTE",
      instructions: [],
      manualOverrides: {},
      privateReminders: [],
    },
    photos: [SAVED_PHOTO],
    createdAt: "2026-09-10T10:00:00.000Z",
    updatedAt: "2026-09-10T10:00:00.000Z",
  };

  const requestConversation = async () => ({
    text:
      "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
    resolution: {
      version: 1,
      status: "RESOLVED",
      audience: "professional",
      records: [{
        record: {
          type: "DOCUMENT_DRAFT",
          id: DRAFT_ID,
        },
        name: "Bob Hamel",
        title: "Window repair",
        number: "Q-0000049",
        label: "Bob Hamel — Window repair",
      }],
      truncated: false,
      reviewRequired: true,
      continuation: {
        reference: CONTINUATION_ID,
        expiresAfterSeconds: 900,
      },
      answerSource: "DETERMINISTIC_RETRIEVAL",
      providerInvoked: false,
    },
  });

  const patchBodies = [];

  const w = await mount(t, {
    context: {},
    requestConversation,
  });

  // mount() owns the default test transport. Replace it afterwards
  // with the exact Saved Files + PATCH transport for this contract.
  globalThis.__dashboardHttp = async (path, options = {}) => {
    if (path.startsWith("/business-document-drafts?")) {
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          documents: [sourceDocument],
        },
      };
    }

    if (
      path === `/business-document-drafts/${DRAFT_ID}` &&
      options.method === "PATCH"
    ) {
      const body = JSON.parse(options.body || "{}");
      patchBodies.push(body);

      const {
        expectedVersion,
        ...payload
      } = body;

      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          document: {
            ...sourceDocument,
            ...payload,
            id: DRAFT_ID,
            version: expectedVersion + 1,
            documentType: "QUOTE",
            status: "WORKING_DRAFT",
            reference: sourceDocument.reference,
            documentNumber: sourceDocument.documentNumber,
            customerDisplayName:
              sourceDocument.customerDisplayName,
            paymentRequirementId: null,
            depositRequestAuthority: null,
            updatedAt: "2026-09-10T12:30:00.000Z",
          },
        },
      };
    }

    return {
      response: { ok: false, status: 503 },
      data: { success: false },
    };
  };

  await w.send(
    "Update Quote Q0000049 labor to $300"
  );

  const inline = document.querySelector(
    '[data-ask-inline-document="QUOTE"]'
  );

  assert.ok(inline);
  assert.equal(
    inline.getAttribute("data-document-id"),
    DRAFT_ID
  );

  const proposal = inline.querySelector(
    ".business-document-proposal"
  );

  assert.ok(
    proposal,
    "Ask instruction must create the real Quote proposal before Save"
  );

  assert.match(proposal.textContent, /labor/i);
  assert.match(proposal.textContent, /300/);

  await w.click("Apply");

  assert.match(
    inline.textContent,
    /Unsaved working changes/
  );

  const saveButton = inline.querySelector(
    ".business-document-save"
  );

  assert.ok(
    saveButton,
    "hosted Quote must expose the owning workspace Save action"
  );

  await act(async () => {
    saveButton.click();
    await pause();
  });

  assert.equal(
    patchBodies.length,
    1,
    "embedded Quote must save through one exact draft PATCH"
  );

  assert.equal(
    document.querySelector(
      '[data-dialog-purpose="business-document-save-failure-title"]'
    ),
    null,
    "the exact returned saved Quote must pass workspace fingerprint verification"
  );

  assert.doesNotMatch(
    inline.textContent,
    /Unsaved working changes/,
    "successful Save must leave the hosted Quote clean"
  );

  assert.match(
    inline.textContent,
    /Exact working Quote/,
    "hosted workspace must recognize the newly saved exact Quote"
  );

  const patch = patchBodies[0];

  assert.equal(
    patch.expectedVersion,
    7
  );

  assert.equal(
    String(
      patch.content?.laborItems?.[0]?.total ?? ""
    ),
    "300",
    "saved Quote must persist the labor value requested through Ask Meetro"
  );

  assert.equal(
    patch.photos.length,
    1,
    "editing Quote text/pricing inside Ask must not drop or duplicate saved photos"
  );

  const [persistedPhoto] = patch.photos;

  assert.equal(
    persistedPhoto.id,
    SAVED_PHOTO.id,
    "saved photo identity must be preserved"
  );

  assert.deepEqual(
    persistedPhoto.media,
    SAVED_PHOTO.media,
    "saved photo media authority must be preserved"
  );

  assert.equal(
    persistedPhoto.role,
    SAVED_PHOTO.role,
    "saved photo role must be preserved"
  );

  assert.equal(
    persistedPhoto.visibility,
    SAVED_PHOTO.visibility,
    "saved photo visibility must be preserved"
  );

  // The normal business-document persistence projection may enrich an
  // existing durable photo with document presentation metadata.
  assert.equal(persistedPhoto.name, "Document photo");
  assert.equal(persistedPhoto.purpose, "quote-draft-photo");

  // R4.2A:
  // Now that the requested $300 labor change is durably saved,
  // the hosted Quote must behave exactly like the owning Quote
  // workspace for PDF/delivery review.
  const savedInline = document.querySelector(
    '[data-ask-inline-document="QUOTE"]'
  );

  assert.ok(
    savedInline,
    "saved hosted Quote must remain open inside Ask"
  );

  const sendQuote = [
    ...savedInline.querySelectorAll("button"),
  ].find((button) =>
    button.textContent.trim().startsWith("Send Quote")
  );

  assert.ok(
    sendQuote,
    "saved hosted Quote must retain Send Quote"
  );

  await act(async () => {
    sendQuote.click();
    await pause();
  });

  await w.click("Email with Meetro");

  // The exact saved Quote is commercially valid but intentionally
  // lacks payment terms and duration, so the existing Quote Safety
  // advisory gate must appear.
  const quoteSafety = document.querySelector(
    '[data-dialog-purpose="business-document-quote-safety-title"]'
  );


  assert.ok(
    quoteSafety,
    "saved hosted Quote must preserve Quote Safety"
  );

  assert.match(
    quoteSafety.textContent,
    /Review Quote before sending/i
  );

  assert.doesNotMatch(
    quoteSafety.textContent,
    /Must correct/i,
    "the durably saved $300 Quote must not have blocking send errors"
  );

  assert.match(
    quoteSafety.textContent,
    /payment terms/i
  );

  assert.match(
    quoteSafety.textContent,
    /estimated duration/i
  );

  await w.click("Send Anyway");

  const deliveryReview = document.querySelector(
    '[data-dialog-purpose="business-document-delivery-review-title"]'
  );

  assert.ok(
    deliveryReview,
    "Quote Safety acknowledgement must continue into Delivery Review"
  );

  assert.match(
    deliveryReview.textContent,
    /Review Quote Email/i
  );

  assert.match(
    deliveryReview.textContent,
    /Exact saved version/i
  );

  assert.match(
    deliveryReview.textContent,
    /8/,
    "delivery review must use the newly saved v8 Quote"
  );

  assert.match(
    deliveryReview.textContent,
    /PDF included/i
  );

  const recipient = deliveryReview.querySelector(
    'input[type="email"]'
  );

  assert.ok(
    recipient,
    "real Delivery Review recipient control must remain available"
  );

  await act(async () => {
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set.call(recipient, "bob@example.com");

    recipient.dispatchEvent(
      new Event("input", { bubbles: true })
    );

    await pause();
  });

  // Review still is not transport authority.
  await w.click("Send Email");

  const finalSend = document.querySelector(
    '[data-dialog-purpose="business-document-quote-final-send-title"]'
  );

  assert.ok(
    finalSend,
    "hosted Quote must require final Send this Quote confirmation"
  );

  assert.match(
    finalSend.textContent,
    /Send this Quote\?/i
  );

  assert.match(
    finalSend.textContent,
    /Bob Hamel/i
  );

  assert.match(
    finalSend.textContent,
    /Q-0000049/i
  );

  assert.match(
    finalSend.textContent,
    /300/,
    "final customer-facing confirmation must reflect the saved $300 Quote"
  );

  assert.match(
    finalSend.textContent,
    /This will send this saved Quote to the customer/i
  );

  // Stop before transport.
  const cancelFinal = [
    ...finalSend.querySelectorAll("button"),
  ].find((button) =>
    button.textContent.trim() === "Cancel"
  );

  assert.ok(cancelFinal);

  await act(async () => {
    cancelFinal.click();
    await pause();
  });

  assert.equal(
    document.querySelector(
      '[data-dialog-purpose="business-document-quote-final-send-title"]'
    ),
    null
  );

  // Final-confirm Cancel intentionally returns to the existing
  // Delivery Review instead of discarding its recipient/message.
  assert.ok(
    document.querySelector(
      '[data-dialog-purpose="business-document-delivery-review-title"]'
    )
  );

  await w.click("Cancel");

  assert.equal(
    document.querySelector(
      '[data-dialog-purpose="business-document-delivery-review-title"]'
    ),
    null
  );

  assert.deepEqual(w.routes, []);
  assert.ok(document.querySelector(".ask-meetro-workspace"));
});


test("Job-linked Quote inside Ask uses exact governed Review & Send authority before any canonical mutation", async (t) => {
  const DRAFT_ID =
    "9c6cbac8-7e6d-4f98-a80a-9b8f5fd42901";

  const CANONICAL_QUOTE_ID =
    "33333333-3333-4333-8333-333333333333";

  const ISSUER_PARTICIPANT_ID =
    "44444444-4444-4444-8444-444444444444";

  let canonicalState = null;
  let deliveryEvidence = null;

  let durableDocument = {
    id: DRAFT_ID,
    version: 7,
    documentType: "QUOTE",
    status: "WORKING_DRAFT",
    reference: "job-linked-quote-working",
    documentNumber: "Q-0000050",
    jobId: JOB,
    customerParty: null,
    customerDisplayName: "Bob Hamel",
    paymentRequirementId: null,
    depositRequestAuthority: null,
    content: {
      customerName: "Bob Hamel",
      customerEmail: "",
      customerPhone: "",
      customerAddress: "",
      customerLocation: "",
      serviceLocation: "",
      projectTitle: "Window repair",
      projectDescription: "Window repair",
      recommendedSolution: "Repair window",
      workPerformed: "",
      totalOverride: "",
      terms: "",
      paymentTerms: "Due upon completion",
      pricingDisplayMode: "",
      materialsDisplayMode: "INCLUDED_IN_TOTAL",
      depositMode: "NONE",
      depositPercent: "",
      depositFixedAmount: "",
      estimatedDuration: "1 day",
      dueDate: "",
      notes: "",
      quoteReference: "",
      quoteNumber: "",
      invoiceNumber: "",
      quoteDate: "",
      invoiceDate: "",
      currency: "USD",
      agreement: {
        exclusions: [],
      },
      lineItems: [],
      materialItems: [],
      laborItems: [
        {
          description: "Window repair labor",
          total: "250",
        },
      ],
    },
    workspace: {
      activeDocument: "QUOTE",
      instructions: [],
      manualOverrides: {},
      privateReminders: [],
    },
    photos: [],
    createdAt: "2026-09-10T10:00:00.000Z",
    updatedAt: "2026-09-10T10:00:00.000Z",
  };

  const requestConversation = async () => ({
    text:
      "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
    resolution: {
      version: 1,
      status: "RESOLVED",
      audience: "professional",
      records: [{
        record: {
          type: "DOCUMENT_DRAFT",
          id: DRAFT_ID,
        },
        name: "Bob Hamel",
        title: "Window repair",
        number: "Q-0000050",
        label: "Bob Hamel — Window repair",
      }],
      truncated: false,
      reviewRequired: true,
      continuation: {
        reference:
          "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        expiresAfterSeconds: 900,
      },
      answerSource: "DETERMINISTIC_RETRIEVAL",
      providerInvoked: false,
    },
  });

  const transportCalls = [];
  const patchBodies = [];

  const w = await mount(t, {
    context: {},
    requestConversation,
  });

  globalThis.__dashboardHttp = async (path, options = {}) => {
    transportCalls.push({
      path,
      method: options.method || "GET",
      body: options.body || "",
    });

    if (path.startsWith("/business-document-drafts?")) {
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          documents: [durableDocument],
        },
      };
    }

    // Existing saved-Quote authority hydration.
    // Before confirmed Send there is no canonical mapping.
    // After issuance the same authenticated read returns the exact
    // server-owned canonical Quote.
    if (path === `/jobs/${JOB}/quotes`) {
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          code: "JOB_DRAFT_QUOTES_FOUND",
          quotes: canonicalState ? [canonicalState] : [],
        },
      };
    }

    if (
      path === `/business-document-drafts/${DRAFT_ID}` &&
      options.method === "PATCH"
    ) {
      const body = JSON.parse(options.body || "{}");
      patchBodies.push(body);

      const {
        expectedVersion,
        ...payload
      } = body;

      assert.equal(
        expectedVersion,
        7,
        "Ask must save against the exact reviewed v7 Quote"
      );

      durableDocument = {
        ...durableDocument,
        ...payload,
        id: DRAFT_ID,
        version: 8,
        documentType: "QUOTE",
        status: "WORKING_DRAFT",
        jobId: JOB,
        documentNumber: "Q-0000050",
        customerDisplayName: "Bob Hamel",
        updatedAt: "2026-09-10T12:30:00.000Z",
      };

      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          document: durableDocument,
        },
      };
    }

    // Governed review must independently re-read the exact saved v8.
    if (
      path === `/business-document-drafts/${DRAFT_ID}` &&
      (!options.method || options.method === "GET")
    ) {
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          document: durableDocument,
        },
      };
    }

    if (
      path ===
        `/business-document-drafts/${DRAFT_ID}/quote-review?version=8`
    ) {
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          review: {
            documentId: DRAFT_ID,
            documentVersion: 8,
            jobId: JOB,
            requestId: 23,
            relationshipId: 345,
            customerName: "Bob Hamel",
            projectTitle: "Window repair",
            quoteSafety: {
              ready: true,
              blockingErrors: [],
              warnings: [],
            },
          },
        },
      };
    }

    // Final-confirmed governed path:
    // exact Working Quote -> canonical Draft.
    if (
      path ===
        `/business-document-drafts/${DRAFT_ID}/canonical-quote` &&
      options.method === "POST"
    ) {
      const body = JSON.parse(options.body || "{}");

      assert.deepEqual(body, {
        expectedDocumentVersion: 8,
      });

      assert.match(
        String(options.headers?.["Idempotency-Key"] || ""),
        /^working-quote-bridge-/
      );

      canonicalState = {
        id: CANONICAL_QUOTE_ID,
        jobId: JOB,
        requestId: 23,
        relationshipId: 345,
        issuerParticipantId: ISSUER_PARTICIPANT_ID,
        status: "DRAFT",
        issuedAt: null,
        currency: "USD",
        currentVersion: 1,
        totalMinor: 30000,
        decisionState: null,
        decisionVersion: null,
        decidedAt: null,
        documentNumber: "Q-0000050",
        sourceBusinessDocument: {
          documentId: DRAFT_ID,
          documentVersion: 8,
        },
        versions: [{
          version: 1,
          status: "DRAFT",
          totalMinor: 30000,
          integrityHash: "a".repeat(64),
        }],
      };

      return {
        response: { ok: true, status: 201 },
        data: {
          success: true,
          quote: canonicalState,
        },
      };
    }

    // Exact canonical Draft -> exact issued version.
    if (
      path === `/quotes/${CANONICAL_QUOTE_ID}/issue` &&
      options.method === "POST"
    ) {
      const body = JSON.parse(options.body || "{}");

      assert.deepEqual(body, {
        expectedVersion: 1,
      });

      assert.match(
        String(options.headers?.["Idempotency-Key"] || ""),
        /^working-quote-issue-/
      );

      canonicalState = {
        ...canonicalState,
        status: "ISSUED",
        issuedAt: "2026-09-11T11:15:00.000Z",
        currentVersion: 2,
        versions: [{
          version: 2,
          status: "ISSUED",
          totalMinor: 30000,
          integrityHash: "b".repeat(64),
        }],
      };

      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          quote: canonicalState,
        },
      };
    }

    // Exact issued Quote -> governed delivery authority.
    if (
      path ===
        `/professional/quotes/${CANONICAL_QUOTE_ID}/delivery` &&
      (!options.method || options.method === "GET")
    ) {
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          code: "PROFESSIONAL_QUOTE_DELIVERY_LOADED",
          delivery: {
            quoteId: CANONICAL_QUOTE_ID,
            jobId: JOB,
            expectedIssuedVersion: 2,
            messageType: "QUOTE_SHARED",
            snapshot: {
              schemaVersion: 1,
              quoteId: CANONICAL_QUOTE_ID,
              jobId: JOB,
              quoteNumber: "Q-0000050",
              lineageLabel: "Original",
              businessStatus: "WAITING_ON_CUSTOMER",
              totalMinor: 30000,
              currency: "USD",
              scopeItems: [{
                description: "Window repair labor",
                quantity: 1,
                amountMinor: 30000,
              }],
              conditions: [],
              exclusions: [],
              issuedAt: "2026-09-11T11:15:00.000Z",
              decidedAt: null,
              business: {
                displayName: "Meetro Test Business",
              },
              job: {
                title: "Window repair",
                service: null,
              },
            },
            actions: {
              canSendInMeetro: true,
            },
            conversation: {
              id: 341,
            },
            existingDelivery: deliveryEvidence,
          },
        },
      };
    }

    // Final governed Meetro delivery.
    if (
      path ===
        `/professional/quotes/${CANONICAL_QUOTE_ID}/send-in-meetro` &&
      options.method === "POST"
    ) {
      const body = JSON.parse(options.body || "{}");

      assert.deepEqual(body, {
        expectedIssuedVersion: 2,
        deliveryIntent: "INITIAL",
      });

      assert.match(
        String(options.headers?.["Idempotency-Key"] || ""),
        /^working-quote-delivery-/
      );

      deliveryEvidence = {
        messageId: 71,
        conversationId: 341,
        quoteId: CANONICAL_QUOTE_ID,
        jobId: JOB,
        messageType: "QUOTE_SHARED",
        state: "SENT_IN_MEETRO",
        sentAt: "2026-09-11T11:16:00.000Z",
        replayed: false,
      };

      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          code: "QUOTE_SENT_IN_MEETRO",
          delivery: deliveryEvidence,
        },
      };
    }

    // Delivery-history reads are non-authoritative for this contract.
    if (
      path.includes(`/business-document-drafts/${DRAFT_ID}`) &&
      path.includes("deliver")
    ) {
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          deliveries: [],
        },
      };
    }

    return {
      response: { ok: false, status: 503 },
      data: {
        success: false,
        code: "UNEXPECTED_TEST_ENDPOINT",
      },
    };
  };

  await w.send(
    "Update Quote Q0000050 labor to $300"
  );

  let inline = document.querySelector(
    '[data-ask-inline-document="QUOTE"]'
  );

  assert.ok(
    inline,
    "exact Job-linked Quote must open inside Ask"
  );

  assert.equal(
    inline.getAttribute("data-document-id"),
    DRAFT_ID
  );

  const proposal = inline.querySelector(
    ".business-document-proposal"
  );

  assert.ok(
    proposal,
    "Ask instruction must enter the real Quote proposal engine"
  );

  assert.match(proposal.textContent, /labor/i);
  assert.match(proposal.textContent, /300/);

  await w.click("Apply");

  assert.match(
    inline.textContent,
    /Unsaved working changes/
  );

  const save = inline.querySelector(
    ".business-document-save"
  );

  assert.ok(save);

  await act(async () => {
    save.click();
    await pause();
  });

  assert.equal(patchBodies.length, 1);
  assert.equal(
    patchBodies[0].content?.laborItems?.[0]?.total,
    "300"
  );

  assert.equal(
    document.querySelector(
      '[data-dialog-purpose="business-document-save-failure-title"]'
    ),
    null
  );

  // Allow the normal saved-Quote authority hydration to settle.
  let governedAction = null;

  for (let i = 0; i < 20; i += 1) {
    inline = document.querySelector(
      '[data-ask-inline-document="QUOTE"]'
    );

    governedAction = [
      ...inline.querySelectorAll("button"),
    ].find((button) =>
      button.textContent.trim() ===
        "Send Quote to Customer"
    );

    if (governedAction && !governedAction.disabled) break;

    await act(async () => {
      await pause();
    });
  }

  assert.ok(
    governedAction,
    "Job-linked hosted Quote must expose the owning governed send action"
  );

  assert.equal(
    governedAction.disabled,
    false,
    "governed send must be available only after saved authority hydration"
  );

  // Nothing canonical may have been mutated by opening/saving/editing.
  assert.deepEqual(
    transportCalls.filter((call) =>
      call.method === "POST"
    ),
    []
  );

  await act(async () => {
    governedAction.click();
    await pause();
  });

  // beginGovernedQuoteIssue performs exact saved-document + review reads.
  let issueReview = null;

  for (let i = 0; i < 20; i += 1) {
    issueReview = document.querySelector(
      '[data-dialog-purpose="business-document-quote-issue-title"]'
    );

    if (issueReview) break;

    await act(async () => {
      await pause();
    });
  }

  assert.ok(
    issueReview,
    "Job-linked Quote must enter the existing governed Quote issue review"
  );

  assert.match(
    issueReview.textContent,
    /Review & Send Quote/i
  );

  assert.match(issueReview.textContent, /Bob Hamel/i);
  assert.match(issueReview.textContent, /Window repair/i);
  assert.match(issueReview.textContent, /Q-0000050/i);
  assert.match(issueReview.textContent, /8/);
  assert.match(issueReview.textContent, /300/);

  assert.ok(
    transportCalls.some((call) =>
      call.method === "GET" &&
      call.path === `/business-document-drafts/${DRAFT_ID}`
    ),
    "governed review must re-read the exact saved Quote"
  );

  assert.ok(
    transportCalls.some((call) =>
      call.method === "GET" &&
      call.path ===
        `/business-document-drafts/${DRAFT_ID}/quote-review?version=8`
    ),
    "governed review must load exact-version server authority"
  );

  // Review itself still has zero canonical mutation authority.
  assert.deepEqual(
    transportCalls.filter((call) =>
      call.method === "POST"
    ),
    []
  );

  const reviewSend = [
    ...issueReview.querySelectorAll("button"),
  ].find((button) =>
    button.textContent.trim() ===
      "Send Quote to Customer"
  );

  assert.ok(reviewSend);
  assert.equal(reviewSend.disabled, false);

  await act(async () => {
    reviewSend.click();
    await pause();
  });

  const finalSend = document.querySelector(
    '[data-dialog-purpose="business-document-quote-final-send-title"]'
  );

  assert.ok(
    finalSend,
    "governed Job-linked Quote must require final Send this Quote confirmation"
  );

  assert.match(
    finalSend.textContent,
    /Send this Quote\?/i
  );

  assert.match(finalSend.textContent, /Bob Hamel/i);
  assert.match(finalSend.textContent, /Q-0000050/i);
  assert.match(finalSend.textContent, /300/);
  assert.match(finalSend.textContent, /Meetro Message/i);

  // Even reaching final confirmation must not bridge, issue, or deliver.
  assert.deepEqual(
    transportCalls.filter((call) =>
      call.method === "POST"
    ),
    []
  );

  // R4.2A confirmed-send boundary:
  // Only the user's explicit final Send Quote may authorize the canonical
  // bridge → issue → governed Meetro delivery chain.
  const finalConfirm = [
    ...finalSend.querySelectorAll("button"),
  ].find((button) =>
    button.textContent.trim() === "Send Quote"
  );

  assert.ok(finalConfirm);
  assert.equal(finalConfirm.disabled, false);

  await act(async () => {
    finalConfirm.click();
    await pause();
  });

  // Final confirmation is now the sole gateway into the canonical chain.
  let successReview = null;

  for (let i = 0; i < 40; i += 1) {
    successReview = document.querySelector(
      '[data-dialog-purpose="business-document-quote-issue-title"]'
    );

    if (
      successReview &&
      /Quote sent to customer/i.test(successReview.textContent)
    ) {
      break;
    }

    await act(async () => {
      await pause();
    });
  }

  assert.ok(
    successReview,
    "confirmed governed Send must retain the owning Quote result dialog"
  );

  assert.match(
    successReview.textContent,
    /Quote sent to customer/i
  );

  assert.match(
    successReview.textContent,
    /Q-0000050/i
  );

  assert.match(
    successReview.textContent,
    /Bob Hamel/i
  );

  assert.ok(
    deliveryEvidence,
    "successful UI completion requires authoritative delivery evidence"
  );

  assert.equal(deliveryEvidence.messageId, 71);
  assert.equal(deliveryEvidence.conversationId, 341);
  assert.equal(
    deliveryEvidence.quoteId,
    CANONICAL_QUOTE_ID
  );
  assert.equal(deliveryEvidence.jobId, JOB);
  assert.equal(deliveryEvidence.replayed, false);

  const canonicalPosts = transportCalls.filter((call) =>
    call.method === "POST"
  );

  assert.deepEqual(
    canonicalPosts.map((call) => call.path),
    [
      `/business-document-drafts/${DRAFT_ID}/canonical-quote`,
      `/quotes/${CANONICAL_QUOTE_ID}/issue`,
      `/professional/quotes/${CANONICAL_QUOTE_ID}/send-in-meetro`,
    ],
    "one final confirmation must produce exactly one bridge, one issue, and one governed delivery"
  );

  const bridgeBody = JSON.parse(
    canonicalPosts[0].body || "{}"
  );

  const issueBody = JSON.parse(
    canonicalPosts[1].body || "{}"
  );

  const deliveryBody = JSON.parse(
    canonicalPosts[2].body || "{}"
  );

  assert.deepEqual(bridgeBody, {
    expectedDocumentVersion: 8,
  });

  assert.deepEqual(issueBody, {
    expectedVersion: 1,
  });

  assert.deepEqual(deliveryBody, {
    expectedIssuedVersion: 2,
    deliveryIntent: "INITIAL",
  });

  assert.equal(
    document.querySelector(
      '[data-dialog-purpose="business-document-quote-final-send-title"]'
    ),
    null,
    "successful governed transport must close final confirmation"
  );

  assert.match(
    document.body.textContent,
    /Customer acceptance is still pending/i,
    "delivery must never fabricate customer acceptance"
  );

  // No unrelated lifecycle authority may have been invoked.
  assert.equal(
    transportCalls.some((call) =>
      /approve|decline|payment|schedule|invoice|complete/i.test(
        call.path
      )
    ),
    false
  );

  const closeSuccess = [
    ...successReview.querySelectorAll("button"),
  ].find((button) =>
    button.textContent.trim() === "Close"
  );

  assert.ok(closeSuccess);

  await act(async () => {
    closeSuccess.click();
    await pause();
  });

  assert.deepEqual(w.routes, []);
  assert.ok(
    document.querySelector(".ask-meetro-workspace")
  );
});


for (const hasCompletedJob of [false, true]) test(`specific working Invoice edit hosts the exact owner; completed Job: ${hasCompletedJob}`, async (t) => {
  const DRAFT_ID =
    "55a5d4de-c95c-47ae-bca0-e10830f34211";

  const CONTINUATION_ID =
    "f7c84a3d-4446-477b-8f7f-e6f08a99a211";

  const sourceDocument = {
    id: DRAFT_ID,
    version: 4,
    documentType: "INVOICE",
    status: "WORKING_DRAFT",
    reference: "invoice-working",
    documentNumber: "INV-0000012",
    jobId: hasCompletedJob ? JOB : null,
    customerParty: null,
    customerDisplayName: "Bob Hamel",
    paymentRequirementId: null,
    depositRequestAuthority: null,
    content: {
      customerName: "Bob Hamel",
      customerEmail: "bob@example.com",
      customerPhone: "",
      customerAddress: "",
      customerLocation: "",
      serviceLocation: "",
      projectTitle: "Window repair",
      projectDescription: "Window repair",
      recommendedSolution: "",
      workPerformed: "Window repair",
      totalOverride: "",
      terms: "",
      paymentTerms: "Due on receipt",
      pricingDisplayMode: "",
      materialsDisplayMode: "",
      depositMode: "",
      depositPercent: "",
      depositFixedAmount: "",
      estimatedDuration: "",
      dueDate: "",
      notes: "Original Invoice note",
      quoteReference: "",
      quoteNumber: "",
      invoiceNumber: "",
      quoteDate: "",
      invoiceDate: "2026-09-11",
      currency: "USD",
      agreement: {
        exclusions: [],
      },
      lineItems: [{
        description: "Window repair",
        quantity: "1",
        unitPrice: "380",
      }],
      materialItems: [],
      laborItems: [],
    },
    workspace: {
      activeDocument: "INVOICE",
      instructions: [],
      manualOverrides: {},
      privateReminders: [],
    },
    photos: [],
    createdAt: "2026-09-10T12:00:00.000Z",
    updatedAt: "2026-09-10T12:00:00.000Z",
  };

  const requestConversation = async () => ({
    text:
      "The target record is resolved. Continue through its existing governed operation and Review. Confirm & Apply is still required; nothing has been changed.",
    resolution: {
      version: 1,
      status: "RESOLVED",
      audience: "professional",
      records: [{
        record: {
          type: "DOCUMENT_DRAFT",
          id: DRAFT_ID,
        },
        name: "Bob Hamel",
        title: "Window repair",
        number: "INV-0000012",
        label: "Bob Hamel — Window repair",
      }],
      truncated: false,
      reviewRequired: true,
      continuation: {
        reference: CONTINUATION_ID,
        expiresAfterSeconds: 900,
      },
      answerSource: "DETERMINISTIC_RETRIEVAL",
      providerInvoked: false,
    },
  });

  const w = await mount(t, {
    context: {},
    requestConversation,
  });

  // The resolver must independently re-read the exact working Invoice.
  // Once the host mounts, the owning workspace may also consume this
  // provided durable document without navigating away.
  const patchBodies = [];
  const pdfReads = [];
  const deliveryPosts = [];
  let deliveryEvidence = null;

  globalThis.__dashboardHttp = async (path, options = {}) => {
    if (path.endsWith("/completion-review")) return { response: { ok: true }, data: { success: true, completionReview: { contractVersion: 1, jobId: JOB, requestId: 14, relationshipId: 22, currentVersion: 1, state: "COMPLETED", eligible: false, canComplete: false, reasons: [], work: { workstreamCount: 1, completedWorkstreamCount: 1, workItemCount: 1, completedWorkItemCount: 1 }, outstanding: { workstreams: 0, workItems: 0, obligations: 0, findings: 0 }, customerUpdates: { count: 1, status: "UP_TO_DATE" }, completedAt: "2026-09-11T12:00:00.000Z" } } };

    if (path.startsWith("/business-document-drafts?")) {
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          documents: [sourceDocument],
        },
      };
    }

    if (
      path === `/business-document-drafts/${DRAFT_ID}` &&
      options.method === "PATCH"
    ) {
      const body = JSON.parse(options.body || "{}");
      patchBodies.push(body);

      const {
        expectedVersion,
        ...payload
      } = body;

      assert.equal(
        expectedVersion,
        4,
        "hosted Invoice must save against the exact opened v4"
      );

      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          document: {
            ...sourceDocument,
            ...payload,
            id: DRAFT_ID,
            version: 5,
            documentType: "INVOICE",
            status: "WORKING_DRAFT",
            documentNumber: "INV-0000012",
            customerDisplayName: "Bob Hamel",
            updatedAt: "2026-09-11T12:15:00.000Z",
          },
        },
      };
    }

    // Exact saved Invoice PDF authority.
    if (
      path ===
        `/business-document-drafts/${DRAFT_ID}/customer-pdf?version=5`
    ) {
      pdfReads.push({
        path,
        responseType: options.responseType,
      });

      return {
        response: {
          ok: true,
          status: 200,
          headers: {
            get(name) {
              const key = String(name || "").toLowerCase();

              if (key === "content-type") {
                return "application/pdf";
              }

              if (key === "content-disposition") {
                return 'inline; filename="invoice-INV-0000012-v5.pdf"';
              }

              return null;
            },
          },
        },
        data: new Blob(
          ["%PDF-1.4 Meetro hosted Invoice v5"],
          { type: "application/pdf" }
        ),
      };
    }

    // Reopening the durable Invoice refreshes delivery history.
    if (
      path === `/business-document-drafts/${DRAFT_ID}/deliveries` &&
      (!options.method || options.method === "GET")
    ) {
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          deliveries: deliveryEvidence
            ? [deliveryEvidence]
            : [],
        },
      };
    }

    // Existing Invoice Delivery Review owns the only customer-send command.
    if (
      path === `/business-document-drafts/${DRAFT_ID}/deliveries` &&
      options.method === "POST"
    ) {
      const body = JSON.parse(options.body || "{}");

      deliveryPosts.push({
        path,
        body,
        idempotencyKey:
          options.headers?.["Idempotency-Key"] || "",
      });

      assert.deepEqual(
        body,
        {
          expectedVersion: 5,
          channel: "EMAIL",
          recipientEmail: "bob@example.com",
          subject: "Invoice INV-0000012",
          customerMessage:
            "Please review the attached customer document.",
        },
        "Invoice delivery must bind the exact newly saved v5 package"
      );

      assert.ok(
        options.headers?.["Idempotency-Key"],
        "Invoice delivery must retain the existing idempotency authority"
      );

      deliveryEvidence = {
        id: "44444444-4444-4444-8444-444444444444",
        documentId: DRAFT_ID,
        documentType: "INVOICE",
        documentReference: "invoice-working",
        documentNumber: "INV-0000012",
        documentVersion: 5,
        channel: "EMAIL",
        state: "DELIVERY_REQUESTED",
        recipientEmail: "bob@example.com",
        requestedAt: "2026-09-11T12:20:00.000Z",
      };

      return {
        response: { ok: true, status: 202 },
        data: {
          success: true,
          delivery: deliveryEvidence,
        },
      };
    }

    return {
      response: { ok: false, status: 503 },
      data: { success: false },
    };
  };

  await w.send(
    "Update Invoice INV0000012 payment terms to Net 15"
  );

  assert.deepEqual(
    w.routes,
    [],
    "Ask must host the Invoice instead of navigating to Invoice Builder"
  );

  const inline = document.querySelector(
    '[data-ask-inline-document="INVOICE"]'
  );

  assert.ok(
    inline,
    "verified working Invoice must appear inside Ask Meetro"
  );

  assert.equal(
    inline.getAttribute("data-document-id"),
    DRAFT_ID
  );

  assert.match(inline.textContent, /Bob Hamel/);
  assert.match(inline.textContent, /INV-0000012/);

  // It is the owning editable Invoice form, not a navigation card.
  assert.ok(
    inline.querySelector("input, textarea, select"),
    "hosted Invoice must expose existing editable form controls"
  );

  // Ask owns navigation and conversation chrome.
  assert.equal(
    inline.querySelector(".business-document-header"),
    null
  );

  assert.equal(
    inline.querySelector(".business-document-tabs"),
    null
  );

  assert.equal(
    inline.querySelector(".business-document-chat-shell"),
    null
  );

  assert.equal(
    inline.querySelector(".business-document-composer"),
    null
  );

  assert.equal(
    inline.querySelector(".desktop-sidebar"),
    null
  );

  assert.equal(
    inline.querySelector(".bottom-nav-item"),
    null
  );

  assert.equal(
    document.querySelectorAll(".ask-meetro-composer").length,
    1
  );

  // The normal owning Invoice actions must be available in Ask.
  const labels = [
    ...inline.querySelectorAll("button"),
  ].map((button) => button.textContent.trim());

  assert.ok(
    labels.includes("Preview PDF"),
    "hosted Invoice must preserve Preview PDF"
  );

  assert.ok(
    labels.includes("Download PDF"),
    "hosted Invoice must preserve Download PDF"
  );

  assert.ok(
    labels.some((label) =>
      label.startsWith("Send Invoice")
    ),
    "hosted Invoice must preserve the existing Send Invoice menu"
  );

  assert.ok(
    labels.includes("Save working Invoice"),
    "hosted Invoice must preserve the owning Save action"
  );

  // The original Ask instruction must enter the SAME Invoice proposal
  // engine used by the normal Unified workspace. Resolution alone cannot
  // silently edit the Invoice.
  const proposal = inline.querySelector(
    ".business-document-proposal"
  );

  assert.ok(
    proposal,
    "hosted Invoice instruction must create the existing Invoice proposal review"
  );

  assert.match(
    proposal.textContent,
    /payment terms/i
  );

  assert.match(
    proposal.textContent,
    /Net 15/i
  );

  assert.equal(
    patchBodies.length,
    0,
    "retrieval and proposal review must not save anything"
  );

  await w.click("Apply");

  assert.match(
    inline.textContent,
    /Unsaved working changes/
  );

  assert.equal(
    patchBodies.length,
    0,
    "Apply changes the unsaved working Invoice only"
  );

  const save = inline.querySelector(
    ".business-document-save"
  );

  assert.ok(save);
  assert.equal(save.disabled, false);

  await act(async () => {
    save.click();
    await pause();
  });

  assert.equal(
    patchBodies.length,
    1,
    "explicit Save must perform exactly one durable Invoice PATCH"
  );

  assert.equal(
    patchBodies[0].documentType,
    "INVOICE"
  );

  assert.equal(
    patchBodies[0].content?.paymentTerms,
    "Net 15",
    "durable Invoice must contain the explicitly applied proposal"
  );

  assert.equal(
    document.querySelector(
      '[data-dialog-purpose="business-document-save-failure-title"]'
    ),
    null,
    "exact saved response must pass durable fingerprint verification"
  );

  assert.doesNotMatch(
    inline.textContent,
    /Unsaved working changes/
  );

  const savedLabels = [
    ...inline.querySelectorAll("button"),
  ].map((button) => button.textContent.trim());

  assert.ok(savedLabels.includes("Preview PDF"));
  assert.ok(savedLabels.includes("Download PDF"));

  assert.ok(
    savedLabels.some((label) =>
      label.startsWith("Send Invoice")
    )
  );

  // ==========================================================
  // R4.2A HOSTED INVOICE DELIVERY PARITY
  // Preview / Download are exact-version reads only.
  // ==========================================================

  await w.click("Preview PDF");
  await w.click("Download PDF");

  assert.equal(
    pdfReads.length,
    2,
    "Preview and Download must each request the exact saved Invoice PDF"
  );

  assert.ok(
    pdfReads.every(
      (read) =>
        read.path ===
          `/business-document-drafts/${DRAFT_ID}/customer-pdf?version=5` &&
        read.responseType === "blob"
    ),
    "both PDF actions must bind exact durable Invoice v5"
  );

  assert.equal(
    deliveryPosts.length,
    0,
    "Preview and Download must never create delivery evidence"
  );

  // Open the real owner DeliveryMenu without relying on glyph matching.
  const sendInvoiceMenu = [
    ...inline.querySelectorAll("button"),
  ].find((button) =>
    button.textContent.trim().startsWith("Send Invoice")
  );

  assert.ok(
    sendInvoiceMenu,
    "hosted Invoice must retain the normal Send Invoice menu"
  );

  await act(async () => {
    sendInvoiceMenu.click();
    await pause();
  });

  if (!hasCompletedJob) {
    assert.match(w.text(), /Complete the job first/);
    assert.equal(document.querySelector('[data-dialog-purpose="business-document-delivery-review-title"]'), null);
    assert.equal(deliveryPosts.length, 0);
    assert.deepEqual(w.routes, []);
    return;
  }

  await w.click("Email with Meetro");

  const deliveryReview = document.querySelector(
    '[data-dialog-purpose="business-document-delivery-review-title"]'
  );

  assert.ok(
    deliveryReview,
    "hosted Invoice must open the existing Delivery Review"
  );

  assert.match(
    deliveryReview.textContent,
    /Review Invoice Email/i
  );

  assert.match(
    deliveryReview.textContent,
    /INV-0000012/
  );

  assert.match(
    deliveryReview.textContent,
    /Exact saved version/
  );

  assert.match(
    deliveryReview.textContent,
    /5/
  );

  assert.match(
    deliveryReview.textContent,
    /PDF included/
  );

  assert.match(
    deliveryReview.textContent,
    /Due terms/
  );

  assert.match(
    deliveryReview.textContent,
    /Included/
  );

  const recipient = deliveryReview.querySelector(
    'input[type="email"]'
  );

  assert.ok(recipient);

  assert.equal(
    recipient.value,
    "bob@example.com"
  );

  assert.equal(
    deliveryPosts.length,
    0,
    "opening Delivery Review cannot send the Invoice"
  );

  assert.equal(
    document.querySelector(
      '[data-dialog-purpose="business-document-quote-final-send-title"]'
    ),
    null,
    "Invoice must not inherit the Quote-only final-send confirmation"
  );

  await w.click("Send Email");

  for (
    let attempt = 0;
    attempt < 40 && deliveryPosts.length === 0;
    attempt += 1
  ) {
    await act(async () => {
      await pause();
    });
  }

  assert.equal(
    deliveryPosts.length,
    1,
    "explicit Send Email must create exactly one Invoice delivery command"
  );

  assert.equal(
    deliveryPosts[0].path,
    `/business-document-drafts/${DRAFT_ID}/deliveries`
  );

  assert.ok(
    deliveryPosts[0].idempotencyKey
  );

  assert.deepEqual(
    deliveryPosts[0].body,
    {
      expectedVersion: 5,
      channel: "EMAIL",
      recipientEmail: "bob@example.com",
      subject: "Invoice INV-0000012",
      customerMessage:
        "Please review the attached customer document.",
    }
  );

  assert.equal(
    deliveryEvidence?.documentId,
    DRAFT_ID
  );

  assert.equal(
    deliveryEvidence?.documentVersion,
    5
  );

  assert.equal(
    deliveryEvidence?.documentType,
    "INVOICE"
  );

  assert.equal(
    deliveryEvidence?.state,
    "DELIVERY_REQUESTED"
  );

  assert.equal(
    document.querySelector(
      '[data-dialog-purpose="business-document-delivery-review-title"]'
    ),
    null,
    "successful Invoice delivery closes its existing review"
  );

  assert.equal(
    document.querySelector(
      '[data-dialog-purpose="business-document-quote-final-send-title"]'
    ),
    null
  );

  assert.match(
    w.text(),
    /Email delivery requested for the exact saved document version/i
  );

  assert.match(
    w.text(),
    /No acceptance or payment was inferred/i
  );

  // The only POST allowed by this Invoice parity contract is delivery.
  // The earlier durable edit is a PATCH, not a lifecycle POST.
  assert.deepEqual(
    deliveryPosts.map((call) => call.path),
    [
      `/business-document-drafts/${DRAFT_ID}/deliveries`,
    ]
  );

  assert.ok(
    document.querySelector(".ask-meetro-workspace")
  );

  assert.deepEqual(
    w.routes,
    [],
    "PDF and Invoice delivery must remain inside the hosted owning workspace"
  );
});
