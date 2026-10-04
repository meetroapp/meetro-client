import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  WORK_CENTER_JOB_LIFECYCLE,
  resolveWorkCenterLifecyclePresentation,
} from "../src/utils/workCenterLifecyclePresentation.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const dashboard = read("src/pages/ContractorDashboard.jsx");
const workPlan = read("src/components/ProfessionalWorkPlanWorkspace.jsx");
const visits = read("src/components/CanonicalJobVisits.jsx");
const lifecycleUi = read("src/components/WorkCenterLifecycle.jsx");
const css = read("src/index.css");
const app = read("src/App.jsx");

function liveJob(overrides = {}) {
  return {
    stage: {
      code: "WORKSTREAMS_COMPLETE_PENDING_JOB_COMPLETION",
      label: "Work Completed",
    },
    nextAction: {
      code: "REVIEW_WORKSTREAM_COMPLETION",
      label: "Complete Job",
    },
    responsibility: {
      code: "PROFESSIONAL",
      label: "Professional",
    },
    ...overrides,
  };
}

function stateMap(presentation) {
  return Object.fromEntries(presentation.stages.map((stage) => [stage.key, stage.state]));
}

test("R5 lifecycle uses the exact seven stages on every presentation", () => {
  assert.deepEqual(
    WORK_CENTER_JOB_LIFECYCLE.map((stage) => stage.label),
    ["Evaluation", "Quote", "Deposit", "Schedule", "Work Plan", "Complete Job", "Invoice"]
  );
  assert.match(lifecycleUi, /data-lifecycle-stage-count=\{stages\.length\}/);
  assert.match(dashboard, /<WorkCenterLifecycle[\s\S]*compact/);
  for (const id of [
    "canonical-job-evaluation",
    "canonical-job-quotes",
    "canonical-job-deposit",
    "canonical-job-schedule",
    "canonical-job-work-plan",
    "canonical-job-complete",
    "canonical-job-invoice",
  ]) assert.match(dashboard, new RegExp(`id="${id}"`));
});

test("marketplace completion review makes Complete Job current and keeps Invoice locked", () => {
  const presentation = resolveWorkCenterLifecyclePresentation({
    liveJob: { ...liveJob(), authority: { kind: "MEETRO_MARKETPLACE" } },
  });
  assert.deepEqual(stateMap(presentation), {
    evaluation: "complete",
    quote: "complete",
    deposit: "complete",
    schedule: "complete",
    workPlan: "complete",
    completeJob: "current",
    invoice: "locked",
  });
  assert.equal(presentation.nextActionLabel, "Complete Job");
  assert.equal(presentation.responsibilityLabel, "Professional");
  assert.equal(presentation.invoiceUnlocked, false);
});

test("business customer completion review uses the same governed stage", () => {
  const marketplace = resolveWorkCenterLifecyclePresentation({
    liveJob: { ...liveJob(), authority: { kind: "MEETRO_MARKETPLACE" } },
  });
  const business = resolveWorkCenterLifecyclePresentation({
    liveJob: { ...liveJob(), authority: { kind: "BUSINESS_CUSTOMER" } },
  });
  assert.deepEqual(stateMap(business), stateMap(marketplace));
  assert.equal(business.currentStageKey, "completeJob");
  assert.match(dashboard, /completeJobLifecycle\.state === "current"[\s\S]*<ProfessionalCompletionReview/);
  assert.doesNotMatch(workPlan, /authority\?\.kind/);
});

test("canonical JOB_COMPLETED keeps Invoice current while payment is still outstanding", () => {
  const presentation = resolveWorkCenterLifecyclePresentation({
    liveJob: liveJob({
      stage: { code: "JOB_COMPLETED", label: "Job Completed" },
      nextAction: { code: "WAIT_FOR_PAYMENT", label: "Wait for payment" },
    }),
  });
  assert.equal(presentation.currentStageKey, "invoice");
  assert.equal(presentation.completedCount, 6);
  assert.equal(stateMap(presentation).completeJob, "complete");
  assert.equal(stateMap(presentation).invoice, "current");
  assert.equal(presentation.invoiceUnlocked, true);
});

test("canonical JOB_COMPLETED with paid Invoice closes all seven presentation stages", () => {
  const presentation = resolveWorkCenterLifecyclePresentation({
    liveJob: liveJob({
      stage: { code: "JOB_COMPLETED", label: "Job Completed" },
      nextAction: { code: "REVIEW_PAID_INVOICE", label: "Review paid Invoice" },
    }),
  });
  assert.equal(presentation.currentStageKey, "");
  assert.equal(presentation.completedCount, 7);
  assert.equal(stateMap(presentation).completeJob, "complete");
  assert.equal(stateMap(presentation).invoice, "complete");
  assert.equal(presentation.invoiceUnlocked, true);
  assert.equal(presentation.stages.some((stage) => stage.state === "current"), false);
});

test("Work completion and a paid Invoice cannot fabricate canonical Job completion", () => {
  const presentation = resolveWorkCenterLifecyclePresentation({
    liveJob: liveJob(),
    invoice: { status: "PAID", paidAt: "2026-09-12T12:00:00.000Z" },
  });
  assert.equal(presentation.currentStageKey, "completeJob");
  assert.equal(presentation.invoiceUnlocked, false);
  assert.equal(stateMap(presentation).invoice, "locked");
  assert.match(dashboard, /canonicalLiveJob\?\.stage\?\.code === "JOB_COMPLETED"/);
  assert.match(dashboard, /translate\("wc52invoiceGate", activeLanguage\)/);
});

test("Deposit and Schedule are separate governed render paths", () => {
  const depositStart = dashboard.indexOf('id="canonical-job-deposit"');
  const scheduleStart = dashboard.indexOf('id="canonical-job-schedule"');
  const workPlanStart = dashboard.indexOf('id="canonical-job-work-plan"');
  assert.ok(depositStart >= 0 && scheduleStart > depositStart && workPlanStart > scheduleStart);
  assert.match(dashboard.slice(depositStart, scheduleStart), /contentMode="deposit"/);
  assert.match(dashboard.slice(scheduleStart, workPlanStart), /contentMode="schedule"/);
  assert.match(visits, /contentMode = "all"/);
  assert.doesNotMatch(dashboard, /title="Deposit & Scheduling"/);
});

test("Active Jobs stage filter omits Invoice because Invoice begins after canonical Job completion", () => {
  assert.match(
    dashboard,
    /\['evaluation', 'quote', 'deposit', 'schedule', 'workPlan', 'completeJob'\]\.map/
  );
  assert.doesNotMatch(
    dashboard,
    /\['evaluation', 'quote', 'deposit', 'schedule', 'workPlan', 'completeJob', 'invoice'\]\.map/
  );
});

test("active Job cards preserve the exact canonical next-action label", () => {
  const label = "Review completion evidence exactly";
  const presentation = resolveWorkCenterLifecyclePresentation({
    liveJob: liveJob({ nextAction: { code: "REVIEW_WORKSTREAM_COMPLETION", label } }),
  });
  assert.equal(presentation.nextActionLabel, label);
  assert.match(dashboard, /jobListPresentation\.nextStepLabel/);
  assert.match(dashboard, /data-current-lifecycle-stage=\{lifecycle\.currentStageKey\}/);
});

test("responsive Work Center keeps one architecture across iPhone, iPad, and web", () => {
  const r5 = css.slice(css.indexOf("/* R5 canonical seven-stage Work Center */"), css.indexOf("/* END R5 canonical seven-stage Work Center */"));
  assert.match(css, /work-center-lifecycle__row \{[^}]*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /work-center-lifecycle__row:last-child \{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(r5, /@media \(max-width: 767px\)/);
  assert.match(r5, /@media \(min-width: 768px\) and \(max-width: 1099px\)/);
  assert.match(r5, /data-app-layout="tablet"/);
  assert.match(r5, /@media \(min-width: 1100px\)/);
  assert.match(r5, /min-height: 44px/);
  assert.doesNotMatch(r5, /overflow-x:\s*auto|white-space:\s*nowrap/);
});

test("tablet landscape keeps the Work Center list beside the selected job detail", () => {
  assert.match(dashboard, /className="work-center-master-pane"/);
  assert.match(dashboard, /className="work-center-detail-pane"/);
  assert.match(dashboard, /data-selected=\{selectedWorkCenterJob &&/);
  assert.match(
    css,
    /\.work-center-overview--detail \.work-center-master-pane \{\s*display: none;/
  );
  assert.match(css, /@media \(orientation: landscape\) \{/);
  assert.match(
    css,
    /#root\[data-app-orientation="landscape"\]:is\([\s\S]*?\[data-app-layout="tablet"\][\s\S]*?\[data-app-native="true"\]\[data-app-layout="desktop"\][\s\S]*?\.work-center-overview--detail \{[\s\S]*?grid-template-columns:/
  );
  assert.match(
    css,
    /#root\[data-app-orientation="landscape"\]:is\([\s\S]*?\.work-center-overview--detail[\s\S]*?:is\(\.work-center-master-pane, \.work-center-detail-pane\) \{[\s\S]*?display: grid;/
  );
  assert.match(
    css,
    /\.contractor-dashboard\.work-center-job-selected \{[\s\S]*?height: 100dvh;[\s\S]*?overflow: hidden;/
  );
  assert.match(
    css,
    /:is\(\.work-center-master-pane, \.work-center-detail-pane\) \{[\s\S]*?overflow-y: auto;/
  );
});

test("approved navigation and the single universal Ask Meetro entry remain intact", () => {
  assert.match(dashboard, /<BottomNav setPage=\{setPage\} currentPage="contractorDashboard"/);
  assert.match(app, /"contractorDashboard"/);
  assert.match(app, /<AskMeetroHost/);
  assert.equal((dashboard.match(/<ContextualAskMeetro\b/g) || []).length, 0);
  assert.match(dashboard, /showAssistantEntry=\{false\}/);
});
