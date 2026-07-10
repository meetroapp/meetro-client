import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contractorDashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

test("Work Center imports reusable workflow dependency alert helpers", () => {
  assert.match(contractorDashboardSource, /from "\.\.\/utils\/workflowDependencyAlerts"/);
  assert.match(contractorDashboardSource, /getPendingWorkflowDependencies/);
  assert.match(contractorDashboardSource, /shouldWarnBeforeAction/);
  assert.match(contractorDashboardSource, /appendWorkflowOverrideHistory/);
});

test("Work Center renders a visible Waiting on Customer banner", () => {
  assert.match(contractorDashboardSource, /function renderWorkflowDependencyBanner\(source = \{\}\)/);
  assert.match(contractorDashboardSource, /aria-label="Waiting on Customer"/);
  assert.match(contractorDashboardSource, /Waiting on: \{dependency\.waitingOn\}/);
  assert.match(contractorDashboardSource, /Recommended: wait or send a reminder\./);
  assert.match(contractorDashboardSource, /workflowDependencySeverity/);
  assert.match(contractorDashboardSource, /renderWorkflowDependencyBanner\(universalActiveWork\)/);
  assert.match(contractorDashboardSource, /renderWorkflowDependencyBanner\(job\)/);
});

test("Work Center warning dialog keeps Wait Send Reminder and Continue Anyway available", () => {
  assert.match(contractorDashboardSource, /role="alertdialog"/);
  assert.match(contractorDashboardSource, /aria-describedby="workflow-dependency-dialog-summary workflow-dependency-dialog-warning"/);
  assert.match(contractorDashboardSource, />\s*Wait\s*<\/button>/);
  assert.match(contractorDashboardSource, />\s*Send Reminder\s*<\/button>/);
  assert.match(contractorDashboardSource, />\s*Continue Anyway\s*<\/button>/);
  assert.match(contractorDashboardSource, /continueWorkflowDependencyPrompt/);
  assert.match(contractorDashboardSource, /sendWorkflowDependencyReminder/);
});

test("Work Center phone dialog names severity attempted action waiting party and recommendation", () => {
  assert.match(contractorDashboardSource, /Critical warning/);
  assert.match(contractorDashboardSource, /Advisory warning/);
  assert.match(contractorDashboardSource, /Attempting: \{attemptedActionLabel\}/);
  assert.match(contractorDashboardSource, /Waiting on: \{dependency\.waitingOn\}/);
  assert.match(contractorDashboardSource, /Recommended: wait or send a reminder\./);
  assert.match(contractorDashboardSource, /getWorkflowDependencyActionLabel/);
});

test("Work Center dialog focus moves into alert and Wait returns focus without advancing", () => {
  assert.match(contractorDashboardSource, /workflowDependencyDialogRef/);
  assert.match(contractorDashboardSource, /workflowDependencyReturnFocusRef/);
  assert.match(contractorDashboardSource, /workflowDependencyDialogRef\.current\?\.focus\?\.\(\)/);
  assert.match(contractorDashboardSource, /dismissWorkflowDependencyPrompt/);
  assert.match(contractorDashboardSource, /workflowDependencyReturnFocusRef\.current\?\.focus\?\.\(\)/);
});

test("Work Center warning dialog can summarize multiple closure dependencies", () => {
  assert.match(contractorDashboardSource, /relatedDependencies/);
  assert.match(contractorDashboardSource, /Still unresolved/);
  assert.match(contractorDashboardSource, /workflowDependencySummaryList/);
  assert.match(contractorDashboardSource, /item\.expectedAction/);
});

test("Work Center advances are warning-mediated and not hard blocked by the alert", () => {
  assert.match(contractorDashboardSource, /requestWorkflowDependencyAdvance\(universalActiveWork, "on_the_way"/);
  assert.match(contractorDashboardSource, /requestWorkflowDependencyAdvance\(universalActiveWork, "start_work"/);
  assert.match(contractorDashboardSource, /requestWorkflowDependencyAdvance\(universalActiveWork, "complete_work"/);
  assert.match(contractorDashboardSource, /requestWorkflowDependencyAdvance\(\s*job,\s*activeWorkAttemptedAction,\s*activeWorkWorkflow\.onAction/s);
  assert.match(contractorDashboardSource, /continueAction\?\.\(\)/);
});

test("Work Center Continue Anyway records override history", () => {
  assert.match(contractorDashboardSource, /function recordWorkflowDependencyOverride/);
  assert.match(contractorDashboardSource, /lastWorkflowDependencyOverride/);
  assert.match(contractorDashboardSource, /saveJobRecord\(nextRecord\.conversationId, nextRecord\.projectTimeline \|\| \[\]\)/);
});

test("Work Center records dependency identified history and displays read-only history sections", () => {
  assert.match(contractorDashboardSource, /createWorkflowDependencyIdentifiedEvent/);
  assert.match(contractorDashboardSource, /recordWorkflowDependencyHistoryEvent/);
  assert.match(contractorDashboardSource, /getWorkflowDependencyHistory\(scopedJob\)/);
  assert.match(contractorDashboardSource, /Workflow Dependencies/);
  assert.match(contractorDashboardSource, /buildWorkflowDependencyReportSection/);
});

test("Work Center reminder route does not claim a reminder was sent from conversation open alone", () => {
  assert.match(contractorDashboardSource, /function sendWorkflowDependencyReminder/);
  assert.doesNotMatch(contractorDashboardSource, /createWorkflowDependencyReminderSentEvent/);
  assert.doesNotMatch(contractorDashboardSource, /workflow_dependency_reminder_sent/);
});

test("Work Center mobile alert dialog preserves accessible actions above BottomNav and launcher", () => {
  assert.match(contractorDashboardSource, /workflowDependencyDialogBackdrop/);
  assert.match(contractorDashboardSource, /calc\(env\(safe-area-inset-bottom, 0px\) \+ 104px\)/);
  assert.match(contractorDashboardSource, /maxHeight: "min\(620px, calc\(100dvh - 148px\)\)"/);
  assert.match(contractorDashboardSource, /minHeight: "44px"/);
  assert.match(contractorDashboardSource, /overflowY: "auto"/);
});

test("Work Center risk action remains available but visually secondary to Wait", () => {
  assert.match(contractorDashboardSource, /workflowDependencyRecommendedButton/);
  assert.match(contractorDashboardSource, /workflowDependencyRiskButton/);
  assert.match(contractorDashboardSource, /data-risk-action="workflow-dependency-continue-anyway"/);
  assert.match(contractorDashboardSource, /background: "#0f172a"/);
  assert.match(contractorDashboardSource, /background: "#fff7ed"/);
});
