import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const projectDetailsSource = readFileSync(
  new URL("../src/pages/ProjectDetails.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("Project Details does not create browser-local completion or history state", () => {
  assert.doesNotMatch(projectDetailsSource, /Mark Work Completed/);
  assert.doesNotMatch(projectDetailsSource, /localStorage\.setItem\(\s*"completedProjects"/);
  assert.doesNotMatch(projectDetailsSource, /localStorage\.setItem\(\s*"completedJobsCount"/);
  assert.doesNotMatch(projectDetailsSource, /localStorage\.setItem\(\s*"totalJobRevenue"/);
  assert.doesNotMatch(projectDetailsSource, /localStorage\.setItem\(\s*"homeownerNeedsReview"/);
  assert.doesNotMatch(projectDetailsSource, /localStorage\.setItem\(\s*"lastCompletedProject"/);
  assert.doesNotMatch(projectDetailsSource, /setPage\("completedJobDetails"\)/);
  assert.doesNotMatch(projectDetailsSource, /source:\s*"homeownerProject"/);
});

test("Project Details does not locally mutate projects into completed workflow state", () => {
  assert.doesNotMatch(projectDetailsSource, /status:\s*"completed"/);
  assert.doesNotMatch(projectDetailsSource, /completedAt:\s*new Date/);
  assert.doesNotMatch(projectDetailsSource, /needsReview:\s*true/);
  assert.doesNotMatch(projectDetailsSource, /revenue:\s*acceptedAmount/);
  assert.doesNotMatch(projectDetailsSource, /String\(currentCompletedCount \+ 1\)/);
  assert.doesNotMatch(projectDetailsSource, /String\(currentRevenue \+ acceptedAmount\)/);
});

test("Project Details presents completion and closure as unavailable until server authority exists", () => {
  assert.match(projectDetailsSource, /Project completion and closure are not available yet\./);
  assert.match(
    projectDetailsSource,
    /Meetro does not yet save completion, closure, history, or revenue as production state\./
  );
  assert.match(projectDetailsSource, /UNSUPPORTED_COMPLETION_CLOSURE_STATUSES/);
  assert.match(projectDetailsSource, /getTruthfulProjectDetailsRecord/);
  assert.match(projectDetailsSource, /getTruthfulJobRecords/);
  assert.match(projectDetailsSource, /workflowUnavailableCard/);
});

test("Project Details sanitizes stale browser-local completion and closure before presentation", () => {
  assert.match(projectDetailsSource, /"work_completed"/);
  assert.match(projectDetailsSource, /"closure_completed"/);
  assert.match(projectDetailsSource, /"history"/);
  assert.match(projectDetailsSource, /closureStatus: null/);
  assert.match(projectDetailsSource, /completionStatus: null/);
  assert.match(projectDetailsSource, /completedAt: null/);
  assert.match(projectDetailsSource, /closedAt: null/);
  assert.match(projectDetailsSource, /revenue: null/);
  assert.match(projectDetailsSource, /finalAmount: null/);
});

test("Project Details preserves viewing, messaging, navigation, and responsive shell", () => {
  assert.match(projectDetailsSource, /function openProjectConversation/);
  assert.match(projectDetailsSource, /setPage\("conversationThread"\)/);
  assert.match(projectDetailsSource, /setPage\("myRequests"\)/);
  assert.match(projectDetailsSource, /HomeownerProjectHeader/);
  assert.match(projectDetailsSource, /ProjectJourneyPanel/);
  assert.match(projectDetailsSource, /Project Photos/);
  assert.match(projectDetailsSource, /className="app-page meetro-readable-page"/);
  assert.match(projectDetailsSource, /<BottomNav/);
  assert.match(appSource, /"projectDetails"/);
});
