import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createServer } from "vite";
import { buildBusinessProfilePayloadFromCanonical } from "../src/utils/businessProfilePersistence.js";

let dom, vite, createRoot;
const globals = new Map();
const pause = () => new Promise((resolve) => setTimeout(resolve, 20));
const fixture = {
  id: 42, business_name: "Canonical Business", category: "painting", phone: "555-0101",
  location: "Cape Coral", bio: "Interior and exterior work", street_address: "10 Main St",
  address_line_2: "Unit 2", city: "Cape Coral", state_province: "FL", postal_code: "33904",
  country: "US", service_area: "Lee County", show_business_address_public: false,
  business_hours: "Mon–Fri", license_number: "LIC-42", license_state: "FL",
  license_type: "Contractor", license_expiration: "2027-10-01", service_specialties: ["interior_painting"],
  available_now: false, dispatch_ready: true,
};
const confirmed = (profile) => ({ response: { ok: true }, data: { success: true, code: "BUSINESS_PROFILE_UPDATED", profile } });

test.before(async () => {
  dom = new JSDOM('<div id="root"></div>', { url: "http://localhost/#businessDashboard", pretendToBeVisual: true });
  for (const key of ["window", "document", "navigator", "localStorage", "sessionStorage", "HTMLElement", "Element", "Node", "Event", "CustomEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? dom.window[key].bind(dom.window) : dom.window[key] });
  }
  globals.set("fetch", Object.getOwnPropertyDescriptor(globalThis, "fetch"));
  globalThis.fetch = async () => { throw new Error("No live network in availability tests"); };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  ({ createRoot } = await import("react-dom/client"));
  vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true, hmr: false }, plugins: [{
    name: "availability-test-ports", enforce: "pre",
    resolveId(id) {
      if (/\/authFetch(?:\.js)?$/.test(id)) return "\0availability-http";
      if (/\/BottomNav(?:\.jsx)?$/.test(id)) return "\0availability-nav";
      if (/\/professionalOpportunityCoordinator(?:\.js)?$/.test(id)) return "\0availability-leads";
      if (/\/professionalScheduleProjection(?:\.js)?$/.test(id)) return "\0availability-schedule";
    },
    load(id) {
      if (id === "\0availability-http") return 'export const authFetch = (...args) => globalThis.__availabilityHttp(...args);';
      if (id === "\0availability-nav") return 'export default function BottomNav() { return null; }';
      if (id === "\0availability-leads") return 'export const PROFESSIONAL_OPPORTUNITY_PHASE = { LOADING: "loading" }; export const requestProfessionalOpportunities = () => {}; export const subscribeProfessionalOpportunities = (fn) => { fn({status:"empty", records:[]}); return () => {}; };';
      if (id === "\0availability-schedule") return 'export const fetchProfessionalSchedule = async () => null; export const getProfessionalScheduleCounts = () => ({}); export const groupProfessionalSchedule = () => ({today:[]});';
    },
  }] });
});
test.after(async () => {
  await vite?.close(); dom?.window.close();
  for (const [key, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  delete globalThis.__availabilityHttp;
});

async function mount(t, { profile = fixture, language = "en", write } = {}) {
  localStorage.clear();
  localStorage.setItem("meetroLanguage", language);
  localStorage.setItem("activeAccountMode", "business");
  // Deliberately stale mirrors must never override the fetched profile.
  localStorage.setItem("meetroAvailableNow", String(!profile.available_now));
  localStorage.setItem("meetroDispatchReady", String(!profile.dispatch_ready));
  let canonical = { ...profile };
  const calls = [];
  globalThis.__availabilityHttp = async (path, options = {}) => {
    const call = { path, method: options.method || "GET", body: options.body ? JSON.parse(options.body) : undefined };
    calls.push(call);
    if (path === "/my-contractor-profile") return { response: { ok: true }, data: { profile: { ...canonical } } };
    assert.equal(path, "/contractor-profiles/42");
    assert.equal(call.method, "PUT");
    const result = write ? await write(call) : confirmed({ ...canonical, ...call.body });
    if (result?.response?.ok && result.data?.success) canonical = { ...result.data.profile };
    return result;
  };
  let root;
  async function show(page = "BusinessDashboard") {
    if (root) await act(async () => root.unmount());
    const { default: Page } = await vite.ssrLoadModule(`/src/pages/${page}.jsx`);
    root = createRoot(document.getElementById("root"));
    await act(async () => { root.render(React.createElement(Page, { setPage() {} })); await pause(); });
  }
  t.after(async () => { if (root) await act(async () => root.unmount()); });
  await show();
  return { calls, show };
}
const panel = () => document.querySelector(".business-dashboard-availability");
const switches = () => [...panel().querySelectorAll('[role="switch"]')];
const states = () => switches().map((button) => button.getAttribute("aria-checked"));
const click = async (button) => act(async () => { button.click(); await pause(); });

for (const available of [false, true]) for (const dispatch of [false, true]) {
  test(`dashboard renders canonical availability ${available}/${dispatch}, independently of stale mirrors`, async (t) => {
    const w = await mount(t, { profile: { ...fixture, available_now: available, dispatch_ready: dispatch } });
    assert.deepEqual(states(), [String(available), String(dispatch)]);
    assert.equal(switches().length, 2);
    assert.match(panel().textContent, /Available Now/);
    assert.match(panel().textContent, /Dispatch Ready/);
    assert.doesNotMatch(panel().textContent, /Messages|Communication|Allow Direct Emergency Selection/);
    assert.equal(Boolean(panel().querySelector(".business-dashboard-availability-note")), !available && dispatch);
    if (!available && dispatch) assert.match(panel().textContent, /Turn on Available Now to appear for direct Emergency selection\./);
    assert.ok(document.querySelector(".business-dashboard-header-section").compareDocumentPosition(panel()) & Node.DOCUMENT_POSITION_FOLLOWING);
    assert.ok(panel().compareDocumentPosition(document.querySelector(".business-dashboard-leads-card")) & Node.DOCUMENT_POSITION_FOLLOWING);
    for (const button of switches()) {
      assert.ok(document.getElementById(button.getAttribute("aria-labelledby"))?.textContent);
      assert.ok(document.getElementById(button.getAttribute("aria-describedby"))?.textContent);
    }
    assert.ok(w.calls.every((call) => call.method === "GET"));
  });
}

test("each dashboard switch preserves the full profile and waits for confirmation; rapid cross-setting writes are blocked", async (t) => {
  let resolve;
  const w = await mount(t, { write: () => new Promise((done) => { resolve = done; }) });
  await act(async () => { switches()[0].click(); switches()[0].click(); switches()[1].click(); });
  assert.equal(w.calls.filter((call) => call.method === "PUT").length, 1);
  assert.deepEqual(states(), ["false", "true"]);
  assert.ok(switches().every((button) => button.disabled));
  assert.match(panel().querySelector('[role="status"]').textContent, /Saving/);
  assert.deepEqual(w.calls.at(-1).body, buildBusinessProfilePayloadFromCanonical(fixture, { available_now: true }));
  const updated = { ...fixture, available_now: true, service_area: "Updated by server" };
  await act(async () => { resolve(confirmed(updated)); await pause(); });
  assert.deepEqual(states(), ["true", "true"]);
  await click(switches()[1]);
  assert.deepEqual(w.calls.at(-1).body, buildBusinessProfilePayloadFromCanonical(updated, { dispatch_ready: false }));
  assert.deepEqual(states(), ["true", "true"]);
  await act(async () => { resolve(confirmed({ ...updated, dispatch_ready: false })); await pause(); });
  assert.deepEqual(states(), ["true", "false"]);
  assert.ok(switches().every((button) => !button.disabled));
});

for (const index of [0, 1]) {
  for (const failure of ["rejected", "unconfirmed"]) {
    test(`switch ${index} ${failure} write retains confirmed truth and supports retry`, async (t) => {
      let fail = true;
      await mount(t, { write: (call) => {
        if (!fail) return confirmed({ ...fixture, ...call.body });
        if (failure === "rejected") throw new Error("offline");
        return { response: { ok: true }, data: { profile: { ...fixture, ...call.body } } };
      } });
      await click(switches()[index]);
      assert.deepEqual(states(), ["false", "true"]);
      assert.match(panel().querySelector('[role="alert"]').textContent, /could not be saved/);
      assert.ok(switches().every((button) => !button.disabled));
      fail = false;
      await click(switches()[index]);
      assert.deepEqual(states(), index === 0 ? ["true", "true"] : ["false", "false"]);
      assert.equal(Boolean(panel().querySelector('[role="alert"]')), false);
    });
  }
  test(`switch ${index} renders both returned server values instead of the requested value`, async (t) => {
    await mount(t, { write: () => confirmed({ ...fixture, available_now: false, dispatch_ready: false }) });
    await click(switches()[index]);
    assert.deepEqual(states(), ["false", "false"]);
  });
}

test("dashboard and existing Business Profile Availability page read each other's confirmed writes", async (t) => {
  const w = await mount(t);
  await click(switches()[0]);
  await click(switches()[1]);
  await w.show("BusinessAvailability");
  const setting = (label) => [...document.querySelectorAll("button")].find((button) => button.querySelector("strong")?.textContent === label);
  assert.equal(setting("Available Now").querySelector("span").textContent, "ON");
  assert.equal(setting("Allow Direct Emergency Selection").querySelector("span").textContent, "OFF");
  await click(setting("Available Now"));
  await click(setting("Allow Direct Emergency Selection"));
  await click([...document.querySelectorAll("button")].find((button) => button.textContent === "Save Availability"));
  await w.show();
  assert.deepEqual(states(), ["false", "true"]);
  assert.match(panel().textContent, /Turn on Available Now/);
  assert.equal(w.calls.filter((call) => call.method === "PUT").length, 3);
});

for (const [language, labels] of Object.entries({ es: ["Disponible Ahora", "Selección Directa"], fr: ["Disponible Maintenant", "Sélection Directe"], "pt-BR": ["Disponível Agora", "Seleção Direta"] })) {
  test(`${language} availability controls, help, status and errors are localized`, async (t) => {
    await mount(t, { language, write: () => { throw new Error("offline"); } });
    assert.deepEqual(switches().map((button) => document.getElementById(button.getAttribute("aria-labelledby")).textContent), labels);
    assert.doesNotMatch(panel().textContent, /Show your business|Turn on Available Now|Allow direct Emergency/);
    await click(switches()[0]);
    assert.ok(panel().querySelector('[role="alert"]').textContent);
    assert.doesNotMatch(panel().textContent, /could not be saved/);
  });
}
