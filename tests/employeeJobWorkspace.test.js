import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isRecognizedApplicationHash } from "../src/utils/appEntryRouting.js";
import {
  getAlertDestinationActionTarget,
  isSupportedAlertDestination,
} from "../src/utils/alertPresentation.js";
import { t } from "../src/utils/language.js";

const pageSource = readFileSync("src/pages/EmployeeJobs.jsx", "utf8");
const apiSource = readFileSync("src/utils/jobAssignmentApi.js", "utf8");
const fieldApiSource = readFileSync("src/utils/fieldOperationsApi.js", "utf8");
const timeApiSource = readFileSync("src/utils/timeEvidenceApi.js", "utf8");
const appSource = readFileSync("src/App.jsx", "utf8");
const teamSource = readFileSync("src/pages/TeamMembers.jsx", "utf8");

const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";

test("employee workspace is a recognized authenticated app route without professional-account inference", () => {
  assert.equal(isRecognizedApplicationHash("#employeeJobs"), true);
  assert.match(appSource, /import EmployeeJobs from "\.\/pages\/EmployeeJobs"/);
  assert.match(appSource, /page === "employeeJobs"/);
  assert.match(appSource, /<EmployeeJobs setPage=\{setPage\}/);
  const professionalPages = appSource.match(/const professionalOnlyPages = \[[\s\S]*?\];/)?.[0] || "";
  assert.doesNotMatch(professionalPages, /employeeJobs/);
});

test("Team workspace provides role-aware entry to assignments and My Jobs", () => {
  assert.match(teamSource, /Manage Job Assignments/);
  assert.match(teamSource, /Open My Jobs/);
  assert.match(teamSource, /permissions\?\.includes\("ASSIGNED_WORK"\)/);
  assert.match(teamSource, /employeeJobs\?businessId=/);
});

test("client APIs preserve separate management, assigned Jobs, and Schedule authorities", () => {
  assert.match(apiSource, /GET/);
  assert.match(apiSource, /PUT/);
  assert.match(apiSource, /\/team\/jobs\/\$\{encodeURIComponent\(jobId\)\}\/assignments/);
  assert.match(apiSource, /\/employee\/jobs\?/);
  assert.match(apiSource, /\/employee\/schedule\?/);
  assert.match(apiSource, /membershipIds/);
  assert.match(apiSource, /idempotencyKey/);
});

test("field workspace renders only server projections and contains no local assignment authority", () => {
  assert.match(pageSource, /fetchEmployeeJobs/);
  assert.match(pageSource, /fetchEmployeeSchedule/);
  assert.match(pageSource, /Approved work/);
  assert.match(pageSource, /Photos and documents/);
  assert.match(pageSource, /Upcoming visits/);
  assert.match(pageSource, /Schedule/);
  assert.match(pageSource, /Service location/);
  assert.doesNotMatch(pageSource, /localStorage|sessionStorage|meetroTeamMembers/);
});

test("field status and communication extend My Jobs with server-owned exact assignment authority", () => {
  assert.match(fieldApiSource, /\/employee\/jobs\/\$\{encodeURIComponent\(jobId\)\}\/field-status/);
  assert.match(fieldApiSource, /const surface = managed \? "team" : "employee"/);
  assert.match(fieldApiSource, /\/\$\{surface\}\/jobs\/\$\{encodeURIComponent\(jobId\)\}\/field-messages/);
  assert.match(pageSource, /fetchFieldOperations/);
  assert.match(pageSource, /updateFieldStatus/);
  assert.match(pageSource, /sendFieldMessage/);
  assert.match(pageSource, /Customers do not receive these messages/);
  assert.match(pageSource, /The Job stays open until the business completes it/);
  assert.doesNotMatch(fieldApiSource, /localStorage|sessionStorage|customerMessage|GPS|payroll/i);
});

test("Owner/Manager assignment UI excludes Bookkeeper/Finance from assignable targets", () => {
  assert.match(pageSource, /\["MANAGER", "FIELD_EMPLOYEE"\]\.includes\(member\.role\)/);
  assert.match(pageSource, /\["OWNER", "MANAGER"\]\.includes\(selected\.role\)/);
  assert.match(pageSource, /Bookkeeper \/ Finance has read-only Team time visibility and no Job dispatch or field-status authority/);
});

test("canonical Job alerts deep-link to the assignment-gated employee workspace", () => {
  const destination = { type: "job", jobId: JOB_ID };
  assert.equal(isSupportedAlertDestination(destination), true);
  const target = getAlertDestinationActionTarget(destination);
  assert.equal(target.ok, true);
  assert.equal(target.labelKey, "alertCenterOpenDetails");
  assert.equal(target.route, `employeeJobs?jobId=${JOB_ID}&returnPage=notifications`);
});

test("assignment lifecycle Alert copy is permanent across all supported languages", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    assert.notEqual(t("alerts.work.jobAssigned.title", language), "alerts.work.jobAssigned.title");
    assert.notEqual(t("alerts.work.jobAssignmentChanged.title", language), "alerts.work.jobAssignmentChanged.title");
    assert.notEqual(t("alerts.work.jobReassigned.title", language), "alerts.work.jobReassigned.title");
    assert.notEqual(t("alerts.work.jobUnassigned.title", language), "alerts.work.jobUnassigned.title");
    assert.notEqual(t("alerts.work.fieldStatus.on_my_way.title", language), "alerts.work.fieldStatus.on_my_way.title");
    assert.notEqual(t("alerts.work.fieldStatus.arrived.title", language), "alerts.work.fieldStatus.arrived.title");
    assert.notEqual(t("alerts.work.fieldStatus.field_work_completed.title", language), "alerts.work.fieldStatus.field_work_completed.title");
    assert.notEqual(t("alerts.work.fieldMessage.title", language), "alerts.work.fieldMessage.title");
  }
});

test("employee Job workspace exposes governed Clock In and Clock Out without payroll or canonical completion", () => {
  assert.match(pageSource, /Time tracking/);
  assert.match(pageSource, /Clock In/);
  assert.match(pageSource, /Clock Out/);
  assert.match(pageSource, /Meetro records the official time when you clock in or out/);
  assert.match(pageSource, /Add location when I clock in or out/);
  assert.match(pageSource, /Time history/);
  assert.match(pageSource, /Clocking out does not mark the Job complete/);
  assert.match(pageSource, /Payroll, wages, taxes, and customer billing are not calculated here/);
  assert.match(timeApiSource, /\/employee\/time\/clock-in/);
  assert.match(timeApiSource, /\/employee\/time\/clock-out/);
  assert.match(timeApiSource, /\/team\/time/);
  assert.doesNotMatch(timeApiSource, /invoice|deposit|payment|quote/i);
});
