import assert from "node:assert/strict";
import test from "node:test";
import {
  appendWorkflowDependencyHistoryEvent,
  buildWorkflowDependencyReportSection,
  createWorkflowDependencyIdentifiedEvent,
  createWorkflowDependencyReminderSentEvent,
  createWorkflowDependencyResolvedEvent,
  getWorkflowDependencyHistory,
  normalizeWorkflowDependencyEvent,
  WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES,
} from "../src/utils/workflowDependencyHistory.js";
import {
  createWorkflowOverrideEvent,
  getDependencyForAttemptedAction,
  WORKFLOW_DEPENDENCY_ALERT_TYPES,
} from "../src/utils/workflowDependencyAlerts.js";

test("new dependency creates one identified history event", () => {
  const dependency = getDependencyForAttemptedAction(
    { id: "job-sarah", customerName: "Sarah", quoteStatus: "quote_sent", workflowStage: "proposal" },
    "schedule_work"
  );
  const event = createWorkflowDependencyIdentifiedEvent(dependency, "schedule_work", {
    timestamp: "2026-07-10T12:00:00.000Z",
  });
  const once = appendWorkflowDependencyHistoryEvent({ id: "job-sarah", projectTimeline: [] }, event);
  const twice = appendWorkflowDependencyHistoryEvent(once, event);

  assert.equal(once.projectTimeline.length, 1);
  assert.equal(twice.projectTimeline.length, 1);
  assert.equal(once.projectTimeline[0].type, WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.IDENTIFIED);
});

test("refresh style hydration does not duplicate identified dependency history", () => {
  const dependency = {
    id: "job-william:William:waiting_for_payment:payment",
    type: WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT,
    currentWorkflowStage: "payment",
    customerId: "William",
    jobId: "job-william",
    conversationId: "conversation-william",
  };
  const event = createWorkflowDependencyIdentifiedEvent(dependency, "start_work", {
    timestamp: "2026-07-10T12:00:00.000Z",
  });
  const hydrated = appendWorkflowDependencyHistoryEvent(
    { id: "job-william", projectTimeline: [event] },
    event
  );

  assert.equal(hydrated.projectTimeline.length, 1);
});

test("reminder confirmation creates one read-only reminder event", () => {
  const event = createWorkflowDependencyReminderSentEvent(
    {
      id: "job-sarah:Sarah:waiting_for_proposal_approval:proposal",
      type: WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL,
      currentWorkflowStage: "proposal",
      customerId: "Sarah",
      jobId: "job-sarah",
      conversationId: "conversation-sarah",
    },
    { channel: "meetro_chat", timestamp: "2026-07-10T12:05:00.000Z" }
  );
  const normalized = normalizeWorkflowDependencyEvent(event);

  assert.equal(normalized.type, WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.REMINDER_SENT);
  assert.equal(normalized.reminderChannel, "meetro_chat");
  assert.equal(normalized.readOnly, true);
  assert.match(normalized.summary, /reminder was sent requesting proposal approval/i);
});

test("opening conversation alone does not falsely claim reminder sent", () => {
  const conversationOpenEvent = {
    type: "workflow_dependency_reminder_conversation_opened",
    dependencyType: WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL,
  };

  assert.equal(normalizeWorkflowDependencyEvent(conversationOpenEvent), null);
});

test("resolved customer action creates one resolved history event", () => {
  const event = createWorkflowDependencyResolvedEvent(
    {
      id: "job-jack:Jack Lindstrom:waiting_for_work_date_confirmation:work_scheduled",
      type: WORKFLOW_DEPENDENCY_ALERT_TYPES.WORK_DATE_CONFIRMATION,
      currentWorkflowStage: "work_scheduled",
      customerId: "Jack Lindstrom",
      jobId: "job-jack",
      conversationId: "conversation-jack",
    },
    { resolvedBy: "work_date_confirmed", timestamp: "2026-07-10T13:00:00.000Z" }
  );
  const job = appendWorkflowDependencyHistoryEvent({ id: "job-jack", projectTimeline: [] }, event);
  const duplicate = appendWorkflowDependencyHistoryEvent(job, event);

  assert.equal(duplicate.projectTimeline.length, 1);
  assert.equal(getWorkflowDependencyHistory(duplicate)[0].type, WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.RESOLVED);
});

test("Continue Anyway override displays as neutral read-only history", () => {
  const dependency = getDependencyForAttemptedAction(
    { id: "job-override", customerName: "Sarah", quoteStatus: "quote_sent", workflowStage: "proposal" },
    "schedule_work"
  );
  const event = createWorkflowOverrideEvent(dependency, "schedule_work", {
    timestamp: "2026-07-10T12:10:00.000Z",
  });
  const normalized = normalizeWorkflowDependencyEvent(event);

  assert.equal(normalized.type, WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.OVERRIDE);
  assert.equal(normalized.continuedByProfessional, true);
  assert.equal(normalized.readOnly, true);
  assert.match(normalized.summary, /continued before customer proposal approval/);
  assert.doesNotMatch(normalized.summary, /ignored|violation|fault|unauthorized|improper/i);
});

test("closure with multiple unresolved dependencies renders a clear report summary", () => {
  const events = [
    createWorkflowDependencyIdentifiedEvent(
      {
        id: "job-closure:William:waiting_for_payment:closure",
        type: WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT,
        currentWorkflowStage: "closure",
        customerId: "William",
        jobId: "job-closure",
      },
      "close_job",
      { timestamp: "2026-07-10T12:00:00.000Z" }
    ),
    createWorkflowDependencyIdentifiedEvent(
      {
        id: "job-closure:William:waiting_for_closure_obligation:closure",
        type: WORKFLOW_DEPENDENCY_ALERT_TYPES.CLOSURE_OBLIGATION,
        currentWorkflowStage: "closure",
        customerId: "William",
        jobId: "job-closure",
      },
      "close_job",
      { timestamp: "2026-07-10T12:01:00.000Z" }
    ),
  ];
  const report = buildWorkflowDependencyReportSection(events);

  assert.match(report, /Workflow Dependencies/);
  assert.match(report, /Required payment or deposit was still outstanding/);
  assert.match(report, /Closure obligations remained incomplete/);
  assert.match(report, /Action: close_job/);
});

test("Job Report dependency section appears only when dependency history exists", () => {
  const empty = buildWorkflowDependencyReportSection([]);
  const populated = buildWorkflowDependencyReportSection([
    {
      type: WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.IDENTIFIED,
      dependencyType: WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL,
      timestamp: "2026-07-10T12:00:00.000Z",
    },
  ]);

  assert.equal(empty, "");
  assert.match(populated, /^Workflow Dependencies/);
});

test("unknown dependency history event fails safely", () => {
  const normalized = normalizeWorkflowDependencyEvent({
    type: WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.IDENTIFIED,
    dependencyType: "future_dependency",
    timestamp: "2026-07-10T12:00:00.000Z",
  });

  assert.equal(normalized.summary, "Workflow dependency was pending.");
});

test("old override-only records still render", () => {
  const normalized = normalizeWorkflowDependencyEvent({
    type: WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.OVERRIDE,
    pendingDependency: WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT,
    attemptedAction: "start_work",
    message: "Work began before the required deposit was recorded.",
    timestamp: "2026-07-10T12:00:00.000Z",
  });

  assert.equal(normalized.dependencyType, WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT);
  assert.equal(normalized.affectedWorkflowAction, "start_work");
  assert.match(normalized.summary, /required deposit/);
});

test("Sarah William and Jack dependency history remains scoped", () => {
  const sarah = createWorkflowDependencyIdentifiedEvent(
    { id: "sarah-alert", type: WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL, customerId: "Sarah", jobId: "sarah-job", conversationId: "sarah-convo" },
    "schedule_work"
  );
  const william = createWorkflowDependencyIdentifiedEvent(
    { id: "william-alert", type: WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT, customerId: "William", jobId: "william-job", conversationId: "william-convo" },
    "start_work"
  );
  const jack = createWorkflowDependencyIdentifiedEvent(
    { id: "jack-alert", type: WORKFLOW_DEPENDENCY_ALERT_TYPES.WORK_DATE_CONFIRMATION, customerId: "Jack Lindstrom", jobId: "jack-job", conversationId: "jack-convo" },
    "on_the_way"
  );

  assert.equal(getWorkflowDependencyHistory({ id: "sarah-job", customerId: "Sarah", projectTimeline: [sarah, william, jack] }).length, 1);
  assert.equal(getWorkflowDependencyHistory({ id: "william-job", customerId: "William", projectTimeline: [sarah, william, jack] }).length, 1);
  assert.equal(getWorkflowDependencyHistory({ id: "jack-job", customerId: "Jack Lindstrom", projectTimeline: [sarah, william, jack] }).length, 1);
});

test("dependency history records are read-only", () => {
  const normalized = normalizeWorkflowDependencyEvent({
    type: WORKFLOW_DEPENDENCY_HISTORY_EVENT_TYPES.RESOLVED,
    dependencyType: WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT,
    timestamp: "2026-07-10T12:00:00.000Z",
  });

  assert.equal(normalized.readOnly, true);
  assert.equal("editable" in normalized, false);
});
