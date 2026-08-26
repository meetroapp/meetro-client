import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CanonicalVisitError,
  activateCanonicalVisitAuthority,
  fetchCanonicalVisitAuthority,
  fetchCanonicalVisitDetail,
  fetchCanonicalVisits,
  normalizeCanonicalVisit,
  normalizeCanonicalVisitAuthority,
  runCanonicalVisitCommand,
} from "../src/utils/canonicalVisitProjection.js";
import { loadCanonicalVisitWorkspace } from "../src/utils/canonicalVisitController.js";

const ids = Object.freeze({
  job: "11111111-1111-4111-8111-111111111111",
  evaluation: "22222222-2222-4222-8222-222222222222",
  quote: "33333333-3333-4333-8333-333333333333",
  decision: "44444444-4444-4444-8444-444444444444",
  visit: "55555555-5555-4555-8555-555555555555",
  professional: "66666666-6666-4666-8666-666666666666",
  customer: "77777777-7777-4777-8777-777777777777",
  event: "88888888-8888-4888-8888-888888888888",
});

const startAt = "2026-08-14T14:00:00.000Z";
const endAt = "2026-08-14T15:00:00.000Z";
const createdAt = "2026-08-13T14:00:00.000Z";

const professionalCapabilities = [
  "visit.read",
  "visit.propose",
  "visit.reschedule",
  "visit.cancel",
  "visit.complete",
];
const customerCapabilities = [
  "visit.read",
  "visit.confirm",
  "visit.change_request",
];

function evaluationAuthority(overrides = {}) {
  return {
    authoritySource: "CANONICAL_EVALUATION_VISIT_AUTHORITY",
    jobId: ids.job,
    evaluationId: ids.evaluation,
    purpose: "EVALUATION",
    state: "AVAILABLE",
    activatedAt: null,
    customerCapabilities: [],
    professionalCapabilities: [],
    actions: {
      canActivate: true,
      canProposeEvaluationVisit: false,
    },
    ...overrides,
  };
}

function approvedAuthority(overrides = {}) {
  return {
    authoritySource: "CANONICAL_APPROVED_WORK_VISIT_AUTHORITY",
    jobId: ids.job,
    quoteId: ids.quote,
    approvedQuoteDecisionId: ids.decision,
    issuedQuoteVersion: 2,
    purpose: "APPROVED_WORK",
    state: "ACTIVE",
    activatedAt: createdAt,
    customerCapabilities,
    professionalCapabilities,
    actions: {
      canActivate: false,
      canProposeApprovedWorkVisit: true,
    },
    ...overrides,
  };
}

function visit(overrides = {}) {
  return {
    id: ids.visit,
    jobId: ids.job,
    purpose: "EVALUATION",
    state: "PROPOSED",
    currentVersion: 1,
    scheduledStartAt: startAt,
    scheduledEndAt: endAt,
    timeZone: "America/New_York",
    locationMode: "JOB_SERVICE_LOCATION",
    cancellationReason: null,
    cancelledAt: null,
    completedAt: null,
    evaluationId: ids.evaluation,
    workstreamIds: [],
    approvedQuoteDecisionEvidence: null,
    createdByParticipantId: ids.professional,
    recordedByParticipantId: ids.professional,
    createdAt,
    versionCreatedAt: createdAt,
    actions: {
      canConfirm: false,
      canRequestChange: false,
      canReschedule: false,
      canCancel: true,
      canComplete: false,
    },
    sentinelDatabaseField: "must-not-project",
    ...overrides,
  };
}

function history(currentVisit = visit()) {
  return {
    versions: [
      {
        version: currentVisit.currentVersion,
        state: currentVisit.state,
        scheduledStartAt: currentVisit.scheduledStartAt,
        scheduledEndAt: currentVisit.scheduledEndAt,
        timeZone: currentVisit.timeZone,
        locationMode: currentVisit.locationMode,
        cancellationReason: currentVisit.cancellationReason,
        cancelledAt: currentVisit.cancelledAt,
        completedAt: currentVisit.completedAt,
        recordedByParticipantId: ids.professional,
        createdAt,
      },
    ],
    events: [
      {
        id: ids.event,
        type: "VISIT_PROPOSED",
        visitVersion: 1,
        previousVisitVersion: null,
        visitState: "PROPOSED",
        reason: null,
        recordedByParticipantId: ids.professional,
        createdAt,
      },
    ],
  };
}

function approvedVisit(overrides = {}) {
  return visit({
    purpose: "APPROVED_WORK",
    evaluationId: null,
    approvedQuoteDecisionEvidence: {
      decisionId: ids.decision,
      decision: "APPROVED",
    },
    ...overrides,
  });
}

function record() {
  return {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    lifecycleVerified: true,
    lifecycleContractVersion: 2,
    jobId: ids.job,
    requestId: 21,
    postId: 21,
    relationshipId: 31,
  };
}

function cryptoProvider() {
  return { randomUUID: () => "99999999-9999-4999-8999-999999999999" };
}

test("Evaluation authority projects AVAILABLE and ACTIVE server truth", () => {
  const available = normalizeCanonicalVisitAuthority(
    { authority: evaluationAuthority(), sentinel: "ignored" },
    { jobId: ids.job, purpose: "EVALUATION", subjectId: ids.evaluation }
  );
  assert.equal(available.state, "AVAILABLE");
  assert.deepEqual(available.actions, { canActivate: true, canPropose: false });

  const active = normalizeCanonicalVisitAuthority(
    {
      authority: evaluationAuthority({
        state: "ACTIVE",
        activatedAt: createdAt,
        customerCapabilities,
        professionalCapabilities,
        actions: {
          canActivate: false,
          canProposeEvaluationVisit: true,
        },
      }),
    },
    { jobId: ids.job, purpose: "EVALUATION", subjectId: ids.evaluation }
  );
  assert.equal(active.state, "ACTIVE");
  assert.equal(active.actions.canPropose, true);
});

test("Approved Work authority remains tied to exact Quote decision evidence", () => {
  const authority = normalizeCanonicalVisitAuthority(
    { authority: approvedAuthority() },
    { jobId: ids.job, purpose: "APPROVED_WORK", subjectId: ids.quote }
  );
  assert.equal(authority.quoteId, ids.quote);
  assert.equal(authority.approvedQuoteDecisionId, ids.decision);
  assert.equal(authority.issuedQuoteVersion, 2);
  assert.equal(authority.actions.canPropose, true);

  assert.equal(
    normalizeCanonicalVisitAuthority(
      { authority: approvedAuthority({ approvedQuoteDecisionId: null }) },
      { jobId: ids.job, purpose: "APPROVED_WORK", subjectId: ids.quote }
    ),
    null
  );
});

test("Approved Work AVAILABLE remains separate from ACTIVE professional intent", () => {
  const available = normalizeCanonicalVisitAuthority(
    {
      authority: approvedAuthority({
        state: "AVAILABLE",
        activatedAt: null,
        customerCapabilities: [],
        professionalCapabilities: [],
        actions: {
          canActivate: true,
          canProposeApprovedWorkVisit: false,
        },
      }),
    },
    { jobId: ids.job, purpose: "APPROVED_WORK", subjectId: ids.quote }
  );
  assert.equal(available.state, "AVAILABLE");
  assert.deepEqual(available.actions, { canActivate: true, canPropose: false });

  assert.equal(
    normalizeCanonicalVisitAuthority(
      {
        authority: approvedAuthority({
          professionalCapabilities: ["visit.read"],
        }),
      },
      { jobId: ids.job, purpose: "APPROVED_WORK", subjectId: ids.quote }
    ),
    null
  );
});

test("Visit DTO is allowlisted and drops actor identity and sentinel fields", () => {
  const normalized = normalizeCanonicalVisit(visit(), { jobId: ids.job });
  assert.equal(normalized.id, ids.visit);
  assert.equal(normalized.sentinelDatabaseField, undefined);
  assert.equal(normalized.createdByParticipantId, undefined);
  assert.equal(normalized.recordedByParticipantId, undefined);
  assert.deepEqual(normalized.actions, {
    canConfirm: false,
    canRequestChange: false,
    canReschedule: false,
    canCancel: true,
    canComplete: false,
  });
});

test("canonical Visit DTO and immutable history preserve a nullable end time", () => {
  const current = visit({ scheduledEndAt: null });
  const normalized = normalizeCanonicalVisit(current, { jobId: ids.job });
  const detail = normalizeCanonicalVisit(
    { ...current, history: history(current) },
    { jobId: ids.job, detail: true }
  );
  assert.equal(normalized.scheduledEndAt, null);
  assert.equal(detail.history.versions[0].scheduledEndAt, null);
});

test("Visit lifecycle vocabulary remains bounded and RESCHEDULED is rejected", () => {
  for (const state of ["PROPOSED", "SCHEDULED", "CANCELLED", "COMPLETED"]) {
    assert.ok(normalizeCanonicalVisit(visit({ state }), { jobId: ids.job }));
  }
  assert.equal(
    normalizeCanonicalVisit(visit({ state: "RESCHEDULED" }), { jobId: ids.job }),
    null
  );
  assert.equal(
    normalizeCanonicalVisit(visit({ purpose: "FOLLOW_UP" }), { jobId: ids.job }),
    null
  );
});

test("Visit detail preserves immutable version and event history", () => {
  const current = visit();
  const normalized = normalizeCanonicalVisit(
    { ...current, history: history(current) },
    { jobId: ids.job, detail: true }
  );
  assert.equal(normalized.history.versions.length, 1);
  assert.equal(normalized.history.events[0].type, "VISIT_PROPOSED");
  assert.equal(normalized.history.events[0].recordedByParticipantId, undefined);
});

test("authority reads and activation use exact canonical routes", async () => {
  const calls = [];
  const authFetchImpl = async (endpoint, options) => {
    calls.push({ endpoint, options });
    return {
      response: { ok: true, status: 200 },
      data: { success: true, authority: evaluationAuthority() },
    };
  };
  await fetchCanonicalVisitAuthority({
    jobId: ids.job,
    purpose: "EVALUATION",
    subjectId: ids.evaluation,
    authFetchImpl,
  });
  await activateCanonicalVisitAuthority({
    jobId: ids.job,
    purpose: "EVALUATION",
    subjectId: ids.evaluation,
    authFetchImpl,
    cryptoProvider: cryptoProvider(),
  });
  assert.equal(
    calls[0].endpoint,
    `/jobs/${ids.job}/evaluations/${ids.evaluation}/visit-authority`
  );
  assert.deepEqual(calls[0].options, { method: "GET", cache: "no-store" });
  assert.equal(calls[1].options.method, "POST");
  assert.match(calls[1].options.headers["Idempotency-Key"], /^visit:activate-authority:/);
});

test("Evaluation and Approved Work Visit lists share the canonical Job read path", async () => {
  const calls = [];
  const authFetchImpl = async (endpoint) => {
    calls.push(endpoint);
    return {
      response: { ok: true, status: 200 },
      data: {
        success: true,
        visits: [visit(), approvedVisit()],
      },
    };
  };
  const evaluationVisits = await fetchCanonicalVisits({
    jobId: ids.job,
    purpose: "EVALUATION",
    evaluationId: ids.evaluation,
    authFetchImpl,
  });
  const approvedVisits = await fetchCanonicalVisits({
    jobId: ids.job,
    purpose: "APPROVED_WORK",
    approvedQuoteDecisionId: ids.decision,
    authFetchImpl,
  });
  assert.equal(evaluationVisits.length, 1);
  assert.equal(approvedVisits.length, 1);
  assert.equal(calls[0], `/jobs/${ids.job}/visits`);
  assert.equal(calls[1], `/jobs/${ids.job}/visits`);
});

test("Visit detail validates exact Job, subject, and immutable history", async () => {
  const current = visit();
  const detail = await fetchCanonicalVisitDetail({
    jobId: ids.job,
    visitId: ids.visit,
    purpose: "EVALUATION",
    evaluationId: ids.evaluation,
    authFetchImpl: async () => ({
      response: { ok: true, status: 200 },
      data: { success: true, visit: { ...current, history: history(current) } },
    }),
  });
  assert.equal(detail.id, ids.visit);
  assert.equal(detail.history.events.length, 1);
});

test("propose commands include only canonical subject, schedule, and empty optional links", async () => {
  let requestCall;
  await runCanonicalVisitCommand({
    jobId: ids.job,
    command: "propose",
    purpose: "APPROVED_WORK",
    approvedQuoteDecisionId: ids.decision,
    schedule: {
      scheduledStartAt: startAt,
      scheduledEndAt: endAt,
      timeZone: "America/New_York",
      locationMode: "JOB_SERVICE_LOCATION",
    },
    cryptoProvider: cryptoProvider(),
    authFetchImpl: async (endpoint, options) => {
      requestCall = { endpoint, options };
      return {
        response: { ok: true, status: 201 },
        data: { success: true, visit: approvedVisit() },
      };
    },
  });
  assert.equal(requestCall.endpoint, `/jobs/${ids.job}/visits`);
  assert.deepEqual(JSON.parse(requestCall.options.body), {
    purpose: "APPROVED_WORK",
    scheduledStartAt: startAt,
    scheduledEndAt: endAt,
    timeZone: "America/New_York",
    locationMode: "JOB_SERVICE_LOCATION",
    evaluationId: null,
    workstreamIds: [],
    approvedQuoteDecisionId: ids.decision,
  });
});

test("Evaluation propose sends the certified nullable end-time contract", async () => {
  let requestBody;
  await runCanonicalVisitCommand({
    jobId: ids.job,
    command: "propose",
    purpose: "EVALUATION",
    evaluationId: ids.evaluation,
    schedule: {
      scheduledStartAt: startAt,
      scheduledEndAt: null,
      timeZone: "America/New_York",
      locationMode: "JOB_SERVICE_LOCATION",
    },
    cryptoProvider: cryptoProvider(),
    authFetchImpl: async (_endpoint, options) => {
      requestBody = JSON.parse(options.body);
      return {
        response: { ok: true, status: 201 },
        data: {
          success: true,
          visit: visit({ scheduledEndAt: null }),
        },
      };
    },
  });
  assert.equal(requestBody.scheduledEndAt, null);
  assert.equal(requestBody.timeZone, "America/New_York");
});

test("professional proposal carries an optional bounded customer note as Visit event evidence", async () => {
  let requestBody;
  await runCanonicalVisitCommand({
    jobId: ids.job,
    command: "propose",
    purpose: "EVALUATION",
    reason: "Please use the side entrance when you arrive.",
    schedule: {
      scheduledStartAt: startAt,
      scheduledEndAt: null,
      timeZone: "America/New_York",
      locationMode: "JOB_SERVICE_LOCATION",
    },
    cryptoProvider: cryptoProvider(),
    authFetchImpl: async (_endpoint, options) => {
      requestBody = JSON.parse(options.body);
      return {
        response: { ok: true, status: 201 },
        data: { success: true, visit: visit({ scheduledEndAt: null }) },
      };
    },
  });
  assert.equal(requestBody.reason, "Please use the side entrance when you arrive.");
});

test("version commands send exact current version and never silently retry", async () => {
  let calls = 0;
  await assert.rejects(
    runCanonicalVisitCommand({
      jobId: ids.job,
      command: "cancel",
      visit: visit(),
      reason: "Customer is unavailable",
      cryptoProvider: cryptoProvider(),
      authFetchImpl: async (endpoint, options) => {
        calls += 1;
        assert.equal(endpoint, `/jobs/${ids.job}/visits/${ids.visit}/cancel`);
        assert.deepEqual(JSON.parse(options.body), {
          expectedVersion: 1,
          reason: "Customer is unavailable",
        });
        return {
          response: { ok: false, status: 409 },
          data: {
            success: false,
            code: "STALE_VISIT_VERSION",
            message: "The Visit version is no longer current.",
          },
        };
      },
    }),
    (error) => error instanceof CanonicalVisitError &&
      error.code === "STALE_VISIT_VERSION"
  );
  assert.equal(calls, 1);
});

test("mutual confirmation and customer alternate-time commands target one exact Visit version", async () => {
  const calls = [];
  const authFetchImpl = async (endpoint, options) => {
    calls.push({ endpoint, body: JSON.parse(options.body) });
    const changed = endpoint.endsWith("/change-request");
    return {
      response: { ok: true, status: 200 },
      data: {
        success: true,
        visit: visit({
          currentVersion: 2,
          state: changed ? "PROPOSED" : "SCHEDULED",
          scheduledStartAt: changed ? "2026-08-15T14:00:00.000Z" : startAt,
          scheduledEndAt: changed ? null : endAt,
          actions: {
            canConfirm: false,
            canRequestChange: true,
            canReschedule: false,
            canCancel: false,
            canComplete: false,
          },
        }),
      },
    };
  };
  await runCanonicalVisitCommand({
    jobId: ids.job,
    command: "confirm",
    visit: visit(),
    cryptoProvider: cryptoProvider(),
    authFetchImpl,
  });
  await runCanonicalVisitCommand({
    jobId: ids.job,
    command: "change-request",
    visit: visit(),
    schedule: {
      scheduledStartAt: "2026-08-15T14:00:00.000Z",
      scheduledEndAt: null,
      timeZone: "America/New_York",
      locationMode: "JOB_SERVICE_LOCATION",
    },
    reason: "Later works better",
    cryptoProvider: cryptoProvider(),
    authFetchImpl,
  });
  assert.deepEqual(calls, [
    {
      endpoint: `/jobs/${ids.job}/visits/${ids.visit}/confirm`,
      body: { expectedVersion: 1 },
    },
    {
      endpoint: `/jobs/${ids.job}/visits/${ids.visit}/change-request`,
      body: {
        expectedVersion: 1,
        scheduledStartAt: "2026-08-15T14:00:00.000Z",
        scheduledEndAt: null,
        timeZone: "America/New_York",
        locationMode: "JOB_SERVICE_LOCATION",
        reason: "Later works better",
      },
    },
  ]);
});

test("customer exact alternate schedule permits an explicitly empty coordination note", async () => {
  let request = null;
  await runCanonicalVisitCommand({
    jobId: ids.job,
    command: "change-request",
    visit: visit(),
    schedule: {
      scheduledStartAt: "2026-08-16T14:00:00.000Z",
      scheduledEndAt: null,
      timeZone: "America/New_York",
      locationMode: "JOB_SERVICE_LOCATION",
    },
    reason: null,
    cryptoProvider: cryptoProvider(),
    authFetchImpl: async (endpoint, options) => {
      request = { endpoint, body: JSON.parse(options.body) };
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          visit: visit({
            currentVersion: 2,
            state: "PROPOSED",
            scheduledStartAt: "2026-08-16T14:00:00.000Z",
            scheduledEndAt: null,
          }),
        },
      };
    },
  });
  assert.deepEqual(request, {
    endpoint: `/jobs/${ids.job}/visits/${ids.visit}/change-request`,
    body: {
      expectedVersion: 1,
      scheduledStartAt: "2026-08-16T14:00:00.000Z",
      scheduledEndAt: null,
      timeZone: "America/New_York",
      locationMode: "JOB_SERVICE_LOCATION",
      reason: null,
    },
  });
});

test("malformed command subjects fail before any network request", async () => {
  let calls = 0;
  await assert.rejects(
    runCanonicalVisitCommand({
      jobId: ids.job,
      command: "propose",
      purpose: "APPROVED_WORK",
      approvedQuoteDecisionId: null,
      schedule: {
        scheduledStartAt: startAt,
        scheduledEndAt: endAt,
        timeZone: "America/New_York",
        locationMode: "JOB_SERVICE_LOCATION",
      },
      authFetchImpl: async () => {
        calls += 1;
      },
    }),
    (error) => error.code === "INVALID_VISIT_COMMAND"
  );
  assert.equal(calls, 0);
});

test("workspace exposes selected-Job Evaluation Visit authority before Evaluation creation", async () => {
  let visitReads = 0;
  const workspace = await loadCanonicalVisitWorkspace({
    record: record(),
    dependencies: {
      loadEvaluation: async () => ({ evaluation: { id: ids.evaluation } }),
      loadQuotes: async () => [],
      fetchAuthority: async () =>
        normalizeCanonicalVisitAuthority(
          { authority: evaluationAuthority() },
          { jobId: ids.job, purpose: "EVALUATION", subjectId: ids.evaluation }
        ),
      fetchVisits: async () => {
        visitReads += 1;
        return [];
      },
      fetchDetail: async () => null,
    },
  });
  assert.equal(workspace.evaluation.authority.state, "ACTIVE");
  assert.equal(workspace.evaluation.visits.length, 0);
  assert.equal(visitReads, 1);
});

test("workspace exposes Approved Work only for exact ISSUED + APPROVED Quote truth", async () => {
  const quote = {
    id: ids.quote,
    status: "ISSUED",
    decisionState: "APPROVED",
    currentVersion: 2,
  };
  const workspace = await loadCanonicalVisitWorkspace({
    record: record(),
    dependencies: {
      loadEvaluation: async () => null,
      loadQuotes: async () => [quote],
      fetchAuthority: async () =>
        normalizeCanonicalVisitAuthority(
          { authority: approvedAuthority() },
          { jobId: ids.job, purpose: "APPROVED_WORK", subjectId: ids.quote }
        ),
      fetchVisits: async () => [approvedVisit()],
      fetchDetail: async () => {
        const current = approvedVisit();
        return normalizeCanonicalVisit(
          { ...current, history: history(current) },
          { jobId: ids.job, detail: true }
        );
      },
    },
  });
  assert.equal(workspace.approvedWork.length, 1);
  assert.equal(workspace.approvedWork[0].authority.state, "ACTIVE");
  assert.equal(workspace.approvedWork[0].visits.length, 1);
});

test("pending or declined Quote decisions never expose Approved Work authority", async () => {
  let authorityReads = 0;
  const workspace = await loadCanonicalVisitWorkspace({
    record: record(),
    dependencies: {
      loadEvaluation: async () => null,
      loadQuotes: async () => [
        { id: ids.quote, status: "ISSUED", decisionState: null },
        { id: `${ids.quote.slice(0, -1)}4`, status: "ISSUED", decisionState: "DECLINED" },
      ],
      fetchAuthority: async () => {
        authorityReads += 1;
      },
    },
  });
  assert.equal(workspace.approvedWork.length, 0);
  assert.deepEqual(workspace.quoteDecisionSummary, { pending: 1, declined: 1 });
  assert.equal(authorityReads, 0);
});

test("Current Job Visit presentation is bounded, professional-only, and fail-closed", () => {
  const componentSource = readFileSync(
    new URL("../src/components/CanonicalJobVisits.jsx", import.meta.url),
    "utf8"
  );
  const dashboardSource = readFileSync(
    new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
    "utf8"
  );
  assert.match(dashboardSource, /<CanonicalJobVisits[\s\S]*setPage=\{setPage\}/);
  assert.match(componentSource, /authority\.actions\.canActivate === true/);
  assert.match(componentSource, /authority\.actions\.canPropose === true/);
  assert.match(componentSource, /visit\.actions\.canReschedule === true/);
  assert.match(componentSource, /visit\.actions\.canCancel === true/);
  assert.match(componentSource, /visit\.actions\.canComplete === true/);
  assert.match(componentSource, /visit\.actions\.canConfirm === true/);
  assert.doesNotMatch(componentSource, /localStorage|sessionStorage/);
  assert.doesNotMatch(componentSource, /dispatch board|crew assignment|route optimization|GPS|geofenc|self-booking/i);
  assert.match(componentSource, /repeat\(auto-fit, minmax\(min\(100%, 280px\), 1fr\)\)/);
  assert.match(componentSource, /minHeight: 44/);
  assert.match(componentSource, /overflowWrap: "anywhere"/);
});

test("presentation language keeps Visit completion separate from lifecycle completion", () => {
  const componentSource = readFileSync(
    new URL("../src/components/CanonicalJobVisits.jsx", import.meta.url),
    "utf8"
  );
  assert.match(componentSource, /Visit attendance recorded/);
  assert.match(componentSource, /Plan visit timing and keep the customer informed/);
  assert.match(componentSource, /Schedule Evaluation/);
  assert.match(componentSource, /Schedule Work/);
  assert.match(componentSource, /Ready to schedule/);
  assert.match(componentSource, /Waiting for the customer to confirm or propose a new time/);
  assert.match(componentSource, /Customer requested a schedule change/);
  assert.match(componentSource, /latest visit details were reloaded; no change was retried/);
  assert.doesNotMatch(componentSource, /Canonical Visit authority|Activate Visit Scheduling/);
  assert.doesNotMatch(
    componentSource,
    /Evaluation, Quote scope or decision, Workstream progress, Invoice, or Job completion/
  );
  assert.match(componentSource, /setReloadVersion\(\(current\) => current \+ 1\)/);
  for (const label of [
    "Pending customer confirmation",
    "Scheduled",
    "Cancelled",
    "Visit completed",
  ]) {
    assert.match(componentSource, new RegExp(label));
  }
});
