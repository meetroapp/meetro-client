import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchProfessionalSchedule,
  normalizeProfessionalSchedule,
  createProfessionalScheduleSourceState,
  reduceProfessionalScheduleSourceState,
  wallTimeToInstant,
} from "../src/utils/professionalScheduleProjection.js";

const IDS = {
  job: "10000000-0000-4000-8000-000000000001",
  evaluation: "20000000-0000-4000-8000-000000000002",
  visit: "30000000-0000-4000-8000-000000000003",
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
        upcoming: 0,
      },
      opportunities: [{
        semanticState: "READY_TO_SCHEDULE",
        jobId: IDS.job,
        purpose: "EVALUATION",
        evaluationId: IDS.evaluation,
        quoteId: null,
        approvedQuoteDecisionId: null,
        authority: { state: "AVAILABLE", rawGrantRows: ["ignored"] },
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
        completedAt: null,
        evaluationId: IDS.evaluation,
        approvedQuoteDecisionEvidence: null,
        latestCustomerChangeRequest: null,
        job: { id: IDS.job, title: "Synthetic repair", category: "Handyman" },
        customer: { displayName: "QA Customer" },
        createdAt: "2026-08-13T12:00:00.000Z",
        versionCreatedAt: "2026-08-13T12:00:00.000Z",
        actions: {
          canReschedule: false,
          canCancel: true,
          canComplete: false,
          canViewJob: true,
        },
      }],
      page: { limit: 50, hasMore: false, nextCursor: null },
      ...overrides,
    },
  };
}

test("normalizer allowlists server Schedule truth and drops raw/private fields", () => {
  const schedule = normalizeProfessionalSchedule(payload());
  assert.equal(schedule.source, "PROFESSIONAL_SCHEDULE");
  assert.deepEqual(schedule.summary, {
    readyToSchedule: 1,
    waitingOnCustomer: 1,
    changeRequested: 0,
    upcoming: 0,
  });
  assert.equal("sentinelDatabaseField" in schedule.opportunities[0], false);
  assert.equal("email" in schedule.opportunities[0].customer, false);
  assert.equal("rawGrantRows" in schedule.opportunities[0].authority, false);
  assert.equal("canDelete" in schedule.opportunities[0].actions, false);
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
    summary: { readyToSchedule: 0, waitingOnCustomer: 0, changeRequested: 0, upcoming: 0 },
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
