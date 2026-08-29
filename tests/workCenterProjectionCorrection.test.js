import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { shouldRenderPublicSite } from "../src/utils/appEntryRouting.js";
import { normalizeCanonicalLiveJobProjection } from "../src/utils/canonicalLiveJobProjection.js";
import { parseProfessionalWorkCenterRoute } from "../src/utils/professionalWorkCenterRoute.js";
import {
  CANONICAL_WORK_CENTER_AUTHORITY,
  findCanonicalWorkCenterEntryByJobId,
} from "../src/utils/workCenterCanonicalHydration.js";
import { validateProfessionalWorkPlan } from "../src/utils/workPlanApi.js";
import { normalizeWorkPreparation } from "../src/utils/workPreparationApi.js";

const JOB_ID = "02c7ee78-daa7-4c10-b0c9-e76c8469629a";
const QUOTE_ID = "3377e972-f526-4fbf-8405-8d84b407dd1d";
const WORKSTREAM_ID = "c666edf9-cb5f-4f65-9599-c26778ed56d7";
const ACTIVITY_ID = "faf5a3dc-f1f7-441c-8717-faacf029516d";
const OLD_ACTIVITY_ID = "228bbbc7-1715-46ca-b0ce-e03858a649a1";
const PREPARATION_ID = "abe876dd-3ef8-48a9-b54a-f83490f6da12";
const NOW = "2026-08-29T03:00:00.000Z";
const HASH = `#workCenter?jobId=${JOB_ID}&quoteId=${QUOTE_ID}`;

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const dashboard = source("src/pages/ContractorDashboard.jsx");
const workPlanWorkspace = source("src/components/ProfessionalWorkPlanWorkspace.jsx");
const preparationWorkspace = source("src/components/ProfessionalWorkPreparationWorkspace.jsx");

function canonicalEntry(overrides = {}) {
  return {
    id: "canonical-request-19",
    source: CANONICAL_WORK_CENTER_AUTHORITY,
    readOnly: true,
    postId: 19,
    requestId: 19,
    relationshipId: 341,
    jobId: JOB_ID,
    ...overrides,
  };
}

function activity({ id, status, currentVersion, type }) {
  return {
    id,
    workstreamId: WORKSTREAM_ID,
    activityType: type,
    statement: type === "APPROVED_WORK_EXECUTION" ? "Perform approved work." : "Temporary repair.",
    status,
    customerVisible: true,
    currentVersion,
    performedAt: status === "DONE" ? NOW : null,
    createdAt: NOW,
    updatedAt: NOW,
    canStart: false,
    canUpdate: status === "IN_PROGRESS",
    canComplete: status === "IN_PROGRESS",
    updates: status === "DONE" ? [{
      version: 3,
      statement: "Temporary repair completed.",
      status: "DONE",
      customerVisible: true,
      recordedAt: NOW,
    }] : [{
      version: 2,
      statement: "Approved work started.",
      status: "IN_PROGRESS",
      customerVisible: true,
      recordedAt: NOW,
    }],
  };
}

function exactPlan(overrides = {}) {
  return {
    contractVersion: 1,
    jobId: JOB_ID,
    requestId: 19,
    relationshipId: 341,
    approvedQuotes: [{ id: QUOTE_ID, lineageType: "ORIGINAL_QUOTE" }],
    summary: {
      workItemCount: 2,
      completedCount: 1,
      remainingCount: 1,
      needsAttentionCount: 0,
      readyForCompletionReview: false,
    },
    workstreams: [{
      id: WORKSTREAM_ID,
      sequence: 1,
      title: "Approved cabinet repair",
      state: "OPEN",
      status: "IN_PROGRESS",
      currentVersion: 1,
      approvedQuoteIds: [QUOTE_ID],
      updatedAt: NOW,
      canAddWorkItem: true,
      canMarkComplete: false,
      activities: [
        activity({ id: ACTIVITY_ID, status: "IN_PROGRESS", currentVersion: 2, type: "APPROVED_WORK_EXECUTION" }),
        activity({ id: OLD_ACTIVITY_ID, status: "DONE", currentVersion: 3, type: "TEMPORARY_REPAIR" }),
      ],
      blockers: [],
    }],
    ...overrides,
  };
}

function exactPreparation(overrides = {}) {
  return {
    contractVersion: 1,
    exists: true,
    id: PREPARATION_ID,
    jobId: JOB_ID,
    relationshipId: 341,
    source: {
      approvedCustomerDecisionId: "2ffada9c-a047-4ef4-8c32-a0484a95f824",
      quoteId: QUOTE_ID,
      issuedQuoteVersion: 13,
    },
    currentVersion: 2,
    planningState: "PLANNED",
    workStartPolicy: "NONE",
    readiness: {
      planningState: "PLANNED",
      acquisitionState: "NOT_REQUIRED",
      preparationState: "NOT_STARTED",
      customerItemPending: false,
      workStartBlocked: false,
      requiredItemCount: 0,
      readyRequiredItemCount: 0,
      summary: "Planned",
    },
    deposit: { state: "NOT_REQUIRED", commitmentLocked: false },
    items: [],
    createdAt: NOW,
    updatedAt: NOW,
    internalNotes: null,
    purchaseSummary: { recordCount: 0, correctionCount: 0, internalCostMinor: 0, currency: "USD" },
    safeNextActions: ["REVISE_PLAN", "RECORD_PURCHASE", "RECORD_PREPARATION"],
    ...overrides,
  };
}

test("1. exact Work Center route selects the Job after asynchronous canonical hydration", () => {
  const route = parseProfessionalWorkCenterRoute(HASH);
  assert.equal(findCanonicalWorkCenterEntryByJobId([], route.jobId), null);
  assert.equal(findCanonicalWorkCenterEntryByJobId([canonicalEntry()], route.jobId).jobId, JOB_ID);
});

test("2. route is not marked applied before canonical hydration is ready", () => {
  const readyGate = dashboard.indexOf('canonicalWorkCenterHydration.status !== "ready"');
  const appliedWrite = dashboard.indexOf("appliedWorkCenterRouteRef.current = token");
  assert.ok(readyGate > -1 && appliedWrite > readyGate);
});

test("3. unauthorized or missing Job route fails closed", () => {
  assert.equal(findCanonicalWorkCenterEntryByJobId([canonicalEntry()], "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), null);
  assert.equal(findCanonicalWorkCenterEntryByJobId([{ ...canonicalEntry(), source: "LEGACY" }], JOB_ID), null);
  const missingBranch = dashboard.slice(
    dashboard.indexOf("if (!exactJob)"),
    dashboard.indexOf("appliedWorkCenterRouteRef.current = token")
  );
  assert.match(missingBranch, /setSelectedWorkCenterJob\(null\)/);
  assert.match(missingBranch, /setSelectedWorkCenterQuoteId\(""\)/);
});

test("4. exact quote context is retained when route selection applies", () => {
  assert.deepEqual(parseProfessionalWorkCenterRoute(HASH), { jobId: JOB_ID, quoteId: QUOTE_ID });
  assert.match(dashboard, /setSelectedWorkCenterQuoteId\(target\.quoteId\)/);
});

test("5. hard refresh deterministically parses and resynchronizes the same Job", () => {
  assert.deepEqual(parseProfessionalWorkCenterRoute(HASH), parseProfessionalWorkCenterRoute(HASH));
  assert.match(dashboard, /addEventListener\("hashchange", syncWorkCenterRoute\)/);
  assert.match(dashboard, /syncWorkCenterRoute\(\);/);
});

test("6. professional-wide summary cannot replace the exact selected Job read", () => {
  assert.match(dashboard, /fetchProfessionalWorkPlanSummary/);
  assert.match(workPlanWorkspace, /fetchProfessionalJobWorkPlan\(\{ jobId, setPage \}\)/);
  assert.doesNotMatch(workPlanWorkspace, /fetchProfessionalWorkPlanSummary/);
});

test("7. exact Job Work Plan preserves the canonical Workstream", () => {
  const plan = validateProfessionalWorkPlan(exactPlan(), { jobId: JOB_ID });
  assert.equal(plan.workstreams.length, 1);
  assert.equal(plan.workstreams[0].id, WORKSTREAM_ID);
  assert.equal(plan.workstreams[0].state, "OPEN");
});

test("8. IN_PROGRESS v2 execution Activity remains renderable", () => {
  const plan = validateProfessionalWorkPlan(exactPlan(), { jobId: JOB_ID });
  const item = plan.workstreams[0].activities.find(({ id }) => id === ACTIVITY_ID);
  assert.deepEqual([item.status, item.currentVersion], ["IN_PROGRESS", 2]);
  assert.match(workPlanWorkspace, /data-work-item-status=\{activity\.status\}/);
});

test("9. old DONE v3 Activity remains renderable", () => {
  const plan = validateProfessionalWorkPlan(exactPlan(), { jobId: JOB_ID });
  const item = plan.workstreams[0].activities.find(({ id }) => id === OLD_ACTIVITY_ID);
  assert.deepEqual([item.status, item.currentVersion], ["DONE", 3]);
});

test("10. zero-work empty state is absent when the canonical Workstream exists", () => {
  const plan = validateProfessionalWorkPlan(exactPlan(), { jobId: JOB_ID });
  assert.equal(plan.workstreams.length === 0, false);
  assert.match(workPlanWorkspace, /plan\.workstreams\.length === 0/);
});

test("11. exact Work Preparation v2 remains version 2", () => {
  const plan = normalizeWorkPreparation(exactPreparation(), { jobId: JOB_ID });
  assert.equal(plan.currentVersion, 2);
  assert.equal(plan.planningState, "PLANNED");
  assert.equal(plan.workStartPolicy, "NONE");
  assert.equal(plan.items.length, 0);
  assert.match(preparationWorkspace, /copy\.version\} \{plan\.currentVersion\}/);
});

test("12. Job change triggers exact Work Plan refetch", () => {
  assert.match(workPlanWorkspace, /\[canonicalRecord, jobId, preferredQuoteId, refreshKey, setPage\]/);
});

test("13. Job change triggers exact Work Preparation refetch", () => {
  assert.match(preparationWorkspace, /\[jobId, refreshKey, setPage\]/);
});

test("14. stale prior Job responses cannot overwrite the new Job state", () => {
  for (const workspace of [workPlanWorkspace, preparationWorkspace]) {
    assert.match(workspace, /let active = true/);
    assert.match(workspace, /if \(active\) setState/);
    assert.match(workspace, /active = false/);
  }
});

test("15. malformed exact Job response still fails closed", () => {
  assert.equal(validateProfessionalWorkPlan({ ...exactPlan(), browserOverride: true }, { jobId: JOB_ID }), null);
  assert.equal(normalizeWorkPreparation({ ...exactPreparation(), browserOverride: true }, { jobId: JOB_ID }), null);
});

test("16. Current Jobs behavior without a route remains unchanged", () => {
  assert.equal(parseProfessionalWorkCenterRoute("#workCenter"), null);
  assert.match(dashboard, /setSelectedWorkCenterJob\(job\)/);
});

test("17. public-route correction remains intact", () => {
  assert.equal(shouldRenderPublicSite({ pathname: "/", hash: HASH, native: false }), false);
  assert.equal(shouldRenderPublicSite({ pathname: "/", hash: "#why", native: false }), true);
});

test("18. mounting exact read workspaces issues no business command", () => {
  const planMount = workPlanWorkspace.slice(
    workPlanWorkspace.indexOf("useEffect(() =>"),
    workPlanWorkspace.indexOf("const runCommand")
  );
  const preparationMount = preparationWorkspace.slice(
    preparationWorkspace.indexOf("useEffect(() =>"),
    preparationWorkspace.indexOf("const keyFor")
  );
  assert.match(planMount, /fetchProfessionalJobWorkPlan/);
  assert.match(preparationMount, /fetchWorkPreparation/);
  assert.doesNotMatch(planMount, /progressWorkItem|completeWorkArea|createWorkItem|updateWorkItem/);
  assert.doesNotMatch(preparationMount, /materializeWorkPreparation|reviseWorkPreparation|recordWorkPreparation/);
});

test("active-work live state accepts explicit null deposit without weakening object validation", () => {
  const liveJob = {
    contractVersion: 1,
    jobId: JOB_ID,
    requestId: 19,
    relationshipId: 341,
    stage: { code: "WORK_IN_PROGRESS", label: "Work in progress" },
    responsibility: { code: "PROFESSIONAL", label: "Professional" },
    blocker: null,
    nextAction: {
      code: "REVIEW_ACTIVE_WORK",
      label: "Review active work",
      description: "Review the current work record and continue the authorized activity.",
    },
    availableActions: [
      { code: "VIEW_CONCERN", label: "View customer concern" },
      { code: "MESSAGE_CUSTOMER", label: "Message customer" },
      { code: "REVIEW_ACTIVE_WORK", label: "Review active work" },
      { code: "CONTINUE_ACTIVE_WORK", label: "Continue active work" },
    ],
    reasonCodes: ["ACTIVE_WORK_PRESENT"],
    deposit: null,
    freshness: {
      derivedAt: NOW,
      jobCreatedAt: NOW,
      evaluationVersion: 1,
      findingVersion: 2,
      recommendationVersion: 1,
      quoteVersion: 13,
      workstreamVersion: 1,
      activityVersion: 3,
      obligationVersion: 0,
      approvedWorkExecutionVersion: 0,
      depositVersion: 0,
      invoiceVersion: 0,
      evaluationCount: 1,
      findingCount: 1,
      recommendationCount: 4,
      quoteCount: 2,
      workstreamCount: 1,
      activityCount: 2,
      obligationCount: 0,
    },
  };
  assert.equal(normalizeCanonicalLiveJobProjection({ success: true, liveJob }).stage.code, "WORK_IN_PROGRESS");
  assert.equal(normalizeCanonicalLiveJobProjection({ success: true, liveJob: { ...liveJob, deposit: {} } }), null);
});
