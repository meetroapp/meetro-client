import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  addFieldScheduleDays,
  buildFieldScheduleWeek,
  fieldScheduleDateKey,
  fieldScheduleVisitsForDay,
  formatFieldScheduleTimeRange,
  reconcileFieldEmployeeSchedule,
  resolveFieldScheduleTimeZone,
  shiftFieldScheduleWeek,
} from "../src/utils/fieldEmployeeSchedule.js";
import { t } from "../src/utils/language.js";

const portalSource = readFileSync("src/pages/EmployeePortal.jsx", "utf8");
const scheduleSource = portalSource.slice(
  portalSource.indexOf("function ScheduleView"),
  portalSource.indexOf("function customerAuthor")
);
const scheduleCss = readFileSync("src/styles/employeeShell.css", "utf8");
const assignmentApiSource = readFileSync("src/utils/jobAssignmentApi.js", "utf8");

const JOB_ONE = "072c8736-5d97-4253-ba3e-dd1bce281a20";
const JOB_TWO = "172c8736-5d97-4253-ba3e-dd1bce281a21";
const JOB_THREE = "272c8736-5d97-4253-ba3e-dd1bce281a22";

function assignment(overrides = {}) {
  return {
    id: "a7c9a660-c087-4af1-b139-8d77f8d69b33",
    state: "ACTIVE",
    memberStatus: "ACTIVE",
    memberRole: "FIELD_EMPLOYEE",
    assignedAt: "2026-08-20T12:00:00.000Z",
    ...overrides,
  };
}

function job(id, title, customer, overrides = {}) {
  return {
    id,
    title,
    customer: { displayName: customer },
    assignments: [assignment()],
    location: { serviceArea: "Cape Coral, FL", address: null },
    createdAt: "2026-08-19T12:00:00.000Z",
    ...overrides,
  };
}

function visit(id, jobId, startsAt, overrides = {}) {
  return {
    visitId: id,
    jobId,
    jobTitle: "Server-authorized Job title",
    purpose: "APPROVED_WORK",
    state: "SCHEDULED",
    startsAt,
    endsAt: null,
    timeZone: "America/New_York",
    location: { serviceArea: "Cape Coral, FL", address: null, remote: false },
    ...overrides,
  };
}

test("week preview is seven Monday-first days with one selected day and canonical Today", () => {
  const today = fieldScheduleDateKey(
    "2026-08-31T15:00:00.000Z",
    "America/New_York"
  );
  const week = buildFieldScheduleWeek(today, today);
  assert.equal(today, "2026-08-31");
  assert.equal(week.length, 7);
  assert.deepEqual(
    week.map((day) => day.dateKey),
    [
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]
  );
  assert.equal(week.filter((day) => day.isSelected).length, 1);
  assert.equal(week.filter((day) => day.isToday).length, 1);
});

test("previous, next, Today, and selecting a day preserve date-only week state", () => {
  const today = "2026-08-31";
  assert.equal(shiftFieldScheduleWeek(today, -1), "2026-08-24");
  assert.equal(shiftFieldScheduleWeek(today, 1), "2026-09-07");
  assert.equal(addFieldScheduleDays(today, 2), "2026-09-02");
  assert.equal(buildFieldScheduleWeek(today, today)[0].isSelected, true);
  assert.match(scheduleSource, /setSelectedDateKey\(day\.dateKey\)/);
  assert.match(scheduleSource, /setSelectedDateKey\(todayDateKey\)/);
});

test("canonical Visit timezone controls grouping instead of the browser timezone", () => {
  const instant = "2026-09-01T01:00:00.000Z";
  assert.equal(
    fieldScheduleDateKey(instant, "America/Los_Angeles"),
    "2026-08-31"
  );
  assert.equal(fieldScheduleDateKey(instant, "UTC"), "2026-09-01");
  assert.equal(
    resolveFieldScheduleTimeZone([
      visit("visit-1", JOB_ONE, instant, { timeZone: "America/Los_Angeles" }),
    ]),
    "America/Los_Angeles"
  );
  assert.equal(
    resolveFieldScheduleTimeZone([], "America/New_York"),
    "America/New_York"
  );
  assert.match(portalSource, /scheduleTimeZone: scheduleResult\.timeZone \|\| null/);
});

test("Visit counts and selected-day agenda use only canonical Schedule entries", () => {
  const jobs = [
    job(JOB_ONE, "Inspect cabinet", "Antony Guzman"),
    job(JOB_TWO, "Repair trim", "Sarah Kim"),
  ];
  const schedule = [
    visit("visit-late", JOB_ONE, "2026-08-31T15:00:00.000Z"),
    visit("visit-early", JOB_ONE, "2026-08-31T13:00:00.000Z", {
      endsAt: "2026-08-31T14:00:00.000Z",
    }),
  ];
  const projection = reconcileFieldEmployeeSchedule({ jobs, schedule });
  const monday = fieldScheduleVisitsForDay(projection.visits, "2026-08-31");
  const tuesday = fieldScheduleVisitsForDay(projection.visits, "2026-09-01");
  assert.equal(monday.length, 2);
  assert.deepEqual(monday.map((item) => item.visitId), ["visit-early", "visit-late"]);
  assert.equal(tuesday.length, 0);
  assert.equal(projection.visits.filter((item) => item.jobId === JOB_ONE).length, 2);
  assert.equal(monday[0].customerDisplayName, "Antony Guzman");
  assert.equal(
    formatFieldScheduleTimeRange(monday[0], "en"),
    "9:00 AM – 10:00 AM"
  );
});

test("active assigned Jobs without Visits remain separate under Awaiting Schedule", () => {
  const jobs = [
    job(JOB_ONE, "Scheduled cabinet work", "Antony Guzman"),
    job(JOB_TWO, "Awaiting trim work", "Sarah Kim"),
    job(JOB_THREE, "Inactive assignment", "Jordan Lee", {
      assignments: [assignment({ state: "UNASSIGNED" })],
    }),
  ];
  const projection = reconcileFieldEmployeeSchedule({
    jobs,
    schedule: [visit("visit-1", JOB_ONE, "2026-08-31T13:00:00.000Z")],
  });
  assert.deepEqual(
    projection.awaitingSchedule.map((item) => item.id),
    [JOB_TWO]
  );
  assert.equal(projection.awaitingSchedule[0].createdAt, "2026-08-19T12:00:00.000Z");
  assert.equal("startsAt" in projection.awaitingSchedule[0], false);
});

test("non-active or malformed Schedule records fail closed without hiding awaiting work", () => {
  const jobs = [job(JOB_ONE, "Inspect cabinet", "Antony Guzman")];
  const projection = reconcileFieldEmployeeSchedule({
    jobs,
    schedule: [
      visit("completed", JOB_ONE, "2026-08-31T13:00:00.000Z", {
        state: "COMPLETED",
      }),
      visit("malformed", JOB_ONE, "not-a-date"),
    ],
  });
  assert.equal(projection.visits.length, 0);
  assert.deepEqual(projection.awaitingSchedule.map((item) => item.id), [JOB_ONE]);
});

test("Schedule UI stays read-only and opens exact server-returned Job identity", () => {
  assert.match(scheduleSource, /weekDays\.map/);
  assert.match(scheduleSource, /fieldNoVisitsForDay/);
  assert.match(scheduleSource, /projection\.awaitingSchedule/);
  assert.match(
    scheduleSource,
    /employeeJobs\?businessId=\$\{businessId\}&jobId=\$\{encodeURIComponent\(jobId\)\}/
  );
  assert.doesNotMatch(scheduleSource, /<form|<input|<textarea|draggable|onDrop/);
  assert.doesNotMatch(
    assignmentApiSource,
    /createEmployeeSchedule|updateEmployeeSchedule|deleteEmployeeSchedule|rescheduleEmployee/
  );
  assert.match(assignmentApiSource, /export function fetchEmployeeSchedule/);
});

test("Schedule layout preserves desktop shell containment and mobile one-column flow", () => {
  assert.match(scheduleCss, /\.employee-shell__main[\s\S]*overflow-y: auto/);
  assert.match(scheduleCss, /\.employee-schedule[\s\S]*min-width: 0/);
  assert.match(scheduleCss, /\.employee-schedule__week-strip[\s\S]*grid-template-columns: repeat\(7/);
  const mobile = scheduleCss.slice(scheduleCss.indexOf("@media (max-width: 760px)", scheduleCss.indexOf("FIELD SCHEDULE")));
  assert.match(mobile, /\.employee-schedule__week-strip[\s\S]*overflow-x: auto/);
  assert.match(mobile, /\.employee-schedule__visit,[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.doesNotMatch(scheduleCss, /employee-schedule[^}]*overflow-x: hidden/);
});

test("all Schedule copy has EN, ES, FR, and PT-BR parity", () => {
  const keys = [
    "fieldMySchedule",
    "fieldToday",
    "fieldPreviousWeek",
    "fieldNextWeek",
    "fieldScheduledVisitsLabel",
    "fieldNoVisitsForDay",
    "fieldAwaitingSchedule",
    "fieldNotScheduledYet",
    "fieldAssignedJobNoScheduledVisit",
    "fieldOpenJob",
    "fieldNoAssignedWorkScheduled",
    "fieldScheduleTimeZone",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of keys) {
      assert.notEqual(t(key, language), key, `${language}:${key}`);
      assert.ok(t(key, language).trim(), `${language}:${key}`);
    }
  }
  assert.equal(t("fieldNoVisitsForDay", "en"), "No Visits scheduled for this day.");
  assert.equal(t("fieldAwaitingSchedule", "en"), "Awaiting Schedule");
  assert.equal(
    t("fieldAssignedJobNoScheduledVisit", "en"),
    "This assigned Job does not have a scheduled Visit yet."
  );
});
