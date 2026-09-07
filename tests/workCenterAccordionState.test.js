import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { setImmediate } from "node:timers";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import {
  getPersistedWorkCenterAccordionOpen,
  getWorkCenterAccordionStateKey,
  persistWorkCenterAccordionOpen,
} from "../src/utils/workCenterAccordionState.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const accordion = read("src/components/WorkCenterWorkspaceSystem.jsx");
const dashboard = read("src/pages/ContractorDashboard.jsx");
const styles = read("src/index.css");
const stateSource = read("src/utils/workCenterAccordionState.js");

// Execute the production effect, including its actual dependencies and cleanup.
// This is a lifecycle test, not a simulation of browser pixel/touch geometry.
function effectHarness(source, values) {
  let previous;
  let cleanup;
  const pending = new Map();
  const scrolls = [];
  let sequence = 0;
  const context = vm.createContext({
    ...values,
    window: {
      pageYOffset: 300,
      setTimeout(callback) { pending.set(++sequence, callback); return sequence; },
      clearTimeout(id) { pending.delete(id); },
      scrollTo(options) { scrolls.push(options); },
    },
    useEffect(callback, dependencies) {
      if (previous && dependencies.every((value, index) => Object.is(value, previous[index]))) return;
      cleanup?.();
      previous = dependencies;
      cleanup = callback();
    },
  });
  return {
    scrolls,
    pending,
    render(next = {}) { Object.assign(context, next); vm.runInContext(source, context); },
    flush() { for (const [id, callback] of pending) { pending.delete(id); callback(); } },
  };
}

function effectContaining(marker, source = dashboard) {
  const position = source.indexOf(marker);
  assert.ok(position >= 0, `effect marker exists: ${marker}`);
  const start = source.lastIndexOf("  useEffect(() => {", position);
  const end = source.indexOf("\n  ]);", position);
  const singleLineEnd = source.indexOf("]);", position);
  return source.slice(start, end !== -1 && end < singleLineEnd ? end + 6 : singleLineEnd + 3);
}

test("canonical Job/section state survives refreshed objects and is independent across Jobs", () => {
  const identity = "request:41:relationship:9";
  const key = getWorkCenterAccordionStateKey(identity, "evaluation");
  assert.equal(key, "request:41:relationship:9:evaluation");
  let state = persistWorkCenterAccordionOpen({}, key, true);
  const original = state;
  state = persistWorkCenterAccordionOpen(state, key, true);
  assert.equal(state, original, "unchanged presentation does not create a state update");
  const refreshedKey = getWorkCenterAccordionStateKey(`${identity}`, "evaluation");
  assert.equal(getPersistedWorkCenterAccordionOpen(state, refreshedKey), true);
  const anotherJob = getWorkCenterAccordionStateKey("request:42:relationship:9", "evaluation");
  state = persistWorkCenterAccordionOpen(state, anotherJob, false);
  assert.equal(getPersistedWorkCenterAccordionOpen(state, key), true);
  assert.equal(getPersistedWorkCenterAccordionOpen(state, anotherJob), false);
  state = persistWorkCenterAccordionOpen(state, key, false);
  assert.equal(getPersistedWorkCenterAccordionOpen(state, key), false);
  assert.equal(getPersistedWorkCenterAccordionOpen(state, "unknown"), undefined);
  assert.match(dashboard, /getCanonicalCurrentJobIdentityKey\(selectedWorkCenterJob\)/);
  assert.match(dashboard, /className="work-center-content-grid" key=\{canonicalAccordionJobIdentity\}/);
  assert.equal((dashboard.match(/\.\.\.getCanonicalAccordionPresentation\(/g) || []).length, 5);
});

test("rendered header is passive, dedicated control is named, and body is outside the button", async () => {
  const vite = await createServer({
    appType: "custom", logLevel: "silent",
    server: { middlewareMode: true, hmr: false },
  });
  try {
    const { WorkCenterAccordion } = await vite.ssrLoadModule("/src/components/WorkCenterWorkspaceSystem.jsx");
    for (const expanded of [true, false]) {
      const markup = renderToStaticMarkup(React.createElement(WorkCenterAccordion, {
        id: "evaluation", title: "Evaluation", summary: "Assessment", status: "Completed", expanded,
      }, React.createElement("p", null, "Expanded evaluation body")));
      const header = markup.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1];
      assert.ok(header);
      const buttons = [...header.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
      assert.equal(buttons.length, 1);
      assert.match(buttons[0][1], new RegExp(`aria-label="${expanded ? "Collapse" : "Expand"} Evaluation"`));
      assert.match(buttons[0][1], new RegExp(`aria-expanded="${expanded}"`));
      assert.match(buttons[0][1], /aria-controls="evaluation-content"/);
      assert.doesNotMatch(buttons[0][2], /Assessment|Completed|Expanded evaluation body/);
      assert.match(header, /<strong>Evaluation<\/strong>/);
      assert.match(markup, /<\/header><div id="evaluation-content"/);
      assert.equal(/id="evaluation-content"[^>]*hidden/.test(markup), !expanded);
    }
  } finally { await vite.close(); }
});

test("only the explicit button invokes expansion; scrolling has no event/gesture authority", () => {
  const section = accordion.slice(accordion.indexOf("export function WorkCenterAccordion"));
  assert.equal((section.match(/onClick=/g) || []).length, 1);
  assert.match(section, /className="work-center-accordion__trigger"[\s\S]*onClick=\{\(\) => updateOpen\(!visibleOpen\)\}/);
  assert.match(section, /<header className="work-center-accordion__header">/);
  assert.doesNotMatch(section + stateSource, /onPointer|onTouch|onScroll|preventDefault|stopPropagation|setPointerCapture|gesture|threshold|client[XY]|addEventListener|visualViewport|ResizeObserver/i);
});

test("accordion body is normal flow without animation or a nested scroll surface", () => {
  for (const selector of ["work-center-accordion", "work-center-accordion__content"]) {
    const block = styles.match(new RegExp(`^\\.${selector} \\{([^}]+)\\}`, "m"))?.[1];
    assert.ok(block);
    assert.match(block, /height: auto;/);
    assert.match(block, /max-height: none;/);
    assert.match(block, /overflow: visible;/);
    assert.doesNotMatch(block, /position:\s*(absolute|fixed)|animation|transition|contain:|touch-action:/);
  }
  const button = styles.match(/\.work-center-accordion__trigger \{([^}]+)\}/)?.[1];
  for (const rule of ["width", "min-width", "max-width", "height", "min-height", "max-height"]) {
    assert.match(button, new RegExp(`${rule}: 44px;`));
  }
  assert.doesNotMatch(button, /position:\s*(absolute|fixed)|width:\s*100%|touch-action/);
  assert.doesNotMatch(styles.match(/\.work-center-accordion__chevron \{([^}]+)\}/)?.[1], /transition|animation/);
});

test("same-Job refresh and viewport renders cannot restart entry scrolling; another Job can", () => {
  const effect = effectContaining("// Only entering another Job scrolls");
  const harness = effectHarness(effect, {
    selectedWorkCenterJobIdentity: "job-7",
    selectedWorkCenterJob: { id: "job-7" },
    workCenterPanelRef: { current: { getBoundingClientRect: () => ({ top: 100 }) } },
  });
  harness.render(); harness.flush();
  assert.equal(harness.scrolls.length, 1);
  for (const event of ["scroll", "resize", "rotation", "same-job-refresh"]) {
    harness.render({ selectedWorkCenterJob: { id: "job-7", event } });
    harness.flush();
  }
  assert.equal(harness.scrolls.length, 1, "fresh object identity must not pull the reader to the heading");
  harness.render({ selectedWorkCenterJobIdentity: "job-8" }); harness.flush();
  assert.equal(harness.scrolls.length, 2);
  harness.render({ selectedWorkCenterJobIdentity: "job-9" });
  harness.render({ selectedWorkCenterJobIdentity: "" }); harness.flush();
  assert.equal(harness.scrolls.length, 2, "leaving cancels queued scrolling");
});

test("alert focus scrolls once per explicit route target, not on same-Job refresh", () => {
  let scrolls = 0;
  const harness = effectHarness(effectContaining('const focusKey = `${selectedWorkCenterJobIdentity}'), {
    selectedWorkCenterJobIdentity: "job-7", selectedWorkCenterAlertStage: "evaluation",
    workCenterRouteRevision: 1, workCenterLifecycleProjection: { status: "ready" },
    focusedWorkCenterAlertRef: { current: "" },
    getBusinessWorkCenterPanelId: () => "evaluation",
    document: { querySelector: () => ({
      querySelector: () => ({ focus() {} }), scrollIntoView() { scrolls++; },
    }) },
  });
  harness.render(); harness.flush(); assert.equal(scrolls, 1);
  harness.render({ workCenterLifecycleProjection: { status: "loading" } });
  harness.render({ workCenterLifecycleProjection: { status: "ready" } });
  harness.flush(); assert.equal(scrolls, 1);
  harness.render({ workCenterRouteRevision: 2 }); harness.flush();
  assert.equal(scrolls, 2, "explicit new navigation can focus its target");
});

test("Work Center navigation callback stays stable across App layout renders and calls the latest authority", () => {
  const start = dashboard.indexOf("  const navigatePageRef = useRef(navigatePage);");
  const end = dashboard.indexOf("\n  const activeJobSnapshot", start);
  assert.ok(start >= 0 && end > start);
  const source = dashboard.slice(start, end);
  const ref = {};
  let callback;
  const calls = [];
  const render = (navigatePage) => vm.runInNewContext(`(() => { ${source}; return setPage; })()`, {
    navigatePage,
    useRef(initial) { if (!("current" in ref)) ref.current = initial; return ref; },
    useLayoutEffect(effect) { effect(); },
    useCallback(fn) { callback ||= fn; return callback; },
  });
  const first = render((route) => calls.push(`first:${route}`));
  first("workCenter");
  const next = render((route) => calls.push(`latest:${route}`));
  assert.equal(first, next);
  next("quoteBuilder");
  assert.deepEqual(calls, ["first:workCenter", "latest:quoteBuilder"]);
  assert.match(read("src/App.jsx"), /const setPage = \(requestedPage\) =>/);
  assert.match(dashboard, /\[canonicalWorkCenterRefreshKey, setPage\]/);
});


test("viewport rerenders cannot cycle Visit content through loading, but explicit refresh still reloads", async () => {
  const visits = read("src/components/CanonicalJobVisits.jsx");
  const source = effectContaining("void loadCanonicalVisitWorkspace({", visits);
  let requests = 0;
  let workspace = { status: "idle" };
  const phases = [];
  const stableNavigation = () => {};
  const harness = effectHarness(source, {
    environmentEnabled: true, jobId: "job-7", requestId: 41, relationshipId: 9,
    reloadVersion: 0, setPage: stableNavigation,
    setWorkspace(update) {
      workspace = typeof update === "function" ? update(workspace) : update;
      phases.push(workspace.status);
    },
    loadCanonicalVisitWorkspace() { requests++; return Promise.resolve({ status: "ready" }); },
  });
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  harness.render(); await settle();
  assert.deepEqual(phases, ["loading", "ready"]);
  for (let index = 0; index < 4; index++) {
    harness.render({ setPage: stableNavigation }); await settle();
  }
  assert.equal(requests, 1);
  assert.deepEqual(phases, ["loading", "ready"], "ready content is not removed on layout rerenders");
  harness.render({ reloadVersion: 1 }); await settle();
  assert.equal(requests, 2, "explicit canonical refresh keeps its existing authority");
  assert.deepEqual(phases, ["loading", "ready", "loading", "ready"]);
  assert.match(visits, /workspace.status === "ready" && subjects.length > 0/);
});
