import assert from "node:assert/strict";
import test from "node:test";
import {
  appendWorkflowOverrideHistory,
  createWorkflowOverrideEvent,
  dedupeWorkflowDependencyAlerts,
  getDependenciesForAttemptedAction,
  getDependencyForAttemptedAction,
  getPendingWorkflowDependencies,
  getWorkflowDependencyHardGateAudit,
  resolveWorkflowDependency,
  shouldWarnBeforeAction,
  WORKFLOW_DEPENDENCY_ALERT_TYPES,
} from "../src/utils/workflowDependencyAlerts.js";

test("proposal approval pending warns before Schedule Work without hard blocking", () => {
  const result = shouldWarnBeforeAction(
    {
      id: "job-1",
      customerName: "Sarah",
      quoteStatus: "quote_sent",
      workflowStage: "proposal",
    },
    "schedule_work"
  );

  assert.equal(result.shouldWarn, true);
  assert.equal(result.continueAllowed, true);
  assert.equal(result.dependency.type, WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_APPROVAL);
  assert.equal(result.dependency.waitingOn, "Customer");
  assert.match(result.dependency.message, /Customer approval is still pending/);
});

test("initial customer response pending warns before Schedule Visit and reminder scope is preserved", () => {
  const result = shouldWarnBeforeAction(
    {
      id: "request-sarah",
      customerName: "Sarah",
      conversationId: "conversation-sarah",
      customerResponsePending: true,
      workflowStage: "initial_contact",
    },
    "schedule_visit"
  );

  assert.equal(result.shouldWarn, true);
  assert.equal(result.dependency.type, WORKFLOW_DEPENDENCY_ALERT_TYPES.CUSTOMER_RESPONSE);
  assert.equal(result.dependency.conversationId, "conversation-sarah");
  assert.equal(result.dependency.customerId, "Sarah");
});

test("visit confirmation resolution removes Record Evaluation warning", () => {
  const pending = shouldWarnBeforeAction(
    {
      id: "visit-william",
      customerName: "William",
      visitConfirmationPending: true,
      workflowStage: "visit_scheduled",
    },
    "record_evaluation"
  );
  const resolved = shouldWarnBeforeAction(
    {
      id: "visit-william",
      customerName: "William",
      visitConfirmationPending: false,
      scheduleConfirmationStatus: "confirmed",
      workflowStage: "visit_scheduled",
    },
    "record_evaluation"
  );

  assert.equal(pending.shouldWarn, true);
  assert.equal(pending.dependency.type, WORKFLOW_DEPENDENCY_ALERT_TYPES.VISIT_CONFIRMATION);
  assert.equal(resolved.shouldWarn, false);
});

test("evaluation information pending warns before Create Proposal without replacing hard validation", () => {
  const result = shouldWarnBeforeAction(
    {
      id: "evaluation-jack",
      customerName: "Jack Lindstrom",
      evaluationAccessPending: true,
      workflowStage: "evaluation",
    },
    "create_proposal"
  );

  assert.equal(result.shouldWarn, true);
  assert.equal(result.dependency.type, WORKFLOW_DEPENDENCY_ALERT_TYPES.EVALUATION_ACCESS);
  assert.match(result.dependency.continueWarning, /incomplete customer information/);
});

test("deposit pending before Start Work produces critical warning and Continue Anyway remains available", () => {
  const result = shouldWarnBeforeAction(
    {
      id: "job-2",
      customerName: "William",
      paymentRequired: true,
      paymentStatus: "requested",
      workflowStage: "payment",
    },
    "start_work"
  );

  assert.equal(result.shouldWarn, true);
  assert.equal(result.continueAllowed, true);
  assert.equal(result.dependency.severity, "critical_warning");
  assert.equal(result.dependency.type, WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT);
  assert.match(result.dependency.title, /deposit/i);
  assert.match(result.dependency.message, /deposit/i);
  assert.match(result.dependency.continueWarning, /work started before the required deposit/i);
});

test("resolved payment does not warn before deposit-sensitive actions", () => {
  const result = shouldWarnBeforeAction(
    {
      id: "job-paid",
      customerName: "William",
      paymentRequired: true,
      paymentStatus: "paid",
      workflowStage: "payment",
    },
    "start_work"
  );

  assert.equal(result.shouldWarn, false);
});

test("work date confirmation pending warns before On The Way", () => {
  const dependency = getDependencyForAttemptedAction(
    {
      id: "schedule-1",
      customerName: "Jack",
      workDateConfirmationStatus: "pending",
      workflowStage: "work_scheduled",
    },
    "on_the_way"
  );

  assert.equal(dependency.type, WORKFLOW_DEPENDENCY_ALERT_TYPES.WORK_DATE_CONFIRMATION);
  assert.match(dependency.title, /Work appointment confirmation/);
});

test("customer signoff pending warns before Close Job", () => {
  const dependency = getDependencyForAttemptedAction(
    {
      id: "job-3",
      customerName: "Sarah",
      completionStatus: "awaiting_customer_confirmation",
      workflowStage: "completion",
    },
    "close_job"
  );

  assert.equal(dependency.type, WORKFLOW_DEPENDENCY_ALERT_TYPES.COMPLETION_CONFIRMATION);
});

test("permit and compliance pending warns before Close Job", () => {
  const dependency = getDependencyForAttemptedAction(
    {
      id: "job-4",
      customerName: "William",
      permitClosurePending: true,
      workflowStage: "closure",
    },
    "close_job"
  );

  assert.equal(dependency.type, WORKFLOW_DEPENDENCY_ALERT_TYPES.CLOSURE_OBLIGATION);
  assert.equal(dependency.severity, "critical_warning");
});

test("proposal changes requested takes priority over generic approval pending text", () => {
  const dependency = getDependencyForAttemptedAction(
    {
      id: "job-change",
      customerName: "Sarah",
      quoteStatus: "changes_requested",
      proposalApprovalPending: true,
      workflowStage: "proposal",
    },
    "schedule_work"
  );

  assert.equal(dependency.type, WORKFLOW_DEPENDENCY_ALERT_TYPES.PROPOSAL_CHANGES);
  assert.match(dependency.message, /requested proposal changes/);
});

test("additional work approval pending warns before downstream work and invoice actions", () => {
  for (const action of ["perform_additional_work", "complete_work", "finalize_invoice"]) {
    const dependency = getDependencyForAttemptedAction(
      {
        id: `job-additional-${action}`,
        customerName: "Jack Lindstrom",
        additionalWorkApprovalPending: true,
        workflowStage: "additional_work",
      },
      action
    );

    assert.equal(dependency.type, WORKFLOW_DEPENDENCY_ALERT_TYPES.ADDITIONAL_WORK_APPROVAL);
    assert.equal(dependency.severity, "critical_warning");
    assert.match(dependency.message, /Additional work/);
  }
});

test("final payment pending warns before closure and history but not early work scheduling", () => {
  const job = {
    id: "job-final-payment",
    customerName: "William",
    finalPaymentPending: true,
    workflowStage: "completion",
  };

  assert.equal(getDependencyForAttemptedAction(job, "schedule_work"), null);
  assert.equal(getDependencyForAttemptedAction(job, "close_job").type, WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT);
  assert.equal(getDependencyForAttemptedAction(job, "move_to_history").type, WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT);
  assert.match(getDependencyForAttemptedAction(job, "close_job").message, /Final payment/);
  assert.match(getDependencyForAttemptedAction(job, "close_job").title, /Final payment/);
  assert.doesNotMatch(getDependencyForAttemptedAction(job, "close_job").message, /deposit/i);
});

test("final document dependency warns before Close Job", () => {
  const dependency = getDependencyForAttemptedAction(
    {
      id: "job-docs",
      customerName: "Sarah",
      finalDocumentsPending: true,
      workflowStage: "completion",
    },
    "close_job"
  );

  assert.equal(dependency.type, WORKFLOW_DEPENDENCY_ALERT_TYPES.DOCUMENT_ACKNOWLEDGMENT);
});

test("wait or cancel path can avoid workflow advancement because alerts are advisory only", () => {
  const result = shouldWarnBeforeAction(
    { id: "job-5", customerName: "Sarah", quoteStatus: "quote_sent" },
    "schedule_work"
  );
  let advanced = false;

  if (!result.shouldWarn) advanced = true;

  assert.equal(result.shouldWarn, true);
  assert.equal(result.continueAllowed, true);
  assert.equal(advanced, false);
});

test("Continue Anyway creates neutral override history", () => {
  const dependency = getDependencyForAttemptedAction(
    { id: "job-6", customerName: "Sarah", quoteStatus: "quote_sent", workflowStage: "proposal" },
    "schedule_work"
  );
  const event = createWorkflowOverrideEvent(dependency, "schedule_work", {
    timestamp: "2026-07-10T12:00:00.000Z",
  });
  const updated = appendWorkflowOverrideHistory(
    { id: "job-6", customerName: "Sarah", projectTimeline: [] },
    dependency,
    "schedule_work",
    { timestamp: "2026-07-10T12:00:00.000Z" }
  );

  assert.equal(event.type, "workflow_dependency_override");
  assert.equal(event.continuedByProfessional, true);
  assert.equal(event.message, "Work scheduling continued before customer proposal approval.");
  assert.equal(updated.projectTimeline.length, 1);
  assert.equal(updated.projectTimeline[0].message, event.message);
});

test("Continue Anyway does not duplicate override history for the same dependency and action", () => {
  const dependency = getDependencyForAttemptedAction(
    { id: "job-6b", customerName: "Sarah", quoteStatus: "quote_sent", workflowStage: "proposal" },
    "schedule_work"
  );
  const once = appendWorkflowOverrideHistory(
    { id: "job-6b", customerName: "Sarah", projectTimeline: [] },
    dependency,
    "schedule_work",
    { timestamp: "2026-07-10T12:00:00.000Z" }
  );
  const twice = appendWorkflowOverrideHistory(once, dependency, "schedule_work", {
    timestamp: "2026-07-10T12:05:00.000Z",
  });

  assert.equal(twice.projectTimeline.length, 1);
});

test("resolved customer action removes active warning and preserves resolved alert history", () => {
  const activeAlert = getDependencyForAttemptedAction(
    { id: "job-7", customerName: "Sarah", quoteStatus: "quote_sent" },
    "schedule_work"
  );
  const updated = resolveWorkflowDependency(
    { id: "job-7", activeWorkflowDependencyAlerts: [activeAlert] },
    "proposal_approved"
  );

  assert.deepEqual(updated.activeWorkflowDependencyAlerts, []);
  assert.equal(updated.resolvedWorkflowDependencyAlerts.length, 1);
  assert.equal(updated.resolvedWorkflowDependencyAlerts[0].resolvedBy, "proposal_approved");
});

test("duplicate alerts are prevented by stable identity", () => {
  const alerts = getPendingWorkflowDependencies({
    id: "job-8",
    customerName: "Jack",
    quoteStatus: "quote_sent",
    workflowStage: "proposal",
  });
  const deduped = dedupeWorkflowDependencyAlerts([alerts[0], alerts[0], { ...alerts[0] }]);

  assert.equal(deduped.length, 1);
  assert.match(deduped[0].id, /job-8:Jack:waiting_for_proposal_approval:proposal/);
});

test("closed and history-only jobs do not show active dependency warnings", () => {
  for (const status of ["closed", "history", "closure_completed", "archived"]) {
    const alerts = getPendingWorkflowDependencies({
      id: `job-${status}`,
      customerName: "Sarah",
      status,
      finalPaymentPending: true,
      permitClosurePending: true,
    });

    assert.deepEqual(alerts, []);
  }
});

test("closure action summarizes all unresolved scoped dependencies without duplicates", () => {
  const dependencies = getDependenciesForAttemptedAction(
    {
      id: "job-closure-summary",
      customerName: "Jack Lindstrom",
      conversationId: "conversation-jack",
      finalPaymentPending: true,
      completionConfirmationPending: true,
      permitClosurePending: true,
      finalDocumentsPending: true,
      workflowStage: "closure",
    },
    "close_job"
  );
  const types = dependencies.map((item) => item.type);

  assert.deepEqual(types, [
    WORKFLOW_DEPENDENCY_ALERT_TYPES.CLOSURE_OBLIGATION,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.PAYMENT,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.DOCUMENT_ACKNOWLEDGMENT,
    WORKFLOW_DEPENDENCY_ALERT_TYPES.COMPLETION_CONFIRMATION,
  ]);
  assert.equal(new Set(types).size, types.length);
  assert.ok(dependencies.every((item) => item.customerId === "Jack Lindstrom"));
});

test("Sarah William and Jack alerts remain scoped to their own customer and job", () => {
  const sarah = getPendingWorkflowDependencies({
    id: "sarah-job",
    customerName: "Sarah",
    quoteStatus: "quote_sent",
    workflowStage: "proposal",
  })[0];
  const william = getPendingWorkflowDependencies({
    id: "william-job",
    customerName: "William",
    paymentRequired: true,
    workflowStage: "payment",
  })[0];
  const jack = getPendingWorkflowDependencies({
    id: "jack-job",
    customerName: "Jack",
    workDateConfirmationPending: true,
    workflowStage: "work_scheduled",
  })[0];

  assert.equal(sarah.customerId, "Sarah");
  assert.equal(william.customerId, "William");
  assert.equal(jack.customerId, "Jack");
  assert.notEqual(sarah.id, william.id);
  assert.notEqual(william.id, jack.id);
});

test("existing hard gate audit is explicit and does not silently weaken evaluation/payment gates", () => {
  const audit = getWorkflowDependencyHardGateAudit();

  assert.ok(audit.some((item) => item.gate === "Evaluation completion" && item.decision === "preserve_hard_validation"));
  assert.ok(audit.some((item) => /Proposal approval and payment/.test(item.gate)));
  assert.ok(audit.some((item) => item.gate === "Completion and closure validation"));
});
