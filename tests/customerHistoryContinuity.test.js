import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { createServer } from "vite";
import {
  CUSTOMER_RELATIONSHIP_NAVIGATION_KEY,
  readCustomerRelationshipNavigationContext,
  writeCustomerRelationshipNavigationContext,
} from "../src/utils/customerRelationshipsWorkspace.js";
import {
  buildProfessionalWorkCenterRoute,
  parseProfessionalWorkCenterRoute,
} from "../src/utils/professionalWorkCenterRoute.js";

const CONTACT_A = "11111111-1111-4111-8111-111111111111";
const CONTACT_B = "22222222-2222-4222-8222-222222222222";
const RELATIONSHIP_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RELATIONSHIP_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ACTIVE_JOB = "33333333-3333-4333-8333-333333333333";
const COMPLETED_JOB = "44444444-4444-4444-8444-444444444444";

function relationship(id, businessContactId, displayName) {
  return {
    id,
    contractorProfileId: 10,
    businessContactId,
    version: 1,
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
    contact: { id: businessContactId, displayName, status: "ACTIVE", partyType: "PERSON" },
  };
}

const relationships = [
  relationship(RELATIONSHIP_A, CONTACT_A, "Alex Morgan"),
  relationship(RELATIONSHIP_B, CONTACT_B, "Jordan Lee"),
];

function contact(id) {
  const source = relationships.find((item) => item.businessContactId === id);
  return { id, displayName: source.contact.displayName, status: "ACTIVE", partyType: "PERSON", version: 1 };
}

function activity(relationshipId) {
  const businessContactId = relationshipId === RELATIONSHIP_A ? CONTACT_A : CONTACT_B;
  return {
    contractVersion: 1,
    relationship: { id: relationshipId, contractorProfileId: 10, businessContactId, contactStatus: "ACTIVE" },
    work: relationshipId === RELATIONSHIP_A ? [
      { jobId: ACTIVE_JOB, title: "Kitchen faucet installation", status: "ACTIVE", completionState: "ACTIVE", createdAt: "2026-09-01T10:00:00.000Z" },
      { jobId: COMPLETED_JOB, title: "Bathroom fan replacement", status: "COMPLETED", completionState: "COMPLETED", createdAt: "2026-08-01T10:00:00.000Z", completedAt: "2026-08-03T10:00:00.000Z" },
    ] : [],
    quotes: [], invoices: [], documents: [], media: [], deposits: [], payments: [], visits: [], workPerformed: [],
  };
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

test("Customer History keeps selected identity through rerender, scroll, pointer movement, resize, and tabs", async () => {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "https://app.meetro.test/#customerRelationshipsCenter" });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    navigatorDescriptor: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
    CustomEvent: globalThis.CustomEvent,
    localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    CustomEvent: dom.window.CustomEvent,
    localStorage: dom.window.localStorage,
  });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem("token", "fixture-token");
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const calls = [];
  globalThis.fetch = async (url) => {
    const path = new URL(String(url), dom.window.location.href).pathname + new URL(String(url), dom.window.location.href).search;
    calls.push(path);
    if (path === "/my-contractor-profile") return response({ profile: { id: 10 } });
    if (path.startsWith("/business-customer-relationships?")) return response({ success: true, relationships });
    const activityMatch = path.match(/^\/business-customer-relationships\/([^/]+)\/activity$/);
    if (activityMatch) return response({ success: true, activity: activity(activityMatch[1]) });
    const relationshipMatch = path.match(/^\/business-customer-relationships\/([^/]+)$/);
    if (relationshipMatch) {
      return response({ success: true, relationship: relationships.find((item) => item.id === relationshipMatch[1]) });
    }
    const contactMatch = path.match(/^\/business-contacts\/([^/]+)$/);
    if (contactMatch) return response({ success: true, contact: contact(contactMatch[1]) });
    return response({ success: false, code: "FIXTURE_ROUTE_MISSING" }, 404);
  };

  const vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true, hmr: false } });
  const root = createRoot(dom.window.document.getElementById("root"));
  try {
    const { default: CustomerRelationshipsCenter } = await vite.ssrLoadModule("/src/pages/CustomerRelationshipsCenter.jsx");
    const routes = [];
    await act(async () => root.render(React.createElement(CustomerRelationshipsCenter, { setPage: (route) => routes.push(route) })));
    await settle();
    await settle();

    const first = [...document.querySelectorAll("button")].find((button) => button.getAttribute("aria-label")?.includes("Alex Morgan"));
    assert.ok(first);
    await act(async () => first.click());
    await settle();
    await settle();
    assert.equal(document.getElementById("customer-relationship-detail-title")?.textContent, "Alex Morgan");
    const readsAfterOpen = calls.length;

    await act(async () => root.render(React.createElement(CustomerRelationshipsCenter, { setPage: (route) => routes.push(`rerender:${route}`) })));
    document.querySelector(".app-page").dispatchEvent(new dom.window.Event("pointerdown", { bubbles: true }));
    document.querySelector(".app-page").dispatchEvent(new dom.window.Event("pointermove", { bubbles: true }));
    document.querySelector(".app-page").dispatchEvent(new dom.window.Event("pointerup", { bubbles: true }));
    document.querySelector(".app-page").dispatchEvent(new dom.window.Event("scroll", { bubbles: false }));
    dom.window.dispatchEvent(new dom.window.Event("resize"));
    dom.window.dispatchEvent(new dom.window.Event("orientationchange"));
    await settle();
    assert.equal(document.getElementById("customer-relationship-detail-title")?.textContent, "Alex Morgan");
    assert.equal(calls.length, readsAfterOpen, "layout rerenders must not restart the initial relationship load");

    const jobsTab = [...document.querySelectorAll("button")].find((button) => button.textContent === "Jobs");
    await act(async () => jobsTab.click());
    assert.equal(document.getElementById("customer-relationship-detail-title")?.textContent, "Alex Morgan");
    assert.match(document.body.textContent, /Active Jobs/);
    assert.match(document.body.textContent, /Completed Jobs/);

    const openJob = [...document.querySelectorAll("button")].find((button) => button.textContent.includes("Open Job"));
    await act(async () => openJob.click());
    assert.match(routes.at(-1), new RegExp(`workCenter\\?jobId=${ACTIVE_JOB}&stage=work&returnPage=customerRelationshipsCenter$`));
    assert.equal(JSON.parse(localStorage.getItem(CUSTOMER_RELATIONSHIP_NAVIGATION_KEY)).businessContactId, CONTACT_A);

    const back = [...document.querySelectorAll("button")].find((button) => button.textContent === "Back to Customers");
    await act(async () => back.click());
    assert.equal(document.getElementById("customer-relationship-detail-title"), null);

    const second = [...document.querySelectorAll("button")].find((button) => button.getAttribute("aria-label")?.includes("Jordan Lee"));
    assert.ok(second);
    await act(async () => second.click());
    await settle();
    await settle();
    assert.equal(document.getElementById("customer-relationship-detail-title")?.textContent, "Jordan Lee");
  } finally {
    await act(async () => root.unmount());
    await vite.close();
    dom.window.close();
    const { navigatorDescriptor, ...assignablePrevious } = previous;
    Object.assign(globalThis, assignablePrevious);
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else delete globalThis.navigator;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test("Customer History return route preserves exact customer context without workflow authority", () => {
  const storage = new Map();
  const adapter = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  };
  assert.equal(writeCustomerRelationshipNavigationContext(adapter, { businessContactId: CONTACT_A, focus: "work" }), true);
  assert.deepEqual(readCustomerRelationshipNavigationContext(adapter), {
    businessContactId: CONTACT_A,
    focus: "work",
    returnPage: "businessCommandCenter",
  });
  const route = buildProfessionalWorkCenterRoute({ jobId: ACTIVE_JOB, stage: "work", returnPage: "customerRelationshipsCenter" });
  assert.deepEqual(parseProfessionalWorkCenterRoute(route), {
    jobId: ACTIVE_JOB,
    quoteId: null,
    visitId: null,
    returnPage: "customerRelationshipsCenter",
    stage: "work",
  });
});
