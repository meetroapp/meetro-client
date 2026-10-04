import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createServer } from "vite";
import { createJobRequestDraft, applyHomeownerInput, setServiceClassification, setDraftSubmissionIntent, setDraftSubmissionSnapshot, buildJobRequestDraftCanonicalPayload, saveJobRequestDraft, readJobRequestDraft } from "../src/utils/jobRequestDraft.js";

let dom, vite, createRoot, Upload, Action, session, context;
const saved = new Map();
const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const followUp = "#upload?requestOrigin=emergency_follow_up&emergencyRequestId=41";
const ok = (replayed = false) => ({ response: { ok: true, status: replayed ? 200 : 201 }, data: { success: true,
  code: `EMERGENCY_FOLLOW_UP_JOB_REQUEST_${replayed ? "REPLAYED" : "CREATED"}`, replayed,
  emergencyRequestId: 41, emergencyJobId: uuid, linkageId: uuid, post: { id: 91, title: "Paint new addition" } } });
function readyDraft({ snapshot = false } = {}) {
  let draft = createJobRequestDraft({ initialLocation: "123 Test St", initialCity: "Test City", initialRegion: "FL", initialPostalCode: "33901" });
  draft = applyHomeownerInput(draft, { "job.title": "Paint new addition", "job.description": "Separate larger scope" });
  draft = setServiceClassification(draft, { category: "painting", requestCategory: "painting", domain: "home_services", specialty: "painting", selectedServiceOptionId: "service:painting", displayLabel: "Painting" });
  if (snapshot) {
    const media = { public_id: "synthetic-request-photo" };
    const body = buildJobRequestDraftCanonicalPayload(draft, { requestPhotoPayload: [{ purpose: "request-photo", media, display_order: 0 }] });
    draft = setDraftSubmissionSnapshot(setDraftSubmissionIntent(draft, "retained-intent"), { body, uploadedMedia: [media] });
  }
  return draft;
}
test.before(async () => {
  dom = new JSDOM('<div id="root"></div>', { url: "http://localhost/", pretendToBeVisual: true });
  for (const key of ["window", "document", "navigator", "localStorage", "sessionStorage", "HTMLElement", "Element", "Node", "Event", "CustomEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "fetch", "IS_REACT_ACT_ENVIRONMENT"]) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const value = ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? dom.window[key].bind(dom.window) : dom.window[key];
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.fetch = async () => { throw new Error("Live network forbidden"); };
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.HTMLElement.prototype.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  ({ createRoot } = await import("react-dom/client"));
  vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true, hmr: false }, plugins: [{
    name: "follow-up-test-transport", enforce: "pre",
    resolveId(id) { if (/\/authFetch(?:\.js)?$/.test(id)) return "\0follow-up-http"; },
    load(id) { if (id === "\0follow-up-http") return "export const authFetch=(...args)=>globalThis.__followUpHttp(...args); export const handleAuthExpired=()=>{};"; },
  }] });
  session = await vite.ssrLoadModule("/src/utils/session.js");
  context = await vite.ssrLoadModule("/src/utils/requestHelpContext.js");
  ({ default: Upload } = await vite.ssrLoadModule("/src/pages/Upload.jsx"));
  ({ default: Action } = await vite.ssrLoadModule("/src/components/EmergencyFollowUpAction.jsx"));
});
test.after(async () => {
  await vite?.close(); dom?.window.close();
  for (const [key, value] of saved) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key]; }
  delete globalThis.__followUpHttp;
});
async function mount(t, { route = followUp, response = () => ok(), snapshot = false } = {}) {
  localStorage.clear(); sessionStorage.clear(); window.location.hash = route;
  localStorage.setItem("meetroLanguage", "en"); localStorage.setItem("token", "synthetic-test-token");
  localStorage.setItem("user", JSON.stringify({ id: 10, role: "homeowner", account_type: "homeowner" }));
  session.restoreAuthenticatedSessionFromStorage();
  const draft = readyDraft({ snapshot });
  draft.requestContext = context.readRequestHelpContext();
  saveJobRequestDraft(sessionStorage, draft);
  const routes = [], calls = [];
  globalThis.__followUpHttp = async (path, options) => {
    if (options?.method === "POST") calls.push({ path, options });
    else return { response: { ok: true, status: 200 }, data: { success: true, counts: {} } };
    if (path === "/media/request-photo/cleanup") return { response: { ok: true }, data: { success: true, code: "REQUEST_PHOTO_CLEANED" } };
    return response(path, options);
  };
  const root = createRoot(document.getElementById("root"));
  t.after(async () => { await act(async () => root.unmount()); });
  await act(async () => root.render(React.createElement(Upload, { setPage: page => { routes.push(page); window.location.hash = page; } })));
  const review = [...document.querySelectorAll("button")].find(button => button.textContent === "Review Request");
  assert.ok(review); await act(async () => review.click());
  const submit = document.querySelector('button[type="submit"].meetro-visual-primary-button');
  assert.ok(submit); return { routes, calls, submit, draft };
}
test("completed CTA navigates once, never submits, and is absent in every noncompleted state", async t => {
  const root = createRoot(document.getElementById("root")); t.after(async () => { await act(async () => root.unmount()); });
  const routes = [];
  for (const status of ["draft", "prepared", "ready_for_distribution", "assigned", "professional_en_route", "professional_arrived", "work_in_progress", "cancelled", "expired", "resolved"]) {
    await act(async () => root.render(React.createElement(Action, { emergencyRequest: { id: 41, status }, language: "en", setPage: page => routes.push(page) })));
    assert.equal(document.querySelector("[data-emergency-follow-up]"), null);
  }
  await act(async () => root.render(React.createElement(Action, { emergencyRequest: { id: 41, status: "completed" }, language: "en", setPage: page => routes.push(page) })));
  assert.match(document.body.textContent, /prior professional is not automatically selected/);
  assert.match(document.body.textContent, /Emergency remains completed/);
  const button = document.querySelector(".emergency-follow-up-button");
  await act(async () => { button.click(); button.click(); });
  assert.deepEqual(routes, [followUp.slice(1)]); assert.equal(button.disabled, true);
});
test("canonical follow-up success uses shared snapshot, double-submit lock, detail handoff and cleanup", async t => {
  let resolve; const pending = new Promise(r => { resolve = r; });
  const { routes, calls, submit, draft } = await mount(t, { snapshot: true, response: () => pending });
  assert.match(document.body.textContent, /Follow-up after Emergency/);
  await act(async () => { submit.click(); submit.click(); });
  assert.equal(calls.length, 1); assert.equal(submit.disabled, true);
  assert.equal(calls[0].path, "/emergency-requests/41/follow-up-job-request");
  assert.equal(calls[0].options.headers["Idempotency-Key"], "retained-intent");
  assert.deepEqual(JSON.parse(calls[0].options.body), draft.submission.snapshot.body);
  await act(async () => resolve(ok()));
  assert.deepEqual(routes, ["homeownerRequestDetails"]); assert.equal(window.location.hash, "#homeownerRequestDetails");
  assert.equal(localStorage.getItem("selectedHomeownerRequestId"), "91");
  assert.equal(readJobRequestDraft(sessionStorage).submission.intentKey, "");
  assert.equal(readJobRequestDraft(sessionStorage).job.title, "");
  assert.equal(calls.length, 1, "canonical media must not be deleted");
});
test("ambiguous network failure preserves media/intent, retry replay succeeds", async t => {
  let tries = 0;
  const { calls, routes, submit } = await mount(t, { snapshot: true, response: () => { if (++tries === 1) throw new Error("network"); return ok(true); } });
  await act(async () => submit.click());
  assert.equal(calls.length, 1); assert.equal(readJobRequestDraft(sessionStorage).submission.intentKey, "retained-intent");
  assert.ok(document.querySelector('[role="alert"]')); assert.deepEqual(routes, []);
  await act(async () => submit.click());
  assert.equal(calls.length, 2); assert.equal(calls[0].options.body, calls[1].options.body);
  assert.equal(calls[0].options.headers["Idempotency-Key"], calls[1].options.headers["Idempotency-Key"]);
  assert.deepEqual(routes, ["homeownerRequestDetails"]);
});
test("definitive not-ready error announces server message and cleans only temporary media", async t => {
  const message = "The Emergency must be completed before a Standard follow-up Job Request is created.";
  const { calls, routes, submit } = await mount(t, { snapshot: true, response: () => ({ response: { ok: false, status: 409 }, data: { success: false, code: "EMERGENCY_FOLLOW_UP_NOT_READY", message } }) });
  await act(async () => submit.click());
  assert.deepEqual(calls.map(c => c.path), ["/emergency-requests/41/follow-up-job-request", "/media/request-photo/cleanup"]);
  assert.equal(readJobRequestDraft(sessionStorage).submission.intentKey, ""); assert.deepEqual(routes, []);
  assert.ok([...document.querySelectorAll('[role="alert"]')].some(el => el.textContent.includes(message)));
});
test("collision blocks real submit before all side effects and reports an accessible error", async t => {
  const { calls, submit } = await mount(t);
  await act(async () => document.querySelector('[aria-labelledby="job-request-photos-card-heading"] button').click());
  const input = document.querySelector('input[type="file"]');
  assert.ok(input);
  Object.defineProperty(input, "files", { configurable: true, value: [new File(["synthetic-photo"], "new-scope.jpg", { type: "image/jpeg" })] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  await act(async () => document.querySelector('[aria-labelledby="job-request-review-card-heading"] button').click());
  const currentSubmit = document.querySelector('button[type="submit"].meetro-visual-primary-button');
  const before = sessionStorage.getItem("meetroJobRequestDraft");
  // Change context synchronously without a rerender to exercise the actual submit guard.
  window.history.replaceState(null, "", followUp + "&sourceMeetroRelationshipId=" + uuid);
  await act(async () => currentSubmit.closest("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  assert.deepEqual(calls, []); assert.match(document.body.textContent, /context could not be verified/);
  assert.equal(sessionStorage.getItem("meetroJobRequestDraft"), before);
  assert.ok(document.querySelector('[role="alert"]'));
  assert.equal(submit.disabled, false, "early rejection must not leave busy state stuck");
});
for (const existing of [false, true]) test(`${existing ? "existing-customer" : "ordinary"} still uses canonical /posts behavior`, async t => {
  const route = existing ? "#upload?requestOrigin=existing_customer_request&sourceMeetroRelationshipId=" + uuid : "#upload";
  const { calls, routes, submit } = await mount(t, { route, response: () => ({ response: { ok: true, status: 201 }, data: { success: true, code: "JOB_REQUEST_CREATED", post: { id: 92 } } }) });
  await act(async () => submit.click());
  assert.equal(calls.length, 1); assert.equal(calls[0].path, "/posts");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.request_origin, existing ? "existing_customer_request" : undefined);
  assert.equal(body.source_meetro_relationship_id, existing ? uuid : undefined);
  assert.deepEqual(routes, []); assert.equal(localStorage.getItem("selectedHomeownerRequestId"), "92");
});

for (const destination of ["#upload", "#upload?requestOrigin=emergency_follow_up&emergencyRequestId=42", "#upload?requestOrigin=existing_customer_request&sourceMeetroRelationshipId=" + uuid]) {
  test(`pending follow-up cannot be rebound or apply a late result at ${destination}`, async t => {
    let resolve;
    const pending = new Promise(r => { resolve = r; });
    const { submit, calls, routes } = await mount(t, { snapshot: true, response: () => pending });
    await act(async () => submit.click());
    const before = sessionStorage.getItem("meetroJobRequestDraft");
    await act(async () => { window.location.hash = destination; window.dispatchEvent(new Event("hashchange")); });
    assert.match(document.body.textContent, /earlier submission is unresolved/);
    await act(async () => resolve(ok()));
    assert.deepEqual(routes, []); assert.equal(calls.length, 1);
    assert.equal(localStorage.getItem("selectedHomeownerRequestId"), null);
    assert.equal(sessionStorage.getItem("meetroJobRequestDraft"), before);
  });
}
test("account switch during pending follow-up rejects late result", async t => {
  let resolve;
  const { submit, routes, calls } = await mount(t, { snapshot: true, response: () => new Promise(r => { resolve = r; }) });
  await act(async () => submit.click());
  await act(async () => session.saveMeetroSession({ token: "other-synthetic", user: { id: 20, role: "homeowner", account_type: "homeowner" } }));
  await act(async () => resolve(ok()));
  assert.deepEqual(routes, []); assert.equal(calls.length, 1);
  assert.equal(localStorage.getItem("selectedHomeownerRequestId"), null);
});
test("opening follow-up preserves an unrelated ordinary saved draft until explicit discard", async t => {
  localStorage.clear(); sessionStorage.clear(); window.location.hash = followUp;
  localStorage.setItem("token", "synthetic"); localStorage.setItem("user", JSON.stringify({ id: 10, role: "homeowner" }));
  session.restoreAuthenticatedSessionFromStorage();
  const draft = readyDraft(); draft.requestContext = { actorId: "10", mode: "ordinary", sourceId: "" };
  saveJobRequestDraft(sessionStorage, draft); const before = sessionStorage.getItem("meetroJobRequestDraft");
  const root = createRoot(document.getElementById("root")); t.after(async () => { await act(async () => root.unmount()); });
  await act(async () => root.render(React.createElement(Upload, { setPage: () => {} })));
  assert.match(document.body.textContent, /earlier draft is preserved/);
  assert.equal(document.querySelector("form"), null);
  assert.equal(sessionStorage.getItem("meetroJobRequestDraft"), before);
  window.confirm = () => false;
  const discard = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Discard draft"));
  await act(async () => discard.click()); assert.equal(sessionStorage.getItem("meetroJobRequestDraft"), before);
  window.confirm = () => true;
  await act(async () => discard.click());
  assert.ok(document.querySelector("[data-emergency-follow-up-context]"));
  assert.equal(readJobRequestDraft(sessionStorage).job.title, "");
});

test("route switch during upload signing cannot upload, create, clean up, or apply late state", async t => {
  let resolve;
  const { calls, routes } = await mount(t, { response: () => new Promise(r => { resolve = r; }) });
  await act(async () => document.querySelector('[aria-labelledby="job-request-photos-card-heading"] button').click());
  const input = document.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", { configurable: true, value: [new File(["synthetic"], "scope.jpg", { type: "image/jpeg" })] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  await act(async () => document.querySelector('[aria-labelledby="job-request-review-card-heading"] button').click());
  const submit = document.querySelector('button[type="submit"].meetro-visual-primary-button');
  await act(async () => submit.closest("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  assert.deepEqual(calls.map(c=>c.path), ["/media/upload-signature"]);
  await act(async () => { window.location.hash = "upload"; window.dispatchEvent(new Event("hashchange")); });
  const saved = sessionStorage.getItem("meetroJobRequestDraft");
  await act(async () => resolve({ response: { ok: true }, data: { success: true, code: "MEDIA_UPLOAD_SIGNATURE_CREATED", signature: {} } }));
  assert.deepEqual(calls.map(c=>c.path), ["/media/upload-signature"]);
  assert.deepEqual(routes, []); assert.equal(sessionStorage.getItem("meetroJobRequestDraft"), saved);
});
test("malformed success preserves snapshot/media and intent for replay", async t => {
  const { submit, calls, routes } = await mount(t, { snapshot: true, response: () => { const result = ok(); delete result.data.post; return result; } });
  await act(async () => submit.click());
  assert.equal(calls.length,1);assert.deepEqual(routes,[]);
  assert.equal(readJobRequestDraft(sessionStorage).submission.intentKey,"retained-intent");
  assert.ok(readJobRequestDraft(sessionStorage).submission.snapshot.uploadedMedia.length);
});
