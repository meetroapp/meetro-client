import assert from "node:assert/strict";
import test from "node:test";

import {
  completeWorkArea,
  createWorkItem,
  createWorkPlanIdempotencyKey,
  fetchCustomerJobWorkPlan,
  fetchProfessionalJobWorkPlan,
  fetchProfessionalWorkPlanSummary,
  progressWorkItem,
  updateWorkItem,
  validateCustomerWorkPlan,
  validateProfessionalWorkPlan,
  validateProfessionalWorkPlanSummary,
} from "../src/utils/workPlanApi.js";

const IDS = Object.freeze({
  job: "11111111-1111-4111-8111-111111111111",
  workstream: "22222222-2222-4222-8222-222222222222",
  activity: "33333333-3333-4333-8333-333333333333",
  obligation: "44444444-4444-4444-8444-444444444444",
  quote: "55555555-5555-4555-8555-555555555555",
  participant: "66666666-6666-4666-8666-666666666666",
});
const NOW = "2026-08-15T15:00:00.000Z";

function professionalPlan(overrides = {}) {
  return {
    contractVersion: 1,
    jobId: IDS.job,
    requestId: 14,
    relationshipId: 340,
    approvedQuotes: [{ id: IDS.quote, lineageType: "ORIGINAL_QUOTE" }],
    summary: {
      workItemCount: 1,
      completedCount: 0,
      remainingCount: 1,
      needsAttentionCount: 1,
      readyForCompletionReview: false,
    },
    workstreams: [{
      id: IDS.workstream,
      sequence: 1,
      title: "Replace disposal",
      state: "ACTIVE",
      status: "NEEDS_ATTENTION",
      currentVersion: 1,
      approvedQuoteIds: [IDS.quote],
      updatedAt: NOW,
      canAddWorkItem: true,
      canMarkComplete: false,
      activities: [{
        id: IDS.activity,
        workstreamId: IDS.workstream,
        activityType: "WORK_ITEM",
        statement: "Install the approved replacement.",
        status: "IN_PROGRESS",
        customerVisible: true,
        currentVersion: 3,
        performedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
        canStart: false,
        canUpdate: true,
        canComplete: true,
        updates: [{
          version: 3,
          statement: "Installation is underway.",
          status: "IN_PROGRESS",
          customerVisible: true,
          recordedAt: NOW,
        }],
      }],
      blockers: [{
        id: IDS.obligation,
        statement: "Customer access is required.",
        status: "NEEDS_ATTENTION",
      }],
    }],
    ...overrides,
  };
}

function customerPlan(overrides = {}) {
  return {
    contractVersion: 1,
    jobId: IDS.job,
    requestId: 14,
    relationshipId: 340,
    summary: {
      workAreaCount: 1,
      completedCount: 0,
      remainingCount: 1,
      readyForCompletionReview: false,
    },
    workstreams: [{
      id: IDS.workstream,
      title: "Replace disposal",
      status: "IN_PROGRESS",
      activities: [{
        id: IDS.activity,
        statement: "Installation is underway.",
        status: "IN_PROGRESS",
        performedAt: null,
        updatedAt: NOW,
      }],
      updates: [{
        activityId: IDS.activity,
        statement: "Installation is underway.",
        status: "IN_PROGRESS",
        recordedAt: NOW,
      }],
    }],
    ...overrides,
  };
}

function summary() {
  return {
    contractVersion: 1,
    jobCount: 1,
    workItemCount: 1,
    completedCount: 0,
    remainingCount: 1,
    needsAttentionCount: 0,
    jobs: [{
      jobId: IDS.job,
      requestId: 14,
      relationshipId: 340,
      title: "Kitchen repair",
      customerName: "Liam",
      workstreamCount: 1,
      workItemCount: 1,
      completedCount: 0,
      remainingCount: 1,
      needsAttentionCount: 0,
      readyForCompletionReview: false,
    }],
  };
}

function activity(status = "IN_PROGRESS", version = 3) {
  return {
    id: IDS.activity,
    workstreamId: IDS.workstream,
    jobId: IDS.job,
    actorParticipantId: IDS.participant,
    activityType: "WORK_ITEM",
    statement: "Installation is underway.",
    status,
    temporaryIntervention: false,
    temporaryDetails: null,
    customerVisible: true,
    performedAt: status === "DONE" ? NOW : null,
    currentVersion: version,
    createdAt: NOW,
    versionCreatedAt: NOW,
  };
}

function workstream() {
  return {
    id: IDS.workstream,
    jobId: IDS.job,
    sequence: 1,
    title: "Replace disposal",
    state: "COMPLETED",
    currentVersion: 2,
    createdByParticipantId: IDS.participant,
    createdAt: NOW,
    versionCreatedAt: NOW,
  };
}

function installBrowser(responses) {
  const calls = [];
  const prior = {
    fetch: globalThis.fetch,
    localStorage: globalThis.localStorage,
    window: globalThis.window,
  };
  globalThis.localStorage = {
    getItem(key) { return key === "token" ? "test-token" : null; },
    setItem() { throw new Error("Work Plan attempted browser-local authority"); },
    removeItem() {},
  };
  globalThis.window = { dispatchEvent() {}, location: { hash: "" } };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const next = responses.shift();
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      async json() { return next.body; },
    };
  };
  return {
    calls,
    restore() { Object.assign(globalThis, prior); },
  };
}

test("professional and customer Work Plan validators are exact and privacy-safe", () => {
  assert.equal(validateProfessionalWorkPlan(professionalPlan(), { jobId: IDS.job }).jobId, IDS.job);
  assert.equal(validateCustomerWorkPlan(customerPlan(), { jobId: IDS.job }).jobId, IDS.job);
  assert.equal(validateProfessionalWorkPlanSummary(summary()).jobCount, 1);
  assert.equal(
    validateCustomerWorkPlan({ ...customerPlan(), internalCosts: [12500] }, { jobId: IDS.job }),
    null
  );
  assert.equal(
    validateCustomerWorkPlan({
      ...customerPlan(),
      workstreams: [{ ...customerPlan().workstreams[0], blockers: [] }],
    }, { jobId: IDS.job }),
    null
  );
  assert.equal(
    validateProfessionalWorkPlan({
      ...professionalPlan(),
      workstreams: [{ ...professionalPlan().workstreams[0], browserComplete: true }],
    }, { jobId: IDS.job }),
    null
  );
  assert.equal(
    validateProfessionalWorkPlan({
      ...professionalPlan(),
      workstreams: [{
        ...professionalPlan().workstreams[0],
        activities: [{
          ...professionalPlan().workstreams[0].activities[0],
          workstreamId: "77777777-7777-4777-8777-777777777777",
        }],
      }],
    }, { jobId: IDS.job }),
    null
  );
});

test("Work Plan reads use three bounded canonical endpoints without browser fallback", async () => {
  const browser = installBrowser([
    { status: 200, body: { success: true, workPlanSummary: summary() } },
    { status: 200, body: { success: true, workPlan: professionalPlan() } },
    { status: 200, body: { success: true, workPlan: customerPlan() } },
  ]);
  try {
    await fetchProfessionalWorkPlanSummary();
    await fetchProfessionalJobWorkPlan({ jobId: IDS.job });
    await fetchCustomerJobWorkPlan({ jobId: IDS.job });
    assert.deepEqual(
      browser.calls.map(({ url, options }) => [options.method, url]),
      [
        ["GET", "https://athletic-rebirth-staging.up.railway.app/professional/work-plan"],
        ["GET", `https://athletic-rebirth-staging.up.railway.app/professional/jobs/${IDS.job}/work-plan`],
        ["GET", `https://athletic-rebirth-staging.up.railway.app/customer/jobs/${IDS.job}/work-plan`],
      ]
    );
    assert.ok(browser.calls.every(({ options }) => options.cache === "no-store"));
  } finally {
    browser.restore();
  }
});

test("Work Plan commands preserve exact identity, versions, and idempotency headers", async () => {
  const browser = installBrowser([
    { status: 201, body: { success: true, activity: activity("PLANNED", 1) } },
    { status: 200, body: { success: true, activity: activity("IN_PROGRESS", 2) } },
    { status: 200, body: { success: true, activity: activity("IN_PROGRESS", 3) } },
    { status: 200, body: { success: true, activity: activity("DONE", 4) } },
    { status: 200, body: { success: true, workstream: workstream() } },
  ]);
  try {
    const keys = ["create", "start", "update", "complete-item", "complete-area"];
    await createWorkItem({
      jobId: IDS.job,
      workstreamId: IDS.workstream,
      statement: "Install the approved replacement.",
      customerVisible: false,
      idempotencyKey: keys[0],
    });
    await progressWorkItem({
      jobId: IDS.job,
      workstreamId: IDS.workstream,
      activityId: IDS.activity,
      expectedVersion: 1,
      targetStatus: "IN_PROGRESS",
      idempotencyKey: keys[1],
    });
    await updateWorkItem({
      jobId: IDS.job,
      workstreamId: IDS.workstream,
      activityId: IDS.activity,
      expectedVersion: 2,
      statement: "Installation is underway.",
      customerVisible: true,
      idempotencyKey: keys[2],
    });
    await progressWorkItem({
      jobId: IDS.job,
      workstreamId: IDS.workstream,
      activityId: IDS.activity,
      expectedVersion: 3,
      targetStatus: "DONE",
      idempotencyKey: keys[3],
    });
    await completeWorkArea({
      jobId: IDS.job,
      workstreamId: IDS.workstream,
      expectedVersion: 1,
      idempotencyKey: keys[4],
    });

    assert.deepEqual(
      browser.calls.map(({ options }) => options.headers["Idempotency-Key"]),
      keys
    );
    assert.deepEqual(JSON.parse(browser.calls[0].options.body), {
      activityType: "WORK_ITEM",
      statement: "Install the approved replacement.",
      customerVisible: false,
    });
    assert.deepEqual(JSON.parse(browser.calls[2].options.body), {
      expectedVersion: 2,
      statement: "Installation is underway.",
      customerVisible: true,
    });
    assert.match(browser.calls[2].url, new RegExp(`${IDS.activity}/update$`));
    assert.match(browser.calls[4].url, /completion$/);
  } finally {
    browser.restore();
  }
});

test("Work Plan commands reject malformed and cross-identity authority", async () => {
  const browser = installBrowser([
    {
      status: 200,
      body: {
        success: true,
        activity: { ...activity("IN_PROGRESS", 2), jobId: IDS.quote },
      },
    },
  ]);
  try {
    await assert.rejects(
      createWorkItem({
        jobId: "not-a-job",
        workstreamId: IDS.workstream,
        statement: "Install the approved replacement.",
        idempotencyKey: "invalid",
      }),
      (error) => error.code === "INVALID_WORK_ITEM_CREATE"
    );
    assert.equal(browser.calls.length, 0);

    await assert.rejects(
      progressWorkItem({
        jobId: IDS.job,
        workstreamId: IDS.workstream,
        activityId: IDS.activity,
        expectedVersion: 1,
        targetStatus: "IN_PROGRESS",
        idempotencyKey: "cross-identity",
      }),
      (error) => error.code === "UNSAFE_WORK_PLAN_COMMAND_RESPONSE"
    );
    assert.equal(browser.calls.length, 1);
  } finally {
    browser.restore();
  }
});

test("stale Work Plan versions preserve the canonical server denial", async () => {
  const browser = installBrowser([{
    status: 409,
    body: {
      success: false,
      code: "STALE_WORK_ACTIVITY_VERSION",
      message: "Refresh the Work Plan and try again.",
    },
  }]);
  try {
    await assert.rejects(
      updateWorkItem({
        jobId: IDS.job,
        workstreamId: IDS.workstream,
        activityId: IDS.activity,
        expectedVersion: 1,
        statement: "Installation is underway.",
        customerVisible: true,
        idempotencyKey: "stale-update",
      }),
      (error) =>
        error.status === 409 &&
        error.code === "STALE_WORK_ACTIVITY_VERSION" &&
        /Refresh the Work Plan/.test(error.message)
    );
  } finally {
    browser.restore();
  }
});

test("Work Plan idempotency keys require a governed random identity", () => {
  assert.equal(
    createWorkPlanIdempotencyKey("start", { randomUUID: () => IDS.job }),
    `work-plan-start-${IDS.job}`
  );
  assert.throws(() => createWorkPlanIdempotencyKey("start", {}), /temporarily unavailable/i);
});
