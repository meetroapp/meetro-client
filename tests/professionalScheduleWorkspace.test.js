import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { setImmediate } from "node:timers";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { prepareProfessionalSchedulingOpportunity } from "../src/utils/professionalScheduleCommands.js";

import { professionalScheduleLanguage } from "../src/utils/professionalScheduleLanguage.js";
import {
  createProfessionalScheduleSourceState,
  reduceProfessionalScheduleSourceState,
  fetchProfessionalSchedule,
  groupProfessionalSchedule,
  normalizeProfessionalSchedule,
} from "../src/utils/professionalScheduleProjection.js";

const JOB_ID = "10000000-0000-4000-8000-000000000001";
const EVALUATION_ID = "20000000-0000-4000-8000-000000000002";

function payload(overrides = {}) {
  return {
    success: true,
    code: "PROFESSIONAL_SCHEDULE_LOADED",
    schedule: {
      view: "active",
      summary: { readyToSchedule: 1, waitingOnCustomer: 0, changeRequested: 0, upcoming: 0 },
      opportunities: [{
        kind: "opportunity",
        semanticState: "READY_TO_SCHEDULE",
        jobId: JOB_ID,
        purpose: "EVALUATION",
        evaluationId: EVALUATION_ID,
        authority: { state: "ACTIVE" },
        job: { id: JOB_ID, title: "Synthetic repair", category: "Handyman" },
        customer: { displayName: "QA Customer" },
        location: { mode: "JOB_SERVICE_LOCATION", serviceArea: "Brooklyn, NY", address: null },
        actions: { canStartScheduling: true, canViewJob: true },
      }],
      visits: [],
      page: { limit: 50, hasMore: false, nextCursor: null },
      ...overrides,
    },
  };
}

test("workspace grouping preserves canonical classifications, ordering, and identities", () => {
  const schedule = normalizeProfessionalSchedule(payload());
  const groups = groupProfessionalSchedule(schedule);
  assert.equal(groups.needsScheduling, schedule.opportunities);
  assert.equal(groups.needsScheduling[0].evaluationId, EVALUATION_ID);
  assert.deepEqual(groups.waitingOnCustomer, []);
  assert.deepEqual(groups.changeRequested, []);
  assert.deepEqual(groups.upcoming, []);
});

test("only a confirmed normalized response can become canonical empty truth", () => {
  const empty = normalizeProfessionalSchedule(payload({
    summary: { readyToSchedule: 0, waitingOnCustomer: 0, changeRequested: 0, upcoming: 0 },
    opportunities: [],
    visits: [],
  }));
  assert.ok(empty);
  assert.equal(groupProfessionalSchedule(empty).needsScheduling.length, 0);
  assert.equal(groupProfessionalSchedule(null), null);
});

test("all Schedule locales have identical keys and avoid internal authority terminology", () => {
  const keys = Object.keys(professionalScheduleLanguage.en).sort();
  for (const [locale, messages] of Object.entries(professionalScheduleLanguage)) {
    assert.deepEqual(Object.keys(messages).sort(), keys, locale);
    assert.doesNotMatch(Object.values(messages).join(" "), /canonical|lifecycle-v2|authority engine/i);
  }
});

test("workspace source keeps authority checks, exact identities, safe-area containment, and no legacy storage", async () => {
  const source = await readFile(
    new URL("../src/components/ProfessionalScheduleWorkspace.jsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /item\.actions\.canStartScheduling/);
  assert.match(source, /item\.actions\.canReschedule/);
  assert.match(source, /item\.actions\.canCancel/);
  assert.match(source, /item\.actions\.canComplete/);
  assert.match(source, /isCanonicalScheduleShareable\(item\)/);
  assert.match(source, /setBlockedShareSignature\(`\$\{item\.id\}:\$\{item\.currentVersion\}`\);[\s\S]*await readActive\(\)/);
  assert.match(source, /resolveCanonicalScheduleConversationTarget\(item, workCenterJobs\)/);
  assert.match(source, /professionalScheduleSendInMeetro/);
  assert.match(source, /professionalScheduleShare/);
  assert.match(source, /onOpenConversation\?\.\(conversationTarget\)/);
  assert.match(source, /professionalScheduleArrivalTime/);
  assert.match(source, /professionalScheduleEndTimeOptional/);
  assert.match(source, /editorShowsEndTime/);
  assert.match(source, /buildProfessionalScheduleCommandSchedule/);
  assert.doesNotMatch(source, /value=\{form\.timeZone\}/);
  assert.doesNotMatch(source, /professionalScheduleArrivalNote/);
  assert.match(source, /data-schedule-identity/);
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.match(source, /88dvh/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|navigator\.userAgent/);
});

test("Schedule owns a responsive six-metric summary without changing canonical order", async () => {
  const source = await readFile(
    new URL("../src/components/ProfessionalScheduleWorkspace.jsx", import.meta.url),
    "utf8"
  );
  const summaryStart = source.indexOf("<WorkCenterMetricGrid");
  const summaryEnd = source.indexOf("/>", summaryStart);
  const summary = source.slice(summaryStart, summaryEnd);

  assert.match(source, /className="professional-schedule-workspace"/);
  assert.match(summary, /ariaLabel=\{t\("professionalScheduleTitle", language\)\}/);
  assert.deepEqual(
    [...summary.matchAll(/key:\s*"([^"]+)"/g)].map((match) => match[1]),
    ["ready", "waiting", "change", "in-progress", "today", "upcoming"]
  );
  assert.equal((summary.match(/canonicalCounts\./g) || []).length, 6);
  assert.match(source, /professionalScheduleDepositRequiredDetail/);
  assert.match(source, /<CanonicalVisitScheduleHistory/);
});

function approvedWork(locked) {
  return {
    ...payload().schedule.opportunities[0],
    purpose: "APPROVED_WORK",
    evaluationId: null,
    quoteId: "40000000-0000-4000-8000-000000000004",
    quoteApprovalId: "60000000-0000-4000-8000-000000000006",
    approvalSource: "EXTERNAL_EVIDENCE",
    semanticState: locked ? "DEPOSIT_REQUIRED" : "READY_TO_SCHEDULE",
    authority: { state: locked ? "LOCKED" : "ACTIVE" },
    actions: { canStartScheduling: !locked, canViewJob: true },
  };
}

test("rendered Schedule shows locked work without editor/action and keeps ready work schedulable", async () => {
  const vite = await createServer({
    configFile: false, appType: "custom", logLevel: "silent",
    server: { middlewareMode: true, hmr: false },
  });
  try {
    const { default: Workspace } = await vite.ssrLoadModule("/src/components/ProfessionalScheduleWorkspace.jsx");
    for (const locked of [true, false]) {
      const confirmed = normalizeProfessionalSchedule(payload({ opportunities: [approvedWork(locked)] }));
      assert.ok(confirmed);
      const markup = renderToStaticMarkup(React.createElement(Workspace, {
        language: "en", sourceState: { status: "confirmed", confirmed, error: "" },
      }));
      assert.match(markup, /QA Customer/);
      assert.doesNotMatch(markup, /Schedule is temporarily unavailable/);
      assert.doesNotMatch(markup, /role="dialog"/);
      if (locked) {
        assert.match(markup, /Deposit required/);
        assert.match(markup, /The required deposit must be satisfied before this work can be scheduled\./);
        assert.doesNotMatch(markup, />Schedule Work<|Save Schedule/);
        assert.match(markup, />View Job</);
      } else {
        assert.match(markup, /<button(?![^>]*disabled)[^>]*>Schedule Work<\/button>/);
        assert.doesNotMatch(markup, /Deposit required/);
      }
    }
  } finally {
    await vite.close();
  }
});

test("locked approved work cannot activate authority or reach scheduling preparation", async () => {
  const opportunity = normalizeProfessionalSchedule(payload({ opportunities: [approvedWork(true)] })).opportunities[0];
  let calls = 0;
  const result = await prepareProfessionalSchedulingOpportunity({
    opportunity, activate: async () => { calls++; }, readActive: async () => { calls++; },
  });
  assert.equal(result, null);
  assert.equal(calls, 0);
});

test("actual Dashboard retry callback reruns its loader effect and confirms a formerly unavailable Schedule", async () => {
  const dashboard = await readFile(new URL("../src/pages/ContractorDashboard.jsx", import.meta.url), "utf8");
  const loaderStart = dashboard.lastIndexOf("  useEffect(() => {", dashboard.indexOf('fetchProfessionalSchedule({ view: "active"'));
  const loaderEndMarker = "}, [professionalScheduleRefreshKey, setPage]);";
  const loaderEnd = dashboard.indexOf(loaderEndMarker, loaderStart);
  assert.ok(loaderStart >= 0 && loaderEnd > loaderStart);
  const effect = dashboard.slice(loaderStart, loaderEnd + loaderEndMarker.length);
  const workspaceStart = dashboard.indexOf("<ProfessionalScheduleWorkspace");
  const retryStart = dashboard.indexOf("onRetry={() => {", workspaceStart) + "onRetry={".length;
  const retryEnd = dashboard.indexOf("}}", retryStart);
  assert.ok(retryStart > workspaceStart && retryEnd > retryStart);
  const retry = dashboard.slice(retryStart, retryEnd + 1);
  let state = createProfessionalScheduleSourceState();
  let requests = 0;
  let previousDependencies;
  let cleanup;
  const context = vm.createContext({
    professionalScheduleRefreshKey: 0, setPage: () => {},
    reduceProfessionalScheduleSourceState,
    setProfessionalScheduleSource: (update) => { state = update(state); },
    setProfessionalScheduleRefreshKey: (update) => { context.professionalScheduleRefreshKey = update(context.professionalScheduleRefreshKey); },
    fetchProfessionalSchedule: (options) => fetchProfessionalSchedule({
      ...options,
      authFetchImpl: async (url) => {
        requests++;
        assert.equal(url, "/professional/schedule?view=active&limit=50");
        return requests === 1
          ? { response: { ok: false, status: 503 }, data: { message: "Temporary outage" } }
          : { response: { ok: true, status: 200 }, data: payload({ opportunities: [approvedWork(true)] }) };
      },
    }),
    useEffect: (callback, dependencies) => {
      if (previousDependencies && dependencies.every((value, i) => Object.is(value, previousDependencies[i]))) return;
      cleanup?.();
      previousDependencies = dependencies;
      cleanup = callback();
    },
  });
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  vm.runInContext(effect, context);
  await settle();
  assert.equal(requests, 1);
  assert.equal(state.status, "error");
  assert.equal(state.confirmed, null);
  vm.runInContext(`(${retry})()`, context);
  assert.equal(state.status, "loading");
  assert.equal(context.professionalScheduleRefreshKey, 1);
  vm.runInContext(effect, context);
  await settle();
  assert.equal(requests, 2);
  assert.equal(state.status, "confirmed");
  assert.equal(state.confirmed.opportunities[0].semanticState, "DEPOSIT_REQUIRED");
  assert.equal(state.confirmed.opportunities[0].actions.canStartScheduling, false);
  cleanup?.();
});
