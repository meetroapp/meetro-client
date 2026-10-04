import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { cwd } from "node:process";
import {
  fetchNativeCustomers, fetchNativeCustomerHistory, fetchNativeCustomerJobHistory,
  validateNativeCustomers, validateNativeCustomerHistory,
} from "../src/utils/jobCompletionApi.js";
import { getCustomerRelationshipsCopy, CUSTOMER_RELATIONSHIPS_LANGUAGES } from "../src/utils/customerRelationshipsLanguage.js";

const CONTACT = "11111111-1111-4111-8111-111111111111";
const RELATIONSHIP = "22222222-2222-4222-8222-222222222222";
const JOB_A = "33333333-3333-4333-8333-333333333333";
const JOB_B = "44444444-4444-4444-8444-444444444444";
const subject = homeownerUserId => ({ kind: "MEETRO_ACCOUNT", contractorProfileId: 10, homeownerUserId });
const customer = (homeownerUserId, displayName) => ({ subject: subject(homeownerUserId), displayName,
  completedJobCount: 1, lastCompletedAt: "2026-09-28T12:00:00.000Z", sourceTypes: ["emergency_request"] });
const job = (jobId, title) => ({ jobId, sourceType: "emergency_request", serviceTitle: title,
  completedAt: "2026-09-28T12:00:00.000Z", approvedQuote: { currency: "USD", totalMinor: 25000 },
  completionSummary: { workstreamCount: 0, workItemCount: 0, customerUpdateCount: 0 } });
const page = (homeownerUserId, jobs, nextCursor = null) => ({ contractVersion: 1, subject: subject(homeownerUserId),
  displayName: homeownerUserId === 17 ? "Alex Morgan" : "Jordan Lee", jobs, pagination: { limit: 20, nextCursor } });
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const settle = async () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

test("native customer API rejects forged subject, unsafe rows and invalid exact Job", async () => {
  const directory = { contractVersion: 1, customers: [customer(17, "Alex Morgan")], pagination: { limit: 20, nextCursor: null } };
  assert.ok(validateNativeCustomers(directory, { contractorProfileId: 10 }));
  assert.equal(validateNativeCustomers(directory, { contractorProfileId: 11 }), null);
  assert.equal(validateNativeCustomers({ ...directory, customers: [{ ...customer(17, "Alex Morgan"), email: "private@example.test" }] }, { contractorProfileId: 10 }), null);
  assert.ok(validateNativeCustomerHistory(page(17, [job(JOB_A, "Sink repair")]), { contractorProfileId: 10, homeownerUserId: 17 }));
  assert.equal(validateNativeCustomerHistory(page(17, [job(JOB_A, "Sink repair")]), { contractorProfileId: 10, homeownerUserId: 18 }), null);
  await assert.rejects(fetchNativeCustomers({ contractorProfileId: "forged" }), { code: "INVALID_NATIVE_CUSTOMER_PAGE" });
  await assert.rejects(fetchNativeCustomerHistory({ contractorProfileId: 10, homeownerUserId: 0 }), { code: "INVALID_NATIVE_CUSTOMER_PAGE" });
  await assert.rejects(fetchNativeCustomerJobHistory({ contractorProfileId: 10, homeownerUserId: 17, jobId: "not-a-job" }), { code: "INVALID_NATIVE_CUSTOMER_JOB" });
  for (const language of CUSTOMER_RELATIONSHIPS_LANGUAGES) {
    const copy = getCustomerRelationshipsCopy(language);
    for (const key of ["meetroCustomers", "privateContacts", "nativeSourceLabel", "nativeHistory", "nativeHistoryUnavailable", "noNativeCompletedWork", "retry"]) {
      assert.ok(copy[key], `${language}.${key}`);
    }
  }
});

test("private Contact stays separate while native selection, pagination, exact detail and late response are safe", async () => {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost/#customerRelationshipsCenter" });
  const previous = { window: globalThis.window, document: globalThis.document, localStorage: globalThis.localStorage,
    fetch: globalThis.fetch, HTMLElement: globalThis.HTMLElement, Event: globalThis.Event,
    CustomEvent: globalThis.CustomEvent, navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator") };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
    HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, CustomEvent: dom.window.CustomEvent });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  localStorage.setItem("token", "local-fixture-token");
  const calls = [];
  let pendingOld;
  let pageAttempts = 0;
  const privateRelationship = { id: RELATIONSHIP, contractorProfileId: 10, businessContactId: CONTACT,
    version: 1, createdAt: "2026-08-20T10:00:00.000Z", updatedAt: "2026-08-20T10:00:00.000Z",
    contact: { id: CONTACT, displayName: "Alex Morgan", status: "ACTIVE", partyType: "PERSON" } };
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input), dom.window.location.href);
    const path = url.pathname;
    calls.push({ path: path + url.search, method: options.method || "GET" });
    if (path === "/my-contractor-profile") return response({ profile: { id: 10 } });
    if (path === "/business-customer-relationships") return response({ success: true, relationships: [privateRelationship] });
    if (path === "/professional/jobs/history") return response({ success: false, code: "FIXTURE_HISTORY_UNUSED" }, 404);
    if (path === "/professional/businesses/10/native-customers") return response({ success: true, nativeCustomers: {
      contractVersion: 1, customers: [customer(17, "Alex Morgan"), customer(18, "Jordan Lee")],
      pagination: { limit: 20, nextCursor: null } } });
    if (path === "/professional/businesses/10/native-customers/17/history") {
      if (!url.searchParams.has("cursor") && !pendingOld) return new Promise(resolve => { pendingOld = resolve; });
      if (url.searchParams.get("cursor") === "cursor-a") {
        pageAttempts += 1;
        if (pageAttempts === 1) return response({ success: false, code: "TEMPORARY" }, 503);
        return response({ success: true, nativeCustomerHistory: page(17, [job(JOB_B, "Second repair")]) });
      }
      return response({ success: true, nativeCustomerHistory: page(17, [job(JOB_A, "Bathroom sink Emergency")], "cursor-a") });
    }
    if (path === "/professional/businesses/10/native-customers/18/history") return response({ success: true,
      nativeCustomerHistory: page(18, []) });
    if (path === `/professional/businesses/10/native-customers/17/jobs/${JOB_A}/history`) return response({ success: true,
      nativeCustomerJobHistory: { contractVersion: 1, subject: subject(17), displayName: "Alex Morgan",
        job: job(JOB_A, "Bathroom sink Emergency") } });
    return response({ success: false, code: "FIXTURE_ROUTE_MISSING" }, 404);
  };
  const vite = await createServer({ root: cwd(), configFile: false, cacheDir: "/tmp/task63j4c-client-vite",
    optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false } });
  const root = createRoot(document.getElementById("root"));
  try {
    const { default: Customers } = await vite.ssrLoadModule("/src/pages/CustomerRelationshipsCenter.jsx");
    await act(async () => root.render(React.createElement(Customers, { setPage() {} })));
    await settle();
    assert.equal(document.querySelectorAll('[aria-label^="Open Customer History: Alex Morgan"]').length, 1);
    assert.equal(document.querySelectorAll('[aria-label^="Open Meetro customer history: Alex Morgan"]').length, 1);
    const nativeAlex = document.querySelector('[aria-label^="Open Meetro customer history: Alex Morgan"]');
    nativeAlex.focus();
    assert.equal(document.activeElement, nativeAlex, "native customer row must be keyboard focusable");
    await act(async () => nativeAlex.click());
    assert.equal(document.querySelector('[data-native-customer="17"]')?.textContent.includes("Alex Morgan"), true);
    await act(async () => [...document.querySelectorAll("button")].find(button => button.textContent === "Back to Customers")?.click());
    await act(async () => document.querySelector('[aria-label^="Open Meetro customer history: Jordan Lee"]')?.click());
    await settle();
    assert.equal(document.querySelector('[data-native-customer-history-status="ready"]')?.textContent.includes("No completed work yet"), true);
    await act(async () => pendingOld?.(response({ success: true, nativeCustomerHistory: page(17, [job(JOB_A, "Obsolete sink")]) })));
    await settle();
    assert.equal(document.body.textContent.includes("Obsolete sink"), false);
    await act(async () => [...document.querySelectorAll("button")].find(button => button.textContent === "Back to Customers")?.click());
    await act(async () => document.querySelector('[aria-label^="Open Meetro customer history: Alex Morgan"]')?.click());
    await settle();
    assert.match(document.body.textContent, /Bathroom sink Emergency/);
    await act(async () => [...document.querySelectorAll("button")].find(button => button.textContent === "Load more")?.click());
    await settle();
    assert.ok(document.querySelector('[data-native-customer-history-status="ready"] [role="alert"]'));
    assert.match(document.body.textContent, /Bathroom sink Emergency/);
    await act(async () => document.querySelector('[data-native-customer-history-status="ready"] [role="alert"] button')?.click());
    await settle();
    assert.match(document.body.textContent, /Second repair/);
    await act(async () => document.querySelector(`[aria-label="Open completed Job: Bathroom sink Emergency"]`)?.click());
    await settle();
    assert.equal(document.querySelector(`[data-native-job-history="${JOB_A}"]`)?.textContent.includes("Bathroom sink Emergency"), true);
    assert.ok(calls.some(call => call.path.includes(`/native-customers/17/jobs/${JOB_A}/history`)));
    assert.equal(calls.every(call => call.method === "GET"), true);
    for (const width of [390, 768, 1280]) {
      dom.window.innerWidth = width;
      dom.window.dispatchEvent(new dom.window.Event("resize"));
      await settle();
      assert.ok(document.querySelector('[data-native-customer="17"]'));
    }
  } finally {
    await act(async () => root.unmount());
    await vite.close();
    dom.window.close();
    Object.assign(globalThis, { window: previous.window, document: previous.document, localStorage: previous.localStorage,
      fetch: previous.fetch, HTMLElement: previous.HTMLElement, Event: previous.Event, CustomEvent: previous.CustomEvent });
    if (previous.navigator) Object.defineProperty(globalThis, "navigator", previous.navigator);
    else delete globalThis.navigator;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
