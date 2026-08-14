import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { professionalScheduleLanguage } from "../src/utils/professionalScheduleLanguage.js";
import {
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
