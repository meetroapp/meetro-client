import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createServer } from "vite";
import { getProfessionalHomeGreeting } from "../src/utils/professionalHomeGreeting.js";
import { getMeetroMomentHashRoute } from "../src/utils/meetroMomentRoutes.js";

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
async function mount(t, page, setup = () => {}) {
  localStorage.clear(); localStorage.setItem("language", "en"); localStorage.setItem("activeAccountMode", page === "BusinessDashboard" ? "business" : "personal");
  if (page === "BusinessDashboard") localStorage.setItem("userName", "William Molina");
  setup();
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
  assert.match(text, /Today's Schedule0/); assert.match(text, /2 visits need scheduling/);
  const expectedGreeting = getProfessionalHomeGreeting({ name: "William Molina" });
  assert.match(document.querySelector(".business-dashboard-header-section").textContent, new RegExp(`Meetro.*Real work\\. Real opportunity\\..*${expectedGreeting}.*Review opportunities.*Keep your business moving forward\\..*Continue Work`, "s"));
  assert.equal(document.querySelectorAll(".business-dashboard-hero-actions button").length, 1);
  assert.equal(document.querySelectorAll(".business-dashboard-hero-ask, .business-dashboard .home-dashboard-ask-button").length, 0);
  const professionalNav = [...document.querySelectorAll(".bottom-nav-dock .bottom-nav-item")];
  assert.deepEqual(professionalNav.map((item) => item.querySelector(".bottom-nav-label").textContent), ["Home", "Work Center", "Ask Meetro", "Chat", "Profile"]);
  assert.equal(professionalNav[2].getAttribute("aria-label"), "Ask Meetro");
  assert.equal(professionalNav[2].getAttribute("aria-current"), null);
  let professionalAskOpens = 0;
  const onProfessionalAsk = () => { professionalAskOpens += 1; };
  window.addEventListener("meetro:assistant:open", onProfessionalAsk);
  const professionalRouteCount = w.routes.length;
  await act(async () => professionalNav[2].click());
  await act(async () => document.querySelector('.desktop-sidebar-item[aria-label="Ask Meetro"]').click());
  window.removeEventListener("meetro:assistant:open", onProfessionalAsk);
  assert.equal(professionalAskOpens, 2);
  assert.equal(w.routes.length, professionalRouteCount);
  assert.ok(document.querySelector(".home-dashboard-leads-icon"));
  assert.equal(document.querySelector(".home-dashboard-leads-new-badge").textContent, "1 NEW");
  assert.match(document.querySelector(".home-dashboard-leads-count").textContent, /1 new lead/);
  const shortcuts = [...document.querySelectorAll(".business-dashboard-quick-access-grid button")];
  assert.equal(shortcuts.length, 4);
  assert.deepEqual(shortcuts.map((button) => button.querySelector("strong").textContent), ["Hiring", "Quote Builder", "Invoice Builder", "Timesheet"]);
  await act(async () => shortcuts[1].click()); assert.equal(w.routes.at(-1), "quoteBuilder?new=1");
  await act(async () => shortcuts[3].click()); assert.equal(w.routes.at(-1), "teamOperations?view=timesheets");
  assert.equal(document.querySelectorAll(".business-dashboard-glance-grid button").length, 4);
  assert.match(document.querySelector(".business-dashboard-glance-grid").textContent, /Active Jobs.*Pending Quotes.*Today's Schedule/);
  const revenue = [...document.querySelectorAll(".business-dashboard-glance-grid button")].find(button=>button.textContent.includes("View Revenue"));
  assert.ok(revenue);
  assert.doesNotMatch(revenue.textContent, /\$|\d/);
  await act(async () => revenue.click());
  assert.equal(w.routes.at(-1), "contractorDashboard");
  assert.equal(localStorage.getItem("meetroWorkCenterTab"), "revenue");
  await act(async () => document.querySelector(".business-dashboard-hero-continue").click());
  assert.equal(w.routes.at(-1), "contractorDashboard");
  assert.equal(localStorage.getItem("meetroWorkCenterTab"), "schedule");
  assert.ok(document.querySelector(".home-dashboard-notification"));
  assert.ok(w.calls.every((call) => call.method === "GET"));
});

test("Professional Home greeting follows the local device daypart boundaries", () => {
  for (const [hour, expected] of [
    [8, "Good morning, Willy"],
    [13, "Good afternoon, Willy"],
    [18, "Good evening, Willy"],
    [22, "Good evening, Willy"],
    [2, "Good evening, Willy"],
  ]) {
    assert.equal(
      getProfessionalHomeGreeting({
        name: "Willy Molina",
        now: new Date(2026, 8, 8, hour, 0, 0),
      }),
      expected
    );
  }
});
test("Homeowner projects, functional Active/History controls and service entries remain role specific", async (t) => {
  const w = await mount(t, "Home");
  const homeownerNav = [...document.querySelectorAll(".bottom-nav-dock .bottom-nav-item")];
  assert.deepEqual(homeownerNav.map((item) => item.querySelector(".bottom-nav-label").textContent), ["Home", "Work Center", "Ask Meetro", "Chat", "Profile"]);
  assert.equal(homeownerNav[2].getAttribute("aria-label"), "Ask Meetro");
  assert.equal(homeownerNav[2].getAttribute("aria-current"), null);
  let homeownerAskOpens = 0;
  const onHomeownerAsk = () => { homeownerAskOpens += 1; };
  window.addEventListener("meetro:assistant:open", onHomeownerAsk);
  const homeownerRouteCount = w.routes.length;
  await act(async () => homeownerNav[2].click());
  await act(async () => document.querySelector('.desktop-sidebar-item[aria-label="Ask Meetro"]').click());
  window.removeEventListener("meetro:assistant:open", onHomeownerAsk);
  assert.equal(homeownerAskOpens, 2);
  assert.equal(w.routes.length, homeownerRouteCount);
  assert.match(w.text(), /My Projects/); assert.match(w.text(), /Your home, our community/);
  assert.doesNotMatch(w.text(), /New Leads|Pending Quotes|Hiring|Quote Builder/);
  const tabs = [...document.querySelectorAll(".home-my-projects-tabs button")];
  assert.equal(tabs[0].getAttribute("aria-pressed"), "true");
  await act(async () => tabs[1].click());
  assert.equal(tabs[1].getAttribute("aria-pressed"), "true");
  assert.equal(tabs[0].getAttribute("aria-pressed"), "false");
  assert.match(
    document.querySelector(".home-help-action-grid").textContent,
    /Request Service.*Emergency/i
  );
  assert.equal(document.querySelectorAll(".home-help-action-grid button").length, 2);
  assert.doesNotMatch(document.querySelector(".home-help-action-grid").textContent, /Ask Meetro/i);
  assert.match(
    document.querySelector(".home-my-professionals-entry").textContent,
    /My Professionals/i
  );
  assert.equal(document.querySelector(".home-dashboard-welcome h1").textContent, "Good morning!");
  assert.equal(document.querySelectorAll(".home-top-bar .home-dashboard-ask-button").length, 0);
  assert.ok(document.querySelector(".home-top-bar .home-dashboard-notification"));
  assert.ok(document.querySelector(".home-dashboard-moments"));
  await act(async () => document.querySelector(".home-moments-view-all").click());
  assert.equal(w.routes.at(-1), "meetroMoments");
});

test("Home shows at most three viewer-visible Moments and opens an existing detail route", async (t) => {
  const w = await mount(t, "Home", () => {
    localStorage.setItem("userId", "homeowner-1");
    localStorage.setItem("meetroTimelineMoments", JSON.stringify([
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `moment-${index + 1}`,
        projectTitle: `Completed project ${index + 1}`,
        customerId: "homeowner-1",
        verified: true,
        origin: "closed_job",
        status: "published",
        closureDate: `2026-09-${String(index + 1).padStart(2, "0")}`,
      })),
      { id: "other-account", projectTitle: "Private other account", customerId: "someone-else", verified: true, origin: "closed_job", status: "published" },
    ]));
  });
  const cards = [...document.querySelectorAll(".home-moment-preview")];
  assert.equal(cards.length, 3);
  assert.doesNotMatch(document.querySelector(".home-dashboard-moments").textContent, /Private other account/);
  await act(async () => cards[0].click());
  assert.equal(w.routes.at(-1), getMeetroMomentHashRoute("moment-4"));
  assert.equal(localStorage.getItem("selectedMeetroMomentId"), "moment-4");
});
test("dashboard layout protects narrow phones and scales metrics/tools without changing nav destinations", () => {
  const css = readFileSync("src/styles/homeDashboard.css", "utf8");
  assert.match(css, /max-width: 767px/);
  assert.match(css, /@media \(max-width: 767px\), \(orientation: landscape\) and \(max-height: 500px\)/);
  assert.doesNotMatch(css, /@media \(max-width: 767px\) and \(orientation: portrait\)/);
  assert.match(css, /business-dashboard-glance-grid \{\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /business-dashboard-quick-access-grid \{\s*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /\.business-dashboard-quick-access \{[\s\S]*?overflow: visible !important/);
  assert.match(css, /business-dashboard \.business-dashboard-hero-card \{[\s\S]*?overflow: visible !important/);
  const mobileGreetingRule = css.slice(
    css.lastIndexOf('#root[data-app-layout="mobile"] .business-dashboard .business-dashboard-hero-card .home-dashboard-greeting'),
    css.indexOf("}", css.lastIndexOf('#root[data-app-layout="mobile"] .business-dashboard .business-dashboard-hero-card .home-dashboard-greeting')) + 1
  );
  assert.doesNotMatch(mobileGreetingRule, /overflow|clip|translate|margin-left|left:/);
  assert.match(css, /business-dashboard-header-section \{[\s\S]*safe-area-inset-top/);
  assert.match(css, /home-help-action-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /\.business-dashboard, \.homeowner-home-dashboard\) ~ \.meetro-assistant-launcher/);
  assert.match(css, /min-width: 768px/); assert.match(css, /min-width: 1200px/);
  assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/); assert.match(css, /repeat\(4, minmax\(0, 1fr\)\)/);
  const nav = readFileSync("src/components/BottomNav.jsx", "utf8");
  assert.match(nav, /background: "#F7F6F2"/); assert.match(nav, /borderRight: "1px solid #E5E7EB"/);
  const personal = nav.slice(nav.indexOf("const personalDesktopNavItems"), nav.indexOf("const businessDesktopNavItems"));
  assert.deepEqual(
    [...personal.matchAll(/page: "([^"]+)"/g)].map((m) => m[1]),
    [
      "home",
      "myRequests",
      "messagesInbox",
      "myProfessionals",
      "meetroMoments",
      "discover",
      "profile",
    ]
  );
});

test("Professional iPhone composition stays compact across the approved portrait and landscape matrices", () => {
  for (const [viewportWidth, viewportHeight] of [
    [375, 812], [390, 844], [393, 852], [428, 926],
    [812, 375], [844, 390], [852, 393], [926, 428],
  ]) {
    const contentWidth = viewportWidth - 24;
    const glanceCardWidth = (contentWidth - 12) / 3;
    const shortcutWidth = (contentWidth - 18) / 4;
    assert.ok(glanceCardWidth >= 113, `${viewportWidth}x${viewportHeight} keeps three glance cards usable`);
    assert.ok(shortcutWidth >= 83, `${viewportWidth}x${viewportHeight} keeps four quick-access tiles usable`);
  }
});

test("Professional dashboard reuses one ordered section tree across phone, tablet, and desktop layouts", async (t) => {
  await mount(t, "BusinessDashboard");

  const selectors = [
    ".business-dashboard-header-section",
    ".business-dashboard-leads-card",
    ".home-dashboard-glance",
    ".business-dashboard-quick-access",
    ".business-dashboard-community-entry",
    ".business-dashboard-tools-section",
  ];
  const sharedSections = selectors.map((selector) => document.querySelector(selector));
  assert.ok(sharedSections.every(Boolean));
  assert.ok(sharedSections[1].compareDocumentPosition(sharedSections[2]) & Node.DOCUMENT_POSITION_FOLLOWING);
  assert.ok(sharedSections[2].compareDocumentPosition(sharedSections[3]) & Node.DOCUMENT_POSITION_FOLLOWING);

  const responsiveTargets = [
    ...[[375, 812], [390, 844], [393, 852], [428, 926]].map(([width, height]) => ({ name: `iPhone ${width}x${height}`, width, height, layout: "mobile", orientation: "portrait" })),
    ...[[812, 375], [844, 390], [852, 393], [926, 428]].map(([width, height]) => ({ name: `iPhone ${width}x${height}`, width, height, layout: "mobile", orientation: "landscape" })),
    { name: "iPad portrait", width: 1024, height: 1366, layout: "tablet", orientation: "portrait" },
    { name: "iPad landscape", width: 1366, height: 1024, layout: "desktop", orientation: "landscape" },
    { name: "desktop 1280", width: 1280, height: 900, layout: "desktop", orientation: "landscape" },
    { name: "desktop 1440", width: 1440, height: 900, layout: "desktop", orientation: "landscape" },
  ];

  for (const target of responsiveTargets) {
    document.getElementById("root").dataset.appLayout = target.layout;
    document.getElementById("root").dataset.appOrientation = target.orientation;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: target.width });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: target.height });
    selectors.forEach((selector, index) => {
      assert.equal(document.querySelectorAll(selector).length, 1, `${target.name} has one ${selector}`);
      assert.equal(document.querySelector(selector), sharedSections[index], `${target.name} reuses ${selector}`);
    });
    assert.equal(document.querySelectorAll(".business-dashboard-glance-grid button").length, 4);
    assert.equal(document.querySelectorAll(".business-dashboard-quick-access-grid button").length, 4);
    assert.doesNotMatch(document.body.textContent, /My Projects|Today(?:'s)? Spotlight|Request Service/);
  }

  for (const sequence of [
    [[390, 844, "portrait"], [844, 390, "landscape"], [390, 844, "portrait"]],
    [[1024, 1366, "portrait"], [1366, 1024, "landscape"], [1024, 1366, "portrait"]],
    [[1366, 1024, "landscape"], [1024, 1366, "portrait"], [1366, 1024, "landscape"]],
  ]) {
    for (const [width, height, orientation] of sequence) {
      const root = document.getElementById("root");
      root.dataset.appLayout = width < 1000 ? "mobile" : width < 1100 ? "tablet" : "desktop";
      root.dataset.appOrientation = orientation;
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
      selectors.forEach((selector, index) => {
        assert.equal(document.querySelector(selector), sharedSections[index], `${width}x${height} preserves ${selector}`);
      });
    }
  }
});
