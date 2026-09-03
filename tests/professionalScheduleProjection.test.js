import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProfessionalScheduleCommandSchedule,
  fetchProfessionalSchedule,
  formatProfessionalScheduleTimeZone,
  getProfessionalScheduleCounts,
  groupProfessionalSchedule,
  normalizeProfessionalSchedule,
  createProfessionalScheduleSourceState,
  reduceProfessionalScheduleSourceState,
  resolveProfessionalScheduleTimeZone,
  wallTimeToInstant,
} from "../src/utils/professionalScheduleProjection.js";

const IDS = {
  job: "10000000-0000-4000-8000-000000000001",
  evaluation: "20000000-0000-4000-8000-000000000002",
  visit: "30000000-0000-4000-8000-000000000003",
  quote: "40000000-0000-4000-8000-000000000004",
  decision: "50000000-0000-4000-8000-000000000005",
  quoteApproval: "60000000-0000-4000-8000-000000000006",
  externalConfirmation: "70000000-0000-4000-8000-000000000007",
  professional: "80000000-0000-4000-8000-000000000008",
};

function payload(overrides = {}) {
  return {
    success: true,
    code: "PROFESSIONAL_SCHEDULE_LOADED",
    schedule: {
      view: "active",
      summary: {
        readyToSchedule: 1,
        waitingOnCustomer: 1,
        changeRequested: 0,
        inProgress: 0,
        upcoming: 0,
      },
      opportunities: [{
        semanticState: "READY_TO_SCHEDULE",
        jobId: IDS.job,
        purpose: "EVALUATION",
        evaluationId: null,
        quoteId: null,
        approvedQuoteDecisionId: null,
        authority: { state: "ACTIVE", rawGrantRows: ["ignored"] },
        job: { id: IDS.job, title: "Synthetic repair", category: "Handyman", internal: true },
        customer: { displayName: "QA Customer", email: "private@example.test" },
        location: { mode: "JOB_SERVICE_LOCATION", serviceArea: "Brooklyn, NY", address: null },
        actions: { canStartScheduling: true, canViewJob: true, canDelete: true },
        sentinelDatabaseField: "must-not-project",
      }],
      visits: [{
        id: IDS.visit,
        jobId: IDS.job,
        purpose: "EVALUATION",
        state: "PROPOSED",
        semanticState: "WAITING_FOR_CUSTOMER",
        currentVersion: 1,
        scheduledStartAt: "2026-08-20T14:00:00.000Z",
        scheduledEndAt: "2026-08-20T15:00:00.000Z",
        timeZone: "America/New_York",
        locationMode: "JOB_SERVICE_LOCATION",
        location: {
          mode: "JOB_SERVICE_LOCATION",
          serviceArea: "Brooklyn, NY",
          address: null,
        },
        cancellationReason: null,
        cancelledAt: null,
        startedAt: null,
        completedAt: null,
        evaluationId: null,
        approvedQuoteDecisionEvidence: null,
        latestCustomerChangeRequest: null,
        job: { id: IDS.job, title: "Synthetic repair", category: "Handyman" },
        customer: { displayName: "QA Customer" },
        createdAt: "2026-08-13T12:00:00.000Z",
        versionCreatedAt: "2026-08-13T12:00:00.000Z",
        actions: {
          canConfirm: false,
          canReschedule: false,
          canCancel: true,
          canStart: false,
          canComplete: false,
          canViewJob: true,
        },
      }],
      page: { limit: 50, hasMore: false, nextCursor: null },
      ...overrides,
    },
  };
}

function externalPayload({ scheduled = false } = {}) {
  const response = payload();

  response.schedule.opportunities = [{
    semanticState: "READY_TO_SCHEDULE",
    jobId: IDS.job,
    purpose: "APPROVED_WORK",
    evaluationId: null,
    quoteId: IDS.quote,
    approvedQuoteDecisionId: null,
    quoteApprovalId: IDS.quoteApproval,
    approvalSource: "EXTERNAL_EVIDENCE",
    authority: { state: "ACTIVE" },
    job: {
      id: IDS.job,
      title: "External customer repair",
      category: "Handyman",
    },
    customer: { displayName: "External Customer" },
    location: {
      mode: "JOB_SERVICE_LOCATION",
      serviceArea: "Cape Coral, FL",
      address: null,
    },
    actions: {
      canStartScheduling: true,
      canViewJob: true,
    },
  }];

  response.schedule.visits = [{
    id: IDS.visit,
    jobId: IDS.job,
    purpose: "APPROVED_WORK",
    state: scheduled ? "SCHEDULED" : "PROPOSED",
    semanticState: scheduled ? "SCHEDULED" : "WAITING_FOR_CUSTOMER",
    currentVersion: scheduled ? 2 : 1,
    scheduledStartAt: "2026-08-20T14:00:00.000Z",
    scheduledEndAt: "2026-08-20T15:00:00.000Z",
    timeZone: "America/New_York",
    locationMode: "JOB_SERVICE_LOCATION",
    location: {
      mode: "JOB_SERVICE_LOCATION",
      serviceArea: "Cape Coral, FL",
      address: null,
    },
    cancellationReason: null,
    cancelledAt: null,
    startedAt: null,
    completedAt: null,
    evaluationId: null,
    quoteApprovalId: IDS.quoteApproval,
    approvalSource: "EXTERNAL_EVIDENCE",
    externalScheduleConfirmation: scheduled
      ? {
          id: IDS.externalConfirmation,
          source: "BUSINESS_RECORDED_EXTERNAL_EVIDENCE",
          method: "TEXT_MESSAGE",
          confirmedAt: "2026-08-13T14:15:00.000Z",
          proposedVisitVersion: 1,
          scheduledVisitVersion: 2,
          proposedIntegrityHash: "d".repeat(64),
          recordedByParticipantId: IDS.professional,
          recordedAt: "2026-08-13T14:15:01.000Z",
        }
      : null,
    approvedQuoteDecisionEvidence: null,
    latestCustomerChangeRequest: null,
    job: {
      id: IDS.job,
      title: "External customer repair",
      category: "Handyman",
    },
    customer: { displayName: "External Customer" },
    createdAt: "2026-08-13T12:00:00.000Z",
    versionCreatedAt: scheduled
      ? "2026-08-13T14:15:01.000Z"
      : "2026-08-13T12:00:00.000Z",
    actions: {
      canConfirm: false,
      canRecordExternalConfirmation: !scheduled,
      canReschedule: true,
      canCancel: true,
      canStart: false,
      canComplete: false,
      canViewJob: true,
    },
  }];

  return response;
}

test("normalizer allowlists server Schedule truth and drops raw/private fields", () => {
  const schedule = normalizeProfessionalSchedule(payload());
  assert.equal(schedule.source, "PROFESSIONAL_SCHEDULE");
  assert.deepEqual(schedule.summary, {
    readyToSchedule: 1,
    waitingOnCustomer: 1,
    changeRequested: 0,
    inProgress: 0,
    upcoming: 0,
  });
  assert.equal("sentinelDatabaseField" in schedule.opportunities[0], false);
  assert.equal("email" in schedule.opportunities[0].customer, false);
  assert.equal("rawGrantRows" in schedule.opportunities[0].authority, false);
  assert.equal("canDelete" in schedule.opportunities[0].actions, false);
});

test("external Approved Work Schedule uses common Quote approval without fabricated customer decision", () => {
  const schedule = normalizeProfessionalSchedule(externalPayload());

  assert.ok(schedule);
  assert.equal(schedule.opportunities.length, 1);
  assert.equal(schedule.visits.length, 1);

  const opportunity = schedule.opportunities[0];
  assert.equal(opportunity.purpose, "APPROVED_WORK");
  assert.equal(opportunity.quoteId, IDS.quote);
  assert.equal(opportunity.quoteApprovalId, IDS.quoteApproval);
  assert.equal(opportunity.approvalSource, "EXTERNAL_EVIDENCE");
  assert.equal(opportunity.approvedQuoteDecisionId, null);

  const visit = schedule.visits[0];
  assert.equal(visit.quoteApprovalId, IDS.quoteApproval);
  assert.equal(visit.approvalSource, "EXTERNAL_EVIDENCE");
  assert.equal(visit.approvedQuoteDecisionEvidence, null);
  assert.equal(visit.externalScheduleConfirmation, null);
  assert.equal(visit.actions.canConfirm, false);
  assert.equal(visit.actions.canRecordExternalConfirmation, true);
});

test("scheduled external Visit preserves canonical external confirmation evidence", () => {
  const schedule = normalizeProfessionalSchedule(
    externalPayload({ scheduled: true })
  );

  assert.ok(schedule);
  const visit = schedule.visits[0];

  assert.equal(visit.state, "SCHEDULED");
  assert.equal(
    visit.externalScheduleConfirmation.source,
    "BUSINESS_RECORDED_EXTERNAL_EVIDENCE"
  );
  assert.equal(visit.externalScheduleConfirmation.method, "TEXT_MESSAGE");
  assert.equal(
    visit.externalScheduleConfirmation.proposedVisitVersion,
    1
  );
  assert.equal(
    visit.externalScheduleConfirmation.scheduledVisitVersion,
    2
  );
  assert.equal(visit.actions.canRecordExternalConfirmation, false);
});

test("external Schedule provenance fails closed when common approval identity is mixed or malformed", () => {
  const withDecision = externalPayload();
  withDecision.schedule.opportunities[0].approvedQuoteDecisionId = IDS.decision;
  assert.equal(normalizeProfessionalSchedule(withDecision), null);

  const missingApproval = externalPayload();
  missingApproval.schedule.opportunities[0].quoteApprovalId = null;
  assert.equal(normalizeProfessionalSchedule(missingApproval), null);

  const visitWithDecision = externalPayload();
  visitWithDecision.schedule.visits[0].approvedQuoteDecisionEvidence = {
    decisionId: IDS.decision,
    decision: "APPROVED",
  };
  assert.equal(normalizeProfessionalSchedule(visitWithDecision), null);

  const wrongSource = externalPayload({ scheduled: true });
  wrongSource.schedule.visits[0].approvalSource = "MEETRO_CUSTOMER";
  assert.equal(normalizeProfessionalSchedule(wrongSource), null);

  const badConfirmation = externalPayload({ scheduled: true });
  badConfirmation.schedule.visits[0]
    .externalScheduleConfirmation.scheduledVisitVersion = 3;
  assert.equal(normalizeProfessionalSchedule(badConfirmation), null);
});

test("Schedule read preserves Evaluation arrival truth without an invented end", () => {
  const response = payload();
  response.schedule.visits[0].scheduledEndAt = null;
  response.schedule.visits[0].arrivalNote = "unsupported local metadata";
  const schedule = normalizeProfessionalSchedule(response);
  assert.equal(schedule.visits[0].scheduledEndAt, null);
  assert.equal("arrivalNote" in schedule.visits[0], false);
});

test("authenticated transport uses the one bounded global endpoint and preserves opaque cursor", async () => {
  const calls = [];
  const schedule = await fetchProfessionalSchedule({
    view: "active",
    limit: 50,
    cursor: "opaque-cursor",
    authFetchImpl: async (...args) => {
      calls.push(args);
      return { response: { ok: true, status: 200 }, data: payload() };
    },
  });
  assert.equal(schedule.visits[0].id, IDS.visit);
  assert.deepEqual(calls, [[
    "/professional/schedule?view=active&limit=50&cursor=opaque-cursor",
    { method: "GET", cache: "no-store" },
    undefined,
  ]]);
});

test("malformed, unauthorized, and failed reads never normalize as confirmed empty", async () => {
  for (const result of [
    { response: { ok: false, status: 401 }, data: { code: "AUTHENTICATION_REQUIRED" } },
    { response: { ok: true, status: 200 }, data: { success: true, schedule: {} } },
  ]) {
    await assert.rejects(
      fetchProfessionalSchedule({ authFetchImpl: async () => result }),
      (error) => error.code === "AUTHENTICATION_REQUIRED" ||
        error.code === "INVALID_PROFESSIONAL_SCHEDULE_RESPONSE"
    );
  }
});

test("source state retains last confirmed truth across transient refresh failure", () => {
  const confirmed = normalizeProfessionalSchedule(payload());
  let state = createProfessionalScheduleSourceState();
  state = reduceProfessionalScheduleSourceState(state, { type: "load" });
  assert.equal(state.status, "loading");
  state = reduceProfessionalScheduleSourceState(state, { type: "success", schedule: confirmed });
  state = reduceProfessionalScheduleSourceState(state, { type: "load" });
  assert.equal(state.refreshing, true);
  state = reduceProfessionalScheduleSourceState(state, {
    type: "failure",
    message: "Temporary outage",
  });
  assert.equal(state.status, "confirmed");
  assert.equal(state.confirmed, confirmed);
  assert.equal(state.error, "Temporary outage");
});

test("confirmed canonical empty remains distinct from unavailable", () => {
  const empty = normalizeProfessionalSchedule(payload({
    summary: { readyToSchedule: 0, waitingOnCustomer: 0, changeRequested: 0, inProgress: 0, upcoming: 0 },
    opportunities: [],
    visits: [],
  }));
  assert.ok(empty);
  let state = reduceProfessionalScheduleSourceState(createProfessionalScheduleSourceState(), {
    type: "success",
    schedule: empty,
  });
  assert.equal(state.status, "confirmed");
  assert.equal(state.confirmed.opportunities.length + state.confirmed.visits.length, 0);
});

test("shared Schedule groups and counts separate Today from Upcoming in each Visit timezone", () => {
  const response = payload();
  const first = response.schedule.visits[0];
  Object.assign(first, {
    state: "SCHEDULED",
    semanticState: "SCHEDULED",
    scheduledStartAt: "2026-08-20T14:00:00.000Z",
    scheduledEndAt: null,
  });
  response.schedule.visits.push({
    ...first,
    id: "30000000-0000-4000-8000-000000000004",
    scheduledStartAt: "2026-08-21T14:00:00.000Z",
  });
  const schedule = normalizeProfessionalSchedule(response);
  const options = { now: new Date("2026-08-20T12:00:00.000Z") };
  const groups = groupProfessionalSchedule(schedule, options);
  const counts = getProfessionalScheduleCounts(schedule, options);
  assert.equal(groups.today[0].id, IDS.visit);
  assert.equal(groups.upcoming[0].id, "30000000-0000-4000-8000-000000000004");
  assert.deepEqual(counts, {
    needsScheduling: 1,
    waiting: 0,
    changeRequested: 0,
    inProgress: 0,
    today: 1,
    upcoming: 1,
  });
});

test("STARTED is grouped only as In Progress and retains actual start evidence", () => {
  const response = payload();
  Object.assign(response.schedule.visits[0], {
    state: "STARTED",
    semanticState: "STARTED",
    startedAt: "2026-08-20T13:57:00.000Z",
    actions: {
      canConfirm: false,
      canReschedule: false,
      canCancel: true,
      canStart: false,
      canComplete: true,
      canViewJob: true,
    },
  });
  response.schedule.summary.inProgress = 1;
  const schedule = normalizeProfessionalSchedule(response);
  const groups = groupProfessionalSchedule(schedule, {
    now: new Date("2026-08-20T14:10:00.000Z"),
  });
  assert.equal(groups.inProgress[0].id, IDS.visit);
  assert.equal(groups.inProgress[0].startedAt, "2026-08-20T13:57:00.000Z");
  assert.equal(groups.today.length, 0);
  assert.equal(groups.upcoming.length, 0);
  assert.equal(getProfessionalScheduleCounts(schedule).inProgress, 1);
});

test("wall-clock Schedule input becomes an explicit instant in the selected IANA timezone", () => {
  assert.equal(
    wallTimeToInstant({
      date: "2026-08-20",
      time: "09:30",
      timeZone: "America/New_York",
    }),
    "2026-08-20T13:30:00.000Z"
  );
  assert.equal(
    wallTimeToInstant({
      date: "2026-03-08",
      time: "02:30",
      timeZone: "America/New_York",
    }),
    null
  );
});

test("Evaluation requires arrival truth and preserves only an explicitly supplied arrival window", () => {
  assert.deepEqual(
    buildProfessionalScheduleCommandSchedule({
      purpose: "EVALUATION",
      date: "2026-08-20",
      startTime: "09:30",
      endTime: "10:30",
      timeZone: "America/New_York",
      locationMode: "JOB_SERVICE_LOCATION",
    }),
    {
      scheduledStartAt: "2026-08-20T13:30:00.000Z",
      scheduledEndAt: "2026-08-20T14:30:00.000Z",
      timeZone: "America/New_York",
      locationMode: "JOB_SERVICE_LOCATION",
    }
  );
  assert.equal(
    buildProfessionalScheduleCommandSchedule({
      purpose: "EVALUATION",
      date: "",
      startTime: "09:30",
      timeZone: "America/New_York",
      locationMode: "JOB_SERVICE_LOCATION",
    }),
    null
  );
  assert.equal(
    buildProfessionalScheduleCommandSchedule({
      purpose: "EVALUATION",
      date: "2026-08-20",
      startTime: "",
      timeZone: "America/New_York",
      locationMode: "JOB_SERVICE_LOCATION",
    }),
    null
  );
});

test("Approved Work accepts an omitted end and validates a provided optional end", () => {
  const base = {
    purpose: "APPROVED_WORK",
    date: "2026-08-20",
    startTime: "09:30",
    timeZone: "America/New_York",
    locationMode: "REMOTE",
  };
  assert.equal(
    buildProfessionalScheduleCommandSchedule(base).scheduledEndAt,
    null
  );
  assert.equal(
    buildProfessionalScheduleCommandSchedule({ ...base, endTime: "11:00" })
      .scheduledEndAt,
    "2026-08-20T15:00:00.000Z"
  );
  assert.equal(
    buildProfessionalScheduleCommandSchedule({ ...base, endTime: "08:00" }),
    null
  );
  assert.equal(
    buildProfessionalScheduleCommandSchedule({ ...base, locationMode: "" }),
    null
  );
});

test("timezone resolves automatically, stays canonical, and renders business language", () => {
  assert.equal(
    resolveProfessionalScheduleTimeZone({
      visitTimeZone: "America/New_York",
      jobTimeZone: "America/Chicago",
      deviceTimeZone: "America/Los_Angeles",
    }),
    "America/New_York"
  );
  assert.equal(
    resolveProfessionalScheduleTimeZone({
      jobTimeZone: "invalid-zone",
      businessTimeZone: "America/Chicago",
      deviceTimeZone: "America/Los_Angeles",
    }),
    "America/Chicago"
  );
  assert.match(
    formatProfessionalScheduleTimeZone("America/New_York", "en"),
    /Eastern Time/
  );
  assert.equal(formatProfessionalScheduleTimeZone("invalid-zone", "en"), "");
});
