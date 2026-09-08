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
  for (const key of ["window", "document", "navigator", "localStorage", "sessionStorage", "HTMLElement", "Element", "Node", "Event", "CustomEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
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
      if (/\/professionalOpportunityCoordinator(?:\.js)?$/.test(id)) return "\0dashboard-leads";
      if (/\/professionalScheduleProjection(?:\.js)?$/.test(id)) return "\0dashboard-schedule";
    },
    load(id) {
      if (id === "\0dashboard-http") return 'export const authFetch = (...args) => globalThis.__dashboardHttp(...args); export const clearMeetroSession = () => {}; export const announceAccountConnectionIssue = () => {}; export const handleAuthExpired = () => {};';
      if (id === "\0dashboard-leads") return 'export const PROFESSIONAL_OPPORTUNITY_PHASE = { LOADING: "loading" }; export const requestProfessionalOpportunities = () => {}; export const subscribeProfessionalOpportunities = (fn) => { fn({status:"ready", records:[{request_id:"lead-1", project_title:"Interior Painting", project_description:"Paint three rooms", city:"Cape Coral", state:"FL"}]}); return () => {}; };';
      if (id === "\0dashboard-schedule") return 'export const fetchProfessionalSchedule = async () => ({}); export const getProfessionalScheduleCounts = () => ({today:0, needsScheduling:2, waiting:0, changeRequested:0, inProgress:0}); export const groupProfessionalSchedule = () => ({today:[]});';
    },
  }] });
});
test.after(async () => {
  await vite?.close(); dom?.window.close();
  for (const [key, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  delete globalThis.IS_REACT_ACT_ENVIRONMENT; delete globalThis.__dashboardHttp;
});
async function mount(t, page) {
  localStorage.clear(); localStorage.setItem("language", "en"); localStorage.setItem("activeAccountMode", page === "BusinessDashboard" ? "business" : "personal");
  const routes = [], calls = [];
  globalThis.__dashboardHttp = async (path, options = {}) => {
    calls.push({ path, method: options.method || "GET" });
    if (path === "/my-contractor-profile") return { response: { ok: true }, data: { profile: { id: 7, business_name: "Test business", category: "painting" } } };
    return { response: { ok: false, status: 503 }, data: { success: false } };
  };
  const { default: Page } = await vite.ssrLoadModule(`/src/pages/${page}.jsx`);
  const root = createRoot(document.getElementById("root"));
  t.after(async () => { await act(async () => root.unmount()); });
  await act(async () => { root.render(React.createElement(Page, { setPage: (route) => routes.push(route) })); await pause(); });
  return { routes, calls, text: () => document.body.textContent };
}
test("Professional lead priority, useful zero schedule and exact approved shortcuts render", async (t) => {
  const w = await mount(t, "BusinessDashboard");
  const text = w.text();
  assert.ok(text.indexOf("New Leads & Matching Requests") < text.indexOf("At a Glance"));
  assert.ok(text.indexOf("At a Glance") < text.indexOf("Quick Access"));
  assert.match(text, /Interior Painting/); assert.match(text, /Cape Coral, FL/);
  assert.match(text, /No visits today/); assert.match(text, /2 visits need scheduling/);
  const shortcuts = [...document.querySelectorAll(".business-dashboard-quick-access-grid button")];
  assert.equal(shortcuts.length, 4);
  assert.deepEqual(shortcuts.map((button) => button.querySelector("strong").textContent), ["Hiring", "Quote Builder", "Invoice Builder", "Timesheet"]);
  await act(async () => shortcuts[1].click()); assert.equal(w.routes.at(-1), "quoteBuilder?new=1");
  await act(async () => shortcuts[3].click()); assert.equal(w.routes.at(-1), "teamOperations?view=timesheets");
  assert.ok(w.calls.every((call) => call.method === "GET"));
});
test("Homeowner projects, functional Active/History controls and service entries remain role specific", async (t) => {
  const w = await mount(t, "Home");
  assert.match(w.text(), /My Projects/); assert.match(w.text(), /Your home, our community/);
  assert.doesNotMatch(w.text(), /New Leads|Pending Quotes|Hiring|Quote Builder/);
  const tabs = [...document.querySelectorAll(".home-my-projects-tabs button")];
  assert.equal(tabs[0].getAttribute("aria-pressed"), "true");
  await act(async () => tabs[1].click());
  assert.equal(tabs[1].getAttribute("aria-pressed"), "true");
  assert.equal(tabs[0].getAttribute("aria-pressed"), "false");
  assert.match(document.querySelector(".home-help-action-grid").textContent, /Request Service.*Emergency.*Ask Meetro/i);
});
test("dashboard layout protects narrow phones and scales metrics/tools without changing nav destinations", () => {
  const css = readFileSync("src/styles/homeDashboard.css", "utf8");
  assert.match(css, /grid-template-columns: 1fr !important/);
  assert.match(css, /min-width: 768px/); assert.match(css, /min-width: 1200px/);
  assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/); assert.match(css, /repeat\(4, minmax\(0, 1fr\)\)/);
  const nav = readFileSync("src/components/BottomNav.jsx", "utf8");
  assert.match(nav, /background: "#F7F6F2"/); assert.match(nav, /borderRight: "1px solid #E5E7EB"/);
  const personal = nav.slice(nav.indexOf("const personalDesktopNavItems"), nav.indexOf("const businessDesktopNavItems"));
  assert.deepEqual([...personal.matchAll(/page: "([^"]+)"/g)].map((m) => m[1]), ["home", "myRequests", "messagesInbox", "meetroMoments", "discover", "profile"]);
});
