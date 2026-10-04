import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getCanonicalOperationalJobContext,
  validateCanonicalActivities,
  validateCanonicalActivityProjection,
  validateCanonicalCompletionEligibility,
  validateCanonicalObligationProjection,
  validateCanonicalObligations,
  validateCanonicalWorkstreamProjection,
  validateCanonicalWorkstreams,
} from "../src/utils/canonicalOperationalRead.js";
import {
  CanonicalOperationalReadError,
  getCanonicalWorkstreamCompletionEligibility,
  listCanonicalActivitiesForWorkstream,
  listCanonicalObligationsForWorkstream,
  listCanonicalWorkstreamsForJob,
} from "../src/utils/operationalReadApi.js";
import {
  loadCanonicalActivitiesForWorkstream,
  loadCanonicalObligationsForWorkstream,
  loadCanonicalWorkstreamCompletionEligibility,
  loadCanonicalWorkstreamsForRecord,
} from "../src/utils/operationalReadController.js";

const ids = Object.freeze({
  job: "11111111-1111-4111-8111-111111111111",
  disposal: "22222222-2222-4222-8222-222222222222",
  lighting: "33333333-3333-4333-8333-333333333333",
  participant: "44444444-4444-4444-8444-444444444444",
  drainActivity: "55555555-5555-4555-8555-555555555555",
  temporaryActivity: "66666666-6666-4666-8666-666666666666",
  openObligation: "77777777-7777-4777-8777-777777777777",
  satisfiedObligation: "88888888-8888-4888-8888-888888888888",
  finding: "99999999-9999-4999-8999-999999999999",
});

const createdAt = "2026-08-11T17:00:00.000Z";
const performedAt = "2026-08-11T17:30:00.000Z";

function canonicalRecord(overrides = {}) {
  return {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    lifecycleVerified: true,
    lifecycleContractVersion: 2,
    jobId: ids.job,
    ...overrides,
  };
}

function workstreamFixture(overrides = {}) {
  return {
    id: ids.disposal,
    jobId: ids.job,
    sequence: 1,
    title: "Disposal",
    state: "ACTIVE",
    currentVersion: 1,
    createdByParticipantId: ids.participant,
    createdAt,
    versionCreatedAt: createdAt,
    ...overrides,
  };
}

function activityFixture(overrides = {}) {
  return {
    id: ids.drainActivity,
    workstreamId: ids.disposal,
    jobId: ids.job,
    actorParticipantId: ids.participant,
    activityType: "DRAIN_CORRECTION",
    statement: "Corrected the drain connection.",
    status: "DONE",
    temporaryIntervention: false,
    temporaryDetails: null,
    customerVisible: false,
    performedAt,
    currentVersion: 2,
    createdAt,
    versionCreatedAt: performedAt,
    ...overrides,
  };
}

function obligationFixture(overrides = {}) {
  return {
    id: ids.openObligation,
    workstreamId: ids.disposal,
    jobId: ids.job,
    sequence: 1,
    sourceFindingId: ids.finding,
    statement: "Replace the defective disposal.",
    status: "OPEN",
    currentVersion: 1,
    createdByParticipantId: ids.participant,
    createdAt,
    versionCreatedAt: createdAt,
    ...overrides,
  };
}

function eligibilityFixture(overrides = {}) {
  return {
    eligible: false,
    reasons: ["OPEN_FINDING", "OPEN_OBLIGATION"],
    workstreamId: ids.disposal,
    jobId: ids.job,
    workstreamState: "ACTIVE",
    workstreamVersion: 1,
    blockers: {
      openFindings: 1,
      partialFindings: 0,
      openObligations: 1,
      activeActivities: 0,
    },
    deferredScope: { findings: 0, obligations: 0 },
    ...overrides,
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
    getItem(key) {
      return key === "token" ? "test-token" : null;
    },
    setItem() {
      throw new Error("canonical operational read attempted browser-local authority");
    },
    removeItem() {},
  };
  globalThis.window = { dispatchEvent() {}, location: { hash: "" } };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const next = responses.shift();
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      async json() {
        return next.body;
      },
    };
  };
  return {
    calls,
    restore() {
      Object.assign(globalThis, prior);
    },
  };
}

test("only a verified read-only lifecycle-v2 Job opens the canonical operational chain", async () => {
  assert.deepEqual(getCanonicalOperationalJobContext(canonicalRecord()), {
    authoritySource: "CANONICAL_BACKEND_READ",
    lifecycleContractVersion: 2,
    readOnly: true,
    jobId: ids.job,
  });

  const browser = installBrowser([]);
  try {
    assert.equal(
      await loadCanonicalWorkstreamsForRecord({
        record: canonicalRecord({ source: "browser-local", activeWorkSnapshot: {} }),
      }),
      null
    );
    assert.equal(
      await loadCanonicalWorkstreamsForRecord({
        record: canonicalRecord({
          jobId: null,
          job: { id: ids.job },
          activeJobSnapshot: { id: ids.job },
        }),
      }),
      null
    );
    assert.equal(
      await loadCanonicalWorkstreamsForRecord({
        record: canonicalRecord({ emergencyRequestId: 41, jobId: null }),
      }),
      null
    );
    assert.equal(browser.calls.length, 0);
  } finally {
    browser.restore();
  }
});

test("multiple canonical Workstreams preserve independent state and reject extra local truth", () => {
  const workstreams = validateCanonicalWorkstreams(
    [
      workstreamFixture(),
      workstreamFixture({
        id: ids.lighting,
        sequence: 2,
        title: "Lighting",
        state: "COMPLETED",
      }),
    ],
    { jobId: ids.job }
  );
  assert.equal(workstreams.length, 2);
  assert.equal(workstreams[0].state, "ACTIVE");
  assert.equal(workstreams[1].state, "COMPLETED");
  assert.equal(Object.hasOwn(workstreams[1], "jobState"), false);
  assert.equal(
    validateCanonicalWorkstreamProjection({
      ...workstreamFixture(),
      findingAssignments: [ids.finding],
    }),
    null
  );
  assert.equal(validateCanonicalWorkstreamProjection({ id: "active-work-local" }), null);
});

test("Activities preserve ordinary DONE and temporary intervention without resolving Findings", () => {
  const temporary = activityFixture({
    id: ids.temporaryActivity,
    activityType: "TEMPORARY_RESTORATION",
    statement: "Restored temporary disposal operation.",
    temporaryIntervention: true,
    temporaryDetails: "Temporary operation only; replacement remains required.",
  });
  const activities = validateCanonicalActivities(
    [activityFixture(), temporary],
    { jobId: ids.job, workstreamId: ids.disposal }
  );
  assert.equal(activities[0].status, "DONE");
  assert.equal(activities[1].temporaryIntervention, true);
  assert.match(activities[1].temporaryDetails, /replacement remains required/);
  assert.equal(Object.hasOwn(activities[0], "findingResolutionState"), false);
  assert.equal(
    validateCanonicalActivityProjection({
      ...temporary,
      temporaryDetails: null,
    }),
    null
  );
});

test("Obligations preserve OPEN and SATISFIED as lifecycle states without payment truth", () => {
  const obligations = validateCanonicalObligations(
    [
      obligationFixture(),
      obligationFixture({
        id: ids.satisfiedObligation,
        sequence: 2,
        sourceFindingId: null,
        statement: "Dispose of removed materials.",
        status: "SATISFIED",
        currentVersion: 2,
        versionCreatedAt: performedAt,
      }),
    ],
    { jobId: ids.job, workstreamId: ids.disposal }
  );
  assert.equal(obligations[0].status, "OPEN");
  assert.equal(obligations[0].sourceFindingId, ids.finding);
  assert.equal(obligations[1].status, "SATISFIED");
  assert.equal(Object.hasOwn(obligations[1], "paymentReceived"), false);
  assert.equal(validateCanonicalObligationProjection({ id: "local-obligation" }), null);
});

test("operational APIs use only the exact canonical GET routes", async () => {
  const workstream = workstreamFixture();
  const browser = installBrowser([
    { status: 200, body: { success: true, workstreams: [workstream] } },
    { status: 200, body: { success: true, activities: [activityFixture()] } },
    { status: 200, body: { success: true, obligations: [obligationFixture()] } },
    { status: 200, body: { success: true, eligibility: eligibilityFixture() } },
  ]);
  try {
    await listCanonicalWorkstreamsForJob({ jobId: ids.job });
    await listCanonicalActivitiesForWorkstream({
      jobId: ids.job,
      workstreamId: ids.disposal,
    });
    await listCanonicalObligationsForWorkstream({
      jobId: ids.job,
      workstreamId: ids.disposal,
    });
    const eligibility = await getCanonicalWorkstreamCompletionEligibility({
      jobId: ids.job,
      workstream,
    });
    assert.equal(eligibility.eligible, false);
    assert.deepEqual(eligibility.reasons, ["OPEN_FINDING", "OPEN_OBLIGATION"]);
    assert.deepEqual(
      browser.calls.map((call) => [call.options.method, call.url]),
      [
        ["GET", `https://athletic-rebirth-staging.up.railway.app/jobs/${ids.job}/workstreams`],
        ["GET", `https://athletic-rebirth-staging.up.railway.app/jobs/${ids.job}/workstreams/${ids.disposal}/activities`],
        ["GET", `https://athletic-rebirth-staging.up.railway.app/jobs/${ids.job}/workstreams/${ids.disposal}/obligations`],
        ["GET", `https://athletic-rebirth-staging.up.railway.app/jobs/${ids.job}/workstreams/${ids.disposal}/completion-eligibility`],
      ]
    );
    assert.ok(browser.calls.every((call) => call.options.body === undefined));
  } finally {
    browser.restore();
  }
});

test("child reads stay scoped to their canonical parent Workstream", async () => {
  const browser = installBrowser([
    { status: 200, body: { success: true, activities: [activityFixture()] } },
    { status: 200, body: { success: true, obligations: [obligationFixture()] } },
    { status: 200, body: { success: true, eligibility: eligibilityFixture() } },
  ]);
  try {
    const workstream = workstreamFixture();
    assert.equal(
      (await loadCanonicalActivitiesForWorkstream({
        record: canonicalRecord(),
        workstream,
      })).length,
      1
    );
    assert.equal(
      (await loadCanonicalObligationsForWorkstream({
        record: canonicalRecord(),
        workstream,
      })).length,
      1
    );
    assert.equal(
      (await loadCanonicalWorkstreamCompletionEligibility({
        record: canonicalRecord(),
        workstream,
      })).eligible,
      false
    );
    assert.equal(
      await loadCanonicalActivitiesForWorkstream({
        record: canonicalRecord(),
        workstream: workstreamFixture({ jobId: ids.lighting }),
      }),
      null
    );
    assert.equal(browser.calls.length, 3);
  } finally {
    browser.restore();
  }
});

test("401, 403, and 404 fail closed while Activity and Obligation failures stay isolated", async () => {
  for (const status of [401, 403, 404]) {
    const browser = installBrowser([
      {
        status,
        body: {
          success: false,
          code: status === 403 ? "WORKFLOW_AUTHORITY_REQUIRED" : "WORKSTREAM_UNAVAILABLE",
          message: "Canonical operational read unavailable.",
        },
      },
    ]);
    try {
      await assert.rejects(
        listCanonicalWorkstreamsForJob({ jobId: ids.job }),
        (error) =>
          error instanceof CanonicalOperationalReadError && error.status === status
      );
    } finally {
      browser.restore();
    }
  }

  const browser = installBrowser([
    {
      status: 503,
      body: { success: false, code: "ACTIVITY_READ_FAILED", message: "Unavailable." },
    },
    { status: 200, body: { success: true, obligations: [obligationFixture()] } },
  ]);
  try {
    await assert.rejects(
      listCanonicalActivitiesForWorkstream({
        jobId: ids.job,
        workstreamId: ids.disposal,
      }),
      (error) => error.status === 503
    );
    const obligations = await listCanonicalObligationsForWorkstream({
      jobId: ids.job,
      workstreamId: ids.disposal,
    });
    assert.equal(obligations.length, 1);
  } finally {
    browser.restore();
  }
});

test("server-derived eligibility is validated without collapsing lifecycle states", () => {
  const workstream = workstreamFixture();
  const eligibility = validateCanonicalCompletionEligibility(eligibilityFixture(), {
    jobId: ids.job,
    workstream,
  });
  assert.equal(eligibility.eligible, false);
  assert.equal(eligibility.blockers.openFindings, 1);
  assert.equal(eligibility.blockers.openObligations, 1);
  assert.equal(workstream.state, "ACTIVE");
  assert.equal(Object.hasOwn(eligibility, "jobCompleted"), false);
  assert.equal(
    validateCanonicalCompletionEligibility(
      eligibilityFixture({ workstreamState: "COMPLETED" }),
      { jobId: ids.job, workstream }
    ),
    null
  );
});

test("legacy operational panels remain read-only while Work Plan owns execution", () => {
  const files = [
    "../src/components/CanonicalWorkstreamsPanel.jsx",
    "../src/components/CanonicalWorkstreamCard.jsx",
    "../src/components/CanonicalActivitiesPanel.jsx",
    "../src/components/CanonicalObligationsPanel.jsx",
    "../src/utils/operationalReadApi.js",
    "../src/utils/operationalReadController.js",
  ];
  const source = files
    .map((file) => readFileSync(new URL(file, import.meta.url), "utf8"))
    .join("\n");
  const dashboard = readFileSync(
    new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /Work Plan/);
  assert.match(source, /No work items added yet/);
  assert.match(source, /Work Item \{workstream\.sequence\}/);
  assert.match(source, /No activities recorded/);
  assert.match(source, /No obligations recorded/);
  assert.match(source, /Temporary intervention/);
  assert.match(source, /Permanent correction and Finding resolution remain separate/);
  assert.match(source, /Lifecycle status only\. Not payment status/);
  assert.match(source, /Server-derived completion eligibility/);
  assert.match(dashboard, /ProfessionalWorkPlanWorkspace/);
  assert.doesNotMatch(dashboard, /CanonicalWorkstreamsPanel/);
  assert.doesNotMatch(
    source,
    /localStorage|sessionStorage|method:\s*"(?:POST|PATCH|PUT|DELETE)"|Idempotency-Key|assignFindingToWorkstream|createWorkActivity|progressWorkActivity|createWorkObligation|transitionWorkObligation|resolveFinding|completeWorkstream|createQuote|scheduleWork|completeJob|Job Update|Change Order/
  );
  assert.doesNotMatch(source, /athletic-rebirth-production/);
  assert.doesNotMatch(source, /<button/);
});
