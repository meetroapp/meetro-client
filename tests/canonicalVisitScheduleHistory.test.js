import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { setImmediate } from "node:timers";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
import { fetchCanonicalVisitDetail } from "../src/utils/canonicalVisitProjection.js";

const jobId = "11111111-1111-4111-8111-111111111111";
const visitId = "55555555-5555-4555-8555-555555555555";
const secondVisitId = "55555555-5555-4555-8555-555555555556";
const participant = "66666666-6666-4666-8666-666666666666";
const evaluationId = "22222222-2222-4222-8222-222222222222";

function detailFixture({ id = visitId, purpose = "EVALUATION", cancelled = false, hour = "14" } = {}) {
  const versions = ["PROPOSED", "PROPOSED", "PROPOSED", "SCHEDULED", "STARTED", cancelled ? "CANCELLED" : "COMPLETED"].map((state, index) => ({
    version: index + 1, state,
    scheduledStartAt: `2026-09-08T${index === 0 ? "13" : hour}:00:00.000Z`,
    scheduledEndAt: null, timeZone: "America/New_York", locationMode: "JOB_SERVICE_LOCATION",
    recordedByParticipantId: participant,
    createdAt: index < 4 ? `2026-09-06T1${index + 4}:00:00.000Z` : `2026-09-08T${index + 10}:00:00.000Z`,
    startedAt: index >= 4 ? "2026-09-08T13:58:00.000Z" : null,
    completedAt: index === 5 && !cancelled ? "2026-09-08T14:47:00.000Z" : null,
    cancelledAt: index === 5 && cancelled ? "2026-09-08T14:47:00.000Z" : null,
    cancellationReason: index === 5 && cancelled ? "Customer unavailable" : null,
  }));
  const types = ["VISIT_PROPOSED", "VISIT_SCHEDULE_PROPOSED", "VISIT_RESCHEDULED", "VISIT_CONFIRMED", "VISIT_STARTED", cancelled ? "VISIT_CANCELLED" : "VISIT_COMPLETED"];
  const events = versions.map((version, index) => ({
    id: `88888888-8888-4888-8888-88888888888${index}`,
    type: types[index], visitVersion: version.version, previousVisitVersion: index || null,
    visitState: version.state, reason: null, recordedByParticipantId: participant,
    createdAt: version.startedAt && index === 4 ? version.startedAt : index === 5 ? (version.completedAt || version.cancelledAt) : version.createdAt,
  }));
  events.splice(1, 0, {
    id: "88888888-8888-4888-8888-888888888887", type: "VISIT_CHANGE_REQUESTED",
    visitVersion: 1, previousVisitVersion: 1, visitState: "PROPOSED",
    reason: "Please use 10 AM instead", recordedByParticipantId: participant, createdAt: "2026-09-06T14:30:00.000Z",
  });
  return {
    ...versions.at(-1), id, jobId, purpose, currentVersion: 6,
    evaluationId: purpose === "EVALUATION" ? evaluationId : null,
    workstreamIds: [],
    approvedQuoteDecisionEvidence: purpose === "APPROVED_WORK" ? { decisionId: "44444444-4444-4444-8444-444444444444", decision: "APPROVED" } : null,
    createdByParticipantId: participant, recordedByParticipantId: participant,
    createdAt: versions[0].createdAt, versionCreatedAt: versions.at(-1).createdAt,
    actions: { canConfirm: false, canRequestChange: false, canReschedule: false, canCancel: false, canStart: false, canComplete: false },
    history: { versions, events },
  };
}

// Run the real component handlers/effects with deterministic hook scheduling.
// JSX and the canonical API/normalizer remain production code; no pixel-layout claims.
function mount(Component, props, fetchImpl) {
  const state = [], effects = [];
  let index = 0, pending = [], tree;
  const harness = {
    fetch: fetchImpl,
    useState(initial) {
      const cell = index++;
      if (!(cell in state)) state[cell] = typeof initial === "function" ? initial() : initial;
      return [state[cell], (next) => { state[cell] = typeof next === "function" ? next(state[cell]) : next; }];
    },
    useEffect(callback, deps) {
      const cell = index++;
      const previous = effects[cell];
      if (previous && deps.every((item, i) => Object.is(item, previous.deps[i]))) return;
      pending.push(() => { previous?.cleanup?.(); effects[cell] = { deps, cleanup: callback() }; });
    },
  };
  return {
    render(next = {}) {
      props = { ...props, ...next }; index = 0;
      globalThis.__visitHistoryTest = harness;
      tree = Component(props);
      const jobs = pending; pending = []; jobs.forEach((job) => job());
      return renderToStaticMarkup(tree);
    },
    click(label) {
      function text(node) {
        if (typeof node === "string" || typeof node === "number") return String(node);
        if (Array.isArray(node)) return node.map(text).join("");
        return node?.props ? text(node.props.children) : "";
      }
      function find(node) {
        if (Array.isArray(node)) return node.map(find).find(Boolean);
        if (node?.type === "button" && text(node).includes(label)) return node;
        return node?.props ? find(node.props.children) : null;
      }
      const button = find(tree); assert.ok(button, label);
      globalThis.__visitHistoryTest = harness;
      button.props.onClick();
      return this.render();
    },
    unmount() { effects.forEach((effect) => effect?.cleanup?.()); },
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

async function withComponent(run) {
  const vite = await createServer({
    configFile: false, appType: "custom", logLevel: "silent",
    plugins: [{
      name: "history-test-hooks",
      transform(code, id) {
        if (!id.endsWith("/CanonicalVisitScheduleHistory.jsx")) return null;
        return code
          .replace('import { useEffect, useState } from "react";', 'const useState = (...args) => globalThis.__visitHistoryTest.useState(...args); const useEffect = (...args) => globalThis.__visitHistoryTest.useEffect(...args);')
          .replace('import { fetchCanonicalVisitDetail } from "../utils/canonicalVisitProjection.js";', 'const fetchCanonicalVisitDetail = (...args) => globalThis.__visitHistoryTest.fetch(...args);');
      },
    }],
    server: { middlewareMode: true, hmr: false },
  });
  try {
    const { default: Component } = await vite.ssrLoadModule("/src/components/CanonicalVisitScheduleHistory.jsx");
    await run(Component);
  } finally { delete globalThis.__visitHistoryTest; await vite.close(); }
}

function transport(response, calls) {
  return (options) => fetchCanonicalVisitDetail({ ...options, authFetchImpl: async (endpoint, request) => {
    calls.push({ endpoint, request });
    return { response: { ok: true, status: 200 }, data: { success: true, visit: response } };
  } });
}

for (const purpose of ["EVALUATION", "APPROVED_WORK"]) {
  test(`${purpose} history is collapsed, exact, versioned, and read-only`, async () => withComponent(async (Component) => {
    const detail = detailFixture({ purpose }); const calls = [];
    const mounted = mount(Component, { visit: detail, language: "en" }, transport(detail, calls));
    assert.match(mounted.render(), /aria-expanded="false"/);
    assert.equal(calls.length, 0);
    assert.match(mounted.click("View Schedule History"), /Loading schedule history/);
    await settle();
    const markup = mounted.render();
    assert.deepEqual(calls, [{ endpoint: `/jobs/${jobId}/visits/${visitId}`, request: { method: "GET", cache: "no-store" } }]);
    for (const text of ["Visit proposed", "New schedule proposed", "Schedule updated", "Schedule change requested", "Please use 10 AM instead", "Visit confirmed", "Visit started", "Visit completed", "9:00 AM", "10:00 AM", "EDT"]) assert.ok(markup.includes(text), text);
    assert.doesNotMatch(markup, /Professional rescheduled|Customer confirmed|Customer proposed/);
    assert.equal((markup.match(/<button/g) || []).length, 1, "history offers no version actions");
    assert.equal(detail.currentVersion, 6);
    mounted.unmount();
  }));
}

test("cancelled history keeps earlier proposals and external confirmation is explicitly evidenced", async () => withComponent(async (Component) => {
  const detail = detailFixture({ purpose: "APPROVED_WORK", cancelled: true });
  detail.history.events[4].type = "VISIT_EXTERNAL_CONFIRMATION_RECORDED";
  const mounted = mount(Component, { visit: detail }, transport(detail, []));
  mounted.render(); mounted.click("View Schedule History"); await settle();
  const markup = mounted.render();
  assert.match(markup, /Visit cancelled/); assert.match(markup, /Visit proposed/);
  assert.match(markup, /External confirmation recorded/); assert.match(markup, /9:00 AM/);
  mounted.unmount();
}));

test("same Job/customer histories are isolated and card retry reloads only the failed exact Visit", async () => withComponent(async (Component) => {
  const first = detailFixture(), second = detailFixture({ id: secondVisitId, hour: "16" });
  const calls = []; let fail = true;
  const load = (options) => fetchCanonicalVisitDetail({ ...options, authFetchImpl: async (endpoint) => {
    calls.push(endpoint);
    if (options.visitId === visitId && fail) return { response: { ok: false, status: 503 }, data: {} };
    return { response: { ok: true }, data: { success: true, visit: options.visitId === visitId ? first : second } };
  } });
  const one = mount(Component, { visit: first }, load), two = mount(Component, { visit: second }, load);
  one.render(); two.render(); one.click("View Schedule History"); two.click("View Schedule History");
  await settle();
  assert.match(one.render(), /Schedule history is temporarily unavailable/);
  assert.match(two.render(), /12:00 PM/);
  assert.doesNotMatch(two.render(), /temporarily unavailable/);
  fail = false;
  one.click("Try Again"); await settle();
  assert.match(one.render(), /10:00 AM/);
  assert.doesNotMatch(one.render(), /Schedule at this step: Sep 8, 2026, 12:00 PM|temporarily unavailable/);
  assert.deepEqual(calls, [`/jobs/${jobId}/visits/${visitId}`, `/jobs/${jobId}/visits/${secondVisitId}`, `/jobs/${jobId}/visits/${visitId}`]);
  one.unmount(); two.unmount();
}));

test("late response cannot mix identities or overwrite a newer current-version history", async () => withComponent(async (Component) => {
  const one = detailFixture(), two = detailFixture({ id: secondVisitId, hour: "16" });
  let release;
  const mounted = mount(Component, { visit: one }, (options) => options.visitId === visitId
    ? new Promise((resolve) => { release = resolve; })
    : transport(two, [])(options));
  mounted.render(); mounted.click("View Schedule History");
  mounted.render({ visit: two }); await settle();
  assert.match(mounted.render(), /12:00 PM/);
  release(await transport(one, [])({ jobId, visitId, purpose: one.purpose, evaluationId }));
  await settle();
  assert.match(mounted.render(), /12:00 PM/); assert.doesNotMatch(mounted.render(), /Schedule at this step: Sep 8, 2026, 10:00 AM/);
  mounted.unmount();
}));

test("stale detail fails locally and collapsing restores the compact card", async () => withComponent(async (Component) => {
  const detail = detailFixture();
  const mounted = mount(Component, { visit: { ...detail, currentVersion: 7 } }, transport(detail, []));
  mounted.render(); mounted.click("View Schedule History"); await settle();
  assert.match(mounted.render(), /Schedule history is temporarily unavailable/);
  assert.match(mounted.click("View Schedule History"), /aria-expanded="false"/);
  mounted.unmount();
}));

test("Schedule mounts exact keyed histories only for Visits and keeps commands on the current item", async () => {
  const source = await readFile(new URL("../src/components/ProfessionalScheduleWorkspace.jsx", import.meta.url), "utf8");
  assert.match(source, /visit && \(\s*<CanonicalVisitScheduleHistory/);
  assert.match(source, /key=\{`\$\{item.jobId\}:\$\{item.id\}`\}\s+visit=\{item\}/);
  assert.match(source, /onClick=\{\(\) => onAction\("reschedule", item\)\}/);
  assert.doesNotMatch(source, /onAction\([^\n]*history|visit: [^\n]*history/);
});

test("collapse/unmount ignores pending reads; reopening loads fresh exact history", async () => withComponent(async (Component) => {
  const detail = detailFixture(); const releases = [];
  const normalized = await transport(detail, [])({ jobId, visitId, purpose: detail.purpose });
  const mounted = mount(Component, { visit: detail }, () => new Promise((resolve) => releases.push(resolve)));
  mounted.render(); mounted.click("View Schedule History"); mounted.click("View Schedule History");
  releases[0](normalized); await settle();
  assert.doesNotMatch(mounted.render(), /<ol/);
  assert.match(mounted.click("View Schedule History"), /Loading schedule history/);
  assert.equal(releases.length, 2);
  releases[1](normalized); await settle(); assert.match(mounted.render(), /<ol/);
  mounted.click("View Schedule History"); mounted.click("View Schedule History"); mounted.unmount();
  releases[2](normalized); await settle();
}));

test("a new current version refetches only history while leaving the supplied current Visit intact", async () => withComponent(async (Component) => {
  const complete = detailFixture();
  const started = structuredClone(complete);
  started.currentVersion = 5; started.state = "STARTED"; started.completedAt = null;
  started.history.versions = started.history.versions.slice(0, 5);
  started.history.events = started.history.events.filter((event) => event.visitVersion <= 5);
  const calls = []; let response = started;
  const mounted = mount(Component, { visit: started }, (options) => transport(response, calls)(options));
  mounted.render(); mounted.click("View Schedule History"); await settle();
  assert.doesNotMatch(mounted.render(), /Visit completed/);
  response = complete;
  assert.match(mounted.render({ visit: complete }), /Loading schedule history/);
  await settle(); assert.match(mounted.render(), /Visit completed/);
  assert.equal(calls.length, 2); assert.equal(complete.id, started.id); assert.equal(started.currentVersion, 5);
  mounted.unmount();
}));
