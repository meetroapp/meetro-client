import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { validateJobHistoryDetail } from "../src/utils/jobCompletionApi.js";
import { normalizeCustomerJobQuotes } from "../src/utils/customerJobQuotesApi.js";
import { buildCustomerJobHistoryReportModel, getCustomerJobHistoryReportCopy } from "../src/utils/customerJobHistoryReport.js";
import { getJobCompletionCopy } from "../src/utils/jobCompletionLanguage.js";
import { getCustomerRelationshipsCopy } from "../src/utils/customerRelationshipsLanguage.js";

const JOB = "6f40641c-2f06-4971-aeaa-65598ba777b1";
const OTHER_JOB = "11111111-1111-4111-8111-111111111111";
const QUOTE = "ef1afb14-0926-421a-991b-07c6ca5ac66e";
const DATE = "2026-09-29T18:00:00.000Z"; // Fixture timestamp; live completion remains server-owned.
function fixture(jobId = JOB) {
  return {
    contractVersion: 1, jobId, sourceType: "emergency_request", sourceLabel: "Emergency",
    requestId: null, relationshipId: 362, conversationId: 354,
    customerName: "Liam Molina", professionalName: "Handyman LLC",
    serviceTitle: jobId === JOB ? "Emergency Plumbing: Outside main waterline is leaking water" : "Other Job",
    status: "COMPLETED", completedAt: DATE,
    approvedQuote: { totalMinor: 35000, currency: "USD" },
    completionSummary: { workstreamCount: 0, workItemCount: 0, customerUpdateCount: 0 },
    nextAction: { code: "READY_TO_INVOICE", label: "Ready to Invoice" }, audience: "customer",
    originalRequest: null,
    preservedRecords: { evaluation: true, findings: true, recommendations: true, approvedQuotes: true, visits: false, workPlan: false },
    historyRecords: { deposits: [], media: [], visits: [], emergencyAssessment: {
      evaluation: { status: "COMPLETE", completedAt: DATE, startedAt: DATE, updatedAt: DATE }, findings: [], recommendations: [],
    } }, actions: { canMessageProfessional: true },
  };
}
function quote(overrides = {}) {
  return { quoteId: QUOTE, jobId: JOB, quoteNumber: "Q-0000025", businessStatus: "APPROVED", status: "ISSUED",
    customerDecision: "APPROVED", totalMinor: 35000, currency: "USD", lineageLabel: "Original",
    createdAt: DATE, updatedAt: DATE, issuedAt: DATE, decidedAt: DATE,
    actions: { canViewQuote: true, canApprove: false, canDecline: false }, ...overrides };
}

async function withWorkspace(run) {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "https://meetro.test/#home" });
  const prior = Object.fromEntries(["window", "document", "IS_REACT_ACT_ENVIRONMENT", "__historyC1"].map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const calls = [], exports = [];
  const api = globalThis.__historyC1 = {
    fetchCustomerJobHistory: async ({ jobId }) => {
      calls.push(["history", jobId]);
      return validateJobHistoryDetail(fixture(jobId), { jobId, audience: "customer" });
    },
    fetchCustomerJobQuotes: async ({ jobId, cursor }) => {
      calls.push(["quotes", jobId, cursor]);
      return { quotes: jobId === JOB ? [quote()] : [], pagination: { hasMore: false, nextCursor: null } };
    },
    fetchCustomerJobInvoice: async ({ jobId }) => { calls.push(["invoice", jobId]); throw Object.assign(new Error("Not finalized"), { status: 404 }); },
    fetchCustomerJobWorkPlan: async ({ jobId }) => { calls.push(["work", jobId]); throw Object.assign(new Error("No ordinary Work Plan"), { status: 404 }); },
    fetchCustomerEfr: async ({ jobId }) => { calls.push(["assessment", jobId]); throw Object.assign(new Error("Emergency fallback"), { status: 404 }); },
    buildCustomerJobHistoryReportModel, getCustomerJobHistoryReportCopy,
  };
  for (const [name, action] of [["printCustomerJobHistoryReport", "print"], ["shareCustomerJobHistoryReport", "share"], ["emailCustomerJobHistoryReport", "email"]]) {
    api[name] = async model => { exports.push({ action, model }); return { ok: true, method: "fixture", manualAttachment: action === "email" }; };
  }
  const vite = await createServer({ root: process.cwd(), configFile: false, cacheDir: "/tmp/meetro-task63j4c1/vite-tests", optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false, ws: false }, plugins: [react(), {
    name: "history-c1-projection-fixture", enforce: "pre",
    transform(source, id) {
      if (id.endsWith("/Home.jsx")) return source.replace("export default Home;", "export { HomeownerJobHistoryWorkspace }; export default Home;");
      if (!id.endsWith("/CustomerCompletionHistory.jsx")) return null;
      return source.replace(/import\s*\{([^}]+)\}\s*from\s*["']\.\.\/utils\/(?:jobCompletionApi|customerJobQuotesApi|invoicePaymentApi|workPlanApi|customerEfrApi|customerJobHistoryReport)\.js["'];/g,
        (_, names) => names.split(",").map(name => name.trim()).filter(Boolean).map(name => `const ${name} = (...args) => globalThis.__historyC1.${name}(...args);`).join("\n"));
    },
  }] });
  const root = createRoot(document.getElementById("root"));
  const { default: History, fetchAllCustomerHistoryQuotes } = await vite.ssrLoadModule("/src/components/CustomerCompletionHistory.jsx");
  const setPage = () => {};
  const render = async (jobId = JOB, language = "en") => {
    await act(async () => root.render(React.createElement(History, { jobId, language, setPage })));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  };
  const click = async name => {
    const button = [...document.querySelectorAll("button")].find(node => node.textContent.trim() === name);
    assert.ok(button, `Missing button ${name}`);
    await act(async () => button.click());
  };
  try { await run({ dom, calls, exports, api, render, click, fetchAllCustomerHistoryQuotes, root, vite }); }
  finally { await act(async () => root.unmount()); await vite.close(); dom.window.close(); Object.assign(globalThis, prior); }
}

test("all five tabs retain exact Emergency Job, expose common exports, and export complete History", async () => {
  await withWorkspace(async ({ calls, exports, render, click }) => {
    await render();
    const overview = document.querySelector("section[data-customer-full-job-history]").textContent;
    assert.match(overview, /Emergency Plumbing: Outside main waterline is leaking water/);
    assert.match(overview, /Liam Molina/); assert.match(overview, /Handyman LLC/); assert.match(overview, /\$350\.00/);
    assert.match(overview, /Project assessment/); assert.match(overview, /COMPLETE/);
    assert.match(overview, /Job status/);
    assert.doesNotMatch(overview, /Contact status/);
    const originalCalls = [...calls];
    for (const tab of ["Overview", "Job", "Quotes", "Invoice", "Documents / Photos", "Overview"]) {
      await click(tab);
      const workspace = document.querySelector("[data-customer-full-job-history]");
      assert.equal(workspace.dataset.customerFullJobHistory, JOB);
      assert.equal(document.querySelectorAll('[aria-label="Job History report actions"]').length, 1);
      if (tab === "Job") assert.match(workspace.textContent, /No additional recorded work-detail entries/);
      if (tab === "Quotes") {
        assert.equal((workspace.textContent.match(/Q-0000025/g) || []).length, 1);
        assert.match(workspace.textContent, /Original/); assert.doesNotMatch(workspace.textContent, /Revision \d/);
      }
      if (tab === "Invoice") assert.match(workspace.textContent, /No finalized invoice is available for this Job yet/);
      if (tab === "Documents / Photos") {
        assert.match(workspace.textContent, /Q-0000025/); assert.match(workspace.textContent, /Canonical Quote/);
        assert.match(workspace.textContent, /No customer-visible request photos/); assert.equal(workspace.querySelectorAll("img").length, 0);
      }
      for (const action of ["Print", "Share", "Email"]) await click(action);
      assert.deepEqual(calls, originalCalls, "Tab and export actions must not read or mutate another Job");
    }
    assert.equal(exports.length, 18);
    for (const exported of exports) {
      assert.deepEqual(exported.model, exports[0].model);
      assert.equal(exported.model.invoice, null);
      assert.equal(exported.model.job.originalRequest, null);
      assert.equal(exported.model.visits.length, 0);
      assert.equal(exported.model.work.length, 0);
      assert.equal(exported.model.quotes[0].quoteNumber, "Q-0000025");
      assert.equal(exported.model.quotes[0].totalMinor, 35000);
    }
    await render(OTHER_JOB);
    assert.equal(document.querySelector("[data-customer-full-job-history]").dataset.customerFullJobHistory, OTHER_JOB);
    await click("Quotes"); assert.doesNotMatch(document.body.textContent, /Q-0000025/);
  });
});

test("History controls, visit labels, empty states, and export notices use all four locales", async () => {
  await withWorkspace(async ({ render, click }) => {
    for (const language of ["en", "es", "fr", "pt-BR"]) {
      await render(JOB, language);
      const copy = getCustomerJobHistoryReportCopy(language), historyCopy = getCustomerRelationshipsCopy(language);
      assert.ok(historyCopy.jobStatus);

      // The prior locale intentionally ends on Documents / Photos.
      // Changing language does not change Job identity or reset the active tab,
      // so explicitly return to Overview before asserting Overview-only copy.
      await click(historyCopy.overview);

      assert.ok(document.body.textContent.includes(historyCopy.jobStatus));
      for (const key of ["evaluationVisit", "workVisit", "preparing", "noFinalizedInvoice", "noPhotos", "emailManualNotice", "failedNotice"]) assert.ok(copy[key]);
      await click(copy.email); assert.ok(document.body.textContent.includes(copy.emailManualNotice));
      await click(getJobCompletionCopy(language).homeownerJob); assert.ok(document.body.textContent.includes(copy.noWorkDetails));
      await click(getJobCompletionCopy(language).homeownerInvoice); assert.ok(document.body.textContent.includes(copy.noFinalizedInvoice));
      await click(historyCopy.documentsPhotos); assert.ok(document.body.textContent.includes(copy.noPhotos));
    }
  });
});

test("Quote pagination keeps exact Job and meaningful lineage; duplicate and looping pages fail closed", async () => {
  await withWorkspace(async ({ fetchAllCustomerHistoryQuotes }) => {
    const calls = [];
    const result = await fetchAllCustomerHistoryQuotes({ jobId: JOB, fetchQuotes: async input => {
      calls.push(input);
      return input.cursor ? { quotes: [quote({ quoteId: OTHER_JOB, quoteNumber: "Q-0000026", lineageLabel: "Revised" })], pagination: { hasMore: false, nextCursor: null } }
        : { quotes: [quote()], pagination: { hasMore: true, nextCursor: "next" } };
    } });
    assert.equal(result.quotes.length, 2);
    assert.deepEqual(calls.map(call => [call.jobId, call.cursor]), [[JOB, null], [JOB, "next"]]);
    assert.equal(result.quotes[1].lineageLabel, "Revised");
    await assert.rejects(fetchAllCustomerHistoryQuotes({ jobId: JOB, fetchQuotes: async () => ({ quotes: [quote()], pagination: { hasMore: true, nextCursor: "same" } }) }), /identity/);
    await assert.rejects(fetchAllCustomerHistoryQuotes({ jobId: JOB, fetchQuotes: async () => ({ quotes: [], pagination: { hasMore: true, nextCursor: "same" } }) }), /pagination/);
    await assert.rejects(fetchAllCustomerHistoryQuotes({ jobId: JOB, fetchQuotes: async () => ({ quotes: [quote({ jobId: OTHER_JOB })], pagination: { hasMore: false } }) }), /identity/);
  });
});

test("canonical Quote validator rejects duplicate identity and another Job; internal versions stay private", () => {
  const job = { id: JOB, requestId: null, sourceType: "emergency_request", title: fixture().serviceTitle, service: "Plumbing", issuerName: "Handyman LLC" };
  const payload = { success: true, code: "CUSTOMER_JOB_QUOTES_LOADED", job, quotes: [quote()], pagination: { limit: 50, hasMore: false, nextCursor: null } };
  assert.equal(normalizeCustomerJobQuotes(payload, { jobId: JOB, limit: 50 }).quotes[0].quoteNumber, "Q-0000025");
  assert.equal(normalizeCustomerJobQuotes({ ...payload, quotes: [quote(), quote()] }, { jobId: JOB, limit: 50 }), null);
  assert.equal(normalizeCustomerJobQuotes({ ...payload, quotes: [quote({ jobId: OTHER_JOB })] }, { jobId: JOB, limit: 50 }), null);
  const model = buildCustomerJobHistoryReportModel({ history: fixture(), quotes: [quote({ version: 99 })] });
  assert.doesNotMatch(JSON.stringify(model), /version|Revision 99/);
});

test("History component has no lifecycle commands or storage recovery and preserves 44px controls", () => {
  const source = readFileSync(new URL("../src/components/CustomerCompletionHistory.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /localStorage|sessionStorage|completeCanonicalJob|createCanonicalInvoice|recordCanonicalPayment|method:\s*["'](?:POST|PATCH|PUT|DELETE)/);
  assert.match(source, /minHeight: 44/);
});

test("same History reads automatically present finalized Invoice, payment history, real work, and eligible photos", async () => {
  await withWorkspace(async ({ api, render, click, exports }) => {
    api.fetchCustomerJobHistory = async () => {
      const history = fixture();
      history.historyRecords.media = [{ mediaId: "eligible-request-photo", secureUrl: "https://res.cloudinary.com/demo/image/upload/request.jpg", format: "jpg", uploadedAt: DATE, category: "REQUEST_PHOTO" }];
      return validateJobHistoryDetail(history, { jobId: JOB, audience: "customer" });
    };
    api.fetchCustomerJobWorkPlan = async () => ({ jobId: JOB, workstreams: [{ id: "workstream", title: "Recorded repair", status: "COMPLETED", activities: [{ id: "activity", statement: "Repaired the waterline", status: "COMPLETED", performedAt: DATE }], updates: [{ statement: "Water service restored" }] }] });
    api.fetchCustomerJobInvoice = async () => ({ jobId: JOB, invoiceNumber: "INV-fixture-finalized", status: "PARTIALLY_PAID", issuedAt: DATE, currency: "USD", totalMinor: 35000, paidMinor: 17500, balanceMinor: 17500, lineItems: [{ sequence: 1, type: "approvedWork", description: "Waterline repair", quantity: 1, lineTotalMinor: 35000 }], payments: [{ amountMinor: 17500, currency: "USD", method: "Card", recordedAt: DATE, receivedDate: "2026-09-29" }] });
    await render();
    await click("Job"); assert.match(document.body.textContent, /Repaired the waterline/); assert.match(document.body.textContent, /Water service restored/);
    await click("Invoice"); assert.match(document.body.textContent, /INV-fixture-finalized/); assert.match(document.body.textContent, /PARTIALLY_PAID/); assert.match(document.body.textContent, /\$175\.00/); assert.match(document.body.textContent, /Payment history/);
    await click("Documents / Photos");
    assert.match(document.body.textContent, /Canonical Invoice/);
    assert.equal(document.querySelector("img").src, "https://res.cloudinary.com/demo/image/upload/request.jpg");
    await click("Print");
    assert.equal(exports[0].model.invoice.invoiceNumber, "INV-fixture-finalized");
    assert.equal(exports[0].model.invoice.payments[0].amountMinor, 17500);
    assert.equal(exports[0].model.work[0].activities[0].statement, "Repaired the waterline");
    assert.equal(exports[0].model.media.length, 1);
  });
});

test("main History workspace preserves exact Job through every tab and returns without modal focus locking", async () => {
  await withWorkspace(async ({ dom, root, vite, click }) => {
    const { HomeownerJobHistoryWorkspace: Workspace } = await vite.ssrLoadModule("/src/pages/Home.jsx");
    const invoker = document.createElement("button"); invoker.textContent = "View History"; document.body.prepend(invoker);
    const setPage = () => {};
    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open ? React.createElement(Workspace, { jobId: JOB, language: "en", setPage, onClose: () => { setOpen(false); invoker.focus(); } }) : null;
    }
    await act(async () => root.render(React.createElement(Harness)));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    const workspace = document.querySelector('[data-homeowner-history-workspace]');
    assert.ok(workspace); assert.equal(document.querySelector('[aria-modal="true"]'), null);
    assert.equal(document.activeElement, workspace.querySelector("button"));
    assert.equal(document.body.style.overflow, ""); assert.equal(invoker.inert, undefined);
    for (const tab of ["Overview", "Job", "Quotes", "Invoice", "Documents / Photos", "Overview"]) {
      await click(tab); assert.equal(document.querySelector('[data-homeowner-history-workspace]'), workspace);
      assert.equal(workspace.querySelector('[data-customer-full-job-history]').dataset.customerFullJobHistory, JOB);
    }
    await act(async () => workspace.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
    assert.equal(document.querySelector('[data-homeowner-history-workspace]'), null);
    assert.equal(document.activeElement, invoker); assert.equal(document.body.style.overflow, "");
  });
});
